//! Renders a chart showing the historical distribution of portfolio holding over time

import React from 'react';
import { connect } from 'dva';
const Highchart = require('react-highcharts');
const _ = require('lodash');

import { batchFetchRates } from '../../utils/internalApi';

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
    return _.map([baseCurrency, ...currencies], currency => { return {pair: `BTC_${currency}`, date: evt.data.date}; });
  }));

  return new Promise((f, r) => {
    batchFetchRates(needsFetch, poloRates, cmcRates, cachedRates, dispatch).then(queryResults => {
      console.log(queryResults);
      const histBalances = {};
      const curPortfolio = {};
      _.each(currencies, currency => {
        histBalances[currency] = [];
        curPortfolio[currency] = 0;
      });

      // calculate portfolio value for each currency at each event and keep running totals
      _.each(_.sortBy(mergedData, ({date}) => new Date(date).getTime()), ({type, data}) => {
        // find the data for all currencies at the current timestamp from the historical data
        const momentData = _.filter(queryResults, histRate => {
          return new Date(histRate.date).getTime() == new Date(data.date).getTime();
        });

        // modify the historical portfolio based on the event that occured
        if(type == 'deposit') {
          curPortfolio[data.currency] += data.amount;
        } else if(type == 'withdrawl') {
          curPortfolio[data.currency] -= data.amount;
        } else {
          const currencies = data.pair.split('/');
          const neg = data.buy ? 1 : -1;
          curPortfolio[currencies[0]] += (neg * data.amount);
          curPortfolio[currencies[1]] -= (neg * data.cost);
        }

        // calculate balances using historical rates and add to the result array
        _.each(currencies, currency => {
          const histRate = _.filter(momentData, histRate => histRate.pair == `BTC_${currency}`)[0].rate;
          histBalances[currency].push(histRate * curPortfolio[currency]);
        });
      });

      console.log(histBalances);
      f(histBalances); // TODO
    });
  });
}

class HistoricalDistributions extends React.Component {
  constructor(props) {
    super(props);

    this.chartConfig = {
      chart: {
        type: 'area',
      },
      title: 'Historical Portfolio Distribution',
      yAxis: {
        title: {
          text: 'Percent'
        }
      },
      plotOptions: {
        area: {
          stacking: 'percent',
          lineColor: '#ffffff',
          lineWidth: 1,
          marker: {
            lineWidth: 1,
            lineColor: '#ffffff'
          }
        }
      },
      series: null,
    };

    this.state = {chartData: null};
  }

  componentWillReceiveProps(nextProps) {
    if((!this.props.poloRates || !this.props.cmcRates) && nextProps.poloRates && nextProps.cmcRates) {
      const {baseCurrency, deposits, withdrawls, trades, poloRates, cmcRates, cachedRates, dispatch} = nextProps;
      createSeries(baseCurrency, deposits, withdrawls, trades, poloRates, cmcRates, cachedRates, dispatch).then(series => {
        this.setState({chartData: series});
      });
    }
  }

  render() {
    if(this.state.chartData) {
      return <Highchart config={this.chartConfig} isPureConfig />;
    } else {
      return <span>Loading...</span>;
    }
  }
}

function mapProps(state) {
  return {
    deposits: state.userData.deposits,
    withdrawls: state.userData.withdrawls,
    trades: state.userData.trades,
    baseRate: state.globalData.baseRate,
    baseCurrency: state.globalData.baseCurrency,
    baseCurrencySymbol: state.globalData.baseCurrencySymbol,
    poloRates: state.globalData.poloRates,
    cmcRates: state.globalData.coinmarketcapRates,
    cachedRates: state.globalData.cachedRates,
  };
}

export default connect(mapProps)(HistoricalDistributions);
