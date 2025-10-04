/** @format */

import { addHook, Namespace } from 'import-in-the-middle';
import shimmer from 'shimmer';
import { watchers } from '../../../index.js';
import { getCallerInfo } from '../../../utils.js';

// Create a global symbol to track if keyv has been patched
const KEYV_PATCHED_SYMBOL = Symbol.for('node-observer:keyv-patched');

const patchMethod = (prototype: any, method: string) => {
  shimmer.wrap(prototype, method, function (original) {
    return async function (this: any, key: any, ...args: any[]) {
      const callerInfo = getCallerInfo(__filename);

      const logContent: { [key: string]: any } = {
        type: method,
        package: 'keyv',
        file: callerInfo.file,
        line: callerInfo.line,
        key,
      };

      const startTime = performance.now();

      try {
        const result = await original.call(this, key, ...args);
        const endTime = performance.now();
        logContent['duration'] = parseFloat((endTime - startTime).toFixed(2));

        // Track operation type using consistent format with node-cache
        if (method === 'get') {
          const isHit = result !== undefined && result !== null;
          logContent['hits'] = isHit ? 1 : 0;
          logContent['misses'] = isHit ? 0 : 1;
          logContent['value'] = result;
          logContent['key'] = key;
        } else if (method === 'set') {
          logContent['writes'] = 1;
          logContent['key'] = key;
          logContent['value'] = args[0];
        } else if (method === 'delete') {
          logContent['writes'] = 1;
          logContent['key'] = key;
        } else if (method === 'has') {
          const isHit = !!result;
          logContent['hits'] = isHit ? 1 : 0;
          logContent['misses'] = isHit ? 0 : 1;
          logContent['key'] = key;
        }

        watchers.cache.addContent(logContent);
        return result;
      } catch (error) {
        const endTime = performance.now();
        logContent['duration'] = parseFloat((endTime - startTime).toFixed(2));
        logContent['error'] =
          error instanceof Error ? error.message : String(error);
        logContent['stack'] =
          error instanceof Error ? error.stack : String(error);
        watchers.cache.addContent(logContent);
        throw error;
      }
    };
  });
};

if (
  process.env.NODE_OBSERVATORY_CACHE &&
  JSON.parse(process.env.NODE_OBSERVATORY_CACHE).includes('keyv')
) {
  // Check if keyv has already been patched
  if (!(global as any)[KEYV_PATCHED_SYMBOL]) {
    // Mark keyv as patched
    (global as any)[KEYV_PATCHED_SYMBOL] = true;

    addHook((exports: any, name: Namespace, baseDir?: string) => {
      // Only patch 'keyv' module
      // if (name !== 'keyv') {
      //   return exports;
      // }

      // Handle both default and named exports
      const keyvExports = exports.default || exports;

      if (!keyvExports.Keyv || typeof keyvExports.Keyv !== 'function') {
        return exports;
      }

      ['set', 'get', 'delete', 'has'].forEach((method) =>
        patchMethod(keyvExports.Keyv.prototype, method),
      );

      // Return exports with proper structure
      if (exports.default) {
        return {
          ...exports,
          default: keyvExports,
        };
      }

      return keyvExports;
    });
  }
}
