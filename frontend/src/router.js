import React from 'react';
import { Router, Route } from 'dva/router';

import AppPage from './components/AppPage';
import IndexPage from './routes/IndexPage';

function RouterConfig({ history }) {
  return (
    <Router history={history}>
      <Route component={AppPage} path="/">
        <Route component={IndexPage} path='/index' />
      </Route>
    </Router>
  );
}

export default RouterConfig;
