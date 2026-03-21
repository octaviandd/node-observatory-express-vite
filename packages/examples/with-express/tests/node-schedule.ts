/** @format
 * Test: node-schedule patcher
 * Run: node -r ts-node/register tests/node-schedule.ts
 * Hit: GET http://localhost:3001/test      — view scheduled jobs
 *      GET http://localhost:3001/test/run  — schedule a one-shot job 2 s from now
 *
 * A recurring job fires every 10 seconds automatically once the server starts.
 */
import { createTestApp } from "./bootstrap";
import * as schedule from "node-schedule";

async function main() {
  const { app, start } = await createTestApp();

  let executionCount = 0;
  const logs: { at: string; count: number; manual?: boolean }[] = [];

  // Recurring rule: every 10 seconds
  const rule = new schedule.RecurrenceRule();
  rule.second = [0, 10, 20, 30, 40, 50];

  const recurringJob = schedule.scheduleJob(
    "observatory-recurring",
    rule,
    () => {
      executionCount++;
      const entry = { at: new Date().toISOString(), count: executionCount };
      logs.push(entry);
      console.log("node-schedule fired:", entry);
    },
  );

  console.log(
    "node-schedule job scheduled (every 10 s) — check Observatory → Schedules",
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
      nextInvocation: recurringJob.nextInvocation()?.toISOString(),
      message: "check Observatory → Schedules",
    });
  });

  /**
   * GET /test/run
   * Schedules a one-shot job 2 seconds from now.
   */
  app.get("/test/run", (_req, res) => {
    const runAt = new Date(Date.now() + 2_000);

    schedule.scheduleJob(`one-shot-${Date.now()}`, runAt, () => {
      executionCount++;
      const entry = {
        at: new Date().toISOString(),
        count: executionCount,
        manual: true,
      };
      logs.push(entry);
      console.log("node-schedule one-shot fired:", entry);
    });

    res.json({
      ok: true,
      scheduledFor: runAt.toISOString(),
      message: "check Observatory → Schedules",
    });
  });

  /**
   * DELETE /test — cancel the recurring job
   */
  app.delete("/test", (_req, res) => {
    recurringJob.cancel();
    res.json({ ok: true, message: "recurring job cancelled" });
  });

  start();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
