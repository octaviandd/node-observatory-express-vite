/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

type MongooseMetadata = { package: "mongoose"; method: string; modelName: string };
type MongooseData = {};

export type MongooseLogEntry = BaseLogEntry<MongooseMetadata, MongooseData>;

const timestamp = () => new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: MongooseLogEntry) { 
    watchers.model.insertRedisStream({ ...entry, created_at: timestamp() })
}

const STATIC_METHODS = [
  "create", "findOne", "find", "findById", "countDocuments", "updateOne", "updateMany",
  "deleteOne", "deleteMany", "aggregate", "findOneAndUpdate", "findOneAndDelete",
] as const;

export function patchMongooseExports(exports: any, filename: string): any {
  if (!exports?.Model || typeof exports.Model !== "function") return exports;

  // Patch save on prototype
  shimmer.wrap(exports.Model.prototype, "save", (originalSave) =>
    async function patchedSave(this: any, ...args: any[]) {
      const startTime = performance.now();
      const callerInfo = getCallerInfo(filename);

      try {
        const result = await originalSave.apply(this, args);
        log({ status: "completed", duration: parseFloat((performance.now() - startTime).toFixed(2)), metadata: { package: "mongoose", method: "save", modelName: result.__proto__.$collection?.modelName || "Unknown" }, data: {}, location: { file: callerInfo.file, line: callerInfo.line } });
        return result;
      } catch (error: any) {
        log({ status: "failed", duration: parseFloat((performance.now() - startTime).toFixed(2)), metadata: { package: "mongoose", method: "save", modelName: "Unknown" }, data: {}, error: { name: "MongooseError", message: error?.message, stack: error?.stack } });
        throw error;
      }
    }
  );

  // Patch static methods
  for (const method of STATIC_METHODS) {
    if (typeof exports.Model[method] !== "function" || (exports.Model[method] as any).__patched) continue;

    shimmer.wrap(exports.Model, method, (originalMethod) => {
      async function patchedMethod(this: any, ...args: any[]) {
        const startTime = performance.now();
        const callerInfo = getCallerInfo(filename);
        const base = { metadata: { package: "mongoose" as const, method, modelName: this.modelName || "Unknown" }, data: {} };

        try {
          const result = await originalMethod.apply(this, args);
          log({ status: "completed", duration: parseFloat((performance.now() - startTime).toFixed(2)), location: { file: callerInfo.file, line: callerInfo.line }, ...base });
          return result;
        } catch (error: any) {
          log({ status: "failed", duration: parseFloat((performance.now() - startTime).toFixed(2)), error: { name: "MongooseError", message: error?.message, stack: error?.stack }, ...base });
          throw error;
        }
      }
      (patchedMethod as any).__patched = true;
      return patchedMethod;
    });
  }

  return exports;
}

