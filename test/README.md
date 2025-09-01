# Testing Strategy for Prometheus Backend

This document outlines the comprehensive testing strategy for the Prometheus Backend NestJS application.

## Test Structure

```
test/
├── unit/                    # Unit tests for isolated component testing
│   ├── auth/               # Authentication service tests
│   ├── projects/           # Projects service tests
│   ├── agents/             # Agents service tests
│   ├── tasks/              # Tasks service tests
│   ├── knowledge/          # Knowledge service tests
│   └── orchestrator/       # Orchestrator service tests
├── integration/            # Integration tests for module interactions
├── fixtures/               # Test data and fixtures
├── *.e2e-spec.ts          # End-to-end tests
├── test-utils.ts          # Common test utilities
├── test-database.config.ts # Database configuration for tests
└── setup-*.ts             # Test setup files
```

## Test Types

### 1. Unit Tests (`npm run test:unit`)
- **Purpose**: Test individual services and components in isolation
- **Location**: `test/unit/**/*.spec.ts`
- **Configuration**: `test/jest-unit.json`
- **Dependencies**: Mock all external dependencies (databases, APIs, etc.)
- **Speed**: Fast (< 1s per test)
- **Coverage**: Focuses on business logic and edge cases

### 2. Integration Tests (`npm run test:integration`)
- **Purpose**: Test interactions between modules and services
- **Location**: `test/integration/**/*.spec.ts`
- **Configuration**: `test/jest-integration.json`
- **Dependencies**: Real database connections, mocked external APIs
- **Speed**: Medium (1-5s per test)
- **Coverage**: Module interactions, database operations

### 3. End-to-End Tests (`npm run test:e2e`)
- **Purpose**: Test complete user workflows through HTTP APIs
- **Location**: `test/*.e2e-spec.ts`
- **Configuration**: `test/jest-e2e.json`
- **Dependencies**: Full application stack with test database
- **Speed**: Slow (5-30s per test)
- **Coverage**: User journeys, API contracts, authentication flows

## Available Test Scripts

```bash
# Run all unit tests
npm run test:unit

# Run unit tests in watch mode
npm run test:unit:watch

# Run unit tests with coverage
npm run test:unit:cov

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run E2E tests in watch mode
npm run test:e2e:watch

# Run all test types sequentially
npm run test:all

# Run tests for CI (with coverage)
npm run test:ci
```

## Database Configuration

### Production vs Test Database

⚠️ **CRITICAL**: The application uses **PostgreSQL** in production but tests were previously using **MongoDB Memory Server**. This has been fixed.

#### Current Test Database Setup:
- **Unit Tests**: SQLite in-memory database (fast, isolated)
- **Integration/E2E Tests**: PostgreSQL test database (matches production)

#### Test Database Configuration:
```typescript
// test/test-database.config.ts
export const testDatabaseConfig = {
  type: 'postgres',
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT) || 5433,
  username: process.env.TEST_DB_USER || 'test_user',
  password: process.env.TEST_DB_PASSWORD || 'test_password',
  database: process.env.TEST_DB_NAME || 'prometheus_test',
  // ... other config
};
```

## Test Coverage

### Unit Tests Coverage:
- ✅ **AuthService**: Complete CRUD operations, authentication logic
- ✅ **ProjectsService**: Project management, ownership validation
- ✅ **AgentsService**: Agent CRUD, rating system, leaderboard
- ✅ **TasksService**: Task management, assignment validation
- ✅ **KnowledgeService**: Knowledge CRUD, search, rating system
- ⏳ **OrchestrationService**: Docker integration, task execution
- ⏳ **Controller Classes**: HTTP request/response handling

### E2E Tests Coverage:
- ✅ **Authentication**: Signup, login, JWT validation
- ✅ **Projects**: CRUD operations, ownership security
- ✅ **Agents**: CRUD operations, validation
- ✅ **Tasks**: CRUD operations, assignment workflows
- ✅ **Knowledge**: CRUD, search, rating, pagination
- ✅ **Project Team Management**: Invite/remove agents, team workflows
- ✅ **WebSocket**: Real-time communication, room management
- ⏳ **Orchestrator**: Task execution, Docker integration

## Test Utilities

### MockDataFactory
Creates realistic test data for entities:
```typescript
import { MockDataFactory } from './test-utils';

const user = MockDataFactory.createUser();
const project = MockDataFactory.createProject({ user });
const agent = MockDataFactory.createAgent({ user });
```

### TestUtils
Provides common testing utilities:
```typescript
import { TestUtils } from './test-utils';

// Create mock repositories
const mockRepo = TestUtils.createMockRepository<User>();

// Create test modules
const module = await TestUtils.createTestModule([AuthModule]);
```

### Test Constants
```typescript
import { TEST_CONSTANTS } from './test-utils';

const validEmail = TEST_CONSTANTS.VALID_EMAIL;
const jwtSecret = TEST_CONSTANTS.TEST_JWT_SECRET;
```

## Security Testing

### Cross-User Security Tests
- ✅ Users cannot access other users' resources
- ✅ JWT token validation on all protected endpoints
- ✅ Input validation and sanitization
- ✅ SQL injection prevention (through TypeORM)

### Authentication & Authorization
- ✅ Signup/login with validation
- ✅ JWT token generation and verification
- ✅ Protected route access control
- ✅ Password hashing with bcrypt

## WebSocket Testing

### Real-time Communication Tests
- ✅ Connection management with JWT authentication
- ✅ Room-based message broadcasting
- ✅ Task status update notifications
- ✅ Agent log streaming
- ✅ Multiple client handling
- ✅ Error handling and edge cases

## Known Issues and Technical Debt

### Fixed Issues ✅
- **Database Mismatch**: Fixed MongoDB Memory Server → PostgreSQL
- **Missing Module Tests**: Added Knowledge, Project Team, WebSocket tests
- **Security Gaps**: Added cross-user security validation

### Remaining Technical Debt ⏳
- **Orchestrator Tests**: Complex Docker integration testing
- **Performance Tests**: Load testing for WebSocket and API endpoints
- **Error Logging Tests**: Comprehensive error handling validation
- **API Key Security**: Testing encrypted storage of LLM API keys

## Running Tests in Development

### Prerequisites
1. **PostgreSQL Test Database**: Ensure test database is running
   ```bash
   # Docker command for test database
   docker run --name postgres-test -e POSTGRES_PASSWORD=test_password -e POSTGRES_USER=test_user -e POSTGRES_DB=prometheus_test -p 5433:5432 -d postgres:13
   ```

2. **Environment Variables**: Set test environment variables
   ```bash
   export TEST_DB_HOST=localhost
   export TEST_DB_PORT=5433
   export TEST_DB_USER=test_user
   export TEST_DB_PASSWORD=test_password
   export TEST_DB_NAME=prometheus_test
   ```

### Running Tests
```bash
# Quick unit tests during development
npm run test:unit:watch

# Full test suite before commit
npm run test:all

# Generate coverage report
npm run test:unit:cov
```

## Continuous Integration

### CI Test Pipeline
```bash
# Recommended CI pipeline
npm run test:ci
```

This runs:
1. Unit tests with coverage
2. Integration tests
3. E2E tests
4. Generates coverage reports

### Coverage Thresholds
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

## Best Practices

### Writing Tests
1. **Arrange-Act-Assert**: Structure tests clearly
2. **Descriptive Names**: Test names should describe the scenario
3. **Independent Tests**: Each test should be isolated
4. **Mock External Dependencies**: Use mocks for external services
5. **Test Edge Cases**: Include error scenarios and boundary conditions

### Test Data Management
1. **Use Factories**: MockDataFactory for consistent test data
2. **Clean State**: Reset database/mocks between tests
3. **Realistic Data**: Use data that resembles production
4. **Avoid Hard-coding**: Use constants and generators

### Performance Considerations
1. **Fast Unit Tests**: < 1s per test
2. **Parallel Execution**: Unit tests can run in parallel
3. **Sequential E2E**: Run E2E tests sequentially to avoid conflicts
4. **Resource Cleanup**: Properly close connections and clear data

## Troubleshooting

### Common Issues
1. **Database Connection Failures**: Check PostgreSQL is running on correct port
2. **WebSocket Test Timeouts**: Ensure proper cleanup of socket connections
3. **JWT Token Issues**: Verify JWT_SECRET is set consistently
4. **Port Conflicts**: Tests use dynamic ports to avoid conflicts

### Debug Mode
```bash
# Run tests with debugging
npm run test:debug

# Verbose output
VERBOSE_TESTS=true npm run test:e2e
```

### Test Database Issues
```bash
# Reset test database
docker stop postgres-test && docker rm postgres-test
docker run --name postgres-test -e POSTGRES_PASSWORD=test_password -e POSTGRES_USER=test_user -e POSTGRES_DB=prometheus_test -p 5433:5432 -d postgres:13
```