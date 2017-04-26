//! Shows detailed information about the user's current portfolio including its value over time, max value, etc.

import React from 'react';
import { connect } from 'dva';
// import { Row, Col } from 'antd';

import HistoricalDistributions from '../components/portfolio_analysis/HistoricalDistributions';

class PortfolioAnalysis extends React.Component {
  render() {
    return (
      <div>
        <HistoricalDistributions />
      </div>
    );
  }
}

export default connect()(PortfolioAnalysis);
