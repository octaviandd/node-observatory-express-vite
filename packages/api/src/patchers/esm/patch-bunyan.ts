/** @format */

import { addHook, Namespace } from 'import-in-the-middle';
import shimmer from 'shimmer';
import { watchers } from '../../core/index.js';
import { getCallerInfo } from '../../core/helpers/helpers.js';

// Create a global symbol to track if bunyan has been patched
const BUNYAN_PATCHED_SYMBOL = Symbol.for('node-observer:bunyan-patched');

if (
  process.env.NODE_OBSERVATORY_LOGGING &&
  JSON.parse(process.env.NODE_OBSERVATORY_LOGGING).includes('bunyan')
) {
  // Check if bunyan has already been patched
  if (!(global as any)[BUNYAN_PATCHED_SYMBOL]) {
    // Mark bunyan as patched
    (global as any)[BUNYAN_PATCHED_SYMBOL] = true;

    // Intercepts loading of "bunyan" (ESM version)
    addHook((exports: any, name: Namespace, baseDir?: string) => {
      // Only patch 'bunyan' module
      // if (name !== 'bunyan') {
      //   return exports;
      // }

      // Handle both default and named exports
      const bunyanExports = exports.default || exports;

      function patchLoggerMethods(loggerInstance: any, contextMetadata = {}) {
        ['info', 'warn', 'error', 'debug', 'trace', 'fatal'].forEach(
          (method) => {
            if (typeof loggerInstance[method] === 'function') {
              shimmer.wrap(loggerInstance, method, function (originalMethod) {
                return function patchedMethod(this: any, ...args: any[]) {
                  const callerInfo = getCallerInfo(__filename);

                  watchers.logging.insertRedisStream({
                    level: method,
                    package: 'bunyan',
                    message: args[0],
                    metadata:
                      typeof args[0] === 'object' ? args[0] : args[1] || {},
                    context: contextMetadata,
                    file: callerInfo.file,
                    line: callerInfo.line,
                  });

                  return originalMethod.apply(this, args);
                };
              });
            }
          },
        );

        // Patch child method for nested loggers
        if (typeof loggerInstance.child === 'function') {
          shimmer.wrap(loggerInstance, 'child', function (originalChild) {
            return function patchedChild(this: any, childBindings: any) {
              const childLogger = originalChild.call(this, childBindings);
              const mergedContext = {
                ...contextMetadata,
                ...childBindings,
              };
              patchLoggerMethods(childLogger, mergedContext);
              return childLogger;
            };
          });
        }
      }

      // Patch createLogger
      shimmer.wrap(
        bunyanExports as any,
        'createLogger',
        function (originalFn: Function) {
          return function patchedCreateLogger(this: any, ...loggerArgs: any[]) {
            // Call the original createLogger
            const loggerInstance = originalFn.apply(this, loggerArgs);
            patchLoggerMethods(loggerInstance, loggerArgs[0] || {});
            return loggerInstance;
          };
        },
      );

      // Return exports with proper structure
      if (exports.default) {
        return {
          ...exports,
          default: bunyanExports,
        };
      }

      return bunyanExports;
    });
  }
}
