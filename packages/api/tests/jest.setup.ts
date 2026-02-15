/**
 * Jest Integration Test Setup
 * 
 * This file configures the test environment for integration tests,
 * including mock setup for Redis and MySQL connections.
 */

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock console methods to reduce noise during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  // Suppress console.log during tests unless DEBUG is set
  if (!process.env.DEBUG) {
    console.log = jest.fn();
  }
});

afterAll(() => {
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
