/**
 * Setup file for integration tests
 * This file runs before each integration test suite
 */

// Increase test timeout for integration tests
jest.setTimeout(30000);

// Setup global test environment for integration tests
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-key-for-testing';
  
  // Database configuration for integration tests
  process.env.TEST_DB_HOST = 'localhost';
  process.env.TEST_DB_PORT = '5433';
  process.env.TEST_DB_USER = 'test_user';
  process.env.TEST_DB_PASSWORD = 'test_password';
  process.env.TEST_DB_NAME = 'prometheus_integration_test';
});

afterAll(async () => {
  // Cleanup any global resources
  await new Promise(resolve => setTimeout(resolve, 1000));
});

// Global utilities for integration tests
global.testUtils = {
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Database utilities
  database: {
    waitForConnection: async (dataSource: any, maxAttempts = 10) => {
      let attempts = 0;
      while (attempts < maxAttempts) {
        try {
          if (dataSource.isInitialized) {
            return true;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) {
            throw new Error(`Failed to connect to database after ${maxAttempts} attempts: ${error.message}`);
          }
        }
      }
      return false;
    },
    
    cleanupAll: async (dataSource: any) => {
      if (!dataSource || !dataSource.isInitialized) {
        return;
      }
      
      const entities = dataSource.entityMetadatas;
      for (const entity of entities) {
        const repository = dataSource.getRepository(entity.name);
        await repository.clear();
      }
    },
  },
  
  // Module testing utilities
  modules: {
    createTestModule: async (imports: any[], providers: any[] = []) => {
      const { Test } = await import('@nestjs/testing');
      const { ConfigModule } = await import('@nestjs/config');
      const { TypeOrmModule } = await import('@nestjs/typeorm');
      const { testDatabaseConfig } = require('./test-database.config');
      
      return Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            ignoreEnvFile: true,
            load: [() => ({
              JWT_SECRET: 'test-secret-key-for-testing',
            })]
          }),
          TypeOrmModule.forRoot(testDatabaseConfig),
          ...imports,
        ],
        providers,
      }).compile();
    },
  },
};