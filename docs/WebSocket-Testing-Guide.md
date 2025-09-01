# WebSocket Integration Testing Documentation

## Overview

The Prometheus Backend includes comprehensive WebSocket integration tests that validate real-time communication functionality. These tests ensure the reliability, performance, and scalability of the WebSocket implementation.

## Test Structure

### 1. Core WebSocket Tests (`websocket.e2e-spec.ts`)
- **Connection Management**: Authentication, connection lifecycle, error handling
- **Room Management**: Joining/leaving rooms, multi-room support
- **Real-time Updates**: Task status broadcasts, agent logs
- **Multiple Clients**: Concurrent connections, broadcast validation
- **Error Handling**: Malformed data, network issues, edge cases
- **Performance**: Load testing, latency measurements

### 2. Stress Tests (`websocket-stress.e2e-spec.ts`)
- **Concurrent Connections**: Up to 50 simultaneous clients
- **High Volume Broadcasting**: Message delivery to multiple clients
- **Memory Management**: Resource cleanup, memory leak prevention
- **Performance Benchmarks**: Latency testing, throughput measurements
- **Error Recovery**: Network simulation, reconnection scenarios

### 3. Integration Tests (`websocket-integration.e2e-spec.ts`)
- **End-to-end Workflows**: Complete user scenarios
- **Mixed Authentication**: Authenticated and unauthenticated clients
- **Dynamic Client Management**: Clients joining/leaving during operations
- **Real-world Patterns**: Dashboard sessions, frontend simulation

## Test Utilities

### WebSocketTestHelper
A comprehensive utility class providing:
- **Client Management**: Create, configure, and manage multiple WebSocket clients
- **Connection Handling**: Automated connection waiting and validation
- **Event Testing**: Event waiting, validation, and broadcasting tests
- **Performance Measurement**: Latency testing and throughput analysis
- **Network Simulation**: Latency and packet loss simulation

### WebSocketTestDataFactory
Factory class for creating test data:
- **Project Data**: Test projects for WebSocket scenarios
- **Agent Data**: Test agents with proper configuration
- **Task Data**: Test tasks for real-time updates
- **User Data**: Test users with unique identifiers

### WebSocketAssertions
Specialized assertion utilities:
- **Event Assertions**: Validate event reception and data
- **Performance Assertions**: Latency and throughput validation
- **Connection Assertions**: Connection state verification
- **Broadcast Assertions**: Multi-client event validation

## Test Scenarios Covered

### 🔌 Connection Management
- ✅ Authenticated client connections
- ✅ Unauthenticated client handling
- ✅ Connection error recovery
- ✅ Graceful disconnection
- ✅ Rapid connect/disconnect cycles

### 🏠 Room Management
- ✅ Project room joining/leaving
- ✅ Multiple room membership
- ✅ Invalid room ID handling
- ✅ Rapid room switching
- ✅ Room isolation validation

### 📡 Real-time Broadcasting
- ✅ Task status update broadcasts
- ✅ Agent log streaming
- ✅ Multi-client message delivery
- ✅ Room-specific broadcasting
- ✅ Sequential update handling

### ⚡ Performance Testing
- ✅ 50+ concurrent connections
- ✅ High-frequency event handling
- ✅ Low-latency communication (< 50ms average)
- ✅ Memory leak prevention
- ✅ Resource cleanup validation

### 🛡️ Error Handling
- ✅ Malformed message payloads
- ✅ Network condition simulation
- ✅ Client disconnection during broadcasts
- ✅ Large payload handling
- ✅ Invalid authentication handling

### 🏭 Production Scenarios
- ✅ Long-running dashboard sessions
- ✅ Frontend application patterns
- ✅ Mixed client types
- ✅ Dynamic client management
- ✅ Real-world usage simulation

## Running WebSocket Tests

### Individual Test Suites
```bash
# Core WebSocket functionality
npm run test:e2e -- websocket.e2e-spec.ts

# Stress and performance tests
npm run test:e2e -- websocket-stress.e2e-spec.ts

# Integration and workflow tests
npm run test:e2e -- websocket-integration.e2e-spec.ts
```

### All WebSocket Tests
```bash
# Run all WebSocket-related tests
npm run test:e2e -- --testNamePattern="WebSocket|EventsGateway"
```

### Debug Mode
```bash
# Run with detailed logging
DEBUG=* npm run test:e2e -- websocket.e2e-spec.ts
```

## Performance Benchmarks

### Expected Performance Metrics
- **Connection Time**: < 1000ms for 20 concurrent connections
- **Average Latency**: < 50ms for real-time events
- **Maximum Latency**: < 200ms for individual messages
- **Throughput**: > 100 events per second per client
- **Memory Usage**: Stable under extended load

### Load Testing Results
The stress tests validate:
- **50 concurrent connections** without degradation
- **Broadcast delivery** to 20+ clients simultaneously
- **Memory stability** during extended sessions
- **Error recovery** from network issues

## Integration with CI/CD

### Automated Testing
The WebSocket tests are designed for:
- **CI/CD Integration**: Fast execution for continuous testing
- **Parallel Execution**: Multiple test suites can run concurrently
- **Resource Cleanup**: Automatic cleanup prevents test interference
- **Timeout Management**: Reasonable timeouts prevent hanging tests

### Test Environment
Tests require:
- **PostgreSQL Database**: Test database configuration
- **Dynamic Ports**: Automatic port assignment prevents conflicts
- **JWT Authentication**: Valid test tokens for authenticated scenarios
- **Socket.IO Client**: Client library for WebSocket communication

## Troubleshooting

### Common Issues

#### Port Conflicts
```typescript
// Tests use dynamic port assignment
await app.listen(0); // Let system assign available port
const port = server.address().port;
```

#### Connection Timeouts
```typescript
// Increase timeout for slower environments
const timeout = process.env.CI ? 10000 : 5000;
await helper.waitForConnection(client, timeout);
```

#### Memory Leaks
```typescript
// Always cleanup in test lifecycle
afterEach(() => {
  helper.cleanup(); // Disconnect all clients
});
```

#### Database State
```typescript
// Use transaction rollback for test isolation
beforeEach(async () => {
  await dataSource.query('BEGIN');
});

afterEach(async () => {
  await dataSource.query('ROLLBACK');
});
```

### Debug Utilities

#### Connection Diagnostics
```typescript
const stats = helper.getConnectionStats();
console.log(`Connected: ${stats.connectedClients}/${stats.totalClients}`);
```

#### Event Monitoring
```typescript
client.onAny((event, data) => {
  console.log(`Event: ${event}`, data);
});
```

#### Performance Monitoring
```typescript
const latency = await helper.measureLatency(client, 10);
console.log(`Avg: ${latency.average}ms, Max: ${latency.max}ms`);
```

## Best Practices

### Test Organization
- **Group related tests** in describe blocks
- **Use descriptive test names** that explain the scenario
- **Separate unit and integration concerns**
- **Implement proper cleanup** in lifecycle hooks

### Performance Testing
- **Set realistic expectations** based on environment
- **Use statistical validation** for performance metrics
- **Test under various load conditions**
- **Monitor resource usage** during tests

### Error Testing
- **Test both expected and unexpected errors**
- **Validate error recovery mechanisms**
- **Ensure graceful degradation**
- **Test edge cases and boundary conditions**

## Future Enhancements

### Potential Improvements
- **Load Balancer Testing**: Multi-server WebSocket scenarios
- **Authentication Variants**: Different auth strategies testing
- **Message Queuing**: Event persistence and replay testing
- **Monitoring Integration**: Metrics collection during tests
- **Cross-browser Testing**: Client compatibility validation

### Advanced Scenarios
- **Horizontal Scaling**: Multiple server instance testing
- **Network Partitioning**: Distributed system resilience
- **Message Ordering**: Event sequence validation
- **Security Testing**: Unauthorized access attempts
- **Protocol Upgrades**: WebSocket version compatibility

The WebSocket integration tests provide comprehensive coverage of real-time communication functionality, ensuring the Prometheus Backend delivers reliable, performant, and scalable WebSocket capabilities for frontend applications.