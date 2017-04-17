//! Contains two file drag-and-drops where users can drop their trade and deposit/withdrawl history for parsing

import React from 'react';
import { connect } from 'dva';
import { Alert, Col, Row } from 'antd';
const Dropzone = require('react-dropzone');

import gstyles from '../static/css/global.css';

const FormattedDropzone = ({filename, onDrop}) => {
  return (
    <Col span={8}>
      <center>
        <Dropzone
          className={gstyles.dropZone}
          multiple={false}
          onDrop={onDrop}
        >
          <div style={{paddingLeft: 5, paddingRight: 5}}>
            {'Drag-and-drop your '}<code>{filename}</code>
            {' file here or click to select it from your computer.'}
          </div>
        </Dropzone>
      </center>
    </Col>
  );
};

class FileUploader extends React.Component {
  constructor(props) {
    super(props);

    this.depositHistoryDropped = this.depositHistoryDropped.bind(this);
    this.withdrawlHistory = this.withdrawlHistoryDropped.bind(this);
    this.tradeHistoryDropped = this.tradeHistoryDropped.bind(this);

    this.state = {
      uploadError: null,
    };
  }

  depositHistoryDropped(files) {
    console.log(files);
    if(this.state.error) {
      this.setState({error: null});
    }
  }

  withdrawlHistoryDropped(files) {
    console.log(files);
    if(this.state.error) {
      this.setState({error: null});
    }
  }

  tradeHistoryDropped(files) {
    console.log(files);
    if(this.state.error) {
      this.setState({error: null});
    }
  }

  render() {
    const error = this.state.uploadError ? <Alert
      message={this.state.uploadError}
      showIcon type='error'
      style={{marginRight: '10px'}}
    /> : <span />;
    return (
      <div>
        {error}
        <Row>
          <FormattedDropzone filename='depositHistory.csv' onDrop={this.depositHistoryDropped} />
          <FormattedDropzone filename='withdrawlHistory.csv' onDrop={this.withdrawlHistoryDropped} />
          <FormattedDropzone filename='tradeHistory.csv' onDrop={this.tradeHistoryDropped} />
        </Row>
      </div>
    );
  }
}

export default connect()(FileUploader);
