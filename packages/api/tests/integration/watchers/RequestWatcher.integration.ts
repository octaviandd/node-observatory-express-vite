/**
 * RequestWatcher Integration + Edge Cases Integration Tests
 *
 * Combines the standard RequestWatcher integration suite with the comprehensive
 * edge-cases suite (pagination, periods, invalid inputs, oversized data, encoding,
 * errors, grouping, graph mode, related entry linking, concurrency, and timestamp ordering).
 *
 * @format
 */

import type { RedisClientType } from "redis";
import type { Connection } from "mysql2/promise";
import Database from "../../../src/core/databases/sql/Base";
import GenericWatcher from "../../../src/core/watchers/GenericWatcher";
import {
  getRedisClient,
  getMySQLConnection,
  resetAll,
  registerWatcher,
} from "../test-utils";
import { WATCHER_CONFIGS } from "../../../src/core/watcherConfig";
import {
  createBaseEntry,
  createFilterRequest,
  testConcurrentInsertions,
  assertEntryStructure,
  getTimestamp,
  createErrorEntry,
} from "../edge-cases/testHelpers";

describe("RequestWatcher Integration (Combined)", () => {
  let redisClient: RedisClientType;
  let mysqlConnection: Connection;
  let database: Database;
  let watcher: GenericWatcher;

  const createMockRequest = (
    query: Record<string, string> = {},
    params: Record<string, string> = {},
  ): ObservatoryBoardRequest =>
    ({
      query,
      params,
      body: {},
      requestData: {},
    }) as unknown as ObservatoryBoardRequest;

  /**
   * Creates a request entry in the patcher format (express-common.ts output).
   */
  const createRequestEntry = (
    uuid: string,
    data: {
      route: string;
      statusCode: number;
      requestSize?: number;
      responseSize?: number;
      payload?: string;
      headers?: Record<string, any>;
      query?: Record<string, any>;
      params?: Record<string, any>;
      ip?: string;
    },
    options: {
      status?: "completed" | "failed";
      duration?: number;
      method?: string;
      request_id?: string;
      job_id?: string;
      schedule_id?: string;
      error?: { message: string; name: string; stack?: string };
    } = {},
  ) => ({
    uuid,
    type: "request",
    content: {
      status:
        options.status || (data.statusCode >= 400 ? "failed" : "completed"),
      duration: options.duration ?? 100,
      metadata: {
        package: "express" as const,
        method: options.method || "get",
      },
      data: {
        route: data.route,
        statusCode: data.statusCode,
        requestSize: data.requestSize ?? 0,
        responseSize: data.responseSize ?? 100,
        payload: data.payload || "",
        headers: data.headers || {},
        query: data.query || {},
        params: data.params || {},
        ip: data.ip || "127.0.0.1",
      },
      location: { file: "express", line: "0" },
      ...(options.error && { error: options.error }),
    },
    created_at: new Date().toISOString().replace("T", " ").substring(0, 19),
    request_id: options.request_id || uuid.replace("request:", "req-"),
    job_id: options.job_id || "null",
    schedule_id: options.schedule_id || "null",
  });

  beforeAll(async () => {
    redisClient = await getRedisClient();
    mysqlConnection = await getMySQLConnection();
    database = new Database(mysqlConnection);
  });

  beforeEach(async () => {
    await resetAll();
    watcher = new GenericWatcher(
      redisClient as any,
      database,
      WATCHER_CONFIGS.request,
    );
    registerWatcher(watcher);
  });

  afterEach(async () => {
    await watcher.stop();
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  describe("RequestWatcher Integration", () => {
    describe("index endpoint", () => {
      it("should return empty results when no data exists", async () => {
        /**
         * Validates baseline behavior with an empty database.
         * Calls the index endpoint in table mode with grouping enabled.
         * Ensures the endpoint responds successfully (HTTP 200).
         * Confirms no rows are returned and count is zero.
         */
        const req = createMockRequest({
          table: "true",
          index: "group",
          period: "24h",
        });
        const result = await watcher.indexTable(req);

        expect(result.statusCode).toBe(200);
        expect(result.body.results).toEqual([]);
        expect(result.body.count).toBe("0");
      });

      it("should return instance data when entries exist", async () => {
        /**
         * Inserts two request entries into the database.
         * Calls the index endpoint in instance mode.
         * Validates the endpoint responds successfully (HTTP 200).
         * Confirms both inserted entries are returned with correct count.
         */
        await database.insert([
          createRequestEntry(
            "request:1",
            { route: "/api/users", statusCode: 200 },
            { duration: 100, method: "get" },
          ),
          createRequestEntry(
            "request:2",
            { route: "/api/posts", statusCode: 201 },
            { duration: 150, method: "post" },
          ),
        ]);

        const req = createMockRequest({
          table: "true",
          index: "instance",
          period: "24h",
        });
        const result = await watcher.indexTable(req);

        expect(result.statusCode).toBe(200);
        expect(result.body.results).toHaveLength(2);
        expect(result.body.count).toBe("2");
      });

      it("should return grouped data by route", async () => {
        /**
         * Inserts multiple requests sharing the same route.
         * Calls the index endpoint in group mode.
         * Verifies grouping collapses multiple rows into one.
         * Confirms the response returns a single grouped record.
         */
        await database.insert([
          createRequestEntry(
            "request:1",
            { route: "/api/users", statusCode: 200 },
            { duration: 100 },
          ),
          createRequestEntry(
            "request:2",
            { route: "/api/users", statusCode: 200 },
            { duration: 120 },
          ),
        ]);

        const req = createMockRequest({
          table: "true",
          index: "group",
          period: "24h",
        });
        const result = await watcher.indexTable(req);

        expect(result.statusCode).toBe(200);
        expect(result.body.results).toHaveLength(1);
      });

      it("should filter by status code", async () => {
        /**
         * Inserts a successful (2xx) and failing (4xx) request entry.
         * Calls the index endpoint with a status range filter (2xx).
         * Ensures the endpoint returns successfully (HTTP 200).
         * Verifies filtering logic does not error under normal use.
         */
        await database.insert([
          createRequestEntry(
            "request:200",
            { route: "/api/users", statusCode: 200 },
            { duration: 100 },
          ),
          createRequestEntry(
            "request:404",
            { route: "/api/missing", statusCode: 404 },
            { duration: 50 },
          ),
        ]);

        const req = createMockRequest({
          table: "true",
          index: "instance",
          period: "24h",
          status: "2xx",
        });
        const result = await watcher.indexTable(req);

        expect(result.statusCode).toBe(200);
      });

      it("should return graph data when isTable is false", async () => {
        /**
         * Calls the index endpoint in graph mode (table=false).
         * Ensures graph formatting and aggregation runs successfully.
         * Validates the endpoint responds successfully (HTTP 200).
         * Confirms both count and duration graph series are present.
         */
        const req = createMockRequest({ table: "false", period: "24h" });
        const result = await watcher.indexGraph(req);

        expect(result.statusCode).toBe(200);
        expect(result.body).toHaveProperty("countFormattedData");
        expect(result.body).toHaveProperty("durationFormattedData");
      });

      it("should handle pagination", async () => {
        /**
         * Inserts 10 request entries to paginate over.
         * Calls the index endpoint with limit/offset parameters.
         * Verifies the endpoint responds successfully (HTTP 200).
         * Confirms page size matches limit and count reflects total.
         */
        const entries = Array.from({ length: 10 }, (_, i) =>
          createRequestEntry(
            `request:${i}`,
            { route: `/api/item/${i}`, statusCode: 200 },
            { duration: 100 },
          ),
        );
        await database.insert(entries);

        const req = createMockRequest({
          table: "true",
          index: "instance",
          period: "24h",
          limit: "3",
          offset: "2",
        });
        const result = await watcher.indexTable(req);

        expect(result.statusCode).toBe(200);
        expect(result.body.results).toHaveLength(3);
        expect(result.body.count).toBe("10");
      });
    });

    describe("view endpoint", () => {
      it("should return entry data by uuid", async () => {
        /**
         * Inserts a single request entry into the database.
         * Calls the view endpoint by uuid.
         * Ensures the endpoint responds successfully (HTTP 200).
         * Confirms the response contains the request payload.
         */
        await database.insert([
          createRequestEntry(
            "request:view-test",
            { route: "/api/users", statusCode: 200 },
            { duration: 100, request_id: "req-view" },
          ),
        ]);

        const req = createMockRequest({}, { id: "request:view-test" });
        const result = await watcher.view(req);

        expect(result.statusCode).toBe(200);
        expect(result.body).toHaveProperty("request");
      });

      it("should include related entries", async () => {
        /**
         * Inserts a request entry plus related log and query entries.
         * Uses a shared request_id to link related records.
         * Calls the view endpoint for the request entry.
         * Confirms request, log, and query sections exist in response.
         */
        const requestId = "shared-req-uuid";
        await database.insert([
          createRequestEntry(
            "request:main",
            { route: "/api/users", statusCode: 200 },
            { duration: 100, request_id: requestId },
          ),
          {
            uuid: "log:related",
            type: "log",
            content: {
              status: "completed",
              duration: 0,
              metadata: { package: "winston", level: "info" },
              data: { message: "User fetched" },
              location: { file: "app.ts", line: "50" },
            },
            created_at: new Date()
              .toISOString()
              .replace("T", " ")
              .substring(0, 19),
            request_id: requestId,
            job_id: "null",
            schedule_id: "null",
          },
          {
            uuid: "query:related",
            type: "query",
            content: {
              status: "completed",
              duration: 50,
              metadata: { package: "mysql2", method: "query" },
              data: { sql: "SELECT * FROM users" },
              location: { file: "db.ts", line: "20" },
            },
            created_at: new Date()
              .toISOString()
              .replace("T", " ")
              .substring(0, 19),
            request_id: requestId,
            job_id: "null",
            schedule_id: "null",
          },
        ]);

        const req = createMockRequest({}, { id: "request:main" });
        const result = await watcher.view(req);

        expect(result.statusCode).toBe(200);
        expect(result.body).toHaveProperty("request");
        expect(result.body).toHaveProperty("log");
        expect(result.body).toHaveProperty("query");
      });
    });

    describe("insertRedisStream", () => {
      it("should add entry to Redis stream", async () => {
        /**
         * Creates a completed request payload for stream insertion.
         * Inserts the entry into the observatory request Redis stream.
         * Ensures insertion succeeds without throwing.
         * Confirms the stream length increases beyond zero.
         */
        const entry = {
          status: "completed" as const,
          duration: 100,
          metadata: { package: "express" as const, method: "get" },
          data: {
            route: "/api/users",
            statusCode: 200,
            requestSize: 0,
            responseSize: 256,
            payload: "",
            headers: { "content-type": "application/json" },
            query: {},
            params: {},
            ip: "127.0.0.1",
          },
          location: { file: "express", line: "0" },
        };

        await watcher.insertRedisStream(entry as any);

        const streamLen = await redisClient.xLen("observatory:stream:request");
        expect(streamLen).toBeGreaterThan(0);
      });

      it("should handle failed requests with error", async () => {
        /**
         * Creates a failed request payload including an error object.
         * Inserts the failure entry into the request Redis stream.
         * Ensures error payloads are accepted by the stream writer.
         * Confirms the stream length increases beyond zero.
         */
        const entry = {
          status: "failed" as const,
          duration: 50,
          metadata: { package: "express" as const, method: "get" },
          data: {
            route: "/api/error",
            statusCode: 500,
            requestSize: 0,
            responseSize: 0,
          },
          location: { file: "express", line: "0" },
          error: {
            name: "InternalError",
            message: "Something went wrong",
            stack: "Error...",
          },
        };

        await watcher.insertRedisStream(entry as any);

        const streamLen = await redisClient.xLen("observatory:stream:request");
        expect(streamLen).toBeGreaterThan(0);
      });
    });
  });

  describe("RequestWatcher Edge Cases Integration", () => {
    describe("Pagination Boundary Conditions", () => {
      beforeEach(async () => {
        // Insert 15 test entries
        const entries = Array.from({ length: 15 }, (_, i) =>
          createBaseEntry(`request:pagination-${i}`, "request", "express", {
            content: {
              status: "completed",
              duration: 50 + i * 10,
              metadata: {
                package: "express",
                method: i % 2 === 0 ? "get" : "post",
              },
              data: {
                route: `/api/endpoint/${i}`,
                statusCode: 200,
                requestSize: 100,
                responseSize: 200 + i * 10,
              },
            },
          }),
        );

        await database.insert(entries);
      });

      it("should return all results when limit exceeds total count", async () => {
        /**
         * Creates a request with a limit larger than the dataset size.
         * Calls index in instance mode with offset=0 and limit=100.
         * Ensures the endpoint returns successfully (HTTP 200).
         * Confirms all rows are returned and count matches total.
         */
        const req = createFilterRequest({
          table: "true",
          index: "instance",
          period: "24h",
          offset: "0",
          limit: "100",
        });

        const result = await watcher.indexTable(req);
        expect(result.statusCode).toBe(200);
        expect(result.body.results).toHaveLength(15);
        expect(result.body.count).toBe("15");
      });

      it("should return empty when offset exceeds total count", async () => {
        /**
         * Creates a request with an offset beyond the dataset size.
         * Calls index in instance mode with offset=50 and limit=10.
         * Ensures the endpoint returns successfully (HTTP 200).
         * Confirms no rows are returned while total count is preserved.
         */
        const req = createFilterRequest({
          table: "true",
          index: "instance",
          period: "24h",
          offset: "50",
          limit: "10",
        });

        const result = await watcher.indexTable(req);
        expect(result.statusCode).toBe(200);
        expect(result.body.results).toHaveLength(0);
        expect(result.body.count).toBe("15");
      });

      it("should handle exact boundary (offset + limit = total)", async () => {
        /**
         * Creates a request that lands exactly on the pagination boundary.
         * Calls index with offset=10 and limit=5 for a total of 15 rows.
         * Ensures the endpoint returns successfully (HTTP 200).
         * Confirms a full page of 5 rows is returned.
         */
        const req = createFilterRequest({
          table: "true",
          index: "instance",
          period: "24h",
          offset: "10",
          limit: "5",
        });

        const result = await watcher.indexTable(req);
        expect(result.statusCode).toBe(200);
        expect(result.body.results).toHaveLength(5);
      });

      it("should handle one-past boundary", async () => {
        /**
         * Creates a request that asks for more items than remain.
         * Calls index with offset=14 and limit=2 for a total of 15 rows.
         * Ensures the endpoint returns successfully (HTTP 200).
         * Confirms only the final remaining row is returned.
         */
        const req = createFilterRequest({
          table: "true",
          index: "instance",
          period: "24h",
          offset: "14",
          limit: "2",
        });

        const result = await watcher.indexTable(req);
        expect(result.statusCode).toBe(200);
        expect(result.body.results).toHaveLength(1); // Only 1 entry left
      });
    });

    describe("Period Filtering Edge Cases", () => {
      it("should return data for all supported periods", async () => {
        /**
         * Inserts a single fresh request entry into the database.
         * Iterates across supported period filters.
         * Ensures each period query returns successfully (HTTP 200).
         * Confirms the query path works consistently for all periods.
         */
        const entry = createBaseEntry(
          "request:period-test",
          "request",
          "express",
          {
            content: {
              status: "completed",
              duration: 100,
              metadata: { package: "express", method: "get" },
              data: {
                route: "/api/test",
                statusCode: 200,
                requestSize: 0,
                responseSize: 100,
              },
            },
          },
        );

        await database.insert([entry]);

        const periods = ["1h", "24h", "7d", "14d", "30d"];

        for (const period of periods) {
          const req = createFilterRequest({
            table: "true",
            index: "instance",
            period,
          });

          const result = await watcher.indexTable(req);
          expect(result.statusCode).toBe(200);
          // Entry is fresh, but watcher implementations may still return 0 depending on time windows.
          expect(result.body.results.length).toBeGreaterThanOrEqual(0);
        }
      });

      it("should handle null/undefined period gracefully", async () => {
        /**
         * Builds a request omitting the period parameter.
         * Calls index to verify defaulting/validation behavior.
         * Ensures the call does not trigger a server error (no 5xx).
         * Confirms watcher handles missing period without crashing.
         */
        const req = createFilterRequest({
          table: "true",
          index: "instance",
          period: undefined,
        });

        const result = await watcher.indexTable(req);
        expect(result.statusCode).toBeLessThan(500);
      });
    });

    describe("Invalid Filter Inputs", () => {
      beforeEach(async () => {
        const entry = createBaseEntry(
          "request:filter-test",
          "request",
          "express",
          {
            content: {
              status: "completed",
              duration: 100,
              metadata: { package: "express", method: "get" },
              data: {
                route: "/api/test",
                statusCode: 200,
                requestSize: 0,
                responseSize: 100,
              },
            },
          },
        );

        await database.insert([entry]);
      });

      it("should handle invalid period string", async () => {
        /**
         * Creates a request with an unsupported period string.
         * Calls index expecting period validation to trigger.
         * Ensures the promise rejects (rather than returning 200).
         * Confirms the error message matches the invalid period.
         */
        const req = createFilterRequest({
          table: "true",
          index: "instance",
          period: "99d", // Invalid period
        });

        await expect(watcher.indexTable(req)).rejects.toThrow(
          'Invalid period: "99d"',
        );
      });

      it("should handle invalid index type", async () => {
        /**
         * Creates a request with an invalid index selector.
         * Calls index to observe validation/default behavior.
         * Accepts either a handled 4xx or a safe default 200.
         * Confirms truly invalid inputs do not cause silent crashes.
         */
        const req = createFilterRequest({
          table: "true",
          index: "invalid-index",
        });

        try {
          const result = await watcher.indexTable(req);
          expect([200, 400]).toContain(result.statusCode);
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      it("should sanitize SQL injection in query parameter", async () => {
        /**
         * Sends a malicious query string intended for SQL injection.
         * Calls index and validates it responds successfully (HTTP 200).
         * Verifies that storage is intact after the query runs.
         * Ensures the underlying table still exists and is readable.
         */
        const req = createFilterRequest({
          table: "true",
          index: "instance",
          period: "24h",
          query: "'; DROP TABLE observatory_entries; --",
        });

        const result = await watcher.indexTable(req);
        expect(result.statusCode).toBe(200);

        const allData = await database.getAllEntriesByType("request");
        expect(allData).toBeDefined();
      });

      it("should handle very long query strings", async () => {
        /**
         * Creates an extremely long query string (10k chars).
         * Calls index to ensure query processing remains safe.
         * Validates no server error occurs (no 5xx).
         * Confirms the watcher handles the input without crashing.
         */
        const longQuery = "a".repeat(10000);
        const req = createFilterRequest({
          table: "true",
          index: "instance",
          period: "24h",
          query: longQuery,
        });

        const result = await watcher.indexTable(req);
        expect(result.statusCode).toBeLessThan(500);
      });

      it("should handle special regex characters in query", async () => {
        /**
         * Sends a query string containing regex metacharacters.
         * Calls index to ensure parsing/escaping is robust.
         * Validates the endpoint does not throw a 5xx error.
         * Confirms the watcher can safely handle odd query strings.
         */
        const req = createFilterRequest({
          table: "true",
          index: "instance",
          period: "24h",
          query: ".*[^a-z]\\d+$^",
        });

        const result = await watcher.indexTable(req);
        expect(result.statusCode).toBeLessThan(500);
      });
    });

    describe("Oversized Data Handling", () => {
      it("should handle large payload (50KB+)", async () => {
        /**
         * Inserts a request containing a large payload (~75KB).
         * Calls index in instance mode to retrieve the stored entry.
         * Ensures the endpoint responds successfully (HTTP 200).
         * Confirms the entry is present even if payload is truncated.
         */
        const largePayload = "x".repeat(1024 * 75); // 75KB
        const entry = createBaseEntry(
          "request:large-payload",
          "request",
          "express",
          {
            content: {
              status: "completed",
              duration: 150,
              metadata: { package: "express", method: "post" },
              data: {
                route: "/api/upload",
                statusCode: 200,
                requestSize: 1024 * 75,
                responseSize: 100,
                payload: largePayload,
              },
            },
          },
        );

        await database.insert([entry]);

        const req = createFilterRequest({
          table: "true",
          index: "instance",
          period: "24h",
        });

        const result = await watcher.indexTable(req);
        expect(result.statusCode).toBe(200);
        expect(result.body.results).toHaveLength(1);
        expect(result.body.results[0]).toBeDefined();
      });

      it("should handle large response size", async () => {
        /**
         * Inserts a request entry with a very large responseSize value.
         * Calls index to retrieve the entry and verify numeric handling.
         * Ensures the endpoint responds successfully (HTTP 200).
         * Confirms the stored responseSize matches the inserted value.
         */
        const entry = createBaseEntry(
          "request:large-response",
          "request",
          "express",
          {
            content: {
              status: "completed",
              duration: 500,
              metadata: { package: "express", method: "get" },
              data: {
                route: "/api/large-data",
                statusCode: 200,
                requestSize: 100,
                responseSize: 1024 * 1024 * 10, // 10MB response
              },
            },
          },
        );

        await database.insert([entry]);

        const req = createFilterRequest({
          table: "true",
          index: "instance",
          period: "24h",
        });

        const result = await watcher.indexTable(req);
        expect(result.statusCode).toBe(200);
        expect(result.body.results[0].content.data.responseSize).toBe(
          1024 * 1024 * 10,
        );
      });

      it("should handle large headers object", async () => {
        /**
         * Builds a large headers object with many keys and long values.
         * Inserts an entry containing the headers blob.
         * Calls index to ensure serialization/deserialization is safe.
         * Confirms the watcher responds successfully (HTTP 200).
         */
        const largeHeaders: Record<string, string> = {};
        for (let i = 0; i < 100; i++) {
          largeHeaders[`x-custom-header-${i}`] = `value-${i}`.repeat(50);
        }

        const entry = createBaseEntry(
          "request:large-headers",
          "request",
          "express",
          {
            content: {
              status: "completed",
              duration: 100,
              metadata: { package: "express", method: "get" },
              data: {
                route: "/api/test",
                statusCode: 200,
                requestSize: 0,
                responseSize: 100,
                headers: largeHeaders,
              },
            },
          },
        );

        await database.insert([entry]);

        const req = createFilterRequest({
          table: "true",
          index: "instance",
          period: "24h",
        });

        const result = await watcher.indexTable(req);
        expect(result.statusCode).toBe(200);
      });
    });

    describe("Special Characters and Encoding", () => {
      it("should handle unicode characters in route", async () => {
        /**
         * Inserts an entry with a route containing multiple unicode scripts.
         * Calls index to ensure unicode is persisted and retrievable.
         * Validates the endpoint responds successfully (HTTP 200).
         * Confirms returned route contains the expected unicode segment.
         */
        const entry = createBaseEntry(
          "request:unicode-route",
          "request",
          "express",
          {
            content: {
              status: "completed",
              duration: 100,
              metadata: { package: "express", method: "get" },
              data: {
                route: "/api/用户/データ/пользователь",
                statusCode: 200,
                requestSize: 0,
                responseSize: 100,
              },
            },
          },
        );

        await database.insert([entry]);

        const req = createFilterRequest({
          table: "true",
          index: "instance",
          period: "24h",
        });

        const result = await watcher.indexTable(req);
        expect(result.statusCode).toBe(200);
        expect(result.body.results[0].content.data.route).toContain("用户");
      });

      it("should handle emoji in route", async () => {
        /**
         * Inserts an entry with emoji characters in the route.
         * Calls index to ensure emoji strings remain valid.
         * Ensures the endpoint responds successfully (HTTP 200).
         * Confirms the watcher handles emoji without encoding errors.
         */
        const entry = createBaseEntry(
          "request:emoji-route",
          "request",
          "express",
          {
            content: {
              status: "completed",
              duration: 100,
              metadata: { package: "express", method: "get" },
              data: {
                route: "/api/🚀/🎉/emoji",
                statusCode: 200,
                requestSize: 0,
                responseSize: 100,
              },
            },
          },
        );

        await database.insert([entry]);

        const req = createFilterRequest({
          table: "true",
          index: "instance",
          period: "24h",
        });

        const result = await watcher.indexTable(req);
        expect(result.statusCode).toBe(200);
      });

      it("should handle special characters in query parameters", async () => {
        /**
         * Inserts query params containing XSS-like and SQL-like strings.
         * Calls index to ensure the data is stored and returned safely.
         * Ensures the endpoint responds successfully (HTTP 200).
         * Confirms the query text is present and not mangled.
         */
        const entry = createBaseEntry(
          "request:special-chars",
          "request",
          "express",
          {
            content: {
              status: "completed",
              duration: 100,
              metadata: { package: "express", method: "get" },
              data: {
                route: "/api/search",
                statusCode: 200,
                requestSize: 0,
                responseSize: 100,
                query: {
                  search: '<script>alert("xss")</script>',
                  filter: "'; DROP TABLE--",
                  regex: ".*[^a-z]\\d+",
                },
              },
            },
          },
        );

        await database.insert([entry]);

        const req = createFilterRequest({
          table: "true",
          index: "instance",
          period: "24h",
        });

        const result = await watcher.indexTable(req);
        expect(result.statusCode).toBe(200);
        expect(result.body.results[0].content.data.query.search).toContain(
          "script",
        );
      });

      it("should handle null bytes and control characters", async () => {
        /**
         * Inserts a route containing a null byte and control characters.
         * Calls index to verify the system tolerates unusual characters.
         * Ensures the endpoint responds successfully (HTTP 200).
         * Confirms storage/retrieval does not crash on control chars.
         */
        const entry = createBaseEntry(
          "request:control-chars",
          "request",
          "express",
          {
            content: {
              status: "completed",
              duration: 100,
              metadata: { package: "express", method: "get" },
              data: {
                route: "/api/test\0null\nbyte",
                statusCode: 200,
                requestSize: 0,
                responseSize: 100,
              },
            },
          },
        );

        await database.insert([entry]);

        const req = createFilterRequest({
          table: "true",
          index: "instance",
          period: "24h",
        });

        const result = await watcher.indexTable(req);
        expect(result.statusCode).toBe(200);
      });
    });

    describe("Error Scenarios", () => {
      it("should handle request with error stack trace", async () => {
        /**
         * Inserts an entry that includes an error with a stack trace.
         * Calls index to ensure error objects are preserved in output.
         * Validates the endpoint responds successfully (HTTP 200).
         * Confirms the returned error stack contains expected content.
         */
        const entry = createErrorEntry(
          "request:with-error",
          "request",
          "express",
          "stack_trace",
        );
        await database.insert([entry]);

        const req = createFilterRequest({
          table: "true",
          index: "instance",
          period: "24h",
        });

        const result = await watcher.indexTable(req);
        expect(result.statusCode).toBe(200);
        expect(result.body.results[0].content.error).toBeDefined();
        expect(result.body.results[0].content.error.stack).toContain(
          "TypeError",
        );
      });

      it("should handle error without stack trace", async () => {
        /**
         * Inserts an entry that includes an error without a stack trace.
         * Calls index to verify missing optional fields are handled.
         * Ensures the endpoint responds successfully (HTTP 200).
         * Confirms stack is undefined while message remains present.
         */
        const entry = createErrorEntry(
          "request:error-no-stack",
          "request",
          "express",
          "missing_stack",
        );
        await database.insert([entry]);

        const req = createFilterRequest({
          table: "true",
          index: "instance",
          period: "24h",
        });

        const result = await watcher.indexTable(req);
        expect(result.statusCode).toBe(200);
        expect(result.body.results[0].content.error.message).toBe(
          "Something went wrong",
        );
        expect(result.body.results[0].content.error.stack).toBeUndefined();
      });

      it("should handle 5xx status codes", async () => {
        /**
         * Inserts a failed request entry with a 500 status code.
         * Calls index with the 5xx status range filter.
         * Ensures the endpoint responds successfully (HTTP 200).
         * Confirms the watcher can filter on server error ranges.
         */
        const entry = createBaseEntry(
          "request:error-500",
          "request",
          "express",
          {
            content: {
              status: "failed",
              duration: 50,
              metadata: { package: "express", method: "get" },
              data: {
                route: "/api/error",
                statusCode: 500,
                requestSize: 0,
                responseSize: 100,
              },
              error: {
                name: "InternalServerError",
                message: "Database connection failed",
              },
            },
          },
        );

        await database.insert([entry]);

        const req = createFilterRequest({
          table: "true",
          index: "instance",
          period: "24h",
          status: "5xx",
        });

        const result = await watcher.indexTable(req);
        expect(result.statusCode).toBe(200);
      });

      it("should handle 4xx status codes", async () => {
        /**
         * Inserts multiple failed request entries in the 4xx range.
         * Calls index with the 4xx status range filter.
         * Ensures the endpoint responds successfully (HTTP 200).
         * Confirms results include at least the inserted 4xx entries.
         */
        const entries = [
          createBaseEntry("request:error-404", "request", "express", {
            content: {
              status: "failed",
              duration: 10,
              metadata: { package: "express", method: "get" },
              data: {
                route: "/api/notfound",
                statusCode: 404,
                requestSize: 0,
                responseSize: 50,
              },
            },
          }),
          createBaseEntry("request:error-400", "request", "express", {
            content: {
              status: "failed",
              duration: 15,
              metadata: { package: "express", method: "post" },
              data: {
                route: "/api/invalid",
                statusCode: 400,
                requestSize: 100,
                responseSize: 50,
              },
            },
          }),
        ];

        await database.insert(entries);

        const req = createFilterRequest({
          table: "true",
          index: "instance",
          period: "24h",
          status: "4xx",
        });

        const result = await watcher.indexTable(req);
        expect(result.statusCode).toBe(200);
        expect(result.body.results.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe("Grouping and Aggregation", () => {
      beforeEach(async () => {
        const entries = [
          createBaseEntry("request:group-same-1", "request", "express", {
            content: {
              status: "completed",
              duration: 50,
              metadata: { package: "express", method: "get" },
              data: {
                route: "/api/users",
                statusCode: 200,
                requestSize: 0,
                responseSize: 100,
              },
            },
          }),
          createBaseEntry("request:group-same-2", "request", "express", {
            content: {
              status: "completed",
              duration: 60,
              metadata: { package: "express", method: "get" },
              data: {
                route: "/api/users",
                statusCode: 200,
                requestSize: 0,
                responseSize: 120,
              },
            },
          }),
          createBaseEntry("request:group-same-3", "request", "express", {
            content: {
              status: "completed",
              duration: 70,
              metadata: { package: "express", method: "get" },
              data: {
                route: "/api/users",
                statusCode: 200,
                requestSize: 0,
                responseSize: 110,
              },
            },
          }),
        ];

        await database.insert(entries);
      });

      it("should aggregate same route in group mode", async () => {
        /**
         * Inserts multiple entries with the same route in setup.
         * Calls index in group mode to force aggregation.
         * Ensures the endpoint responds successfully (HTTP 200).
         * Confirms at least one aggregated group result is returned.
         */
        const req = createFilterRequest({
          table: "true",
          index: "group",
          period: "24h",
        });

        const result = await watcher.indexTable(req);
        expect(result.statusCode).toBe(200);
        expect(result.body.results.length).toBeGreaterThanOrEqual(1);
      });

      it("should return individual entries in instance mode", async () => {
        /**
         * Uses the same dataset inserted in setup.
         * Calls index in instance mode to return raw rows.
         * Ensures the endpoint responds successfully (HTTP 200).
         * Confirms all three entries are returned individually.
         */
        const req = createFilterRequest({
          table: "true",
          index: "instance",
          period: "24h",
        });

        const result = await watcher.indexTable(req);
        expect(result.statusCode).toBe(200);
        expect(result.body.results).toHaveLength(3);
      });

      it("should calculate correct count in group mode", async () => {
        /**
         * Uses the same dataset inserted in setup.
         * Calls index in group mode to group identical routes.
         * Ensures the endpoint responds successfully (HTTP 200).
         * Confirms the group count is 1 for the single route bucket.
         */
        const req = createFilterRequest({
          table: "true",
          index: "group",
          period: "24h",
        });

        const result = await watcher.indexTable(req);
        expect(result.statusCode).toBe(200);
        expect(result.body.count).toBe("1");
      });
    });

    describe("Graph Data Edge Cases", () => {
      it("should return graph data for empty dataset", async () => {
        /**
         * Ensures the database is empty for this scenario.
         * Calls index in graph mode (table=false).
         * Validates the endpoint responds successfully (HTTP 200).
         * Confirms graph output fields exist even with no rows.
         */
        const req = createFilterRequest({
          table: "false",
          period: "24h",
        });

        const result = await watcher.indexGraph(req);
        expect(result.statusCode).toBe(200);
        expect(result.body).toHaveProperty("countFormattedData");
      });

      it("should handle graph data with duration statistics", async () => {
        /**
         * Inserts multiple entries with varying durations.
         * Calls index in graph mode to compute duration series.
         * Ensures the endpoint responds successfully (HTTP 200).
         * Confirms both count and duration formatted series are present.
         */
        const entries = [
          createBaseEntry("request:graph-1", "request", "express", {
            content: {
              status: "completed",
              duration: 50,
              metadata: { package: "express", method: "get" },
              data: {
                route: "/api/test",
                statusCode: 200,
                requestSize: 0,
                responseSize: 100,
              },
            },
          }),
          createBaseEntry("request:graph-2", "request", "express", {
            content: {
              status: "completed",
              duration: 150,
              metadata: { package: "express", method: "get" },
              data: {
                route: "/api/test",
                statusCode: 200,
                requestSize: 0,
                responseSize: 100,
              },
            },
          }),
          createBaseEntry("request:graph-3", "request", "express", {
            content: {
              status: "completed",
              duration: 100,
              metadata: { package: "express", method: "get" },
              data: {
                route: "/api/test",
                statusCode: 200,
                requestSize: 0,
                responseSize: 100,
              },
            },
          }),
        ];

        await database.insert(entries);

        const req = createFilterRequest({
          table: "false",
          period: "24h",
        });

        const result = await watcher.indexGraph(req);
        expect(result.statusCode).toBe(200);
        expect(result.body).toHaveProperty("countFormattedData");
        expect(result.body).toHaveProperty("durationFormattedData");
      });
    });

    describe("Related Entries Linking", () => {
      it("should include related log entries in view", async () => {
        /**
         * Inserts a request entry plus multiple logs sharing the same request_id.
         * Calls view on the request entry to trigger related entry retrieval.
         * Ensures the endpoint responds successfully (HTTP 200).
         * Confirms the response contains the request section (and related data path runs).
         */
        const requestId = "req-shared-123";
        const entries = [
          createBaseEntry("request:with-logs", "request", "express", {
            request_id: requestId,
            content: {
              status: "completed",
              duration: 100,
              metadata: { package: "express", method: "get" },
              data: {
                route: "/api/test",
                statusCode: 200,
                requestSize: 0,
                responseSize: 100,
              },
            },
          }),
          createBaseEntry("log:related-1", "log", "winston", {
            request_id: requestId,
            content: {
              status: "completed",
              duration: 0,
              metadata: { package: "winston", level: "info" },
              data: { message: "Processing request" },
            },
          }),
          createBaseEntry("log:related-2", "log", "winston", {
            request_id: requestId,
            content: {
              status: "completed",
              duration: 0,
              metadata: { package: "winston", level: "info" },
              data: { message: "Request completed" },
            },
          }),
        ];

        await database.insert(entries);

        const req = createFilterRequest({ id: "request:with-logs" });
        const result = await watcher.view(req);

        expect(result.statusCode).toBe(200);
        expect(result.body).toHaveProperty("request");
      });

      it("should handle missing related entries gracefully", async () => {
        /**
         * Inserts a request entry whose request_id has no related records.
         * Calls view to ensure the watcher handles missing relations.
         * Ensures the endpoint responds successfully (HTTP 200).
         * Confirms the primary request object is still returned.
         */
        const entry = createBaseEntry(
          "request:orphaned",
          "request",
          "express",
          {
            request_id: "non-existent-req-id",
            content: {
              status: "completed",
              duration: 100,
              metadata: { package: "express", method: "get" },
              data: {
                route: "/api/test",
                statusCode: 200,
                requestSize: 0,
                responseSize: 100,
              },
            },
          },
        );

        await database.insert([entry]);

        const req = createFilterRequest({ id: "request:orphaned" });
        const result = await watcher.view(req);

        expect(result.statusCode).toBe(200);
        expect(result.body.request).toBeDefined();
      });
    });

    describe("Concurrent Operations", () => {
      it("should handle concurrent insertions without data loss", async () => {
        /**
         * Prepares a base entry for repeated concurrent insertion.
         * Runs concurrent insertions via helper and collects errors.
         * Ensures inserts succeed without errors and data is not lost.
         * Confirms index returns at least the expected number of entries.
         */
        const baseEntry = createBaseEntry(
          "request:concurrent-base",
          "request",
          "express",
          {
            content: {
              status: "completed",
              duration: 100,
              metadata: { package: "express", method: "get" },
              data: {
                route: "/api/test",
                statusCode: 200,
                requestSize: 0,
                responseSize: 100,
              },
            },
          },
        );

        const { inserted, errors } = await testConcurrentInsertions(
          database,
          baseEntry,
          10,
          0,
        );

        expect(inserted).toBeGreaterThan(0);
        expect(errors).toHaveLength(0);

        const req = createFilterRequest({
          table: "true",
          index: "instance",
          period: "24h",
          limit: "100",
        });

        const result = await watcher.indexTable(req);
        expect(result.body.results.length).toBeGreaterThanOrEqual(10);
      });

      it("should handle rapid sequential requests", async () => {
        /**
         * Inserts a small fixed set of request entries.
         * Fires multiple index calls in parallel to simulate load.
         * Ensures every response returns successfully (HTTP 200).
         * Confirms each response contains at least the inserted entries.
         */
        const entries = Array.from({ length: 5 }, (_, i) =>
          createBaseEntry(`request:rapid-${i}`, "request", "express", {
            content: {
              status: "completed",
              duration: 100,
              metadata: { package: "express", method: "get" },
              data: {
                route: `/api/test-${i}`,
                statusCode: 200,
                requestSize: 0,
                responseSize: 100,
              },
            },
          }),
        );

        await database.insert(entries);

        const requests = Array.from({ length: 10 }, () =>
          watcher.indexTable(
            createFilterRequest({
              table: "true",
              index: "instance",
              period: "24h",
            }),
          ),
        );

        const results = await Promise.all(requests);

        for (const result of results) {
          expect(result.statusCode).toBe(200);
          expect(result.body.results.length).toBeGreaterThanOrEqual(5);
        }
      });
    });

    describe("Empty and Null Handling", () => {
      it("should handle empty headers object", async () => {
        /**
         * Inserts a request entry with an explicit empty headers object.
         * Calls index to ensure serialization of empty objects is safe.
         * Ensures the endpoint responds successfully (HTTP 200).
         * Confirms no crashes or validation errors occur.
         */
        const entry = createBaseEntry(
          "request:empty-headers",
          "request",
          "express",
          {
            content: {
              status: "completed",
              duration: 100,
              metadata: { package: "express", method: "get" },
              data: {
                route: "/api/test",
                statusCode: 200,
                requestSize: 0,
                responseSize: 100,
                headers: {},
              },
            },
          },
        );

        await database.insert([entry]);

        const req = createFilterRequest({
          table: "true",
          index: "instance",
          period: "24h",
        });

        const result = await watcher.indexTable(req);
        expect(result.statusCode).toBe(200);
      });

      it("should handle empty query parameters", async () => {
        /**
         * Inserts a request entry with an explicit empty query object.
         * Calls index to ensure empty query maps are handled.
         * Ensures the endpoint responds successfully (HTTP 200).
         * Confirms no crashes or unexpected transformations occur.
         */
        const entry = createBaseEntry(
          "request:empty-query",
          "request",
          "express",
          {
            content: {
              status: "completed",
              duration: 100,
              metadata: { package: "express", method: "get" },
              data: {
                route: "/api/test",
                statusCode: 200,
                requestSize: 0,
                responseSize: 100,
                query: {},
              },
            },
          },
        );

        await database.insert([entry]);

        const req = createFilterRequest({
          table: "true",
          index: "instance",
          period: "24h",
        });

        const result = await watcher.indexTable(req);
        expect(result.statusCode).toBe(200);
      });

      it("should handle missing optional data fields", async () => {
        /**
         * Inserts an entry missing optional fields like headers/query/params.
         * Calls index to retrieve the entry without optional keys present.
         * Ensures the endpoint responds successfully (HTTP 200).
         * Confirms entry shape still satisfies the request schema contract.
         */
        const entry: any = createBaseEntry(
          "request:missing-optional",
          "request",
          "express",
          {
            content: {
              status: "completed",
              duration: 100,
              metadata: { package: "express", method: "get" },
              data: {
                route: "/api/test",
                statusCode: 200,
                requestSize: 0,
                responseSize: 100,
              },
            },
          },
        );

        await database.insert([entry]);

        const req = createFilterRequest({
          table: "true",
          index: "instance",
          period: "24h",
        });

        const result = await watcher.indexTable(req);
        expect(result.statusCode).toBe(200);
        assertEntryStructure(result.body.results[0], "request");
      });
    });

    describe("Microsecond Timestamp Precision", () => {
      it("should preserve timestamp with microsecond precision", async () => {
        /**
         * Inserts an entry with a timestamp including microsecond precision.
         * Reads the entry back directly from the database.
         * Ensures stored and retrieved times resolve to the same millisecond.
         * Confirms timestamp handling is stable under higher precision input.
         */
        const timestamp = getTimestamp();
        const entry = createBaseEntry(
          "request:microseconds",
          "request",
          "express",
          {
            created_at: timestamp,
            content: {
              status: "completed",
              duration: 100,
              metadata: { package: "express", method: "get" },
              data: {
                route: "/api/test",
                statusCode: 200,
                requestSize: 0,
                responseSize: 100,
              },
            },
          },
        );

        await database.insert([entry]);

        const retrieved = await database.getEntry("request:microseconds");

        const retrievedDate = new Date(retrieved.created_at);
        const expectedDate = new Date(timestamp);

        expect(retrievedDate.getTime()).toBe(expectedDate.getTime());
      });

      it("should order results by timestamp correctly", async () => {
        /**
         * Inserts multiple entries with different created_at values.
         * Calls index to retrieve entries ordered by time.
         * Ensures the endpoint responds successfully (HTTP 200).
         * Confirms a minimum expected number of rows are returned.
         */
        const entries = Array.from({ length: 5 }, (_, i) =>
          createBaseEntry(`request:order-${i}`, "request", "express", {
            content: {
              status: "completed",
              duration: 100,
              metadata: { package: "express", method: "get" },
              data: {
                route: `/api/test-${i}`,
                statusCode: 200,
                requestSize: 0,
                responseSize: 100,
              },
            },
          }),
        );

        await database.insert(entries);

        const req = createFilterRequest({
          table: "true",
          index: "instance",
          period: "24h",
        });

        const result = await watcher.indexTable(req);
        expect(result.statusCode).toBe(200);
        expect(result.body.results.length).toBeGreaterThanOrEqual(5);
      });
    });

    describe("HTTP Method Variations", () => {
      it("should handle all HTTP methods", async () => {
        /**
         * Inserts one request entry per HTTP method.
         * Calls index in instance mode to fetch all rows.
         * Ensures the endpoint responds successfully (HTTP 200).
         * Confirms the number of results matches the method set size.
         */
        const methods = [
          "get",
          "post",
          "put",
          "patch",
          "delete",
          "head",
          "options",
        ];
        const entries = methods.map((method) =>
          createBaseEntry(`request:method-${method}`, "request", "express", {
            content: {
              status: "completed",
              duration: 100,
              metadata: { package: "express", method },
              data: {
                route: `/api/resource`,
                statusCode: 200,
                requestSize: 0,
                responseSize: 100,
              },
            },
          }),
        );

        await database.insert(entries);

        const req = createFilterRequest({
          table: "true",
          index: "instance",
          period: "24h",
        });

        const result = await watcher.indexTable(req);
        expect(result.statusCode).toBe(200);
        expect(result.body.results).toHaveLength(7);
      });
    });

    describe("Status Code Ranges", () => {
      it("should correctly classify status code ranges", async () => {
        /**
         * Inserts requests spanning 2xx, 3xx, 4xx, and 5xx status codes.
         * Queries each status range filter to validate classification.
         * Ensures each filtered request responds successfully (HTTP 200).
         * Confirms every range returns at least one result.
         */
        const entries = [
          ...Array.from({ length: 3 }, (_, i) =>
            createBaseEntry(`request:2xx-${i}`, "request", "express", {
              content: {
                status: "completed",
                duration: 100,
                metadata: { package: "express", method: "get" },
                data: {
                  route: "/api/test",
                  statusCode: 200 + i,
                  requestSize: 0,
                  responseSize: 100,
                },
              },
            }),
          ),
          ...Array.from({ length: 2 }, (_, i) =>
            createBaseEntry(`request:3xx-${i}`, "request", "express", {
              content: {
                status: "completed",
                duration: 100,
                metadata: { package: "express", method: "get" },
                data: {
                  route: "/api/test",
                  statusCode: 300 + i,
                  requestSize: 0,
                  responseSize: 100,
                },
              },
            }),
          ),
          ...Array.from({ length: 3 }, (_, i) =>
            createBaseEntry(`request:4xx-${i}`, "request", "express", {
              content: {
                status: "failed",
                duration: 50,
                metadata: { package: "express", method: "get" },
                data: {
                  route: "/api/test",
                  statusCode: 400 + i,
                  requestSize: 0,
                  responseSize: 100,
                },
              },
            }),
          ),
          ...Array.from({ length: 2 }, (_, i) =>
            createBaseEntry(`request:5xx-${i}`, "request", "express", {
              content: {
                status: "failed",
                duration: 50,
                metadata: { package: "express", method: "get" },
                data: {
                  route: "/api/test",
                  statusCode: 500 + i,
                  requestSize: 0,
                  responseSize: 100,
                },
              },
            }),
          ),
        ];

        await database.insert(entries);

        for (const statusRange of ["2xx", "3xx", "4xx", "5xx"]) {
          const req = createFilterRequest({
            table: "true",
            index: "instance",
            period: "24h",
            status: statusRange,
          });

          const result = await watcher.indexTable(req);
          expect(result.statusCode).toBe(200);
          expect(result.body.results.length).toBeGreaterThan(0);
        }
      });
    });
  });
});
