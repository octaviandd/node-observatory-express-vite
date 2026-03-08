/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

type WinstonMetadata = { package: "winston"; level: string; logger?: string };
type WinstonData = { message: any };

export type WinstonLogEntry = BaseLogEntry<WinstonMetadata, WinstonData>;

const LOG_LEVELS = ["info", "warn", "error", "debug", "verbose", "silly", "log"] as const;
const PATCHED_LOGGERS = new WeakSet(); // Track which loggers we've already patched

const timestamp = () => new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: WinstonLogEntry) {
  console.log('Winston Log Entry:', entry);
  
  if (!watchers.log) {
    console.error('Log watcher not initialized!');
    return;
  }
  
  watchers.logging.insertRedisStream({ ...entry, created_at: timestamp() });
}

function patchLoggerMethods(logger: any, filename: string) {
  // Prevent double-patching the same logger instance
  if (PATCHED_LOGGERS.has(logger)) {
    return;
  }
  
  PATCHED_LOGGERS.add(logger);
  
  for (const level of LOG_LEVELS) {
    if (typeof logger[level] === "function") {
      const original = logger[level];
      
      logger[level] = function patchedMethod(this: any, ...args: any[]) {
        const startTime = performance.now();
        const callerInfo = getCallerInfo(filename);
        
        try {
          const result = original.apply(this, args);
          const duration = parseFloat((performance.now() - startTime).toFixed(2));
          
          log({
            status: "completed",
            duration,
            metadata: { 
              package: "winston", 
              level,
              logger: this.defaultMeta?.service || 'default'
            },
            data: { message: args[0] },
            location: { file: callerInfo.file, line: callerInfo.line }
          });
          
          return result;
        } catch (err: any) {
          const duration = parseFloat((performance.now() - startTime).toFixed(2));
          
          log({
            status: "failed",
            duration,
            metadata: { 
              package: "winston", 
              level,
              logger: this.defaultMeta?.service || 'default'
            },
            data: { message: args[0] },
            location: { file: callerInfo.file, line: callerInfo.line },
            error: {
              name: err.name || 'WinstonError',
              message: err.message || String(err),
              stack: err.stack,
            }
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
    shimmer.wrap(winstonModule, "createLogger", (originalCreateLogger) =>
      function patchedCreateLogger(this: any, ...args: any[]) {
        const loggerInstance = originalCreateLogger.apply(this, args);
        patchLoggerMethods(loggerInstance, filename);
        return loggerInstance;
      }
    );
  }

  // Patch Container.add (for winston.loggers.add())
  if (winstonModule?.Container && typeof winstonModule.Container === "function") {
    shimmer.wrap(winstonModule.Container.prototype, "add", (originalAdd) =>
      function patchedAdd(this: any, ...args: any[]) {
        const logger = originalAdd.apply(this, args);
        patchLoggerMethods(logger, filename);
        return logger;
      }
    );
  }

  // Patch the loggers collection's get method
  if (winstonModule?.loggers && typeof winstonModule.loggers.get === "function") {
    const originalGet = winstonModule.loggers.get;
    winstonModule.loggers.get = function(this: any, ...args: any[]) {
      const logger = originalGet.apply(this, args);
      if (logger) {
        patchLoggerMethods(logger, filename);
      }
      return logger;
    };
  }

  // IMPORTANT: Patch any existing logger instances that might already exist
  // This catches loggers created before patching
  if (winstonModule && typeof winstonModule === "object") {
    const isLogger = LOG_LEVELS.some(level => typeof winstonModule[level] === "function");
    if (isLogger) {
      patchLoggerMethods(winstonModule, filename);
    }
  }

  return exports;
}