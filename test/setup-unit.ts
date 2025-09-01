/**
 * Setup file for unit tests
 * This file runs before each unit test suite
 */

// Increase test timeout for unit tests
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
const originalConsole = global.console;

beforeAll(() => {
  global.console = {
    ...originalConsole,
    // Keep error and warn for debugging
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  } as any;
});

afterAll(() => {
  global.console = originalConsole;
});

// Global test utilities
global.testUtils = {
  // Add any global test utilities here
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
};