//! Displays basic information about the current portfolio including holding distribution, current value in USD, currently
//! open trades and their P/L, as well as recent changes in portfolio value.

import React from 'react';
import { connect } from 'dva';
import { Row, Col } from 'antd';
const _ = require('lodash');

import gstyles from '../../static/css/global.css';
import { getBtcValue } from '../../utils/exchangeRates';
import { calcCurrentHoldings, calcCostBasises } from '../../utils/portfolioCalc';
import CurrentHoldings from './CurrentHoldings';
import PortfolioDistribution from './PortfolioDistribution';

class PortfolioOverview extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      costBasises: null,
    };
  }

  componentWillReceiveProps() {
    calcCostBasises(this.props.trades).then(basises => {
      this.setState({costBasises: basises});
    });
  }

  render() {
    const {deposits, withdrawls, trades, rates, baseRate, baseCurrencySymbol} = this.props;
    const curHoldings = calcCurrentHoldings(deposits, withdrawls, trades);

    if(!this.state.costBasises)
      return <span>Loading...</span>;

    let portfolioValueString;
    if(Object.keys(rates).length > 0) {
      let portfolioValue = 0;
      _.each(Object.keys(curHoldings), currency => {
        portfolioValue += getBtcValue(currency, curHoldings[currency], rates);
      });
      portfolioValueString = `${baseCurrencySymbol}${(portfolioValue * baseRate).toFixed(2)}`;
    } else {
      portfolioValueString = 'Loading...';
    }

    return (
      <div>
        <Row>
          <Col md={24} xs={24}>
            <center>
              <h1>Portfolio Value</h1>
              <div className={gstyles.hugeText}>
                <b>{portfolioValueString}</b>
              </div>
            </center>
          </Col>
          <Col md={24} xs={24}>
            <center><h1>Placeholder</h1></center>
          </Col>
        </Row>

        <Row>
          <Col md={12} xs={24}>
            <center><h1>Holdings</h1></center>
            <CurrentHoldings costBasises={this.state.costBasises} curHoldings={curHoldings} />
          </Col>
          <Col md={12} xs={24}>
            <center><h1>Portfolio Distribution</h1></center>
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
    rates: state.globalData.poloRates,
    baseRate: state.globalData.baseExchangeRate,
    baseCurrencySymbol: state.globalData.baseCurrencySymbol,
  };
}

export default connect(mapProps)(PortfolioOverview);
