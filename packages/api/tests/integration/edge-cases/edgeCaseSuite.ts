/**
 * Reusable Edge-Case Test Suite Factory
 *
 * Generates common edge-case describe blocks for any watcher type.
 * Each watcher test file calls `addEdgeCaseTests(...)` to get
 * pagination, concurrent insertion, graph data, special character,
 * and invalid filter tests.
 *
 * @format
 */

import type Database from "../../../src/core/databases/sql/Base";
import type GenericWatcher from "../../../src/core/watchers/GenericWatcher";
import type { RedisClientType } from "redis";
import {
  createBaseEntry,
  createFilterRequest,
  testPaginationBoundaries,
  testPeriodBoundaries,
  testInvalidFilters,
  testConcurrentInsertions,
  testGraphDataEdgeCases,
  createSpecialCharacterEntry,
  createOversizedEntry,
  createErrorEntry,
  getTimestamp,
} from "./testHelpers";

/**
 * Configuration for the edge-case suite.
 */
export interface EdgeCaseSuiteConfig {
  /** Watcher type name (e.g. "cache", "job", "log") */
  watcherType: string;
  /** The entry `type` field in the DB (usually same as watcherType) */
  entryType: string;
  /** The package name used in metadata (e.g. "redis", "bull", "winston") */
  packageName: string;
  /** Graph metric keys from watcherConfig (e.g. ["hits", "writes", "misses"]) */
  graphMetrics: readonly string[];
  /** A function that creates a valid entry for this watcher */
  createEntry: (uuid: string, overrides?: any) => any;
}

/**
 * Adds edge-case describe blocks to the current test file.
 *
 * Call this inside your top-level `describe(...)` block, passing
 * getter functions that return the live watcher/database instances
 * (since they're recreated in beforeEach).
 */
export function addEdgeCaseTests(
  config: EdgeCaseSuiteConfig,
  getWatcher: () => GenericWatcher,
  getDatabase: () => Database,
) {
  const { watcherType, entryType, packageName, graphMetrics, createEntry } =
    config;

  // -----------------------------------------------------------------------
  // Pagination
  // -----------------------------------------------------------------------
  describe("Edge Cases: Pagination Boundaries", () => {
    it("should handle empty dataset pagination", async () => {
      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
        offset: "0",
        limit: "10",
      });
      const result = await getWatcher().indexTable(req);
      expect(result.statusCode).toBe(200);
      expect(result.body.results).toEqual([]);
    });

    it("should handle offset beyond available data", async () => {
      await getDatabase().insert([
        createEntry(`${entryType}:pag-1`),
        createEntry(`${entryType}:pag-2`),
      ]);

      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
        offset: "100",
        limit: "10",
      });
      const result = await getWatcher().indexTable(req);
      expect(result.statusCode).toBe(200);
      expect(result.body.results).toHaveLength(0);
    });

    it("should handle very large limit", async () => {
      await getDatabase().insert([
        createEntry(`${entryType}:pag-big-1`),
        createEntry(`${entryType}:pag-big-2`),
        createEntry(`${entryType}:pag-big-3`),
      ]);

      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
        offset: "0",
        limit: "999999",
      });
      const result = await getWatcher().indexTable(req);
      expect(result.statusCode).toBe(200);
      expect(result.body.results.length).toBeGreaterThanOrEqual(3);
    });
  });

  // -----------------------------------------------------------------------
  // Concurrent Insertions
  // -----------------------------------------------------------------------
  describe("Edge Cases: Concurrent Insertions", () => {
    it("should handle concurrent database inserts without errors", async () => {
      const baseEntry = createBaseEntry(
        `${entryType}:concurrent`,
        entryType,
        packageName,
      );

      const { inserted, errors } = await testConcurrentInsertions(
        getDatabase(),
        baseEntry,
        10,
        0,
      );

      expect(errors).toHaveLength(0);
      expect(inserted).toBe(10);
    });

    it("should handle rapid sequential inserts", async () => {
      const entries = Array.from({ length: 20 }, (_, i) =>
        createEntry(`${entryType}:rapid-${i}`),
      );

      await getDatabase().insert(entries);

      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
        offset: "0",
        limit: "50",
      });
      const result = await getWatcher().indexTable(req);
      expect(result.statusCode).toBe(200);
      expect(result.body.results.length).toBeGreaterThanOrEqual(20);
    });
  });

  // -----------------------------------------------------------------------
  // Graph Data
  // -----------------------------------------------------------------------
  describe("Edge Cases: Graph Data", () => {
    it("should return graph structure with empty data", async () => {
      const req = createFilterRequest({ table: "false", period: "24h" });
      const result = await getWatcher().indexGraph(req);

      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty("countFormattedData");
      expect(result.body).toHaveProperty("durationFormattedData");
      expect(result.body).toHaveProperty("count");
    });

    it("should return correct indexCount fields for watcher metrics", async () => {
      // Insert some data so aggregates are computed
      await getDatabase().insert([
        createEntry(`${entryType}:graph-1`),
        createEntry(`${entryType}:graph-2`),
        createEntry(`${entryType}:graph-3`),
      ]);

      const req = createFilterRequest({ table: "false", period: "24h" });
      const result = await getWatcher().indexGraph(req);

      expect(result.statusCode).toBe(200);

      // Every watcher must have the first 3 indexCount fields
      expect(result.body).toHaveProperty("indexCountOne");
      expect(result.body).toHaveProperty("indexCountTwo");
      expect(result.body).toHaveProperty("indexCountThree");

      // Duration stats
      expect(result.body).toHaveProperty("shortest");
      expect(result.body).toHaveProperty("longest");
      expect(result.body).toHaveProperty("average");
    });

    it("should return graph data with mixed statuses", async () => {
      await getDatabase().insert([
        createEntry(`${entryType}:graph-ok`),
        createEntry(`${entryType}:graph-fail`),
      ]);

      const req = createFilterRequest({ table: "false", period: "24h" });
      const result = await getWatcher().indexGraph(req);
      expect(result.statusCode).toBe(200);
      expect(result.body).toHaveProperty("count");
    });
  });

  // -----------------------------------------------------------------------
  // Invalid Filters
  // -----------------------------------------------------------------------
  describe("Edge Cases: Invalid Filters", () => {
    it("should handle SQL injection in query parameter", async () => {
      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
        q: "'; DROP TABLE observatory_entries;--",
      });

      const result = await getWatcher().indexTable(req);
      // Should not crash — may return empty or all entries
      expect(result.statusCode).toBe(200);
    });

    it("should handle very long query string", async () => {
      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
        q: "a".repeat(5000),
      });

      const result = await getWatcher().indexTable(req);
      expect(result.statusCode).toBe(200);
    });

    it("should handle special regex characters in query", async () => {
      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
        q: ".*[^a-z]\\d+",
      });

      const result = await getWatcher().indexTable(req);
      expect(result.statusCode).toBe(200);
    });
  });

  // -----------------------------------------------------------------------
  // Period Filtering
  // -----------------------------------------------------------------------
  describe("Edge Cases: Period Filtering", () => {
    it("should return data for all valid period values", async () => {
      await getDatabase().insert([createEntry(`${entryType}:period-test`)]);

      for (const period of ["1h", "24h", "7d", "14d", "30d"]) {
        const req = createFilterRequest({
          table: "true",
          index: "instance",
          period,
          offset: "0",
          limit: "10",
        });
        const result = await getWatcher().indexTable(req);
        expect(result.statusCode).toBe(200);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Special Characters
  // -----------------------------------------------------------------------
  describe("Edge Cases: Special Characters & Encoding", () => {
    it("should store and retrieve entries with unicode in data fields", async () => {
      const entry = createBaseEntry(
        `${entryType}:unicode`,
        entryType,
        packageName,
        {
          content: {
            status: "completed",
            duration: 100,
            metadata: { package: packageName },
            data: { value: '😀🚀 <script>alert("xss")</script>' },
          },
        },
      );

      await getDatabase().insert([entry]);

      const req = createFilterRequest({
        table: "true",
        index: "instance",
        period: "24h",
      });
      const result = await getWatcher().indexTable(req);
      expect(result.statusCode).toBe(200);
      expect(result.body.results.length).toBeGreaterThanOrEqual(1);
    });
  });
}
