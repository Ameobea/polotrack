import React from 'react';
import { Router, Route, IndexRedirect } from 'dva/router';

import AppPage from './components/AppPage';
import IndexPage from './routes/IndexPage';
import PortfolioAnalysis from './routes/PortfolioAnalysis';
import TradeHistory from './routes/TradeHistory';
import ExampleLoader from './routes/ExampleLoader';

function RouterConfig({ history }) {
  return (
    <Router history={history}>
      <Route component={AppPage} path='/'>
        <IndexRedirect to='/index' />
        <Route component={IndexPage} path='/index' />
        <Route component={PortfolioAnalysis} path='/portfolio' />
        <Route component={TradeHistory} path='/trades' />
        <Route component={ExampleLoader} path='/demo' />
      </Route>
    </Router>
  );
}

export default RouterConfig;
