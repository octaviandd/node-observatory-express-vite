/** @format */

import shimmer from "shimmer";
import http from "http";
import https from "https";
import zlib from "zlib";
import { watchers } from "../../core/index";
import {
  getCallerInfo,
  getRequestInfo,
  httpRequestToRequestData,
} from "../../core/helpers/helpers";

const MAX_BODY_SIZE = 1024 * 1024;

const timestamp = () =>
  new Date().toISOString().replace("T", " ").substring(0, 19);

function logHttpEntry(entry: HttpClientContent) {
  watchers.http.insertRedisStream({ ...entry });
}

const skipDomains = [
  "amazonaws.com",
  "api.sendgrid.com",
  "api.mailgun.net",
  "api.postmarkapp.com",
  "api.pusher.com",
  "api-eu.pusher.com",
  "ethereal.email",
  "smtp.",
  "rest.ably.io",
  "realtime.ably.io",
];

export const detectLibrary = (defaultLibrary: string, stackLines: string[]) => {
  const libraries = [
    { pattern: "node_modules/axios", name: "axios" },
    { pattern: "node_modules/got", name: "got" },
    { pattern: "node_modules/node-fetch", name: "node-fetch" },
    { pattern: "node_modules/superagent", name: "superagent" },
    { pattern: "node_modules/phin", name: "phin" },
    { pattern: "node_modules/ky", name: "ky" },
    { pattern: "node_modules/needle", name: "needle" },
    { pattern: "node_modules/undici", name: "undici" },
  ];

  for (const line of stackLines) {
    for (const lib of libraries) {
      if (line.includes(lib.pattern)) return lib.name;
    }
  }
  return defaultLibrary;
};

export const shouldSkip = (options: any) => {
  const host = options.hostname || options.host || "";
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "host.docker.internal" ||
    /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(host)
  )
    return true;
  return skipDomains.some((domain) => host.includes(domain));
};

export function patchHttpMethod(
  module: typeof http | typeof https,
  methodName: "request" | "get",
  scheme: "http" | "https",
  filename: string,
) {
  shimmer.wrap(module, methodName, function (original) {
    return function patchedMethod(this: any, ...args: any[]) {
      const start = performance.now();
      const argsCopy = [...args];
      const stack = new Error().stack;
      const stackLines = stack?.split("\n") || [];
      const callerInfo = getCallerInfo(filename);

      try {
        const options = argsCopy.shift() as URL | http.RequestOptions | string;
        const extraOptions =
          typeof argsCopy[0] === "object" &&
          (typeof options === "string" || options instanceof URL)
            ? (argsCopy.shift() as http.RequestOptions)
            : undefined;

        const { optionsParsed, method, origin, pathname } = getRequestInfo(
          options,
          extraOptions,
        );

        if (optionsParsed.agent) delete optionsParsed.agent;
        // @ts-ignore
        if (optionsParsed.nativeProtocols) delete optionsParsed.nativeProtocols;

        if (shouldSkip(optionsParsed)) return original.apply(this, args as any);

        const baseData: HttpClientData = {
          method,
          origin,
          pathname,
          hostname: optionsParsed.hostname ?? undefined,
          port: optionsParsed.port ?? undefined,
          path: optionsParsed.path ?? undefined,
          headers: optionsParsed.headers as Record<string, any> | undefined,
        };

        let request: http.ClientRequest;
        try {
          request = original.apply(this, args as any);
        } catch (error: any) {
          logHttpEntry({
            metadata: {
              package: scheme,
              duration: 0,
              location: { file: callerInfo.file, line: callerInfo.line },
              created_at: timestamp(),
            },
            data: baseData,
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack,
              code: error.code,
            },
          });
          throw error;
        }

        let requestBodyChunks: Buffer[] = [];
        let hasLogged = false;

        request.on("error", (error: any) => {
          if (hasLogged) return;
          hasLogged = true;
          logHttpEntry({
            metadata: {
              package: detectLibrary(
                request.protocol.split(":")[0],
                stackLines,
              ),
              duration: parseFloat((performance.now() - start).toFixed(2)) || 0,
              location: { file: callerInfo.file, line: callerInfo.line },
              created_at: timestamp(),
            },
            data: {
              ...baseData,
              aborted:
                error.name === "AbortError" ||
                request.aborted ||
                error.code === "ABORT_ERR",
            },
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack,
              code: error.code,
            },
          });
        });

        const originalWrite = request.write;
        request.write = function (
          chunk: string | Buffer | Uint8Array,
          ...writeArgs: any[]
        ) {
          if (chunk !== undefined) {
            if (Buffer.isBuffer(chunk)) requestBodyChunks.push(chunk);
            else if (typeof chunk === "string")
              requestBodyChunks.push(Buffer.from(chunk));
            else if (chunk instanceof Uint8Array)
              requestBodyChunks.push(Buffer.from(chunk));
          }
          return originalWrite.apply(this, arguments as any);
        };

        const originalEnd = request.end;
        request.end = function (...endArgs: any[]) {
          if (endArgs.length > 0 && endArgs[0] != null) {
            const chunk = endArgs[0];
            if (Buffer.isBuffer(chunk)) requestBodyChunks.push(chunk);
            else if (typeof chunk === "string")
              requestBodyChunks.push(Buffer.from(chunk));
            else if (chunk instanceof Uint8Array)
              requestBodyChunks.push(Buffer.from(chunk));
          }
          // @ts-ignore
          baseData.isRedirect = request?._redirectable?._isRedirect;
          if (requestBodyChunks.length > 0) {
            const body = Buffer.concat(requestBodyChunks);
            baseData.requestBodySize = body.length;
            baseData.requestBody = body.toString("utf-8");
          }
          return originalEnd.apply(this, arguments as any);
        };

        request.prependListener("response", (res: http.IncomingMessage) => {
          if (hasLogged) return;
          let hasLoggedResponse = false;
          const callbackMap = new WeakMap();
          const chunks: Buffer[] = [];

          try {
            const originalOn = res.on;
            res.on = new Proxy(originalOn, {
              apply: (target, thisArg, args: any[]) => {
                const [event, listener, ...restArgs] = args;

                if (event === "data") {
                  const wrappedListener = new Proxy(listener, {
                    apply: (t, tArg, a: any[]) => {
                      if (!hasLoggedResponse) {
                        const chunk = a[0];
                        try {
                          if (
                            Buffer.isBuffer(chunk) &&
                            Buffer.concat(chunks).length < MAX_BODY_SIZE
                          )
                            chunks.push(chunk);
                          else if (typeof chunk === "string")
                            chunks.push(Buffer.from(chunk));
                        } catch {}
                      }
                      return Reflect.apply(t, tArg, a);
                    },
                  });
                  callbackMap.set(listener, wrappedListener);
                  return Reflect.apply(target, thisArg, [
                    event,
                    wrappedListener,
                    ...restArgs,
                  ]);
                }

                if (event === "end") {
                  const wrappedListener = new Proxy(listener, {
                    apply: (t, tArg, a: any[]) => {
                      if (!hasLoggedResponse) {
                        const contentEncoding = res.headers["content-encoding"];
                        try {
                          const responseBody = Buffer.concat(chunks);
                          const responseText =
                            contentEncoding === "gzip"
                              ? zlib.gunzipSync(responseBody).toString("utf-8")
                              : responseBody.toString("utf-8");

                          logHttpEntry({
                            metadata: {
                              package: detectLibrary(
                                request.protocol.split(":")[0],
                                stackLines,
                              ),
                              duration:
                                parseFloat(
                                  (performance.now() - start).toFixed(2),
                                ) || 0,
                              location: {
                                file: callerInfo.file,
                                line: callerInfo.line,
                              },
                              created_at: timestamp(),
                            },
                            data: {
                              ...baseData,
                              responseBodySize: responseBody.length,
                              responseBody: responseText,
                              statusCode: res.statusCode,
                              statusMessage: res.statusMessage,
                              headers: res.headers,
                              isMedia: /image|video|audio/.test(
                                res.headers["content-type"] || "",
                              ),
                              redirectFrom: res.headers[
                                "x-previous-redirect-url"
                              ] as string | undefined,
                              aborted: false,
                            },
                          });
                          hasLoggedResponse = true;
                        } catch {}
                      }
                      return Reflect.apply(t, tArg, a);
                    },
                  });
                  callbackMap.set(listener, wrappedListener);
                  return Reflect.apply(target, thisArg, [
                    event,
                    wrappedListener,
                    ...restArgs,
                  ]);
                }

                return Reflect.apply(target, thisArg, args);
              },
            });

            const patchRemove = (orig: Function) =>
              new Proxy(orig, {
                apply: (target, thisArg, args: any[]) => {
                  const [event, listener] = args;
                  const wrapped = callbackMap.get(listener);
                  if (wrapped) {
                    callbackMap.delete(listener);
                    return Reflect.apply(target, thisArg, [event, wrapped]);
                  }
                  return Reflect.apply(target, thisArg, args);
                },
              });

            if (typeof res.removeListener === "function")
              res.removeListener = patchRemove(res.removeListener) as any;
            if (typeof res.off === "function" && res.off !== res.removeListener)
              res.off = patchRemove(res.off) as any;

            const originalAddListener = res.addListener || res.on;
            if (
              typeof res.listenerCount === "function" &&
              res.listenerCount("end") === 0
            ) {
              originalAddListener.call(res, "end", function () {
                try {
                  const responseBody = Buffer.concat(chunks);
                  logHttpEntry({
                    metadata: {
                      package: detectLibrary(
                        request.protocol.split(":")[0],
                        stackLines,
                      ),
                      duration:
                        parseFloat((performance.now() - start).toFixed(2)) || 0,
                      location: {
                        file: callerInfo.file,
                        line: callerInfo.line,
                      },
                      created_at: timestamp(),
                    },
                    data: {
                      ...baseData,
                      responseBodySize: responseBody.length,
                      statusCode: res.statusCode,
                      statusMessage: res.statusMessage,
                      headers: res.headers,
                    },
                  });
                  hasLoggedResponse = true;
                } catch {}
              });
            }
          } catch {}
        });

        return request;
      } catch (error: any) {
        logHttpEntry({
          metadata: {
            package: scheme,
            duration: 0,
            location: { file: callerInfo.file, line: callerInfo.line },
            created_at: timestamp(),
          },
          data: {},
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: error.code,
          },
        });
        throw error;
      }
    };
  });
}

export function patchServerEmit(module: typeof http | typeof https) {
  shimmer.wrap(module.Server.prototype, "emit", function (original) {
    return function patchedEmit(
      this: unknown,
      event: string,
      ...args: unknown[]
    ) {
      if (event === "request") {
        const req = args[0] as http.IncomingMessage;
        const res = args[1] as http.ServerResponse;

        if (req && res) {
          const startTime = performance.now();
          const ipAddress =
            (req as { ip?: string }).ip || req.socket?.remoteAddress;
          const normalizedRequest = httpRequestToRequestData(req);

          const originalEnd = res.end;
          res.end = function (...endArgs: any[]) {
            try {
              watchers.requests.insertRedisStream({
                metadata: {
                  package: "http",
                  duration: parseFloat(
                    (performance.now() - startTime).toFixed(2),
                  ),
                  location: { file: "http-server", line: "0" },
                  created_at: timestamp(),
                },
                data: {
                  ...normalizedRequest,
                  statusCode: res.statusCode,
                  ipAddress,
                },
              });
            } catch {}
            return originalEnd.apply(this, endArgs as any);
          };
        }
      }
      return original.apply(this, [event, ...args] as any);
    };
  });
}

export function applyHttpPatches(filename: string) {
  patchHttpMethod(http, "request", "http", filename);
  patchHttpMethod(http, "get", "http", filename);
  patchHttpMethod(https, "request", "https", filename);
  patchHttpMethod(https, "get", "https", filename);
}
