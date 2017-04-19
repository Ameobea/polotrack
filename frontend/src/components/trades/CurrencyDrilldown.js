//! Creates a detailed overview of currency changes with a chart showing when trades occured.  The chart will pull
//! candlestick data from the Poloniex API and also show
/* global d3, techan */

import React from 'react';
import ReactFauxDOM from 'react-faux-dom';
import { connect } from 'dva';

import { fetchPoloCandlestickData } from '../../utils/exchangeRates';

/**
 * Given candlestick data in the correct format, creates a faux dom element, renders the chart to it, and
 * returns it.
 */
function renderChart(candleData) {
  const chartElem = ReactFauxDOM.createElement('svg');

  const margin = {top: 20, right: 20, bottom: 30, left: 50},
    width = 1020 - margin.left - margin.right,
    height = 450 - margin.top - margin.bottom;
  const x = techan.scale.financetime()
    .range([0, width]);
  const y = d3.scaleLinear()
    .range([height, 0]);
  const candlestick = techan.plot.candlestick()
    .xScale(x)
    .yScale(y);
  const xAxis = d3.axisBottom()
    .scale(x);
  const yAxis = d3.axisLeft()
    .scale(y);

  const svg = d3.select(chartElem)
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  svg.append('g')
    .attr('class', 'candlestick');

  svg.append('g')
    .attr('class', 'x axis')
    .attr('transform', 'translate(0,' + height + ')');

  svg.append('g')
    .attr('class', 'y axis')
    .append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', 6)
    .attr('dy', '.71em')
    .style('text-anchor', 'end')
    .text('Price ($)');

  x.domain(candleData.map(candlestick.accessor().d));
  y.domain(techan.scale.plot.ohlc(candleData, candlestick.accessor()).domain());

  svg.selectAll('g.candlestick').datum(candleData).call(candlestick);
  svg.selectAll('g.x.axis').call(xAxis);
  svg.selectAll('g.y.axis').call(yAxis);

  return chartElem;
}

class CurrencyDrilldown extends React.Component {
  constructor(props) {
    super(props);

    this.generateChart = this.generateChart.bind(this);
    this.generateChart(props);

    this.state = {chartElem: null};
  }

  componentWillReceiveProps(nextProps) {
    this.setState({chartElem: null});
    this.generateChart(nextProps);
  }

  generateChart(props) {
    let {pair, startTime, endTime, period} = props;

    fetchPoloCandlestickData(pair, startTime, endTime, period).then(data => {
      this.setState({chartElem: renderChart(data)});
    }).catch(err => {
      console.log('Error while fetching candlestick data from Poloniex API: ');
      console.log(err);
    });
  }

  render() {
    if(this.state.chartElem) {
      return this.state.chartElem.toReact();
    } else {
      return <span>Loading...</span>;
    }
  }
}

export default connect()(CurrencyDrilldown);
