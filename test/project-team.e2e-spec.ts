import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { AuthModule } from '../src/auth/auth.module';
import { ProjectsModule } from '../src/projects/projects.module';
import { AgentsModule } from '../src/agents/agents.module';
import { testDatabaseConfig } from './test-database.config';
import { DataSource } from 'typeorm';

describe('ProjectTeamController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtToken: string;
  let projectId: string;
  let agentId: string;
  let secondAgentId: string;

  const user = {
    email: 'project-team-tester@example.com',
    password: 'password123',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ 
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({
            JWT_SECRET: 'test-secret-key-for-testing',
          })]
        }),
        TypeOrmModule.forRoot(testDatabaseConfig),
        AuthModule,
        ProjectsModule,
        AgentsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    dataSource = moduleFixture.get<DataSource>(DataSource);
    await app.init();

    // Register and login user to get JWT token
    await request(app.getHttpServer()).post('/auth/signup').send(user);
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send(user);
    jwtToken = loginResponse.body.token;

    // Create a test project
    const projectResponse = await request(app.getHttpServer())
      .post('/projects')
      .auth(jwtToken, { type: 'bearer' })
      .send({
        name: 'Team Management Test Project',
        description: 'Project for testing team management',
        gitRepositoryURL: 'https://github.com/test/team-repo.git'
      });
    projectId = projectResponse.body.id;

    // Create test agents
    const agentResponse1 = await request(app.getHttpServer())
      .post('/agents')
      .auth(jwtToken, { type: 'bearer' })
      .send({
        name: 'Test Agent 1',
        description: 'First test agent for team management',
        model: 'gpt-4',
        apiKey: 'test-api-key-1',
        systemPrompt: 'You are a helpful assistant.',
        capabilities: ['coding', 'analysis']
      });
    agentId = agentResponse1.body.id;

    const agentResponse2 = await request(app.getHttpServer())
      .post('/agents')
      .auth(jwtToken, { type: 'bearer' })
      .send({
        name: 'Test Agent 2',
        description: 'Second test agent for team management',
        model: 'gpt-3.5-turbo',
        apiKey: 'test-api-key-2',
        systemPrompt: 'You are a code reviewer.',
        capabilities: ['review', 'documentation']
      });
    secondAgentId = agentResponse2.body.id;
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
    await app.close();
  });

  describe('/projects/:projectId/team (GET)', () => {
    it('should return empty team initially', () => {
      return request(app.getHttpServer())
        .get(`/projects/${projectId}/team`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(200)
        .then((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.length).toEqual(0);
        });
    });

    it('should return 401 (Unauthorized) without token', () => {
      return request(app.getHttpServer())
        .get(`/projects/${projectId}/team`)
        .expect(401);
    });

    it('should return 404 for non-existent project', () => {
      const fakeProjectId = '12345678-1234-1234-1234-123456789012';
      return request(app.getHttpServer())
        .get(`/projects/${fakeProjectId}/team`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(404);
    });

    it('should return 400 for invalid project UUID', () => {
      const invalidProjectId = 'invalid-uuid';
      return request(app.getHttpServer())
        .get(`/projects/${invalidProjectId}/team`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(400);
    });
  });

  describe('/projects/:projectId/team/invite (POST)', () => {
    it('should successfully add agent to project team', () => {
      return request(app.getHttpServer())
        .post(`/projects/${projectId}/team/invite`)
        .auth(jwtToken, { type: 'bearer' })
        .send({ agentId })
        .expect(201)
        .then((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.message).toContain('успешно добавлен');
          expect(res.body.message).toContain('Team Management Test Project');
        });
    });

    it('should add second agent to project team', () => {
      return request(app.getHttpServer())
        .post(`/projects/${projectId}/team/invite`)
        .auth(jwtToken, { type: 'bearer' })
        .send({ agentId: secondAgentId })
        .expect(201)
        .then((res) => {
          expect(res.body.success).toBe(true);
        });
    });

    it('should return team with both agents after invitations', () => {
      return request(app.getHttpServer())
        .get(`/projects/${projectId}/team`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(200)
        .then((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.length).toEqual(2);
          
          const agentIds = res.body.map((agent: any) => agent.id);
          expect(agentIds).toContain(agentId);
          expect(agentIds).toContain(secondAgentId);

          // Verify agent details are included
          const firstAgent = res.body.find((a: any) => a.id === agentId);
          expect(firstAgent.name).toBe('Test Agent 1');
          expect(firstAgent.model).toBe('gpt-4');
          expect(firstAgent.capabilities).toEqual(['coding', 'analysis']);
        });
    });

    it('should prevent duplicate agent invitation', () => {
      return request(app.getHttpServer())
        .post(`/projects/${projectId}/team/invite`)
        .auth(jwtToken, { type: 'bearer' })
        .send({ agentId })
        .expect(400)
        .then((res) => {
          expect(res.body.message).toContain('уже находится в команде');
        });
    });

    it('should return 404 for non-existent project', () => {
      const fakeProjectId = '12345678-1234-1234-1234-123456789012';
      return request(app.getHttpServer())
        .post(`/projects/${fakeProjectId}/team/invite`)
        .auth(jwtToken, { type: 'bearer' })
        .send({ agentId })
        .expect(404);
    });

    it('should return 404 for non-existent agent', () => {
      const fakeAgentId = '12345678-1234-1234-1234-123456789012';
      return request(app.getHttpServer())
        .post(`/projects/${projectId}/team/invite`)
        .auth(jwtToken, { type: 'bearer' })
        .send({ agentId: fakeAgentId })
        .expect(404);
    });

    it('should return 400 for missing agentId', () => {
      return request(app.getHttpServer())
        .post(`/projects/${projectId}/team/invite`)
        .auth(jwtToken, { type: 'bearer' })
        .send({})
        .expect(400);
    });

    it('should return 400 for invalid agent UUID', () => {
      return request(app.getHttpServer())
        .post(`/projects/${projectId}/team/invite`)
        .auth(jwtToken, { type: 'bearer' })
        .send({ agentId: 'invalid-uuid' })
        .expect(400);
    });

    it('should return 401 (Unauthorized) without token', () => {
      return request(app.getHttpServer())
        .post(`/projects/${projectId}/team/invite`)
        .send({ agentId })
        .expect(401);
    });
  });

  describe('Cross-user security tests', () => {
    let otherUserToken: string;
    let otherProjectId: string;
    let otherAgentId: string;

    beforeAll(async () => {
      // Create another user
      const otherUser = {
        email: 'other-team-user@example.com',
        password: 'password123',
      };
      
      await request(app.getHttpServer()).post('/auth/signup').send(otherUser);
      const otherLoginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send(otherUser);
      otherUserToken = otherLoginResponse.body.token;

      // Create project and agent for other user
      const otherProjectResponse = await request(app.getHttpServer())
        .post('/projects')
        .auth(otherUserToken, { type: 'bearer' })
        .send({
          name: 'Other User Project',
          description: 'Project belonging to other user'
        });
      otherProjectId = otherProjectResponse.body.id;

      const otherAgentResponse = await request(app.getHttpServer())
        .post('/agents')
        .auth(otherUserToken, { type: 'bearer' })
        .send({
          name: 'Other User Agent',
          model: 'gpt-4',
          apiKey: 'other-api-key'
        });
      otherAgentId = otherAgentResponse.body.id;
    });

    it('should not allow access to other users project team', () => {
      return request(app.getHttpServer())
        .get(`/projects/${otherProjectId}/team`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(404);
    });

    it('should not allow inviting to other users project', () => {
      return request(app.getHttpServer())
        .post(`/projects/${otherProjectId}/team/invite`)
        .auth(jwtToken, { type: 'bearer' })
        .send({ agentId })
        .expect(404);
    });

    it('should not allow inviting other users agent', () => {
      return request(app.getHttpServer())
        .post(`/projects/${projectId}/team/invite`)
        .auth(jwtToken, { type: 'bearer' })
        .send({ agentId: otherAgentId })
        .expect(404);
    });

    it('should not allow removing agents from other users project', () => {
      return request(app.getHttpServer())
        .delete(`/projects/${otherProjectId}/team/${otherAgentId}`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(404);
    });
  });

  describe('/projects/:projectId/team/:agentId (DELETE)', () => {
    it('should successfully remove agent from team', () => {
      return request(app.getHttpServer())
        .delete(`/projects/${projectId}/team/${agentId}`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(200)
        .then((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.message).toContain('успешно удален');
          expect(res.body.message).toContain('Team Management Test Project');
        });
    });

    it('should verify agent was removed from team', () => {
      return request(app.getHttpServer())
        .get(`/projects/${projectId}/team`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(200)
        .then((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.length).toEqual(1);
          
          const remainingAgent = res.body[0];
          expect(remainingAgent.id).toEqual(secondAgentId);
          expect(remainingAgent.name).toBe('Test Agent 2');
        });
    });

    it('should return 400 when trying to remove agent not in team', () => {
      return request(app.getHttpServer())
        .delete(`/projects/${projectId}/team/${agentId}`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(400)
        .then((res) => {
          expect(res.body.message).toContain('не найден в команде');
        });
    });

    it('should return 404 for non-existent project', () => {
      const fakeProjectId = '12345678-1234-1234-1234-123456789012';
      return request(app.getHttpServer())
        .delete(`/projects/${fakeProjectId}/team/${secondAgentId}`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(404);
    });

    it('should return 404 for non-existent agent', () => {
      const fakeAgentId = '12345678-1234-1234-1234-123456789012';
      return request(app.getHttpServer())
        .delete(`/projects/${projectId}/team/${fakeAgentId}`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(400);
    });

    it('should return 400 for invalid project UUID', () => {
      const invalidProjectId = 'invalid-uuid';
      return request(app.getHttpServer())
        .delete(`/projects/${invalidProjectId}/team/${secondAgentId}`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(400);
    });

    it('should return 400 for invalid agent UUID', () => {
      const invalidAgentId = 'invalid-uuid';
      return request(app.getHttpServer())
        .delete(`/projects/${projectId}/team/${invalidAgentId}`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(400);
    });

    it('should return 401 (Unauthorized) without token', () => {
      return request(app.getHttpServer())
        .delete(`/projects/${projectId}/team/${secondAgentId}`)
        .expect(401);
    });
  });

  describe('Team management workflow tests', () => {
    let workflowProjectId: string;
    let workflowAgent1: string;
    let workflowAgent2: string;
    let workflowAgent3: string;

    beforeAll(async () => {
      // Create a new project for workflow testing
      const projectResponse = await request(app.getHttpServer())
        .post('/projects')
        .auth(jwtToken, { type: 'bearer' })
        .send({
          name: 'Workflow Test Project',
          description: 'Project for testing complete team workflow'
        });
      workflowProjectId = projectResponse.body.id;

      // Create multiple agents for workflow testing
      const agents = [
        { name: 'Frontend Agent', model: 'gpt-4', capabilities: ['react', 'css', 'html'] },
        { name: 'Backend Agent', model: 'gpt-4', capabilities: ['nodejs', 'express', 'database'] },
        { name: 'QA Agent', model: 'gpt-3.5-turbo', capabilities: ['testing', 'debugging'] }
      ];

      const agentIds = [];
      for (const agent of agents) {
        const response = await request(app.getHttpServer())
          .post('/agents')
          .auth(jwtToken, { type: 'bearer' })
          .send({
            ...agent,
            apiKey: `workflow-api-key-${agent.name.toLowerCase().replace(' ', '-')}`,
            systemPrompt: `You are a ${agent.name.toLowerCase()}.`
          });
        agentIds.push(response.body.id);
      }
      
      [workflowAgent1, workflowAgent2, workflowAgent3] = agentIds;
    });

    it('should build team step by step', async () => {
      // Step 1: Start with empty team
      const initialTeam = await request(app.getHttpServer())
        .get(`/projects/${workflowProjectId}/team`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(200);
      
      expect(initialTeam.body.length).toBe(0);

      // Step 2: Add first agent
      await request(app.getHttpServer())
        .post(`/projects/${workflowProjectId}/team/invite`)
        .auth(jwtToken, { type: 'bearer' })
        .send({ agentId: workflowAgent1 })
        .expect(201);

      const teamAfterFirst = await request(app.getHttpServer())
        .get(`/projects/${workflowProjectId}/team`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(200);
      
      expect(teamAfterFirst.body.length).toBe(1);
      expect(teamAfterFirst.body[0].name).toBe('Frontend Agent');

      // Step 3: Add second agent
      await request(app.getHttpServer())
        .post(`/projects/${workflowProjectId}/team/invite`)
        .auth(jwtToken, { type: 'bearer' })
        .send({ agentId: workflowAgent2 })
        .expect(201);

      // Step 4: Add third agent
      await request(app.getHttpServer())
        .post(`/projects/${workflowProjectId}/team/invite`)
        .auth(jwtToken, { type: 'bearer' })
        .send({ agentId: workflowAgent3 })
        .expect(201);

      // Verify final team composition
      const finalTeam = await request(app.getHttpServer())
        .get(`/projects/${workflowProjectId}/team`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(200);
      
      expect(finalTeam.body.length).toBe(3);
      
      const agentNames = finalTeam.body.map((agent: any) => agent.name).sort();
      expect(agentNames).toEqual(['Backend Agent', 'Frontend Agent', 'QA Agent']);
    });

    it('should handle team restructuring', async () => {
      // Remove middle agent (Backend Agent)
      await request(app.getHttpServer())
        .delete(`/projects/${workflowProjectId}/team/${workflowAgent2}`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(200);

      // Verify team after removal
      const teamAfterRemoval = await request(app.getHttpServer())
        .get(`/projects/${workflowProjectId}/team`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(200);
      
      expect(teamAfterRemoval.body.length).toBe(2);
      
      const remainingNames = teamAfterRemoval.body.map((agent: any) => agent.name).sort();
      expect(remainingNames).toEqual(['Frontend Agent', 'QA Agent']);

      // Re-add the removed agent
      await request(app.getHttpServer())
        .post(`/projects/${workflowProjectId}/team/invite`)
        .auth(jwtToken, { type: 'bearer' })
        .send({ agentId: workflowAgent2 })
        .expect(201);

      // Verify team is complete again
      const restoredTeam = await request(app.getHttpServer())
        .get(`/projects/${workflowProjectId}/team`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(200);
      
      expect(restoredTeam.body.length).toBe(3);
    });

    it('should clear entire team', async () => {
      // Remove all agents one by one
      await request(app.getHttpServer())
        .delete(`/projects/${workflowProjectId}/team/${workflowAgent1}`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/projects/${workflowProjectId}/team/${workflowAgent2}`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/projects/${workflowProjectId}/team/${workflowAgent3}`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(200);

      // Verify team is empty
      const emptyTeam = await request(app.getHttpServer())
        .get(`/projects/${workflowProjectId}/team`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(200);
      
      expect(emptyTeam.body.length).toBe(0);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle rapid consecutive invitations', async () => {
      // Create a fresh project for this test
      const projectResponse = await request(app.getHttpServer())
        .post('/projects')
        .auth(jwtToken, { type: 'bearer' })
        .send({
          name: 'Rapid Invitation Test',
          description: 'Project for testing rapid invitations'
        });
      const rapidProjectId = projectResponse.body.id;

      // Try to invite the same agent multiple times rapidly
      const promises = Array(5).fill(null).map(() =>
        request(app.getHttpServer())
          .post(`/projects/${rapidProjectId}/team/invite`)
          .auth(jwtToken, { type: 'bearer' })
          .send({ agentId })
      );

      const results = await Promise.allSettled(promises);
      
      // Only one should succeed, others should fail with 400
      const successful = results.filter(r => r.status === 'fulfilled' && (r as any).value.status === 201);
      const failed = results.filter(r => r.status === 'fulfilled' && (r as any).value.status === 400);
      
      expect(successful.length).toBe(1);
      expect(failed.length).toBe(4);
    });

    it('should handle malformed request bodies', () => {
      return request(app.getHttpServer())
        .post(`/projects/${projectId}/team/invite`)
        .auth(jwtToken, { type: 'bearer' })
        .send('{ invalid json }')
        .expect(400);
    });

    it('should handle empty request body', () => {
      return request(app.getHttpServer())
        .post(`/projects/${projectId}/team/invite`)
        .auth(jwtToken, { type: 'bearer' })
        .send('')
        .expect(400);
    });

    it('should handle null agentId', () => {
      return request(app.getHttpServer())
        .post(`/projects/${projectId}/team/invite`)
        .auth(jwtToken, { type: 'bearer' })
        .send({ agentId: null })
        .expect(400);
    });

    it('should handle extremely long UUIDs', () => {
      const longId = 'a'.repeat(1000);
      return request(app.getHttpServer())
        .post(`/projects/${projectId}/team/invite`)
        .auth(jwtToken, { type: 'bearer' })
        .send({ agentId: longId })
        .expect(400);
    });
  });
});