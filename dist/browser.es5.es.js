import { createPlugin, createToken } from 'fusion-core';

/* global window */
var browserPlugin = createPlugin({
  middleware: function middleware() {
    return function (ctx, next) {
      if ('serviceWorker' in window.navigator) {
        window.addEventListener('load', function register() {
          var sw = window.navigator.serviceWorker;
          sw.register('/sw.js')
          /* eslint-disable-next-line no-console */
          .then(function (res) {
            return console.log('*** sw registered:', res);
          })
          /* eslint-disable-next-line no-console */
          .catch(function (e) {
            return console.log('*** sw registration failed:', e);
          });
        });
      }

      return next();
    };
  }
});

/** Copyright (c) 2018 Uber Technologies, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
var SWTemplateFunctionToken = createToken('SWTemplateFunctionToken');

/* global */

/* eslint-env serviceworker */

/* globals location, URL, fetch,  */
var cacheName = '0.0.0'; // we don't expect this to change

function getHandlers(assetInfo) {
  var precachePaths = assetInfo.precachePaths,
      cacheablePaths = assetInfo.cacheablePaths;
  return {
    onInstall: function onInstall(event) {
      self.skipWaiting();
      event.waitUntil( // remove old cache
      caches.open(cacheName).then(function (cache) {
        return cache.addAll(precachePaths).then(function () {
          return getOutdatedKeys(cache, cacheablePaths).then(function (outdatedKeys) {
            return removeKeys(cache, outdatedKeys);
          });
        });
      }).catch(function (e) {
        throw new Error("sw: error updating cache " + cacheName + ": " + e);
      }));
    },
    onFetch: function onFetch(event) {
      var HTML_TTL = 1 * 24 * 60 * 60 * 1001; // 1 day

      var expectsHtml = requestExpectsHtml(event.request);

      if (!expectsHtml && !cacheablePaths.includes(new URL(event.request.url).pathname)) {
        // bypass service worker, use network
        return;
      }

      var p = caches.match(event.request).then(function (cachedResponse) {
        if (cachedResponse) {
          if (expectsHtml) {
            var responseCreated = new Date(cachedResponse.headers.get('date') || 0).valueOf();

            if (Date.now() - responseCreated > HTML_TTL) {
              // html expired: use the cache, but refresh cache for next time
              fetchNCache(event.request, expectsHtml);
            }
          }

          return cachedResponse;
        }

        return fetchNCache(event.request, expectsHtml);
      });
      event.respondWith(p);
      event.waitUntil(p);
    }
  };
}

function getOutdatedKeys(cache, cacheablePaths) {
  return cache.keys().then(function (requests) {
    return requests.filter(function (request) {
      return !cacheablePaths.find(function (key) {
        return location.origin + key === request.url;
      });
    });
  });
}

function removeKeys(cache, keys) {
  return Promise.all(keys.map(function (key) {
    return cache.delete(key);
  }));
}

function fetchNCache(request, expectsHtml) {
  return fetch(request).then(function (resp) {
    if (resp.status !== 200) {
      return Promise.resolve(resp);
    }

    var clonedResponse = resp.clone();
    caches.open(cacheName).then(function (cache) {
      if (expectsHtml) {
        // check we got html before caching
        if (!responseIsHtml(clonedResponse)) {
          return Promise.resolve(resp);
        }
      }

      cache.put(request.url, clonedResponse);
    });
    return Promise.resolve(resp);
  });
}

function requestExpectsHtml(request) {
  if (!request || !request.headers) {
    return false;
  }

  var acceptHeader = request.headers.get('Accept');
  return acceptHeader && acceptHeader.indexOf('html') > -1;
}

function responseIsHtml(response) {
  if (!response || !response.headers) {
    return false;
  }

  var contentType = response.headers.get('content-type');
  return contentType && contentType.indexOf('html') > -1;
}

var index = browserPlugin;

export default index;
export { getHandlers, SWTemplateFunctionToken };
//# sourceMappingURL=browser.es5.es.js.map
