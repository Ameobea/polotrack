//! Contains the parsed representations of all uploaded user data for deposits, withdrawls, and trades.

export default {
  namespace: 'userData',

  state: {
    deposits: null,
    withdrawls: null,
    trades: null,
    dataUploaded: false,
    histBalances: null,
  },

  reducers: {
    /**
     * Triggered when a user uploads their deposit history CSV and it is successfully parsed.
     */
    depositHistoryUploaded(state, {deposits}) {
      return {...state, deposits};
    },

    /**
     * Triggered when a user uploads their withdrawl history CSV and it is successfully parsed.
     */
    withdrawlHistoryUploaded(state, {withdrawls}) {
      return {...state, withdrawls};
    },

    /**
     * Triggered when a user uploads their trade history CSV and it is successfully parsed.
     */
    tradeHistoryUploaded(state, {trades}) {
      return {...state, trades};
    },

    /**
     * Triggered when all data has been uploaded and parsed successfully and the modal closed.
     */
    allDataUploaded(state) {
      return {...state, dataUploaded: true};
    },

    /**
     * Triggered after historical balances are calculated.  Stores calculated balances so they don't have to be
     * re-calculated every time the component is reconstructed.
     */
    histBalancesCalculated(state, {histBalances}) {
      return {...state, histBalances};
    },
  },
}
