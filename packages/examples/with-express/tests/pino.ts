/** @format
 * Test: pino patcher
 * Run: node -r ts-node/register tests/pino.ts
 * Hit: GET http://localhost:3001/test
 */
import { createTestApp } from "./bootstrap";
import pino from "pino";

async function main() {
  const { app, start } = await createTestApp();

  const logger = pino({ level: "trace" });

  /**
   * GET /test
   * Exercises: trace, debug, info, warn, error, fatal log levels
   */
  app.get("/test", (_req, res) => {
    logger.trace("pino trace message");
    logger.debug({ ctx: "test" }, "pino debug message");
    logger.info({ userId: 1 }, "pino info message");
    logger.warn({ warning: "low-disk" }, "pino warn message");
    logger.error({ err: new Error("sample") }, "pino error message");
    logger.fatal("pino fatal message");

    res.json({ ok: true, message: "pino logs emitted — check Observatory → Logs" });
  });

  start();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
