<!-- @format -->

## Automatic Docker & Database Management for Tests

### What Changed

#### 1. **Automatic Docker Container Lifecycle** (`jest.integration.setup.ts`)

- Docker containers now **automatically start** before tests begin
- Docker containers **automatically stop** after tests finish
- No manual `npm run test:docker:up/down` needed

#### 2. **Automatic Database/Redis Clearing**

- **Before tests**: All data cleared from MySQL and Redis
- **After each test**: Database and Redis reset via `resetAll()` in `afterEach`
- **Fresh state guaranteed** for every test run

#### 3. **Simplified npm Scripts** (`package.json`)

```bash
# Old way (manual docker management):
npm run test:docker:up
npm run test:integration:run
npm run test:docker:down

# New way (automatic!):
npm run test:integration
```

### New Test Commands

```bash
# Run all integration tests (Docker auto-managed)
npm run test:integration

# Run specific integration test (Docker auto-managed)
npm test -- CacheWatcher.integration.ts

# Run all unit tests
npm run test:unit

# Run tests in watch mode
npm run test:watch
```

### How It Works

1. **beforeAll (Test Suite Start)**
   - Start Docker containers with `docker-compose up -d --wait`
   - Wait 2 seconds for containers to be ready
   - Verify Redis and MySQL connectivity
   - Create test database schema if needed
   - **Clear all data** from Redis and MySQL

2. **afterEach (Between Each Test)**
   - Clear database and Redis via `resetAll()`
   - Ensures test isolation

3. **afterAll (Test Suite End)**
   - Close connections
   - Stop Docker containers with `docker-compose down`

### Benefits

✅ **No manual Docker management** - Just run `npm run test:integration`
✅ **Guaranteed clean state** - Data cleared before and after tests
✅ **Test isolation** - Each test starts fresh
✅ **One command** - Everything automated

### Environment Variables

- `DEBUG=1` - Enable console logs during tests (default suppressed)
- All test config in `TEST_CONFIG` (test-utils.ts)
