/** @format */
import { createObserver } from "@node-observatory/api"
import { ExpressAdapter } from "@node-observatory/express";
import express from "express";
import cors from "cors";
import mysql2 from "mysql2/promise";
import { createClient } from "redis";
import axios from "axios";
import winston from "winston";
import NodeCache from "node-cache"

const myCache = new NodeCache();

export const app = express();
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

 let logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json() 
    ),
    transports: [
      new winston.transports.Console()
    ]
  });


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

const PORT = 9999;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

async function startServer() {
  let mysql2Connection = await mysql2.createConnection({
    host: "localhost",
    user: "root",
    password: "Database.123",
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
