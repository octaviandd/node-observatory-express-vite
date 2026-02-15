/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

type SequelizeMetadata = { package: "sequelize"; method: string; modelName: string };
type SequelizeData = {};

export type SequelizeLogEntry = BaseLogEntry<SequelizeMetadata, SequelizeData>;

const timestamp = () => new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: SequelizeLogEntry) { 
    watchers.model.insertRedisStream({ ...entry, created_at: timestamp() })
}

const MODEL_METHODS = ["create", "findAll", "findOne", "findByPk", "update", "destroy"] as const;

export function patchSequelizeExports(exports: any, filename: string): any {
  if (!exports || typeof exports !== "function" || !exports.Model) return exports;

  for (const method of MODEL_METHODS) {
    shimmer.wrap(exports.Model, method, (original: Function) =>
      async function patchedMethod(this: any, ...args: any[]) {
        const startTime = performance.now();
        const callerInfo = getCallerInfo(filename);

        const base = { metadata: { package: "sequelize" as const, method, modelName: this.name }, data: {} };

        try {
          const result = await original.apply(this, args);
          log({ status: "completed", duration: parseFloat((performance.now() - startTime).toFixed(2)), location: { file: callerInfo.file, line: callerInfo.line }, ...base });
          return result;
        } catch (error: any) {
          log({ status: "failed", duration: parseFloat((performance.now() - startTime).toFixed(2)), error: { name: "SequelizeError", message: error?.message, stack: error?.stack }, ...base });
          throw error;
        }
      }
    );
  }

  return exports;
}

