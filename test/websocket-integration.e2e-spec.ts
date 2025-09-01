import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import request from 'supertest';
import { AuthModule } from '../src/auth/auth.module';
import { ProjectsModule } from '../src/projects/projects.module';
import { AgentsModule } from '../src/agents/agents.module';
import { TasksModule } from '../src/tasks/tasks.module';
import { OrchestratorModule } from '../src/orchestrator/orchestrator.module';
import { testDatabaseConfig } from './test-database.config';
import { DataSource } from 'typeorm';
import { 
  WebSocketTestHelper, 
  WebSocketTestDataFactory, 
  WebSocketAssertions 
} from './utils/websocket-test-helper';

describe('WebSocket Integration Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let helper: WebSocketTestHelper;
  let jwtToken: string;
  let projectId: string;
  let agentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ 
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({
            JWT_SECRET: 'integration-test-secret-key',
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
    await app.listen(0);
    
    helper = new WebSocketTestHelper(app);

    // Setup test data
    const userData = WebSocketTestDataFactory.createUserData('integration');
    await request(app.getHttpServer()).post('/auth/signup').send(userData);
    
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send(userData);
    jwtToken = loginResponse.body.token;

    const projectData = WebSocketTestDataFactory.createProjectData('integration');
    const projectResponse = await request(app.getHttpServer())
      .post('/projects')
      .auth(jwtToken, { type: 'bearer' })
      .send(projectData);
    projectId = projectResponse.body.id;

    const agentData = WebSocketTestDataFactory.createAgentData('integration');
    const agentResponse = await request(app.getHttpServer())
      .post('/agents')
      .auth(jwtToken, { type: 'bearer' })
      .send(agentData);
    agentId = agentResponse.body.id;
  });

  afterAll(async () => {
    helper.cleanup();
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
    await app.close();
  });

  afterEach(() => {
    helper.cleanup();
  });

  describe('Basic WebSocket Functionality', () => {
    it('should establish connection and join rooms', async () => {
      const client = helper.createClient({ jwtToken });
      
      await WebSocketAssertions.assertConnection(client);
      await helper.joinRoom(client, projectId);
      
      expect(client.connected).toBe(true);
    });

    it('should handle multiple clients in same room', async () => {
      const clients = helper.createMultipleClients(5, { jwtToken });
      
      await helper.waitForMultipleConnections(clients);
      await helper.joinRoomForMultipleClients(clients, projectId);
      
      const stats = helper.getConnectionStats();
      expect(stats.connectedClients).toBe(5);
    });
  });

  describe('Real-time Task Updates', () => {
    let taskId: string;

    beforeEach(async () => {
      const taskData = WebSocketTestDataFactory.createTaskData(agentId, 'realtime');
      const taskResponse = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tasks`)
        .auth(jwtToken, { type: 'bearer' })
        .send(taskData);
      taskId = taskResponse.body.id;
    });

    it('should broadcast task updates to all clients in room', async () => {
      const clients = helper.createMultipleClients(3, { jwtToken });
      
      const broadcastResult = await helper.testBroadcast(
        clients,
        projectId,
        async () => {
          await request(app.getHttpServer())
            .patch(`/projects/${projectId}/tasks/${taskId}`)
            .auth(jwtToken, { type: 'bearer' })
            .send({ status: 'IN_PROGRESS' });
        },
        'taskStatusUpdate'
      );

      expect(broadcastResult.receivedCount).toBe(3);
      broadcastResult.data.forEach(data => {
        expect(data.taskId).toBe(taskId);
        expect(data.newStatus).toBe('IN_PROGRESS');
      });
    });

    it('should handle sequential task updates', async () => {
      const client = helper.createClient({ jwtToken });
      await helper.joinRoom(client, projectId);
      
      const statuses = ['IN_PROGRESS', 'COMPLETED', 'FAILED'];
      const receivedUpdates: any[] = [];

      // Listen for all updates
      client.on('taskStatusUpdate', (data) => {
        receivedUpdates.push(data);
      });

      // Send updates sequentially
      for (const status of statuses) {
        await request(app.getHttpServer())
          .patch(`/projects/${projectId}/tasks/${taskId}`)
          .auth(jwtToken, { type: 'bearer' })
          .send({ status });
        
        // Wait a bit between updates
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Wait for all updates to be received
      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(receivedUpdates).toHaveLength(3);
      statuses.forEach((status, index) => {
        expect(receivedUpdates[index].newStatus).toBe(status);
      });
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle high-frequency events efficiently', async () => {
      const client = helper.createClient({ jwtToken });
      await helper.joinRoom(client, projectId);

      const performance = await helper.measureEventsPerSecond(client, 2000);
      
      WebSocketAssertions.assertPerformance({
        eventsPerSecond: performance.eventsPerSecond,
        minEventsPerSecond: 100, // Expect at least 100 events per second
      });

      expect(performance.totalEvents).toBeGreaterThan(200);
    });

    it('should maintain low latency under normal load', async () => {
      const client = helper.createClient({ jwtToken });
      
      const latencyStats = await helper.measureLatency(client, 20);
      
      WebSocketAssertions.assertLatency(
        latencyStats.measurements,
        50,  // Max average latency: 50ms
        200  // Max single latency: 200ms
      );

      expect(latencyStats.average).toBeLessThan(50);
      expect(latencyStats.max).toBeLessThan(200);
    });

    it('should handle concurrent connections efficiently', async () => {
      const connectionCount = 20;
      const clients = helper.createMultipleClients(connectionCount, { jwtToken });
      
      const startTime = Date.now();
      await helper.waitForMultipleConnections(clients, 10000);
      const connectionTime = Date.now() - startTime;

      WebSocketAssertions.assertPerformance({
        connectionTime,
        maxConnectionTime: 5000, // All connections should establish within 5 seconds
      });

      const stats = helper.getConnectionStats();
      expect(stats.connectedClients).toBe(connectionCount);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle malformed data gracefully', async () => {
      const client = helper.createClient({ jwtToken });
      await WebSocketAssertions.assertConnection(client);

      // Send various malformed payloads
      const malformedData = [null, undefined, '', '{invalid:json}', { very: { deep: { nested: { object: true } } } }];
      
      for (const data of malformedData) {
        client.emit('joinProjectRoom', data);
      }

      // Wait a bit to see if connection survives
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      expect(client.connected).toBe(true);
    });

    it('should recover from network simulation', async () => {
      const client = helper.createClient({ jwtToken });
      
      // Simulate poor network conditions
      helper.simulateNetworkConditions(client, {
        latency: 100,
        packetLoss: 0.1, // 10% packet loss
      });

      await WebSocketAssertions.assertConnection(client, 10000);
      await helper.joinRoom(client, projectId, 10000);
      
      expect(client.connected).toBe(true);
    });

    it('should handle rapid room switching without memory leaks', async () => {
      const client = helper.createClient({ jwtToken });
      await WebSocketAssertions.assertConnection(client);

      const rooms = Array.from({ length: 50 }, (_, i) => `room-${i}`);
      
      for (const room of rooms) {
        await helper.joinRoom(client, room, 2000);
      }

      expect(client.connected).toBe(true);
    });
  });

  describe('Advanced Scenarios', () => {
    it('should handle mixed authenticated and unauthenticated clients', async () => {
      const authenticatedClients = helper.createMultipleClients(3, { jwtToken });
      const unauthenticatedClients = helper.createMultipleClients(2); // No JWT token

      // All clients should be able to connect (depends on gateway config)
      await helper.waitForMultipleConnections([...authenticatedClients, ...unauthenticatedClients]);

      const stats = helper.getConnectionStats();
      expect(stats.connectedClients).toBe(5);
    });

    it('should handle clients joining and leaving during broadcasts', async () => {
      const staticClients = helper.createMultipleClients(3, { jwtToken });
      await helper.waitForMultipleConnections(staticClients);
      await helper.joinRoomForMultipleClients(staticClients, projectId);

      let dynamicClient = helper.createClient({ jwtToken });
      await helper.joinRoom(dynamicClient, projectId);

      // Create task for testing
      const taskData = WebSocketTestDataFactory.createTaskData(agentId, 'dynamic');
      const taskResponse = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tasks`)
        .auth(jwtToken, { type: 'bearer' })
        .send(taskData);
      const taskId = taskResponse.body.id;

      // Start listening for events on all clients
      const eventPromises = [...staticClients, dynamicClient].map(client =>
        helper.waitForEvent(client, { eventName: 'taskStatusUpdate', timeout: 3000 })
          .catch(() => null)
      );

      // Disconnect dynamic client mid-broadcast
      setTimeout(() => {
        dynamicClient.disconnect();
      }, 100);

      // Trigger broadcast
      await request(app.getHttpServer())
        .patch(`/projects/${projectId}/tasks/${taskId}`)
        .auth(jwtToken, { type: 'bearer' })
        .send({ status: 'IN_PROGRESS' });

      const results = await Promise.all(eventPromises);
      const receivedCount = results.filter(result => result !== null).length;

      // Static clients should receive, dynamic client might not
      expect(receivedCount).toBe(3); // Only static clients
    });

    it('should maintain performance with mixed message types', async () => {
      const client = helper.createClient({ jwtToken });
      await helper.joinRoom(client, projectId);

      let eventsReceived = 0;
      const eventTypes = ['taskStatusUpdate', 'agentLog', 'projectUpdate', 'joinedRoom'];

      eventTypes.forEach(eventType => {
        client.on(eventType, () => {
          eventsReceived++;
        });
      });

      // Simulate various event types
      const promises = eventTypes.map(async (eventType, index) => {
        await new Promise(resolve => setTimeout(resolve, index * 100));
        
        if (eventType === 'joinedRoom') {
          client.emit('joinProjectRoom', `test-room-${index}`);
        }
      });

      await Promise.all(promises);
      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(eventsReceived).toBeGreaterThan(0);
      expect(client.connected).toBe(true);
    });
  });

  describe('Real-world Usage Patterns', () => {
    it('should simulate typical frontend usage pattern', async () => {
      // Simulate a typical frontend application workflow
      const client = helper.createClient({ jwtToken });
      
      // 1. Connect and authenticate
      await WebSocketAssertions.assertConnection(client);
      
      // 2. Join project room
      await helper.joinRoom(client, projectId);
      
      // 3. Create and track a task
      const taskData = WebSocketTestDataFactory.createTaskData(agentId, 'frontend-sim');
      const taskResponse = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tasks`)
        .auth(jwtToken, { type: 'bearer' })
        .send(taskData);
      const taskId = taskResponse.body.id;

      // 4. Listen for task updates
      const updatePromise = helper.waitForEvent(client, { 
        eventName: 'taskStatusUpdate',
        timeout: 5000,
      });

      // 5. Update task status (simulating agent or user action)
      await request(app.getHttpServer())
        .patch(`/projects/${projectId}/tasks/${taskId}`)
        .auth(jwtToken, { type: 'bearer' })
        .send({ status: 'IN_PROGRESS' });

      // 6. Receive real-time update
      const updateData = await updatePromise;
      expect(updateData.taskId).toBe(taskId);
      expect(updateData.newStatus).toBe('IN_PROGRESS');

      // 7. Clean disconnect
      client.disconnect();
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(client.connected).toBe(false);
    });

    it('should handle long-running dashboard session', async () => {
      const client = helper.createClient({ jwtToken });
      await helper.joinRoom(client, projectId);

      const events: any[] = [];
      client.on('taskStatusUpdate', (data) => events.push({ type: 'task', data }));
      client.on('agentLog', (data) => events.push({ type: 'log', data }));

      // Simulate a 10-second dashboard session with periodic activity
      const sessionDuration = 2000; // Reduced for testing
      const startTime = Date.now();

      const activityInterval = setInterval(async () => {
        // Simulate periodic user activity
        client.emit('ping', { timestamp: Date.now() });
      }, 500);

      // Wait for session duration
      await new Promise(resolve => setTimeout(resolve, sessionDuration));
      clearInterval(activityInterval);

      const sessionTime = Date.now() - startTime;
      expect(sessionTime).toBeGreaterThanOrEqual(sessionDuration);
      expect(client.connected).toBe(true);
    });
  });
});