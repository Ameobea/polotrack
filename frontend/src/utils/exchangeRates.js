//! Functions for calculating exchange rates and retrieving live exchange rate data from external sources

const fetch = require('node-fetch');

const TICKER_URL = 'https://blockchain.info/ticker?cors=true';
const POLO_API_URL = 'https://poloniex.com/public';
const COINMARKETCAP_URL = 'https://ameo.link/cmcapi/v1/ticker/';

/**
 * Fetches the current exchange rate between BTC and the supplied base currency from the blockchain.info API.
 * Returns a promise that resolves to the supplied value when the request is complete.
 */
function getBtcUsdRate(baseCurrency) {
  return fetch(TICKER_URL).then(res => {
    return res.json();
  }).then(body => {
    const data = body[baseCurrency];
    return Math.round((data.buy + data.sell) * 100) / 200;
  }).catch(err => {
    console.error('Error while parsing btc exchange rates from JSON!');
  });
}

/**
 * Fetches the list of available base currencies that the blockchain.info API supports and returns a promise that
 * resolves to an array of the currency names after the request completes.
 */
function listBaseCurrencies() {
  return fetch(TICKER_URL).then(res => {
    return res.json();
  }).then(body => {
    return Object.keys(body);
  }).catch(err => {
    console.error('Error while parsing btc exchange rates from JSON in `listBaseCurrencies`!');
  });
}

/**
 * Fetches the current exchange rate for all available currencies from the Poloniex API and returns a promise that resolves
 * to the rates when the request has completed.
 */
function getPoloRates() {
  return fetch(`${POLO_API_URL}?command=returnTicker`)
    .then(res => res.json())
    .catch(err => {
      console.error('Error while parsing Poloniex exchange rates from JSON!');
    });
}

/**
 * Since this is the wonderful world of Crypto, the symbol names for currencies aren't standard.  This object maps Poloniex
 * symbols to coinmarketcap.com symbols.
 */
const cmcMappings = {
  NBT: 'NBIT', // TODO: Add others
};

/**
 * Retrieves the full ticker from coinmarketcap.com.  Returns a promise that yields the result once it's fetched.
 * Result is in the form of a map of an array of `{id, name, symbol, price_btc}`
 */
function getCoinmarketcapRates() {
  return fetch(COINMARKETCAP_URL)
    .then(res => res.json())
    .catch(err => {
      console.error('Error while parsing data from coinmarketcap from JSON!');
      console.log(err);
    });
}

/**
 * Pulls Poloniex candlestick data from their API, maps it to the form that TechanJS expects, and returns a Promise that
 * yields the results once the process is complete.  Pair should be in a format like BTC_XMR and timestamps sould be
 * Unix timestamps with second precision.
 */
function fetchPoloCandlestickData(pair, startTime, endTime, period) {
  return new Promise((f, r) => {
    fetch(`${POLO_API_URL}?command=returnChartData&currencyPair=${pair}&start=${startTime}&end=${endTime}&period=${period}`)
      .then(res => res.json())
      .then(body => {
        let mapped = _.map(body, candle => {
          return {
            date: new Date(candle.date * 1000),
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            volume: candle.volume,
          };
        });

        f(_.sortBy(mapped, 'date'));
      });
  });
}

/**
 * Gets the exchange rate for a currency in terms of BTC given the currency, the amount, and the exchange rates map.
 */
function getBtcValue(currency, amount, poloRates, coinmarketcapRates) {
  if(currency == 'USDT') {
    return amount * (1 / +poloRates['USDT_BTC'].last);
  } else if(currency == 'BTC') {
    return amount;
  } else {
    // default to Poloniex rates but, if none exist, use coinmarketcap's rates
    if(poloRates[`BTC_${currency}`]) {
      return amount * +poloRates[`BTC_${currency}`].last;
    } else {
      if(coinmarketcapRates[currency]) {
        return amount * +coinmarketcapRates[currency].price_btc;
      } else if(coinmarketcapRates[cmcMappings[currency]]) { // if we can't find the symbol, check the mappings
        return amount * +coinmarketcapRates[cmcMappings[currency]].price_btc;
      } else {
        // can't find it on Poloniex or cmc or via mappings so it's worthless and always was and return 0
        return 0;
      }
    }
  }
}

export { getBtcUsdRate, listBaseCurrencies, getPoloRates, getBtcValue, getCoinmarketcapRates, fetchPoloCandlestickData };
