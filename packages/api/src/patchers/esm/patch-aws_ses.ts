/** @format */

import { addHook, Namespace } from 'import-in-the-middle';
import shimmer from 'shimmer';
import { watchers } from '../../core/index.js';
import { getCallerInfo } from '../../core/helpers/helpers.js';

// Create a global symbol to track if aws-ses has been patched
const AWS_SES_PATCHED_SYMBOL = Symbol.for('node-observer:aws-ses-patched');

if (
  process.env.NODE_OBSERVATORY_MAILER &&
  JSON.parse(process.env.NODE_OBSERVATORY_MAILER).includes(
    '@aws-sdk/client-ses',
  )
) {
  // Check if aws-ses has already been patched
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLSPATCHERS_GLOBAL_SYMBOLS.AWS_SES_PATCHED_SYMBOL]) {
    // Mark aws-ses as patched
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLSAWS_SES_PATCHED_SYMBOL] = true;

    /**
     * Hook "@aws-sdk/client-ses" to patch its email sending functionality (ESM version).
     */
    addHook((exports: any, name: Namespace, baseDir?: string) => {
      // Only patch '@aws-sdk/client-ses' module
      // if (name !== '@aws-sdk/client-ses') {
      //   return exports;
      // }

      // Handle both default and named exports
      const sesExports = exports.default || exports;

      if (!sesExports || typeof sesExports.SESClient !== 'function') {
        return exports;
      }

      // Get the original prototype
      const originalPrototype = sesExports.SESClient.prototype;

      // Patch only the send method on the prototype
      if (originalPrototype && typeof originalPrototype.send === 'function') {
        shimmer.wrap(originalPrototype, 'send', function (originalSend) {
          return async function patchedSend(
            this: any,
            command: any,
            ...sendArgs: any[]
          ) {
            const startTime = performance.now();
            const callerInfo = getCallerInfo(__filename);

            const commandName = command.constructor.name;
            const input = command.input || {};

            const content = {
              command: commandName,
              to: input.Destination?.ToAddresses || [],
              cc: input.Destination?.CcAddresses || [],
              bcc: input.Destination?.BccAddresses || [],
              from: input.Source,
              subject: input.Message?.Subject?.Data,
              body:
                input.Message?.Body?.Html?.Data ||
                input.Message?.Body?.Text?.Data,
              file: callerInfo.file,
              line: callerInfo.line,
              package: 'aws-sdk/client-ses',
            };

            try {
              const result = await originalSend.call(
                this,
                command,
                ...sendArgs,
              );
              const endTime = performance.now();
              const duration = parseFloat((endTime - startTime).toFixed(2));

              watchers.mailer.insertRedisStream({
                status: 'completed',
                info: {
                  messageId: result.MessageId,
                  response: result.$metadata,
                },
                duration,
                ...content,
              });

              return result;
            } catch (err: any) {
              const endTime = performance.now();
              const duration = parseFloat((endTime - startTime).toFixed(2));

              watchers.mailer.insertRedisStream({
                status: 'failed',
                error: {
                  name: err.name,
                  message: err.message,
                  stack: err.stack,
                },
                duration,
                ...content,
              });
              throw err;
            }
          };
        });
      }

      // Return exports with proper structure
      if (exports.default) {
        return {
          ...exports,
          default: sesExports,
        };
      }

      return sesExports;
    });

    /**
     * Hook "@aws-sdk" to patch SES functionality when imported directly from the main AWS SDK (ESM version).
     */
    addHook((exports: any, name: Namespace, baseDir?: string) => {
      // Only patch '@aws-sdk' module
      // if (name !== '@aws-sdk') {
      //   return exports;
      // }

      // Handle case where user imports from @aws-sdk directly
      if (!exports) {
        return exports;
      }

      // Handle both default and named exports
      const awsExports = exports.default || exports;

      // Intercept the SES client when it's loaded from the main SDK
      // We need to use a getter to intercept when the property is accessed
      if (awsExports.SES === undefined) {
        Object.defineProperty(awsExports, 'SES', {
          configurable: true,
          enumerable: true,
          get: function () {
            const originalSES = awsExports.SES;

            // If SES exists and has a Client property with a prototype
            if (
              originalSES &&
              originalSES.Client &&
              originalSES.Client.prototype
            ) {
              const originalPrototype = originalSES.Client.prototype;

              // Patch the send method if it exists
              if (typeof originalPrototype.send === 'function') {
                shimmer.wrap(originalPrototype, 'send', function (originalSend) {
                  return async function patchedSend(
                    this: any,
                    command: any,
                    ...sendArgs: any[]
                  ) {
                    const startTime = performance.now();
                    const callerInfo = getCallerInfo(__filename);

                    const commandName = command.constructor.name;
                    const input = command.input || {};

                    const content = {
                      command: commandName,
                      to: input.Destination?.ToAddresses || [],
                      cc: input.Destination?.CcAddresses || [],
                      bcc: input.Destination?.BccAddresses || [],
                      from: input.Source,
                      subject: input.Message?.Subject?.Data,
                      body:
                        input.Message?.Body?.Html?.Data ||
                        input.Message?.Body?.Text?.Data,
                      file: callerInfo.file,
                      line: callerInfo.line,
                      package: 'aws-sdk',
                    };

                    try {
                      const result = await originalSend.call(
                        this,
                        command,
                        ...sendArgs,
                      );
                      const endTime = performance.now();
                      const duration = parseFloat(
                        (endTime - startTime).toFixed(2),
                      );

                      watchers.mailer.insertRedisStream({
                        status: 'completed',
                        info: {
                          messageId: result.MessageId,
                          response: result.$metadata,
                        },
                        duration,
                        ...content,
                      });

                      return result;
                    } catch (err: any) {
                      const endTime = performance.now();
                      const duration = parseFloat(
                        (endTime - startTime).toFixed(2),
                      );

                      watchers.mailer.insertRedisStream({
                        status: 'failed',
                        error: {
                          name: err.name,
                          message: err.message,
                          stack: err.stack,
                        },
                        duration,
                        ...content,
                      });
                      throw err;
                    }
                  };
                });
              }
            }

            return originalSES;
          },
        });
      }

      // Return exports with proper structure
      if (exports.default) {
        return {
          ...exports,
          default: awsExports,
        };
      }

      return awsExports;
    });
  }
}
