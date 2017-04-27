//! Interface to the internal data API used to retrieve data from the database.

const _ = require('lodash');
const fetch = require('node-fetch');

import { getBtcValue } from './exchangeRates';

const INTERNAL_API_URL = 'http://localhost:7878';

/**
 * Given an array of {pair, date} objects, queries the internal API to fetch the exchange rate at as close a
 * point to the supplied times for each of the requests.  Returns a promise that will yield all results
 * after they've all completed in the form `[{pair, rate, date} ...]`.
 */
function batchFetchRates(requests, poloRates, cmcRates, cachedRates, dispatch) {
  if(!cachedRates || !dispatch)
    debugger;

  return new Promise((f, r) => {
    const cachedResults = [];
    let needsFetch = [];
    // check if there's already a cached entry and if there is, return it without making any requests
    _.each(requests, req => {
      let isCached = false;
      _.each(cachedRates[req.pair], cachedRate => {
        if(new Date(cachedRate.date).getTime() == new Date(req.date).getTime()) {
          cachedResults.push(cachedRate);
          isCached = true;
        }
      });

      if(!isCached)
        needsFetch.push(req);
    });

    // map the dates to SQL format so they can be parsed by the API
    needsFetch = _.map(needsFetch, ({pair, date}) => {
      return {
        date: new Date(date).toISOString().substring(0, 19).replace('T', ' '),
        pair: pair,
      };
    });

    if(needsFetch.length === 0)
      return f(cachedResults);

    fetch(`${INTERNAL_API_URL}/batch_rate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(needsFetch)
    }).then(res => {
      return res.json();
    }).catch(err => {
      console.error(err)
    }).then(body => {
      // cache the rates internally
      dispatch({type: 'globalData/batchHistoricalRatesReceived', histRates: body});

      // if no data was found for a pair from the API, check other sources
      const mappedResults = _.map(body, ({no_data, pair, rate, date, cached}) => {
        if(no_data) {
          // if no historical data for the currency, then try to get the static rate from Poloniex or coinmarketcap
          rate = getBtcValue(pair.split('/')[1], 1, poloRates, cmcRates);
        }
        const realRate = pair.includes('USDT') ? 1 / rate : rate;

        return {pair, rate: realRate, date: new Date(date), no_data, cached};
      });

      f(_.concat(mappedResults, cachedResults));
    }).catch(err => {
      console.log('Error while trying to convert result from `batchFetchRates` from JSON.');
      r();
    });
  });
}

export { batchFetchRates };
