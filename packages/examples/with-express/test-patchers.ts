/** @format */

/**
 * Local patcher version matrix runner.
 *
 * Like stress.ts, assumes local Redis + MySQL are running.
 * For each package version in the matrix:
 *   1. Installs the specific version (npm install --no-save)
 *   2. Starts the Express server as a child process
 *   3. Hits the matching /stress/<category> route
 *   4. Checks the JSON response for the specific package result
 *   5. Stops the server, moves to the next version
 *
 * After all tests, restores node_modules to lockfile state.
 *
 * Usage:
 *   npm run test:patchers                          # all patchers
 *   npm run test:patchers -- --category cache      # just cache
 *   npm run test:patchers -- --patcher redis       # just redis
 *   npm run test:patchers -- --dry-run             # preview only
 *
 * Prerequisites: Redis on 6379, MySQL on 3306 (same as dev).
 * Stop any running server on port 9999 before running.
 */

import { execSync, spawn, ChildProcess } from "child_process";
import http from "http";
import path from "path";

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);

function strFlag(name: string): string | undefined {
  const idx = argv.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= argv.length) return undefined;
  return argv[idx + 1];
}

const DRY_RUN = argv.includes("--dry-run");
const FILTER_CATEGORY = strFlag("category");
const FILTER_PATCHER = strFlag("patcher");

// ---------------------------------------------------------------------------
// Paths & constants
// ---------------------------------------------------------------------------
const ROOT_DIR = path.resolve(__dirname, "../../..");
const SERVER_DIR = __dirname;
const PORT = 9999;
const BASE = `http://localhost:${PORT}`;
const STARTUP_TIMEOUT = 30_000;
const ROUTE_TIMEOUT = 60_000;

// ---------------------------------------------------------------------------
// Matrix — maps directly to /stress/* routes in routes/stress.ts
// ---------------------------------------------------------------------------
interface MatrixEntry {
  patcher: string;
  package: string;
  versions: string[];
  route: string;
  resultKey: string;
}

const MATRIX: MatrixEntry[] = [
  // Cache (/stress/cache)
  { patcher: "redis",      package: "redis",      versions: ["4.0.0", "4.7.0", "5.0.0"], route: "cache", resultKey: "redis" },
  { patcher: "ioredis",    package: "ioredis",    versions: ["5.0.0", "5.6.0"],           route: "cache", resultKey: "ioredis" },
  { patcher: "node-cache", package: "node-cache", versions: ["5.0.0", "5.1.2"],           route: "cache", resultKey: "node-cache" },
  { patcher: "keyv",       package: "keyv",       versions: ["5.0.0", "5.3.2"],           route: "cache", resultKey: "keyv" },

  // Logger (/stress/log)
  { patcher: "winston",  package: "winston",  versions: ["3.0.0", "3.17.0"],  route: "log", resultKey: "winston" },
  { patcher: "pino",     package: "pino",     versions: ["9.0.0", "9.6.0"],   route: "log", resultKey: "pino" },
  { patcher: "bunyan",   package: "bunyan",   versions: ["1.8.0", "1.8.15"],  route: "log", resultKey: "bunyan" },
  { patcher: "log4js",   package: "log4js",   versions: ["6.0.0", "6.9.1"],   route: "log", resultKey: "log4js" },
  { patcher: "loglevel", package: "loglevel", versions: ["1.0.0", "1.9.2"],   route: "log", resultKey: "loglevel" },
  { patcher: "signale",  package: "signale",  versions: ["1.0.0", "1.4.0"],   route: "log", resultKey: "signale" },

  // Mail (/stress/mail)
  { patcher: "nodemailer", package: "nodemailer", versions: ["6.0.0", "6.10.0"], route: "mail", resultKey: "nodemailer" },

  // Job (/stress/job)
  { patcher: "bull", package: "bull", versions: ["4.0.0", "4.16.5"], route: "job", resultKey: "bull" },

  // Schedule (/stress/schedule)
  { patcher: "node-cron",     package: "node-cron",     versions: ["3.0.0", "3.0.3"], route: "schedule", resultKey: "node-cron" },
  { patcher: "node-schedule", package: "node-schedule", versions: ["2.0.0", "2.1.1"], route: "schedule", resultKey: "node-schedule" },

  // Notification (/stress/notification)
  { patcher: "pusher", package: "pusher", versions: ["5.0.0", "5.2.0"], route: "notification", resultKey: "pusher" },

  // Query (/stress/query)
  { patcher: "mysql2", package: "mysql2", versions: ["3.0.0", "3.14.0"], route: "query", resultKey: "mysql2" },
  { patcher: "knex",   package: "knex",   versions: ["3.0.0", "3.1.0"],  route: "query", resultKey: "knex" },

  // Model (/stress/model)
  { patcher: "sequelize", package: "sequelize", versions: ["6.0.0", "6.37.6"], route: "model", resultKey: "sequelize" },

  // HTTP (/stress/http)
  { patcher: "axios",  package: "axios",  versions: ["1.0.0", "1.8.4"], route: "http", resultKey: "axios" },
  { patcher: "undici", package: "undici", versions: ["7.0.0", "7.5.0"], route: "http", resultKey: "undici" },
];

// ---------------------------------------------------------------------------
// Build task list
// ---------------------------------------------------------------------------
type Status = "PASS" | "FAIL" | "SKIP";

interface Task {
  entry: MatrixEntry;
  version: string;
}

interface Result {
  patcher: string;
  version: string;
  route: string;
  status: Status;
  detail: string;
  timeMs: number;
}

let tasks: Task[] = [];
for (const entry of MATRIX) {
  if (FILTER_CATEGORY && entry.route !== FILTER_CATEGORY) continue;
  if (FILTER_PATCHER && entry.patcher !== FILTER_PATCHER) continue;
  for (const version of entry.versions) {
    tasks.push({ entry, version });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function httpGet(url: string, timeout: number): Promise<{ status: number; body: string }> {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout }, (res) => {
      let body = "";
      res.on("data", (chunk: Buffer) => (body += chunk.toString()));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on("error", () => resolve({ status: 0, body: "" }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, body: "" });
    });
  });
}

function portInUse(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`${BASE}/`, { timeout: 2000 }, (res) => {
      res.on("data", () => {});
      res.on("end", () => resolve(true));
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

function startServer(): Promise<{ proc: ChildProcess; ok: boolean; output: string }> {
  return new Promise((resolve) => {
    let output = "";
    let resolved = false;

    const proc = spawn(
      "node",
      ["--trace-warnings", "--trace-uncaught", "-r", "ts-node/esm", "index.ts"],
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
      if (output.includes("http://localhost:")) {
        finish(true);
      }
    });

    proc.stderr?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });

    proc.on("exit", () => finish(false));
    proc.on("error", () => finish(false));

    setTimeout(() => finish(false), STARTUP_TIMEOUT);
  });
}

function killServer(proc: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (!proc.pid || proc.killed) {
      resolve();
      return;
    }
    proc.on("exit", () => resolve());
    proc.kill("SIGTERM");
    setTimeout(() => {
      if (!proc.killed) proc.kill("SIGKILL");
      resolve();
    }, 5000);
  });
}

function installPkg(pkg: string, version: string): { ok: boolean; output: string } {
  try {
    const output = execSync(
      `npm install ${pkg}@${version} --no-save --legacy-peer-deps 2>&1`,
      { cwd: ROOT_DIR, timeout: 60_000, encoding: "utf-8" },
    );
    return { ok: true, output };
  } catch (err: any) {
    return { ok: false, output: err.stdout ?? err.message ?? String(err) };
  }
}

function parseRouteResult(
  body: string,
  resultKey: string,
): { status: Status; detail: string } {
  try {
    const json = JSON.parse(body);
    const results: string[] = json.results ?? [];

    const match = results.find(
      (r) => r.toLowerCase().startsWith(resultKey.toLowerCase() + ":"),
    );

    if (!match) {
      const errorMatch = results.find((r) => r.startsWith("ERROR:"));
      if (errorMatch) return { status: "FAIL", detail: errorMatch };
      return { status: "FAIL", detail: `No result for "${resultKey}" in response` };
    }

    if (match.includes(": OK")) return { status: "PASS", detail: match };
    if (match.includes("SKIPPED") || match.includes("SKIP")) return { status: "SKIP", detail: match };
    return { status: "FAIL", detail: match };
  } catch {
    return { status: "FAIL", detail: "Could not parse response" };
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\nPatcher version matrix — ${tasks.length} tests\n`);

  if (FILTER_CATEGORY) console.log(`  Filter category: ${FILTER_CATEGORY}`);
  if (FILTER_PATCHER) console.log(`  Filter patcher:  ${FILTER_PATCHER}`);
  if (DRY_RUN) console.log(`  Mode: dry-run`);
  console.log();

  if (DRY_RUN) {
    for (const { entry, version } of tasks) {
      console.log(`  [DRY-RUN] ${entry.patcher}@${version}  →  /stress/${entry.route}`);
    }
    console.log(`\n  Total: ${tasks.length} tests\n`);
    return;
  }

  if (tasks.length === 0) {
    console.log("  No matching tests. Check --category / --patcher filters.\n");
    return;
  }

  // Check port is free
  if (await portInUse()) {
    console.error(
      `  ERROR: Port ${PORT} is already in use.\n` +
        `  Stop any running server and try again.\n`,
    );
    process.exit(1);
  }

  const results: Result[] = [];
  const totalStart = Date.now();

  for (let i = 0; i < tasks.length; i++) {
    const { entry, version } = tasks[i];
    const label = `${entry.patcher}@${version}`;

    process.stdout.write(`  [${i + 1}/${tasks.length}] ${label.padEnd(30)}`);
    const testStart = Date.now();

    // 1. Install the specific version
    const install = installPkg(entry.package, version);
    if (!install.ok) {
      const timeMs = Date.now() - testStart;
      console.log(`SKIP  install failed  (${(timeMs / 1000).toFixed(1)}s)`);
      results.push({
        patcher: entry.patcher, version, route: entry.route,
        status: "SKIP", detail: "Install failed", timeMs,
      });
      continue;
    }

    // 2. Start the server
    const server = await startServer();
    if (!server.ok) {
      await killServer(server.proc);
      const timeMs = Date.now() - testStart;
      console.log(`FAIL  server didn't start  (${(timeMs / 1000).toFixed(1)}s)`);
      results.push({
        patcher: entry.patcher, version, route: entry.route,
        status: "FAIL", detail: "Server failed to start", timeMs,
      });
      continue;
    }

    // 3. Hit the stress route
    const routeUrl = `${BASE}/stress/${entry.route}`;
    const { status: httpStatus, body } = await httpGet(routeUrl, ROUTE_TIMEOUT);

    // 4. Kill the server before processing result
    await killServer(server.proc);
    const timeMs = Date.now() - testStart;

    // 5. Parse result
    if (httpStatus === 0 || httpStatus >= 500) {
      console.log(`FAIL  HTTP ${httpStatus || "timeout"}  (${(timeMs / 1000).toFixed(1)}s)`);
      results.push({
        patcher: entry.patcher, version, route: entry.route,
        status: "FAIL", detail: `HTTP ${httpStatus || "timeout"}`, timeMs,
      });
      continue;
    }

    const parsed = parseRouteResult(body, entry.resultKey);
    console.log(`${parsed.status}  (${(timeMs / 1000).toFixed(1)}s)`);
    results.push({
      patcher: entry.patcher, version, route: entry.route,
      status: parsed.status, detail: parsed.detail, timeMs,
    });
  }

  // ---------------------------------------------------------------------------
  // Restore node_modules
  // ---------------------------------------------------------------------------
  console.log("\n  Restoring node_modules...");
  try {
    execSync("npm install --legacy-peer-deps 2>&1", {
      cwd: ROOT_DIR,
      timeout: 120_000,
      encoding: "utf-8",
    });
    console.log("  Done.\n");
  } catch {
    console.log("  Warning: npm install failed, node_modules may be dirty.\n");
  }

  // ---------------------------------------------------------------------------
  // Summary table
  // ---------------------------------------------------------------------------
  const totalMs = Date.now() - totalStart;

  console.log(
    "Patcher          | Version  | Route      | Status | Time",
  );
  console.log(
    "-----------------|----------|------------|--------|------",
  );
  for (const r of results) {
    console.log(
      `${r.patcher.padEnd(17)}| ${r.version.padEnd(9)}| ${r.route.padEnd(11)}| ${r.status.padEnd(7)}| ${(r.timeMs / 1000).toFixed(1)}s`,
    );
  }

  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  const skipped = results.filter((r) => r.status === "SKIP").length;

  console.log(`\n--- Summary ---`);
  console.log(
    `Total: ${results.length}  |  Passed: ${passed}  |  Failed: ${failed}  |  Skipped: ${skipped}  |  Time: ${(totalMs / 1000).toFixed(0)}s`,
  );
  console.log();

  // Print details for failures
  const failures = results.filter((r) => r.status === "FAIL");
  if (failures.length > 0) {
    console.log("--- Failures ---");
    for (const f of failures) {
      console.log(`  ${f.patcher}@${f.version}: ${f.detail}`);
    }
    console.log();
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Patcher matrix runner failed:", err);
  process.exit(1);
});
