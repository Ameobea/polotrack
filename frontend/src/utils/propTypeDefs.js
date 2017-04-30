//! Prop type defintions or use with `propTypes`

import React from 'react';

const customTypes = {
  depositShape: React.PropTypes.shape({
    date: React.PropTypes.oneOfType([
      React.PropTypes.instanceOf(Date),
      React.PropTypes.string,
      React.PropTypes.number
    ]),
    currency: React.PropTypes.string.isRequired,
    amount: React.PropTypes.number.isRequired,
  }),
  withdrawlShape: React.PropTypes.shape({
    date: React.PropTypes.oneOfType([
      React.PropTypes.instanceOf(Date),
      React.PropTypes.string,
      React.PropTypes.number
    ]),
    currency: React.PropTypes.string.isRequired,
    amount: React.PropTypes.number.isRequired,
  }),
  tradeShape: React.PropTypes.shape({
    date: React.PropTypes.oneOfType([
      React.PropTypes.instanceOf(Date),
      React.PropTypes.string,
      React.PropTypes.number
    ]),
    pair: React.PropTypes.string.isRequired,
    amount: React.PropTypes.number.isRequired,
    buy: React.PropTypes.bool.isRequired,
    price: React.PropTypes.number.isRequired,
    cost: React.PropTypes.number.isRequired,
    fee: React.PropTypes.number.isRequired,
  }),
  histBalancesShape: React.PropTypes.arrayOf(
    React.PropTypes.shape({
      name: React.PropTypes.string.isRequired,
      data: React.PropTypes.arrayOf(React.PropTypes.arrayOf(React.PropTypes.number)).isRequired,
    })
  ),
  poloRatesShape: React.PropTypes.objectOf(React.PropTypes.shape({
    last: React.PropTypes.string.isRequired,
  })),
  cmcRatesShape: React.PropTypes.objectOf(React.PropTypes.shape({
    name: React.PropTypes.string.isRequired,
    price_btc: React.PropTypes.string,
    price_usd: React.PropTypes.string,
    symbol: React.PropTypes.string.isRequired,
  })),
};

export default customTypes;
