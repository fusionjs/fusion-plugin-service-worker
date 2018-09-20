// @flow

/* global window */

import {createPlugin} from 'fusion-core';

export default createPlugin({
  provides() {
    if ('serviceWorker' in window.navigator) {
      window.addEventListener('load', function register() {
        var sw = window.navigator.serviceWorker;
        sw
          .register('/sw.js')
          .then(function(res) {
            return console.log('*** sw registered:', res);
          })
          .catch(function(e) {
            return console.log('*** sw registration failed:', e);
          });
      });
    }
  },
});
