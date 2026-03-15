/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

const timestamp = () =>
  new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: ModelContent) {
  watchers.model.insertRedisStream({ ...entry });
}

const MODEL_METHODS = [
  "create",
  "findAll",
  "findOne",
  "findByPk",
  "update",
  "destroy",
] as const;

export function patchSequelizeExports(exports: any, filename: string): any {
  if (!exports || typeof exports !== "function" || !exports.Model)
    return exports;

  for (const method of MODEL_METHODS) {
    shimmer.wrap(
      exports.Model,
      method,
      (original: Function) =>
        async function patchedMethod(this: any, ...args: any[]) {
          const startTime = performance.now();
          const callerInfo = getCallerInfo(filename);

          try {
            const result = await original.apply(this, args);

            log({
              metadata: {
                package: "sequelize",
                duration: parseFloat(
                  (performance.now() - startTime).toFixed(2),
                ),
                location: { file: callerInfo.file, line: callerInfo.line },
                created_at: timestamp(),
              },
              data: {
                status: "completed",
                method,
                modelName: this.name,
              },
            });

            return result;
          } catch (error: any) {
            log({
              metadata: {
                package: "sequelize",
                duration: parseFloat(
                  (performance.now() - startTime).toFixed(2),
                ),
                location: { file: callerInfo.file, line: callerInfo.line },
                created_at: timestamp(),
              },
              data: {
                status: "failed",
                method,
                modelName: this.name,
              },
              error: {
                name: "SequelizeError",
                message: error?.message,
                stack: error?.stack,
              },
            });

            throw error;
          }
        },
    );
  }

  return exports;
}
