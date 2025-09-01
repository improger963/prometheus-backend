import io from 'socket.io-client';
import { INestApplication } from '@nestjs/common';

export type SocketIOClient = ReturnType<typeof io>;

export interface WebSocketTestOptions {
  app: INestApplication;
  jwtToken?: string;
  timeout?: number;
  forceNew?: boolean;
}

export interface WebSocketEventTestOptions {
  eventName: string;
  expectedData?: any;
  timeout?: number;
  validateData?: (data: any) => boolean;
}

export class WebSocketTestHelper {
  private clients: SocketIOClient[] = [];
  private port: number;

  constructor(private app: INestApplication) {
    const server = this.app.getHttpServer();
    this.port = server.address()?.port;
  }

  /**
   * Create a new WebSocket client with authentication
   */
  createClient(options: Partial<WebSocketTestOptions> = {}): SocketIOClient {
    const client = io(`http://localhost:${this.port}`, {
      auth: options.jwtToken ? { token: options.jwtToken } : undefined,
      transports: ['websocket'],
      forceNew: options.forceNew ?? true,
    });

    this.clients.push(client);
    return client;
  }

  /**
   * Create multiple clients for load testing
   */
  createMultipleClients(count: number, options: Partial<WebSocketTestOptions> = {}): SocketIOClient[] {
    const clients: SocketIOClient[] = [];
    
    for (let i = 0; i < count; i++) {
      const client = this.createClient({
        ...options,
        forceNew: true,
      });
      clients.push(client);
    }

    return clients;
  }

  /**
   * Wait for a client to connect
   */
  waitForConnection(client: SocketIOClient, timeout: number = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      if (client.connected) {
        resolve();
        return;
      }

      const timer = setTimeout(() => {
        reject(new Error(`Client failed to connect within ${timeout}ms`));
      }, timeout);

      client.on('connect', () => {
        clearTimeout(timer);
        resolve();
      });

      client.on('connect_error', (error) => {
        clearTimeout(timer);
        reject(new Error(`Connection failed: ${error.message}`));
      });
    });
  }

  /**
   * Wait for multiple clients to connect
   */
  async waitForMultipleConnections(clients: SocketIOClient[], timeout: number = 10000): Promise<void> {
    const connectionPromises = clients.map(client => this.waitForConnection(client, timeout));
    await Promise.all(connectionPromises);
  }

  /**
   * Wait for a specific event on a client
   */
  waitForEvent(client: SocketIOClient, options: WebSocketEventTestOptions): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = options.timeout ?? 5000;
      
      const timer = setTimeout(() => {
        reject(new Error(`Event '${options.eventName}' not received within ${timeout}ms`));
      }, timeout);

      client.on(options.eventName, (data) => {
        clearTimeout(timer);
        
        // Validate data if validator provided
        if (options.validateData && !options.validateData(data)) {
          reject(new Error(`Event '${options.eventName}' received invalid data`));
          return;
        }

        // Check expected data if provided
        if (options.expectedData && JSON.stringify(data) !== JSON.stringify(options.expectedData)) {
          reject(new Error(`Event '${options.eventName}' received unexpected data`));
          return;
        }

        resolve(data);
      });
    });
  }

  /**
   * Wait for an event on multiple clients
   */
  async waitForEventOnMultipleClients(
    clients: SocketIOClient[], 
    options: WebSocketEventTestOptions
  ): Promise<any[]> {
    const eventPromises = clients.map(client => this.waitForEvent(client, options));
    return Promise.all(eventPromises);
  }

  /**
   * Join a room for a client
   */
  async joinRoom(client: SocketIOClient, roomId: string, timeout: number = 3000): Promise<void> {
    await this.waitForConnection(client, timeout);
    
    const joinPromise = this.waitForEvent(client, {
      eventName: 'joinedRoom',
      timeout,
      validateData: (data) => typeof data === 'string' && data.includes(roomId),
    });

    client.emit('joinProjectRoom', roomId);
    await joinPromise;
  }

  /**
   * Join rooms for multiple clients
   */
  async joinRoomForMultipleClients(clients: SocketIOClient[], roomId: string): Promise<void> {
    const joinPromises = clients.map(client => this.joinRoom(client, roomId));
    await Promise.all(joinPromises);
  }

  /**
   * Measure round-trip latency
   */
  async measureLatency(client: SocketIOClient, samples: number = 10): Promise<{
    average: number;
    min: number;
    max: number;
    measurements: number[];
  }> {
    await this.waitForConnection(client);
    
    const measurements: number[] = [];

    for (let i = 0; i < samples; i++) {
      const startTime = Date.now();
      
      // Send ping and wait for pong
      const pongPromise = this.waitForEvent(client, {
        eventName: 'pong',
        timeout: 2000,
      });

      client.emit('ping', { timestamp: startTime, id: i });
      await pongPromise;
      
      const latency = Date.now() - startTime;
      measurements.push(latency);

      // Small delay between measurements
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      average: measurements.reduce((a, b) => a + b, 0) / measurements.length,
      min: Math.min(...measurements),
      max: Math.max(...measurements),
      measurements,
    };
  }

  /**
   * Test message broadcasting to multiple clients
   */
  async testBroadcast(
    clients: SocketIOClient[],
    roomId: string,
    triggerEvent: () => Promise<void>,
    expectedEvent: string,
    timeout: number = 5000
  ): Promise<{ receivedCount: number; data: any[] }> {
    // Join all clients to the room
    await this.joinRoomForMultipleClients(clients, roomId);

    // Set up event listeners
    const eventPromises = clients.map(client => 
      this.waitForEvent(client, { eventName: expectedEvent, timeout })
        .catch(() => null) // Don't fail if one client doesn't receive
    );

    // Trigger the event
    await triggerEvent();

    // Wait for all responses
    const results = await Promise.all(eventPromises);
    const receivedData = results.filter(result => result !== null);

    return {
      receivedCount: receivedData.length,
      data: receivedData,
    };
  }

  /**
   * Simulate network conditions (delay, packet loss)
   */
  simulateNetworkConditions(client: SocketIOClient, options: {
    latency?: number;
    packetLoss?: number;
  }): void {
    const originalEmit = client.emit.bind(client);
    
    client.emit = (event: string, ...args: any[]) => {
      // Simulate packet loss
      if (options.packetLoss && Math.random() < options.packetLoss) {
        return client; // Drop the packet
      }

      // Simulate latency
      if (options.latency) {
        setTimeout(() => {
          originalEmit(event, ...args);
        }, options.latency);
      } else {
        originalEmit(event, ...args);
      }

      return client;
    };
  }

  /**
   * Performance test: measure events per second
   */
  async measureEventsPerSecond(
    client: SocketIOClient,
    duration: number = 5000
  ): Promise<{ eventsPerSecond: number; totalEvents: number }> {
    await this.waitForConnection(client);
    
    let eventCount = 0;
    const startTime = Date.now();

    return new Promise((resolve) => {
      // Send events as fast as possible
      const sendEvents = () => {
        if (Date.now() - startTime < duration) {
          client.emit('test-event', { id: eventCount, timestamp: Date.now() });
          eventCount++;
          setImmediate(sendEvents);
        } else {
          const actualDuration = Date.now() - startTime;
          const eventsPerSecond = (eventCount / actualDuration) * 1000;
          resolve({ eventsPerSecond, totalEvents: eventCount });
        }
      };

      sendEvents();
    });
  }

  /**
   * Clean up all clients
   */
  cleanup(): void {
    this.clients.forEach(client => {
      if (client.connected) {
        client.disconnect();
      }
    });
    this.clients = [];
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    totalClients: number;
    connectedClients: number;
    disconnectedClients: number;
  } {
    const connectedClients = this.clients.filter(client => client.connected).length;
    return {
      totalClients: this.clients.length,
      connectedClients,
      disconnectedClients: this.clients.length - connectedClients,
    };
  }
}

/**
 * Utility function to create test data for WebSocket tests
 */
export class WebSocketTestDataFactory {
  static createProjectData(suffix: string = '') {
    return {
      name: `WebSocket Test Project ${suffix}`,
      description: `Project for WebSocket testing ${suffix}`,
    };
  }

  static createAgentData(suffix: string = '') {
    return {
      name: `WebSocket Test Agent ${suffix}`,
      role: `Test agent for WebSocket testing ${suffix}`,
      personalityMatrix: {
        systemPrompt: 'You are a WebSocket test agent.',
      },
      llmConfig: {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-api-key',
      },
    };
  }

  static createTaskData(agentId: string, suffix: string = '') {
    return {
      title: `WebSocket Test Task ${suffix}`,
      description: `Task for WebSocket testing ${suffix}`,
      priority: 'HIGH',
      assigneeIds: [agentId],
    };
  }

  static createUserData(suffix: string = '') {
    return {
      email: `websocket-tester-${suffix}@example.com`,
      password: 'password123',
    };
  }
}

/**
 * WebSocket test assertions
 */
export class WebSocketAssertions {
  /**
   * Assert that an event was received within timeout
   */
  static async assertEventReceived(
    client: SocketIOClient,
    eventName: string,
    timeout: number = 5000
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Event '${eventName}' was not received within ${timeout}ms`));
      }, timeout);

      client.on(eventName, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }

  /**
   * Assert that multiple clients receive the same event
   */
  static async assertBroadcastReceived(
    clients: SocketIOClient[],
    eventName: string,
    timeout: number = 5000
  ): Promise<any[]> {
    const promises = clients.map(client => 
      WebSocketAssertions.assertEventReceived(client, eventName, timeout)
    );
    return Promise.all(promises);
  }

  /**
   * Assert connection is established
   */
  static async assertConnection(client: SocketIOClient, timeout: number = 5000): Promise<void> {
    if (client.connected) return;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Client failed to connect within ${timeout}ms`));
      }, timeout);

      client.on('connect', () => {
        clearTimeout(timer);
        resolve();
      });

      client.on('connect_error', (error) => {
        clearTimeout(timer);
        reject(new Error(`Connection failed: ${error.message}`));
      });
    });
  }

  /**
   * Assert that latency is within acceptable range
   */
  static assertLatency(measurements: number[], maxAverageLatency: number, maxLatency: number): void {
    const average = measurements.reduce((a, b) => a + b, 0) / measurements.length;
    const max = Math.max(...measurements);

    if (average > maxAverageLatency) {
      throw new Error(`Average latency ${average.toFixed(2)}ms exceeds maximum ${maxAverageLatency}ms`);
    }

    if (max > maxLatency) {
      throw new Error(`Maximum latency ${max.toFixed(2)}ms exceeds maximum ${maxLatency}ms`);
    }
  }

  /**
   * Assert performance metrics
   */
  static assertPerformance(metrics: {
    eventsPerSecond?: number;
    minEventsPerSecond?: number;
    connectionTime?: number;
    maxConnectionTime?: number;
  }): void {
    if (metrics.eventsPerSecond && metrics.minEventsPerSecond) {
      if (metrics.eventsPerSecond < metrics.minEventsPerSecond) {
        throw new Error(
          `Events per second ${metrics.eventsPerSecond.toFixed(2)} is below minimum ${metrics.minEventsPerSecond}`
        );
      }
    }

    if (metrics.connectionTime && metrics.maxConnectionTime) {
      if (metrics.connectionTime > metrics.maxConnectionTime) {
        throw new Error(
          `Connection time ${metrics.connectionTime}ms exceeds maximum ${metrics.maxConnectionTime}ms`
        );
      }
    }
  }
}