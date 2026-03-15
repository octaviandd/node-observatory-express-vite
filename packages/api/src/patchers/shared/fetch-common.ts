/** @format */

import { watchers } from "../../core/index";
import { getCallerInfo } from "../../core/helpers/helpers";

const timestamp = () =>
  new Date().toISOString().replace("T", " ").substring(0, 19);

function log(entry: HttpClientContent) {
  watchers.http.insertRedisStream({ ...entry });
}

export function applyFetchPatch(filename: string) {
  if (typeof globalThis.fetch !== "function") return;

  const originalFetch = globalThis.fetch;

  globalThis.fetch = async function patchedFetch(url, options = {}) {
    const startTime = performance.now();
    const req = new Request(url, options);
    const callerInfo = getCallerInfo(filename);
    const urlObj = new URL(req.url);

    const data: HttpClientData = {
      method: req.method,
      hostname: urlObj.hostname,
      pathname: urlObj.pathname,
    };

    try {
      const response = await originalFetch(url, options);

      return new Proxy(response, {
        get: (target, prop) => {
          if (
            ["json", "text", "arrayBuffer", "blob", "formData"].includes(
              prop as string,
            )
          ) {
            const originalMethod = target[prop as keyof Response];

            return async function () {
              try {
                log({
                  metadata: {
                    package: "fetch",
                    duration: parseFloat(
                      (performance.now() - startTime).toFixed(2),
                    ),
                    location: { file: callerInfo.file, line: callerInfo.line },
                    created_at: timestamp(),
                  },
                  data: { ...data, statusCode: target.status },
                });
                return (originalMethod as Function).apply(target);
              } catch {
                return (originalMethod as Function).apply(target);
              }
            };
          }

          return target[prop as keyof Response];
        },
      });
    } catch (error: any) {
      log({
        metadata: {
          package: "fetch",
          duration: parseFloat((performance.now() - startTime).toFixed(2)),
          location: { file: callerInfo.file, line: callerInfo.line },
          created_at: timestamp(),
        },
        data: { ...data, statusCode: 500 },
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      });
      throw error;
    }
  };
}
