//! Wrapper around the pages of the application.  Renders a menu for navigation.

import React from 'react';
import { Layout, Menu, Button } from 'antd';
import { Link } from 'react-router';
import Lockr from 'lockr';
import { connect } from 'dva';
const { Header, Content, Footer } = Layout;
const _ = require('lodash');

import gstyles from '../static/css/global.css';
import { getBaseRate, getPoloRates, getCoinmarketcapRates } from '../utils/exchangeRates';
import FileUploader from './FileUploader';
import DemoBanner from './DemoBanner';
import FeedbackButton from './FeedbackButton';
import BaseCurrencySelector from './BaseCurrencySelector';

class IndexPage extends React.Component {
  constructor(props) {
    super(props);

    this.showFileUploader = this.showFileUploader.bind(this);

    // check localStorage for existing user data
    Lockr.prefix = 'userData';

    const currencyPrefs = Lockr.get('baseCurrency');
    let baseCurrency = props.baseCurrency;
    if(currencyPrefs) {
      const {currency, symbol} = JSON.parse(currencyPrefs);
      props.dispatch({type: 'globalData/baseCurrencyChanged', newBaseCurrency: currency, newBaseCurrencySymbol: symbol});
      baseCurrency = currency;
    }

    const deposits = Lockr.get('deposits');
    if(deposits) {
      props.dispatch({type: 'userData/depositHistoryUploaded', deposits: JSON.parse(deposits)});
      props.dispatch({type: 'userData/withdrawlHistoryUploaded', withdrawls: JSON.parse(Lockr.get('withdrawls'))});
      props.dispatch({type: 'userData/tradeHistoryUploaded', trades: JSON.parse(Lockr.get('trades'))});
      props.dispatch({type: 'globalData/setDemo', isDemo: JSON.parse(Lockr.get('demo'))});
      props.dispatch({type: 'userData/allDataUploaded'});
    }

    // set up the periodic update of exchange rates from the blockchain.info API
    getBaseRate(baseCurrency).then(rate => {
      props.dispatch({type: 'globalData/baseRateUpdated', rate: rate});
    });
    const baseRateInterval = setInterval(() => {
      getBaseRate(baseCurrency).then(rate => {
        props.dispatch({type: 'globalData/baseRateUpdated', rate: rate});
      });
    }, 16161);

    // set up the periodic update of exchange rates from the Poloniex API
    getPoloRates().then(rates => {
      props.dispatch({type: 'globalData/poloRatesUpdate', rates: rates});
    });
    setInterval(() => {
      getPoloRates().then(rates => {
        props.dispatch({type: 'globalData/poloRatesUpdate', rates: rates});
      });
    }, 18462);

    // fetch and process the coinmarketcap ticker once
    getCoinmarketcapRates().then(rates => {
      const parsedRates = {};
      _.each(rates, rate => {
        parsedRates[rate.symbol] = rate;
      });
      props.dispatch({type: 'globalData/coinmarketcapRatesReceived', rates: parsedRates});
    });

    this.state = {baseRateInterval};
  }

  componentWillReceiveProps(nextProps) {
    if(this.props.baseCurrency !== nextProps.baseCurrency) {
      // cancel the current base currency interval loop and start a new one for the new currency
      clearInterval(this.state.baseRateInterval);
      getBaseRate(nextProps.baseCurrency).then(rate => {
        nextProps.dispatch({type: 'globalData/baseRateUpdated', rate: rate});
      });
      const baseRateInterval = setInterval(() => {
        getBaseRate(nextProps.baseCurrency).then(rate => {
          nextProps.dispatch({type: 'globalData/baseRateUpdated', rate: rate});
        });
      }, 16161);
      this.setState({baseRateInterval});
    }
  }

  showFileUploader() {
    this.props.dispatch({type: 'globalData/setDataUploadModalVisibility', visible: true});
  }

  render() {
    const banner = this.props.isDemo ? <DemoBanner /> : <span />;

    return (
      <Layout className={gstyles.application}>
        <Header className={gstyles.header}>
          <Menu
            className={gstyles.bigText}
            selectedKeys={this.props.selectedMenuItem}
            mode='horizontal'
            style={{ lineHeight: '64px' }}
            theme='dark'
          >
            <Menu.Item key='1'><Link to='/index'>Overview</Link></Menu.Item>
            <Menu.Item disabled={!this.props.dataUploaded} key='2'><Link to='/portfolio'>Portfolio Analysis</Link></Menu.Item>
            <Menu.Item disabled={!this.props.dataUploaded} key='3'><Link to='/trades'>Trade History</Link></Menu.Item>
            <Menu.Item key='4'><Button onClick={this.showFileUploader} type='primary'>Upload Data</Button></Menu.Item>
            <Menu.Item key='5'><BaseCurrencySelector /></Menu.Item>
          </Menu>
        </Header>
        <FeedbackButton />
        <Content className={gstyles.content}>
          {banner}
          <FileUploader />
          {this.props.children}
        </Content>
        <Footer className={gstyles.footer}>
          PoloTrack created by <a href='https://ameobea.me/' rel='noopener noreferrer' target='_blank'>Casey Primozic</a>
          {' © 2017  |  '}<a href='mailto:me@ameo.link'>Contact Me</a>{'   | '}
          Tip ETH: 0x41b836Ad74E61279cD33B1Eba452cF34058e06a6 | Tip BTC: 1MM1Mj4msXmkkDBcd475RwyZp4ao4pC67w
          <br />
          This site is not affiliated with Poloniex Inc.  It is an independant, unnoficial site provided as a free service.
          The full source code for this application can be found <a href='https://github.com/ameobea/polotrack'>on Github</a>.
          <br />

        </Footer>
      </Layout>
    );
  }
}

function mapProps(state) {
  return {
    baseCurrency: state.globalData.baseCurrency,
    dataUploaded: state.userData.dataUploaded,
    isDemo: state.globalData.isDemo,
    selectedMenuItem: state.globalData.selectedMenuItem,
  };
}

export default connect(mapProps)(IndexPage);
