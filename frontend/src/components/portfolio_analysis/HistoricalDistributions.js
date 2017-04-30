//! Renders a chart showing the historical distribution of portfolio holding over time

import React from 'react';
import { connect } from 'dva';
import { Row, Col, Switch } from 'antd';
const Highchart = require('react-highcharts');
const _ = require('lodash');
const chroma = require('chroma-js');

class HistoricalDistributions extends React.Component {
  constructor(props) {
    super(props);

    this.handleToggle = this.handleToggle.bind(this);

    this.chartConfig = {
      chart: {
        type: 'area',
        zoomType: 'x'
      },
      title: 'Historical Portfolio Distribution',
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
          return `<b>${this.series.name}</b> - ${new Date(this.x).toLocaleString()}<br>
                  ${props.baseCurrencySymbol}${this.y.toFixed(2)} ${props.baseCurrency}<br>
                  ${this.percentage.toFixed(1)}%`;
        },
      },
      plotOptions: {
        area: {
          animation: false,
          stacking: 'normal',
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

    this.state = {percentageBased: false};
  }

  handleToggle() {
    this.setState({percentageBased: !this.state.percentageBased});
  }

  render() {
    const {baseCurrency, baseCurrencySymbol} = this.props;

    // construct a color scheme for the pie chart
    const getColor = chroma.scale(['black', 'red', 'green', 'blue', 'white']).domain([0, this.props.histBalances.length]);

    const chartConfig = {...this.chartConfig,
      colors: _.times(this.props.histBalances.length, index => {
        return getColor(index).hex();
      }),
      yAxis: {
        title: {
          text: this.state.percentageBased ? 'Percent' : `${baseCurrencySymbol}${baseCurrency}`,
        },
      },
      plotOptions: {
        area: {...this.chartConfig.plotOptions.area,
          stacking: this.state.percentageBased ? 'percent' : 'normal',
        },
      },
      series: this.props.histBalances,
    };

    return (
      <div>
        <Row>
          <Col span={12}>
            <center><p><i>Click and drag to zoom</i></p></center>
          </Col>
          <Col span={12}>
            <center>
              Percentage-Based <Switch checked={this.state.percentageBased} onChange={this.handleToggle} />
            </center>
          </Col>
        </Row>
        <Highchart config={chartConfig} isPureConfig />
      </div>
    );
  }
}

function mapProps(state) {
  return {
    baseCurrency: state.globalData.baseCurrency,
    baseCurrencySymbol: state.globalData.baseCurrencySymbol,
    histBalances: state.userData.histBalances,
  };
}

export default connect(mapProps)(HistoricalDistributions);
