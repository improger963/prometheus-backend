import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../src/auth/entities/user.entity';
import { Project } from '../src/projects/entities/project.entity';
import { Agent } from '../src/agents/entities/agent.entity';
import { Task } from '../src/tasks/entities/task.entity';
import { AgentMemory } from '../src/agents/entities/agent-memory.entity';
import { KnowledgeRecord } from '../src/knowledge/entities/knowledge-record.entity';

/**
 * Test database configuration for PostgreSQL
 * This configuration should match the production database structure
 * but use a separate test database
 */
export const testDatabaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5433'),
  username: process.env.TEST_DB_USER || 'test_user',
  password: process.env.TEST_DB_PASSWORD || 'test_password',
  database: process.env.TEST_DB_NAME || 'prometheus_test',
  entities: [User, Project, Agent, Task, AgentMemory, KnowledgeRecord],
  synchronize: true, // Only for testing - creates schema automatically
  dropSchema: true, // Drop schema before each test run for clean state
  logging: false, // Set to true for debugging database queries
};

/**
 * Alternative SQLite in-memory configuration for fast unit tests
 * Use this for testing that doesn't require PostgreSQL-specific features
 */
export const sqliteTestConfig: TypeOrmModuleOptions = {
  type: 'sqlite',
  database: ':memory:',
  entities: [User, Project, Agent, Task, AgentMemory, KnowledgeRecord],
  synchronize: true,
  dropSchema: true,
  logging: false,
};

/**
 * Database connection helper for tests
 */
export class TestDatabaseHelper {
  static async clearDatabase(dataSource: any): Promise<void> {
    const entities = dataSource.entityMetadatas;
    
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.clear();
    }
  }

  static async recreateDatabase(dataSource: any): Promise<void> {
    await dataSource.dropDatabase();
    await dataSource.synchronize();
  }
}