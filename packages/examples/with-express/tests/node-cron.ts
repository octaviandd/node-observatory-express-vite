/** @format
 * Test: node-cron patcher
 * Run: node -r ts-node/register tests/node-cron.ts
 * Hit: GET http://localhost:3001/test     — view scheduled tasks
 *      GET http://localhost:3001/test/run — trigger immediately & wait
 *
 * The cron task fires every 10 seconds automatically once the server starts.
 */
import { createTestApp } from "./bootstrap";
import * as cron from "node-cron";

async function main() {
  const { app, start } = await createTestApp();

  let executionCount = 0;
  const logs: { at: string; count: number }[] = [];

  // Schedule: every 10 seconds so you can observe it without waiting too long
  const task = cron.schedule("*/10 * * * * *", () => {
    executionCount++;
    const entry = { at: new Date().toISOString(), count: executionCount };
    logs.push(entry);
    console.log("node-cron fired:", entry);
  });

  task.start();
  console.log(
    "node-cron task scheduled (every 10 s) — check Observatory → Schedules",
  );

  /**
   * GET /test
   * Returns current execution history.
   */
  app.get("/test", (_req, res) => {
    res.json({
      ok: true,
      executionCount,
      logs,
      message: "check Observatory → Schedules",
    });
  });

  /**
   * GET /test/run
   * Fires the callback immediately (out-of-schedule) so you don't have to wait.
   */
  app.get("/test/run", (_req, res) => {
    executionCount++;
    const entry = {
      at: new Date().toISOString(),
      count: executionCount,
      manual: true,
    };
    logs.push(entry);
    console.log("node-cron manual trigger:", entry);
    res.json({
      ok: true,
      triggered: entry,
      message: "check Observatory → Schedules",
    });
  });

  /**
   * DELETE /test — stop the task
   */
  app.delete("/test", (_req, res) => {
    task.stop();
    res.json({ ok: true, message: "task stopped" });
  });

  start();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
