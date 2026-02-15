/**
 * Smoke test: Schedule patchers
 *
 * Exercises whichever scheduling package is installed (node-cron,
 * node-schedule) and verifies an observatory entry reaches the Redis stream.
 *
 * @format
 */

import { createClient } from "redis";

const OBSERVATORY_REDIS = process.env.OBSERVATORY_REDIS_URL ?? "redis://redis-test:6379";
const PACKAGE = process.env.MATRIX_PACKAGE ?? "node-cron";
const STREAM_KEY = "observatory:stream:schedule";

async function main() {
  const observatoryRedis = createClient({ url: OBSERVATORY_REDIS });
  await observatoryRedis.connect();

  try {
    await observatoryRedis.del(STREAM_KEY);
  } catch {}

  console.log(`[smoke-schedule] Testing package: ${PACKAGE}`);

  switch (PACKAGE) {
    case "node-cron": {
      const cron = await import("node-cron");
      // Schedule a task that fires every second, wait for it to fire, then stop
      let fired = false;
      const task = cron.schedule("* * * * * *", () => {
        fired = true;
        console.log("[smoke-schedule] node-cron task fired");
      });
      task.start();
      // Wait up to 3 seconds for the task to fire
      for (let i = 0; i < 30 && !fired; i++) {
        await new Promise((r) => setTimeout(r, 100));
      }
      task.stop();
      break;
    }
    case "node-schedule": {
      const schedule = await import("node-schedule");
      let fired = false;
      // Schedule a job 1 second from now
      const runAt = new Date(Date.now() + 1000);
      const job = schedule.scheduleJob(runAt, () => {
        fired = true;
        console.log("[smoke-schedule] node-schedule job fired");
      });
      // Wait up to 4 seconds for the job to fire
      for (let i = 0; i < 40 && !fired; i++) {
        await new Promise((r) => setTimeout(r, 100));
      }
      if (job) schedule.cancelJob(job);
      break;
    }
    default:
      throw new Error(`Unknown schedule package: ${PACKAGE}`);
  }

  await new Promise((r) => setTimeout(r, 2000));

  const streamLen = await observatoryRedis.xLen(STREAM_KEY);
  console.log(`[smoke-schedule] Stream entries after test: ${streamLen}`);

  await observatoryRedis.quit();

  if (streamLen === 0) {
    console.error("[smoke-schedule] FAIL — no entries in observatory stream");
    process.exit(1);
  }

  console.log("[smoke-schedule] PASS");
}

main().catch((err) => {
  console.error("[smoke-schedule] FAIL:", err);
  process.exit(1);
});
