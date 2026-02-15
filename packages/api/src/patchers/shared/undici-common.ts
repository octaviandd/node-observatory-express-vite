/** @format */

import shimmer from "shimmer";
import { PassThrough } from "stream";
import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

const MAX_BODY_SIZE = 1024 * 1024;

type UndiciMetadata = { package: "undici"; method: string };
type UndiciData = { hostname: string; pathname: string; statusCode?: number };

export type HttpLogEntry = BaseLogEntry<UndiciMetadata, UndiciData>;

const timestamp = () => new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: HttpLogEntry) {
  watchers.http.insertRedisStream({ ...entry, created_at: timestamp() });
}

const resolveFullUrl = (url: string, options?: Record<string, any>): string => {
  if (!url.startsWith("/") || !options?.dispatcher) return url;
  for (const sym of Object.getOwnPropertySymbols(options.dispatcher)) {
    const val = options.dispatcher[sym];
    if (val && typeof val === "object" && "origin" in val) return val.origin + url;
  }
  return url;
};

export function patchUndiciExports(exports: any, filename: string): any {
  if (!exports?.request) return exports;

  // Patch request()
  shimmer.wrap(exports, "request", (original) =>
    async function (this: any, url: string, options: Record<string, any>, ...args: unknown[]) {
      const callerInfo = getCallerInfo(filename);
      const startTime = performance.now();
      const fullUrl = resolveFullUrl(url, options);
      const urlObj = new URL(fullUrl);

      const base = { metadata: { package: "undici" as const, method: options?.method || "GET" }, data: { hostname: urlObj.hostname, pathname: urlObj.pathname } };

      try {
        const response = await original.call(this, fullUrl, options, ...args);

        if (!response.body) {
          log({ status: "completed", duration: parseFloat((performance.now() - startTime).toFixed(2)), location: { file: callerInfo.file, line: callerInfo.line }, ...base, data: { ...base.data, statusCode: response.statusCode } });
          return response;
        }

        // Track streaming body
        const passthrough = new PassThrough();
        response.body.pipe(passthrough);

        passthrough.on("end", () => {
          log({ status: "completed", duration: parseFloat((performance.now() - startTime).toFixed(2)), location: { file: callerInfo.file, line: callerInfo.line }, ...base, data: { ...base.data, statusCode: response.statusCode } });
        });

        return response;
      } catch (error: any) {
        log({ status: "failed", duration: parseFloat((performance.now() - startTime).toFixed(2)), ...base, data: { ...base.data, statusCode: error.statusCode || 500 }, error: { name: error.name, message: error.message, stack: error.stack, code: error.code } });
        throw error;
      }
    }
  );

  // Patch fetch()
  if (typeof exports.fetch === "function") {
    shimmer.wrap(exports, "fetch", (original) =>
      async function (this: any, input: RequestInfo | URL, init?: RequestInit, ...args: any[]) {
        const callerInfo = getCallerInfo(filename);
        const startTime = performance.now();

        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url ?? String(input);
        const urlObj = new URL(url);

        const base = { metadata: { package: "undici" as const, method: init?.method || "GET" }, data: { hostname: urlObj.hostname, pathname: urlObj.pathname } };

        try {
          const response = await original.call(this, input, init, ...args);

          return new Proxy(response, {
            get: (target, prop) => {
              if (["json", "text", "arrayBuffer", "blob", "formData"].includes(prop as string)) {
                return async () => {
                  try {
                    log({ status: "completed", duration: parseFloat((performance.now() - startTime).toFixed(2)), location: { file: callerInfo.file, line: callerInfo.line }, ...base, data: { ...base.data, statusCode: target.status } });
                  } catch {}
                  return (target as any)[prop]();
                };
              }
              return (target as any)[prop];
            },
          });
        } catch (error: any) {
          log({ status: "failed", duration: parseFloat((performance.now() - startTime).toFixed(2)), ...base, data: { ...base.data, statusCode: error.status || 500 }, error: { name: error.name, message: error.message, stack: error.stack, code: error.code } });
          throw error;
        }
      }
    );
  }

  return exports;
}

