/**
 * Jest Integration Test Setup
 * 
 * This file configures the test environment for integration tests
 * that run against real Docker containers for Redis and MySQL.
 */

import {
  verifyContainers,
  ensureTestSchema,
  resetAll,
  closeConnections,
} from './integration/test-utils';

// Increase timeout for integration tests (60 seconds)
jest.setTimeout(60000);

// Mock console methods to reduce noise during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(async () => {
  // Suppress console.log during tests unless DEBUG is set
  if (!process.env.DEBUG) {
    console.log = jest.fn();
  }

  // Temporarily restore console for container verification messages
  const tempLog = console.log;
  console.log = originalConsoleLog;

  try {
    // Verify Docker containers are running
    await verifyContainers();
    console.log('✓ Test containers verified');

    // Ensure test schema exists
    await ensureTestSchema();
    console.log('✓ Test schema ready');
  } finally {
    // Restore suppressed console
    console.log = tempLog;
  }
});

afterEach(async () => {
  // Reset data between tests
  await resetAll();
});

afterAll(async () => {
  // Clean up connections
  await closeConnections();

  // Restore console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
    }
  }
}

expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

export {};

