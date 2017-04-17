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

/**
 * Given a currency and the deposit/withdrawl/trade history for the account, determines the cost basis of the given currency for the account.
 */
function calcCostBasises(trades) {
  // keeps track of running totals and cost basises for all currencies
  const costBasises = {};

  _.each(_.sortBy(trades, 'date'), ({pair, buy, amount, cost, price}) => {
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

    // for now, ignore trades that didn't involve BTC at all until we hook up internal hist exchange rate API
    // TODO
    if(pair.includes('BTC')){
      // calculate the new cost basis for the bought currency
      if(boughtCurrency != 'BTC') {
        if(!costBasises[boughtCurrency])
          costBasises[boughtCurrency] = {total: 0, basis: 0};

        // the percentage of the new total holdings that this purchase makes up
        let newRatio = (boughtAmount / (costBasises[boughtCurrency].total + boughtAmount));
        // if(boughtCurrency == 'ETH' || soldCurrency == 'ETH')
        //   console.log(`amount: ${boughtAmount}, total: ${costBasises[boughtCurrency].total}, rate: ${price}, old average: ${newRatio}`);
        if(Number.isNaN(newRatio))
          newRatio = 1;
        costBasises[boughtCurrency].basis = ((1-newRatio) * costBasises[boughtCurrency].basis) + (newRatio * price);
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
    }
  });

  return costBasises;
}

export { calcCurrentHoldings, calcCostBasises };
