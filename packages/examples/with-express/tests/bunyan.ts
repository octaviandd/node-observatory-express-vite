/** @format
 * Test: bunyan patcher
 * Run: node -r ts-node/register tests/bunyan.ts
 * Hit: GET http://localhost:3001/test
 */
import { createTestApp } from "./bootstrap";
import bunyan from "bunyan";

async function main() {
  const { app, start } = await createTestApp();

  const logger = bunyan.createLogger({ name: "observatory-test", level: "trace" });

  /**
   * GET /test
   * Exercises: trace, debug, info, warn, error, fatal log levels
   */
  app.get("/test", (_req, res) => {
    logger.trace("bunyan trace message");
    logger.debug({ ctx: "test" }, "bunyan debug message");
    logger.info({ userId: 1 }, "bunyan info message");
    logger.warn({ warning: "low-disk" }, "bunyan warn message");
    logger.error({ err: new Error("sample") }, "bunyan error message");
    logger.fatal("bunyan fatal message");

    res.json({ ok: true, message: "bunyan logs emitted — check Observatory → Logs" });
  });

  start();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
