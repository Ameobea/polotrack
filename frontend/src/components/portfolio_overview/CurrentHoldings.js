//! Creates a table showing a user's current holdings and the values of each currency as well as some
//! additional information about each of their held currencies.

import React from 'react';
import { connect } from 'dva';
import { Table, Tooltip, Icon } from 'antd';
const _ = require('lodash');

import gstyles from '../../static/css/global.css';
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
  title: (
    <Tooltip
      title='The average price paid for all of the currency since the last time the non-deposited balance was 0'
    >
      <span className={gstyles.defaultCursor}>Current Cost Basis <Icon type='question-circle-o' /></span>
    </Tooltip>
  ),
  key: 'costBasis',
  dataIndex: 'costBasis',
}, {
  title: 'Value',
  key: 'value',
  dataIndex: 'value',
  sorter: (a, b) => +a.value.substr(1) - +b.value.substr(1),
  sortOrder: 'descend',
}];

/// Creates a display that shows green if the cost basis is less than the current price and red otherwise with a tooltip
/// showing the current price.
const CostBasis = ({curPrice, basis}) => {
  const content = (basis > curPrice) ?
    <span className={gstyles.redMoney}>฿{basis.toFixed(8)}</span> :
    <span className={gstyles.greenMoney}>฿{basis.toFixed(8)}</span>;

  return (
    <Tooltip title={`Current Price: ฿${curPrice.toFixed(8)}`}>
      <span className={gstyles.defaultCursor}>{content}</span>
    </Tooltip>
  );
}

class CurrentHoldings extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    let {curHoldings, costBasises, rates, baseRate, baseCurrencySymbol} = this.props;

    if(Object.keys(rates).length === 0 || !this.props.baseRate)
      return <div>Loading...</div>;

    const tableData = _.map(Object.keys(curHoldings), currency => {
      let btcValue = getBtcValue(currency, curHoldings[currency], rates);
      let costBasis = costBasises[currency];
      let formattedBasis;
      if(costBasis && costBasis.total > 0) {
        formattedBasis = <CostBasis curPrice={btcValue / curHoldings[currency]} basis={costBasis.basis} />;
      } else {
        formattedBasis = 'N/A';
      }

      return {
        currency: currency,
        key: currency,
        amount: curHoldings[currency],
        costBasis: formattedBasis,
        value: `${baseCurrencySymbol}${(btcValue * baseRate).toFixed(2)}`,
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
