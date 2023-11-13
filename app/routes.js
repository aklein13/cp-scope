import React from 'react';
import { Switch, Route } from 'react-router';
import App from './containers/App';
import Crosshair from './components/Crosshair';

export default () => (
  <App>
    <Switch>
      <Route path="/" component={Crosshair} />
    </Switch>
  </App>
);
