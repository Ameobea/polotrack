//! Shows detailed information about the user's historical trades and provides drilldowns into past trading history

import React from 'react';
import { connect } from 'dva';
import { Row, Col, Select, Table } from 'antd';
const Option = Select.Option;
const _ = require('lodash');

import gstyles from '../static/css/global.css';
import CurrencyDrilldown from '../components/trades/CurrencyDrilldown';

/// Helper function to create a list of currencies and pick an initial currency to display a chart for
function parseCurrencies(trades) {
  let currencies = ['ETH'];
  _.each(trades, ({pair}) => {
    _.each(pair.split('/'), currency => {
      if(!_.includes(currencies, currency)) {
        currencies.push(currency);
      }
    });
  });
  currencies = _.filter(currencies.sort(), currency => currency != 'BTC');

  return {
    currencies: currencies,
    selectedCurrency: currencies[0],
  };
}

/// Helper function that, given a currency and trade history, determines the time range and period for the chart
/// as well as combines all trades that took place on the same second together.
function calcDisplayParams(trades, currency) {
  const filteredTrades = _.filter(
    _.sortBy(trades, trade => new Date(trade.date).getTime()),
    trade => trade.pair.includes(currency)
  );

  // calculate the start and end times, giving 5% of the total time span before and after the first and last trades
  let endTime = new Date(_.last(filteredTrades).date).getTime() / 1000;
  let startTime = new Date(filteredTrades[0].date).getTime() / 1000;
  if(startTime === endTime) {
    endTime = new Date().getTime() / 1000;
  }
  const timeSpan = endTime - startTime;
  endTime = endTime + (.05 * timeSpan);
  startTime = startTime - (.05 * timeSpan);

  // calculate the period to request for the chart from the list of accepted periods by Poloniex
  // aim for as close to 200 bars as possible
  const validPeriods = [300, 900, 1800, 7200, 14400, 86400];
  let bestPeriod = {barsError: Infinity};
  _.each(validPeriods, period => {
    let requiredBars = timeSpan / period;
    const barsError = Math.abs(200 - requiredBars);
    if(barsError < bestPeriod.barsError)
      bestPeriod = {period: period, barsError: barsError};
  });

  const mappedTrades = [];
  _.each(filteredTrades, trade => {
    let {date, pair, buy, price, amount, cost} = trade;
    const lastTrade = _.last(mappedTrades);
    let timeDiff = Infinity;
    if(lastTrade)
      timeDiff = new Date(date).getTime() - new Date(lastTrade.date).getTime();
    // chunk all trades of the same direction together that were made in the same bar
    if(lastTrade && lastTrade.pair == pair && (timeDiff < bestPeriod.period * 1000) && lastTrade.buy == buy) {
      // trades occured at the same second, so merge them into one trade while averaging price and cost
      const totalAmount = lastTrade.amount + amount;
      lastTrade.price = ((amount / totalAmount) * price) + ((lastTrade.amount / totalAmount) * lastTrade.price);
      lastTrade.amount = totalAmount;
      lastTrade.cost = lastTrade.cost + cost;
    } else {
      mappedTrades.push(trade);
    }
  });

  return {
    filteredTrades: mappedTrades,
    startTime: startTime,
    endTime: endTime,
    period: bestPeriod.period,
  };
}

function populateTableData(filteredTrades) {
  return _.map(filteredTrades, ({pair, date, price, buy, amount, cost}) => {
    const currencies = pair.split('/');
    return {
      pair: pair,
      date: new Date(date).toLocaleString(),
      key: `${date}${amount}${cost}`,
      rate: price.toFixed(8),
      buy: buy ? greenBuy : redSell,
      amount: `${amount.toFixed(8)} ${currencies[0]}`,
      cost: `${cost.toFixed(8)} ${currencies[1]}`
    };
  });
}

const cols = [{
  title: 'Pair',
  key: 'pair',
  dataIndex: 'pair',
}, {
  title: 'Time Traded',
  key: 'date',
  dataIndex: 'date',
  sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
}, {
  title: 'Rate',
  key: 'rate',
  dataIndex: 'rate',
  sorter: (a, b) => a.rate - b.rate,
}, {
  title: 'Buy/Sell',
  key: 'buy',
  dataIndex: 'buy',
}, {
  title: 'Amount',
  key: 'amount',
  dataIndex: 'amount',
  sorter: (a, b) => +a.amount.split(' ')[0] - +b.amount.split(' ')[0],
}, {
  title: 'Cost',
  key: 'cost',
  dataIndex: 'cost',
  sorter: (a, b) => +a.cost.split(' ')[0] - +b.cost.split(' ')[0],
}];

const greenBuy = <span className={gstyles.greenMoney}>Buy</span>;
const redSell = <span className={gstyles.redMoney}>Sell</span>

class TradeHistory extends React.Component {
  constructor(props) {
    super(props);

    this.handleCurrencySelect = this.handleCurrencySelect.bind(this);
    this.handleTradeHover = this.handleTradeHover.bind(this);
    this.handleTradeUnhover = this.handleTradeUnhover.bind(this);
    this.handleTradeClick = this.handleTradeClick.bind(this);

    // parse the provided trades by filtering only those for the selected currency and combining trades
    // that were made during the same second and averaging the price they were made at.
    const parsed = parseCurrencies(props.trades, this.props.currency);
    // calculate initial display parameters for the initial currency
    const displayParams = calcDisplayParams(props.trades, parsed.selectedCurrency);

    this.state = {...parsed, ...displayParams, hoveredTrade: null, tableData: populateTableData(displayParams.filteredTrades)};
  }

  handleCurrencySelect(newCurrency) {
    const displayParams = calcDisplayParams(this.props.trades, newCurrency);
    this.setState({
      selectedCurrency: newCurrency,
      ...displayParams,
      tableData: populateTableData(displayParams.filteredTrades),
    });
  }

  handleTradeHover(trade) {
    this.setState({hoveredTrade: trade});
  }

  handleTradeUnhover(trade) {
    this.setState({hoveredTrade: null});
  }

  handleTradeClick(trade) {
    // Will probably have to fork TechanJS if we ever want to make this work >.>
  }

  render() {
    const currencyOptions = _.map(this.state.currencies, currency => {
      return <Option key={currency} value={currency}>{currency}</Option>;
    });

    const tradeDetail = this.state.hoveredTrade ? (
      <table>
        <tbody>
          <tr>
            <td>Pair</td>
            <td>{this.state.hoveredTrade.pair}</td>
          </tr>
          <tr>
            <td>Time</td>
            <td>{this.state.hoveredTrade.date.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Rate</td>
            <td>{this.state.hoveredTrade.price.toFixed(8)}</td>
          </tr>
          <tr>
            <td>Amount</td>
            <td>{this.state.hoveredTrade.quantity.toFixed(8)}</td>
          </tr>
          <tr>
            <td colSpan='2'>
              <center>
                {this.state.hoveredTrade.type == 'buy' ? greenBuy : redSell}
              </center>
            </td>
          </tr>
        </tbody>
      </table>
    ) : (
      <table style={{color: 'white'}}>
        <tbody>
          <tr><td><font color='black'>Hover over a trade arrow to view detailed info</font></td></tr>
          <tr><td>X</td></tr>
          <tr><td>X</td></tr>
          <tr><td>X</td></tr>
          <tr><td>X</td></tr>
        </tbody>
      </table>
    );

    return (
      <div>
        <Row>
          <Col span={20}>
            <CurrencyDrilldown
              pair={`BTC_${this.state.selectedCurrency}`}
              startTime={this.state.startTime}
              endTime={this.state.endTime}
              period={this.state.period}
              filteredTrades={this.state.filteredTrades}
              currency={this.state.selectedCurrency}
              onTradeHover={this.handleTradeHover}
              onTradeUnhover={this.handleTradeUnhover}
              onTradeClick={this.handleTradeClick}
            />
          </Col>
          <Col span={4}>
            <Row justify="space-between" align="bottom">
              <Col span={24}>
                <center>
                  <p>{'Select Currency  '}</p>
                  <Select
                    defaultValue={this.state.currencies[0] || 'ETH'}
                    onChange={this.handleCurrencySelect}
                    style={{width: 120}}
                  >
                    {currencyOptions}
                  </Select>
                </center>
              </Col>
              <Col span={24}>
                {tradeDetail}
              </Col>
            </Row>
          </Col>
        </Row>
        <Table columns={cols} dataSource={this.state.tableData} size='small' />
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
