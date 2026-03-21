/** @format
 * Test: mysql2 query patcher
 * Run: node -r ts-node/register tests/mysql2.ts
 * Hit: GET http://localhost:3001/test
 *
 * Requires MySQL running and DATABASE env vars set (defaults: root@localhost/observatory).
 * Creates a temporary table for the test and drops it on DELETE /test.
 */
import { createTestApp } from "./bootstrap";
import mysql2 from "mysql2/promise";

async function main() {
  const { app, start } = await createTestApp();

  // Own connection so this test works regardless of bootstrap Observatory state
  const connection = await mysql2.createConnection({
    host: process.env.MYSQL_HOST || "localhost",
    port: parseInt(process.env.MYSQL_PORT || "3306", 10),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "observatory",
  });

  // Ensure the temp table exists
  await connection.query(`
    CREATE TABLE IF NOT EXISTS observatory_mysql2_test (
      id   INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      val  TEXT
    )
  `);

  /**
   * GET /test
   * Exercises: INSERT, SELECT (hit), SELECT (empty), UPDATE, DELETE
   */
  app.get("/test", async (_req, res) => {
    // INSERT
    const [insertResult] = await connection.query<any>(
      "INSERT INTO observatory_mysql2_test (name, val) VALUES (?, ?)",
      ["test-row", "hello"],
    );
    const insertId = insertResult.insertId;

    // SELECT by id (hit)
    const [rows] = await connection.query<any[]>(
      "SELECT * FROM observatory_mysql2_test WHERE id = ?",
      [insertId],
    );

    // SELECT missing row (empty result)
    const [emptyRows] = await connection.query<any[]>(
      "SELECT * FROM observatory_mysql2_test WHERE id = ?",
      [999_999],
    );

    // UPDATE
    await connection.query(
      "UPDATE observatory_mysql2_test SET val = ? WHERE id = ?",
      ["updated", insertId],
    );

    // SELECT after update
    const [updated] = await connection.query<any[]>(
      "SELECT * FROM observatory_mysql2_test WHERE id = ?",
      [insertId],
    );

    // DELETE
    await connection.query("DELETE FROM observatory_mysql2_test WHERE id = ?", [
      insertId,
    ]);

    res.json({
      ok: true,
      inserted: rows[0],
      emptyLookup: emptyRows.length,
      afterUpdate: updated[0],
      message: "mysql2 queries executed — check Observatory → Queries",
    });
  });

  /**
   * DELETE /test — drop the temp table
   */
  app.delete("/test", async (_req, res) => {
    await connection.query("DROP TABLE IF EXISTS observatory_mysql2_test");
    res.json({ ok: true, message: "temp table dropped" });
  });

  start();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
