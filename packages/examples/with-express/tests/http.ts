/** @format
 * Test: HTTP patcher (axios + native https + undici)
 * Run: node -r ts-node/register tests/http.ts
 * Hit: GET http://localhost:3001/test
 *
 * Requires internet access.
 * All three clients should appear in Observatory → HTTP Requests.
 */
import { createTestApp } from "./bootstrap";
import axios from "axios";
import https from "https";

async function main() {
  const { app, start } = await createTestApp();

  const BASE = "https://jsonplaceholder.typicode.com";

  /**
   * GET /test
   * Exercises all three HTTP clients with successful requests.
   */
  app.get("/test", async (_req, res) => {
    const results: Record<string, any> = {};

    // 1. axios — GET, POST, 404
    const axiosGet = await axios.get(`${BASE}/todos/1`);
    const axiosPost = await axios.post(`${BASE}/posts`, {
      title: "test",
      body: "body",
      userId: 1,
    });
    let axiosNotFound: number | undefined;
    try {
      await axios.get(`${BASE}/todos/99999`);
    } catch (err: any) {
      axiosNotFound = err.response?.status;
    }
    results.axios = {
      get: axiosGet.status,
      post: axiosPost.status,
      notFound: axiosNotFound ?? 404,
    };

    // 2. native https — GET
    const nativeStatus = await new Promise<number>((resolve, reject) => {
      https
        .get(`${BASE}/todos/2`, (r) => {
          r.resume();
          r.on("end", () => resolve(r.statusCode!));
        })
        .on("error", reject);
    });
    results.nativeHttps = { get: nativeStatus };

    // 3. undici — GET, POST
    const { request } = await import("undici");
    const undiciGet = await request(`${BASE}/todos/3`);
    await undiciGet.body.dump();
    const undiciPost = await request(`${BASE}/posts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "undici-test", userId: 1 }),
    });
    await undiciPost.body.dump();
    results.undici = { get: undiciGet.statusCode, post: undiciPost.statusCode };

    res.json({
      ok: true,
      results,
      message: "HTTP requests fired — check Observatory → HTTP Requests",
    });
  });

  /**
   * GET /test/error
   * Fires a request that returns a 500 to verify error tracking.
   */
  app.get("/test/error", async (_req, res) => {
    try {
      // httpstat.us returns whatever status you ask for
      await axios.get("https://httpstat.us/500", { timeout: 10_000 });
    } catch (err: any) {
      return res.json({
        ok: true,
        status: err.response?.status ?? "error",
        message: "check Observatory → HTTP Requests",
      });
    }
    res.json({
      ok: true,
      status: 500,
      message: "check Observatory → HTTP Requests",
    });
  });

  start();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
