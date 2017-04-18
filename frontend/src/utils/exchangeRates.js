//! Functions for calculating exchange rates and retrieving live exchange rate data from external sources

const fetch = require('node-fetch');

const TICKER_URL = 'https://blockchain.info/ticker?cors=true';
const POLO_API_URL = 'https://poloniex.com/public';

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
    console.error('Error while parsing btc exchange rates from JSON!')
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
    console.error('Error while parsing btc exchange rates from JSON in `listBaseCurrencies`!')
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
      console.error('Error while parsing Poloniex exchange rates from JSON!')
    });
}

/**
 * Gets the exchange rate for a currency in terms of BTC given the currency, the amount, and the exchange rates map.
 */
function getBtcValue(currency, amount, rates) {
  if(currency == 'USDT') {
    return amount * (1 / +rates['USDT_BTC'].last);
  } else if(currency == 'BTC') {
    return amount;
  } else {
    return amount * +rates[`BTC_${currency}`].last;
  }
}

export { getBtcUsdRate, listBaseCurrencies, getPoloRates, getBtcValue };
