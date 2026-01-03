/** @format */

import { addHook, Namespace } from "import-in-the-middle";
import shimmer from "shimmer";
import { watchers, patchedGlobal } from "../../core/index.js";
import { getCallerInfo } from "../../core/helpers/helpers.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";

if (
  process.env.NODE_OBSERVATORY_MODELS &&
  JSON.parse(process.env.NODE_OBSERVATORY_MODELS).includes("sequelize")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.SEQUELIZE_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.SEQUELIZE_PATCHED_SYMBOL] = true;

    addHook((exports: any, name: Namespace, baseDir?: string) => {
      const sequelizeModule = exports.default || exports;

      if (!sequelizeModule || typeof sequelizeModule !== "function") {
        return exports;
      }

      const modelMethods = [
        "create",
        "findAll",
        "findOne",
        "findByPk",
        "update",
        "destroy",
      ];

      modelMethods.forEach((method) => {
        shimmer.wrap(sequelizeModule.Model, method, function (original: Function) {
          return async function patchedMethod(this: any, ...args: any[]) {
            const startTime = performance.now();

            try {
              const result = await original.apply(this, args);
              const endTime = performance.now();
              const duration = parseFloat((endTime - startTime).toFixed(2));

              // Log model operation
              logModelOperation(
                method,
                this.name,
                args,
                result,
                duration,
                undefined,
              );

              // The SQL query will be captured by the query patch
              return result;
            } catch (error: any) {
              const endTime = performance.now();
              const duration = parseFloat((endTime - startTime).toFixed(2));

              // Log model operation error
              logModelOperation(
                method,
                this.name,
                args,
                undefined,
                duration,
                error,
              );

              throw error;
            }
          };
        });
      });

      return exports;
    });
  }
}

function logModelOperation(
  method: string,
  modelName: string,
  args: any[],
  result: any,
  duration: number,
  error?: Error,
) {
  const callerInfo = getCallerInfo(__filename);

  const modelLogEntry = {
    method,
    modelName,
    arguments: args,
    result,
    duration,
    package: "sequelize",
    file: callerInfo.file,
    line: callerInfo.line,
    error: error ? error.toString() : undefined,
    status: error ? "failed" : "completed",
  };

  watchers.model.insertRedisStream(modelLogEntry);
}
