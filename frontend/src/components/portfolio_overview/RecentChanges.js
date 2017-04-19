//! Small table showing portfolio value changes in the last day, week, and month including an option to
//! toggle whether or not to include deposits and withdrawls in the calculation.

import React from 'react';
import { connect } from 'dva';
import { Table, Switch } from 'antd';
const _ = require('lodash');

import gstyles from '../../static/css/global.css';
import { calcRecentChanges } from '../../utils/portfolioCalc';

const columns = [{
  title: 'Time Range',
  key: 'title',
  dataIndex: 'title',
}, {
  title: 'Value Change',
  key: 'delta',
  dataIndex: 'delta',
}];

/// Utility function to match indexes with the time offset that it is
function formatOffset(i) {
  if(i == 0) {
    return '1 Hour';
  } else if(i == 1) {
    return '1 Day';
  } else if(i == 2) {
    return '1 Week';
  } else if(i == 3) {
    return '1 Month';
  }
}

class RecentChanges extends React.Component {
  constructor(props) {
    super(props);

    this.handleSwitch = this.handleSwitch.bind(this);
    this.recalculateChanges = this.recalculateChanges.bind(this);

    this.state = {
      recentChanges: null,
      includeDepsWithdrawls: true,
    };
  }

  componentWillReceiveProps() {
    this.recalculateChanges(!this.state.includeDepsWithdrawls);
  }

  recalculateChanges(onlyTrades) {
    let {deposits, withdrawls, trades, curValue, curHoldings} = this.props;
    calcRecentChanges(deposits, withdrawls, trades, curHoldings, curValue, onlyTrades).then(res => {
      this.setState({recentChanges: res});
    });
  }

  handleSwitch(status) {
    this.setState({includeDepsWithdrawls: status});
    this.recalculateChanges(!status);
  }

  render() {
    if(this.state.recentChanges === null) {
      return <span>Loading...</span>;
    }

    const tableData = _.map(this.state.recentChanges, ({index, value}) => {
      const content = (value > this.props.curValue) ? (
        <span className={gstyles.redMoney}>
          {`${this.props.baseCurrencySymbol}${(this.props.baseRate * (this.props.curValue - value)).toFixed(2)}`}
        </span>
      ) : (
        <span className={gstyles.greenMoney}>
          {`${this.props.baseCurrencySymbol}${(this.props.baseRate * (this.props.curValue - value)).toFixed(2)}`}
        </span>
      );

      return {
        title: formatOffset(index),
        key: index,
        delta: content,
      };
    });

    return (
      <div>
        <p>Include deposits/withdrawls <Switch checked={this.state.includeDepsWithdrawls} onChange={this.handleSwitch} /></p>
        <Table
          columns={columns}
          dataSource={tableData}
          pagination={false}
          showHeader={false}
          size='small'
        />
      </div>
    );
  }
}

function mapProps(state) {
  return {
    deposits: state.userData.deposits,
    withdrawls: state.userData.withdrawls,
    trades: state.userData.trades,
    baseCurrencySymbol: state.globalData.baseCurrencySymbol,
    baseRate: state.globalData.baseExchangeRate,
  };
}

export default connect(mapProps)(RecentChanges);
