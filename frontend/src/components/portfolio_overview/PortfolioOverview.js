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
import RecentChanges from './RecentChanges';

class PortfolioOverview extends React.Component {
  constructor(props) {
    super(props);

    this.calcBasises = this.calcBasises.bind(this);

    this.state = {costBasises: null};
  }

  componentDidMount() {
    if(this.props.poloRates && this.props.cmcRates)
      this.calcBasises(this.props);
  }

  componentWillReceiveProps(nextProps) {
    let {poloRates, cmcRates} = nextProps;

    if(!poloRates || !cmcRates)
      return;

    // only calculate cost basises if this is the first time we're receiving `poloRates` and `cmcRates`
    if(!this.props.poloRates || !this.props.cmcRates)
      this.calcBasises(nextProps);
  }

  calcBasises(props) {
    let {trades, poloRates, cmcRates, cachedRates, dispatch} = props;
    calcCostBasises(trades, poloRates, cmcRates, cachedRates, dispatch).then(basises => {
      this.setState({costBasises: basises});
    });
  }

  render() {
    const {deposits, withdrawls, trades, poloRates, cmcRates, baseRate, baseCurrencySymbol, coinmarketcapRates} = this.props;
    const curHoldings = calcCurrentHoldings(deposits, withdrawls, trades);

    if(!this.state.costBasises || !cmcRates)
      return <span>Loading...</span>;

    let portfolioValueString;
    var portfolioValue = 0;
    if(Object.keys(poloRates).length > 0) {
      _.each(Object.keys(curHoldings), currency => {
        portfolioValue += getBtcValue(currency, curHoldings[currency], poloRates, cmcRates);
      });
      portfolioValueString = `${baseCurrencySymbol}${(portfolioValue * baseRate).toFixed(2)}`;
    } else {
      portfolioValueString = 'Loading...';
    }

    return (
      <div>
        <Row>
          <Col md={6} xs={12}>
            <center>
              <h1>Portfolio Value</h1>
              <div className={gstyles.hugeText}>
                <b>{portfolioValueString}</b>
              </div>
            </center>
          </Col>
          <Col md={6} xs={12}>
            <center>
              <h1>Recent Changes</h1>
              <RecentChanges curHoldings={curHoldings} curValue={portfolioValue} />
            </center>
          </Col>
          <Col md={6} xs={12}>
            <center>
              <h1>Bitcoin Price</h1>
              <div className={gstyles.hugeText}>
                <b>{baseRate ? `${baseCurrencySymbol}${baseRate.toFixed(2)}` : 'Loading...'}</b>
              </div>
            </center>
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
    poloRates: state.globalData.poloRates,
    baseRate: state.globalData.baseExchangeRate,
    baseCurrencySymbol: state.globalData.baseCurrencySymbol,
    cmcRates: state.globalData.coinmarketcapRates,
    cachedRates: state.globalData.cachedRates,
  };
}

export default connect(mapProps)(PortfolioOverview);
