/** @format */

/**
 * Standalone stress runner.
 *
 * Usage:
 *   npx ts-node stress.ts                        # defaults: 50 requests, 5 parallel
 *   npx ts-node stress.ts --count 200 --parallel 10
 *   npm run stress -- --count 200 --parallel 10
 *
 * Assumes the Express server is already running on PORT (default 9999).
 */

import http from "http";

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);

function flag(name: string, fallback: number): number {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) return fallback;
  return parseInt(args[idx + 1], 10) || fallback;
}

const PORT = flag("port", 9999);
const COUNT = flag("count", 50);
const PARALLEL = flag("parallel", 5);

const BASE = `http://localhost:${PORT}`;
const ROUTES = ["/stress/cache", "/stress/http", "/stress/log", "/stress/query"];

// ---------------------------------------------------------------------------
// Simple HTTP GET that returns a promise
// ---------------------------------------------------------------------------
function get(url: string): Promise<{ status: number; ms: number }> {
  const start = Date.now();
  return new Promise((resolve) => {
    http
      .get(url, (res) => {
        // Drain body
        res.on("data", () => {});
        res.on("end", () =>
          resolve({ status: res.statusCode ?? 0, ms: Date.now() - start }),
        );
      })
      .on("error", () => resolve({ status: 0, ms: Date.now() - start }));
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\nStress runner — ${COUNT} requests, ${PARALLEL} concurrency\n`);
  console.log(`Target: ${BASE}`);
  console.log(`Routes: ${ROUTES.join(", ")}\n`);

  const tasks: (() => Promise<{ route: string; status: number; ms: number }>)[] = [];

  for (let i = 0; i < COUNT; i++) {
    const route = ROUTES[i % ROUTES.length];
    tasks.push(async () => {
      const { status, ms } = await get(`${BASE}${route}`);
      return { route, status, ms };
    });
  }

  const allStart = Date.now();
  const results: { route: string; status: number; ms: number }[] = [];
  const executing = new Set<Promise<void>>();

  let done = 0;
  for (const task of tasks) {
    const p = task().then((r) => {
      results.push(r);
      done++;
      if (done % 10 === 0 || done === COUNT) {
        process.stdout.write(`\r  Progress: ${done}/${COUNT}`);
      }
      executing.delete(p);
    });
    executing.add(p);

    if (executing.size >= PARALLEL) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);

  const totalMs = Date.now() - allStart;

  // ---------------------------------------------------------------------------
  // Report
  // ---------------------------------------------------------------------------
  console.log("\n");

  const byRoute: Record<string, { count: number; ok: number; fail: number; latencies: number[] }> = {};
  for (const r of results) {
    if (!byRoute[r.route]) byRoute[r.route] = { count: 0, ok: 0, fail: 0, latencies: [] };
    byRoute[r.route].count++;
    if (r.status >= 200 && r.status < 400) byRoute[r.route].ok++;
    else byRoute[r.route].fail++;
    byRoute[r.route].latencies.push(r.ms);
  }

  console.log("Route                    | Reqs | OK   | Fail | Avg ms | P95 ms");
  console.log("-------------------------|------|------|------|--------|-------");
  for (const [route, s] of Object.entries(byRoute)) {
    const sorted = s.latencies.sort((a, b) => a - b);
    const avg = Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
    console.log(
      `${route.padEnd(25)}| ${String(s.count).padEnd(5)}| ${String(s.ok).padEnd(5)}| ${String(s.fail).padEnd(5)}| ${String(avg).padEnd(7)}| ${p95}`,
    );
  }

  const totalOk = results.filter((r) => r.status >= 200 && r.status < 400).length;
  const rps = (results.length / (totalMs / 1000)).toFixed(1);

  console.log("\n--- Summary ---");
  console.log(`Total:    ${results.length} requests in ${totalMs}ms`);
  console.log(`Success:  ${totalOk}  |  Errors: ${results.length - totalOk}`);
  console.log(`RPS:      ${rps} req/s`);
  console.log();
}

main().catch((err) => {
  console.error("Stress runner failed:", err);
  process.exit(1);
});
