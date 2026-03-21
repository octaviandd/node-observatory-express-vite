/** @format
 * Test: signale patcher
 * Run: node -r ts-node/register tests/signale.ts
 * Hit: GET http://localhost:3001/test
 */
import { createTestApp } from "./bootstrap";
import signale from "signale";

async function main() {
  const { app, start } = await createTestApp();

  /**
   * GET /test
   * Exercises: info, success, warn, error, debug, fatal log levels
   */
  app.get("/test", (_req, res) => {
    signale.info("signale info message");
    signale.success("signale success message");
    signale.warn("signale warn message");
    signale.error("signale error message");
    signale.debug("signale debug message");
    signale.fatal(new Error("signale fatal error"));
    signale.pending("signale pending task");
    signale.complete("signale complete task");

    res.json({ ok: true, message: "signale logs emitted — check Observatory → Logs" });
  });

  start();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
