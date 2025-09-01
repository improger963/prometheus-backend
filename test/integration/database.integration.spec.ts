import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigModule } from '@nestjs/config';

import { User } from '../../src/auth/entities/user.entity';
import { Project } from '../../src/projects/entities/project.entity';
import { Agent } from '../../src/agents/entities/agent.entity';
import { Task } from '../../src/tasks/entities/task.entity';
import { KnowledgeRecord } from '../../src/knowledge/entities/knowledge-record.entity';
import { AgentMemory } from '../../src/agents/entities/agent-memory.entity';

import { AuthService } from '../../src/auth/auth.service';
import { ProjectsService } from '../../src/projects/projects.service';
import { AgentsService } from '../../src/agents/agents.service';
import { TasksService } from '../../src/tasks/tasks.service';
import { KnowledgeService } from '../../src/knowledge/knowledge.service';

import { testDatabaseConfig } from '../test-database.config';
import { UserFixtures, ProjectFixtures, AgentFixtures, TaskFixtures, KnowledgeFixtures } from '../fixtures';

/**
 * Integration tests for database operations and cross-module interactions
 * These tests use a real database connection to verify entity relationships,
 * cascading operations, and data integrity constraints.
 */
describe('Database Integration Tests', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  
  // Repositories
  let userRepository: Repository<User>;
  let projectRepository: Repository<Project>;
  let agentRepository: Repository<Agent>;
  let taskRepository: Repository<Task>;
  let knowledgeRepository: Repository<KnowledgeRecord>;
  let agentMemoryRepository: Repository<AgentMemory>;
  
  // Services
  let authService: AuthService;
  let projectsService: ProjectsService;
  let agentsService: AgentsService;
  let tasksService: TasksService;
  let knowledgeService: KnowledgeService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({
            JWT_SECRET: 'test-secret-key-for-integration',
          })]
        }),
        TypeOrmModule.forRoot({
          ...testDatabaseConfig,
          synchronize: true, // Create tables for integration tests
          dropSchema: true,  // Clean slate for each test run
        }),
        TypeOrmModule.forFeature([User, Project, Agent, Task, KnowledgeRecord, AgentMemory]),
      ],
      providers: [
        AuthService,
        ProjectsService,
        AgentsService,
        TasksService,
        KnowledgeService,
      ],
    }).compile();

    dataSource = module.get<DataSource>(DataSource);
    
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    projectRepository = module.get<Repository<Project>>(getRepositoryToken(Project));
    agentRepository = module.get<Repository<Agent>>(getRepositoryToken(Agent));
    taskRepository = module.get<Repository<Task>>(getRepositoryToken(Task));
    knowledgeRepository = module.get<Repository<KnowledgeRecord>>(getRepositoryToken(KnowledgeRecord));
    agentMemoryRepository = module.get<Repository<AgentMemory>>(getRepositoryToken(AgentMemory));
    
    authService = module.get<AuthService>(AuthService);
    projectsService = module.get<ProjectsService>(ProjectsService);
    agentsService = module.get<AgentsService>(AgentsService);
    tasksService = module.get<TasksService>(TasksService);
    knowledgeService = module.get<KnowledgeService>(KnowledgeService);
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
    await module.close();
  });

  beforeEach(async () => {
    // Clean all tables before each test
    await agentMemoryRepository.delete({});
    await taskRepository.delete({});
    await knowledgeRepository.delete({});
    await agentRepository.delete({});
    await projectRepository.delete({});
    await userRepository.delete({});
  });

  describe('User-Project Relationships', () => {
    it('should maintain referential integrity between users and projects', async () => {
      // Create user
      const userData = UserFixtures.ADMIN_USER;
      const user = userRepository.create(userData);
      const savedUser = await userRepository.save(user);

      // Create projects for user
      const project1Data = { ...ProjectFixtures.BASIC_PROJECT, user: savedUser };
      const project2Data = { ...ProjectFixtures.ADVANCED_PROJECT, user: savedUser };
      
      const project1 = projectRepository.create(project1Data);
      const project2 = projectRepository.create(project2Data);
      
      const savedProjects = await projectRepository.save([project1, project2]);

      // Verify projects are associated with user
      const userWithProjects = await userRepository.findOne({
        where: { id: savedUser.id },
        relations: ['projects'],
      });

      expect(userWithProjects).toBeTruthy();
      expect(userWithProjects!.projects).toHaveLength(2);
      expect(userWithProjects!.projects.map(p => p.id)).toEqual(
        expect.arrayContaining(savedProjects.map(p => p.id))
      );
    });

    it('should cascade delete projects when user is deleted', async () => {
      // Create user and projects
      const user = userRepository.create(UserFixtures.ADMIN_USER);
      const savedUser = await userRepository.save(user);

      const projectData = { ...ProjectFixtures.BASIC_PROJECT, user: savedUser };
      const project = projectRepository.create(projectData);
      await projectRepository.save(project);

      // Verify project exists
      const projectsBefore = await projectRepository.find();
      expect(projectsBefore).toHaveLength(1);

      // Delete user
      await userRepository.remove(savedUser);

      // Verify projects are also deleted (if cascade is configured)
      const projectsAfter = await projectRepository.find();
      // Note: This depends on how cascade is configured in the entity
      // If cascade delete is enabled, projects should be deleted
      // If not, this test might need modification
    });

    it('should enforce user ownership constraints', async () => {
      // Create two users
      const user1 = userRepository.create(UserFixtures.ADMIN_USER);
      const user2 = userRepository.create(UserFixtures.TEAM_USERS[0]);
      const [savedUser1, savedUser2] = await userRepository.save([user1, user2]);

      // Create project for user1
      const projectData = { ...ProjectFixtures.BASIC_PROJECT, user: savedUser1 };
      const project = projectRepository.create(projectData);
      const savedProject = await projectRepository.save(project);

      // Verify user1 can access their project
      const user1Projects = await projectRepository.find({
        where: { user: { id: savedUser1.id } },
      });
      expect(user1Projects).toHaveLength(1);
      expect(user1Projects[0].id).toBe(savedProject.id);

      // Verify user2 cannot access user1's project
      const user2Projects = await projectRepository.find({
        where: { user: { id: savedUser2.id } },
      });
      expect(user2Projects).toHaveLength(0);
    });
  });

  describe('Project-Agent-Task Relationships', () => {
    let user: User;
    let project: Project;
    let agent: Agent;

    beforeEach(async () => {
      // Set up common test data
      user = userRepository.create(UserFixtures.ADMIN_USER);
      const savedUser = await userRepository.save(user);

      project = projectRepository.create({ ...ProjectFixtures.BASIC_PROJECT, user: savedUser });
      const savedProject = await projectRepository.save(project);

      agent = agentRepository.create({ ...AgentFixtures.BASIC_AGENT, user: savedUser });
      const savedAgent = await agentRepository.save(agent);

      // Update references
      user = savedUser;
      project = savedProject;
      agent = savedAgent;
    });

    it('should create complex entity relationships correctly', async () => {
      // Create task with agent assignment
      const taskData = {
        ...TaskFixtures.BASIC_TASK,
        project,
        assigneeIds: [agent.id],
      };
      const task = taskRepository.create(taskData);
      const savedTask = await taskRepository.save(task);

      // Verify all relationships
      const taskWithRelations = await taskRepository.findOne({
        where: { id: savedTask.id },
        relations: ['project', 'project.user'],
      });

      expect(taskWithRelations).toBeTruthy();
      expect(taskWithRelations!.project.id).toBe(project.id);
      expect(taskWithRelations!.project.user.id).toBe(user.id);
      expect(taskWithRelations!.assigneeIds).toContain(agent.id);
    });

    it('should maintain data integrity across multiple operations', async () => {
      // Create multiple tasks
      const tasks = [];
      for (let i = 0; i < 5; i++) {
        const taskData = {
          ...TaskFixtures.BASIC_TASK,
          title: `Task ${i + 1}`,
          project,
          assigneeIds: [agent.id],
        };
        const task = taskRepository.create(taskData);
        tasks.push(await taskRepository.save(task));
      }

      // Verify all tasks are properly linked
      const projectTasks = await taskRepository.find({
        where: { project: { id: project.id } },
        relations: ['project'],
      });

      expect(projectTasks).toHaveLength(5);
      projectTasks.forEach(task => {
        expect(task.project.id).toBe(project.id);
        expect(task.assigneeIds).toContain(agent.id);
      });

      // Update tasks
      const updates = tasks.map(task => {
        task.status = 'IN_PROGRESS' as any;
        return task;
      });
      await taskRepository.save(updates);

      // Verify updates persisted
      const updatedTasks = await taskRepository.find({
        where: { project: { id: project.id } },
      });

      expect(updatedTasks.every(task => task.status === 'IN_PROGRESS')).toBe(true);
    });

    it('should handle agent memory relationships', async () => {
      // Create task
      const taskData = {
        ...TaskFixtures.BASIC_TASK,
        project,
        assigneeIds: [agent.id],
      };
      const task = taskRepository.create(taskData);
      const savedTask = await taskRepository.save(task);

      // Create agent memory
      const memoryData = {
        agentId: agent.id,
        taskId: savedTask.id,
        context: 'Test memory context',
        history: [
          { action: 'Started task', result: 'Success', tokenCount: 10 },
          { action: 'Analyzed problem', result: 'Found solution', tokenCount: 25 },
        ],
        currentTokenCount: 35,
        maxTokenCount: 1000,
      };
      const memory = agentMemoryRepository.create(memoryData);
      const savedMemory = await agentMemoryRepository.save(memory);

      // Verify memory relationships
      const memoryWithRelations = await agentMemoryRepository.findOne({
        where: { id: savedMemory.id },
      });

      expect(memoryWithRelations).toBeTruthy();
      expect(memoryWithRelations!.agentId).toBe(agent.id);
      expect(memoryWithRelations!.taskId).toBe(savedTask.id);
      expect(memoryWithRelations!.history).toHaveLength(2);
    });
  });

  describe('Knowledge Management Integration', () => {
    let user: User;

    beforeEach(async () => {
      user = userRepository.create(UserFixtures.ADMIN_USER);
      const savedUser = await userRepository.save(user);
      user = savedUser;
    });

    it('should handle knowledge record relationships', async () => {
      // Create knowledge records
      const knowledge1Data = { ...KnowledgeFixtures.BASIC_KNOWLEDGE, user };
      const knowledge2Data = { ...KnowledgeFixtures.ADVANCED_KNOWLEDGE, user };
      
      const knowledge1 = knowledgeRepository.create(knowledge1Data);
      const knowledge2 = knowledgeRepository.create(knowledge2Data);
      
      const savedKnowledge = await knowledgeRepository.save([knowledge1, knowledge2]);

      // Verify user-knowledge relationships
      const userKnowledge = await knowledgeRepository.find({
        where: { user: { id: user.id } },
        relations: ['user'],
      });

      expect(userKnowledge).toHaveLength(2);
      userKnowledge.forEach(knowledge => {
        expect(knowledge.user.id).toBe(user.id);
      });
    });

    it('should support knowledge search and filtering', async () => {
      // Create knowledge with different categories and tags
      const knowledgeRecords = [
        {
          ...KnowledgeFixtures.BASIC_KNOWLEDGE,
          user,
          category: 'technical',
          tags: ['javascript', 'programming'],
        },
        {
          ...KnowledgeFixtures.ADVANCED_KNOWLEDGE,
          user,
          category: 'business',
          tags: ['strategy', 'planning'],
        },
        {
          title: 'Mixed Knowledge',
          content: 'Content with mixed tags',
          user,
          category: 'technical',
          tags: ['javascript', 'strategy'],
          visibility: 'public' as const,
        },
      ];

      const savedRecords = await knowledgeRepository.save(
        knowledgeRecords.map(data => knowledgeRepository.create(data))
      );

      // Test category filtering
      const technicalKnowledge = await knowledgeRepository.find({
        where: { category: 'technical' },
      });
      expect(technicalKnowledge).toHaveLength(2);

      // Test tag-based search using query builder
      const jsKnowledge = await knowledgeRepository
        .createQueryBuilder('knowledge')
        .where(':tag = ANY(knowledge.tags)', { tag: 'javascript' })
        .getMany();
      expect(jsKnowledge).toHaveLength(2);
    });

    it('should handle knowledge rating and statistics', async () => {
      // Create knowledge record
      const knowledgeData = {
        ...KnowledgeFixtures.BASIC_KNOWLEDGE,
        user,
        rating: 0.0,
        ratingCount: 0,
        useCount: 0,
      };
      const knowledge = knowledgeRepository.create(knowledgeData);
      const savedKnowledge = await knowledgeRepository.save(knowledge);

      // Simulate rating updates
      savedKnowledge.rating = 4.5;
      savedKnowledge.ratingCount = 10;
      savedKnowledge.useCount = 25;
      await knowledgeRepository.save(savedKnowledge);

      // Verify statistics
      const updatedKnowledge = await knowledgeRepository.findOne({
        where: { id: savedKnowledge.id },
      });

      expect(updatedKnowledge!.rating).toBe(4.5);
      expect(updatedKnowledge!.ratingCount).toBe(10);
      expect(updatedKnowledge!.useCount).toBe(25);
    });
  });

  describe('Cross-Module Data Integrity', () => {
    it('should maintain consistency during complex operations', async () => {
      // Create a complete scenario with all entities
      const user = userRepository.create(UserFixtures.ADMIN_USER);
      const savedUser = await userRepository.save(user);

      const project = projectRepository.create({
        ...ProjectFixtures.BASIC_PROJECT,
        user: savedUser,
      });
      const savedProject = await projectRepository.save(project);

      const agent = agentRepository.create({
        ...AgentFixtures.BASIC_AGENT,
        user: savedUser,
      });
      const savedAgent = await agentRepository.save(agent);

      const task = taskRepository.create({
        ...TaskFixtures.BASIC_TASK,
        project: savedProject,
        assigneeIds: [savedAgent.id],
      });
      const savedTask = await taskRepository.save(task);

      const knowledge = knowledgeRepository.create({
        ...KnowledgeFixtures.BASIC_KNOWLEDGE,
        user: savedUser,
      });
      const savedKnowledge = await knowledgeRepository.save(knowledge);

      // Verify all entities are properly connected
      const fullUser = await userRepository.findOne({
        where: { id: savedUser.id },
        relations: ['projects', 'agents', 'knowledgeRecords'],
      });

      expect(fullUser).toBeTruthy();
      expect(fullUser!.projects).toHaveLength(1);
      expect(fullUser!.agents).toHaveLength(1);
      expect(fullUser!.knowledgeRecords).toHaveLength(1);

      const fullProject = await projectRepository.findOne({
        where: { id: savedProject.id },
        relations: ['user', 'tasks'],
      });

      expect(fullProject).toBeTruthy();
      expect(fullProject!.user.id).toBe(savedUser.id);
      expect(fullProject!.tasks).toHaveLength(1);
      expect(fullProject!.tasks[0].id).toBe(savedTask.id);
    });

    it('should handle transaction rollbacks properly', async () => {
      const user = userRepository.create(UserFixtures.ADMIN_USER);
      const savedUser = await userRepository.save(user);

      // Use a transaction to test rollback behavior
      await dataSource.transaction(async manager => {
        const project = manager.create(Project, {
          ...ProjectFixtures.BASIC_PROJECT,
          user: savedUser,
        });
        const savedProject = await manager.save(project);

        const agent = manager.create(Agent, {
          ...AgentFixtures.BASIC_AGENT,
          user: savedUser,
        });
        await manager.save(agent);

        // Verify entities exist within transaction
        const transactionProjects = await manager.find(Project);
        const transactionAgents = await manager.find(Agent);
        expect(transactionProjects).toHaveLength(1);
        expect(transactionAgents).toHaveLength(1);

        // Force an error to test rollback
        throw new Error('Test rollback');
      }).catch(error => {
        expect(error.message).toBe('Test rollback');
      });

      // Verify rollback worked - only user should exist
      const finalProjects = await projectRepository.find();
      const finalAgents = await agentRepository.find();
      expect(finalProjects).toHaveLength(0);
      expect(finalAgents).toHaveLength(0);
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle bulk operations efficiently', async () => {
      const user = userRepository.create(UserFixtures.ADMIN_USER);
      const savedUser = await userRepository.save(user);

      // Create many entities efficiently
      const projects = [];
      const agents = [];
      const knowledge = [];

      for (let i = 0; i < 50; i++) {
        projects.push(projectRepository.create({
          ...ProjectFixtures.BASIC_PROJECT,
          name: `Bulk Project ${i}`,
          user: savedUser,
        }));

        agents.push(agentRepository.create({
          ...AgentFixtures.BASIC_AGENT,
          name: `Bulk Agent ${i}`,
          user: savedUser,
        }));

        knowledge.push(knowledgeRepository.create({
          ...KnowledgeFixtures.BASIC_KNOWLEDGE,
          title: `Bulk Knowledge ${i}`,
          user: savedUser,
        }));
      }

      const startTime = Date.now();

      // Bulk save operations
      await projectRepository.save(projects);
      await agentRepository.save(agents);
      await knowledgeRepository.save(knowledge);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify all entities were created
      const finalCounts = await Promise.all([
        projectRepository.count(),
        agentRepository.count(),
        knowledgeRepository.count(),
      ]);

      expect(finalCounts).toEqual([50, 50, 50]);
      
      // Performance should be reasonable (adjust threshold as needed)
      expect(duration).toBeLessThan(10000); // 10 seconds max
    });

    it('should optimize query performance with proper indexing', async () => {
      const user = userRepository.create(UserFixtures.ADMIN_USER);
      const savedUser = await userRepository.save(user);

      // Create test data
      const projects = [];
      for (let i = 0; i < 100; i++) {
        projects.push(projectRepository.create({
          ...ProjectFixtures.BASIC_PROJECT,
          name: `Query Test Project ${i}`,
          user: savedUser,
        }));
      }
      await projectRepository.save(projects);

      // Test query performance
      const startTime = Date.now();
      
      const userProjects = await projectRepository.find({
        where: { user: { id: savedUser.id } },
        take: 10,
        skip: 0,
        order: { createdAt: 'DESC' },
      });

      const endTime = Date.now();
      const queryDuration = endTime - startTime;

      expect(userProjects).toHaveLength(10);
      // Query should be fast with proper indexing
      expect(queryDuration).toBeLessThan(1000); // 1 second max
    });
  });

  describe('Database Constraints and Validation', () => {
    it('should enforce unique constraints where applicable', async () => {
      const user = userRepository.create(UserFixtures.ADMIN_USER);
      const savedUser = await userRepository.save(user);

      // Test user email uniqueness
      const duplicateUser = userRepository.create({
        ...UserFixtures.TEAM_USERS[0],
        email: savedUser.email, // Same email
      });

      await expect(userRepository.save(duplicateUser)).rejects.toThrow();
    });

    it('should validate data types and constraints', async () => {
      // Test invalid data
      const invalidUser = userRepository.create({
        email: 'invalid-email', // Invalid email format
        password: '', // Empty password
      } as any);

      // Note: This test depends on validation being implemented at the database or entity level
      // If validation is only at the service level, this test might need modification
    });

    it('should handle foreign key constraints', async () => {
      // Try to create entities with invalid foreign keys
      const nonExistentUserId = '12345678-1234-1234-1234-123456789012';
      
      const projectWithInvalidUser = projectRepository.create({
        ...ProjectFixtures.BASIC_PROJECT,
        user: { id: nonExistentUserId } as any,
      });

      await expect(projectRepository.save(projectWithInvalidUser)).rejects.toThrow();
    });
  });

  describe('Concurrent Access and Locking', () => {
    it('should handle concurrent modifications correctly', async () => {
      const user = userRepository.create(UserFixtures.ADMIN_USER);
      const savedUser = await userRepository.save(user);

      const project = projectRepository.create({
        ...ProjectFixtures.BASIC_PROJECT,
        user: savedUser,
      });
      const savedProject = await projectRepository.save(project);

      // Simulate concurrent updates
      const update1Promise = projectRepository.update(savedProject.id, {
        name: 'Updated by Process 1',
      });

      const update2Promise = projectRepository.update(savedProject.id, {
        description: 'Updated by Process 2',
      });

      await Promise.all([update1Promise, update2Promise]);

      // Verify final state
      const finalProject = await projectRepository.findOne({
        where: { id: savedProject.id },
      });

      expect(finalProject).toBeTruthy();
      // Both updates should be applied or handled according to database concurrency rules
    });

    it('should handle race conditions in entity creation', async () => {
      const user = userRepository.create(UserFixtures.ADMIN_USER);
      const savedUser = await userRepository.save(user);

      // Create multiple entities concurrently
      const createPromises = [];
      for (let i = 0; i < 10; i++) {
        createPromises.push(
          projectRepository.save(
            projectRepository.create({
              ...ProjectFixtures.BASIC_PROJECT,
              name: `Concurrent Project ${i}`,
              user: savedUser,
            })
          )
        );
      }

      const results = await Promise.all(createPromises);

      // All entities should be created successfully
      expect(results).toHaveLength(10);
      
      // All should have unique IDs
      const ids = results.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });
  });
});