// /**
//  * Helper Functions Integration Tests
//  *
//  * These tests verify the helper utility functions work correctly
//  * for data transformation, formatting, and processing.
//  *
//  * @format
//  */

// import {
//   formatValue,
//   groupItemsByType,
//   dropUndefinedKeys,
//   sanitizeContent,
//   processedDurationGraphData,
//   processedCountGraphData,
//   getCallerInfo,
//   parseHeaders,
//   getRequestInfo,
//   standardizeHttpRequestData,
//   extractHttpDisplayData,
//   extractQueryParamsFromUrl,
// } from "../../src/core/helpers/helpers";

// describe("Helper Functions Integration Tests", () => {
//   describe("formatValue", () => {
//     describe("count formatting", () => {
//       it('should format zero as "0"', () => {
//         expect(formatValue(0, true)).toBe("0");
//         expect(formatValue(null, true)).toBe("0");
//       });

//       it("should format small numbers without suffix", () => {
//         expect(formatValue(100, true)).toBe("100");
//         expect(formatValue(999, true)).toBe("999");
//       });

//       it("should format thousands with K suffix", () => {
//         expect(formatValue(1000, true)).toBe("1.00K");
//         expect(formatValue(1500, true)).toBe("1.50K");
//         expect(formatValue(10000, true)).toBe("10.00K");
//       });

//       it("should format millions with K suffix (thousands)", () => {
//         expect(formatValue(1000000, true)).toBe("1000.00K");
//       });
//     });

//     describe("duration formatting", () => {
//       it('should format zero as "0ms"', () => {
//         expect(formatValue(0, false)).toBe("0ms");
//         expect(formatValue(null, false)).toBe("0ms");
//       });

//       it("should format milliseconds", () => {
//         expect(formatValue(100, false)).toBe("100ms");
//         expect(formatValue(999, false)).toBe("999ms");
//       });

//       it("should format seconds", () => {
//         expect(formatValue(1000, false)).toBe("1.00s");
//         expect(formatValue(1500, false)).toBe("1.50s");
//         expect(formatValue(5000, false)).toBe("5.00s");
//       });
//     });
//   });

//   describe("groupItemsByType", () => {
//     it("should group items by type property", () => {
//       const items = [
//         { type: "request", uuid: "1" },
//         { type: "log", uuid: "2" },
//         { type: "request", uuid: "3" },
//         { type: "cache", uuid: "4" },
//         { type: "log", uuid: "5" },
//       ];

//       const grouped = groupItemsByType(items);

//       expect(grouped.request).toHaveLength(2);
//       expect(grouped.log).toHaveLength(2);
//       expect(grouped.cache).toHaveLength(1);
//     });

//     it("should handle empty array", () => {
//       const grouped = groupItemsByType([]);
//       expect(grouped).toEqual({});
//     });

//     it("should handle single type", () => {
//       const items = [
//         { type: "request", uuid: "1" },
//         { type: "request", uuid: "2" },
//       ];

//       const grouped = groupItemsByType(items);

//       expect(Object.keys(grouped)).toHaveLength(1);
//       expect(grouped.request).toHaveLength(2);
//     });

//     it("should preserve item properties", () => {
//       const items = [
//         { type: "request", uuid: "1", content: { route: "/api" }, extra: true },
//       ];

//       const grouped = groupItemsByType(items);

//       expect(grouped.request![0]).toEqual({
//         type: "request",
//         uuid: "1",
//         content: { route: "/api" },
//         extra: true,
//       });
//     });
//   });

//   describe("dropUndefinedKeys", () => {
//     it("should remove undefined values from object", () => {
//       const input = {
//         defined: "value",
//         undef: undefined,
//         nullVal: null,
//         zero: 0,
//         empty: "",
//       };

//       const result = dropUndefinedKeys(input);

//       expect(result).toEqual({
//         defined: "value",
//         nullVal: null,
//         zero: 0,
//         empty: "",
//       });
//       expect("undef" in result).toBe(false);
//     });

//     it("should handle nested objects", () => {
//       const input = {
//         outer: {
//           defined: "value",
//           undef: undefined,
//         },
//         topLevel: "here",
//       };

//       const result = dropUndefinedKeys(input);

//       expect(result.outer).toEqual({ defined: "value" });
//       expect("undef" in (result.outer as any)).toBe(false);
//     });

//     it("should handle arrays", () => {
//       const input = {
//         items: [
//           { id: 1, undef: undefined },
//           { id: 2, value: "test" },
//         ],
//       };

//       const result = dropUndefinedKeys(input);

//       expect(result.items).toEqual([{ id: 1 }, { id: 2, value: "test" }]);
//     });

//     it("should handle circular references", () => {
//       const obj: any = { name: "test" };
//       obj.self = obj;

//       // Should not throw
//       const result = dropUndefinedKeys(obj);
//       expect(result.name).toBe("test");
//       expect(result.self).toBe(result); // Same circular reference
//     });
//   });

//   describe("sanitizeContent", () => {
//     it("should handle primitive values", () => {
//       expect(sanitizeContent("string")).toBe("string");
//       expect(sanitizeContent(123)).toBe(123);
//       expect(sanitizeContent(true)).toBe(true);
//       expect(sanitizeContent(null)).toBe(null);
//     });

//     it("should convert Date to ISO string", () => {
//       const date = new Date("2025-01-01T00:00:00.000Z");
//       const result = sanitizeContent({ date });
//       expect(result.date).toBe("2025-01-01T00:00:00.000Z");
//     });

//     it("should handle nested objects", () => {
//       const input = {
//         outer: {
//           inner: {
//             value: "test",
//           },
//         },
//       };

//       const result = sanitizeContent(input);
//       expect(result.outer.inner.value).toBe("test");
//     });

//     it("should handle arrays", () => {
//       const input = {
//         items: [1, 2, { nested: true }],
//       };

//       const result = sanitizeContent(input);
//       expect(result.items).toEqual([1, 2, { nested: true }]);
//     });

//     it("should handle circular references", () => {
//       const obj: any = { name: "test" };
//       obj.circular = obj;

//       const result = sanitizeContent(obj);
//       expect(result.name).toBe("test");
//       expect(result.circular).toBe("[Circular Reference]");
//     });

//     it("should skip function properties", () => {
//       const input = {
//         name: "test",
//         method: () => {},
//       };

//       const result = sanitizeContent(input);
//       expect(result.name).toBe("test");
//       expect("method" in result).toBe(false);
//     });
//   });

//   describe("processedDurationGraphData", () => {
//     it("should create 120 time slots", () => {
//       const data: any[] = [];
//       const result = processedDurationGraphData(data, "24h");
//       expect(result).toHaveLength(120);
//     });

//     it("should calculate averages for each slot", () => {
//       const now = new Date();
//       const data = [
//         { created_at: now, content: { duration: 100 } },
//         { created_at: now, content: { duration: 200 } },
//         { created_at: now, content: { duration: 300 } },
//       ];

//       const result = processedDurationGraphData(data, "1h");

//       // Find the slot with data
//       const slotWithData = result.find((slot) => slot.count > 0);

//       if (slotWithData) {
//         expect(slotWithData.avgDuration).toBe(200);
//         expect(slotWithData.count).toBe(3);
//       }
//     });

//     it("should calculate p95 for each slot", () => {
//       const now = new Date();
//       const durations = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
//       const data = durations.map((d) => ({
//         created_at: now,
//         content: { duration: d },
//       }));

//       const result = processedDurationGraphData(data, "1h");

//       const slotWithData = result.find((slot) => slot.count > 0);
//       if (slotWithData) {
//         expect(slotWithData.p95).toBeGreaterThan(0);
//       }
//     });

//     it("should handle different period values", () => {
//       const data: any[] = [];

//       ["1h", "24h", "7d", "14d", "30d"].forEach((period) => {
//         const result = processedDurationGraphData(data, period);
//         expect(result).toHaveLength(120);
//         result.forEach((slot) => {
//           expect(slot).toHaveProperty("label");
//           expect(slot).toHaveProperty("avgDuration");
//           expect(slot).toHaveProperty("p95");
//           expect(slot).toHaveProperty("count");
//         });
//       });
//     });
//   });

//   describe("processedCountGraphData", () => {
//     it("should create 120 time slots with specified keys", () => {
//       const data: any[] = [];
//       const keys = ["hits", "misses", "writes"] as const;

//       const result = processedCountGraphData(data, "24h", keys);

//       expect(result).toHaveLength(120);
//       result.forEach((slot) => {
//         expect(slot).toHaveProperty("hits");
//         expect(slot).toHaveProperty("misses");
//         expect(slot).toHaveProperty("writes");
//         expect(slot).toHaveProperty("label");
//       });
//     });

//     it("should count occurrences per key", () => {
//       const now = new Date();
//       const data = [
//         { created_at: now, content: { hits: 1, misses: 0, writes: 0 } },
//         { created_at: now, content: { hits: 1, misses: 0, writes: 0 } },
//         { created_at: now, content: { hits: 0, misses: 1, writes: 0 } },
//       ] as any;

//       const keys = ["hits", "misses", "writes"] as const;
//       const result = processedCountGraphData(data, "1h", keys);

//       // Find slot with data
//       const totalHits = result.reduce((sum, slot) => sum + slot.hits, 0);
//       const totalMisses = result.reduce((sum, slot) => sum + slot.misses, 0);

//       expect(totalHits).toBe(2);
//       expect(totalMisses).toBe(1);
//     });
//   });

//   describe("parseHeaders", () => {
//     it("should parse HTTP headers string", () => {
//       const headersString =
//         "GET /api/users HTTP/1.1\r\nHost: localhost:3000\r\nContent-Type: application/json";

//       const result = parseHeaders(headersString);

//       expect(result.method).toBe("GET");
//       expect(result.path).toBe("/api/users");
//       expect(result.version).toBe("HTTP/1.1");
//       expect(result.headers.Host).toBe("localhost:3000");
//       expect(result.headers["Content-Type"]).toBe("application/json");
//     });

//     it("should handle POST requests", () => {
//       const headersString = "POST /api/data HTTP/1.1\r\nContent-Length: 123";

//       const result = parseHeaders(headersString);

//       expect(result.method).toBe("POST");
//       expect(result.path).toBe("/api/data");
//     });
//   });

//   describe("getRequestInfo", () => {
//     it("should parse string URL", () => {
//       const result = getRequestInfo("https://api.example.com/users?id=1");

//       expect(result.origin).toContain("api.example.com");
//       expect(result.pathname).toBe("/users");
//       expect(result.method).toBe("GET");
//       expect(result.invalidUrl).toBe(false);
//     });

//     it("should parse URL object", () => {
//       const url = new URL("https://api.example.com/posts/123");
//       const result = getRequestInfo(url);

//       expect(result.origin).toBe("https://api.example.com");
//       expect(result.pathname).toBe("/posts/123");
//     });

//     it("should parse options object", () => {
//       const options = {
//         hostname: "api.example.com",
//         path: "/data",
//         method: "POST",
//       };

//       const result = getRequestInfo(options);

//       expect(result.method).toBe("POST");
//       expect(result.pathname).toBe("/data");
//     });

//     it("should handle extra options", () => {
//       const url = "https://api.example.com/users";
//       const extraOptions = { method: "POST", headers: { "X-Custom": "value" } };

//       const result = getRequestInfo(url, extraOptions);

//       expect(result.method).toBe("POST");
//       expect(result.optionsParsed.headers).toEqual({ "X-Custom": "value" });
//     });

//     it("should handle invalid URLs gracefully", () => {
//       const result = getRequestInfo("/relative/path");

//       expect(result.invalidUrl).toBe(true);
//       expect(result.pathname).toBe("/relative/path");
//     });
//   });

//   describe("standardizeHttpRequestData", () => {
//     it("should normalize HTTP request data", () => {
//       const data = {
//         method: "get",
//         origin: "https://api.example.com",
//         pathname: "/users",
//         statusCode: 200,
//       };

//       const result = standardizeHttpRequestData(data);

//       expect(result.method).toBe("GET");
//       expect(result.origin).toBe("https://api.example.com");
//       expect(result.pathname).toBe("/users");
//       expect(result.fullUrl).toBe("https://api.example.com/users");
//     });

//     it("should provide defaults for missing fields", () => {
//       const result = standardizeHttpRequestData({});

//       expect(result.method).toBe("GET");
//       expect(result.protocol).toBe("http:");
//       expect(result.statusCode).toBe(0);
//       expect(result.headers).toEqual({});
//       expect(result.responseBody).toBe("");
//     });

//     it("should calculate responseBodySize", () => {
//       const result = standardizeHttpRequestData({
//         responseBody: "Hello, World!",
//       });

//       expect(result.responseBodySize).toBe(13);
//     });

//     it("should stringify object response bodies", () => {
//       const result = standardizeHttpRequestData({
//         responseBody: { key: "value" },
//       });

//       expect(result.responseBody).toBe('{"key":"value"}');
//     });

//     it("should normalize hostname/host", () => {
//       const result = standardizeHttpRequestData({
//         hostname: "api.example.com",
//       });

//       expect(result.host).toBe("api.example.com");
//     });
//   });

//   describe("extractHttpDisplayData", () => {
//     it("should extract display-relevant fields", () => {
//       const data: HttpRequestData = {
//         method: "GET",
//         origin: "https://api.example.com",
//         pathname: "/users",
//         protocol: "https:",
//         statusCode: 200,
//         statusMessage: "OK",
//         duration: 150,
//         aborted: false,
//         headers: { "Content-Type": "application/json" },
//         responseBody: '{"users":[]}',
//         responseBodySize: 12,
//         isMedia: false,
//         library: "axios",
//         file: "",
//         line: "",
//         uuid: "http:123",
//         created_at: "2025-01-01T00:00:00.000Z",
//       };

//       const result = extractHttpDisplayData(data);

//       expect(result).toEqual({
//         id: "http:123",
//         method: "GET",
//         url: "https://api.example.com/users",
//         statusCode: 200,
//         duration: 150,
//         size: 12,
//         library: "axios",
//         timestamp: "2025-01-01T00:00:00.000Z",
//       });
//     });
//   });

//   describe("extractQueryParamsFromUrl", () => {
//     it("should extract query parameters from URL", () => {
//       expect(extractQueryParamsFromUrl("/api/users?id=1&name=test")).toBe(
//         "id=1&name=test",
//       );
//     });

//     it("should return undefined for URLs without query params", () => {
//       expect(extractQueryParamsFromUrl("/api/users")).toBeUndefined();
//     });

//     it("should handle empty query string", () => {
//       expect(extractQueryParamsFromUrl("/api/users?")).toBeUndefined();
//     });

//     it("should handle empty input", () => {
//       expect(extractQueryParamsFromUrl("")).toBeUndefined();
//     });

//     it("should handle complex query strings", () => {
//       const url = "/api/search?q=test+query&page=1&filters[status]=active";
//       const result = extractQueryParamsFromUrl(url);
//       expect(result).toContain("q=test+query");
//       expect(result).toContain("page=1");
//     });
//   });

//   describe("getCallerInfo", () => {
//     it("should return unknown when tracing is disabled", () => {
//       delete process.env.NODE_OBSERVATORY_ERROR_TRACING;

//       const result = getCallerInfo("test-file.ts");

//       expect(result).toEqual({ file: "unknown", line: "unknown" });
//     });

//     it("should extract file and line when tracing is enabled", () => {
//       process.env.NODE_OBSERVATORY_ERROR_TRACING = "true";

//       const result = getCallerInfo("nonexistent-file.ts");

//       // Should get something from the call stack
//       expect(result).toHaveProperty("file");
//       expect(result).toHaveProperty("line");

//       delete process.env.NODE_OBSERVATORY_ERROR_TRACING;
//     });
//   });
// });
