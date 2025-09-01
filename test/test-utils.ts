import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, ObjectLiteral } from 'typeorm';
import { User } from '../src/auth/entities/user.entity';
import { Project } from '../src/projects/entities/project.entity';
import { Agent } from '../src/agents/entities/agent.entity';
import { Task } from '../src/tasks/entities/task.entity';
import { AgentMemory, MemoryStep } from '../src/agents/entities/agent-memory.entity';
import { KnowledgeRecord } from '../src/knowledge/entities/knowledge-record.entity';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { sqliteTestConfig } from './test-database.config';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

// Import fixtures for better test data management
import {
  UserFixtures,
  ProjectFixtures,
  AgentFixtures,
  TaskFixtures,
  KnowledgeFixtures,
  CommonTestData,
  TestDataGenerators,
  TestScenarioBuilder,
} from './fixtures';

/**
 * Base test utilities for creating mock repositories and data
 */
export class TestUtils {
  /**
   * Create a mock repository with common methods
   */
  static createMockRepository<T extends ObjectLiteral>(): jest.Mocked<Repository<T>> {
    return {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      findBy: jest.fn(),
      findByIds: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
      clear: jest.fn(),
      createQueryBuilder: jest.fn(),
      manager: {} as any,
      metadata: {} as any,
      queryRunner: {} as any,
      target: {} as any,
    } as any;
  }

  /**
   * Create mock providers for TypeORM repositories
   */
  static createMockProviders(entities: any[]) {
    return entities.map(entity => ({
      provide: getRepositoryToken(entity),
      useValue: TestUtils.createMockRepository(),
    }));
  }

  /**
   * Create a test module with SQLite in-memory database
   */
  static async createTestModule(imports: any[], providers: any[] = []) {
    return Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({
            JWT_SECRET: 'test-secret-key-for-testing',
          })]
        }),
        TypeOrmModule.forRoot(sqliteTestConfig),
        ...imports,
      ],
      providers,
    }).compile();
  }
}

/**
 * Mock data factory for creating test entities
 * @deprecated Use fixtures from './fixtures' instead for better type safety and consistency
 */
export class MockDataFactory {
  /**
   * Create a mock user
   * @deprecated Use UserFixtures.generateUser() instead
   */
  static createUser(overrides: Partial<User> = {}): User {
    return UserFixtures.generateUser(overrides) as User;
  }

  /**
   * Create a mock project
   * @deprecated Use ProjectFixtures.generateProject() instead
   */
  static createProject(overrides: Partial<Project> = {}): Project {
    return ProjectFixtures.generateProject(overrides) as Project;
  }

  /**
   * Create a mock agent
   * @deprecated Use AgentFixtures.generateAgent() instead
   */
  static createAgent(overrides: Partial<Agent> = {}): Agent {
    return AgentFixtures.generateAgent(overrides) as Agent;
  }

  /**
   * Create a mock task
   * @deprecated Use TaskFixtures.generateTask() instead
   */
  static createTask(overrides: Partial<Task> = {}): Task {
    return TaskFixtures.generateTask(overrides) as Task;
  }

  /**
   * Create a mock knowledge record
   * @deprecated Use KnowledgeFixtures.generateKnowledge() instead
   */
  static createKnowledgeRecord(overrides: Partial<KnowledgeRecord> = {}): KnowledgeRecord {
    return KnowledgeFixtures.generateKnowledge(overrides) as KnowledgeRecord;
  }

  /**
   * Create a mock agent memory
   */
  static createAgentMemory(overrides: Partial<AgentMemory> = {}): AgentMemory {
    const memory = new AgentMemory();
    memory.id = 'test-memory-id';
    memory.agentId = 'test-agent-id';
    memory.taskId = 'test-task-id';
    memory.contextHistory = [
      {
        timestamp: new Date(),
        action: 'test action',
        result: 'test result',
        tokenCount: 100,
      }
    ];
    memory.globalGoal = 'Test global goal';
    memory.totalTokenCount = 100;
    memory.isCompressed = false;
    memory.compressionRatio = 0.0;
    memory.agent = AgentFixtures.generateAgent() as Agent;
    memory.createdAt = new Date();
    memory.updatedAt = new Date();
    return Object.assign(memory, overrides);
  }

  /**
   * Create JWT token for testing
   */
  static createJwtToken(userId: string = 'test-user-id'): string {
    const jwtService = new JwtService({ secret: 'test-secret-key-for-testing' });
    return jwtService.sign({ sub: userId, email: 'test@example.com' });
  }

  /**
   * Create request object with authenticated user
   */
  static createAuthenticatedRequest(user?: Partial<User>) {
    return {
      user: UserFixtures.generateUser(user) as User,
    };
  }
}

/**
 * Test constants
 */
export const TEST_CONSTANTS = {
  VALID_EMAIL: 'test@example.com',
  INVALID_EMAIL: 'invalid-email',
  VALID_PASSWORD: 'password123',
  WEAK_PASSWORD: '123',
  TEST_JWT_SECRET: 'test-secret-key-for-testing',
  DEFAULT_PAGINATION: {
    page: 1,
    limit: 10,
  },
};

// Re-export fixtures for easy access
export {
  UserFixtures,
  ProjectFixtures,
  AgentFixtures,
  TaskFixtures,
  KnowledgeFixtures,
  CommonTestData,
  TestDataGenerators,
  TestScenarioBuilder,
} from './fixtures';

/**
 * Enhanced test expectations and matchers
 */
export class TestExpectations {
  /**
   * Expect entity to have required timestamps
   */
  static expectEntityTimestamps(entity: any) {
    expect(entity.createdAt).toBeDefined();
    expect(entity.updatedAt).toBeDefined();
    expect(entity.createdAt).toBeInstanceOf(Date);
    expect(entity.updatedAt).toBeInstanceOf(Date);
  }

  /**
   * Expect pagination response structure
   */
  static expectPaginationResponse(response: any) {
    expect(response.records).toBeInstanceOf(Array);
    expect(response.total).toBeDefined();
    expect(response.page).toBeDefined();
    expect(response.limit).toBeDefined();
    expect(typeof response.total).toBe('number');
    expect(typeof response.page).toBe('number');
    expect(typeof response.limit).toBe('number');
  }

  /**
   * Expect user data without password
   */
  static expectSafeUserData(user: any) {
    expect(user.id).toBeDefined();
    expect(user.email).toBeDefined();
    expect(user.password).toBeUndefined();
    TestExpectations.expectEntityTimestamps(user);
  }

  /**
   * Expect valid project structure
   */
  static expectValidProject(project: any) {
    expect(project.id).toBeDefined();
    expect(project.name).toBeDefined();
    expect(project.agentIds).toBeInstanceOf(Array);
    TestExpectations.expectEntityTimestamps(project);
  }

  /**
   * Expect valid agent structure
   */
  static expectValidAgent(agent: any) {
    expect(agent.id).toBeDefined();
    expect(agent.name).toBeDefined();
    expect(agent.model).toBeDefined();
    expect(agent.capabilities).toBeInstanceOf(Array);
    expect(typeof agent.rating).toBe('number');
    expect(typeof agent.experience).toBe('number');
    TestExpectations.expectEntityTimestamps(agent);
  }

  /**
   * Expect valid task structure
   */
  static expectValidTask(task: any) {
    expect(task.id).toBeDefined();
    expect(task.title).toBeDefined();
    expect(task.status).toBeDefined();
    expect(task.priority).toBeDefined();
    expect(task.assigneeIds).toBeInstanceOf(Array);
    TestExpectations.expectEntityTimestamps(task);
  }

  /**
   * Expect valid knowledge record structure
   */
  static expectValidKnowledge(knowledge: any) {
    expect(knowledge.id).toBeDefined();
    expect(knowledge.title).toBeDefined();
    expect(knowledge.content).toBeDefined();
    expect(knowledge.tags).toBeInstanceOf(Array);
    expect(knowledge.visibility).toBeDefined();
    expect(typeof knowledge.rating).toBe('number');
    expect(typeof knowledge.useCount).toBe('number');
    TestExpectations.expectEntityTimestamps(knowledge);
  }

  /**
   * Expect HTTP error response structure
   */
  static expectErrorResponse(response: any, statusCode: number) {
    expect(response.status).toBe(statusCode);
    expect(response.body.message).toBeDefined();
  }

  /**
   * Expect WebSocket event structure
   */
  static expectWebSocketEvent(event: any, requiredFields: string[]) {
    requiredFields.forEach(field => {
      expect(event[field]).toBeDefined();
    });
    if (event.timestamp) {
      expect(new Date(event.timestamp)).toBeInstanceOf(Date);
    }
  }
}

/**
 * Clean up utilities for tests
 */
export class TestCleanup {
  /**
   * Clear all repositories
   */
  static async clearRepositories(dataSource: DataSource) {
    const entities = dataSource.entityMetadatas;
    
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.clear();
    }
  }

  /**
   * Reset all mocks
   */
  static resetAllMocks() {
    jest.clearAllMocks();
    jest.resetAllMocks();
    jest.restoreAllMocks();
  }
}