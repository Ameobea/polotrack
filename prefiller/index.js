//! Entry point for the prefiller application.  Fill in the config values in `conf.js` using `conf.sample.js`
//! as an example before running.  See README.md for additional information.
/* eslint-env node */

const fetch = require('node-fetch');
const mysql = require('mysql');
const _ = require('lodash');

const priv = require('./conf');

const SECONDS_IN_A_YEAR = 31556926;

const connection = mysql.createConnection({
  host     : priv.mysqlHost,
  user     : priv.mysqlUsername,
  password : priv.mysqlPassword,
  database : priv.mysqlDatabase,
});
connection.connect();

// fetch the Currencies page from the Poloniex API and parse it from JSON
fetch('https://poloniex.com/public?command=returnCurrencies')
  .then(res => {
    return res.json();
  }).then(body => {
    // just use the list of all currencies so that we can download their BTC exchange history
    downloadCurrencies(Object.keys(body));
  });

// fetch historical BTC prices and insert them into the database
const baseCurrencies = ['USD', 'EUR', 'JPY', 'GBP', 'CAD', 'NZD', 'NOK'];
_.each(baseCurrencies, (currency, index) => {
  // create the table if it doesn't exist and set up indexes
  const tableQuery = `CREATE TABLE trades_BTC_${currency} (
    trade_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    rate FLOAT NOT NULL
  );`;
  connection.query(tableQuery, (err, res, fields) => {
    if(!err) {
      const query2 = `CREATE INDEX trade_timestamp ON trades_BTC_${currency} (trade_time);`;
      connection.query(query2, (err, res, fields) => {
        const query3 = `ALTER TABLE \`trades_BTC_${currency}\` ADD UNIQUE(\`trade_time\`);`;
        connection.query(query3);
      });
    }
  });

  setTimeout(() => {
    _.each(['all', 'hour'], period => {
      console.log(`Downloading BTC_${currency} data from coinbase with period ${period}...`);
      fetch(`https://api.coinbase.com/v2/prices/BTC-${currency}/historic?period=${period}`)
        .then(res => res.json())
        .then(body => {
          let query = `INSERT IGNORE INTO trades_BTC_${currency} (trade_time, rate) VALUES `;
          query += _.map(body.data.prices, ({price, time}) => {
            return `('${new Date(time).toISOString().substring(0, 19).replace('T', ' ')}', ${+price})`;
          }).join(', ');
          query += ';';

          connection.query(query, (err, res, fields) => {
            if(err) {
              console.log('Error while inserting historical BTC exchange rates into table:');
              console.log(err);
            }
          });
        }).catch(err => {
          console.log('Error while parsing response from Coinbase API out of JSON: ');
          console.log(err);
        });
    });
  }, (1 + index) * 1300);
});

/**
 * Loops through all currencies listed on the Currencies endpoint and downloads their trade history one block at a time,
 * storing it in the MySQL database in tables by currency.
 */
function downloadCurrencies(currencies) {
  var i = 0;

  function next() {
    // have to make special considerations for USDT/BTC
    let pair;
    if(currencies[i] != 'USDT'){
      pair = `BTC_${currencies[i]}`;
    } else {
      pair = 'BTC_USDT';
    }
    console.log(`Starting download for pair ${pair}...`);

    // create a database table for the data of this pair
    const query = `CREATE TABLE trades_${pair} (
      id INT PRIMARY KEY NOT NULL,
      trade_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      rate FLOAT NOT NULL
    );`;
    connection.query(query, (err, res, fields) => {
      if(!err) {
        const query2 = `CREATE INDEX trade_timestamp ON trades_${pair} (trade_time);`;
        connection.query(query2, (err, res, fields) => {
          const query3 = `ALTER TABLE \`trades_${pair}\` ADD UNIQUE(\`trade_time\`);`;
          connection.query(query3);
        });
      }
    });

    doDownload(pair, done);
  }

  function done() {
    i += 1;
    if(i < currencies.length) {
      next();
    } else {
      console.log('Successfully finished downloading all data.');
      process.exit(0);
    }
  }

  next();
}

/**
 * Finds the date of the most recent exchange rate update for a given pair.  Returns a promise that resolves
 * after the database query is completed.
 */
function getLatestUpdate(pair) {
  const query = `SELECT trade_time FROM trades_${pair} ORDER BY trade_time DESC LIMIT 1;`;
  return new Promise((f, r) => {
    connection.query(query, (err, res, fields) => {
      if(err) {
        r(err);
      } else if(res.length > 0) {
        f(res[0].trade_time);
      } else {
        f(null);
      }
    });
  });
}

/**
 * Downloads all historical ticks for a given pair, storing them in the database.
 */
function doDownload(pair, done) {
  // Determine if there data already exists in the database and, if it does, pick the most recent point
  // as the starting point.  If not, start in 2010 so that we know we don't miss any history
  // the start point of the current download segment's query
  getLatestUpdate(pair).then(date => {
    let startTimestamp, curStartTimestamp;
    if(date) {
      startTimestamp = date.getTime() / 1000;
      curStartTimestamp = startTimestamp;
    } else {
      startTimestamp = 1262304000;
      curStartTimestamp = 1262304000;
    }

    let endTimestamp = (new Date().getTime() / 1000) + 86400; // end at our current timestamp plus 24 hours
    // true if we're currently working our way back in time in a large segment
    let areBacktracking = false;

    // make sure that we're requesting less than a year's worth of trades to start off
    let curEndTimestamp;
    if((endTimestamp - curStartTimestamp) > SECONDS_IN_A_YEAR) {
      curEndTimestamp = curStartTimestamp + (SECONDS_IN_A_YEAR * .99);
    } else {
      curEndTimestamp = endTimestamp;
    }

    // the most recent ticks that have been downloaded.  Since the segment's stop point is reduced until it is all downloaded,
    // this value is used to determine where to start the next segment once it's completely downloaded.
    let maxEndTimestamp = curEndTimestamp;

    function downloadChunk() {
      console.log(`Downloading chunk from ${curStartTimestamp} : ${curEndTimestamp}`);
      fetchTradeHistory(pair, curStartTimestamp, curEndTimestamp).then((data) => {
        try {
          let sortedData = _.sortBy(data, trade => trade.tradeID);
          // process the trades into the database
          if(data.length > 0) {
            let query = `INSERT IGNORE INTO trades_${pair} (id, trade_time, rate) VALUES `;
            query += _.map(data, trade => {
              let timestamp = new Date(trade.date + ' GMT').toISOString().slice(0, 19).replace('T', ' ');
              // insert the trade into the database
              return `(${trade.globalTradeID}, "${timestamp}", ${+trade.rate})`;
            }).join(', ');
            query += ';';
            connection.query(query);
          }

          if(maxEndTimestamp < curEndTimestamp) {
            console.log(`New \`maxEndTimestamp\` set: ${maxEndTimestamp}`);
            maxEndTimestamp = curEndTimestamp;
          }

          if(data.length === 50000) {
            // if it was more than 50,000 trades, download what's missing before going on
            curEndTimestamp = Math.round(new Date(sortedData[0].date + ' GMT').getTime() / 1000) - 1;
            // if this is the first attempt to download an oversized segment, update `maxEndTimestamp`
            if(!areBacktracking){
              console.log('We weren\'t backtracking but now are due to hitting a max-sized result');
              console.log(`curStartTimestamp: ${curStartTimestamp}, new curEndTimestamp: ${curEndTimestamp}`);
              areBacktracking = true;
            }
          } else {
            // if we're backtracking and hit this code, it means we've finished the oversized segment and can move on.
            if(areBacktracking) {
              console.log(`We were backtracking but hit a result with size ${data.length}.`);
              console.log(`Setting start timestamp to after previous max end timestamp: ${maxEndTimestamp}`);
              curStartTimestamp = maxEndTimestamp + 1;
              areBacktracking = false;
            } else {
              console.log('Not currently backtracking and hit non-full block; downloading next segment.');
              curStartTimestamp = curEndTimestamp + 1;
            }

            // if less than 50,000 trades, then download the next segment
            if(endTimestamp - curEndTimestamp > SECONDS_IN_A_YEAR) {
              console.log('More than a year\'s worth of data remaining before end; setting next segment size to one year after `curStartTimestamp`.');
              curEndTimestamp = curStartTimestamp + (SECONDS_IN_A_YEAR * .99);
            } else if(curEndTimestamp >= endTimestamp || curStartTimestamp >= endTimestamp) {
              console.log('Download complete!');
              return done(); // indicate that we're finished download all data for this pair and to download the next one
            } else {
              console.log('Less than a year remaining after current download and end; queueing up final block...');
              curEndTimestamp = endTimestamp;
            }
          }

          // download the next chunk after waiting a few seconds as to avoid overloading their API
          setTimeout(() => {
            downloadChunk();
          }, 10254);
        } catch(err) {
          console.log(err);
        }
      }).catch(error => {
        // if no data is available for the pair, ignore it and move on.
        if(error == 'Invalid currency pair.')
          done();
      });
    }

    // call the recursive chunk download function and start the download process for the pair
    downloadChunk();
  }).catch(err => console.log);
}

/**
 * Queries the public API to return the last [count] trades for a given pair.  Results are limited to 50,000 trades and the supplied
 * window must be less that one year in size.  Trades are returned in reverse chronological order.  If there are over 50,000 trades in
 * the supplied result, the oldest trades will be truncated.
 * @param {string} pair - The pair of trade history to download formatted like "BTC_XMR"
 * @param {number} startTimestamp - The Unix timestamp of the start of the download window, second precision.
 * @param {number} endTimestamp - The Unix timestamp of the end of the download window, second precision.
 */
function fetchTradeHistory(pair, startTimestamp, endTimestamp) {
  return new Promise((fulfill, reject) => {
    const history_url = `https://poloniex.com/public?command=returnTradeHistory&currencyPair=${pair}&start=${startTimestamp}&end=${endTimestamp}`;
    fetch(history_url)
      .then(res => {
        return res.json();
      }).then(body => {
        if(body.error)
          reject(body.error);
        fulfill(body);
      }).catch(err => {
        // There was an error parsing the JSON for this segment; try to fetch it again.
        console.log(`Error fetching segment; received error ${err}; fetching again in ~10 seconds...`);
        setTimeout(() => {
          fetchTradeHistory(pair, startTimestamp, endTimestamp).then(res => {
            fulfill(res);
          });
        }, 10169);
      });
  });
}
