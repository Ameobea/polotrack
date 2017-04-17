//! Displays basic information about the current portfolio including holding distribution, current value in USD, currently
//! open trades and their P/L, as well as recent changes in portfolio value.

import React from 'react';
import { connect } from 'dva';
import { Row, Col } from 'antd';

import { calcCurrentHoldings } from '../../utils/portfolioCalc';
import CurrentHoldings from './CurrentHoldings';
import PortfolioDistribution from './PortfolioDistribution';

class PortfolioOverview extends React.Component {
  render() {
    const {deposits, withdrawls, trades} = this.props;
    const curHoldings = calcCurrentHoldings(deposits, withdrawls, trades);

    return (
      <div>
        <Row>
          <Col md={12} xs={24}>
            <center><h1>Current Holdings</h1></center>
            <CurrentHoldings curHoldings={curHoldings} />
          </Col>
          <Col md={12} xs={24}>
            <center><h1>Current Portfolio Distribution</h1></center>
            <PortfolioDistribution curHoldings={curHoldings} />
          </Col>
        </Row>
      </div>
    );
  }
}

function mapProps(state) {
  return {
    deposits: state.userData.deposits,
    withdrawls: state.userData.withdrawls,
    trades: state.userData.trades,
  }
}

export default connect(mapProps)(PortfolioOverview);
