# fusion-plugin-service-worker

[![Build status](https://badge.buildkite.com/176b20938d88e3b7836a9deb744a94d9e58626679d29b22e0f.svg?branch=master)](https://buildkite.com/uberopensource/fusion-plugin-service-worker)

The Fusion plugin for Service Workers.

Out of the box provides default service worker for basic asset caching. Can be fully customized.

---

## Installation

```sh
yarn add fusion-plugin-service-worker
```

---

## Usage

### Default Service Worker


To use the default service worker, your `src/sw.js` should probably look like this:
(you can take advantage of the `handlers` module to reduce boilerplate)

**NOTE: due to a temporary webpack issue, the handler is unavailiable so you will need write the `sw.js` out in long hand. Please copy paste the example at the bottom of the README**

```js
import {getHandlers} from "fusion-plugin-service-worker";

export default (assetInfo) => {
  const {onFetch, onInstall} = getHandlers(assetInfo);
  self.addEventListener("install", onInstall);
  self.addEventListener("fetch", onFetch);
}
```

### Custom Service Worker

Customize the ServiceWorker by editing `src/sw.js` in your app. It shares the same transpile logic as regular fusion bundles.

---

### Setup
```js
// src/main.js
import App from 'fusion-react';

import {swTemplate as swTemplateFunction} from 'fusion-cli/sw';
import SwPlugin, {SWTemplateFunctionToken} from 'fusion-plugin-service-worker';

app.register(SWTemplateFunctionToken, swTemplateFunction);
app.register(SwPlugin);
```

The browser will automatically register the default service worker on page load.

---

### *Temporary Default Service Worker

For default Service Worker behavior, copy this code into sw.js in your app

```js
const cacheName = '0.0.0'; // we don't expect this to change

export default assetInfo => {
  const {cacheablePaths, precachePaths} = assetInfo;
  self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
      // remove old cache
      caches
        .open(cacheName)
        .then(cache => {
          return cache
            .addAll(precachePaths)
            .then(() =>
              getOutdatedKeys(cache, cacheablePaths).then(outdatedKeys =>
                removeKeys(cache, outdatedKeys)
              )
            );
        })
        .catch(e => {
          throw new Error('sw: error updating cache' + cacheName + e);
        })
    );
  });

  self.addEventListener('fetch', event => {
    const HTML_TTL = 1 * 24 * 60 * 60 * 1001; // 1 day
    const expectsHtml = requestExpectsHtml(event.request);
    if (
      !expectsHtml &&
      !cacheablePaths.includes(new URL(event.request.url).pathname)
    ) {
      // bypass service worker, use network
      return;
    }
    event.waitUntil(
      event.respondWith(
        caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            if (expectsHtml) {
              const responseCreated = new Date(
                cachedResponse.headers.get('date')
              ).valueOf();
              if (Date.now() - responseCreated > HTML_TTL) {
                // html expired: use the cache, but refresh cache for next time
                self.fetchNCache(event.request, expectsHtml);
              }
            }
            return cachedResponse;
          }
          return fetchNCache(event.request, expectsHtml);
        })
      )
    );
  });

  function getOutdatedKeys(cache) {
    return cache.keys().then(requests =>
      requests.filter(request => {
        return !cacheablePaths.find(key => {
          return location.origin + key === request.url;
        });
      })
    );
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
};
```
