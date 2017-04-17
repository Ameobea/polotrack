//! Displays basic information about the current portfolio including holding distribution, current value in USD, currently
//! open trades and their P/L, as well as recent changes in portfolio value.

import React from 'react';
import { connect } from 'dva';
import { Pie } from 'react-chartjs-2';
const chroma = require('chroma-js');
const _ = require('lodash');

import { calcCurrentHoldings } from '../utils/portfolioCalc';

class PortfolioOverview extends React.Component {
  render() {
    const {deposits, withdrawls, trades, rates} = this.props;

    // must have poloniex rates loaded before rendering
    if(Object.keys(rates).length === 0)
      return (<div>Loading...</div>);

    const curHoldings = calcCurrentHoldings(deposits, withdrawls, trades);
    // construct a color scheme for the pie chart
    const getColor = chroma.scale('Spectral').domain([1, Object.keys(curHoldings).length]);

    const values = [];
    const labels = [];
    const colors = [];
    let i = 0;
    _.each(Object.keys(curHoldings), currency => {
      i += 1;
      let value = curHoldings[currency];

      if(currency == 'USDT') {
        value = value * +rates['USDT_BTC'].last * 1000;
      } else if(currency != 'BTC') {
        value = value * +rates[`BTC_${currency}`].last * 1000;
      }

      if(value > 0.0000001) {
        values.push(value);
        labels.push(currency);
        colors.push(getColor(i).hex());
      }
    });

    return (
      <div>
        <center><h1>Current Portfolio Distribution</h1></center>
        <Pie data={{datasets: [{data: values, backgroundColor: colors}], labels: labels}} />
      </div>
    );
  }
}

function mapProps(state) {
  return {
    deposits: state.userData.deposits,
    withdrawls: state.userData.withdrawls,
    trades: state.userData.trades,
    rates: state.globalData.poloRates,
  };
}

export default connect(mapProps)(PortfolioOverview);
