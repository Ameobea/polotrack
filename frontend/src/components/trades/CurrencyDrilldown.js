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
function renderChart(candleData, baseWidth) {
  const chartElem = ReactFauxDOM.createElement('svg');

  const windowHeight = window.innerHeight
    || document.documentElement.clientHeight
    || document.body.clientHeight;
  const margin = {top: 20, right: 20, bottom: 30, left: 50},
    width = baseWidth - margin.left - margin.right,
    height = (.6 * windowHeight) - margin.top - margin.bottom;
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

    this.getRef = this.getRef.bind(this);
    this.generateChart = this.generateChart.bind(this);

    this.state = {chartElem: null};
  }

  componentWillReceiveProps(nextProps) {
    this.setState({chartElem: null});
    this.generateChart(nextProps);
  }

  componentDidMount() {
    this.generateChart(this.props);
  }

  generateChart(props) {
    let {pair, startTime, endTime, period} = props;

    fetchPoloCandlestickData(pair, startTime, endTime, period).then(data => {
      this.setState({chartElem: renderChart(data, this.container.offsetWidth)});
    }).catch(err => {
      console.log('Error while fetching candlestick data from Poloniex API: ');
      console.log(err);
    });
  }

  getRef(container) {
    this.container = container;
  }

  render() {
    let content;
    if(this.state.chartElem) {
      content = this.state.chartElem.toReact();
    } else {
      content = <span>Loading...</span>;
    }

    return (
      <div ref={this.getRef}>
        {content}
      </div>
    );
  }
}

export default connect()(CurrencyDrilldown);
