//! Contains two file drag-and-drops where users can drop their trade and deposit/withdrawl history for parsing

import React from 'react';
import { connect } from 'dva';
import { Alert, Col, Row, Modal } from 'antd';
import Lockr from 'lockr';
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
    this.showFileUploader = this.showFileUploader.bind(this);
    this.hideFileUploader = this.hideFileUploader.bind(this);
    this.fileUploaderOk = this.fileUploaderOk.bind(this);
    this.allDataUploaded = this.allDataUploaded.bind(this);

    this.state = {
      uploadError: null,
      depositsOk: false,
      withdrawlsOk: false,
      tradesOk: false,
      confirmLoading: false,
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

  hideFileUploader() {
    this.props.dispatch({type: 'globalData/setDataUploadModalVisibility', visible: false});
  }

  showFileUploader() {
    this.props.dispatch({type: 'globalData/setDataUploadModalVisibility', visible: true});
  }

  fileUploaderOk() {
    if(!this.allDataUploaded()) {
      this.setState({uploadError: 'You must select all all the required files!'});
      return;
    }

    this.setState({uploadError: null});

    // show a spinning loading button for 1.234 seconds to make the people think we're doing super-science then hide modal
    setTimeout(() => {
      this.setState({
        confirmLoading: false,
      });

      // store the uploaded data in localStorage so it's persistant
      Lockr.prefix = 'userData';
      Lockr.set('deposits', JSON.stringify(this.props.deposits));
      Lockr.set('withdrawls', JSON.stringify(this.props.withdrawls));
      Lockr.set('trades', JSON.stringify(this.props.trades));
      Lockr.set('demo', JSON.stringify(false));

      // signal that all data has been successfully uploaded and that it's time to show some juicy visualizations
      this.props.dispatch({type: 'userData/allDataUploaded'});
      this.hideFileUploader();

      // since this is real user data, set the `isDemo` flag to false
      this.props.dispatch({type: 'globalData/setDemoFlag', isDemo: false});

      // hard-refresh the page since components are wired to not watch for changes to static user data
      window.location.reload();
    }, 1234);
    this.setState({
      confirmLoading: true,
    });
  }

  allDataUploaded() {
    const {depositsOk, withdrawlsOk, tradesOk, isDemo} = this.state;
    return depositsOk && withdrawlsOk && tradesOk;
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
      <Modal
        confirmLoading={this.state.confirmLoading}
        onCancel={this.hideFileUploader}
        onOk={this.fileUploaderOk}
        visible={this.props.visible}
        width='75%'
      >
        <div style={{fontSize: '11pt'}}>
          <center>{error}</center>
          <p>Please provide the <code>depositHistory.csv</code>, <code>depositHistory.csv</code>, and
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
      </Modal>
    );
  }
}

function mapProps(state) {
  return {
    deposits: state.userData.deposits,
    withdrawls: state.userData.withdrawls,
    trades: state.userData.trades,
    visible: state.globalData.dataUploadModalVisible,
  };
}

export default connect(mapProps)(FileUploader);
