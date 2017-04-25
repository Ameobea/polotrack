//! Renders a chart showing the historical distribution of portfolio holding over time

import React from 'react';
import { connect } from 'antd';
const Highchart = require('react-highcharts');
const _ = require('lodash');

class HistoricalDistributions extends React.Component {
  constructor(props) {
    super(props);

    this.chartConfig = {
      chart: {
        type: 'area',
      },
      title: 'Historical Portfolio Distribution',
      series: [],
    };

    this.state = {};
  }

  render() {
    return <Highchart config={this.chartConfig} isPureConfig />;
  }
}

export default connect()(HistoricalDistributions);
