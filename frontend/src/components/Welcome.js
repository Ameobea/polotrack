//! Contains an introduction to the application, some info about the site, and instructions for uploading user data

import React from 'react';
import { connect } from 'dva';
import { Alert, Button, Modal, Row, Col } from 'antd';
import Lockr from 'lockr';

import FileUploader from '../components/FileUploader';
import gstyles from '../static/css/global.css';

class Welcome extends React.Component {
  constructor(props) {
    super(props);

    this.showFileUploader = this.showFileUploader.bind(this);
    this.hideFileUploader = this.hideFileUploader.bind(this);
    this.fileUploaderOk = this.fileUploaderOk.bind(this);
    this.allDataUploaded = this.allDataUploaded.bind(this);

    this.state = {
      confirmLoading: false,
      fileUploaderVisible: false,
    };
  }

  hideFileUploader() {
    this.setState({fileUploaderVisible: false});
  }

  showFileUploader() {
    this.setState({fileUploaderVisible: true});
  }

  fileUploaderOk() {
    if(!this.allDataUploaded())
      return;

    // show a spinning loading button for 1.234 seconds to make the people think we're doing super-science then hide modal
    setTimeout(() => {
      this.setState({
        confirmLoading: false,
        fileUploaderVisible: false,
      });

      // store the uploaded data in localStorage so it's persistant
      Lockr.prefix = 'userData';
      Lockr.set('deposits', JSON.stringify(this.props.deposits));
      Lockr.set('withdrawls', JSON.stringify(this.props.withdrawls));
      Lockr.set('trades', JSON.stringify(this.props.trades));

      // signal that all data has been successfully uploaded and that it's time to show some juicy visualizations
      this.props.dispatch({type: 'userData/allDataUploaded'});
    }, 1234);
    this.setState({
      confirmLoading: true,
    });
  }

  allDataUploaded() {
    const {deposits, withdrawls, trades} = this.props;
    return deposits !== null && withdrawls !== null && trades !== null;
  }

  render() {
    return (
      <div>
        <center>
          <h1>Welcome to PoloTrack</h1>
          <br />
          <p className={gstyles.bigText}>
            <b>PoloTrack is a tool to provide insight into your portfolio and trading history on the Poloniex exchange.</b>
          </p>
        </center>
        <br />

        <h2>How it Works</h2>
        <p>The tool runs entirely in your browser and makes use of information from Poloniex&#39;s data export feature to calculate
        its statistics and build its visualizations.</p>

        <br />
        <Alert
          description='PoloTrack is completely safe to use and puts your Poloniex account at no risk whatsoever.
          All of the data it requires through the deposit, withdrawl, and trade history is completely anonymous and can not
          be used to hack or compromise your account in any way.  Additionally, all data that you submit stays in your
          browser only and is never transmitted, stored, or analyzed externally.  If you would like to view the source code
          for this tool yourself or host your own version, the complete contents are available on GitHub:
          https://github.com/ameobea/polotrack'
          message='Account Security and Data Privacy'
          showIcon
          type='info'
        />
        <br />

        <h2>View Your Data</h2>
        <p>To use the tool and view your analysis, make sure that you&#39;re logged into your Poloniex account and then
        download the files from the links below to your computer.  Once you&#39;ve done that, click the &#34;Upload Your Account Data&#34;
        button below.</p>

        <center>
          <Button
            onClick={this.showFileUploader}
            style={{marginTop: '18px', marginBottom: '10px'}}
            type='primary'
          >
            <span className={gstyles.bigText}>Upload Your Account Data</span>
          </Button>
        </center>

        <Modal
          confirmLoading={this.state.confirmLoading}
          onCancel={this.hideFileUploader}
          onOk={this.fileUploaderOk}
          visible={this.state.fileUploaderVisible}
          width='75%'
        >
          <FileUploader />
        </Modal>
        <br />

        <Row>
          <Col md={12} xs={24}>
            <p>
              Deposit and Withdrawl history can both be downloaded from this page:
              <a href='https://poloniex.com/depositHistory' rel='noopener noreferrer'  target='_blank'>  https://poloniex.com/depositHistory</a>
            </p>
            <img
              src='https://ameo.link/u/497.png'
              style={{marginTop: '10px', marginBottom: '10px', marginLeft: '5px', marginRight: '5px'}}
              width='90%'
            />
          </Col>
          <Col md={12} xs={24}>
            <p>
              Trade History can be downloaded from this page:
              <a href='https://poloniex.com/tradeHistory' rel='noopener noreferrer' target='_blank'>  https://poloniex.com/tradeHistory</a>
            </p>
            <img
              src='https://ameo.link/u/498.png'
              style={{marginTop: '10px', marginBottom: '10px', marginLeft: '5px', marginRight: '5px'}}
              width='90%'
            />
          </Col>
        </Row>
        <br />
      </div>
    );
  }
}

function mapProps(state) {
  return {
    deposits: state.userData.deposits,
    withdrawls: state.userData.withdrawls,
    trades: state.userData.trades,
  };
}

export default connect(mapProps)(Welcome);
