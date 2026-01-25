<!-- @format -->

# Watcher Integration Tests: Comprehensive Guide

## Overview

This guide explains the generalized watcher testing framework and how to write comprehensive edge case tests for all 12 watcher types in the Observatory system.

## Architecture

### Three-Layer Test Structure

1. **Core Tests** (`WatcherName.integration.ts`)
   - Standard index/view/stream endpoints
   - Happy path scenarios
   - Consistent across all watchers
   - ~50-100 tests per watcher

2. **Edge Case Tests** (`WatcherName.edge-cases.ts`)
   - Boundary conditions, invalid inputs, error scenarios
   - Oversized data, special characters, concurrent operations
   - ~150-200 tests per watcher
   - Use `testHelpers.ts` utilities for reusability

3. **Shared Utilities** (`edge-cases/testHelpers.ts`)
   - Generalized test helper functions
   - Pagination boundary testing
   - Period filtering testing
   - Invalid filter testing
   - Entry creation utilities

### Test Organization

```
packages/api/tests/integration/
├── watchers/
│   ├── RequestWatcher.integration.ts          (existing core tests)
│   ├── RequestWatcher.edge-cases.ts           (new edge cases)
│   ├── QueryWatcher.integration.ts
│   ├── QueryWatcher.edge-cases.ts
│   ├── ...12 watcher pairs...
│
├── edge-cases/
│   ├── testHelpers.ts                         (reusable utilities)
│   ├── categoryTemplates.ts                   (category-specific templates)
│
└── test-utils.ts                              (existing connection utilities)
```

## Using Test Helpers

### 1. Create Base Entry

```typescript
import { createBaseEntry, getTimestamp } from "../edge-cases/testHelpers";

const entry = createBaseEntry(
  "request:test-1", // UUID
  "request", // Type
  "express", // Watcher/package name
  {
    content: {
      status: "completed",
      duration: 100,
      metadata: { package: "express", method: "get" },
      data: {
        route: "/api/users",
        statusCode: 200,
        requestSize: 100,
        responseSize: 200,
      },
    },
  },
);
```

### 2. Create Filter Requests

```typescript
import { createFilterRequest } from "../edge-cases/testHelpers";

// Instance view with pagination
const req = createFilterRequest({
  table: "true",
  index: "instance",
  period: "24h",
  offset: "0",
  limit: "10",
});

// Graph data view
const graphReq = createFilterRequest({
  table: "false", // Graph mode
  period: "24h",
});
```

### 3. Test Pagination Boundaries

```typescript
import { testPaginationBoundaries } from "../edge-cases/testHelpers";

describe("Pagination", () => {
  it("should handle boundary conditions", async () => {
    const entries = Array.from({ length: 25 }, (_, i) =>
      createEntry(`entry:${i}`),
    );
    await database.insert(entries);

    await testPaginationBoundaries(
      watcher,
      database,
      entries,
      "request",
      (result, scenario) => {
        console.log(`Testing: ${scenario}`);
        expect(result.statusCode).toBe(200);
      },
    );
  });
});
```

### 4. Test Invalid Inputs

```typescript
import { testInvalidFilters } from "../edge-cases/testHelpers";

describe("Invalid Inputs", () => {
  it("should handle invalid filters gracefully", async () => {
    await testInvalidFilters(watcher, database, (result, scenario) => {
      console.log(`Testing invalid: ${scenario}`);
      expect(result.statusCode).toBeLessThan(500);
    });
  });
});
```

### 5. Create Oversized Entries

```typescript
import { createOversizedEntry } from "../edge-cases/testHelpers";

const largeEntry = createOversizedEntry(
  "request:large",
  "request",
  "express",
  "payload", // Field to oversized
  1024 * 100, // 100KB
);
```

### 6. Create Special Character Entries

```typescript
import { createSpecialCharacterEntry } from "../edge-cases/testHelpers";

const entry = createSpecialCharacterEntry(
  "request:special",
  "request",
  "express",
  "route", // Field
  "/api/🚀/ユーザー/<script>xss</script>", // Content with special chars
);
```

### 7. Create Error Entries

```typescript
import { createErrorEntry } from "../edge-cases/testHelpers";

// With stack trace
const entryWithStack = createErrorEntry(
  "request:error",
  "request",
  "express",
  "stack_trace",
);

// Without stack trace
const entryNoStack = createErrorEntry(
  "request:error",
  "request",
  "express",
  "missing_stack",
);
```

### 8. Test Concurrent Operations

```typescript
import { testConcurrentInsertions } from "../edge-cases/testHelpers";

describe("Concurrency", () => {
  it("should handle concurrent insertions", async () => {
    const baseEntry = createEntry("request:concurrent");
    const { inserted, errors } = await testConcurrentInsertions(
      database,
      baseEntry,
      10, // Number of concurrent operations
      0, // Delay between operations
    );

    expect(inserted).toBe(10);
    expect(errors).toHaveLength(0);
  });
});
```

### 9. Test Graph Data Formatting

```typescript
import { testGraphDataEdgeCases } from "../edge-cases/testHelpers";

describe("Graph Data", () => {
  it("should format graph data correctly", async () => {
    const entries = [
      /* ... */
    ];
    await database.insert(entries);

    await testGraphDataEdgeCases(
      watcher,
      database,
      entries,
      (result, scenario) => {
        console.log(`Graph scenario: ${scenario}`);
        expect(result.body).toHaveProperty("countFormattedData");
      },
    );
  });
});
```

### 10. Assert Entry Structure

```typescript
import { assertEntryStructure } from "../edge-cases/testHelpers";

const result = await watcher.index(req);
assertEntryStructure(result.body.results[0], "request", [
  "uuid",
  "type",
  "content",
  "created_at",
  "request_id",
]);
```

## Watcher-Specific Test Templates

### Duration-Based Watchers

**Applies to:** Query, Cache, Job, Mail, HTTPClient, Schedule

Use `durationWatcherEdgeCaseTemplate` for testing:

- Duration statistics (min/max/avg/p95)
- Zero-duration operations
- Decimal precision in durations
- Percentile calculations
- Duration filtering

```typescript
// Example from QueryWatcher edge cases:
describe("Duration Statistics", () => {
  it("should calculate p95 correctly", async () => {
    const entries = Array.from({ length: 100 }, (_, i) =>
      createBaseEntry(`query:${i}`, "query", "mysql2", {
        content: {
          duration: i + 1,
          // ... rest of entry
        },
      }),
    );
    await database.insert(entries);

    const req = createFilterRequest({ table: "false" });
    const result = await watcher.index(req);

    expect(parseFloat(result.body.p95)).toBeGreaterThan(90);
  });
});
```

### Log-Level Watchers

**Applies to:** Log, Exception

Use `logLevelWatcherEdgeCaseTemplate` for testing:

- Level filtering (debug/info/warn/error/fatal)
- Case-insensitive filtering
- Level statistics
- Exception type handling
- Exception grouping

```typescript
// Example from LogWatcher edge cases:
describe("Log Level Filtering", () => {
  it("should filter by level", async () => {
    const entries = [
      createBaseEntry("log:info", "log", "winston", {
        content: { data: { level: "info" } },
      }),
      createBaseEntry("log:error", "log", "winston", {
        content: { data: { level: "error" } },
      }),
    ];
    await database.insert(entries);

    const req = createFilterRequest({ level: "error" });
    const result = await watcher.index(req);

    expect(result.body.results).toHaveLength(1);
  });
});
```

### Metadata Watchers

**Applies to:** Model, View, Notification

Use `metadataWatcherEdgeCaseTemplate` for testing:

- Missing metadata fields
- Large metadata objects
- Nested structures
- Field filtering and search
- Cardinality and aggregation

```typescript
// Example from ModelWatcher edge cases:
describe("Metadata Field Handling", () => {
  it("should handle large metadata objects", async () => {
    const largeMetadata: Record<string, any> = {};
    for (let i = 0; i < 1000; i++) {
      largeMetadata[`field_${i}`] = `value_${i}`;
    }

    const entry = createBaseEntry("model:large", "model", "sequelize", {
      content: { data: largeMetadata },
    });
    await database.insert([entry]);

    const req = createFilterRequest({ table: "true" });
    const result = await watcher.index(req);

    expect(result.statusCode).toBe(200);
  });
});
```

### Package-Specific Watchers

**Applies to:** HTTPClient, Query, Job (with package variants)

Use `packageWatcherEdgeCaseTemplate` for testing:

- Package identification
- Version compatibility
- Method/operation variants
- Unknown package handling

```typescript
// Example from HTTPClientWatcher edge cases:
describe("Package Identification", () => {
  it("should identify different packages", async () => {
    const entries = [
      createBaseEntry("http:axios", "http", "axios", {
        /* ... */
      }),
      createBaseEntry("http:fetch", "http", "fetch", {
        /* ... */
      }),
      createBaseEntry("http:native", "http", "http", {
        /* ... */
      }),
    ];
    await database.insert(entries);

    const req = createFilterRequest({ table: "true" });
    const result = await watcher.index(req);

    expect(result.body.results).toHaveLength(3);
  });
});
```

### Connector Watchers

**Applies to:** Cache, Job, Schedule (with external services)

Use `connectorWatcherEdgeCaseTemplate` for testing:

- Connection lifecycle (open/close)
- Connection timeouts
- Retry and backoff logic
- Queue operations
- Batch failures

```typescript
// Example from JobWatcher edge cases:
describe("Retry Logic", () => {
  it("should track retry attempts", async () => {
    const entries = [
      createBaseEntry("job:attempt-1", "job", "bull", {
        content: { data: { attempt: 1, status: "retrying" } },
      }),
      createBaseEntry("job:attempt-3", "job", "bull", {
        content: { data: { attempt: 3, status: "success" } },
      }),
    ];
    await database.insert(entries);

    const req = createFilterRequest({ table: "true" });
    const result = await watcher.index(req);

    expect(result.body.results).toHaveLength(2);
  });
});
```

## Running Edge Case Tests

### Run All Edge Case Tests

```bash
npm test -- edge-cases
```

### Run Edge Cases for Specific Watcher

```bash
npm test -- RequestWatcher.edge-cases.ts
npm test -- QueryWatcher.edge-cases.ts
npm test -- CacheWatcher.edge-cases.ts
```

### Run Specific Test Suite

```bash
npm test -- RequestWatcher.edge-cases.ts -t "Pagination Boundary"
npm test -- RequestWatcher.edge-cases.ts -t "Special Characters"
```

### Run with Coverage

```bash
npm test -- --coverage edge-cases
```

## Edge Cases Checklist

### All Watchers Should Test

- [ ] Empty dataset handling
- [ ] Single entry handling
- [ ] Pagination boundaries (limit=0, offset > total, negative values)
- [ ] Period filtering (all supported periods, invalid periods)
- [ ] Invalid filter inputs (SQL injection, very long strings, special regex chars)
- [ ] Null/undefined fields
- [ ] Missing optional fields
- [ ] Data ordering and sorting
- [ ] Concurrent operations
- [ ] Error handling (graceful degradation)
- [ ] Related entries linking
- [ ] Graph data formatting
- [ ] Timestamp precision
- [ ] Grouping/aggregation modes

### Duration-Based Watchers (Query, Cache, Job, Mail, HTTPClient, Schedule)

- [ ] Zero-duration operations
- [ ] Very large duration values
- [ ] Negative duration values
- [ ] Decimal precision in durations
- [ ] P95 percentile calculation
- [ ] Min/max/avg statistics

### Log-Level Watchers (Log, Exception)

- [ ] All log levels (debug, info, warn, error, fatal)
- [ ] Case-insensitive level filtering
- [ ] Invalid level values
- [ ] Exception type variations
- [ ] Exception grouping
- [ ] Stack trace handling

### Metadata Watchers (Model, View, Notification)

- [ ] Missing metadata fields
- [ ] Large metadata objects (1000+ fields)
- [ ] Nested metadata structures
- [ ] Field filtering and search
- [ ] Cardinality and aggregation
- [ ] Case-insensitive searching

### Package-Specific Watchers (HTTPClient, Query, Job)

- [ ] Multiple package versions
- [ ] Unknown package names
- [ ] Package method variants
- [ ] Package-specific field handling

### Connector Watchers (Cache, Job, Schedule)

- [ ] Connection lifecycle events
- [ ] Connection timeouts
- [ ] Retry and backoff tracking
- [ ] Queue depth changes
- [ ] Batch operation failures

## Extending to New Watchers

### Step 1: Create Core Tests (`WatcherName.integration.ts`)

Copy from existing watcher (e.g., `RequestWatcher.integration.ts`):

- Setup/teardown (connections, watcher creation)
- Test for `index()` endpoint with instance/group modes
- Test for `view()` endpoint with related entries
- Test for `insertRedisStream()` method
- Test filtering and pagination

### Step 2: Identify Watcher Category

Match to one of the five categories:

1. Duration-based (Query, Cache, Job, Mail, HTTPClient, Schedule)
2. Log-level (Log, Exception)
3. Metadata (Model, View, Notification)
4. Package-specific (HTTPClient, Query, Job)
5. Connector (Cache, Job, Schedule)

### Step 3: Create Edge Case Tests (`WatcherName.edge-cases.ts`)

1. Copy appropriate template from `categoryTemplates.ts`
2. Customize template for watcher-specific fields
3. Add universal tests from RequestWatcher edge cases:
   - Pagination boundaries
   - Invalid filters
   - Special characters
   - Oversized data
   - Error scenarios
   - Empty data handling

### Step 4: Import Test Helpers

```typescript
import {
  createBaseEntry,
  createFilterRequest,
  testPaginationBoundaries,
  testInvalidFilters,
  createOversizedEntry,
  createSpecialCharacterEntry,
  testConcurrentInsertions,
  // ... other utilities
} from "../edge-cases/testHelpers";
```

### Step 5: Run Tests

```bash
npm test -- QueryWatcher.edge-cases.ts
```

## Example: Adding Tests to QueryWatcher

```typescript
// packages/api/tests/integration/watchers/QueryWatcher.edge-cases.ts

import {
  testPaginationBoundaries,
  createBaseEntry,
} from "../edge-cases/testHelpers";

describe("QueryWatcher Edge Cases", () => {
  // Duration-specific tests (from template)
  describe("Duration Statistics", () => {
    it("should calculate p95 for SQL queries", async () => {
      const entries = Array.from({ length: 100 }, (_, i) =>
        createBaseEntry(`query:${i}`, "query", "mysql2", {
          content: {
            status: "completed",
            duration: Math.random() * 1000, // Random 0-1000ms
            metadata: { package: "mysql2", method: "query" },
            data: { sql: `SELECT * FROM users LIMIT ${i}` },
          },
        }),
      );

      await database.insert(entries);

      const req = createFilterRequest({ table: "false" });
      const result = await watcher.index(req);

      expect(result.body.p95).toBeDefined();
    });
  });

  // Universal tests
  describe("Pagination", () => {
    it("should handle pagination boundaries", async () => {
      const entries = Array.from({ length: 50 }, (_, i) =>
        createBaseEntry(`query:${i}`, "query", "mysql2", {
          content: {
            status: i % 5 === 0 ? "failed" : "completed",
            duration: 50 + i,
            metadata: { package: "mysql2", method: "query" },
            data: { sql: `SELECT * FROM table${i}` },
          },
        }),
      );

      await database.insert(entries);

      await testPaginationBoundaries(watcher, database, entries, "query");
    });
  });

  // Package-specific tests (from template)
  describe("Database Package Handling", () => {
    it("should handle MySQL2 vs PostgreSQL differences", async () => {
      const entries = [
        createBaseEntry("query:mysql", "query", "mysql2", {
          content: {
            metadata: { package: "mysql2", method: "query" },
            data: { sql: "SELECT * FROM users", dialect: "mysql" },
          },
        }),
        createBaseEntry("query:pg", "query", "pg", {
          content: {
            metadata: { package: "pg", method: "query" },
            data: { sql: "SELECT * FROM users", dialect: "postgresql" },
          },
        }),
      ];

      await database.insert(entries);

      const req = createFilterRequest({ table: "true", index: "group" });
      const result = await watcher.index(req);

      expect(result.statusCode).toBe(200);
    });
  });
});
```

## Best Practices

1. **Use factories for entry creation**: Always use `createBaseEntry()` with custom overrides rather than manually constructing entries

2. **Test both modes**: Always test both `index` mode (instance and group) and graph mode (`table: false`)

3. **Use descriptive UUIDs**: Include test purpose in UUID (`request:pagination-boundary-1` vs `request:1`)

4. **Verify count accuracy**: When inserting data, always verify the returned count matches expected total

5. **Test filtering impact**: When testing filters, insert control data that should NOT match the filter

6. **Verify edge case isolation**: Edge case tests should not interfere with each other; use `resetAll()` in beforeEach

7. **Document expected behavior**: Include comments about what behavior you're testing and why

8. **Check for data loss**: In concurrency tests, verify no data is lost by comparing inserted count with database query

9. **Use consistent patterns**: Follow the RequestWatcher.edge-cases.ts structure for new watchers

10. **Keep tests focused**: Each `it()` block should test one specific edge case

## Common Patterns

### Testing Status Code Ranges

```typescript
it("should filter by status code range", async () => {
  const entries = [
    ...Array.from({ length: 3 }, (_, i) =>
      createEntry({ statusCode: 200 + i }),
    ),
    ...Array.from({ length: 2 }, (_, i) =>
      createEntry({ statusCode: 400 + i }),
    ),
  ];
  await database.insert(entries);

  const req = createFilterRequest({ status: "4xx" });
  const result = await watcher.index(req);

  expect(
    result.body.results.every((r) => r.content.data.statusCode >= 400),
  ).toBe(true);
});
```

### Testing Aggregation

```typescript
it("should aggregate correctly in group mode", async () => {
  const entries = [
    createEntry({ key: "same-key", value: 10 }),
    createEntry({ key: "same-key", value: 20 }),
    createEntry({ key: "same-key", value: 30 }),
  ];
  await database.insert(entries);

  const req = createFilterRequest({ index: "group" });
  const result = await watcher.index(req);

  // Should be 1 group with count 3
  expect(result.body.results).toHaveLength(1);
  expect(result.body.count).toBe("3");
});
```

### Testing Time-Based Filtering

```typescript
it("should filter by period correctly", async () => {
  const entry = createEntry({
    /* created just now */
  });
  await database.insert([entry]);

  // Should appear in all periods since it's recent
  for (const period of ["1h", "24h", "7d", "30d"]) {
    const req = createFilterRequest({ period });
    const result = await watcher.index(req);

    expect(result.body.results.length).toBeGreaterThan(0);
  }
});
```

## Troubleshooting

### Test Fails: "Cannot log after tests are done"

**Cause**: Watcher not properly stopped before test cleanup
**Solution**: Ensure `afterEach` awaits `watcher.stop()`

```typescript
afterEach(async () => {
  await watcher.stop(); // Must be awaited
});
```

### Test Fails: "The used SELECT statements have a different number of columns"

**Cause**: UNION query with mismatched column counts
**Solution**: Verify all SELECT statements in graph data query have same number of columns

### Test Fails: "Timeout waiting for data"

**Cause**: Redis stream not being populated by watcher
**Solution**: Ensure watcher was registered with `registerWatcher(watcher)` in test setup

```typescript
beforeEach(async () => {
  watcher = new GenericWatcher(/* ... */);
  registerWatcher(watcher); // Don't forget this!
});
```

### Test Fails: "Type mismatch in content.data"

**Cause**: Entry type string doesn't match actual watcher type
**Solution**: Check `WATCHER_CONFIGS` for correct type name

```typescript
// Wrong:
createBaseEntry("log:1", "logging", "winston" /* ... */);

// Correct:
createBaseEntry("log:1", "log", "winston" /* ... */);
```

---

**Last Updated**: January 25, 2026  
**Framework Version**: 1.0.0
