/**
 * Jest Configuration for Integration Tests
 * 
 * This configuration is specifically for integration tests that run
 * against real Docker containers for Redis and MySQL.
 * 
 * Usage:
 *   npm run test:integration
 * 
 * Prerequisites:
 *   npm run test:docker:up
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/integration'],
  testMatch: ['**/*.integration.ts'],
  collectCoverageFrom: [
    '../src/**/*.ts',
    '!../src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: { branches: 70, functions: 80, lines: 80, statements: 80 }
  },
  setupFilesAfterEnv: ['<rootDir>/jest.integration.setup.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  // Longer timeout for integration tests
  testTimeout: 60000,
  // Run tests serially to avoid race conditions with shared database
  maxWorkers: 1,
  // Verbose output for debugging integration issues
  verbose: true,
};

