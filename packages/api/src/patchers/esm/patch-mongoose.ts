/** @format */

import { addHook, Namespace } from "import-in-the-middle";
import shimmer from "shimmer";
import { watchers, patchedGlobal } from "../../core/index.js";
import { getCallerInfo } from "../../core/helpers/helpers.js";
import { PATCHERS_GLOBAL_SYMBOLS } from "../../core/helpers/constants.js";

if (
  process.env.NODE_OBSERVATORY_MODELS &&
  JSON.parse(process.env.NODE_OBSERVATORY_MODELS).includes("mongoose")
) {
  if (!patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.MONGOOSE_PATCHED_SYMBOL]) {
    patchedGlobal[PATCHERS_GLOBAL_SYMBOLS.MONGOOSE_PATCHED_SYMBOL] = true;

    addHook((exports: any, name: Namespace, baseDir?: string) => {
      // Handle both default and named exports
      const mongooseModule = exports.default || exports;

      // `mongooseModule` is the Mongoose module.
      if (!mongooseModule || typeof mongooseModule.Model !== "function") {
        return exports;
      }

      // Patch static methods at the Model constructor level
      const staticMethodsToPatch = [
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
      ];

      shimmer.wrap(mongooseModule.Model.prototype, "save", function (originalSave) {
        return async function patchedSave(this: any, ...args: any[]) {
          const startTime = performance.now();

          try {
            const result = await originalSave.apply(this, args);

            const endTime = performance.now();
            logModelOperation(
              "create",
              result.__proto__.$collection.modelName,
              args,
              result.toObject(),
              parseFloat((endTime - startTime).toFixed(2)),
              undefined,
            );
            return result;
          } catch (error: any) {
            // Do not log the error for the model, it should be logged as an exception since the model doesn't exist yet.
            throw error;
          }
        };
      });

      staticMethodsToPatch.forEach((method) => {
        if (
          typeof mongooseModule.Model[method] === "function" &&
          !mongooseModule.Model[method].__patched
        ) {
          shimmer.wrap(mongooseModule.Model, method, function (originalMethod) {
            async function patchedMethod(this: any, ...args: any[]) {
              const startTime = performance.now();

              try {
                const result = await originalMethod.apply(this, args);
                const endTime = performance.now();
                logModelOperation(
                  method,
                  this.modelName || "Unknown",
                  args,
                  result.toJSON ? result.toJSON() : result,
                  parseFloat((endTime - startTime).toFixed(2)),
                  undefined,
                );
                return result;
              } catch (error: any) {
                const endTime = performance.now();
                logModelOperation(
                  method,
                  this.modelName || "Unknown",
                  args,
                  undefined,
                  parseFloat((endTime - startTime).toFixed(2)),
                  error,
                );
                throw error;
              }
            }

            patchedMethod.__patched = true;
            return patchedMethod;
          });
        }
      });
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
      package: "mongoose",
      file: callerInfo.file,
      line: callerInfo.line,
      error: error ? error.toString() : undefined,
      status: error ? "failed" : "completed",
    };
    watchers.model.insertRedisStream(modelLogEntry);
  }
}
