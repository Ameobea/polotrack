//! Functions for processing imported portfolio data and using it to calculate statistics

const _ = require('lodash');

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

export { calcCurrentHoldings };
