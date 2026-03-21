/** @format
 * Test: winston patcher
 * Run: node -r ts-node/register tests/winston.ts
 * Hit: GET http://localhost:3001/test
 */
import { createTestApp } from "./bootstrap";
import winston from "winston";

async function main() {
  const { app, start } = await createTestApp();

  const logger = winston.createLogger({
    level: "silly",
    transports: [new winston.transports.Console({ silent: true })],
  });

  /**
   * GET /test
   * Exercises: silly, verbose, debug, http, info, warn, error log levels
   */
  app.get("/test", (_req, res) => {
    logger.silly("winston silly message");
    logger.verbose("winston verbose message");
    logger.debug("winston debug message");
    logger.http("winston http message");
    logger.info("winston info message", { userId: 1 });
    logger.warn("winston warn message", { warning: "low-disk" });
    logger.error("winston error message", { err: "something went wrong" });

    res.json({ ok: true, message: "winston logs emitted — check Observatory → Logs" });
  });

  start();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
