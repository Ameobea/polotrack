//! Displays a banner at the top of the page indicating that example data is being used and giving instructions
//! on how to upload your own data instead.

import React from 'react';
import { Alert } from 'antd';

const message = 'You\'re currently viewing demo data.  To see your own, use the "Upload Data" button above.';

export default () => <center><Alert message={message} type='warning' /></center>;
