//! Loads my personal data to populate the visualizations

import React from 'react';
import { connect } from 'dva';
const fetch = require('node-fetch');
import { push } from 'react-router-redux';

class ExampleLoader extends React.Component {
  constructor(props) {
    super(props);

    // fetch my portfolio data from JSON and load it
    fetch("https://ameo.link/u/4b4.json")
      .then(res => res.json())
      .then(body => {
        this.props.dispatch({type: 'userData/depositHistoryUploaded', deposits: JSON.parse(body.data)});
      });

    fetch("https://ameo.link/u/4b5.json")
      .then(res => res.json())
      .then(body => {
        this.props.dispatch({type: 'userData/withdrawlHistoryUploaded', withdrawls: JSON.parse(body.data)});
      });

    fetch("https://ameo.link/u/4b6.json")
      .then(res => res.json())
      .then(body => {
        this.props.dispatch({type: 'userData/tradeHistoryUploaded', trades: JSON.parse(body.data)});
      });
  }

  componentWillReceiveProps(nextProps) {
    const {deposits, withdrawls, trades, dispatch} = nextProps;
    if(deposits && withdrawls && trades) {
      // redirect to the overview page
      dispatch({type: 'userData/allDataUploaded'});
      dispatch({type: 'globalData/setDemoFlag', isDemo: true});
      dispatch(push('/index'));
    }
  }

  render() {
    return <p>Loading example data...</p>;
  }
}

function mapProps(state) {
  return {
    deposits: state.userData.deposits,
    withdrawls: state.userData.withdrawls,
    trades: state.userData.trades,
  };
}

export default connect(mapProps)(ExampleLoader);
