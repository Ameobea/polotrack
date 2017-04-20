//! Shows detailed information about the user's historical trades and provides drilldowns into past trading history

import React from 'react';
import { connect } from 'dva';
import { Row, Col, Select } from 'antd';
const Option = Select.Option;
const _ = require('lodash');

import CurrencyDrilldown from '../components/trades/CurrencyDrilldown';

/// Helper function to create a list of currencies and pick an initial currency to display a chart for
function parseCurrencies(trades) {
  const currencies = ['ETH'];
  _.each(trades, ({pair}) => {
    _.each(pair.split('/'), currency => {
      if(!_.includes(currencies, currency)) {
        currencies.push(currency);
      }
    });
  });

  return {
    currencies: currencies,
    selectedCurrency: currencies[0],
  };
}

/// Helper function that, given a currency and trade history, determines the time range and period for the chart
/// as well as combines all trades that took place on the same second together.
function calcDisplayParams(trades, currency) {
  const filteredTrades = _.filter(_.sortBy(trades, trade => new Date(trade.date).getTime()), trade => trade.pair.includes(currency));

  const mappedTrades = [];
  _.each(filteredTrades, trade => {
    let {date, pair, price, amount, cost} = trade;
    // TODO: Find a minimum difference of trades to merge and merge close ones
    const lastTrade = _.last(mappedTrades);
    if(lastTrade && lastTrade.pair == pair && new Date(lastTrade.date).getTime() == new Date(date).getTime()) {
      // trades occured at the same second, so merge them into one trade while averaging price and cost
      const totalAmount = lastTrade.amount + amount;
      lastTrade.price = ((amount / totalAmount) * price) + ((lastTrade.amount / totalAmount) * lastTrade.price);
      lastTrade.amount = totalAmount;
      lastTrade.cost = lastTrade.cost + cost;
    } else {
      mappedTrades.push(trade);
    }
  });

  // calculate the start and end times, giving 5% of the total time span before and after the first and last trades
  let endTime = new Date(_.last(mappedTrades).date).getTime() / 1000;
  let startTime = new Date(mappedTrades[0].date).getTime() / 1000;
  const timeSpan = endTime - startTime;
  startTime = startTime - (.05 * timeSpan);
  endTime = endTime + (.05 * timeSpan);

  // calculate the period to request for the chart from the list of accepted periods by Poloniex
  // aim for as close to 250 bars as possible
  const validPeriods = [300, 900, 1800, 7200, 14400, 86400];
  let bestPeriod = {barsError: Infinity};
  _.each(validPeriods, period => {
    let requiredBars = timeSpan / period;
    const barsError = Math.abs(250 - requiredBars);
    if(barsError < bestPeriod.barsError)
      bestPeriod = {period: period, barsError: barsError};
  });

  return {
    filteredTrades: mappedTrades,
    startTime: startTime,
    endTime: endTime,
    period: bestPeriod.period,
  };
}

class TradeHistory extends React.Component {
  constructor(props) {
    super(props);

    this.handleCurrencySelect = this.handleCurrencySelect.bind(this);

    // parse the provided trades by filtering only those for the selected currency and combining trades
    // that were made during the same second and averaging the price they were made at.
    const parsed = parseCurrencies(props.trades, this.props.currency);
    // calculate initial display parameters for the initial currency
    const displayParams = calcDisplayParams(props.trades, parsed.selectedCurrency);

    this.state = {...parsed, ...displayParams};
  }

  handleCurrencySelect(newCurrency) {
    this.setState({selectedCurrency: newCurrency});
  }

  render() {
    const currencyOptions = _.map(this.state.currencies, currency => {
      return <Option key={currency} value={currency}>{currency}</Option>;
    });

    return (
      <div>
        <Row>
          <Col md={12} xs={12}>
            <center>
              <p>{'Currency  '}</p>
              <Select
                defaultValue={this.state.currencies[0] || 'ETH'}
                onChange={this.handleCurrencySelect}
                style={{width: 120}}
              >
                {currencyOptions}
              </Select>
            </center>
          </Col>
          <Col md={12} xs={12}>
            <center>
              Placeholder
            </center>
          </Col>
        </Row>
        <CurrencyDrilldown
          pair={`BTC_${this.state.selectedCurrency}`}
          startTime={this.state.startTime}
          endTime={this.state.endTime}
          period={this.state.period}
        />
      </div>
    );
  }
}

function mapProps(state) {
  return {
    trades: state.userData.trades,
  };
}

export default connect(mapProps)(TradeHistory);
