//! Contains functions for parsing the uploaded user deposit and trade history CSVs

const _ = require('lodash');

/**
 * Given a file, attempts to parse it into a string.  If successful, provides the result to `successCallback` and
 * provides any error to `errorCallback`.
 */
function parseFile(file, successCallback, errorCallback) {
  let r = new FileReader();

  r.onload = e => {
    // load the contents of the file into `contents`
    let contents = e.target.result;
    successCallback(contents);
  };

  r.onerror = errorCallback;

  r.readAsText(file);
}

/**
 * Given the raw string representation of the Deposit or Withdrawl History CSV file, this function parses it into an array of objects.
 */
function parseDepositsWithdrawls(raw, isDeposits) {
  // split the CSV by row and ignore the header row
  const split = raw.split('\n').splice(1);

  // make sure that we're parsing the right one
  if(split.length > 1 && split[1].split(',')[4].includes(":") == isDeposits)
    return false;

  // split each of the rows at the commas, remove extrenuous data, and parse into objects
  return _.map(split, row => {
    const data = row.split(',');
    // 2017-04-12 08:42:09,DGB,2994.00000000,...
    return {
      date: new Date(data[0]),
      currency: data[1],
      amount: +data[2],
    };
  });
}

/**
 * Given the raw string representation of the Trade History CSV file, this function parses it into an array of objects.
 */
function parseTrades(raw) {
  // split the CSV by row and ignore the header row
  const split = raw.split('\n').splice(1);

  return _.map(split, row => {
    const data = row.split(',');
    //Date,Market,Category,Type,Price,Amount,Total,Fee,Order Number,Base Total Less Fee,Quote Total Less Fee
    return {
      date: new Date(data[0]),
      pair: data[1],
      buy: data[3] == 'Buy',
      price: +data[4],
      amount: +data[5],
      cost: +data[6],
      fee: +data[7].substring(0, data[7].length - 1),
    };
  });
}

export { parseFile, parseDepositsWithdrawls, parseTrades };
