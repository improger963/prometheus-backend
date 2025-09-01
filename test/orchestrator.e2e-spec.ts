import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import request from 'supertest';
import io from 'socket.io-client';
type SocketIOClient = ReturnType<typeof io>;

import { AuthModule } from '../src/auth/auth.module';
import { ProjectsModule } from '../src/projects/projects.module';
import { AgentsModule } from '../src/agents/agents.module';
import { TasksModule } from '../src/tasks/tasks.module';
import { OrchestratorModule } from '../src/orchestrator/orchestrator.module';
import { testDatabaseConfig } from './test-database.config';
import { DataSource } from 'typeorm';

describe('OrchestratorController (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtToken: string;
  let clientSocket: SocketIOClient;
  let projectId: string;
  let agentId: string;
  let taskId: string;
  let port: number;

  const user = {
    email: 'orchestrator-tester@example.com',
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
            FRONTEND_URL: 'http://localhost:3000',
          })]
        }),
        TypeOrmModule.forRoot(testDatabaseConfig),
        EventEmitterModule.forRoot(),
        AuthModule,
        ProjectsModule,
        AgentsModule,
        TasksModule,
        OrchestratorModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    dataSource = moduleFixture.get<DataSource>(DataSource);

    await app.init();
    await app.listen(0); // Use dynamic port

    // Get the actual port
    const server = app.getHttpServer();
    port = server.address().port;

    // Register and login user to get JWT token
    await request(app.getHttpServer()).post('/auth/signup').send(user);
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send(user);
    jwtToken = loginResponse.body.token;

    // Create test data
    const projectResponse = await request(app.getHttpServer())
      .post('/projects')
      .auth(jwtToken, { type: 'bearer' })
      .send({
        name: 'Orchestrator Test Project',
        description: 'Project for orchestrator testing',
        gitRepositoryURL: 'https://github.com/test/repo.git'
      });
    projectId = projectResponse.body.id;

    const agentResponse = await request(app.getHttpServer())
      .post('/agents')
      .auth(jwtToken, { type: 'bearer' })
      .send({
        name: 'Orchestrator Test Agent',
        model: 'gpt-4',
        apiKey: 'test-api-key',
        systemPrompt: 'You are a test agent for orchestration.'
      });
    agentId = agentResponse.body.id;

    // Add agent to project team
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/team/invite`)
      .auth(jwtToken, { type: 'bearer' })
      .send({ agentId });
  });

  afterAll(async () => {
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
    await app.close();
  });

  beforeEach(async () => {
    // Create a new task for each test
    const taskResponse = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .auth(jwtToken, { type: 'bearer' })
      .send({
        title: 'Orchestrator Test Task',
        description: 'Task for orchestrator testing',
        priority: 'HIGH',
        assigneeIds: [agentId]
      });
    taskId = taskResponse.body.id;

    // Create a new client socket for each test
    clientSocket = io(`http://localhost:${port}`, {
      auth: { token: jwtToken },
      transports: ['websocket'],
      forceNew: true,
    });

    // Wait for connection
    await new Promise<void>((resolve) => {
      clientSocket.on('connect', () => {
        clientSocket.emit('joinProjectRoom', projectId);
        resolve();
      });
    });
  });

  afterEach(() => {
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }
  });

  describe('POST /orchestrator/tasks/:taskId/run', () => {
    it('should successfully initiate task execution', async () => {
      const response = await request(app.getHttpServer())
        .post(`/orchestrator/tasks/${taskId}/run`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(201);

      expect(response.body).toMatchObject({
        message: 'Task execution command accepted. Monitor real-time updates for progress.',
        taskId,
        status: 'initiated',
      });
      expect(response.body.executionId).toBeDefined();
      expect(response.body.executionId).toMatch(/^exec_\d+_[a-z0-9]+$/);
    });

    it('should reject execution without authentication', async () => {
      await request(app.getHttpServer())
        .post(`/orchestrator/tasks/${taskId}/run`)
        .expect(401);
    });

    it('should reject execution with invalid task ID format', async () => {
      await request(app.getHttpServer())
        .post('/orchestrator/tasks/invalid-uuid/run')
        .auth(jwtToken, { type: 'bearer' })
        .expect(400);
    });

    it('should return 404 for non-existent task', async () => {
      const fakeTaskId = '12345678-1234-1234-1234-123456789012';
      
      const response = await request(app.getHttpServer())
        .post(`/orchestrator/tasks/${fakeTaskId}/run`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(404);

      expect(response.body.message).toContain('Task not found or does not belong to user');
    });

    it('should reject execution of already running task', async () => {
      // First execution should succeed
      await request(app.getHttpServer())
        .post(`/orchestrator/tasks/${taskId}/run`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(201);

      // Wait a bit for task status to update
      await new Promise(resolve => setTimeout(resolve, 500));

      // Second execution should be rejected
      const response = await request(app.getHttpServer())
        .post(`/orchestrator/tasks/${taskId}/run`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(409);

      expect(response.body.message).toContain('Task is already running');
    });

    it('should reject execution of completed task', async () => {
      // Update task to completed status
      await request(app.getHttpServer())
        .patch(`/projects/${projectId}/tasks/${taskId}`)
        .auth(jwtToken, { type: 'bearer' })
        .send({ status: 'COMPLETED' });

      const response = await request(app.getHttpServer())
        .post(`/orchestrator/tasks/${taskId}/run`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(400);

      expect(response.body.message).toContain('Task is already completed');
    });

    it('should reject execution of task without assignees', async () => {
      // Create a task without assignees
      const taskResponse = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tasks`)
        .auth(jwtToken, { type: 'bearer' })
        .send({
          title: 'Unassigned Task',
          description: 'Task without assignees',
          priority: 'MEDIUM',
          assigneeIds: []
        });
      const unassignedTaskId = taskResponse.body.id;

      const response = await request(app.getHttpServer())
        .post(`/orchestrator/tasks/${unassignedTaskId}/run`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(400);

      expect(response.body.message).toContain('не назначены исполнители');
    });

    it('should reject execution of task from different user', async () => {
      // Create another user
      const anotherUser = {
        email: 'another-user@example.com',
        password: 'password123',
      };

      await request(app.getHttpServer()).post('/auth/signup').send(anotherUser);
      const anotherLoginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send(anotherUser);
      const anotherJwtToken = anotherLoginResponse.body.token;

      // Try to execute task with another user's token
      const response = await request(app.getHttpServer())
        .post(`/orchestrator/tasks/${taskId}/run`)
        .auth(anotherJwtToken, { type: 'bearer' })
        .expect(404);

      expect(response.body.message).toContain('Task not found or does not belong to user');
    });
  });

  describe('Real-time Task Execution Flow', () => {
    it('should broadcast task status updates during execution', (done) => {
      let statusUpdates: any[] = [];
      let agentLogs: any[] = [];

      clientSocket.on('taskStatusUpdate', (data) => {
        statusUpdates.push(data);
      });

      clientSocket.on('agentLog', (data) => {
        agentLogs.push(data);
        
        // Check for completion after receiving several logs
        if (agentLogs.length >= 3) {
          // Verify we received status update to IN_PROGRESS
          expect(statusUpdates).toContainEqual(
            expect.objectContaining({
              taskId,
              newStatus: 'IN_PROGRESS',
              agentId: expect.any(String),
              agentName: expect.any(String),
            })
          );

          // Verify we received relevant agent logs
          expect(agentLogs.some(log => log.message.includes('Оркестратор'))).toBe(true);
          expect(agentLogs.some(log => log.message.includes('Docker'))).toBe(true);

          done();
        }
      });

      // Start task execution
      request(app.getHttpServer())
        .post(`/orchestrator/tasks/${taskId}/run`)
        .auth(jwtToken, { type: 'bearer' })
        .end();

      // Set timeout to prevent hanging
      setTimeout(() => {
        done(new Error(`Timeout: received ${statusUpdates.length} status updates and ${agentLogs.length} logs`));
      }, 15000);
    });

    it('should handle Docker connection errors gracefully', (done) => {
      let errorReceived = false;

      clientSocket.on('agentLog', (data) => {
        if (data.message.includes('ОШИБКА') || data.message.includes('Docker')) {
          errorReceived = true;
        }
      });

      clientSocket.on('taskStatusUpdate', (data) => {
        if (data.newStatus === 'FAILED') {
          expect(errorReceived).toBe(true);
          done();
        }
      });

      // Start task execution (will likely fail due to Docker not being available in test environment)
      request(app.getHttpServer())
        .post(`/orchestrator/tasks/${taskId}/run`)
        .auth(jwtToken, { type: 'bearer' })
        .end();

      // Set timeout
      setTimeout(() => {
        if (errorReceived) {
          done(); // Test passed - error was handled gracefully
        } else {
          done(new Error('Expected Docker error was not received'));
        }
      }, 10000);
    });

    it('should maintain task isolation between different projects', async () => {
      // Create another project and task
      const project2Response = await request(app.getHttpServer())
        .post('/projects')
        .auth(jwtToken, { type: 'bearer' })
        .send({
          name: 'Isolation Test Project',
          description: 'Second project for isolation testing'
        });
      const project2Id = project2Response.body.id;

      const agent2Response = await request(app.getHttpServer())
        .post('/agents')
        .auth(jwtToken, { type: 'bearer' })
        .send({
          name: 'Isolation Test Agent',
          model: 'gpt-4',
          apiKey: 'test-api-key-2'
        });
      const agent2Id = agent2Response.body.id;

      await request(app.getHttpServer())
        .post(`/projects/${project2Id}/team/invite`)
        .auth(jwtToken, { type: 'bearer' })
        .send({ agentId: agent2Id });

      const task2Response = await request(app.getHttpServer())
        .post(`/projects/${project2Id}/tasks`)
        .auth(jwtToken, { type: 'bearer' })
        .send({
          title: 'Isolation Test Task',
          description: 'Task for isolation testing',
          assigneeIds: [agent2Id]
        });
      const task2Id = task2Response.body.id;

      // Both executions should succeed independently
      const response1 = await request(app.getHttpServer())
        .post(`/orchestrator/tasks/${taskId}/run`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(201);

      const response2 = await request(app.getHttpServer())
        .post(`/orchestrator/tasks/${task2Id}/run`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(201);

      expect(response1.body.taskId).toBe(taskId);
      expect(response2.body.taskId).toBe(task2Id);
      expect(response1.body.executionId).not.toBe(response2.body.executionId);
    });
  });

  describe('Orchestration Service Integration', () => {
    it('should properly initialize agent memory for task execution', (done) => {
      let memoryInitialized = false;

      clientSocket.on('agentLog', (data) => {
        if (data.message.includes('Память') && data.message.includes('агента')) {
          memoryInitialized = true;
        }
        
        // Complete test when we see multiple phases
        if (memoryInitialized && data.message.includes('Статус')) {
          done();
        }
      });

      request(app.getHttpServer())
        .post(`/orchestrator/tasks/${taskId}/run`)
        .auth(jwtToken, { type: 'bearer' })
        .end();

      setTimeout(() => {
        done(new Error(`Memory initialization not detected: ${memoryInitialized}`));
      }, 10000);
    });

    it('should handle multiple concurrent task executions', async () => {
      // Create multiple tasks
      const taskPromises: string[] = [];
      for (let i = 0; i < 3; i++) {
        const taskResponse = await request(app.getHttpServer())
          .post(`/projects/${projectId}/tasks`)
          .auth(jwtToken, { type: 'bearer' })
          .send({
            title: `Concurrent Task ${i + 1}`,
            description: `Concurrent testing task ${i + 1}`,
            assigneeIds: [agentId]
          });
        taskPromises.push(taskResponse.body.id);
      }

      // Execute all tasks concurrently
      const executionPromises = taskPromises.map(taskId =>
        request(app.getHttpServer())
          .post(`/orchestrator/tasks/${taskId}/run`)
          .auth(jwtToken, { type: 'bearer' })
          .expect(201)
      );

      const responses = await Promise.all(executionPromises);

      // Verify all executions were initiated
      responses.forEach((response, index) => {
        expect(response.body.taskId).toBe(taskPromises[index]);
        expect(response.body.status).toBe('initiated');
      });

      // Verify execution IDs are unique
      const executionIds = responses.map(r => r.body.executionId);
      const uniqueIds = new Set(executionIds);
      expect(uniqueIds.size).toBe(executionIds.length);
    });

    it('should properly cleanup Docker containers on execution completion', (done) => {
      let containerCreated = false;
      let containerDestroyed = false;

      clientSocket.on('agentLog', (data) => {
        if (data.message.includes('Creating environment')) {
          containerCreated = true;
        }
        if (data.message.includes('Destroying environment') || data.message.includes('environment destroyed')) {
          containerDestroyed = true;
        }
        
        // Check completion conditions
        if (containerCreated && containerDestroyed) {
          done();
        }
      });

      request(app.getHttpServer())
        .post(`/orchestrator/tasks/${taskId}/run`)
        .auth(jwtToken, { type: 'bearer' })
        .end();

      setTimeout(() => {
        done(new Error(`Container lifecycle not completed: created=${containerCreated}, destroyed=${containerDestroyed}`));
      }, 15000);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed task data gracefully', async () => {
      // Create a task with minimal data
      const minimalTaskResponse = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tasks`)
        .auth(jwtToken, { type: 'bearer' })
        .send({
          title: 'Minimal Task',
          assigneeIds: [agentId]
        });
      const minimalTaskId = minimalTaskResponse.body.id;

      // Should still be able to execute
      await request(app.getHttpServer())
        .post(`/orchestrator/tasks/${minimalTaskId}/run`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(201);
    });

    it('should handle special characters in task titles', async () => {
      const specialTaskResponse = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tasks`)
        .auth(jwtToken, { type: 'bearer' })
        .send({
          title: 'Task with international symbols & special chars <>',
          description: 'Testing unicode and special characters: 中文 🚀 "quotes"',
          assigneeIds: [agentId]
        });
      const specialTaskId = specialTaskResponse.body.id;

      await request(app.getHttpServer())
        .post(`/orchestrator/tasks/${specialTaskId}/run`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(201);
    });

    it('should handle rapid successive execution requests', async () => {
      const responses = await Promise.allSettled([
        request(app.getHttpServer())
          .post(`/orchestrator/tasks/${taskId}/run`)
          .auth(jwtToken, { type: 'bearer' }),
        request(app.getHttpServer())
          .post(`/orchestrator/tasks/${taskId}/run`)
          .auth(jwtToken, { type: 'bearer' }),
        request(app.getHttpServer())
          .post(`/orchestrator/tasks/${taskId}/run`)
          .auth(jwtToken, { type: 'bearer' }),
      ]);

      // First request should succeed
      expect(responses[0].status).toBe('fulfilled');
      expect((responses[0] as any).value.status).toBe(201);

      // At least one other should fail with conflict
      const failedRequests = responses.slice(1).filter(r => 
        r.status === 'fulfilled' && (r as any).value.status === 409
      );
      expect(failedRequests.length).toBeGreaterThan(0);
    });

    it('should validate UUID format strictly', async () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '123',
        '12345678-1234-1234-1234-12345678901', // too short
        '12345678-1234-1234-1234-1234567890123', // too long
        '12345678-12g4-1234-1234-123456789012', // invalid character
        '',
        null,
        undefined
      ];

      for (const invalidUUID of invalidUUIDs) {
        if (invalidUUID === null || invalidUUID === undefined) continue;
        
        await request(app.getHttpServer())
          .post(`/orchestrator/tasks/${invalidUUID}/run`)
          .auth(jwtToken, { type: 'bearer' })
          .expect(400);
      }
    });

    it('should handle WebSocket disconnection during execution', (done) => {
      let executionStarted = false;

      clientSocket.on('agentLog', (data) => {
        if (!executionStarted) {
          executionStarted = true;
          // Disconnect WebSocket during execution
          clientSocket.disconnect();
          
          // The execution should continue even without WebSocket
          setTimeout(() => {
            done(); // Test passes if we reach here without errors
          }, 2000);
        }
      });

      request(app.getHttpServer())
        .post(`/orchestrator/tasks/${taskId}/run`)
        .auth(jwtToken, { type: 'bearer' })
        .end();

      setTimeout(() => {
        if (!executionStarted) {
          done(new Error('Execution never started'));
        }
      }, 5000);
    });
  });

  describe('Security and Access Control', () => {
    it('should prevent cross-user task execution', async () => {
      // Create second user and their project/task
      const user2 = {
        email: 'user2-orchestrator@example.com',
        password: 'password123',
      };

      await request(app.getHttpServer()).post('/auth/signup').send(user2);
      const user2LoginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send(user2);
      const user2Token = user2LoginResponse.body.token;

      // User2 tries to execute user1's task
      await request(app.getHttpServer())
        .post(`/orchestrator/tasks/${taskId}/run`)
        .auth(user2Token, { type: 'bearer' })
        .expect(404);
    });

    it('should require valid JWT for all operations', async () => {
      // No token
      await request(app.getHttpServer())
        .post(`/orchestrator/tasks/${taskId}/run`)
        .expect(401);

      // Invalid token
      await request(app.getHttpServer())
        .post(`/orchestrator/tasks/${taskId}/run`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      // Expired/malformed token
      await request(app.getHttpServer())
        .post(`/orchestrator/tasks/${taskId}/run`)
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid')
        .expect(401);
    });
  });

  describe('Performance and Resource Management', () => {
    it('should generate unique execution IDs for concurrent requests', async () => {
      const tasks: string[] = [];
      
      // Create multiple tasks
      for (let i = 0; i < 5; i++) {
        const taskResponse = await request(app.getHttpServer())
          .post(`/projects/${projectId}/tasks`)
          .auth(jwtToken, { type: 'bearer' })
          .send({
            title: `Performance Task ${i}`,
            assigneeIds: [agentId]
          });
        tasks.push(taskResponse.body.id);
      }

      // Execute all tasks at the same time
      const startTime = Date.now();
      const responses = await Promise.all(
        tasks.map(taskId =>
          request(app.getHttpServer())
            .post(`/orchestrator/tasks/${taskId}/run`)
            .auth(jwtToken, { type: 'bearer' })
            .expect(201)
        )
      );
      const endTime = Date.now();

      // Verify all execution IDs are unique
      const executionIds = responses.map(r => r.body.executionId);
      const uniqueIds = new Set(executionIds);
      expect(uniqueIds.size).toBe(executionIds.length);

      // Verify reasonable response time (should be fast since it's async)
      expect(endTime - startTime).toBeLessThan(5000);

      // Verify all responses have correct format
      responses.forEach((response, index) => {
        expect(response.body).toMatchObject({
          taskId: tasks[index],
          status: 'initiated',
          message: expect.stringContaining('accepted'),
        });
      });
    });

    it('should handle memory cleanup properly', (done) => {
      let memoryEvents = 0;
      let cleanupDetected = false;

      clientSocket.on('agentLog', (data) => {
        if (data.message.includes('memory')) {
          memoryEvents++;
        }
        if (data.message.includes('Status') && data.message.includes('FAILED')) {
          cleanupDetected = true;
          // Wait a bit more for any cleanup logs
          setTimeout(() => {
            expect(memoryEvents).toBeGreaterThan(0);
            done();
          }, 1000);
        }
      });

      request(app.getHttpServer())
        .post(`/orchestrator/tasks/${taskId}/run`)
        .auth(jwtToken, { type: 'bearer' })
        .end();

      setTimeout(() => {
        if (!cleanupDetected) {
          done(new Error('Memory cleanup not detected'));
        }
      }, 12000);
    });
  });
});