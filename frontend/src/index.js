import dva from 'dva';
import './index.css';
import ReactDOM from 'react-dom';
import { LocaleProvider } from 'antd';
import enUS from 'antd/lib/locale-provider/en_US';

import UserData from './models/UserData';

const app = dva();

app.model(UserData);

app.router(require('./router'));

const App = app.start();

ReactDOM.render(
  <LocaleProvider locale={enUS}>
    <App />
  </LocaleProvider>
, document.getElementById('root')
);
