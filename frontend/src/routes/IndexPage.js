//! The home page of the application.  Displays the upload forms that prompt users to upload their data and, once uploaded,
//! outputs visualizations and basic statistics about the current portfolio and historical trading patterns.
//!
//! For times when users haven't yet uploaded data from Poloniex, this page will display general information about the tool,
//! a button with instructions/forms for uploading deposit/withdrawl and trade history, and an option to try out the tool
//! with example data first.

import React from 'react';
import { connect } from 'dva';

import Welcome from '../components/Welcome';

class IndexPage extends React.Component {
  render() {
    if(!this.props.dataUploaded) {
      return <Welcome />;
    } else {
      return (
        <div>
          Data Uploaded successfully
        </div>
      );
    }
  }
}

function mapProps(state) {
  return {
    dataUploaded: state.userData.dataUploaded,
  }
}

export default connect(mapProps)(IndexPage);
