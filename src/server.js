// @flow

/* global */

import {createPlugin /*, serviceWorkerTemplate */} from 'fusion-core';

let path;
let read;
let process;

let baseSWMemo;

if (__NODE__) {
  const util = require('util');
  const fs = require('fs');
  process = require('process');
  path = require('path');
  read = util.promisify(fs.readFile);
}

export default createPlugin({
  middleware: () => {
    return (ctx, next) => {
      if (__NODE__) {
        return next().then(() => {
          if (ctx.path === '/sw.js') {
            // TODO(#24): get value properly
            return (
              readSW()
                .then(baseSW => {
                  ctx.type = 'text/javascript';
                  ctx.set('Cache-Control', 'max-age=0');
                  ctx.body = assembleServiceWorker(baseSW, ctx);
                })
                // TODO(#25): maybe do somethng here
                .catch(() => next())
            );
          }
        });
      }
      return next();
    };
  },
});

function assembleServiceWorker(baseSW, ctx) {
  // TODO: replace with ctx properties when available
  const precachePaths = Array.from(ctx.chunkUrlMap).map(
    value => `'${ctx.assetPath}/${value[1].get('es5')}'`
  );
  const cacheablePaths = Array.from(ctx.chunkUrlMap).map(
    value => `'${ctx.assetPath}/${value[1].get('es5')}'`
  );

  return [
    `var precachePaths = [${precachePaths}];`,
    `var cacheablePaths = [${cacheablePaths}];`,
    baseSW,
  ].join('\n');
}

function readSW() {
  if (baseSWMemo) {
    return Promise.resolve(baseSWMemo);
  } else {
    return read(
      // TODO: temporary shenanigans, should probably add dist path to ctx or similar
      path.join(process.cwd(), 'src', 'sw.js')
    ).then(data => {
      baseSWMemo = data;
      return data;
    });
  }
}
