//! Interface to the internal data API used to retrieve data from the database.

const _ = require('lodash');
const fetch = require('node-fetch');

const INTERNAL_API_URL = 'http://localhost:7878';

/**
 * Given an array of {pair, date} objects, queries the internal API to fetch the exchange rate at as close a
 * point to the supplied times for each of the requests.  Returns a promise that will yield all results
 * after they've all completed in the form `[{pair, rate, date} ...]`.
 */
function batchFetchRates(requests) {
  return Promise.all(_.map(requests, ({pair, date}) => {
    return new Promise((f, r) => {
      fetch(`${INTERNAL_API_URL}/rate/${encodeURIComponent(pair)}/${encodeURIComponent(new Date(date).toISOString().substring(0, 19).replace('T', ' '))}`).then(res => {
        return res.json();
      }).then(body => {
        f({
          pair: pair,
          rate: body.rate,
          date: date,
        });
      }).catch(err => {
        console.log('Error while trying to convert result from `batchFetchRates` from JSON.');
        r();
      });
    });
  }));
}

export { batchFetchRates };
