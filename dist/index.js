'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var fusionCore = require('fusion-core');

/* global window */
fusionCore.createPlugin({
  middleware() {
    return (ctx, next) => {
      if ('serviceWorker' in window.navigator) {
        window.addEventListener('load', function register() {
          const sw = window.navigator.serviceWorker;
          sw.register('/sw.js')
          /* eslint-disable-next-line no-console */
          .then(res => console.log('*** sw registered:', res))
          /* eslint-disable-next-line no-console */
          .catch(e => console.log('*** sw registration failed:', e));
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
const SWTemplateFunctionToken = fusionCore.createToken('SWTemplateFunctionToken');

/* global */
function invokeTemplateFn(templateFn, resources) {
  return templateFn(resources);
}

var serverPlugin = true && fusionCore.createPlugin({
  deps: {
    templateFn: SWTemplateFunctionToken
  },
  middleware: ({
    templateFn
  }) => {
    return async (ctx, next) => {
      {
        if (ctx.method === 'GET' && ctx.url === '/sw.js') {
          const chunkUrls = Array.from(ctx.chunkUrlMap).map(value => value[1].get('es5'));

          try {
            ctx.type = 'text/javascript';
            ctx.set('Cache-Control', 'max-age=0');
            ctx.body = invokeTemplateFn(templateFn, {
              // TODO(#24): use correct values
              precachePaths: chunkUrls,
              cacheablePaths: chunkUrls
            });
          } catch (e) {// TODO(#25): do something maybe
          }
        }

        return next();
      }
    };
  }
});

/* eslint-env serviceworker */

/* globals location, URL, fetch,  */
const cacheName = '0.0.0'; // we don't expect this to change

function getHandlers(assetInfo) {
  const {
    precachePaths,
    cacheablePaths
  } = assetInfo;
  return {
    onInstall: event => {
      self.skipWaiting();
      event.waitUntil( // remove old cache
      caches.open(cacheName).then(cache => {
        return cache.addAll(precachePaths).then(() => getOutdatedKeys(cache, cacheablePaths).then(outdatedKeys => removeKeys(cache, outdatedKeys)));
      }).catch(e => {
        throw new Error(`sw: error updating cache ${cacheName}: ${e}`);
      }));
    },
    onFetch: event => {
      const HTML_TTL = 1 * 24 * 60 * 60 * 1001; // 1 day

      const expectsHtml = requestExpectsHtml(event.request);

      if (!expectsHtml && !cacheablePaths.includes(new URL(event.request.url).pathname)) {
        // bypass service worker, use network
        return;
      }

      const p = caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          if (expectsHtml) {
            const responseCreated = new Date(cachedResponse.headers.get('date') || 0).valueOf();

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
  return cache.keys().then(requests => requests.filter(request => {
    return !cacheablePaths.find(key => {
      return location.origin + key === request.url;
    });
  }));
}

function removeKeys(cache, keys) {
  return Promise.all(keys.map(key => cache.delete(key)));
}

function fetchNCache(request, expectsHtml) {
  return fetch(request).then(resp => {
    if (resp.status !== 200) {
      return Promise.resolve(resp);
    }

    const clonedResponse = resp.clone();
    caches.open(cacheName).then(cache => {
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

  const acceptHeader = request.headers.get('Accept');
  return acceptHeader && acceptHeader.indexOf('html') > -1;
}

function responseIsHtml(response) {
  if (!response || !response.headers) {
    return false;
  }

  const contentType = response.headers.get('content-type');
  return contentType && contentType.indexOf('html') > -1;
}

var index = serverPlugin;

exports.default = index;
exports.getHandlers = getHandlers;
exports.SWTemplateFunctionToken = SWTemplateFunctionToken;
//# sourceMappingURL=index.js.map
