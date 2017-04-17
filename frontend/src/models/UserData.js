//! Contains the parsed representations of all uploaded user data for deposits, withdrawls, and trades.

export default {
  namespace: 'userData',

  state: {
    deposits: null,
    withdrawls: null,
    trades: null,
    dataUploaded: false,
  },

  reducers: {
    /**
     * Triggered when a user uploads their deposit history CSV and it is successfully parsed.
     */
    depositHistoryUploaded(state, {deposits}) {
      return {...state,
        deposits: deposits,
      };
    },

    /**
     * Triggered when a user uploads their withdrawl history CSV and it is successfully parsed.
     */
    withdrawlHistoryUploaded(state, {withdrawls}) {
      return {...state,
        withdrawls: withdrawls,
      };
    },

    /**
     * Triggered when a user uploads their trade history CSV and it is successfully parsed.
     */
    tradeHistoryUploaded(state, {trades}) {
      return {...state,
        trades: trades,
      };
    },

    /**
     * Triggered when all data has been uploaded and parsed successfully and the modal closed.
     */
    allDataUploaded(state) {
      return {...state,
        dataUploaded: true,
      };
    }
  },
}
