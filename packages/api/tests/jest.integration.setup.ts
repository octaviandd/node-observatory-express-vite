/**
 * Jest Integration Test Setup
 *
 * This file configures the test environment for integration tests
 * that run against real Docker containers for Redis and MySQL.
 *
 * Automatically manages Docker container lifecycle.
 *
 * @format
 */

import { execSync } from "child_process";
import {
  verifyContainers,
  ensureTestSchema,
  resetAll,
  closeConnections,
} from "./integration/test-utils";

// Increase timeout for integration tests (60 seconds)
jest.setTimeout(60000);

// Mock console methods to reduce noise during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

/**
 * Start Docker containers for tests
 */
function startDockerContainers(): void {
  try {
    console.log("Starting Docker containers...");
    execSync("docker-compose -f tests/docker-compose.test.yml up -d --wait", {
      stdio: "pipe",
      cwd: process.cwd().split("/tests")[0],
    });
    console.log("✓ Docker containers started");
  } catch (error) {
    console.error("Failed to start Docker containers:", error);
    throw error;
  }
}

beforeAll(async () => {
  const originalLog = console.log;

  try {
    // Start Docker containers
    startDockerContainers();

    // Give containers a moment to be ready
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Suppress console.log during tests unless DEBUG is set
    if (!process.env.DEBUG) {
      console.log = jest.fn();
    }

    // Temporarily restore console for verification messages
    const tempLog = console.log;
    console.log = originalLog;

    try {
      // Verify Docker containers are running
      await verifyContainers();
      console.log("✓ Test containers verified");

      // Ensure test schema exists
      await ensureTestSchema();
      console.log("✓ Test schema ready");

      // Reset all data before running tests
      await resetAll();
      console.log("✓ Test databases cleared");
    } finally {
      // Restore suppressed console
      console.log = tempLog;
    }
  } catch (error) {
    console.error("Integration test setup failed:", error);
    throw error;
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

  // Stop Docker containers
  try {
    console.log("Stopping Docker containers...");
    execSync("docker-compose -f tests/docker-compose.test.yml down", {
      stdio: "pipe",
      cwd: process.cwd().split("/tests")[0],
    });
    console.log("✓ Docker containers stopped");
  } catch (error) {
    console.error("Failed to stop Docker containers:", error);
    // Don't throw - we still want tests to pass even if cleanup fails
  }
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
