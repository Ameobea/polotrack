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
    console.log(this.props);

    return (
      <Layout className={gstyles.application}>
        <Header className={gstyles.header}>
          <Menu
            defaultSelectedKeys={['2']}
            mode="horizontal"
            style={{ lineHeight: '64px' }}
            theme="dark"
          >
            <Menu.Item key="overview"><Link to='/index'>{'Overview'}</Link></Menu.Item>
            <Menu.Item disabled={!this.state.dataUploaded} key="2">{'nav 2'}</Menu.Item>
            <Menu.Item disabled={!this.state.dataUploaded} key="3">{'nav 3'}</Menu.Item>
          </Menu>
        </Header>
        <Content className={gstyles.content}>
          {'content'}
          {this.props.children}
        </Content>
        <Footer className={gstyles.footer}>
          {'PoloTrack created by Casey Primozic ©2017'}
        </Footer>
      </Layout>
    );
  }
}

export default connect()(IndexPage);
