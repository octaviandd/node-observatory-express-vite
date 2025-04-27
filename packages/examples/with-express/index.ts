/** @format */
import { ExpressAdapter } from "@node-observatory/express";
import { createObserver } from "@node-observatory/api"
import express from "express";
import cors from "cors";
import mysql2 from "mysql2/promise";
import { createClient } from "redis";

export const app = express();
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

const PORT = 9999;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

async function startServer() {
  let mysql2Connection = await mysql2.createConnection({
    host: "localhost",
    user: "root",
    password: 'Database.123',
    database: "observatory",
    timezone: "UTC",
  });

  let redisConnection = createClient({
    url: "redis://localhost:6379",
  });

  let expressAdapter = new ExpressAdapter();
  expressAdapter.setBasePath('/ui');

  await redisConnection.connect();

  await createObserver(expressAdapter, {}, "mysql2", mysql2Connection, redisConnection);

  app.use('/ui', expressAdapter.getRouter());
  console.log("Server started");
}

startServer().catch((error) => {
  console.error("Error starting the server:", error);
  process.exit(1);
});
