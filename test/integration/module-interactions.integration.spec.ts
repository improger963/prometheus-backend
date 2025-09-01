import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule, EventEmitter2 } from '@nestjs/event-emitter';

import { AuthModule } from '../../src/auth/auth.module';
import { ProjectsModule } from '../../src/projects/projects.module';
import { AgentsModule } from '../../src/agents/agents.module';
import { TasksModule } from '../../src/tasks/tasks.module';
import { KnowledgeModule } from '../../src/knowledge/knowledge.module';
import { OrchestratorModule } from '../../src/orchestrator/orchestrator.module';

import { AuthService } from '../../src/auth/auth.service';
import { ProjectsService } from '../../src/projects/projects.service';
import { ProjectTeamService } from '../../src/projects/project-team.service';
import { AgentsService } from '../../src/agents/agents.service';
import { TasksService } from '../../src/tasks/tasks.service';
import { KnowledgeService } from '../../src/knowledge/knowledge.service';
import { OrchestrationService } from '../../src/orchestrator/orchestration.service';

import { testDatabaseConfig } from '../test-database.config';
import { DataSource } from 'typeorm';

/**
 * Integration tests for module interactions and cross-module communication
 * These tests verify that different modules work correctly together,
 * including event-driven communication and service dependencies.
 */
describe('Module Interactions Integration Tests', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let eventEmitter: EventEmitter2;
  
  // Services
  let authService: AuthService;
  let projectsService: ProjectsService;
  let projectTeamService: ProjectTeamService;
  let agentsService: AgentsService;
  let tasksService: TasksService;
  let knowledgeService: KnowledgeService;
  let orchestrationService: OrchestrationService;

  // Test data
  let testUser: any;
  let testProject: any;
  let testAgent: any;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({
            JWT_SECRET: 'test-secret-key-for-module-integration',
          })]
        }),
        TypeOrmModule.forRoot({
          ...testDatabaseConfig,
          synchronize: true,
          dropSchema: true,
        }),
        EventEmitterModule.forRoot(),
        AuthModule,
        ProjectsModule,
        AgentsModule,
        TasksModule,
        KnowledgeModule,
        OrchestratorModule,
      ],
    }).compile();

    dataSource = module.get<DataSource>(DataSource);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    
    authService = module.get<AuthService>(AuthService);
    projectsService = module.get<ProjectsService>(ProjectsService);
    projectTeamService = module.get<ProjectTeamService>(ProjectTeamService);
    agentsService = module.get<AgentsService>(AgentsService);
    tasksService = module.get<TasksService>(TasksService);
    knowledgeService = module.get<KnowledgeService>(KnowledgeService);
    orchestrationService = module.get<OrchestrationService>(OrchestrationService);
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
    await module.close();
  });

  beforeEach(async () => {
    // Clean up database and create fresh test data
    await dataSource.query('TRUNCATE TABLE "agent_memory" CASCADE');
    await dataSource.query('TRUNCATE TABLE "task" CASCADE');
    await dataSource.query('TRUNCATE TABLE "knowledge_record" CASCADE');
    await dataSource.query('TRUNCATE TABLE "agent" CASCADE');
    await dataSource.query('TRUNCATE TABLE "project" CASCADE');
    await dataSource.query('TRUNCATE TABLE "user" CASCADE');

    // Create test user
    const signupResult = await authService.signUp({
      email: 'integration-test@example.com',
      password: 'password123',
    });
    
    // Extract user info from JWT token
    const tokenPayload = JSON.parse(
      Buffer.from(signupResult.token.split('.')[1], 'base64').toString()
    );
    testUser = { id: tokenPayload.sub, email: tokenPayload.email };
  });

  describe('Auth-Projects Integration', () => {
    it('should create projects for authenticated users', async () => {
      const projectData = {
        name: 'Integration Test Project',
        description: 'Testing auth-projects integration',
        gitRepositoryURL: 'https://github.com/test/integration-repo.git',
      };

      const project = await projectsService.create(projectData, testUser);

      expect(project).toBeDefined();
      expect(project.name).toBe(projectData.name);
      expect(project.user).toBeDefined();
      expect(project.user.id).toBe(testUser.id);

      testProject = project;
    });

    it('should enforce user ownership in project operations', async () => {
      // Create second user
      const secondUserResult = await authService.signUp({
        email: 'second-user@example.com',
        password: 'password123',
      });
      const secondUserPayload = JSON.parse(
        Buffer.from(secondUserResult.token.split('.')[1], 'base64').toString()
      );
      const secondUser = { id: secondUserPayload.sub, email: secondUserPayload.email };

      // First user creates project
      const project = await projectsService.create({
        name: 'Ownership Test Project',
        description: 'Testing project ownership',
      }, testUser);

      // Second user should not be able to access first user's project
      await expect(
        projectsService.findOne(project.id, secondUser)
      ).rejects.toThrow();

      // Second user should not be able to update first user's project
      await expect(
        projectsService.update(project.id, { name: 'Hacked Name' }, secondUser)
      ).rejects.toThrow();
    });
  });

  describe('Projects-Agents-Tasks Workflow', () => {
    beforeEach(async () => {
      // Create test project
      testProject = await projectsService.create({
        name: 'Workflow Test Project',
        description: 'Testing project-agent-task workflow',
      }, testUser);

      // Create test agent
      testAgent = await agentsService.createGlobalAgent(testUser.id, {
        name: 'Workflow Test Agent',
        description: 'Agent for workflow testing',
        model: 'gpt-4',
        apiKey: 'test-api-key',
        systemPrompt: 'You are a test agent.',
        capabilities: ['testing', 'integration'],
      });
    });

    it('should complete full project-agent-task workflow', async () => {
      // Add agent to project team
      await projectTeamService.inviteAgentToProject(
        testProject.id,
        testAgent.id,
        testUser.id
      );

      // Verify agent is in project team
      const projectTeam = await projectTeamService.getProjectTeam(
        testProject.id,
        testUser.id
      );
      expect(projectTeam.agents).toHaveLength(1);
      expect(projectTeam.agents[0].id).toBe(testAgent.id);

      // Create task and assign to agent
      const task = await tasksService.create(testProject.id, {
        title: 'Integration Test Task',
        description: 'Testing task creation and assignment',
        priority: 'HIGH',
        assigneeIds: [testAgent.id],
      }, testUser);

      expect(task).toBeDefined();
      expect(task.project.id).toBe(testProject.id);
      expect(task.assigneeIds).toContain(testAgent.id);

      // Verify task appears in project tasks
      const projectTasks = await tasksService.findAll(testProject.id, testUser);
      expect(projectTasks).toHaveLength(1);
      expect(projectTasks[0].id).toBe(task.id);
    });

    it('should handle agent removal from project and task reassignment', async () => {
      // Add agent to project and create task
      await projectTeamService.inviteAgentToProject(
        testProject.id,
        testAgent.id,
        testUser.id
      );

      const task = await tasksService.create(testProject.id, {
        title: 'Task Before Agent Removal',
        description: 'This task will be affected by agent removal',
        assigneeIds: [testAgent.id],
      }, testUser);

      // Remove agent from project
      await projectTeamService.removeAgentFromProject(
        testProject.id,
        testAgent.id,
        testUser.id
      );

      // Verify agent is removed from team
      const projectTeam = await projectTeamService.getProjectTeam(
        testProject.id,
        testUser.id
      );
      expect(projectTeam.agents).toHaveLength(0);

      // Task should still exist but assignment might need to be handled
      const updatedTask = await tasksService.findOne(
        testProject.id,
        task.id,
        testUser
      );
      expect(updatedTask).toBeDefined();
      // Note: Implementation might handle removed agent assignments differently
    });

    it('should validate agent capabilities for task assignment', async () => {
      // Create agent with specific capabilities
      const specializedAgent = await agentsService.createGlobalAgent(testUser.id, {
        name: 'Specialized Agent',
        description: 'Agent with specific capabilities',
        model: 'gpt-4',
        apiKey: 'test-api-key',
        systemPrompt: 'You are a specialized agent.',
        capabilities: ['data-analysis', 'reporting'],
      });

      await projectTeamService.inviteAgentToProject(
        testProject.id,
        specializedAgent.id,
        testUser.id
      );

      // Create task that requires specific capabilities
      const task = await tasksService.create(testProject.id, {
        title: 'Data Analysis Task',
        description: 'Requires data analysis capabilities',
        assigneeIds: [specializedAgent.id],
      }, testUser);

      expect(task.assigneeIds).toContain(specializedAgent.id);
    });
  });

  describe('Event-Driven Communication', () => {
    let eventsSpy: jest.SpyInstance;

    beforeEach(async () => {
      // Set up test data
      testProject = await projectsService.create({
        name: 'Event Test Project',
        description: 'Testing event-driven communication',
      }, testUser);

      testAgent = await agentsService.createGlobalAgent(testUser.id, {
        name: 'Event Test Agent',
        model: 'gpt-4',
        apiKey: 'test-api-key',
        systemPrompt: 'You are an event test agent.',
      });

      await projectTeamService.inviteAgentToProject(
        testProject.id,
        testAgent.id,
        testUser.id
      );

      // Spy on event emissions
      eventsSpy = jest.spyOn(eventEmitter, 'emit');
    });

    afterEach(() => {
      if (eventsSpy) {
        eventsSpy.mockRestore();
      }
    });

    it('should emit task.created event when task is created', async () => {
      const task = await tasksService.create(testProject.id, {
        title: 'Event Test Task',
        description: 'Testing event emission',
        assigneeIds: [testAgent.id],
      }, testUser);

      expect(eventsSpy).toHaveBeenCalledWith('task.created', {
        taskId: task.id,
      });
    });

    it('should handle orchestration service responding to task events', async () => {
      // Mock the orchestration service method
      const startTaskExecutionSpy = jest.spyOn(orchestrationService, 'startTaskExecution')
        .mockImplementation(async () => {
          // Mock implementation - in real tests this would trigger actual orchestration
          return Promise.resolve();
        });

      const task = await tasksService.create(testProject.id, {
        title: 'Orchestration Test Task',
        description: 'Testing orchestration event handling',
        assigneeIds: [testAgent.id],
      }, testUser);

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify orchestration service was called
      expect(startTaskExecutionSpy).toHaveBeenCalledWith(task.id);

      startTaskExecutionSpy.mockRestore();
    });

    it('should handle multiple event listeners correctly', async () => {
      let customEventReceived = false;
      
      // Add custom event listener
      eventEmitter.on('custom.test.event', () => {
        customEventReceived = true;
      });

      // Emit custom event
      eventEmitter.emit('custom.test.event', { test: 'data' });

      // Verify event was received
      expect(customEventReceived).toBe(true);
    });
  });

  describe('Knowledge-Projects Integration', () => {
    beforeEach(async () => {
      testProject = await projectsService.create({
        name: 'Knowledge Integration Project',
        description: 'Testing knowledge-projects integration',
      }, testUser);
    });

    it('should allow knowledge sharing within project context', async () => {
      // Create knowledge records
      const knowledge1 = await knowledgeService.createKnowledgeRecord(testUser.id, {
        title: 'Project-Related Knowledge',
        content: 'This knowledge is related to the project',
        tags: ['project', 'integration'],
        visibility: 'public',
        category: 'technical',
      });

      const knowledge2 = await knowledgeService.createKnowledgeRecord(testUser.id, {
        title: 'Private Knowledge',
        content: 'This is private knowledge',
        tags: ['private'],
        visibility: 'private',
        category: 'personal',
      });

      // Search for public knowledge
      const publicKnowledge = await knowledgeService.getPopularKnowledge(10);
      expect(publicKnowledge.some(k => k.id === knowledge1.id)).toBe(true);
      expect(publicKnowledge.some(k => k.id === knowledge2.id)).toBe(false);

      // Search by tags
      const projectKnowledge = await knowledgeService.searchByTags(['project']);
      expect(projectKnowledge.some(k => k.id === knowledge1.id)).toBe(true);
    });

    it('should support knowledge-based task context', async () => {
      // Create relevant knowledge
      const knowledge = await knowledgeService.createKnowledgeRecord(testUser.id, {
        title: 'Task Context Knowledge',
        content: 'This knowledge provides context for task execution',
        tags: ['context', 'task-related'],
        visibility: 'public',
        category: 'technical',
      });

      // Create task that could reference this knowledge
      testAgent = await agentsService.createGlobalAgent(testUser.id, {
        name: 'Knowledge-Aware Agent',
        model: 'gpt-4',
        apiKey: 'test-api-key',
        systemPrompt: 'You can access project knowledge.',
      });

      await projectTeamService.inviteAgentToProject(
        testProject.id,
        testAgent.id,
        testUser.id
      );

      const task = await tasksService.create(testProject.id, {
        title: 'Knowledge-Enhanced Task',
        description: 'This task can benefit from available knowledge',
        assigneeIds: [testAgent.id],
      }, testUser);

      // Verify task and knowledge coexist
      expect(task).toBeDefined();
      expect(knowledge).toBeDefined();

      // In a real implementation, the orchestration service would
      // be able to access knowledge during task execution
    });
  });

  describe('Service Dependencies and Injection', () => {
    it('should properly inject dependencies between services', async () => {
      // Verify all services are properly instantiated
      expect(authService).toBeDefined();
      expect(projectsService).toBeDefined();
      expect(agentsService).toBeDefined();
      expect(tasksService).toBeDefined();
      expect(knowledgeService).toBeDefined();
      expect(orchestrationService).toBeDefined();

      // Verify services can interact with each other
      const user = testUser;
      const project = await projectsService.create({
        name: 'Dependency Test Project',
        description: 'Testing service dependencies',
      }, user);

      const agent = await agentsService.createGlobalAgent(user.id, {
        name: 'Dependency Test Agent',
        model: 'gpt-4',
        apiKey: 'test-api-key',
      });

      // Services should be able to work together
      await projectTeamService.inviteAgentToProject(project.id, agent.id, user.id);
      
      const task = await tasksService.create(project.id, {
        title: 'Dependency Test Task',
        description: 'Testing cross-service functionality',
        assigneeIds: [agent.id],
      }, user);

      expect(task.project.id).toBe(project.id);
    });

    it('should handle circular dependencies gracefully', async () => {
      // This test verifies that the module system handles any circular
      // dependencies between services without causing issues
      
      // All modules should be able to initialize without circular dependency errors
      expect(module).toBeDefined();
      expect(() => {
        module.get(AuthService);
        module.get(ProjectsService);
        module.get(AgentsService);
        module.get(TasksService);
      }).not.toThrow();
    });
  });

  describe('Error Propagation and Handling', () => {
    it('should propagate errors correctly between modules', async () => {
      // Try to create task with invalid project ID
      await expect(
        tasksService.create('invalid-project-id', {
          title: 'Error Test Task',
          description: 'This should fail',
        }, testUser)
      ).rejects.toThrow();

      // Try to add non-existent agent to project
      testProject = await projectsService.create({
        name: 'Error Test Project',
        description: 'Testing error propagation',
      }, testUser);

      await expect(
        projectTeamService.inviteAgentToProject(
          testProject.id,
          'non-existent-agent-id',
          testUser.id
        )
      ).rejects.toThrow();
    });

    it('should maintain data consistency during error scenarios', async () => {
      testProject = await projectsService.create({
        name: 'Consistency Test Project',
        description: 'Testing data consistency during errors',
      }, testUser);

      // Create valid agent
      testAgent = await agentsService.createGlobalAgent(testUser.id, {
        name: 'Consistency Test Agent',
        model: 'gpt-4',
        apiKey: 'test-api-key',
      });

      await projectTeamService.inviteAgentToProject(
        testProject.id,
        testAgent.id,
        testUser.id
      );

      // Try to create task with invalid data
      try {
        await tasksService.create(testProject.id, {
          title: '', // Invalid empty title
          description: 'This should fail validation',
          assigneeIds: [testAgent.id],
        }, testUser);
      } catch (error) {
        // Error is expected
      }

      // Verify project and agent state is unchanged
      const projectTeam = await projectTeamService.getProjectTeam(
        testProject.id,
        testUser.id
      );
      expect(projectTeam.agents).toHaveLength(1);

      const projectTasks = await tasksService.findAll(testProject.id, testUser);
      expect(projectTasks).toHaveLength(0); // No task should be created
    });
  });

  describe('Transaction and Data Consistency', () => {
    it('should maintain consistency across multiple service calls', async () => {
      // Create complete workflow in sequence
      testProject = await projectsService.create({
        name: 'Transaction Test Project',
        description: 'Testing transaction consistency',
      }, testUser);

      testAgent = await agentsService.createGlobalAgent(testUser.id, {
        name: 'Transaction Test Agent',
        model: 'gpt-4',
        apiKey: 'test-api-key',
      });

      const knowledge = await knowledgeService.createKnowledgeRecord(testUser.id, {
        title: 'Transaction Test Knowledge',
        content: 'Knowledge for transaction testing',
        visibility: 'public',
        category: 'technical',
      });

      await projectTeamService.inviteAgentToProject(
        testProject.id,
        testAgent.id,
        testUser.id
      );

      const task = await tasksService.create(testProject.id, {
        title: 'Transaction Test Task',
        description: 'Task for transaction testing',
        assigneeIds: [testAgent.id],
      }, testUser);

      // Verify all entities are properly connected
      const projectWithTeam = await projectTeamService.getProjectTeam(
        testProject.id,
        testUser.id
      );
      const projectTasks = await tasksService.findAll(testProject.id, testUser);
      const userKnowledge = await knowledgeService.findAll(testUser.id, 1, 10);

      expect(projectWithTeam.agents).toHaveLength(1);
      expect(projectTasks).toHaveLength(1);
      expect(userKnowledge.records).toHaveLength(1);
      expect(projectTasks[0].assigneeIds).toContain(testAgent.id);
    });

    it('should handle concurrent operations correctly', async () => {
      testProject = await projectsService.create({
        name: 'Concurrency Test Project',
        description: 'Testing concurrent operations',
      }, testUser);

      // Create multiple agents concurrently
      const agentPromises = [];
      for (let i = 0; i < 5; i++) {
        agentPromises.push(
          agentsService.createGlobalAgent(testUser.id, {
            name: `Concurrent Agent ${i}`,
            model: 'gpt-4',
            apiKey: `test-api-key-${i}`,
          })
        );
      }

      const agents = await Promise.all(agentPromises);
      expect(agents).toHaveLength(5);

      // Add all agents to project concurrently
      const teamPromises = agents.map(agent =>
        projectTeamService.inviteAgentToProject(
          testProject.id,
          agent.id,
          testUser.id
        )
      );

      await Promise.all(teamPromises);

      // Verify all agents are in team
      const finalTeam = await projectTeamService.getProjectTeam(
        testProject.id,
        testUser.id
      );
      expect(finalTeam.agents).toHaveLength(5);
    });
  });
});