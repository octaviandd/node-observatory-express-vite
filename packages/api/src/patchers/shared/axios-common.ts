/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";
import { URL } from "url";

const timestamp = () =>
  new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: HttpClientContent) {
  watchers.http.insertRedisStream({ ...entry });
}

function createLogEntry(
  config: any,
  filename: string,
  startTime: number,
  response?: any,
  error?: any,
): HttpClientContent {
  const callerInfo = getCallerInfo(filename);

  let urlObj: any;
  try {
    urlObj = new URL(config.url, config.baseURL);
  } catch {
    urlObj = { hostname: "unknown", pathname: config.url || "unknown" };
  }

  const duration = parseFloat((performance.now() - startTime).toFixed(2));

  if (error) {
    return {
      metadata: {
        package: "axios",
        duration,
        location: { file: callerInfo.file, line: callerInfo.line },
        created_at: timestamp(),
      },
      data: {
        method: (config.method || "get").toUpperCase(),
        hostname: urlObj.hostname,
        pathname: urlObj.pathname,
        statusCode: error.response?.status || 500,
      },
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
      },
    };
  }

  return {
    metadata: {
      package: "axios",
      duration,
      location: { file: callerInfo.file, line: callerInfo.line },
      created_at: timestamp(),
    },
    data: {
      method: (config.method || "get").toUpperCase(),
      hostname: urlObj.hostname,
      pathname: urlObj.pathname,
      statusCode: response?.status,
    },
  };
}

function patchMethod(target: any, method: string, filename: string) {
  if (typeof target[method] !== "function") return;

  shimmer.wrap(
    target,
    method,
    (original: Function) =>
      function patched(this: any, ...args: any[]) {
        const startTime = performance.now();
        const config =
          method === "request"
            ? typeof args[0] === "string"
              ? { url: args[0], ...(args[1] || {}) }
              : args[0]
            : { method, url: args[0], ...(args[1] || {}) };

        const result = original.apply(this, args);

        if (result?.then) {
          result
            .then((res: any) => {
              log(createLogEntry(config, filename, startTime, res));
              return res;
            })
            .catch((err: any) => {
              log(createLogEntry(config, filename, startTime, undefined, err));
              throw err;
            });
        }

        return result;
      },
  );
}

function patchAxiosInstance(instance: any, filename: string) {
  patchMethod(instance, "request", filename);
  for (const method of [
    "get",
    "post",
    "put",
    "patch",
    "delete",
    "head",
    "options",
  ]) {
    patchMethod(instance, method, filename);
  }
}

export function patchAxiosExports(exports: any, filename: string): any {
  patchAxiosInstance(exports, filename);

  if (typeof exports.create === "function") {
    shimmer.wrap(
      exports,
      "create",
      (originalCreate: Function) =>
        function patchedCreate(this: any, ...args: any[]) {
          const instance = originalCreate.apply(this, args);
          patchAxiosInstance(instance, filename);
          return instance;
        },
    );
  }

  return exports;
}
