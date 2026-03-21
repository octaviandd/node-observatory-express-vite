/** @format
 * Test: loglevel patcher
 * Run: node -r ts-node/register tests/loglevel.ts
 * Hit: GET http://localhost:3001/test
 */
import { createTestApp } from "./bootstrap";
import loglevel from "loglevel";

async function main() {
  const { app, start } = await createTestApp();

  loglevel.setLevel("trace");

  /**
   * GET /test
   * Exercises: trace, debug, info, warn, error log levels
   */
  app.get("/test", (_req, res) => {
    loglevel.trace("loglevel trace message");
    loglevel.debug("loglevel debug message");
    loglevel.info("loglevel info message");
    loglevel.warn("loglevel warn message");
    loglevel.error("loglevel error message");

    res.json({ ok: true, message: "loglevel logs emitted — check Observatory → Logs" });
  });

  start();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
