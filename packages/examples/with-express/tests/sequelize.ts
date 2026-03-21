/** @format
 * Test: sequelize model patcher
 * Run: node -r ts-node/register tests/sequelize.ts
 * Hit: GET http://localhost:3001/test
 *
 * Uses an in-memory SQLite database — no external service required.
 */
import { createTestApp } from "./bootstrap";
import { Sequelize, DataTypes, Model } from "sequelize";

async function main() {
  const { app, start } = await createTestApp();

  const sequelize = new Sequelize("sqlite::memory:", { logging: false });

  class Item extends Model {}
  Item.init(
    {
      id:    { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name:  { type: DataTypes.STRING, allowNull: false },
      value: { type: DataTypes.STRING },
    },
    { sequelize, modelName: "Item", tableName: "observatory_seq_test", timestamps: false }
  );

  await sequelize.sync();

  /**
   * GET /test
   * Exercises: create, findByPk (hit), findOne (miss), update, destroy, findAll
   */
  app.get("/test", async (_req, res) => {
    // create
    const item = await Item.create({ name: "seq-test", value: "hello" });

    // findByPk (hit)
    const found = await Item.findByPk(item.get("id") as number);

    // findOne (miss)
    const missing = await Item.findOne({ where: { name: "does-not-exist" } });

    // update
    await Item.update({ value: "updated" }, { where: { id: item.get("id") } });

    // findAll after update
    const all = await Item.findAll();

    // destroy
    await Item.destroy({ where: { id: item.get("id") } });

    res.json({
      ok: true,
      created: item.toJSON(),
      found:   found?.toJSON() ?? null,
      missing: missing?.toJSON() ?? null,
      all:     all.map((r) => r.toJSON()),
      message: "Sequelize queries executed — check Observatory → Models",
    });
  });

  start();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
