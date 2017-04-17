//! Wrapper around the pages of the application.  Renders a menu for navigation.

import React from 'react';
import { Layout, Menu } from 'antd';
import { Link } from 'react-router'
import Lockr from 'lockr';
import { connect } from 'dva';
const { Header, Content, Footer } = Layout;

import gstyles from '../static/css/global.css';

class IndexPage extends React.Component {
  constructor(props) {
    super(props);

    // check localStorage for existing user data
    Lockr.prefix = 'userData';

    const deposits = Lockr.get('deposits');
    if(deposits) {
      props.dispatch({type: 'userData/depositHistoryUploaded', deposits: JSON.parse(deposits)});
      props.dispatch({type: 'userData/withdrawlHistoryUploaded', withdrawls: JSON.parse(Lockr.get('withdrawls'))});
      props.dispatch({type: 'userData/tradeHistoryUploaded', trades: JSON.parse(Lockr.get('trades'))});
      props.dispatch({type: 'userData/allDataUploaded'});
    }
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
            <Menu.Item disabled={!this.props.dataUploaded} key="2"><Link to='/portfolio'>Portfolio Analysis</Link></Menu.Item>
            <Menu.Item disabled={!this.props.dataUploaded} key="3"><Link to='/trades'>Trade History</Link></Menu.Item>
          </Menu>
        </Header>
        <Content className={gstyles.content}>
          {this.props.children}
        </Content>
        <Footer className={gstyles.footer}>
          PoloTrack created by <a href='https://ameobea.me/' target='_blank'>Casey Primozic</a> © 2017.    <a href='mailto:me@ameo.link'>Contact Me</a>
          <br/>
          This site is not affiliated with Poloniex Inc.  It is an independant, unnoficial site provided as a free service.
          The full source code for this application can be found <a href='https://github.com/ameobea/polotrack'>on Github</a>.
          <br/>

        </Footer>
      </Layout>
    );
  }
}

function mapProps(state) {
  return {
    dataUploaded: state.userData.dataUploaded,
  };
}

export default connect(mapProps)(IndexPage);
