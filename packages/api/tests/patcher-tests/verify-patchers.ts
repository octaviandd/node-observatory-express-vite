/**
 * End-to-end patcher verification script.
 *
 * Starts the with-express server (which activates Observatory patchers),
 * hits the /stress/<category> route to exercise packages, waits for the
 * watcher ingest loop to flush entries, then queries the Observatory API
 * endpoints to verify entries exist with correct data shapes.
 *
 * The full pipeline tested:
 *   patcher → Redis stream → watcher ingest → MySQL → Observatory API → HTTP response
 *
 * Usage (inside Docker container):
 *   npx ts-node --transpile-only verify-patchers.ts --category cache
 *   npx ts-node --transpile-only verify-patchers.ts --category cache --package redis
 *
 * @format
 */

import http from "http";
import { spawn, ChildProcess } from "child_process";
import path from "path";

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);

function strFlag(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

const CATEGORY = strFlag("category");
const FILTER_PACKAGE = strFlag("package");

if (!CATEGORY) {
  console.error("Usage: verify-patchers.ts --category <cache|log|query|...>");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PORT = 9999;
const BASE = `http://localhost:${PORT}`;
const SERVER_DIR = path.resolve(__dirname, "../../../examples/with-express");
const STARTUP_TIMEOUT = 45_000;
const FLUSH_WAIT = 12_000;

// Maps category → stress route path (for triggering package usage)
const STRESS_ROUTE: Record<string, string> = {
  cache: "cache",
  log: "log",
  logger: "log",
  query: "query",
  model: "model",
  job: "job",
  schedule: "schedule",
  mail: "mail",
  notification: "notification",
  http: "http",
};

// Maps category → Observatory API path (from routes.ts ROUTE_CONFIG)
const API_PATH: Record<string, string> = {
  cache: "cache",
  log: "logs",
  logger: "logs",
  query: "queries",
  model: "models",
  job: "jobs",
  schedule: "schedules",
  mail: "mails",
  notification: "notifications",
  http: "https",
};

// ---------------------------------------------------------------------------
// Assertions — what fields must exist in each entry's content
// ---------------------------------------------------------------------------
interface FieldAssertion {
  path: string;
  check: "exists" | "string" | "number" | "in";
  values?: string[];
}

const LOG_ASSERTIONS: FieldAssertion[] = [
  { path: "metadata.package", check: "string" },
  { path: "metadata.level", check: "string" },
  { path: "status", check: "in", values: ["completed", "failed"] },
  { path: "data.message", check: "exists" },
];

const ASSERTIONS: Record<string, FieldAssertion[]> = {
  cache: [
    { path: "metadata.package", check: "string" },
    { path: "metadata.command", check: "string" },
    { path: "status", check: "in", values: ["completed", "failed"] },
    { path: "duration", check: "number" },
    { path: "data.key", check: "exists" },
  ],
  log: LOG_ASSERTIONS,
  logger: LOG_ASSERTIONS,
  query: [
    { path: "metadata.package", check: "string" },
    { path: "status", check: "in", values: ["completed", "failed"] },
    { path: "duration", check: "number" },
  ],
  model: [
    { path: "metadata.package", check: "string" },
    { path: "status", check: "in", values: ["completed", "failed"] },
  ],
  job: [
    { path: "metadata.package", check: "string" },
    { path: "status", check: "in", values: ["completed", "failed"] },
  ],
  schedule: [
    { path: "metadata.package", check: "string" },
    { path: "status", check: "in", values: ["completed", "failed"] },
  ],
  mail: [
    { path: "metadata.package", check: "string" },
    { path: "status", check: "in", values: ["completed", "failed"] },
  ],
  notification: [
    { path: "metadata.package", check: "string" },
    { path: "status", check: "in", values: ["completed", "failed"] },
  ],
  http: [
    { path: "status", check: "in", values: ["completed", "failed"] },
    { path: "duration", check: "number" },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getNestedValue(obj: any, dotPath: string): any {
  return dotPath.split(".").reduce((o, k) => o?.[k], obj);
}

function httpGet(url: string, timeout: number): Promise<{ status: number; body: string }> {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout }, (res) => {
      let body = "";
      res.on("data", (chunk: Buffer) => (body += chunk.toString()));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on("error", (err) => resolve({ status: 0, body: err.message }));
    req.on("timeout", () => { req.destroy(); resolve({ status: 0, body: "timeout" }); });
  });
}

function startServer(): Promise<{ proc: ChildProcess; ok: boolean; output: string }> {
  return new Promise((resolve) => {
    let output = "";
    let resolved = false;

    const proc = spawn(
      "node",
      ["--trace-warnings", "-r", "ts-node/esm", "index.ts"],
      {
        cwd: SERVER_DIR,
        env: {
          ...process.env,
          TS_NODE_TRANSPILE_ONLY: "1",
          NODE_NO_WARNINGS: "1",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    const finish = (ok: boolean) => {
      if (resolved) return;
      resolved = true;
      resolve({ proc, ok, output });
    };

    proc.stdout?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
      if (output.includes("http://localhost:")) finish(true);
    });
    proc.stderr?.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    proc.on("exit", () => finish(false));
    proc.on("error", () => finish(false));

    setTimeout(() => finish(false), STARTUP_TIMEOUT);
  });
}

function killServer(proc: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (!proc.pid || proc.killed) { resolve(); return; }
    proc.on("exit", () => resolve());
    proc.kill("SIGTERM");
    setTimeout(() => { if (!proc.killed) proc.kill("SIGKILL"); resolve(); }, 5000);
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const stressRoute = STRESS_ROUTE[CATEGORY!];
  const apiPath = API_PATH[CATEGORY!];

  if (!stressRoute || !apiPath) {
    console.error(`Unknown category: ${CATEGORY}`);
    console.error(`Valid: ${Object.keys(STRESS_ROUTE).join(", ")}`);
    process.exit(1);
  }

  console.log(`\n=== Patcher Verification: ${CATEGORY} ===\n`);

  // 1. Start the server
  console.log(`  Starting server...`);
  const server = await startServer();
  if (!server.ok) {
    console.error(`  Server failed to start.`);
    console.error(`  Output:\n${server.output.slice(-500)}`);
    await killServer(server.proc);
    process.exit(1);
  }
  console.log(`  Server ready on port ${PORT}`);

  // 2. Hit the stress route to exercise packages
  const stressUrl = `${BASE}/stress/${stressRoute}`;
  console.log(`  Hitting ${stressUrl}...`);
  const { status: stressStatus, body: stressBody } = await httpGet(stressUrl, 60_000);

  if (stressStatus !== 200) {
    console.error(`  Stress route returned HTTP ${stressStatus}: ${stressBody}`);
    await killServer(server.proc);
    process.exit(1);
  }

  let routeResults: string[] = [];
  try {
    const json = JSON.parse(stressBody);
    routeResults = json.results ?? [];
    console.log(`  Route response: ${routeResults.length} results`);
    for (const r of routeResults) console.log(`    ${r}`);
  } catch {
    console.log(`  Could not parse response body`);
  }

  // 3. Wait for the watcher ingest loop to flush entries to MySQL
  console.log(`  Waiting ${FLUSH_WAIT / 1000}s for entries to flush...`);
  await new Promise((r) => setTimeout(r, FLUSH_WAIT));

  // 4. Query the Observatory API to get entries
  const apiUrl = `${BASE}/ui/api/${apiPath}/table?table=true&index=instance&period=24h`;
  console.log(`  Querying Observatory API: ${apiUrl}`);
  const { status: apiStatus, body: apiBody } = await httpGet(apiUrl, 30_000);

  if (apiStatus !== 200) {
    console.error(`  Observatory API returned HTTP ${apiStatus}: ${apiBody}`);
    await killServer(server.proc);
    process.exit(1);
  }

  let entries: any[] = [];
  let totalCount = "0";
  try {
    const json = JSON.parse(apiBody);
    entries = json.results ?? [];
    totalCount = json.count ?? "0";
  } catch (err) {
    console.error(`  Failed to parse API response: ${apiBody.slice(0, 200)}`);
    await killServer(server.proc);
    process.exit(1);
  }

  console.log(`\n  Observatory API returned ${entries.length} entries (count: ${totalCount})\n`);

  // 5. Kill the server
  await killServer(server.proc);

  // 6. Verify entries exist
  if (entries.length === 0) {
    console.error(`  FAIL: Observatory API returned 0 entries for ${apiPath}`);
    console.error(`  The full pipeline produced nothing: patcher → stream → watcher → MySQL → API`);
    process.exit(1);
  }

  // 7. Run assertions on each entry's content
  const assertions = ASSERTIONS[CATEGORY!] ?? [];
  let totalChecks = 0;
  let passedChecks = 0;
  let failedChecks = 0;
  const failures: string[] = [];
  const byPackage: Record<string, any[]> = {};

  for (const entry of entries) {
    const content = typeof entry.content === "string" ? JSON.parse(entry.content) : entry.content;
    const pkg = content?.metadata?.package ?? "unknown";

    if (FILTER_PACKAGE && pkg !== FILTER_PACKAGE) continue;

    if (!byPackage[pkg]) byPackage[pkg] = [];
    byPackage[pkg].push(content);

    for (const assertion of assertions) {
      totalChecks++;
      const value = getNestedValue(content, assertion.path);

      let pass = false;
      switch (assertion.check) {
        case "exists":
          pass = value !== undefined && value !== null;
          break;
        case "string":
          pass = typeof value === "string" && value.length > 0;
          break;
        case "number":
          pass = typeof value === "number" && !isNaN(value);
          break;
        case "in":
          pass = assertion.values?.includes(value) ?? false;
          break;
      }

      if (pass) {
        passedChecks++;
      } else {
        failedChecks++;
        failures.push(
          `  ${entry.uuid}: ${assertion.path} — expected ${assertion.check}${assertion.values ? ` [${assertion.values.join(",")}]` : ""}, got ${JSON.stringify(value)}`,
        );
      }
    }
  }

  // 8. Report
  console.log("--- Results by package ---");
  for (const [pkg, pkgEntries] of Object.entries(byPackage)) {
    const sample = pkgEntries[0];
    console.log(`\n  ${pkg} (${pkgEntries.length} entries)`);
    console.log(`    status:   ${sample.status}`);
    console.log(`    duration: ${sample.duration}`);
    if (sample.metadata?.command) console.log(`    command:  ${sample.metadata.command}`);
    if (sample.metadata?.level) console.log(`    level:    ${sample.metadata.level}`);
    if (sample.data?.key) console.log(`    data.key: ${sample.data.key}`);
    if (sample.data?.message) console.log(`    message:  ${JSON.stringify(sample.data.message).slice(0, 80)}`);
  }

  console.log(`\n--- Assertion Summary ---`);
  console.log(`  Total checks:  ${totalChecks}`);
  console.log(`  Passed:        ${passedChecks}`);
  console.log(`  Failed:        ${failedChecks}`);

  if (failures.length > 0) {
    console.log(`\n--- Failed Assertions ---`);
    for (const f of failures) console.log(f);
  }

  const packages = Object.keys(byPackage);
  console.log(`\n--- Packages verified ---`);
  console.log(`  ${packages.join(", ")}\n`);

  if (failedChecks > 0) {
    console.log(`FAIL: ${failedChecks} assertion(s) failed\n`);
    process.exit(1);
  }

  console.log(`PASS: All ${passedChecks} assertions passed for ${packages.length} package(s)\n`);
}

main().catch((err) => {
  console.error("verify-patchers failed:", err);
  process.exit(1);
});
