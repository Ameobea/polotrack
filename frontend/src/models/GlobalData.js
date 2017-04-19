//! Keeps track of data that affects the state of the entire application including exchange rates and cached
//! data from both the Poloniex and internal API.

export default {
  namespace: 'globalData',

  state: {
    baseCurrency: 'USD',
    baseCurrencySymbol: '$',
    baseExchangeRate: null,
    poloRates: {}, // the current exchange rates vs. BTC for all available currencies
    coinmarketcapRates: null,
  },

  reducers: {
    /**
     * Triggered when the user selects a new base currency from the dropdown
     */
    baseCurrencyChanged(state, {newBaseCurrency, newBaseCurrencySymbol}) {
      return {...state,
        baseCurrency: newBaseCurrency,
        baseCurrencySymbol: newBaseCurrencySymbol,
      };
    },

    /**
     * Triggered when an exchange rate update from the blockchain.info API is recieved with an updated BTC/base currency
     * exchange rate.
     */
    baseRateUpdated(state, {rate}) {
      return {...state,
        baseExchangeRate: rate,
      };
    },

    /**
     * Triggered when new exchange rate data is received from the Poloniex API.
     */
    poloRatesUpdate(state, {rates}) {
      return {...state,
        poloRates: rates,
      };
    },

    /**
     * Triggered when the coinmarketcap.com rates are recieved
     */
    coinmarketcapRatesReceived(state, {rates}) {
      return {...state,
        coinmarketcapRates: rates,
      };
    },
  },
};
