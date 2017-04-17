//! Wrapper around the pages of the application.  Renders a menu for navigation.

import React from 'react';
import { Layout, Menu } from 'antd';
import { Link } from 'react-router'
import { connect } from 'dva';
const { Header, Content, Footer } = Layout;

import gstyles from '../static/css/global.css';

class IndexPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      dataUploaded: false,
    };
  }

  render() {
    return (
      <Layout className={gstyles.application}>
        <Header className={gstyles.header}>
          <Menu
            defaultSelectedKeys={['2']}
            mode="horizontal"
            style={{ lineHeight: '64px' }}
            theme="dark"
            className={gstyles.bigText}
          >
            <Menu.Item key="overview"><Link to='/index'>Overview</Link></Menu.Item>
            <Menu.Item disabled={!this.state.dataUploaded} key="2">Portfolio Analysis</Menu.Item>
            <Menu.Item disabled={!this.state.dataUploaded} key="3">Trade History</Menu.Item>
          </Menu>
        </Header>
        <Content className={gstyles.content}>
          {this.props.children}
        </Content>
        <Footer className={gstyles.footer}>
          PoloTrack created by Casey Primozic © 2017.    <a href='mailto:me@ameo.link'>Contact Me</a>
          <br/>
          This site is not affiliated with Poloniex Inc.  It is an independant, unnoficial site provided as a free service.
          The full source code for this application can be found <a href='https://github.com/ameobea/polotrack'>on Github</a>.
          <br/>

        </Footer>
      </Layout>
    );
  }
}

export default connect()(IndexPage);
