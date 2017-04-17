//! Creates a table showing a user's current holdings and the values of each currency as well as some
//! additional information about each of their held currencies.

import React from 'react';
import { connect } from 'dva';
import { Table } from 'antd';
const _ = require('lodash');

import { getBtcValue } from '../../utils/exchangeRates';

const tableColumns = [{
  title: 'Currency',
  key: 'currency',
  dataIndex: 'currency',
}, {
  title: 'Amount',
  key: 'amount',
  dataIndex: 'amount',
}, {
  title: 'Value',
  key: 'value',
  dataIndex: 'value',
  sorter: (a, b) => +a.value.substr(1) - +b.value.substr(1),
  sortOrder: 'descend',
}];

class CurrentHoldings extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    let {curHoldings, rates, baseRate, baseCurrencySymbol} = this.props;

    if(Object.keys(rates).length === 0 || !this.props.baseRate)
      return <div>Loading...</div>;

    const tableData = _.map(Object.keys(curHoldings), currency => {
      return {
        currency: currency,
        key: currency,
        amount: curHoldings[currency],
        value: `${baseCurrencySymbol}${(getBtcValue(currency, curHoldings[currency], rates) * baseRate).toFixed(2)}`,
      };
    });

    return (
      <Table columns={tableColumns} dataSource={tableData} size='small' />
    );
  }
}

function mapProps(state) {
  return {
    baseRate: state.globalData.baseExchangeRate,
    baseCurrency: state.globalData.baseCurrency,
    baseCurrencySymbol: state.globalData.baseCurrencySymbol,
    rates: state.globalData.poloRates,
  };
}

export default connect(mapProps)(CurrentHoldings);
