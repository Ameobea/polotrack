//! Constructs a pie chart showing current portfolio distribution and each currency value in USD.

import React from 'react';
import { connect } from 'dva';
const Highchart = require('react-highcharts');
const chroma = require('chroma-js');
const _ = require('lodash');

import { getBtcValue } from '../../utils/exchangeRates';

class PortfolioDistribution extends React.Component {
  constructor(props) {
    super(props);
    const {curHoldings, rates, baseCurrencySymbol, baseRate} = props;

    // construct a color scheme for the pie chart
    const getColor = chroma.scale('Spectral').domain([1, Object.keys(curHoldings).length]);

    this.getBaseRate = this.getBaseRate.bind(this);
    const getBaseRate = this.getBaseRate;

    this.chartConfig = {
      chart: {
        plotBackgroundColor: null,
        plotBorderWidth: null,
        plotShadow: false,
        type: 'pie',
      },
      colors: _.times(Object.keys(curHoldings).length, index => {
        return getColor(index).hex();
      }),
      title: {
        text: 'Current Portfolio Distribution',
      },
      tooltip: {
        formatter: function() {
          return `฿${this.y.toFixed(6)}<b> ${baseCurrencySymbol}${(this.y * getBaseRate()).toFixed(2)}</b>`;
        },
      },
      plotOptions: {
        pie: {
          allowPointSelect: false,
          dataLabels: {
            enabled: true,
            format: '{point.name}: {point.percentage:.1f} %',
          }
        }
      },
      series: [{
        name: 'Currencies',
      }],
    };

    this.state = {};
  }

  getBaseRate() {
    return this.props.baseRate;
  }

  getSeriesData(curHoldings, rates) {
    let i = 0;
    return _.map(Object.keys(curHoldings), currency => {
      i += 1;

      return {
        name: currency,
        y: getBtcValue(currency, curHoldings[currency], rates),
      }
    });
  }

  render() {
    const {curHoldings, rates, baseCurrencySymbol, baseRate} = this.props;

    // must have poloniex rates loaded before rendering
    if(Object.keys(rates).length === 0 || baseRate === null)
      return (<div>Loading...</div>);

    this.chartConfig.series[0].data = this.getSeriesData(curHoldings, rates);

    return (
      <Highchart config={this.chartConfig} isPureConfig />
    );
  }
}

function mapProps(state) {
  return {
    rates: state.globalData.poloRates,
    baseCurrencySymbol: state.globalData.baseCurrencySymbol,
    baseRate: state.globalData.baseExchangeRate,
  };
}

export default connect(mapProps)(PortfolioDistribution);
