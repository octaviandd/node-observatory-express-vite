/** @format */
import { createObserver } from "@node-observatory/api"
import { ExpressAdapter } from "@node-observatory/express";
import express from "express";
import cors from "cors";
import mysql2 from "mysql2/promise";
import { createClient, RedisClientType } from "redis";
import axios from "axios";
import winston from "winston";
import NodeCache from "node-cache";
import { createStressRoutes } from "./routes/stress";

const myCache = new NodeCache();

export const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (!req.path.startsWith('/ui')) {
    return express.json()(req, res, next);
  }
  next();
});

const expressAdapter = new ExpressAdapter();
expressAdapter.setBasePath('/ui');
app.use('/ui', expressAdapter.getRouter());

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// ---------------------------------------------------------------------------
// Original demo route
// ---------------------------------------------------------------------------
app.get('/home', async (req, res) => {
  try {
    const response = await axios.get('https://jsonplaceholder.typicode.com/todos/1');
    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }

  myCache.set('index', 'test')
  myCache.get('index');

  console.log(myCache.get('index'))

  logger.info('This is an info log message from Winston in user app');
})

// ---------------------------------------------------------------------------
// Server bootstrap
// ---------------------------------------------------------------------------
async function startServer() {
  const mysql2Connection = await mysql2.createConnection({
    host: "localhost",
    user: "root",
    database: "observatory",
  });

  const redisConnection = createClient({
    url: "redis://localhost:6379",
  });

  await redisConnection.connect();

  // Mount stress/sample-data routes (exercises all patcher categories)
  app.use('/stress', createStressRoutes({
    mysql2Connection,
    redisConnection: redisConnection as RedisClientType,
    logger,
    cache: myCache,
  }));


  await createObserver(expressAdapter, {}, "mysql2", mysql2Connection, redisConnection as RedisClientType);

  console.log("Server started");

  const PORT = 9999;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`  Home:       http://localhost:${PORT}/home`);
    console.log(`  UI:         http://localhost:${PORT}/ui`);
    console.log(`  Stress:     http://localhost:${PORT}/stress/all`);
    console.log(`  Flood:      http://localhost:${PORT}/stress/flood?count=50&parallel=5`);
  });
}

startServer().catch((error) => {
  console.error("Error starting the server:", error);
  process.exit(1);
});
