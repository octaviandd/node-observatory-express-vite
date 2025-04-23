# 🔍 Node Observatory

A comprehensive observability and monitoring solution for Node.js applications that automatically instruments your server, database, APIs, and infrastructure without requiring code changes.

## 📋 Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Supported Integrations](#supported-integrations)
- [Advanced Usage](#advanced-usage)
- [Package Structure](#package-structure)
- [License](#license)

## ✨ Features

### Automatic Instrumentation

Node Observatory uses monkey patching to automatically instrument your application without requiring code changes. It intercepts and enhances the functionality of popular Node.js libraries and frameworks through our patching system.

### Real-time Monitoring & Observability

- 🌐 **HTTP Request Tracking**: Automatically captures request metrics including latency, status codes, payloads, and headers
- 📊 **Database Observability**: Monitors queries across multiple database drivers with timing and performance metrics
- ⏱️ **Job & Task Monitoring**: Tracks background jobs, cron tasks, and scheduled operations
- 💾 **Cache Operations**: Watches Redis, Node-Cache, LRU and other caching mechanisms
- 📝 **Logging Integration**: Connects with popular logging libraries to centralize and enhance logs
- 🔔 **Notification Tracking**: Monitors messaging services like Pusher and Ably
- 🚨 **Exception Handling**: Captures both handled and unhandled exceptions with stack traces and context
- 🔍 **View Rendering**: Monitors template rendering performance
- 📧 **Mail Operations**: Tracks email sending across multiple mail providers
- 📦 **Model Operations**: Monitors ORM and database model interactions

## 🚀 Installation

You can install the full package or just the components you need:

```bash
# Install the complete package
npm install node-observatory

# Or install individual packages
npm install @node-observatory/server
npm install @node-observatory/client
```

## 🎯 Quick Start

```typescript
import { setupLogger } from "@node-observatory/server";
// The import must be at the top of your entry file.
import express from "express";
import mysql2 from "mysql2/promise";
import { createClient } from "redis";

const app = express();
app.use(express.json());

// Set up database and Redis connections
const mysql2Connection = await mysql2.createConnection({
  host: "host",
  user: "user",
  password: "password",
  database: "database",
  timezone: "UTC",
});

const redisConnection = createClient({
  url: "redis://localhost:6379",
});
await redisConnection.connect();

// Initialize observatory with your connections
await setupLogger(app, "mysql2", mysql2Connection, redisConnection);

app.listen(3000, () => {
  console.log("Server is running on port 3000");
  console.log("Observatory dashboard available at: http://localhost:3000/observatory");
});
```

## ⚙️ Configuration

### Supported Integrations

Node Observatory automatically instruments the following libraries:

#### Web Frameworks
- ✅ Express

#### Database Drivers
- ✅ MySQL / MySQL2
- ✅ PostgreSQL
- ✅ MongoDB / Mongoose
- ✅ Knex
- ✅ Prisma
- ✅ TypeORM
- ✅ Sequelize
- ✅ SQLite3

#### Logging
- ✅ Winston
- ✅ Pino
- ✅ Bunyan
- ✅ Log4js
- ✅ Signale
- ✅ Loglevel

#### Job/Scheduler Processing
- ✅ Bull
- ✅ Agenda
- ✅ Bree
- ✅ Node-Schedule
- ✅ Node-Cron

#### Caching
- ✅ Redis
- ✅ IORedis
- ✅ Node-Cache
- ✅ LRU-Cache
- ✅ Memjs
- ✅ Level
- ✅ Keyv

#### HTTP Clients
- ✅ Axios
- ✅ Got
- ✅ Superagent
- ✅ Fetch
- ✅ Undici
- ✅ Node-HTTP(S)

#### Messaging/Notifications
- ✅ Pusher
- ✅ Ably

#### Email Services
- ✅ Nodemailer
- ✅ SendGrid
- ✅ Mailgun
- ✅ AWS SES
- ✅ Postmark

## 🔧 Advanced Usage

Node Observatory can be configured to track specific aspects of your application using environment variables:

```env
NODE_OBSERVATORY_ERRORS=true
NODE_OBSERVATORY_ERROR_TRACING=true
NODE_OBSERVATORY_JOBS=["bull"]
NODE_OBSERVATORY_MAILER=["nodemailer","@aws-sdk/client-ses","mailgun.js","postmark","sendgrid"]
NODE_OBSERVATORY_CACHE=["node-cache","redis","ioredis","memjs","level","keyv"]
NODE_OBSERVATORY_NOTIFICATIONS=["pusher","ably"]
NODE_OBSERVATORY_QUERIES=["mysql2","typeorm","sequelize"]
NODE_OBSERVATORY_MODELS=["typeorm","sequelize","mongoose"]
NODE_OBSERVATORY_LOGGING=["winston","pino","bunyan","log4js","signale","loglevel"]
NODE_OBSERVATORY_HTTP=["http","axios","fetch","got","superagent","undici","ky","needle","phin","node-fetch"]
NODE_OBSERVATORY_SCHEDULER=["node-schedule","node-cron"]
NODE_OBSERVATORY_VIEWS=["handlebars","pug","ejs"]
```

## 📊 Client Dashboard

The NodeJS Observatory includes a modern React dashboard built with:

- **React + TypeScript**: Type-safe component development
- **Vite**: Lightning-fast frontend tooling
- **Tailwind CSS**: Utility-first styling
- **Shadcn/UI**: Beautiful, accessible UI components

### Dashboard Features

- **Real-time data visualization**: Monitor your application performance in real-time
- **Detailed inspection views**: Drill down into specific requests, queries, jobs, and more
- **Timeline analysis**: View application activity over time with interactive charts
- **Filter and search**: Quickly find specific events and patterns
- **Performance metrics**: Track response times, error rates, and throughput
- **Dark/Light mode**: Choose your preferred theme

### Accessing the Dashboard

The dashboard is automatically served by the observatory when you initialize it with your application:
http://your-app-host/observatory


The API for retrieving observability data is available at:
http://your-app-host/observatory-api/data

## 📦 Package Structure

Node Observatory is organized as a monorepo with the following packages:

- **@node-observatory/server**: The core instrumentation engine that monitors your application
- **@node-observatory/client**: The React dashboard for visualizing monitoring data

You can install and use these packages separately depending on your needs.

## 📄 License

Proprietary © 2023