/** @format
 * Test: knex query patcher
 * Run: node -r ts-node/register tests/knex.ts
 * Hit: GET http://localhost:3001/test
 *
 * Requires MySQL running and DATABASE env vars (defaults: root@localhost/observatory).
 */
import { createTestApp } from "./bootstrap";
import knex from "knex";

async function main() {
  const { app, start } = await createTestApp();

  const db = knex({
    client: "mysql2",
    connection: {
      host:     process.env.MYSQL_HOST     || "localhost",
      port:     parseInt(process.env.MYSQL_PORT || "3306", 10),
      user:     process.env.MYSQL_USER     || "root",
      password: process.env.MYSQL_PASSWORD || "",
      database: process.env.MYSQL_DATABASE || "observatory",
    },
  });

  // Ensure temp table exists
  const tableExists = await db.schema.hasTable("observatory_knex_test");
  if (!tableExists) {
    await db.schema.createTable("observatory_knex_test", (t) => {
      t.increments("id");
      t.string("name").notNullable();
      t.text("val");
    });
  }

  /**
   * GET /test
   * Exercises: insert, select (hit), select (miss), update, delete, raw query
   */
  app.get("/test", async (_req, res) => {
    // insert
    const [id] = await db("observatory_knex_test").insert({ name: "knex-test", val: "hello" });

    // select hit
    const row = await db("observatory_knex_test").where({ id }).first();

    // select miss
    const missing = await db("observatory_knex_test").where({ id: 999_999 }).first();

    // update
    await db("observatory_knex_test").where({ id }).update({ val: "updated" });

    // select after update
    const updated = await db("observatory_knex_test").where({ id }).first();

    // raw query
    const [raw] = await db.raw("SELECT COUNT(*) AS total FROM observatory_knex_test");

    // delete
    await db("observatory_knex_test").where({ id }).del();

    res.json({
      ok: true,
      inserted: row,
      missingLookup: missing ?? null,
      afterUpdate: updated,
      total: raw[0].total,
      message: "knex queries executed — check Observatory → Queries",
    });
  });

  /**
   * DELETE /test — drop temp table and destroy knex pool
   */
  app.delete("/test", async (_req, res) => {
    await db.schema.dropTableIfExists("observatory_knex_test");
    await db.destroy();
    res.json({ ok: true, message: "temp table dropped" });
  });

  start();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
