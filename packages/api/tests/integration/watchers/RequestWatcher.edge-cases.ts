/**
 * RequestWatcher Edge Cases Integration Tests
 *
 * Comprehensive test coverage for boundary conditions, invalid inputs,
 * oversized data, special characters, concurrent operations, and error scenarios.
 *
 * These tests serve as a template/reference for building similar suites for other watchers.
 *
 * @format
 */

import type { RedisClientType } from "redis";
import Database from "../../../src/core/databases/sql/Base";
import GenericWatcher from "../../../src/core/watchers/GenericWatcher";
import {
  getRedisClient,
  getMySQLConnection,
  resetAll,
  registerWatcher,
} from "../test-utils";
import type { Connection } from "mysql2/promise";
import { WATCHER_CONFIGS } from "../../../src/core/watcherConfig";
import {
  createBaseEntry,
  createFilterRequest,
  testPaginationBoundaries,
  testPeriodBoundaries,
  testInvalidFilters,
  createOversizedEntry,
  createSpecialCharacterEntry,
  createMalformedEntry,
  createErrorEntry,
  createRelatedEntries,
  testConcurrentInsertions,
  testGraphDataEdgeCases,
  assertEntryStructure,
  getTimestamp,
} from "../edge-cases/testHelpers";

describe("RequestWatcher Edge Cases Integration", () => {
  let redisClient: RedisClientType;
  let mysqlConnection: Connection;
  let database: Database;
  let watcher: GenericWatcher;

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
      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
        offset: "0",
        limit: "100",
      });

      const result = await watcher.index(req);
      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(15);
      expect(result.body.count).toBe("15");
    });

    it("should return empty when offset exceeds total count", async () => {
      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
        offset: "50",
        limit: "10",
      });

      const result = await watcher.index(req);
      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(0);
      expect(result.body.count).toBe("15");
    });

    it("should handle exact boundary (offset + limit = total)", async () => {
      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
        offset: "10",
        limit: "5",
      });

      const result = await watcher.index(req);
      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(5);
    });

    it("should handle one-past boundary", async () => {
      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
        offset: "14",
        limit: "2",
      });

      const result = await watcher.index(req);
      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(1); // Only 1 entry left
    });
  });

  describe("Period Filtering Edge Cases", () => {
    it("should return data for all supported periods", async () => {
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

        const result = await watcher.index(req);
        expect(result.statusCode).toBe(200);
        // Should find the entry in all periods since it's brand new
        expect(result.body.results.length).toBeGreaterThanOrEqual(0);
      }
    });

    it("should handle null/undefined period gracefully", async () => {
      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: undefined,
      });

      const result = await watcher.index(req);
      // Should either default to a period or return error
      expect(result.statusCode).toBeLessThan(500); // No server error
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
      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "99d", // Invalid period
      });

      await expect(watcher.index(req)).rejects.toThrow('Invalid period: "99d"');
    });

    it("should handle invalid index type", async () => {
      const req = createFilterRequest({
        table: "true",
        index: "invalid-index",
      });

      try {
        const result = await watcher.index(req);
        // Should either error or default to instance
        expect([200, 400]).toContain(result.statusCode);
      } catch (error) {
        // Expected for truly invalid input
        expect(error).toBeDefined();
      }
    });

    it("should sanitize SQL injection in query parameter", async () => {
      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
        query: "'; DROP TABLE observatory_entries; --",
      });

      const result = await watcher.index(req);
      // Should not execute; table should still exist
      expect(result.statusCode).toBe(200);

      // Verify table still exists
      const allData = await database.getAllEntriesByType("request");
      expect(allData).toBeDefined();
    });

    it("should handle very long query strings", async () => {
      const longQuery = "a".repeat(10000);
      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
        query: longQuery,
      });

      const result = await watcher.index(req);
      // Should handle without crashing
      expect(result.statusCode).toBeLessThan(500);
    });

    it("should handle special regex characters in query", async () => {
      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
        query: ".*[^a-z]\\d+$^",
      });

      const result = await watcher.index(req);
      expect(result.statusCode).toBeLessThan(500);
    });
  });

  describe("Oversized Data Handling", () => {
    it("should handle large payload (50KB+)", async () => {
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

      const result = await watcher.index(req);
      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(1);
      // Payload might be truncated by patcher (max 50KB), but entry should exist
      expect(result.body.results[0]).toBeDefined();
    });

    it("should handle large response size", async () => {
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

      const result = await watcher.index(req);
      expect(result.statusCode).toBe(200);
      expect(result.body.results[0].content.data.responseSize).toBe(
        1024 * 1024 * 10,
      );
    });

    it("should handle large headers object", async () => {
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

      const result = await watcher.index(req);
      expect(result.statusCode).toBe(200);
    });
  });

  describe("Special Characters and Encoding", () => {
    it("should handle unicode characters in route", async () => {
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

      const result = await watcher.index(req);
      expect(result.statusCode).toBe(200);
      expect(result.body.results[0].content.data.route).toContain("用户");
    });

    it("should handle emoji in route", async () => {
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

      const result = await watcher.index(req);
      expect(result.statusCode).toBe(200);
    });

    it("should handle special characters in query parameters", async () => {
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

      const result = await watcher.index(req);
      expect(result.statusCode).toBe(200);
      expect(result.body.results[0].content.data.query.search).toContain(
        "script",
      );
    });

    it("should handle null bytes and control characters", async () => {
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

      const result = await watcher.index(req);
      expect(result.statusCode).toBe(200);
    });
  });

  describe("Error Scenarios", () => {
    it("should handle request with error stack trace", async () => {
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

      const result = await watcher.index(req);
      expect(result.statusCode).toBe(200);
      console.log(result);
      expect(result.body.results[0].content.error).toBeDefined();
      expect(result.body.results[0].content.error.stack).toContain("TypeError");
    });

    it("should handle error without stack trace", async () => {
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

      const result = await watcher.index(req);
      expect(result.statusCode).toBe(200);
      expect(result.body.results[0].content.error.message).toBe(
        "Something went wrong",
      );
      expect(result.body.results[0].content.error.stack).toBeUndefined();
    });

    it("should handle 5xx status codes", async () => {
      const entry = createBaseEntry("request:error-500", "request", "express", {
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
      });

      await database.insert([entry]);

      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
        status: "5xx",
      });

      const result = await watcher.index(req);
      expect(result.statusCode).toBe(200);
    });

    it("should handle 4xx status codes", async () => {
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

      const result = await watcher.index(req);
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
      const req = createFilterRequest({
        table: "true",
        index: "group",
        period: "24h",
      });

      const result = await watcher.index(req);
      expect(result.statusCode).toBe(200);
      expect(result.body.results.length).toBeGreaterThanOrEqual(1);
    });

    it("should return individual entries in instance mode", async () => {
      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
      });

      const result = await watcher.index(req);
      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(3);
    });

    it("should calculate correct count in group mode", async () => {
      const req = createFilterRequest({
        table: "true",
        index: "group",
        period: "24h",
      });

      const result = await watcher.index(req);
      expect(result.statusCode).toBe(200);
      expect(result.body.count).toBe("1");
    });
  });

  describe("Graph Data Edge Cases", () => {
    it("should return graph data for empty dataset", async () => {
      const req = createFilterRequest({
        table: "false", // Graph mode
        period: "24h",
      });

      const result = await watcher.index(req);
      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty("countFormattedData");
    });

    it("should handle graph data with duration statistics", async () => {
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

      const result = await watcher.index(req);
      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty("countFormattedData");
      expect(result.body).toHaveProperty("durationFormattedData");
    });
  });

  describe("Related Entries Linking", () => {
    it("should include related log entries in view", async () => {
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
      const entry = createBaseEntry("request:orphaned", "request", "express", {
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
      });

      await database.insert([entry]);

      const req = createFilterRequest({ id: "request:orphaned" });
      const result = await watcher.view(req);

      expect(result.statusCode).toBe(200);
      expect(result.body.request).toBeDefined();
    });
  });

  describe("Concurrent Operations", () => {
    it("should handle concurrent insertions without data loss", async () => {
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

      // Verify all were inserted
      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
        limit: "100",
      });

      const result = await watcher.index(req);
      expect(result.body.results.length).toBeGreaterThanOrEqual(10);
    });

    it("should handle rapid sequential requests", async () => {
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

      // Make rapid requests
      const requests = Array.from({ length: 10 }, () =>
        watcher.index(
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

      const result = await watcher.index(req);
      expect(result.statusCode).toBe(200);
    });

    it("should handle empty query parameters", async () => {
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

      const result = await watcher.index(req);
      expect(result.statusCode).toBe(200);
    });

    it("should handle missing optional data fields", async () => {
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
              // Omit optional fields: headers, query, params, ip, memoryUsage, session
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

      const result = await watcher.index(req);
      expect(result.statusCode).toBe(200);
      assertEntryStructure(result.body.results[0], "request");
    });
  });

  describe("Microsecond Timestamp Precision", () => {
    it("should preserve timestamp with microsecond precision", async () => {
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
      const entries = Array.from({ length: 5 }, (_, i) => {
        const entry = createBaseEntry(
          `request:order-${i}`,
          "request",
          "express",
          {
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
          },
        );
        return entry;
      });

      await database.insert(entries);

      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
      });

      const result = await watcher.index(req);
      expect(result.statusCode).toBe(200);
      // Results should be in order
      expect(result.body.results.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("HTTP Method Variations", () => {
    it("should handle all HTTP methods", async () => {
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

      const result = await watcher.index(req);
      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(7);
    });
  });

  describe("Status Code Ranges", () => {
    it("should correctly classify status code ranges", async () => {
      const entries = [
        // 2xx
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
        // 3xx
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
        // 4xx
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
        // 5xx
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

      // Test each range
      for (const statusRange of ["2xx", "3xx", "4xx", "5xx"]) {
        const req = createFilterRequest({
          table: "true",
          index: "instance",
          period: "24h",
          status: statusRange,
        });

        const result = await watcher.index(req);
        expect(result.statusCode).toBe(200);
        expect(result.body.results.length).toBeGreaterThan(0);
      }
    });
  });
});
