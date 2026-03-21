/** @format
 * Test: mongoose model patcher
 * Run: node -r ts-node/register tests/mongoose.ts
 * Hit: GET http://localhost:3001/test
 *
 * Requires MongoDB running.
 * Set MONGODB_URL env var (default: mongodb://localhost:27017/observatory_test).
 */
import { createTestApp } from "./bootstrap";
import mongoose, { Schema, model } from "mongoose";

async function main() {
  const { app, start } = await createTestApp();

  const mongoUrl =
    process.env.MONGODB_URL || "mongodb://localhost:27017/observatory_test";

  try {
    await mongoose.connect(mongoUrl);
    console.log("MongoDB connected:", mongoUrl);
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    console.warn(
      "The /test route will return an error until MongoDB is reachable.",
    );
  }

  const ItemSchema = new Schema({
    name: { type: String, required: true },
    value: { type: String },
  });

  const Item = mongoose.models.ObsItem ?? model("ObsItem", ItemSchema);

  /**
   * GET /test
   * Exercises: create, findById (hit), findOne (miss), updateOne, find, deleteOne
   */
  app.get("/test", async (_req, res) => {
    if (mongoose.connection.readyState !== 1) {
      return res
        .status(503)
        .json({ ok: false, error: "MongoDB not connected" });
    }

    // create
    const item = await Item.create({ name: "mongoose-test", value: "hello" });

    // findById (hit)
    const found = await Item.findById(item._id);

    // findOne (miss)
    const missing = await Item.findOne({ name: "does-not-exist" });

    // updateOne
    await Item.updateOne({ _id: item._id }, { value: "updated" });

    // find all docs with our name
    const all = await Item.find({ name: "mongoose-test" }).lean();

    // deleteOne
    await Item.deleteOne({ _id: item._id });

    res.json({
      ok: true,
      created: item.toObject(),
      found: found?.toObject() ?? null,
      missing: missing?.toObject() ?? null,
      all,
      message: "Mongoose queries executed — check Observatory → Models",
    });
  });

  start();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
