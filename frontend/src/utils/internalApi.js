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
      if(pair == 'BTC/BTC')
        return f({pair: pair, date: date, rate: 1});

      const sqlDate = new Date(date).toISOString().substring(0, 19).replace('T', ' ');
      fetch(`${INTERNAL_API_URL}/rate/${encodeURIComponent(pair)}/${encodeURIComponent(sqlDate)}`).then(res => {
        return res.json();
      }).then(body => {
        if(body.no_data)
          console.log(`No data for pair ${pair} at time ${sqlDate}`);
        // if(!body.cached)
        //   console.log(`Uncached: ${pair} at ${sqlDate}`);

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
