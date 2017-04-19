//! Functions for processing imported portfolio data and using it to calculate statistics

const _ = require('lodash');

import { batchFetchRates } from './internalApi';

/**
 * Given the full record of a user's account activity, calculates their current holdings.  Returns an object with
 * currencies as keys and current holdings in that currency in terms of each currency.
 */
function calcCurrentHoldings(deposits, withdrawls, trades) {
  // iterate through all deposits, withdrawls, and trades and keep a running total for each currency
  const totals = {};

  // console.log(deposits);
  // console.log(withdrawls);
  // console.log(trades);

  _.each(deposits, deposit => {
    if(!totals[deposit.currency])
      totals[deposit.currency] = 0;

    totals[deposit.currency] += deposit.amount;
  });

  _.each(withdrawls, withdrawl => {
    // may be possible to have a withdrawl without a deposit in weird edge cases so check just in case
    if(!totals[withdrawl.currency])
      totals[withdrawl.currency] = 0;

    totals[withdrawl.currency] -= withdrawl.amount;
  });

  _.each(trades, trade => {
    const split = trade.pair.split('/');
    if(!totals[split[0]])
      totals[split[0]] = 0;
    totals[split[0]] += (trade.buy ? 1 : -1) * trade.amount;
    if(!totals[split[1]])
      totals[split[1]] = 0;
    totals[split[1]] += (trade.buy ? -1 : 1) * trade.cost;
    const feedCurrency = trade.buy ? split[0] : split[1];
    const feedTotal = trade.buy ? trade.amount : trade.cost;
    totals[feedCurrency] -= ((trade.fee / 100) * feedTotal);
  });

  // round each of the values to 8 decimals of precision
  _.each(Object.keys(totals), currency => {
    totals[currency] = +totals[currency].toFixed(8);
  });

  return totals;
}

/**
 * Given a currency and the deposit/withdrawl/trade history for the account, determines the cost basis of the given currency for the account.
 * Returns a promise that yields the results after the necessary API requests and calculations have been completed.
 */
function calcCostBasises(trades) {
  // keeps track of running totals and cost basises for all currencies
  const costBasises = {};

  // get a list of all trades that don't involve BTC on one side and so require a historical rate fetch
  // TODO: create and check a local cache of exchange rates before querying the API
  const needsFetch = [];
  _.each(trades, ({pair, date}) => {
    if(!pair.includes('BTC')){
      const split = pair.split('/');
      needsFetch.push({pair: `BTC/${split[0]}`, date});
    }
  });

  // fetch the historical rates from the API for all pairs that need fetching and then calculate cost basis
  return new Promise((f, r) => {
    batchFetchRates(needsFetch).then(queryResults => {
      _.each(_.sortBy(trades, 'date'), ({date, pair, buy, amount, cost, price}) => {
        const currencies = pair.split('/');
        let boughtCurrency, soldCurrency, boughtAmount, soldAmount;
        if(buy) {
          boughtCurrency = currencies[0];
          soldCurrency = currencies[1];
          boughtAmount = amount;
          soldAmount = cost;
        } else {
          boughtCurrency = currencies[1];
          soldCurrency = currencies[0];
          boughtAmount = cost;
          soldAmount = amount;
        }

        // handle cases where the currencies being exchange don't include BTC
        let rate;
        if(!pair.includes('BTC')) {
          // console.log(`Calculating trade with pair ${pair} with rate ${price}`);
          // traded pair is something like XMR/ETH; find the result of the request to get the exchange rate for BTC/XMR at the current date
          // rate is how many currency 2 it takes to buy one currency 1
          const secondaryRate = _.filter(queryResults, res => {
            return date == res.date && res.pair == `BTC/${currencies[0]}`;
          });

          if(secondaryRate.length == 0){
            // console.error('No matching query results found')
          } else {
            // console.log(`Found requested historical rate for ${secondaryRate[0].pair} with rate ${secondaryRate[0].rate}`)
            // we need BTC/ETH rate; we have BTC/XMR and XMR/ETH.  3.123 XMR/ETH * .002 BTC/XMR = .006246 BTC/ETH
            rate = 1 / (price / secondaryRate[0].rate);
            // console.log(`Calculated actual rate of ${rate} for pair BTC/${currencies[1]}`)
          }
        } else {
          rate = price;
        }

        // calculate the new cost basis for the bought currency
        if(boughtCurrency != 'BTC') {
          if(!costBasises[boughtCurrency])
            costBasises[boughtCurrency] = {total: 0, basis: 0};

          // the percentage of the new total holdings that this purchase makes up
          let newRatio = (boughtAmount / (costBasises[boughtCurrency].total + boughtAmount));
          // if(boughtCurrency == 'ETH' || soldCurrency == 'ETH')
          //   console.log(`amount: ${boughtAmount}, total: ${costBasises[boughtCurrency].total}, rate: ${rate}, old average: ${newRatio}`);
          if(Number.isNaN(newRatio))
            newRatio = 1;
          costBasises[boughtCurrency].basis = ((1-newRatio) * costBasises[boughtCurrency].basis) + (newRatio * rate);
          costBasises[boughtCurrency].total = costBasises[boughtCurrency].total + boughtAmount;
        }

        // update the total for the sold currency
        if(soldCurrency != 'BTC') {
          if(!costBasises[soldCurrency])
            costBasises[soldCurrency] = {total: 0, basis: 0};
          if(costBasises[soldCurrency].total >= soldAmount) {
            costBasises[soldCurrency].total -= soldAmount;
          } else {
            costBasises[soldCurrency].total = 0;
          }
        }
      });

      f(costBasises);
    }).catch(err => {
      console.log('Error while fetching historical exchange rates while during cost basis calculation');
    });
  });
}

/**
 * Given the current holdings and a date in the past, returns the portfolio value at that point in time.
 * Returns a promise that fulfills with the results once the necessary requests have completed.
 */
function getHistPortfolioValue(curHoldings, date) {
  // TODO
}

/**
 * Reverts all changes to portfolio in reverse order, only keeping events that happened before the supplied date.
 * If `onlyTrades` is true, then deposits and withdrawls will not be rolled back.
 */
function rollbackPortfolio(holdings, date, deposits, withdrawls, trades, onlyTrades) {
  // utility function for removing elements from the collection so that the date is correct
  function filterDates(collection) {
    return _.filter(collection, elem => {
      return new Date(elem.date).getTime() > new Date(date).getTime();
    });
  }

  if(!onlyTrades) {
    _.each(filterDates(deposits), ({currency, amount}) => {
      holdings[currency] -= amount;
    });

    _.each(filterDates(withdrawls), ({currency, amount}) => {
      holdings[currency] += amount;
    });
  }

  _.each(filterDates(trades), ({pair, buy, fee, amount, cost}) => {
    // console.log(`${buy ? 'BUY:' : 'SELL:'} ${amount} ${pair} for ${cost}`)
    const neg = buy ? -1 : 1;
    const split = pair.split('/');
    // console.log(`${split} += ${neg * amount}; ${split[1]} += ${-neg * cost}`);
    holdings[split[0]] += neg * amount;
    holdings[split[1]] += -neg * cost;
    const feedCurrency = buy ? split[0] : split[1];
    const feedTotal = buy ? amount : cost;
    holdings[feedCurrency] += ((fee / 100) * feedTotal);
  });

  return holdings;
}

/**
 * Given a portfolio and historical rates, returns the value of the portfolio at those historical rates.  Value is returned
 * in BTC.
 */
function calcHistPortfolioValue(holdings, histDate, histRates) {
  let totalValue = 0;
  _.each(Object.keys(holdings), currency => {
    // filter the correct historical rate for this data point from the historical rates array
    const histRateRes = _.filter(histRates, ({date, pair, rate}) => {
      return date == histDate && pair.includes(currency);
    });
    if(histRateRes.length === 0) {
      console.error(`Unable to look up historical rate for ${currency} at date ${histDate}`);
    }
    let histRate;
    if(currency == 'BTC'){ // Took like 3 hours of debugging to figure out we needed this >.>
      histRate = 1;
    } else {
      histRate = histRateRes[0].rate;
    }
    // console.log(`${currency}: ${histRate}`);

    totalValue += holdings[currency] * histRate;
  });

  return totalValue;
}

/**
 * Calculates recent changes in portfolio value by calculating historical portfolio value at three different points and
 * returning the results as an object.  Returns a promise that fulfills once the result is available.
 */
function calcRecentChanges(deposits, withdrawls, trades, curHoldings, curValue, onlyTrades) {
  return new Promise((f, r) => {
    // TODO: Handle onlyTrades
    // round current date to nearest 1000 seconds so that we can cache requests better
    const now = new Date(Math.floor(new Date().getTime() / 1e6) * 1e6);
    // create a set of historical rate requests for the internal API
    const histDates = [
      now.getTime() - (1000 * 60 * 60), // 1 hour ago
      Math.round(new Date().setDate(now.getDate() - 1) / 1e6) * 1e6, // 1 day ago
      Math.round(new Date().setDate(now.getDate() - 7) / 1e6) * 1e6, // 1 week ago
      Math.round(new Date().setDate(now.getDate() - 30) / 1e6) * 1e6, // 1 month ago
    ];

    const rateRequests = _.flatten(_.map(Object.keys(curHoldings), currency => {
      return _.map(histDates, date => {
        return {
          pair: `BTC/${currency}`,
          date: date,
        };
      });
    }));

    // make all the requests using the internal API
    batchFetchRates(rateRequests).then(histRates => {

      // roll back portfolio to all three historical levels and calculate value at those points
      var i = -1;
      f(_.map(histDates, date => {
        // rollback the portfolio to the selected historical rate
        let rolledPortfolio = rollbackPortfolio(_.cloneDeep(curHoldings), date, deposits, withdrawls, trades, onlyTrades);
        // then calculate the historical value of the portfolio at that time using the fetched historical rates
        i += 1;
        return {
          index: i,
          value: calcHistPortfolioValue(rolledPortfolio, date, histRates),
        };
      }));
    });
  });
}

export { calcCurrentHoldings, calcCostBasises, calcRecentChanges };
