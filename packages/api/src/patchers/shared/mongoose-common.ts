/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

const timestamp = () =>
  new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: ModelContent) {
  watchers.model.insertRedisStream({ ...entry });
}

const STATIC_METHODS = [
  "create",
  "findOne",
  "find",
  "findById",
  "countDocuments",
  "updateOne",
  "updateMany",
  "deleteOne",
  "deleteMany",
  "aggregate",
  "findOneAndUpdate",
  "findOneAndDelete",
] as const;

export function patchMongooseExports(exports: any, filename: string): any {
  if (!exports?.Model || typeof exports.Model !== "function") return exports;

  // Patch save on prototype
  shimmer.wrap(
    exports.Model.prototype,
    "save",
    (originalSave) =>
      async function patchedSave(this: any, ...args: any[]) {
        const startTime = performance.now();
        const callerInfo = getCallerInfo(filename);

        try {
          const result = await originalSave.apply(this, args);

          log({
            metadata: {
              package: "mongoose",
              duration: parseFloat((performance.now() - startTime).toFixed(2)),
              location: { file: callerInfo.file, line: callerInfo.line },
              created_at: timestamp(),
            },
            data: {
              status: "completed",
              method: "save",
              modelName: result.__proto__.$collection?.modelName || "Unknown",
            },
          });

          return result;
        } catch (error: any) {
          log({
            metadata: {
              package: "mongoose",
              duration: parseFloat((performance.now() - startTime).toFixed(2)),
              location: { file: callerInfo.file, line: callerInfo.line },
              created_at: timestamp(),
            },
            data: {
              status: "failed",
              method: "save",
              modelName: "Unknown",
            },
            error: {
              name: "MongooseError",
              message: error?.message,
              stack: error?.stack,
            },
          });

          throw error;
        }
      },
  );

  // Patch static methods
  for (const method of STATIC_METHODS) {
    if (
      typeof exports.Model[method] !== "function" ||
      (exports.Model[method] as any).__patched
    )
      continue;

    shimmer.wrap(exports.Model, method, (originalMethod) => {
      async function patchedMethod(this: any, ...args: any[]) {
        const startTime = performance.now();
        const callerInfo = getCallerInfo(filename);

        try {
          const result = await originalMethod.apply(this, args);

          log({
            metadata: {
              package: "mongoose",
              duration: parseFloat((performance.now() - startTime).toFixed(2)),
              location: { file: callerInfo.file, line: callerInfo.line },
              created_at: timestamp(),
            },
            data: {
              status: "completed",
              method,
              modelName: this.modelName || "Unknown",
            },
          });

          return result;
        } catch (error: any) {
          log({
            metadata: {
              package: "mongoose",
              duration: parseFloat((performance.now() - startTime).toFixed(2)),
              location: { file: callerInfo.file, line: callerInfo.line },
              created_at: timestamp(),
            },
            data: {
              status: "failed",
              method,
              modelName: this.modelName || "Unknown",
            },
            error: {
              name: "MongooseError",
              message: error?.message,
              stack: error?.stack,
            },
          });

          throw error;
        }
      }

      (patchedMethod as any).__patched = true;
      return patchedMethod;
    });
  }

  return exports;
}
