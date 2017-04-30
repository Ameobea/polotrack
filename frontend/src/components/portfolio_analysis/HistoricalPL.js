//! Renders a Highcharts visualization showing the total account profatibility at every historical event.
//! Calculated by (withdrawn + held) - deposited at every point using hostorical rates and values.

import React from 'react';
import { connect } from 'dva';
const Highchart = require('react-highcharts');

import { histBalancesShape } from '../../utils/propTypeDefs';

class HistoricalPL extends React.Component {
  constructor(props) {
    super(props);

    const { histPLs } = props;
    // combine all individual PL values into one value
    const combinedPLs = [];
    for(var i=0; i<histPLs[0].data.length; i++) {
      let totalPL = 0;
      for(var j=0; j<histPLs.length; j++) {
        totalPL += histPLs[j].data[i][1];
      }
      combinedPLs.push([histPLs[0].data[i][0], totalPL]);
    }

    this.chartConfig = {
      chart: {
        type: 'area',
        zoomType: 'x'
      },
      title: 'Historical Portfolio Profit/Loss',
      xAxis: {
        type: 'datetime',
      },
      yAxis: {
        title: {
          text: `${props.baseCurrencySymbol}${props.baseCurrency}`,
        },
      },
      tooltip: {
        formatter: function() {
          return `${new Date(this.x).toLocaleString()}<br>
                  ${props.baseCurrencySymbol}${this.y.toFixed(2)} ${props.baseCurrency}<br>`;
        },
      },
      plotOptions: {
        area: {
          animation: false,
          lineColor: '#ffffff',
          lineWidth: 1,
          marker: {
            lineWidth: 1,
            lineColor: '#ffffff'
          }
        }
      },
      series: [{
        name: 'Total Portfolio Profit/Loss',
        color: '#28ce0e',
        negativeColor: '#c90000',
        showInLegend: false,
        data: combinedPLs,
      }],
    };

    this.state = {};
  }

  render() {
    return (
      <Highchart config={this.chartConfig} isPureConfig />
    );
  }
}

HistoricalPL.propTypes = {
  baseCurrency: React.PropTypes.string.isRequired,
  baseCurrencySymbol: React.PropTypes.string.isRequired,
  histPLs: histBalancesShape,
};

function mapProps(state) {
  return {
    baseCurrency: state.globalData.baseCurrency,
    baseCurrencySymbol: state.globalData.baseCurrencySymbol,
    histPLs: state.userData.histPLs,
  };
}

export default connect(mapProps)(HistoricalPL);
