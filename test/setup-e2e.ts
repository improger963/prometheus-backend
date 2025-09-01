/**
 * Setup file for E2E tests
 * This file runs before each E2E test suite
 */

// Increase test timeout for E2E tests
jest.setTimeout(30000);

// Setup global test environment
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-key-for-testing';
  
  // Disable console output during tests to reduce noise
  if (process.env.VERBOSE_TESTS !== 'true') {
    console.log = jest.fn();
    console.debug = jest.fn();
    console.info = jest.fn();
  }
});

afterAll(async () => {
  // Cleanup any global resources
  await new Promise(resolve => setTimeout(resolve, 1000));
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global test utilities for E2E tests
global.testUtils = {
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  generateTestEmail: () => `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
  generateTestData: {
    user: () => ({
      email: global.testUtils.generateTestEmail(),
      password: 'password123',
    }),
    project: () => ({
      name: `Test Project ${Date.now()}`,
      description: 'Generated test project',
      gitRepositoryURL: 'https://github.com/test/repo.git',
    }),
    agent: () => ({
      name: `Test Agent ${Date.now()}`,
      description: 'Generated test agent',
      model: 'gpt-4',
      apiKey: `test-api-key-${Date.now()}`,
      systemPrompt: 'You are a helpful test assistant.',
      capabilities: ['testing', 'automation'],
    }),
    task: () => ({
      title: `Test Task ${Date.now()}`,
      description: 'Generated test task',
      priority: 'MEDIUM',
    }),
    knowledge: () => ({
      title: `Test Knowledge ${Date.now()}`,
      content: 'Generated test knowledge content',
      tags: ['test', 'generated'],
      visibility: 'public',
      category: 'testing',
    }),
  },
};