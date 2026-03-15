/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

const LOG_LEVELS = [
  "info",
  "warn",
  "error",
  "debug",
  "verbose",
  "silly",
  "log",
] as const;
const PATCHED_LOGGERS = new WeakSet();

const timestamp = () =>
  new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: LogContent) {
  watchers.logging.insertRedisStream({ ...entry });
}

function patchLoggerMethods(logger: any, filename: string) {
  if (PATCHED_LOGGERS.has(logger)) return;
  PATCHED_LOGGERS.add(logger);

  for (const level of LOG_LEVELS) {
    if (typeof logger[level] === "function") {
      const original = logger[level];

      logger[level] = function patchedMethod(this: any, ...args: any[]) {
        const callerInfo = getCallerInfo(filename);

        try {
          const result = original.apply(this, args);

          log({
            metadata: {
              package: "winston",
              level,
              logger: this.defaultMeta?.service || "default",
              location: { file: callerInfo.file, line: callerInfo.line },
              created_at: timestamp(),
            },
            data: { message: args[0] },
          });

          return result;
        } catch (err: any) {
          log({
            metadata: {
              package: "winston",
              level,
              logger: this.defaultMeta?.service || "default",
              location: { file: callerInfo.file, line: callerInfo.line },
              created_at: timestamp(),
            },
            data: { message: args[0] },
            error: {
              name: err.name || "WinstonError",
              message: err.message || String(err),
              stack: err.stack,
            },
          });

          throw err;
        }
      };
    }
  }
}

export function patchWinstonExports(exports: any, filename: string): any {
  const winstonModule = exports.default || exports;

  // Patch createLogger to catch future logger instances
  if (typeof winstonModule?.createLogger === "function") {
    shimmer.wrap(
      winstonModule,
      "createLogger",
      (originalCreateLogger) =>
        function patchedCreateLogger(this: any, ...args: any[]) {
          const loggerInstance = originalCreateLogger.apply(this, args);
          patchLoggerMethods(loggerInstance, filename);
          return loggerInstance;
        },
    );
  }

  // Patch Container.add (for winston.loggers.add())
  if (
    winstonModule?.Container &&
    typeof winstonModule.Container === "function"
  ) {
    shimmer.wrap(
      winstonModule.Container.prototype,
      "add",
      (originalAdd) =>
        function patchedAdd(this: any, ...args: any[]) {
          const logger = originalAdd.apply(this, args);
          patchLoggerMethods(logger, filename);
          return logger;
        },
    );
  }

  // Patch the loggers collection's get method
  if (
    winstonModule?.loggers &&
    typeof winstonModule.loggers.get === "function"
  ) {
    const originalGet = winstonModule.loggers.get;
    winstonModule.loggers.get = function (this: any, ...args: any[]) {
      const logger = originalGet.apply(this, args);
      if (logger) patchLoggerMethods(logger, filename);
      return logger;
    };
  }

  // Patch any existing logger instances created before patching
  if (winstonModule && typeof winstonModule === "object") {
    const isLogger = LOG_LEVELS.some(
      (level) => typeof winstonModule[level] === "function",
    );
    if (isLogger) patchLoggerMethods(winstonModule, filename);
  }

  return exports;
}
