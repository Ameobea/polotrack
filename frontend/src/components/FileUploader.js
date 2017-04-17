//! Contains two file drag-and-drops where users can drop their trade and deposit/withdrawl history for parsing

import React from 'react';
import { connect } from 'dva';
import { Alert, Col, Row } from 'antd';
const Dropzone = require('react-dropzone');

import gstyles from '../static/css/global.css';
import { parseFile, parseDepositsWithdrawls, parseTrades } from '../utils/importParser';

const FormattedDropzone = ({filename, onDrop, successful}) => {
  return (
    <Col span={8}>
      <center>
        <Dropzone
          className={`${gstyles.dropZone} ${successful ? gstyles.dropZoneSuccess : ''}`}
          multiple={false}
          onDrop={onDrop}
          disablePreview={true}
        >
          <div style={{paddingLeft: 5, paddingRight: 5}}>
            Drag-and-drop your <code>{filename}</code>
            {' '}file here or click to select it from your computer.
          </div>
        </Dropzone>
      </center>
    </Col>
  );
};

class FileUploader extends React.Component {
  constructor(props) {
    super(props);

    this.fileReadError = this.fileReadError.bind(this);
    this.fileParseError = this.fileParseError.bind(this);
    this.depositHistoryDropped = this.depositHistoryDropped.bind(this);
    this.withdrawlHistoryDropped = this.withdrawlHistoryDropped.bind(this);
    this.tradeHistoryDropped = this.tradeHistoryDropped.bind(this);

    this.state = {
      uploadError: null,
      depositsOk: false,
      withdrawlsOk: false,
      tradesOk: false,
    };
  }

  fileReadError() {
    this.setState({
      uploadError: 'There was an error reading the supplied file.  Make sure that you selected the right one and try again.'
    });
  }

  fileParseError() {
    this.setState({
      uploadError: 'There was an error parsing the supplied file.  Make sure that you selected the right one and try again.'
    });
  }

  depositHistoryDropped(files) {
    parseFile(files[0], content => {
      const parsed = parseDepositsWithdrawls(content, true);
      if(parsed){
        this.props.dispatch({type: 'userData/depositHistoryUploaded', deposits: parsed});
        this.setState({uploadError: null, depositsOk: true});
      } else {
        this.fileParseError();
      }
    }, this.fileReadError);
  }

  withdrawlHistoryDropped(files) {
    parseFile(files[0], content => {
      const parsed = parseDepositsWithdrawls(content, false);
      if(parsed){
        this.props.dispatch({type: 'userData/withdrawlHistoryUploaded', withdrawls: parsed});
        this.setState({uploadError: null, withdrawlsOk: true});
      } else {
        this.fileParseError();
      }
    }, this.fileReadError);
  }

  tradeHistoryDropped(files) {
    parseFile(files[0], content => {
      const parsed = parseTrades(content);
      if(parsed){
        this.props.dispatch({type: 'userData/tradeHistoryUploaded', trades: parsed});
        this.setState({uploadError: null, tradesOk: true});
      } else {
        this.fileParseError();
      }
    }, this.fileReadError);
  }

  render() {
    const error = this.state.uploadError ? (
      <Alert
        message={this.state.uploadError}
        showIcon
        style={{marginRight: '10px'}}
        type='error'
      />
    ) : <span />;
    return (
      <div style={{fontSize: '11pt'}}>
        {error}
        <p>Please upload the <code>depositHistory.csv</code>, <code>depositHistory.csv</code>, and
        {' '}<code>depositHistory.csv</code> files for your Poloniex account.</p>

        <p>As said before, the data contained in these files do <b>NOT</b> not contain any secret information,
        can <b>NOT</b> be used to access or compromise your Poloniex account, and will <b>NOT</b> be stored
        or transmitted anywhere outside of your computer.  Look in the files yourself and see!</p>
        <br />

        <Row>
          <FormattedDropzone filename='depositHistory.csv' onDrop={this.depositHistoryDropped} successful={this.state.depositsOk} />
          <FormattedDropzone filename='withdrawlHistory.csv' onDrop={this.withdrawlHistoryDropped} successful={this.state.withdrawlsOk} />
          <FormattedDropzone filename='tradeHistory.csv' onDrop={this.tradeHistoryDropped} successful={this.state.tradesOk} />
        </Row>
      </div>
    );
  }
}

export default connect()(FileUploader);
