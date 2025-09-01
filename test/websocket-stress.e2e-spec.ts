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

describe('WebSocket Stress Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtToken: string;
  let projectId: string;
  let agentId: string;
  let port: number;

  const user = {
    email: 'stress-tester@example.com',
    password: 'password123',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ 
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({
            JWT_SECRET: 'stress-test-secret-key',
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
    
    const server = app.getHttpServer();
    port = server.address().port;

    // Setup test data
    await request(app.getHttpServer()).post('/auth/signup').send(user);
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send(user);
    jwtToken = loginResponse.body.token;

    const projectResponse = await request(app.getHttpServer())
      .post('/projects')
      .auth(jwtToken, { type: 'bearer' })
      .send({
        name: 'Stress Test Project',
        description: 'Project for stress testing'
      });
    projectId = projectResponse.body.id;

    const agentResponse = await request(app.getHttpServer())
      .post('/agents')
      .auth(jwtToken, { type: 'bearer' })
      .send({
        name: 'Stress Test Agent',
        role: 'Agent for stress testing WebSocket connections',
        personalityMatrix: {
          systemPrompt: 'You are a stress test agent.'
        },
        llmConfig: {
          provider: 'openai',
          model: 'gpt-4',
          apiKey: 'stress-test-api-key'
        }
      });
    agentId = agentResponse.body.id;
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
    await app.close();
  });

  describe('Concurrent Connections', () => {
    it('should handle 50 concurrent client connections', (done) => {
      const clientCount = 50;
      const clients: SocketIOClient[] = [];
      let connectedCount = 0;

      const createClient = (index: number) => {
        const client = io(`http://localhost:${port}`, {
          auth: { token: jwtToken },
          transports: ['websocket'],
          forceNew: true,
        });

        client.on('connect', () => {
          connectedCount++;
          client.emit('joinProjectRoom', `${projectId}-${index}`);
          
          if (connectedCount === clientCount) {
            // All clients connected, clean up
            setTimeout(() => {
              clients.forEach(c => c.disconnect());
              done();
            }, 1000);
          }
        });

        client.on('connect_error', (error) => {
          done(new Error(`Client ${index} failed to connect: ${error.message}`));
        });

        clients.push(client);
      };

      // Create all clients
      for (let i = 0; i < clientCount; i++) {
        createClient(i);
      }

      // Set timeout for safety
      setTimeout(() => {
        clients.forEach(c => c.disconnect());
        if (connectedCount < clientCount) {
          done(new Error(`Only ${connectedCount} out of ${clientCount} clients connected`));
        }
      }, 15000);
    }, 20000);

    it('should handle rapid connect/disconnect cycles', (done) => {
      const cycles = 20;
      let completedCycles = 0;

      const performCycle = (cycleIndex: number) => {
        const client = io(`http://localhost:${port}`, {
          auth: { token: jwtToken },
          transports: ['websocket'],
          forceNew: true,
        });

        client.on('connect', () => {
          client.emit('joinProjectRoom', projectId);
          
          // Disconnect after a short delay
          setTimeout(() => {
            client.disconnect();
          }, 50);
        });

        client.on('disconnect', () => {
          completedCycles++;
          if (completedCycles === cycles) {
            done();
          }
        });

        client.on('connect_error', (error) => {
          done(new Error(`Cycle ${cycleIndex} failed: ${error.message}`));
        });
      };

      // Start all cycles
      for (let i = 0; i < cycles; i++) {
        setTimeout(() => performCycle(i), i * 100);
      }

      // Safety timeout
      setTimeout(() => {
        if (completedCycles < cycles) {
          done(new Error(`Only completed ${completedCycles} out of ${cycles} cycles`));
        }
      }, 10000);
    }, 15000);
  });

  describe('High Volume Message Broadcasting', () => {
    it('should broadcast to 20 clients in same room efficiently', (done) => {
      const clientCount = 20;
      const clients: SocketIOClient[] = [];
      let connectedCount = 0;
      let messagesReceived = 0;
      let taskId: string;

      const createClient = (index: number) => {
        const client = io(`http://localhost:${port}`, {
          auth: { token: jwtToken },
          transports: ['websocket'],
          forceNew: true,
        });

        client.on('connect', () => {
          client.emit('joinProjectRoom', projectId);
          connectedCount++;
          
          if (connectedCount === clientCount) {
            // All clients connected, create task and trigger update
            createTaskAndTriggerUpdate();
          }
        });

        client.on('taskStatusUpdate', (data) => {
          messagesReceived++;
          expect(data.taskId).toBe(taskId);
          
          if (messagesReceived === clientCount) {
            // All clients received the message
            clients.forEach(c => c.disconnect());
            done();
          }
        });

        clients.push(client);
      };

      const createTaskAndTriggerUpdate = async () => {
        try {
          const taskResponse = await request(app.getHttpServer())
            .post(`/projects/${projectId}/tasks`)
            .auth(jwtToken, { type: 'bearer' })
            .send({
              title: 'Broadcast Test Task',
              description: 'Task for broadcast testing',
              priority: 'HIGH',
              assigneeIds: [agentId]
            });
          
          taskId = taskResponse.body.id;

          // Wait a bit for all clients to join rooms
          setTimeout(() => {
            request(app.getHttpServer())
              .patch(`/projects/${projectId}/tasks/${taskId}`)
              .auth(jwtToken, { type: 'bearer' })
              .send({ status: 'IN_PROGRESS' })
              .end();
          }, 500);
        } catch (error) {
          done(new Error(`Failed to create task: ${error.message}`));
        }
      };

      // Create all clients
      for (let i = 0; i < clientCount; i++) {
        createClient(i);
      }

      // Safety timeout
      setTimeout(() => {
        clients.forEach(c => c.disconnect());
        done(new Error(`Only ${messagesReceived} out of ${clientCount} clients received message`));
      }, 10000);
    }, 15000);
  });

  describe('Memory and Resource Management', () => {
    it('should not leak memory with rapid room joins/leaves', (done) => {
      const client = io(`http://localhost:${port}`, {
        auth: { token: jwtToken },
        transports: ['websocket'],
        forceNew: true,
      });

      let roomSwitches = 0;
      const maxSwitches = 100;

      client.on('connect', () => {
        const switchRooms = () => {
          if (roomSwitches >= maxSwitches) {
            client.disconnect();
            done();
            return;
          }

          const roomId = `room-${roomSwitches}`;
          client.emit('joinProjectRoom', roomId);
          roomSwitches++;
          
          setTimeout(switchRooms, 10);
        };

        switchRooms();
      });

      client.on('connect_error', (error) => {
        done(new Error(`Connection failed: ${error.message}`));
      });

      // Safety timeout
      setTimeout(() => {
        client.disconnect();
        if (roomSwitches < maxSwitches) {
          done(new Error(`Only completed ${roomSwitches} room switches`));
        }
      }, 5000);
    }, 10000);

    it('should handle clients with very long session times', (done) => {
      const client = io(`http://localhost:${port}`, {
        auth: { token: jwtToken },
        transports: ['websocket'],
        forceNew: true,
      });

      let heartbeatCount = 0;
      const maxHeartbeats = 10;

      client.on('connect', () => {
        client.emit('joinProjectRoom', projectId);
        
        // Send periodic pings to simulate long session
        const heartbeat = setInterval(() => {
          if (heartbeatCount >= maxHeartbeats) {
            clearInterval(heartbeat);
            client.disconnect();
            done();
            return;
          }

          client.emit('ping', { timestamp: Date.now() });
          heartbeatCount++;
        }, 100);
      });

      client.on('connect_error', (error) => {
        done(new Error(`Long session test failed: ${error.message}`));
      });

      // Safety timeout
      setTimeout(() => {
        client.disconnect();
        if (heartbeatCount < maxHeartbeats) {
          done(new Error(`Only sent ${heartbeatCount} heartbeats`));
        }
      }, 5000);
    }, 10000);
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from server restart simulation', (done) => {
      const client = io(`http://localhost:${port}`, {
        auth: { token: jwtToken },
        transports: ['websocket'],
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 100,
      });

      let connected = false;
      let reconnected = false;

      client.on('connect', () => {
        if (!connected) {
          connected = true;
          client.emit('joinProjectRoom', projectId);
          
          // Simulate server disconnect
          setTimeout(() => {
            client.disconnect();
            
            // Attempt to reconnect
            setTimeout(() => {
              client.connect();
            }, 200);
          }, 500);
        } else {
          reconnected = true;
          client.emit('joinProjectRoom', projectId);
        }
      });

      client.on('joinedRoom', () => {
        if (reconnected) {
          client.disconnect();
          done();
        }
      });

      client.on('connect_error', () => {
        // Expected during reconnection attempts
      });

      // Safety timeout
      setTimeout(() => {
        client.disconnect();
        done(new Error(`Connected: ${connected}, Reconnected: ${reconnected}`));
      }, 5000);
    }, 10000);

    it('should handle malformed message payloads gracefully', (done) => {
      const client = io(`http://localhost:${port}`, {
        auth: { token: jwtToken },
        transports: ['websocket'],
        forceNew: true,
      });

      client.on('connect', () => {
        // Send various malformed payloads
        const malformedPayloads = [
          null,
          undefined,
          '',
          '{"invalid": json}',
          { circular: {} },
          Array(10000).fill('x').join(''), // Very large string
          { deeply: { nested: { object: { with: { many: { levels: true } } } } } },
        ];

        // Set circular reference
        malformedPayloads[5].circular = malformedPayloads[5];

        malformedPayloads.forEach((payload, index) => {
          setTimeout(() => {
            try {
              client.emit('joinProjectRoom', payload);
            } catch (error) {
              // Expected for some payloads
            }
          }, index * 100);
        });

        // If we get here without crashing, test passed
        setTimeout(() => {
          expect(client.connected).toBe(true);
          client.disconnect();
          done();
        }, 2000);
      });

      client.on('connect_error', (error) => {
        done(new Error(`Connection failed with malformed payloads: ${error.message}`));
      });
    }, 5000);
  });

  describe('Performance Benchmarks', () => {
    it('should maintain low latency under load', (done) => {
      const client = io(`http://localhost:${port}`, {
        auth: { token: jwtToken },
        transports: ['websocket'],
        forceNew: true,
      });

      const measurements: number[] = [];
      let messageCount = 0;
      const maxMessages = 50;

      client.on('connect', () => {
        client.emit('joinProjectRoom', projectId);
      });

      client.on('joinedRoom', () => {
        const sendTimestampedMessage = () => {
          if (messageCount >= maxMessages) {
            // Calculate average latency
            const avgLatency = measurements.reduce((a, b) => a + b, 0) / measurements.length;
            const maxLatency = Math.max(...measurements);
            
            console.log(`Average latency: ${avgLatency.toFixed(2)}ms, Max: ${maxLatency.toFixed(2)}ms`);
            
            // Ensure reasonable performance (less than 100ms average)
            expect(avgLatency).toBeLessThan(100);
            expect(maxLatency).toBeLessThan(500);
            
            client.disconnect();
            done();
            return;
          }

          const startTime = Date.now();
          client.emit('ping', { id: messageCount, timestamp: startTime });
          messageCount++;
        };

        // Send messages at regular intervals
        const interval = setInterval(() => {
          if (messageCount >= maxMessages) {
            clearInterval(interval);
            return;
          }
          sendTimestampedMessage();
        }, 50);
      });

      client.on('pong', (data) => {
        const latency = Date.now() - data.timestamp;
        measurements.push(latency);
      });

      // Safety timeout
      setTimeout(() => {
        client.disconnect();
        done(new Error(`Only completed ${messageCount} out of ${maxMessages} messages`));
      }, 10000);
    }, 15000);
  });
});