//! The home page of the application.  Displays the upload forms that prompt users to upload their data and, once uploaded,
//! outputs visualizations and basic statistics about the current portfolio and historical trading patterns.
//!
//! For times when users haven't yet uploaded data from Poloniex, this page will display general information about the tool,
//! a button with instructions/forms for uploading deposit/withdrawl and trade history, and an option to try out the tool
//! with example data first.

import React from 'react';
import { connect } from 'dva';
import { Alert, Button, Modal, Row, Col } from 'antd';

import FileUploader from '../components/FileUploader';
import gstyles from '../static/css/global.css';

class IndexPage extends React.Component {
  constructor(props) {
    super(props);

    this.showFileUploader = this.showFileUploader.bind(this);
    this.hideFileUploader = this.hideFileUploader.bind(this);
    this.fileUploaderOk = this.fileUploaderOk.bind(this);

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
    // TODO: Verify that the uploaded data is all correct then hide the modal and show computed stats
    // if(!this.state.)

    // show a spinning loading button for 1.234 seconds to make the people think we're doing super-science then hide modal
    setTimeout(() => {
      this.setState({
        confirmLoading: false,
        fileUploaderVisible: false,
      });
    }, 1234);
    this.setState({
      confirmLoading: true,
    });
  }

  render() {
    return (
      <div>
        <center>
          <h1>Welcome to PoloTrack</h1>
          <br/>
          <p className={gstyles.bigText}>
            <b>PoloTrack is a tool to provide insight into your portfolio and trading history on the Poloniex exchange.</b>
          </p>
        </center>
        <br/>

        <h2>How it Works</h2>
        <p>The tool runs entirely in your browser and users the information from Poloniex's data export feature to calculate
        its statistics and build its visualizations.</p>

        <br/>
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
        <br/>

        <h2>View Your Data</h2>
        <p>PoloTrack reads the contents of three different files that can each be downloaded from the Poloniex website: </p>
        <br/>

        <Row>
          <Col xs={24} md={12}>
            <p>
              Deposit and Withdrawl history can both be downloaded from this page:
              <a href='https://poloniex.com/depositHistory' target='_blank'>  https://poloniex.com/depositHistory</a>
            </p>
            <img
              src='https://ameo.link/u/497.png'
              style={{marginTop: '10px', marginBottom: '10px', marginLeft: '5px', marginRight: '5px'}}
              width='90%'
            />
          </Col>
          <Col xs={24} md={12}>
            <p>
              Trade History can be downloaded from this page:
              <a href='https://poloniex.com/tradeHistory' target='_blank'>  https://poloniex.com/tradeHistory</a>
            </p>
            <img
              src='https://ameo.link/u/498.png'
              style={{marginTop: '10px', marginBottom: '10px', marginLeft: '5px', marginRight: '5px'}}
              width='90%'
            />
          </Col>
        </Row>

        <p>To use the tool and view your analysis, make sure that you're logged into your Poloniex account and then
        download the files from the three links above to your computer.  Then, click the "Upload Account Data" button below.
        </p>
        <br/>

        <p>If you'd like to view example data for my account to get a feel for how the tool works, <a href='#'>Click Here</a>.
        Please note that this data will not actually leave your computer and provides no information that could be used to
        compromise your account or your identity.</p>

        <center>
          <br/>
          <Button
            onClick={this.showFileUploader}
            type='primary'
          >
            <span className={gstyles.bigText}>Upload Account Data</span>
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
      </div>
    );
  }
}

export default connect()(IndexPage);
