/** @format */

import shimmer from "shimmer";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";
import { URL } from "url";

const MAX_BODY_SIZE = 1024 * 1024;

type AxiosMetadata = { package: "axios"; method: string };
type AxiosData = { hostname: string; pathname: string; statusCode?: number };

export type AxiosLogEntry = BaseLogEntry<AxiosMetadata, AxiosData>;

const timestamp = () => new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: AxiosLogEntry) { 
    watchers.http.insertRedisStream({ ...entry, created_at: timestamp() })
}

function createLogEntry(config: any, response?: any, error?: any, startTime?: number, filename?: string): AxiosLogEntry {
  const callerInfo = getCallerInfo(filename || __filename);

  let urlObj: any;
  try { urlObj = new URL(config.url, config.baseURL); }
  catch { urlObj = { hostname: "unknown", pathname: config.url || "unknown" }; }

  const duration = startTime ? parseFloat((performance.now() - startTime).toFixed(2)) : 0;
  const base = { metadata: { package: "axios" as const, method: (config.method || "get").toUpperCase() } };

  if (error) {
    return { status: "failed", duration, ...base, data: { hostname: urlObj.hostname, pathname: urlObj.pathname, statusCode: error.response?.status || 500 }, error: { name: error.name, message: error.message, stack: error.stack, code: error.code } };
  }

  return { status: "completed", duration, location: { file: callerInfo.file, line: callerInfo.line }, ...base, data: { hostname: urlObj.hostname, pathname: urlObj.pathname, statusCode: response?.status } };
}

function patchMethod(target: any, method: string, filename: string) {
  if (typeof target[method] !== "function") return;

  shimmer.wrap(target, method, (original: Function) =>
    function patched(this: any, ...args: any[]) {
      const startTime = performance.now();
      const config = method === "request"
        ? (typeof args[0] === "string" ? { url: args[0], ...(args[1] || {}) } : args[0])
        : { method, url: args[0], ...(args[1] || {}) };

      const result = original.apply(this, args);
      if (result?.then) {
        result
          .then((res: any) => { log(createLogEntry(config, res, null, startTime, filename)); return res; })
          .catch((err: any) => { log(createLogEntry(config, null, err, startTime, filename)); throw err; });
      }
      return result;
    }
  );
}

function patchAxiosInstance(instance: any, filename: string) {
  patchMethod(instance, "request", filename);
  for (const method of ["get", "post", "put", "patch", "delete", "head", "options"]) {
    patchMethod(instance, method, filename);
  }
}

export function patchAxiosExports(exports: any, filename: string): any {
  patchAxiosInstance(exports, filename);

  if (typeof exports.create === "function") {
    shimmer.wrap(exports, "create", (originalCreate: Function) =>
      function patchedCreate(this: any, ...args: any[]) {
        const instance = originalCreate.apply(this, args);
        patchAxiosInstance(instance, filename);
        return instance;
      }
    );
  }

  return exports;
}

