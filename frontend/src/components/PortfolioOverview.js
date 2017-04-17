//! Displays basic information about the current portfolio including holding distribution, current value in USD, currently
//! open trades and their P/L, as well as recent changes in portfolio value.

import React from 'react';
import { connect } from 'dva';
import { Pie } from 'react-chartjs';

// http://preev.com/pulse/units:btc+usd/sources:bitfinex+bitstamp+btce

class PortfolioOverview extends React.Component {
  render() {
    return (
      <div>
        <h1>Current Portfolio Distribution</h1>
      </div>
    );
  }
}

export default connect()(PortfolioOverview);
