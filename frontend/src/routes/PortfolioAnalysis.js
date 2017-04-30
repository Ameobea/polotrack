//! Shows detailed information about the user's current portfolio including its value over time, max value, etc.
/* eslint react/no-unused-prop-types: 0 */

import React from 'react';
import { connect } from 'dva';
const _ = require('lodash');

import {
  tradeShape, depositShape, withdrawlShape, histBalancesShape, poloRatesShape, cmcRatesShape
} from '../utils/propTypeDefs';
import { batchFetchRates } from '../utils/internalApi';
import HistoricalDistributions from '../components/portfolio_analysis/HistoricalDistributions';
import HistoricalPL from '../components/portfolio_analysis/HistoricalPL';

/**
 * Processes all supplied portfolio activity into the format expected by HighCharts by calculating the total
 * balance and historical value of each currency at each update.  Returns a promise that resolves to the
 * series object once the necessary historical rate requests are complete.
 */
function createSeries(baseCurrency, deposits, withdrawls, trades, poloRates, cmcRates, cachedRates, dispatch) {
  // merge all data together so it can be sorted by timestamp
  const mergedData = _.concat(
    _.map(deposits, deposit => { return {type: 'deposit', data: deposit}; }),
    _.map(withdrawls, withdrawl => { return {type: 'withdrawl', data: withdrawl}; }),
    _.map(trades, trade => { return {type: 'trade', data: trade}; })
  );

  // find a list of all currencies the user has ever held
  const currencies = _.uniq(_.map(mergedData, ({type, data}) => {
    if(type == 'trade') {
      return data.pair.split('/')[0];
    } else {
      return data.currency;
    }
  }));

  // request historical rates for each of the currencies at each of the timestamps
  const needsFetch = _.flatten(_.map(mergedData, evt => {
    // don't forget to fetch base currency exchange rate as well
    return _.map([baseCurrency, ...currencies], currency => { return {pair: `BTC/${currency}`, date: evt.data.date}; });
  }));

  return new Promise((f, r) => {
    batchFetchRates(needsFetch, poloRates, cmcRates, cachedRates, dispatch).then(queryResults => {
      const histBalances = {};
      const histPLs = {};
      const curPortfolio = {};
      // `totalLost` and `totalGained` are in terms of base currency
      const totalGained = {};
      const totalLost = {};
      _.each(currencies, currency => {
        histBalances[currency] = [];
        histPLs[currency] = [];
        curPortfolio[currency] = 0;
        totalGained[currency] = 0;
        totalLost[currency] = 0;
      });

      // calculate portfolio value for each currency at each event and keep running totals
      var lastDate = 0;
      _.each(_.sortBy(mergedData, ({data}) => new Date(data.date).getTime()), ({type, data}) => {
        // find the data for all currencies at the current timestamp from the historical data
        const momentData = _.filter(queryResults, histRate => {
          return new Date(histRate.date).getTime() == new Date(data.date).getTime();
        });
        const histBaseRate = _.filter(momentData, histRate => histRate.pair == `BTC/${baseCurrency}`)[0].rate;

        // modify the historical portfolio based on the event that occured
        if(type == 'deposit') {
          curPortfolio[data.currency] += data.amount;

          const histRate = _.filter(momentData, histRate => histRate.pair == `BTC/${data.currency}`)[0].rate;
          totalGained[data.currency] += (data.amount * histRate * histBaseRate);
        } else if(type == 'withdrawl') {
          curPortfolio[data.currency] -= data.amount;
          if(curPortfolio[data.currency] < 0)
            curPortfolio[data.currency] = 0;

          const histRate = _.filter(momentData, histRate => histRate.pair == `BTC/${data.currency}`)[0].rate;
          totalLost[data.currency] += (data.amount * histRate * histBaseRate);
        } else {
          const currencies = data.pair.split('/');
          let gainedAmount, lostAmount, gainedCurrency, lostCurrency, fee;
          if(data.buy) {
            gainedAmount = data.amount;
            lostAmount = data.cost;
            gainedCurrency = currencies[0];
            lostCurrency = currencies[1];
            fee = data.amount * (data.fee / 100);
          } else {
            gainedAmount = data.cost;
            lostAmount = data.amount;
            gainedCurrency = currencies[1];
            lostCurrency = currencies[0];
            fee = data.cost * (data.fee / 100);
          }
          curPortfolio[gainedCurrency] += (gainedAmount - fee);
          curPortfolio[lostCurrency] -= lostAmount;

          const gainedRate = _.filter(momentData, histRate => histRate.pair == `BTC/${gainedCurrency}`)[0].rate;
          const lostRate = _.filter(momentData, histRate => histRate.pair == `BTC/${lostCurrency}`)[0].rate;
          // console.log(`Gained ${gainedAmount} ${gainedCurrency} at rate ${gainedRate} total value ${(gainedAmount - fee) * gainedRate * histBaseRate}`)
          // console.log(`Lost ${lostAmount} ${lostCurrency} at rate ${lostRate} total value ${lostAmount * lostRate * histBaseRate}`)
          totalGained[gainedCurrency] += (gainedAmount /*- fee*/) * gainedRate * histBaseRate;
          totalGained[lostCurrency] -= lostAmount * lostRate * histBaseRate;

          if(curPortfolio[currencies[0]] < 0)
            curPortfolio[currencies[0]] = 0;
          if(curPortfolio[currencies[1]] < 0)
            curPortfolio[currencies[1]] = 0;
        }

        // calculate balances using historical rates and add to the result array
        _.each(currencies, currency => {
          const histRate = _.filter(momentData, histRate => histRate.pair == `BTC/${currency}`)[0].rate;
          const histValue = histRate * curPortfolio[currency] * histBaseRate;
          const histPL = (histValue + totalLost[currency]) - totalGained[currency];
          if(data.date == lastDate && histBalances[currency] && histBalances[currency].length > 0 &&
            _.last(histBalances[currency])[0] == new Date(data.date).getTime()
          ) {
            // this event took place at the same time as a previous event, so merge them in the output array
            _.last(histBalances[currency])[1] = histValue;
            _.last(histPLs[currency])[1] = histPL;
          } else {
            // this event took place at a different time than all previous events, so create a new element in the output array
            histBalances[currency].push([new Date(data.date).getTime(), histValue]);
            histPLs[currency].push([new Date(data.date).getTime(), histPL]);
          }
        });

        lastDate = data.date;
      });

      dispatch({type: 'userData/histPLsCalculated', histPLs: _.map(currencies, currency => {
        return {
          name: currency,
          data: histPLs[currency],
        };
      })});

      f(_.map(currencies, currency => {
        return {
          name: currency,
          data: histBalances[currency],
        };
      }));
    });
  });
}

class PortfolioAnalysis extends React.Component {
  constructor(props) {
    super(props);

    this.calcChartData = this.calcChartData.bind(this);

    if(props.poloRates && props.cmcRates && !this.props.histBalances) {
      // delay to give the page a time to at least display "Loading" before locking up CPU
      setTimeout(() => {
        this.calcChartData(props);
      }, 100);
    }
  }

  componentWillReceiveProps(nextProps) {
    if(
      (!this.props.poloRates || !this.props.cmcRates) && nextProps.poloRates && nextProps.cmcRates || !nextProps.histBalances
    ) {
      this.calcChartData(nextProps);
    }
  }

  calcChartData(props) {
    const {baseCurrency, deposits, withdrawls, trades, poloRates, cmcRates, cachedRates, dispatch} = props;
    createSeries(baseCurrency, deposits, withdrawls, trades, poloRates, cmcRates, cachedRates, dispatch).then(data => {
      dispatch({type: 'userData/histBalancesCalculated', histBalances: data});
    }).catch(err => console.error);
  }

  render() {
    if(this.props.histBalances && this.props.histPLs) {
      return (
        <div>
          <center>
            <h1>Historical Portfolio Distribution</h1>
          </center>
          <HistoricalDistributions />

          <center>
            <h1>Historical Portfolio Profitability</h1>
          </center>
          <HistoricalPL />
        </div>
      );
    } else {
      return (
        <div>
          <p><b>Loading...</b></p>
          <p>This may take a long time; the exchange rates at many historical dates have to be fetched and your
          portfolio&#39;s value calculated at each of them.</p>
        </div>
      );
    }
  }
}

PortfolioAnalysis.propTypes = {
  cmcRates: cmcRatesShape,
  deposits: React.PropTypes.arrayOf(depositShape).isRequired,
  histBalances: histBalancesShape,
  histPLs: histBalancesShape,
  poloRates: poloRatesShape,
  trades: React.PropTypes.arrayOf(tradeShape).isRequired,
  withdrawls: React.PropTypes.arrayOf(withdrawlShape).isRequired,
};

function mapProps(state) {
  return {
    deposits: state.userData.deposits,
    withdrawls: state.userData.withdrawls,
    trades: state.userData.trades,
    poloRates: state.globalData.poloRates,
    cmcRates: state.globalData.coinmarketcapRates,
    cachedRates: state.globalData.cachedRates,
    baseRate: state.globalData.baseRate,
    baseCurrency: state.globalData.baseCurrency,
    histBalances: state.userData.histBalances,
    histPLs: state.userData.histPLs,
  };
}

export default connect(mapProps)(PortfolioAnalysis);
