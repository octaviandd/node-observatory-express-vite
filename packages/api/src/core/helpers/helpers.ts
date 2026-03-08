import { PERIODS } from "./constants.js";
import type { RequestOptions } from "node:http";
import * as url from "url";
import {createRequire} from "module";

export function resolvePackagePath(packageName: string, metaUrl?: string): string {
  if (typeof require === 'undefined') {
    const require = createRequire(metaUrl!);
    return require.resolve(packageName);
  }
  return require.resolve(packageName);
}

/**
 * The format for values that indicate entries for each watcher.
 * @param value 
 * @param isCount 
 * @returns 
 */
export const formatValue = (value: string | number | null, isCount = false): string => {
  if (!value || value === null) return "0" + (isCount ? "" : "ms");
  
  const num = parseFloat(value.toString());
  
  if (isNaN(num) || num === 0) return "0" + (isCount ? "" : "ms");
  
  if (num > 999) {
    return `${(num / 1000).toFixed(2)}${isCount ? "K" : "s"}`;
  }
  
  const formatted = num % 1 === 0 ? num.toString() : num.toFixed(2);
  return `${formatted}${isCount ? "" : "ms"}`;
};

/**
 * Turns [] into {} with each [index] as {[index]}
 * @param items 
 * @returns 
 */

export const groupItemsByType = <T extends { type: string }>(items: T[]): Partial<Record<string, T[]>> => {
  return items.reduce((acc, item) => {
    const key = item.type;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key]!.push(item);
    return acc;
  }, {} as Record<string, T[]>);
};

export function httpRequestToRequestData(request: {
  method?: string;
  url?: string;
  headers?: {
    [key: string]: string | string[] | undefined;
  };
  protocol?: string;
  socket?: {
    encrypted?: boolean;
    remoteAddress?: string;
  };
}): any {
  const headers = request.headers || {};
  const host = typeof headers.host === "string" ? headers.host : undefined;
  const protocol =
    request.protocol || (request.socket?.encrypted ? "https" : "http");
  const url = request.url || "";

  const absoluteUrl = getAbsoluteUrl({
    url,
    host,
    protocol,
  });

  // This is non-standard, but may be sometimes set
  // It may be overwritten later by our own body handling
  const data = (request as any).body || undefined;

  // This is non-standard, but may be set on e.g. Next.js or Express requests
  const cookies = (request as any).cookies;

  return dropUndefinedKeys({
    url: absoluteUrl,
    method: request.method || "GET",
    query_string: extractQueryParamsFromUrl(url),
    headers: Object.fromEntries(
      Object.entries(headers).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.join(", ") : value,
      ]),
    ),
    cookies,
    data,
  });
}

/**
 * Cleans the request from values that can't be added to redis because of circularity or size.
 * @param content 
 * @returns 
 */
export const sanitizeContent = <T>(content: T): T => {
  const seen = new WeakSet();

  const sanitize = (obj: any): any => {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }

    if (obj instanceof Date) {
      return obj.toISOString();
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => sanitize(item));
    }

    if (seen.has(obj)) {
      return "[Circular Reference]";
    }

    seen.add(obj);

    // Create new object to hold sanitized values
    const sanitized: { [key: string]: any } = {};

    // Process each property
    for (const [key, value] of Object.entries(obj)) {
      try {
        // Skip functions
        if (typeof value === "function") {
          continue;
        }
        // Recursively sanitize value
        sanitized[key] = sanitize(value);
      } catch (error: any) {
        // If any error occurs while processing a property, replace with error message
        sanitized[key] = `[Error: ${error.message}]`;
      }
    }

    return sanitized;
  };

  // Start sanitization from the root object
  return sanitize(content);
}

export const processedDurationGraphData = (data: any[], period: string) => {
  const totalDuration = PERIODS[period].duration; // in minutes
  const slotsCount = 120; // how many time slots (bars) we want
  const intervalDuration = totalDuration / slotsCount; // each slot in minutes

  const now = Date.now(); // current timestamp (ms)
  const startDate = now - totalDuration * 60 * 1000; // start time (ms)

  const groupedData = Array.from({ length: slotsCount }, (_, index) => ({
    durations: [] as number[],
    avgDuration: 0,
    p95: 0,
    count: 0,
    label: getLabel(index, period),
  }));

  data.forEach((entry: any) => {
    console.log(entry)
    const createdAt = new Date(entry.created_at).getTime();
    // duration lives at the top level of the BaseLogEntry stored in content
    const duration = parseFloat(entry.content?.duration);

    // Figure out which interval slot this request belongs to
    const intervalIndex = Math.floor(
      (createdAt - startDate) / (intervalDuration * 60 * 1000),
    );

    if (intervalIndex >= 0 && intervalIndex < slotsCount && !isNaN(duration)) {
      groupedData[intervalIndex].durations.push(duration);
    }
  });

  groupedData.forEach((slot) => {
    const len = slot.durations.length;
    if (len > 0) {
      slot.durations.sort((a, b) => a - b);
      slot.count = len;

      const sum = slot.durations.reduce((acc, val) => acc + val, 0);
      slot.avgDuration = parseFloat((sum / len).toFixed(2));

      const p95Index = Math.floor(0.95 * len);
      slot.p95 = slot.durations[p95Index];
    }
  });

  return groupedData;
}

/**
 * Extracts a 0/1 metric value from a BaseLogEntry-shaped content object
 * for the given graph metric key. Handles all watcher type patterns:
 *
 *  - status keys:     "completed" | "failed"        → content.status
 *  - cache data keys: "hits" | "misses" | "writes"  → content.data[key] > 0
 *  - HTTP status:     "count_200/400/500"            → content.data.statusCode ranges
 *  - log levels:      "error" | "warning" | "info" … → content.metadata.level
 *  - exception types: "unhandledRejection" | "uncaughtException" → content.metadata.type
 */
function getMetricValue(content: any, key: string): number {
  if (!content) return 0;

  // Status-based keys (query, notification, mail, schedule, view, model, job)
  if (key === "completed" || key === "failed" || key === "released") {
    return content.status === key ? 1 : 0;
  }

  // Cache data keys (cache, also used by job config currently)
  if (key === "hits" || key === "misses" || key === "writes") {
    const val = content.data?.[key];
    return val !== undefined && val !== null && val > 0 ? 1 : 0;
  }

  // HTTP status-code range keys (request, http)
  if (key === "count_200") {
    const code = content.data?.statusCode;
    return code !== undefined && code >= 200 && code < 400 ? 1 : 0;
  }
  if (key === "count_400") {
    const code = content.data?.statusCode;
    return code !== undefined && code >= 400 && code < 500 ? 1 : 0;
  }
  if (key === "count_500") {
    const code = content.data?.statusCode;
    return code !== undefined && code >= 500 ? 1 : 0;
  }

  // Log-level keys (log)
  if (["error", "warning", "warn", "info", "debug", "trace", "fatal", "log", "verbose", "silly"].includes(key)) {
    const level = content.metadata?.level;
    // The config uses "warning" but patchers store "warn"
    if (key === "warning") return level === "warn" ? 1 : 0;
    return level === key ? 1 : 0;
  }

  // Exception-type keys (exception)
  if (key === "unhandledRejection" || key === "uncaughtException") {
    return content.metadata?.type === key ? 1 : 0;
  }

  // Fallback: check top-level, then nested data
  if (content[key]) return 1;
  if (content.data?.[key]) return 1;
  return 0;
}

export const processedCountGraphData = <T extends readonly string[]>
  (data: any[], period: string, keys: T): Array<Record<T[number], number> & { label: string }> => {
  const totalDuration = PERIODS[period].duration;
  const intervalDuration = totalDuration / 120;
  const now = new Date().getTime();
  const startDate = now - totalDuration * 60 * 1000;

  const initializeKeys = (): Record<string, number> => {
    let obj: Record<string, number> = {};
    keys.forEach(key => obj[key] = 0);
    
    return obj;
  }

  const groupedData = Array.from({ length: 120 }, (_, index) => ({
    ...initializeKeys(),
    label: getLabel(index, period),
  }) as Record<T[number], number> & {label: string});

  data.forEach((row: any) => {
    const createdAt = new Date(row.created_at).getTime();
    const intervalIndex = Math.floor((createdAt - startDate) / (intervalDuration * 60 * 1000));

    if (intervalIndex >= 0 && intervalIndex < 120) {
      const content = row.content;
      keys.forEach((key: T[number]) => {
        (groupedData[intervalIndex] as any)[key] += getMetricValue(content, key);
      })
    }
  });

  return groupedData;
}

export const isPackageInstalled = (npmPackage: string) => {
  try {
    require.resolve(npmPackage);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Parse headers from a string
 * @param headersString
 * @returns @Object
 */
export const parseHeaders = <T extends Record<string, string>>(
  headersString: string,
): { method: string; path: string; version: string; headers: T } => {
  const [startLine, ...headerLines] = headersString.split("\r\n");

  // Parse the start line (HTTP method, path, version)
  const [method, path, version] = startLine.split(" ");

  // Parse the headers
  const headers = {} as T;
  headerLines.forEach((line) => {
    const [key, value] = line.split(": ");
    if (key && value) {
      headers[key as keyof T] = value as unknown as T[keyof T];
    }
  });

  return {
    method,
    path,
    version,
    headers,
  };
};

/**
 * Extracts file name and line number from the stack trace.
 * @param stackLines - Array of stack trace lines.
 * @returns Object containing file and line information.
 */
export function getCallerInfo(filename: string) {
  if (!process.env.NODE_OBSERVATORY_ERROR_TRACING) {
    return { file: "unknown", line: "unknown" };
  }

  const originalErrorStackLimit = Error.stackTraceLimit;
  Error.stackTraceLimit = 100;
  const stack = new Error().stack;
  const stackLines = stack?.split("\n") || [];

  for (const line of stackLines) {
    if (
      !line.includes("node_modules") &&
      !line.includes(filename) && // Exclude this patch file dynamically
      !line.includes("Namespace") &&
      !line.includes("node:async_hooks")
    ) {
      const match =
        line.match(/\((.*):(\d+):(\d+)\)/) || line.match(/at (.*):(\d+):(\d+)/);
      if (match) {
        return {
          file: match[1],
          line: match[2],
        };
      }
    }
  }
  Error.stackTraceLimit = originalErrorStackLimit;
  return { file: "unknown", line: "unknown" };
}

/**
 * Makes sure options is an url object
 * return an object with default value and parsed options
 * @param options original options for the request
 * @param [extraOptions] additional options for the request
 */
export const getRequestInfo = (
  options: url.URL | RequestOptions | string,
  extraOptions?: RequestOptions,
): {
  origin: string;
  pathname: string;
  method: string;
  invalidUrl: boolean;
  optionsParsed: RequestOptions;
} => {
  let pathname: string;
  let origin: string;
  let optionsParsed: RequestOptions;
  let invalidUrl = false;
  if (typeof options === "string") {
    try {
      const convertedOptions = stringUrlToHttpOptions(options);
      optionsParsed = convertedOptions;
      pathname = convertedOptions.pathname || "/";
    } catch (e) {
      invalidUrl = true;
      // for backward compatibility with how url.parse() behaved.
      optionsParsed = {
        path: options,
      };
      pathname = optionsParsed.path || "/";
    }

    origin = `${optionsParsed.protocol || "http:"}//${optionsParsed.host}`;
    if (extraOptions !== undefined) {
      Object.assign(optionsParsed, extraOptions);
    }
  } else if (options instanceof url.URL) {
    optionsParsed = {
      protocol: options.protocol,
      hostname:
        typeof options.hostname === "string" && options.hostname.startsWith("[")
          ? options.hostname.slice(1, -1)
          : options.hostname,
      path: `${options.pathname || ""}${options.search || ""}`,
    };
    if (options.port !== "") {
      optionsParsed.port = Number(options.port);
    }
    if (options.username || options.password) {
      optionsParsed.auth = `${options.username}:${options.password}`;
    }
    pathname = options.pathname;
    origin = options.origin;
    if (extraOptions !== undefined) {
      Object.assign(optionsParsed, extraOptions);
    }
  } else {
    optionsParsed = Object.assign(
      { protocol: options.host ? "http:" : undefined },
      options,
    );

    const hostname =
      optionsParsed.host ||
      (optionsParsed.port != null
        ? `${optionsParsed.hostname}${optionsParsed.port}`
        : optionsParsed.hostname);
    origin = `${optionsParsed.protocol || "http:"}//${hostname}`;

    pathname = (options as url.URL).pathname;
    if (!pathname && optionsParsed.path) {
      try {
        const parsedUrl = new URL(optionsParsed.path, origin);
        pathname = parsedUrl.pathname || "/";
      } catch (e) {
        pathname = "/";
      }
    }
  }

  // some packages return method in lowercase..
  // ensure upperCase for consistency
  const method = optionsParsed.method
    ? optionsParsed.method.toUpperCase()
    : "GET";

  return { origin, pathname, method, optionsParsed, invalidUrl };
};



export const getLabel = (index: number, period: string) =>  {
  const totalDuration = PERIODS[period].duration;
  const intervalDuration = totalDuration / 120; // Duration of each bar in minutes

  let timeAgo = 0;
  let config = {};

  switch (period) {
    case '1h':
      timeAgo = new Date().getTime() - 60 * 60 * 1000;
      config = { minute: "2-digit", second: "2-digit" }
      break;
    case '24h':
      timeAgo = new Date().getTime() - 24 * 60 * 60 * 1000;
      config = { minute: "2-digit", second: "2-digit" }
      break
    case '7d':
      timeAgo = new Date().getTime() - 7 * 24 * 60 * 60 * 1000;
      config = { minute: "2-digit", second: "2-digit", weekday: 'short' }
      break
    case '14d':
      timeAgo = new Date().getTime() - 14 * 24 * 60 * 60 * 1000;
      config = { minute: "2-digit", second: "2-digit", weekday: 'short' }
      break
    case '30d':
      timeAgo = new Date().getTime() - 30 * 24 * 60 * 60 * 1000;
      config = { minute: "2-digit", second: "2-digit", weekday: 'short' }
      break
    default:
      break
  }

  const interval = timeAgo + index * intervalDuration * 60 * 1000;
  const startTime = new Date(interval).toLocaleTimeString("en-US", config);
  const endTime = new Date(interval + intervalDuration * 60 * 1000).toLocaleTimeString("en-US", config);
  return `${startTime} - ${endTime}`
}

export function dropUndefinedKeys<T>(inputValue: T): T {
  // This map keeps track of what already visited nodes map to.
  // Our Set - based memoBuilder doesn't work here because we want to the output object to have the same circular
  // references as the input object.
  const memoizationMap = new Map<unknown, unknown>();

  // This function just proxies `_dropUndefinedKeys` to keep the `memoBuilder` out of this function's API
  return _dropUndefinedKeys(inputValue, memoizationMap);
}

function isPojo(input: unknown): input is Record<string, unknown> {
  if (input === null || typeof input !== "object") {
    return false;
  }

  try {
    const name = (
      Object.getPrototypeOf(input) as { constructor: { name: string } }
    ).constructor.name;
    return !name || name === "Object";
  } catch {
    return true;
  }
}

function _dropUndefinedKeys<T>(
  inputValue: T,
  memoizationMap: Map<unknown, unknown>,
): T {
  if (isPojo(inputValue)) {
    // If this node has already been visited due to a circular reference, return the object it was mapped to in the new object
    const memoVal = memoizationMap.get(inputValue);
    if (memoVal !== undefined) {
      return memoVal as T;
    }

    const returnValue: { [key: string]: unknown } = {};
    // Store the mapping of this value in case we visit it again, in case of circular data
    memoizationMap.set(inputValue, returnValue);

    for (const key of Object.getOwnPropertyNames(inputValue)) {
      if (typeof inputValue[key] !== "undefined") {
        returnValue[key] = _dropUndefinedKeys(inputValue[key], memoizationMap);
      }
    }

    return returnValue as T;
  }

  if (Array.isArray(inputValue)) {
    // If this node has already been visited due to a circular reference, return the array it was mapped to in the new object
    const memoVal = memoizationMap.get(inputValue);
    if (memoVal !== undefined) {
      return memoVal as T;
    }

    const returnValue: unknown[] = [];
    // Store the mapping of this value in case we visit it again, in case of circular data
    memoizationMap.set(inputValue, returnValue);

    inputValue.forEach((item: unknown) => {
      returnValue.push(_dropUndefinedKeys(item, memoizationMap));
    });

    return returnValue as unknown as T;
  }

  return inputValue;
}

function getAbsoluteUrl({
  url,
  protocol,
  host,
}: {
  url?: string;
  protocol: string;
  host?: string;
}): string | undefined {
  if (url?.startsWith("http")) {
    return url;
  }

  if (url && host) {
    return `${protocol}://${host}${url}`;
  }

  return undefined;
}

/** Extract the query params from an URL. */
export function extractQueryParamsFromUrl(url: string): string | undefined {
  // url is path and query string
  if (!url) {
    return;
  }

  try {
    // The `URL` constructor can't handle internal URLs of the form `/some/path/here`, so stick a dummy protocol and
    // hostname as the base. Since the point here is just to grab the query string, it doesn't matter what we use.
    const queryParams = new URL(url, "http://s.io").search.slice(1);
    return queryParams.length ? queryParams : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Mimics Node.js conversion of URL strings to RequestOptions expected by
 * `http.request` and `https.request` APIs.
 *
 * See https://github.com/nodejs/node/blob/2505e217bba05fc581b572c685c5cf280a16c5a3/lib/internal/url.js#L1415-L1437
 *
 * @param stringUrl
 * @throws TypeError if the URL is not valid.
 */
function stringUrlToHttpOptions(
  stringUrl: string,
): RequestOptions & { pathname: string } {
  // This is heavily inspired by Node.js handling of the same situation, trying
  // to follow it as closely as possible while keeping in mind that we only
  // deal with string URLs, not URL objects.
  const {
    hostname,
    pathname,
    port,
    username,
    password,
    search,
    protocol,
    hash,
    href,
    origin,
    host,
  } = new URL(stringUrl);

  const options: RequestOptions & {
    pathname: string;
    hash: string;
    search: string;
    href: string;
    origin: string;
  } = {
    protocol: protocol,
    hostname:
      hostname && hostname[0] === "[" ? hostname.slice(1, -1) : hostname,
    hash: hash,
    search: search,
    pathname: pathname,
    path: `${pathname || ""}${search || ""}`,
    href: href,
    origin: origin,
    host: host,
  };
  if (port !== "") {
    options.port = Number(port);
  }
  if (username || password) {
    options.auth = `${decodeURIComponent(username)}:${decodeURIComponent(password)}`;
  }
  return options;
}

/**
 * Standardizes HTTP request data from various libraries to conform to the HttpRequestData interface
 * This ensures consistent data structure regardless of which HTTP client library was used
 *
 * @param data The raw HTTP request data from any supported library
 * @returns A standardized HttpRequestData object
 */
// export function standardizeHttpRequestData(data: any): HttpRequestData {
//   // Ensure all required fields are present
//   const standardized: HttpRequestData = {
//     // Required fields with fallbacks
//     method: (data.method || "GET").toUpperCase(),
//     origin: data.origin || "",
//     pathname: data.pathname || data.path || "/",
//     protocol: data.protocol || "http:",
//     statusCode: data.statusCode || 0,
//     statusMessage: data.statusMessage || "",
//     duration: data.duration || 0,
//     aborted: data.aborted || false,
//     headers: data.headers || {},
//     responseBody: data.responseBody || "",
//     responseBodySize: data.responseBodySize || 0,
//     isMedia: data.isMedia || false,
//     library: data.library || "unknown",
//     file: data.file || "",
//     line: data.line || "",
//     ...data,
//   };

//   // Normalize hostname/host
//   if (!standardized.hostname && standardized.host) {
//     standardized.hostname = standardized.host;
//   } else if (!standardized.host && standardized.hostname) {
//     standardized.host = standardized.hostname;
//   }

//   // Normalize path/pathname
//   if (!standardized.path && standardized.pathname) {
//     standardized.path = standardized.pathname;
//   }

//   // Ensure responseBody is properly handled
//   if (
//     standardized.responseBody &&
//     typeof standardized.responseBody !== "string" &&
//     !(standardized.responseBody instanceof Buffer)
//   ) {
//     try {
//       // Try to stringify if it's an object
//       standardized.responseBody = JSON.stringify(standardized.responseBody);
//     } catch (error) {
//       // If stringification fails, convert to string
//       standardized.responseBody = String(standardized.responseBody);
//     }
//   }

//   // Calculate responseBodySize if not provided
//   if (!standardized.responseBodySize && standardized.responseBody) {
//     if (typeof standardized.responseBody === "string") {
//       standardized.responseBodySize = Buffer.byteLength(
//         standardized.responseBody,
//       );
//     } else if (standardized.responseBody instanceof Buffer) {
//       standardized.responseBodySize = standardized.responseBody.length;
//     }
//   }

//   standardized.fullUrl = `${standardized.origin}${standardized.pathname}`;

//   // Remove undefined values
//   return dropUndefinedKeys(standardized);
// }

// /**
//  * Extracts the most important information from HTTP request data for display
//  * This is useful for creating summaries or table views of HTTP requests
//  *
//  * @param data The standardized HTTP request data
//  * @returns An object with the most relevant fields for display
//  */
// export function extractHttpDisplayData(data: HttpRequestData): {
//   id?: string;
//   method: string;
//   url: string;
//   statusCode: number;
//   duration: number;
//   size: number;
//   library: string;
//   timestamp?: string;
// } {
//   // Create the full URL from components
//   const url = `${data.origin}${data.pathname}`;

//   return {
//     id: data.uuid,
//     method: data.method,
//     url: url,
//     statusCode: data.statusCode,
//     duration: data.duration ?? 0,
//     size: data.responseBodySize,
//     library: data.library,
//     timestamp: data.created_at
//       ? new Date(data.created_at).toISOString()
//       : undefined,
//   };
// }
