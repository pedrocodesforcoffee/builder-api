import 'jest-extended';

/**
 * Global Jest setup
 * This file runs before each test file
 */

// Set test timeout globally
jest.setTimeout(30000);

// Mock console methods in tests to reduce noise
// Tests can override this if needed
global.console = {
  ...console,
  // Keep error and warn for debugging
  error: jest.fn(console.error),
  warn: jest.fn(console.warn),
  // Suppress info, log, debug in tests
  info: jest.fn(),
  log: jest.fn(),
  debug: jest.fn(),
};

/**
 * Global test utilities
 */
declare global {
  namespace NodeJS {
    interface Global {
      testUtils: {
        sleep: (ms: number) => Promise<void>;
      };
    }
  }
}

// Add global test utilities
(global as any).testUtils = {
  sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/**
 * Custom matchers setup
 * jest-extended provides additional matchers like:
 * - toBeArray()
 * - toBeEmpty()
 * - toContainKey()
 * - toContainValue()
 * - And many more...
 */

/**
 * Clean up after each test
 */
afterEach(() => {
  // Clear all mocks after each test
  jest.clearAllMocks();
});
