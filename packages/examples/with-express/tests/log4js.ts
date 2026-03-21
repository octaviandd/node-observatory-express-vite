/** @format
 * Test: log4js patcher
 * Run: node -r ts-node/register tests/log4js.ts
 * Hit: GET http://localhost:3001/test
 */
import { createTestApp } from "./bootstrap";
import log4js from "log4js";

async function main() {
  const { app, start } = await createTestApp();

  log4js.configure({
    appenders: { out: { type: "console" } },
    categories: { default: { appenders: ["out"], level: "all" } },
  });

  const logger = log4js.getLogger("observatory-test");

  /**
   * GET /test
   * Exercises: trace, debug, info, warn, error, fatal log levels
   */
  app.get("/test", (_req, res) => {
    logger.trace("log4js trace message");
    logger.debug("log4js debug message");
    logger.info("log4js info message");
    logger.warn("log4js warn message");
    logger.error("log4js error message");
    logger.fatal("log4js fatal message");

    res.json({ ok: true, message: "log4js logs emitted — check Observatory → Logs" });
  });

  start();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
