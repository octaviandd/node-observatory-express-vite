# 🔍 NodeJS Observatory

A comprehensive observability and monitoring solution for Node.js applications that automatically tracks server, database, API, and infrastructure performance without requiring code changes.

## 📋 Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Supported Integrations](#supported-integrations)
- [Advanced Usage](#advanced-usage)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

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

### Automatic Instrumentation

NodeJS Observatory uses monkey patching to automatically instrument your application without requiring code changes. It intercepts and enhances the functionality of popular Node.js libraries and frameworks.

## 🚀 Installation

```bash
npm install nodejs-observatory
# or
yarn add nodejs-observatory
```

## 🎯 Quick Start

```typescript
import { setupObservatory } from "nodejs-observatory";
import express from "express";
const app = express();

// Initialize observatory with basic configuration
setupObservatory({
  framework: "express",
  errors: true,
  packages: {
    database: ["mysql2"],
    logging: ["winston"],
    cache: ["redis"],
  },
});
```

## ⚙️ Configuration

### Supported Integrations

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
- ✅ Roarr

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

NodeJS Observatory can be configured to track specific aspects of your application using environment variables:

```
NODE_OBSERVATORY_ERRORS=true
NODE_OBSERVATORY_HTTP=true
NODE_OBSERVATORY_JOBS=true
NODE_OBSERVATORY_LOGGING=true
NODE_OBSERVATORY_SCHEDULER=true
NODE_OBSERVATORY_MAILER=true
NODE_OBSERVATORY_CACHE=true
NODE_OBSERVATORY_NOTIFICATIONS=true
NODE_OBSERVATORY_QUERIES=true
NODE_OBSERVATORY_VIEWS=true
NODE_OBSERVATORY_MODELS=true
```

## 🧪 Testing

The package includes comprehensive tests for all supported integrations:

```bash
# Run all tests
npm run test:mocha

# Run specific component tests
npm run test:exceptions
npm run test:express
npm run test:queries
npm run test:jobs
# etc.

# Run load tests using k6
npm run test-k6
```

## 🤝 Contributing

Contributions are welcome! The codebase uses TypeScript and follows a modular architecture with separate patchers for each supported library.

## 📄 License

Proprietary © 2023
