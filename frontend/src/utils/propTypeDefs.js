//! Prop type defintions or use with `propTypes`

import PropTypes from 'prop-types';

const customTypes = {
  depositShape: PropTypes.shape({
    date: PropTypes.oneOfType([
      PropTypes.instanceOf(Date),
      PropTypes.string,
      PropTypes.number
    ]),
    currency: PropTypes.string.isRequired,
    amount: PropTypes.number.isRequired,
  }),
  withdrawlShape: PropTypes.shape({
    date: PropTypes.oneOfType([
      PropTypes.instanceOf(Date),
      PropTypes.string,
      PropTypes.number
    ]),
    currency: PropTypes.string.isRequired,
    amount: PropTypes.number.isRequired,
  }),
  tradeShape: PropTypes.shape({
    date: PropTypes.oneOfType([
      PropTypes.instanceOf(Date),
      PropTypes.string,
      PropTypes.number
    ]),
    pair: PropTypes.string.isRequired,
    amount: PropTypes.number.isRequired,
    buy: PropTypes.bool.isRequired,
    price: PropTypes.number.isRequired,
    cost: PropTypes.number.isRequired,
    fee: PropTypes.number.isRequired,
  }),
  histBalancesShape: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      data: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
    })
  ),
  poloRatesShape: PropTypes.objectOf(PropTypes.shape({
    last: PropTypes.string.isRequired,
  })),
  cmcRatesShape: PropTypes.objectOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    price_btc: PropTypes.string,
    price_usd: PropTypes.string,
    symbol: PropTypes.string.isRequired,
  })),
};

export default customTypes;
