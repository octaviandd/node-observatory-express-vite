/** @format */

import { addHook, Namespace } from "import-in-the-middle";
import shimmer from "shimmer";
import { watchers, patchedGlobal } from "../../core/index.js";
import { getCallerInfo } from "../../core/helpers/helpers.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";

if (
  process.env.NODE_OBSERVATORY_MODELS &&
  JSON.parse(process.env.NODE_OBSERVATORY_MODELS).includes("typeorm")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.TYPEORM_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.TYPEORM_PATCHED_SYMBOL] = true;

    addHook((exports: any, name: Namespace, baseDir?: string) => {
      const typeormModule = exports.default || exports;

      if (!typeormModule || typeof typeormModule.Repository !== "function") {
        return exports;
      }

      const methodsToPatch = [
        "save",
        "find",
        "findOne",
        "findBy",
        "findAndCount",
        "findOneBy",
        "findOneOrFail",
        "count",
        "countBy",
        "remove",
        "update",
        "insert",
        "query",
      ];

      methodsToPatch.forEach((method) => {
        if (typeof typeormModule.Repository.prototype[method] === "function") {
          shimmer.wrap(
            typeormModule.Repository.prototype,
            method,
            function (originalMethod) {
              return async function patchedMethod(this: any, ...args: any[]) {
                const startTime = performance.now();

                try {
                  const result = await originalMethod.apply(this, args);
                  const endTime = performance.now();
                  logModelOperation(
                    method,
                    this.target?.name,
                    args,
                    result,
                    parseFloat((endTime - startTime).toFixed(2)),
                    undefined,
                  );
                  return result;
                } catch (error: any) {
                  const endTime = performance.now();
                  logModelOperation(
                    method,
                    this.target?.name,
                    args,
                    undefined,
                    parseFloat((endTime - startTime).toFixed(2)),
                    error,
                  );
                  throw error;
                }
              };
            },
          );
        }
      });

      shimmer.wrap(
        typeormModule.BaseEntity.prototype,
        "save",
        function (originalSave) {
          return async function patchedSave(this: any, ...args: any[]) {
            const startTime = performance.now();

            try {
              const result = await originalSave.apply(this, args);
              const endTime = performance.now();
              logModelOperation(
                "save",
                this.constructor.name,
                args,
                result,
                parseFloat((endTime - startTime).toFixed(2)),
                undefined,
              );
              return result;
            } catch (error: any) {
              const endTime = performance.now();
              logModelOperation(
                "save",
                this.constructor.name,
                args,
                undefined,
                parseFloat((endTime - startTime).toFixed(2)),
                error,
              );
              throw error;
            }
          };
        },
      );

      return exports;
    });
  }

  /**
   * Logs model operation details with the originating file and line number.
   * @param method - The method being executed (e.g., "save", "find").
   * @param modelName - The model name of the entity or repository.
   * @param args - The arguments passed to the method.
   * @param result - The result of the method execution.
   * @param duration - The time taken to execute the operation in milliseconds.
   * @param error - Optional error object, if the operation fails.
   */
  function logModelOperation(
    method: string,
    modelName: string,
    args: any[],
    result: any,
    duration: number,
    error?: Error,
  ) {
    const callerInfo = getCallerInfo(__filename);

    // Log to model watcher with consistent keys
    const modelLogEntry = {
      method,
      modelName,
      arguments: args,
      result,
      duration,
      package: "typeorm",
      file: callerInfo.file,
      line: callerInfo.line,
      error: error ? error.toString() : undefined,
      status: error ? "failed" : "completed",
    };
    watchers.model.insertRedisStream(modelLogEntry);
  }
}
