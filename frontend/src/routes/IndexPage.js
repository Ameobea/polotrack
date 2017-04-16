//! The home page of the application.  Displays the upload forms that prompt users to upload their data and, once uploaded, outputs
//! visualizations and basic statistics about the current portfolio and historical trading patterns.

import React from 'react';
import { connect } from 'dva';

class IndexPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return <div>{'Index Page'}</div>;
  }
}

export default connect()(IndexPage);
