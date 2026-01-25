/**
 * Generalized Test Helpers for Watcher Edge Cases
 *
 * Provides reusable utilities for testing boundary conditions, invalid inputs,
 * pagination, period filtering, and error scenarios across all watcher types.
 *
 * @format
 */

import type Database from "../../../src/core/databases/sql/Base";
import type GenericWatcher from "../../../src/core/watchers/GenericWatcher";
import type { RedisClientType } from "redis";

/**
 * Edge case categories for parameterized testing
 */
export enum EdgeCaseCategory {
  BOUNDARY = "boundary",
  INVALID_INPUT = "invalid_input",
  EMPTY_DATA = "empty_data",
  SPECIAL_CHARACTERS = "special_characters",
  OVERSIZED = "oversized",
  MALFORMED = "malformed",
  CONCURRENT = "concurrent",
  PERIOD = "period",
  PAGINATION = "pagination",
}

/**
 * Generalized entry structure for creating test data
 */
export interface EdgeCaseEntry {
  uuid: string;
  type: string;
  content: {
    status: "completed" | "failed";
    duration?: number;
    metadata: Record<string, any>;
    data: Record<string, any>;
    location?: { file: string; line: string };
    error?: { message: string; name: string; stack?: string };
  };
  created_at: string;
  request_id: string;
  job_id: string;
  schedule_id: string;
}

/**
 * Filter structure for watcher queries
 */
export interface WatcherFilter {
  offset?: number | string;
  limit?: number | string;
  period?: string;
  query?: string;
  isTable?: boolean | string;
  index?: "instance" | "group" | string;
  key?: string;
  status?: string;
  [key: string]: any;
}

/**
 * Timestamp formatter (matches patcher output format)
 */
export const getTimestamp = (): string =>
  new Date().toISOString().replace("T", " ").substring(0, 19);

/**
 * Create a base entry with all required fields
 */
export const createBaseEntry = (
  uuid: string,
  type: string,
  watcherType: string,
  overrides: Partial<EdgeCaseEntry> = {},
): EdgeCaseEntry => ({
  uuid,
  type,
  content: {
    status: "completed",
    duration: 100,
    metadata: { package: watcherType, method: "test" },
    data: {},
    location: { file: "test", line: "0" },
    ...overrides.content,
  },
  created_at: getTimestamp(),
  request_id: uuid.replace(type + ":", "req-"),
  job_id: "null",
  schedule_id: "null",
  ...overrides,
});

/**
 * Create a mock filter request
 */
export const createFilterRequest = (
  overrides: Partial<WatcherFilter> = {},
): any => ({
  query: {
    table: "true",
    index: "instance",
    period: "24h",
    offset: "0",
    limit: "10",
    ...overrides,
  },
  params: {},
  body: {},
  requestData: {},
});

/**
 * Test pagination boundary conditions
 */
export const testPaginationBoundaries = async (
  watcher: GenericWatcher,
  database: Database,
  entries: EdgeCaseEntry[],
  watcherType: string,
  testFn?: (result: any, scenario: string) => void,
) => {
  const scenarios = [
    {
      name: "limit=0 (empty result)",
      filter: { offset: "0", limit: "0" },
      expectCount: 0,
    },
    {
      name: "offset >= total count",
      filter: { offset: String(entries.length + 10), limit: "10" },
      expectCount: 0,
    },
    {
      name: "negative offset (should be 0)",
      filter: { offset: "-5", limit: "10" },
      expectCount: Math.min(10, entries.length),
    },
    {
      name: "negative limit (invalid)",
      filter: { offset: "0", limit: "-10" },
      expectCount: 0, // Should handle gracefully
    },
    {
      name: "non-integer values",
      filter: { offset: "2.5", limit: "3.7" },
      expectCount: undefined, // May error or round
    },
    {
      name: "very large limit",
      filter: { offset: "0", limit: "999999" },
      expectCount: entries.length,
    },
    {
      name: "exact boundary (offset + limit = total)",
      filter: { offset: String(entries.length - 2), limit: "2" },
      expectCount: 2,
    },
  ];

  for (const scenario of scenarios) {
    const req = createFilterRequest({
      table: "true",
      index: "instance",
      period: "24h",
      ...scenario.filter,
    });

    try {
      const result = await watcher.index(req);
      if (testFn) testFn(result, scenario.name);
    } catch (error) {
      // Some scenarios may error - document expected behavior
      console.warn(
        `Pagination scenario "${scenario.name}" threw:`,
        (error as Error).message,
      );
    }
  }
};

/**
 * Test period filtering edge cases
 */
export const testPeriodBoundaries = async (
  watcher: GenericWatcher,
  database: Database,
  entries: EdgeCaseEntry[],
  testFn?: (result: any, period: string) => void,
) => {
  const periods = ["1h", "24h", "7d", "14d", "30d"];

  for (const period of periods) {
    const req = createFilterRequest({
      table: "true",
      index: "instance",
      period,
      limit: 1000,
    });

    const result = await watcher.index(req);
    if (testFn) testFn(result, period);
  }
};

/**
 * Test invalid filter inputs
 */
export const testInvalidFilters = async (
  watcher: GenericWatcher,
  database: Database,
  testFn?: (result: any, scenario: string) => void,
) => {
  const scenarios = [
    {
      name: "null period",
      filter: { period: null },
    },
    {
      name: "invalid period",
      filter: { period: "99d" },
    },
    {
      name: "null index",
      filter: { index: null },
    },
    {
      name: "invalid index",
      filter: { index: "unknown" },
    },
    {
      name: "empty query string",
      filter: { query: "" },
    },
    {
      name: "sql injection attempt",
      filter: { query: "'; DROP TABLE--" },
    },
    {
      name: "very long query string",
      filter: { query: "a".repeat(10000) },
    },
    {
      name: "special regex characters",
      filter: { query: ".*[^a-z]\\d+" },
    },
  ];

  for (const scenario of scenarios) {
    // Filter out null values to avoid overriding defaults
    const filtered = Object.fromEntries(
      Object.entries(scenario.filter).filter(([, v]) => v !== null),
    );

    const req = createFilterRequest({
      table: "true",
      index: "instance" as const,
      period: "24h" as const,
      ...filtered,
    });

    try {
      const result = await watcher.index(req);
      if (testFn) testFn(result, scenario.name);
    } catch (error) {
      console.warn(
        `Invalid filter "${scenario.name}" threw:`,
        (error as Error).message,
      );
    }
  }
};

/**
 * Test oversized data handling
 */
export const createOversizedEntry = (
  uuid: string,
  type: string,
  watcherType: string,
  dataField: string = "payload",
  sizeBytes: number = 1024 * 100,
): EdgeCaseEntry => {
  const oversizedData = "x".repeat(sizeBytes);
  return createBaseEntry(uuid, type, watcherType, {
    content: {
      status: "completed",
      duration: 100,
      metadata: { package: watcherType },
      data: {
        [dataField]: oversizedData,
      },
    },
  });
};

/**
 * Test special characters in data fields
 */
export const createSpecialCharacterEntry = (
  uuid: string,
  type: string,
  watcherType: string,
  field: string = "route",
  specialChars: string = '😀🚀\n\t\0<script>alert("xss")</script>',
): EdgeCaseEntry => {
  return createBaseEntry(uuid, type, watcherType, {
    content: {
      status: "completed",
      duration: 100,
      metadata: { package: watcherType },
      data: {
        [field]: specialChars,
      },
    },
  });
};

/**
 * Test malformed or missing required fields
 */
export const createMalformedEntry = (
  uuid: string,
  type: string,
  issues: string[] = [],
): EdgeCaseEntry => {
  const entry: any = createBaseEntry(uuid, type, "test", {});

  // Apply specific issues
  for (const issue of issues) {
    switch (issue) {
      case "missing_status":
        delete entry.content.status;
        break;
      case "missing_duration":
        entry.content.duration = undefined;
        break;
      case "null_metadata":
        entry.content.metadata = null;
        break;
      case "invalid_duration_type":
        entry.content.duration = "not-a-number";
        break;
      case "missing_data":
        entry.content.data = null;
        break;
      case "invalid_created_at":
        entry.created_at = "not-a-timestamp";
        break;
      case "missing_uuid":
        entry.uuid = null;
        break;
    }
  }

  return entry;
};

/**
 * Create entries with error scenarios
 */
export const createErrorEntry = (
  uuid: string,
  type: string,
  watcherType: string,
  errorType:
    | "stack_trace"
    | "missing_stack"
    | "null_error"
    | "circular_error" = "stack_trace",
): EdgeCaseEntry => {
  const baseEntry = createBaseEntry(uuid, type, watcherType, {
    content: {
      status: "failed",
      duration: 50,
      metadata: { package: watcherType },
      data: {},
    },
  });

  switch (errorType) {
    case "stack_trace":
      baseEntry.content.error = {
        name: "TypeError",
        message: 'Cannot read property "foo" of undefined',
        stack: `TypeError: Cannot read property "foo" of undefined
    at testFunction (file.ts:10:20)
    at processRequest (app.ts:50:15)
    at Layer.handle [as handle_request] (express/lib/router/layer.js:95:5)`,
      };
      break;
    case "missing_stack":
      baseEntry.content.error = {
        name: "CustomError",
        message: "Something went wrong",
      };
      break;
    case "null_error":
      baseEntry.content.error = null as any;
      break;
    case "circular_error":
      baseEntry.content.error = {
        name: "CircularError",
        message: "Error with circular ref",
        stack: "[Circular]",
      };
      break;
  }

  return baseEntry;
};

/**
 * Create related entries for testing relationships
 */
export const createRelatedEntries = (
  parentId: string,
  parentType: string,
  relatedTypes: Array<{ type: string; count: number }>,
): EdgeCaseEntry[] => {
  const entries: EdgeCaseEntry[] = [];

  for (const related of relatedTypes) {
    for (let i = 0; i < related.count; i++) {
      entries.push(
        createBaseEntry(
          `${related.type}:${parentId}-${i}`,
          related.type,
          related.type,
          {
            request_id: parentId,
          },
        ),
      );
    }
  }

  return entries;
};

/**
 * Test concurrent insertions for race conditions
 */
export const testConcurrentInsertions = async (
  database: Database,
  baseEntry: EdgeCaseEntry,
  concurrencyLevel: number = 10,
  delay: number = 0,
): Promise<{ inserted: number; errors: Error[] }> => {
  const errors: Error[] = [];
  const entries: EdgeCaseEntry[] = [];

  // Create entries with unique UUIDs
  for (let i = 0; i < concurrencyLevel; i++) {
    entries.push({
      ...baseEntry,
      uuid: `${baseEntry.uuid}:${i}`,
    });
  }

  // Insert concurrently
  const promises = entries.map((entry, index) => {
    const delayedInsert = () => {
      return new Promise<void>((resolve) => {
        setTimeout(async () => {
          try {
            await database.insert([entry]);
            resolve();
          } catch (error) {
            errors.push(error as Error);
            resolve(); // Don't fail, just track error
          }
        }, delay * index);
      });
    };

    return delayedInsert();
  });

  await Promise.all(promises);

  return { inserted: entries.length - errors.length, errors };
};

/**
 * Test graph data formatting edge cases
 */
export const testGraphDataEdgeCases = async (
  watcher: GenericWatcher,
  database: Database,
  entries: EdgeCaseEntry[],
  testFn?: (result: any, scenario: string) => void,
) => {
  const scenarios = [
    { name: "empty data", entries: [] },
    { name: "single entry", entries: entries.slice(0, 1) },
    {
      name: "many entries",
      entries: entries.slice(0, Math.min(100, entries.length)),
    },
    {
      name: "all failed",
      entries: entries.map((e) => ({
        ...e,
        content: { ...e.content, status: "failed" },
      })),
    },
    {
      name: "mixed durations",
      entries: entries.map((e, i) => ({
        ...e,
        content: { ...e.content, duration: i * 50 },
      })),
    },
  ];

  for (const scenario of scenarios) {
    await database.insert(scenario.entries);

    const req = createFilterRequest({
      table: "false", // Graph mode
      period: "24h",
    });

    try {
      const result = await watcher.index(req);
      if (testFn) testFn(result, scenario.name);
    } catch (error) {
      console.warn(
        `Graph data scenario "${scenario.name}" threw:`,
        (error as Error).message,
      );
    }
  }
};

/**
 * Assert entry structure validity
 */
export const assertEntryStructure = (
  entry: any,
  expectedType: string,
  requiredFields: string[] = ["uuid", "type", "content", "created_at"],
) => {
  for (const field of requiredFields) {
    expect(entry).toHaveProperty(field);
  }

  if (expectedType) {
    expect(entry.type).toBe(expectedType);
  }

  expect(entry.content).toHaveProperty("status");
  expect(entry.content).toHaveProperty("metadata");
  expect(entry.content).toHaveProperty("data");
};

/**
 * Compare entry fields with expected values
 */
export const compareEntryData = (
  actual: EdgeCaseEntry,
  expected: Partial<EdgeCaseEntry>,
  ignorePaths: string[] = [],
) => {
  const paths = [
    "uuid",
    "type",
    "content.status",
    "content.duration",
    "content.metadata.package",
    "request_id",
  ];

  for (const path of paths) {
    if (ignorePaths.includes(path)) continue;

    const [first, ...rest] = path.split(".");
    let actualValue: any = actual;
    let expectedValue: any = expected;

    for (const part of [first, ...rest]) {
      actualValue = actualValue?.[part];
      expectedValue = expectedValue?.[part];
    }

    if (expectedValue !== undefined) {
      expect(actualValue).toEqual(expectedValue);
    }
  }
};

/**
 * Generate test data sets for parameterized testing
 */
export const generateTestDataSet = (
  baseEntry: EdgeCaseEntry,
  scenarios: Array<{
    name: string;
    modifications: (entry: EdgeCaseEntry) => EdgeCaseEntry;
    expectedBehavior?: string;
  }>,
) => {
  return scenarios.map((scenario) => ({
    scenario: scenario.name,
    entry: scenario.modifications(JSON.parse(JSON.stringify(baseEntry))),
    expectedBehavior: scenario.expectedBehavior || "should handle gracefully",
  }));
};
