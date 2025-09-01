import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { testDatabaseConfig } from '../test-database.config';
import { DataSource } from 'typeorm';

/**
 * Integration tests for complete API workflows
 * These tests verify end-to-end functionality across multiple endpoints
 * and ensure that the complete user workflows work correctly.
 */
describe('API Integration Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({
            JWT_SECRET: 'test-secret-key-for-api-integration',
          })]
        }),
        TypeOrmModule.forRoot({
          ...testDatabaseConfig,
          synchronize: true,
          dropSchema: true,
        }),
        EventEmitterModule.forRoot(),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    dataSource = moduleFixture.get<DataSource>(DataSource);
    await app.init();
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
    await app.close();
  });

  beforeEach(async () => {
    // Clean database between tests
    await dataSource.query('TRUNCATE TABLE "agent_memory" CASCADE');
    await dataSource.query('TRUNCATE TABLE "task" CASCADE');
    await dataSource.query('TRUNCATE TABLE "knowledge_record" CASCADE');
    await dataSource.query('TRUNCATE TABLE "agent" CASCADE');
    await dataSource.query('TRUNCATE TABLE "project" CASCADE');
    await dataSource.query('TRUNCATE TABLE "user" CASCADE');
  });

  describe('Complete User Workflow', () => {
    let userToken: string;
    let userId: string;
    let projectId: string;
    let agentId: string;
    let taskId: string;

    it('should complete a full user registration to task execution workflow', async () => {
      // Step 1: User Registration
      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'workflow-user@example.com',
          password: 'password123',
        })
        .expect(201);

      expect(signupResponse.body.token).toBeDefined();
      userToken = signupResponse.body.token;

      // Step 2: User Login (verify credentials work)
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'workflow-user@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(loginResponse.body.token).toBeDefined();
      userToken = loginResponse.body.token; // Use fresh token

      // Step 3: Create Project
      const projectResponse = await request(app.getHttpServer())
        .post('/projects')
        .auth(userToken, { type: 'bearer' })
        .send({
          name: 'Complete Workflow Project',
          description: 'Testing complete workflow from registration to execution',
          gitRepositoryURL: 'https://github.com/user/complete-workflow.git',
        })
        .expect(201);

      expect(projectResponse.body.id).toBeDefined();
      projectId = projectResponse.body.id;

      // Step 4: Create Agent
      const agentResponse = await request(app.getHttpServer())
        .post('/agents')
        .auth(userToken, { type: 'bearer' })
        .send({
          name: 'Workflow Test Agent',
          description: 'Agent for complete workflow testing',
          model: 'gpt-4',
          apiKey: 'test-api-key-workflow',
          systemPrompt: 'You are a comprehensive workflow test agent.',
          capabilities: ['testing', 'workflow', 'integration'],
        })
        .expect(201);

      expect(agentResponse.body.id).toBeDefined();
      agentId = agentResponse.body.id;

      // Step 5: Add Agent to Project Team
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/team/invite`)
        .auth(userToken, { type: 'bearer' })
        .send({ agentId })
        .expect(201);

      // Step 6: Verify Project Team
      const teamResponse = await request(app.getHttpServer())
        .get(`/projects/${projectId}/team`)
        .auth(userToken, { type: 'bearer' })
        .expect(200);

      expect(teamResponse.body.agents).toHaveLength(1);
      expect(teamResponse.body.agents[0].id).toBe(agentId);

      // Step 7: Create Knowledge Record
      const knowledgeResponse = await request(app.getHttpServer())
        .post('/knowledge')
        .auth(userToken, { type: 'bearer' })
        .send({
          title: 'Workflow Knowledge Base',
          content: 'This knowledge will help with workflow execution',
          tags: ['workflow', 'testing', 'integration'],
          visibility: 'public',
          category: 'technical',
        })
        .expect(201);

      expect(knowledgeResponse.body.id).toBeDefined();

      // Step 8: Create Task
      const taskResponse = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tasks`)
        .auth(userToken, { type: 'bearer' })
        .send({
          title: 'Complete Workflow Task',
          description: 'This task tests the complete workflow from creation to execution',
          priority: 'HIGH',
          assigneeIds: [agentId],
        })
        .expect(201);

      expect(taskResponse.body.id).toBeDefined();
      taskId = taskResponse.body.id;

      // Step 9: Verify Task in Project
      const projectTasksResponse = await request(app.getHttpServer())
        .get(`/projects/${projectId}/tasks`)
        .auth(userToken, { type: 'bearer' })
        .expect(200);

      expect(projectTasksResponse.body).toHaveLength(1);
      expect(projectTasksResponse.body[0].id).toBe(taskId);

      // Step 10: Execute Task via Orchestrator
      const executionResponse = await request(app.getHttpServer())
        .post(`/orchestrator/tasks/${taskId}/run`)
        .auth(userToken, { type: 'bearer' })
        .expect(201);

      expect(executionResponse.body.taskId).toBe(taskId);
      expect(executionResponse.body.status).toBe('initiated');
      expect(executionResponse.body.executionId).toBeDefined();

      // Step 11: Verify All Resources Exist
      const finalProjectResponse = await request(app.getHttpServer())
        .get(`/projects/${projectId}`)
        .auth(userToken, { type: 'bearer' })
        .expect(200);

      const finalAgentResponse = await request(app.getHttpServer())
        .get(`/agents/${agentId}`)
        .auth(userToken, { type: 'bearer' })
        .expect(200);

      const finalTaskResponse = await request(app.getHttpServer())
        .get(`/projects/${projectId}/tasks/${taskId}`)
        .auth(userToken, { type: 'bearer' })
        .expect(200);

      expect(finalProjectResponse.body.id).toBe(projectId);
      expect(finalAgentResponse.body.id).toBe(agentId);
      expect(finalTaskResponse.body.id).toBe(taskId);
    });
  });

  describe('Multi-User Collaboration Workflow', () => {
    let user1Token: string;
    let user2Token: string;
    let sharedProjectId: string;
    let agent1Id: string;
    let agent2Id: string;

    it('should handle multi-user collaboration scenarios', async () => {
      // Create two users
      const user1Response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'user1@collaboration.com',
          password: 'password123',
        })
        .expect(201);
      user1Token = user1Response.body.token;

      const user2Response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'user2@collaboration.com',
          password: 'password123',
        })
        .expect(201);
      user2Token = user2Response.body.token;

      // User 1 creates project
      const projectResponse = await request(app.getHttpServer())
        .post('/projects')
        .auth(user1Token, { type: 'bearer' })
        .send({
          name: 'Collaboration Project',
          description: 'Testing multi-user collaboration',
        })
        .expect(201);
      sharedProjectId = projectResponse.body.id;

      // Both users create their own agents
      const agent1Response = await request(app.getHttpServer())
        .post('/agents')
        .auth(user1Token, { type: 'bearer' })
        .send({
          name: 'User 1 Agent',
          model: 'gpt-4',
          apiKey: 'user1-api-key',
        })
        .expect(201);
      agent1Id = agent1Response.body.id;

      const agent2Response = await request(app.getHttpServer())
        .post('/agents')
        .auth(user2Token, { type: 'bearer' })
        .send({
          name: 'User 2 Agent',
          model: 'gpt-4',
          apiKey: 'user2-api-key',
        })
        .expect(201);
      agent2Id = agent2Response.body.id;

      // User 2 should NOT be able to access User 1's project
      await request(app.getHttpServer())
        .get(`/projects/${sharedProjectId}`)
        .auth(user2Token, { type: 'bearer' })
        .expect(404);

      // User 2 should NOT be able to add their agent to User 1's project
      await request(app.getHttpServer())
        .post(`/projects/${sharedProjectId}/team/invite`)
        .auth(user2Token, { type: 'bearer' })
        .send({ agentId: agent2Id })
        .expect(404);

      // User 1 should be able to manage their own project
      await request(app.getHttpServer())
        .post(`/projects/${sharedProjectId}/team/invite`)
        .auth(user1Token, { type: 'bearer' })
        .send({ agentId: agent1Id })
        .expect(201);

      // Verify isolation - users can only see their own resources
      const user1Projects = await request(app.getHttpServer())
        .get('/projects')
        .auth(user1Token, { type: 'bearer' })
        .expect(200);

      const user2Projects = await request(app.getHttpServer())
        .get('/projects')
        .auth(user2Token, { type: 'bearer' })
        .expect(200);

      expect(user1Projects.body).toHaveLength(1);
      expect(user2Projects.body).toHaveLength(0);

      const user1Agents = await request(app.getHttpServer())
        .get('/agents')
        .auth(user1Token, { type: 'bearer' })
        .expect(200);

      const user2Agents = await request(app.getHttpServer())
        .get('/agents')
        .auth(user2Token, { type: 'bearer' })
        .expect(200);

      expect(user1Agents.body).toHaveLength(1);
      expect(user2Agents.body).toHaveLength(1);
      expect(user1Agents.body[0].id).toBe(agent1Id);
      expect(user2Agents.body[0].id).toBe(agent2Id);
    });
  });

  describe('Knowledge Sharing and Discovery Workflow', () => {
    let userToken: string;
    let publicKnowledgeId: string;
    let privateKnowledgeId: string;

    it('should handle knowledge creation, sharing, and discovery', async () => {
      // Create user
      const userResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'knowledge-user@example.com',
          password: 'password123',
        })
        .expect(201);
      userToken = userResponse.body.token;

      // Create public knowledge
      const publicKnowledgeResponse = await request(app.getHttpServer())
        .post('/knowledge')
        .auth(userToken, { type: 'bearer' })
        .send({
          title: 'Public API Best Practices',
          content: 'Best practices for designing RESTful APIs including versioning, pagination, error handling, and security considerations.',
          tags: ['api', 'rest', 'best-practices', 'public'],
          visibility: 'public',
          category: 'technical',
        })
        .expect(201);
      publicKnowledgeId = publicKnowledgeResponse.body.id;

      // Create private knowledge
      const privateKnowledgeResponse = await request(app.getHttpServer())
        .post('/knowledge')
        .auth(userToken, { type: 'bearer' })
        .send({
          title: 'Private Company Secrets',
          content: 'Internal company processes and sensitive information.',
          tags: ['private', 'internal', 'sensitive'],
          visibility: 'private',
          category: 'business',
        })
        .expect(201);
      privateKnowledgeId = privateKnowledgeResponse.body.id;

      // Test knowledge discovery
      const popularResponse = await request(app.getHttpServer())
        .get('/knowledge/popular?limit=10')
        .expect(200);

      // Public knowledge should appear in popular
      expect(popularResponse.body.some((k: any) => k.id === publicKnowledgeId)).toBe(true);
      // Private knowledge should NOT appear in popular
      expect(popularResponse.body.some((k: any) => k.id === privateKnowledgeId)).toBe(false);

      // Test tag-based search
      const tagSearchResponse = await request(app.getHttpServer())
        .get('/knowledge/search?tags=api,best-practices')
        .auth(userToken, { type: 'bearer' })
        .expect(200);

      expect(tagSearchResponse.body.some((k: any) => k.id === publicKnowledgeId)).toBe(true);

      // Test user's own knowledge
      const userKnowledgeResponse = await request(app.getHttpServer())
        .get('/knowledge/my')
        .auth(userToken, { type: 'bearer' })
        .expect(200);

      expect(userKnowledgeResponse.body).toHaveLength(2);

      // Test knowledge rating
      await request(app.getHttpServer())
        .post(`/knowledge/${publicKnowledgeId}/rate`)
        .auth(userToken, { type: 'bearer' })
        .send({ rating: 5 })
        .expect(201);

      // Verify rating was applied
      const ratedKnowledgeResponse = await request(app.getHttpServer())
        .get(`/knowledge/${publicKnowledgeId}`)
        .auth(userToken, { type: 'bearer' })
        .expect(200);

      expect(ratedKnowledgeResponse.body.rating).toBeGreaterThan(0);
      expect(ratedKnowledgeResponse.body.ratingCount).toBe(1);
    });
  });

  describe('Complex Project Management Workflow', () => {
    let managerToken: string;
    let projectId: string;
    let agentIds: string[] = [];
    let taskIds: string[] = [];

    it('should handle complex project with multiple agents and tasks', async () => {
      // Create project manager
      const managerResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'project-manager@example.com',
          password: 'password123',
        })
        .expect(201);
      managerToken = managerResponse.body.token;

      // Create complex project
      const projectResponse = await request(app.getHttpServer())
        .post('/projects')
        .auth(managerToken, { type: 'bearer' })
        .send({
          name: 'Complex Multi-Agent Project',
          description: 'Testing complex project management with multiple agents and tasks',
          gitRepositoryURL: 'https://github.com/company/complex-project.git',
        })
        .expect(201);
      projectId = projectResponse.body.id;

      // Create multiple specialized agents
      const agentConfigs = [
        {
          name: 'Frontend Developer Agent',
          description: 'Specialized in React and TypeScript',
          capabilities: ['frontend', 'react', 'typescript'],
        },
        {
          name: 'Backend Developer Agent',
          description: 'Specialized in Node.js and databases',
          capabilities: ['backend', 'nodejs', 'database'],
        },
        {
          name: 'DevOps Agent',
          description: 'Specialized in deployment and infrastructure',
          capabilities: ['devops', 'docker', 'aws'],
        },
        {
          name: 'QA Testing Agent',
          description: 'Specialized in testing and quality assurance',
          capabilities: ['testing', 'qa', 'automation'],
        },
      ];

      for (const config of agentConfigs) {
        const agentResponse = await request(app.getHttpServer())
          .post('/agents')
          .auth(managerToken, { type: 'bearer' })
          .send({
            ...config,
            model: 'gpt-4',
            apiKey: `api-key-${config.name.toLowerCase().replace(/\s+/g, '-')}`,
            systemPrompt: `You are a ${config.description}`,
          })
          .expect(201);

        agentIds.push(agentResponse.body.id);

        // Add agent to project team
        await request(app.getHttpServer())
          .post(`/projects/${projectId}/team/invite`)
          .auth(managerToken, { type: 'bearer' })
          .send({ agentId: agentResponse.body.id })
          .expect(201);
      }

      // Verify all agents are in team
      const teamResponse = await request(app.getHttpServer())
        .get(`/projects/${projectId}/team`)
        .auth(managerToken, { type: 'bearer' })
        .expect(200);

      expect(teamResponse.body.agents).toHaveLength(4);

      // Create tasks for different agents
      const taskConfigs = [
        {
          title: 'Implement User Authentication UI',
          description: 'Create login and registration forms with validation',
          priority: 'HIGH',
          assigneeIds: [agentIds[0]], // Frontend agent
        },
        {
          title: 'Design User Database Schema',
          description: 'Create database tables for user management',
          priority: 'HIGH',
          assigneeIds: [agentIds[1]], // Backend agent
        },
        {
          title: 'Setup CI/CD Pipeline',
          description: 'Configure automated testing and deployment',
          priority: 'MEDIUM',
          assigneeIds: [agentIds[2]], // DevOps agent
        },
        {
          title: 'Create Automated Test Suite',
          description: 'Develop comprehensive test coverage',
          priority: 'MEDIUM',
          assigneeIds: [agentIds[3]], // QA agent
        },
        {
          title: 'Integration Task',
          description: 'Task requiring multiple agent types',
          priority: 'LOW',
          assigneeIds: [agentIds[0], agentIds[1]], // Multiple agents
        },
      ];

      for (const taskConfig of taskConfigs) {
        const taskResponse = await request(app.getHttpServer())
          .post(`/projects/${projectId}/tasks`)
          .auth(managerToken, { type: 'bearer' })
          .send(taskConfig)
          .expect(201);

        taskIds.push(taskResponse.body.id);
      }

      // Verify all tasks are created
      const allTasksResponse = await request(app.getHttpServer())
        .get(`/projects/${projectId}/tasks`)
        .auth(managerToken, { type: 'bearer' })
        .expect(200);

      expect(allTasksResponse.body).toHaveLength(5);

      // Update task statuses to simulate progress
      const statusUpdates = [
        { taskId: taskIds[0], status: 'IN_PROGRESS' },
        { taskId: taskIds[1], status: 'COMPLETED' },
        { taskId: taskIds[2], status: 'IN_PROGRESS' },
        { taskId: taskIds[3], status: 'TODO' },
        { taskId: taskIds[4], status: 'REVIEW' },
      ];

      for (const update of statusUpdates) {
        await request(app.getHttpServer())
          .patch(`/projects/${projectId}/tasks/${update.taskId}`)
          .auth(managerToken, { type: 'bearer' })
          .send({ status: update.status })
          .expect(200);
      }

      // Verify final project state
      const finalProjectResponse = await request(app.getHttpServer())
        .get(`/projects/${projectId}`)
        .auth(managerToken, { type: 'bearer' })
        .expect(200);

      const finalTasksResponse = await request(app.getHttpServer())
        .get(`/projects/${projectId}/tasks`)
        .auth(managerToken, { type: 'bearer' })
        .expect(200);

      expect(finalProjectResponse.body.name).toBe('Complex Multi-Agent Project');
      expect(finalTasksResponse.body).toHaveLength(5);

      // Verify task statuses were updated
      const completedTasks = finalTasksResponse.body.filter((t: any) => t.status === 'COMPLETED');
      const inProgressTasks = finalTasksResponse.body.filter((t: any) => t.status === 'IN_PROGRESS');
      expect(completedTasks).toHaveLength(1);
      expect(inProgressTasks).toHaveLength(2);
    });
  });

  describe('Error Recovery and Resilience', () => {
    let userToken: string;

    beforeEach(async () => {
      const userResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'resilience-user@example.com',
          password: 'password123',
        })
        .expect(201);
      userToken = userResponse.body.token;
    });

    it('should gracefully handle and recover from errors', async () => {
      // Create project
      const projectResponse = await request(app.getHttpServer())
        .post('/projects')
        .auth(userToken, { type: 'bearer' })
        .send({
          name: 'Resilience Test Project',
          description: 'Testing error recovery',
        })
        .expect(201);
      const projectId = projectResponse.body.id;

      // Try to create task without agent (should fail)
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/tasks`)
        .auth(userToken, { type: 'bearer' })
        .send({
          title: 'Task Without Agent',
          description: 'This should fail',
          assigneeIds: [], // No agents assigned
        })
        .expect(400);

      // Verify project is still accessible after error
      await request(app.getHttpServer())
        .get(`/projects/${projectId}`)
        .auth(userToken, { type: 'bearer' })
        .expect(200);

      // Create agent and retry task creation
      const agentResponse = await request(app.getHttpServer())
        .post('/agents')
        .auth(userToken, { type: 'bearer' })
        .send({
          name: 'Recovery Test Agent',
          model: 'gpt-4',
          apiKey: 'recovery-test-key',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/team/invite`)
        .auth(userToken, { type: 'bearer' })
        .send({ agentId: agentResponse.body.id })
        .expect(201);

      // Now task creation should succeed
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/tasks`)
        .auth(userToken, { type: 'bearer' })
        .send({
          title: 'Recovery Task',
          description: 'This should succeed after recovery',
          assigneeIds: [agentResponse.body.id],
        })
        .expect(201);
    });

    it('should maintain data integrity during partial failures', async () => {
      // Create multiple resources
      const projectResponse = await request(app.getHttpServer())
        .post('/projects')
        .auth(userToken, { type: 'bearer' })
        .send({
          name: 'Integrity Test Project',
          description: 'Testing data integrity',
        })
        .expect(201);
      const projectId = projectResponse.body.id;

      const agentResponse = await request(app.getHttpServer())
        .post('/agents')
        .auth(userToken, { type: 'bearer' })
        .send({
          name: 'Integrity Test Agent',
          model: 'gpt-4',
          apiKey: 'integrity-test-key',
        })
        .expect(201);
      const agentId = agentResponse.body.id;

      // Add agent to project
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/team/invite`)
        .auth(userToken, { type: 'bearer' })
        .send({ agentId })
        .expect(201);

      // Try to execute orchestration on non-existent task (should fail gracefully)
      const fakeTaskId = '12345678-1234-1234-1234-123456789012';
      await request(app.getHttpServer())
        .post(`/orchestrator/tasks/${fakeTaskId}/run`)
        .auth(userToken, { type: 'bearer' })
        .expect(404);

      // Verify existing resources are unaffected
      const projectCheck = await request(app.getHttpServer())
        .get(`/projects/${projectId}`)
        .auth(userToken, { type: 'bearer' })
        .expect(200);

      const agentCheck = await request(app.getHttpServer())
        .get(`/agents/${agentId}`)
        .auth(userToken, { type: 'bearer' })
        .expect(200);

      const teamCheck = await request(app.getHttpServer())
        .get(`/projects/${projectId}/team`)
        .auth(userToken, { type: 'bearer' })
        .expect(200);

      expect(projectCheck.body.id).toBe(projectId);
      expect(agentCheck.body.id).toBe(agentId);
      expect(teamCheck.body.agents).toHaveLength(1);
    });
  });
});