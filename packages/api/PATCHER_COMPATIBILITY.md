<!-- @format -->

# Patcher Compatibility Matrix

This document tracks which versions of instrumented packages are tested and supported by Node Observatory patchers.

## Testing Strategy

- **Minimum Version**: Lowest supported version per peer dependency
- **Latest Minor**: Latest patch in supported minor version line
- **Latest Major**: Latest available major version

Example: Redis `>=4.0.0` → Test `4.0.0`, `4.7.0`, `5.x.x`

## Compatibility Matrix

### Caching & In-Memory Stores

| Package    | Min    | Max  | Tested Versions     | Status | Notes            |
| ---------- | ------ | ---- | ------------------- | ------ | ---------------- |
| redis      | 4.0.0  | 5.x  | 4.0.0, 4.7.0, 5.0.0 | ✅     | Fully tested     |
| ioredis    | 5.0.0  | 5.x  | 5.6.0               | ✅     | Works as drop-in |
| keyv       | 5.0.0  | 5.x  | 5.3.2               | ⚠️     | Test needed      |
| lru-cache  | 11.0.0 | 11.x | 11.0.2              | ✅     | Fully tested     |
| memjs      | 1.0.0  | 1.x  | 1.3.2               | ⚠️     | Test needed      |
| node-cache | 5.0.0  | 5.x  | 5.1.2               | ⚠️     | Test needed      |
| level      | 9.0.0  | 9.x  | 9.0.0               | ⚠️     | Test needed      |

### Job Queues & Scheduling

| Package       | Min   | Max | Tested Versions    | Status | Notes        |
| ------------- | ----- | --- | ------------------ | ------ | ------------ |
| bull          | 4.0.0 | 5.x | 4.0.0, 4.16.5, 5.x | ✅     | Fully tested |
| agenda        | 5.0.0 | 5.x | 5.0.0              | ⚠️     | Test needed  |
| bree          | 9.0.0 | 9.x | 9.2.4              | ⚠️     | Test needed  |
| node-cron     | 3.0.0 | 3.x | 3.0.3              | ✅     | Fully tested |
| node-schedule | 2.0.0 | 2.x | 2.1.1              | ⚠️     | Test needed  |

### Databases & ORMs

| Package   | Min   | Max   | Tested Versions    | Status | Notes        |
| --------- | ----- | ----- | ------------------ | ------ | ------------ |
| mysql2    | 3.0.0 | 3.x   | 3.0.0, 3.14.0      | ✅     | Fully tested |
| pg        | 8.0.0 | 9.x   | 8.0.0, 8.14.1, 9.x | ✅     | Fully tested |
| knex      | 3.0.0 | 3.x   | 3.1.0              | ⚠️     | Test needed  |
| mongoose  | 8.0.0 | 8.x   | 8.12.2             | ⚠️     | Test needed  |
| sequelize | 6.0.0 | 6.x   | 6.37.6             | ⚠️     | Test needed  |
| typeorm   | 0.3.0 | 0.3.x | 0.3.21             | ⚠️     | Test needed  |
| sqlite3   | 5.0.0 | 5.x   | 5.1.7              | ⚠️     | Test needed  |

### HTTP Clients

| Package    | Min    | Max  | Tested Versions | Status | Notes        |
| ---------- | ------ | ---- | --------------- | ------ | ------------ |
| axios      | 1.0.0  | 1.x  | 1.0.0, 1.8.4    | ✅     | Fully tested |
| undici     | 7.0.0  | 7.x  | 7.5.0           | ✅     | Fully tested |
| superagent | 10.0.0 | 10.x | 10.2.0          | ⚠️     | Test needed  |

### Logging

| Package  | Min   | Max | Tested Versions | Status | Notes        |
| -------- | ----- | --- | --------------- | ------ | ------------ |
| winston  | 3.0.0 | 3.x | 3.0.0, 3.17.0   | ✅     | Fully tested |
| pino     | 9.0.0 | 9.x | 9.6.0           | ⚠️     | Test needed  |
| bunyan   | 1.8.0 | 1.x | 1.8.15          | ⚠️     | Test needed  |
| log4js   | 6.0.0 | 6.x | 6.9.1           | ⚠️     | Test needed  |
| loglevel | 1.0.0 | 1.x | 1.9.2           | ⚠️     | Test needed  |
| signale  | 1.0.0 | 1.x | 1.4.0           | ⚠️     | Test needed  |

### Email & Notifications

| Package             | Min    | Max  | Tested Versions | Status | Notes       |
| ------------------- | ------ | ---- | --------------- | ------ | ----------- |
| nodemailer          | 6.0.0  | 6.x  | 6.10.0          | ⚠️     | Test needed |
| @aws-sdk/client-ses | 3.0.0  | 3.x  | 3.772.0         | ⚠️     | Test needed |
| sendgrid            | -      | -    | -               | ⚠️     | Test needed |
| mailgun.js          | 10.0.0 | 12.x | 12.0.1          | ⚠️     | Test needed |
| postmark            | 4.0.0  | 4.x  | 4.0.5           | ⚠️     | Test needed |

## Key Version Detection Rules

1. **Minimum version**: Check `node_modules/PACKAGE/package.json`
2. **Runtime check**: Use `semver.satisfies(version, range)`
3. **Feature detection**: Validate patching points exist before wrapping
4. **Graceful degradation**: Warn on unsupported versions, don't crash

## Running Version Tests

```bash
# Test all packages all versions
npm run test:versions

# Test specific package versions
npm run test:versions:redis
npm run test:versions:bull
npm run test:versions:db

# Test specific version in isolation
npm install redis@4.0.0
npm run test:versions -- --testNamePattern="redis"
```
