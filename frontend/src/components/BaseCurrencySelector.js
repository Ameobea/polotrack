//! Dropdown that allows users to select the base currency that they want to use for prices on the application.

import React from 'react';
import { connect } from 'dva';
const _ = require('lodash');
import Lockr from 'lockr';
import { Select } from 'antd';
const Option = Select.Option;

class BaseCurrencySelector extends React.Component {
  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
    this.options = _.map(props.baseCurrencies, currency => <Option key={currency} value={currency}>{currency}</Option>);
    this.state = {};
  }

  handleChange(currency) {
    const baseSymbol = this.props.baseCurrencySymbols[this.props.baseCurrencies.indexOf(currency)];
    Lockr.prefix = 'userData';
    Lockr.set('baseCurrency', JSON.stringify({currency: currency, symbol: baseSymbol}));
    this.props.dispatch({type: 'globalData/baseCurrencyChanged', newBaseCurrency: currency, newBaseCurrencySymbol: baseSymbol});
  }

  render() {
    return (
      <Select onChange={this.handleChange} placeholder='Base currency' style={{width: 120}}>
        {this.options}
      </Select>
    );
  }
}

BaseCurrencySelector.PropTypes = {};

function mapProps(state) {
  return {
    baseCurrency: state.globalData.baseCurrency,
    baseCurrencies: state.globalData.baseCurrencies,
    baseCurrencySymbols: state.globalData.baseCurrencySymbols,
  };
}

export default connect(mapProps)(BaseCurrencySelector);
