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

export { calcCurrentHoldings, calcCostBasises };
