# Testing Strategy and Guidelines

This document outlines the testing approach, frameworks, and best practices for the Dungeon Lab VTT project.

## Testing Framework Overview

### Primary Testing Tools
- **Vitest**: Unit and integration testing (NOT Jest)
- **Playwright**: End-to-end testing
- **MongoMemoryServer**: Isolated database testing
- **Supertest**: API integration testing

### Testing Philosophy
- **Integration Tests Preferred**: Focus on full-stack integration over unit tests
- **Minimal Mocking**: Avoid mocks when possible, only mock external services
- **Real Database**: Use MongoMemoryServer for realistic database testing

## Server Testing

### Test Structure
- **Location**: Tests in `packages/server/tests/` or alongside source files
- **Framework**: Vitest for all server tests
- **Database**: MongoMemoryServer for isolated test database
- **API Testing**: Supertest for HTTP endpoint testing

### Authentication Testing
- **Helper Methods**: Use functions from `auth-test-helpers.mts`
- **Key Helper**: `requestAs(user)` for authenticated requests
- **Example**:
  ```typescript
  import { requestAs } from '../utils/auth-test-helpers.mjs'
  
  test('should create campaign for authenticated user', async () => {
    const response = await requestAs(adminUser)
      .post('/api/campaigns')
      .send({ name: 'Test Campaign' })
      .expect(201)
  })
  ```

### Test Database Setup
- **Isolation**: Each test gets fresh database instance
- **Cleanup**: Automatic cleanup between tests
- **Realistic Data**: Use real MongoDB for accurate testing

### Running Server Tests
```bash
# Navigate to server package
cd packages/server

# Run all tests
npm test

# Run specific test file
npm test user.test.mts

# Run with watch mode
npm test -- --watch
```

### Integration Test Patterns
```typescript
import { describe, test, expect, beforeEach } from 'vitest'
import { setupTestDatabase, cleanupTestDatabase } from './utils/db-helpers.mjs'
import { createTestUser } from './utils/auth-test-helpers.mjs'
import { request } from 'supertest'
import { app } from '../src/app.mjs'

describe('User API', () => {
  beforeEach(async () => {
    await setupTestDatabase()
  })
  
  test('should create user successfully', async () => {
    const userData = { name: 'Test User', email: 'test@example.com' }
    
    const response = await request(app)
      .post('/api/users')
      .send(userData)
      .expect(201)
    
    expect(response.body.name).toBe(userData.name)
  })
})
```

## Web Client Testing

### Current Status
- **Strategy**: Still being defined
- **No Established Patterns**: Web testing patterns not yet established
- **Future Plans**: Will likely use Vue Test Utils with Vitest

### Planned Approach
- **Component Testing**: Test Vue components in isolation
- **Integration Testing**: Test component interactions
- **E2E Testing**: Use Playwright for full user workflows

## End-to-End Testing

### Playwright Configuration
- **Location**: E2E tests in `playwright/tests/`
- **Framework**: Playwright with TypeScript
- **Browser**: Chromium, Firefox, WebKit support

### Running E2E Tests
```bash
# Run all E2E tests
npm run test:e2e

# Run in UI mode for debugging
npm run test:e2e:ui

# Run specific test
npx playwright test login.spec.ts
```

### E2E Test Patterns
```typescript
import { test, expect } from '@playwright/test'

test('user can create campaign', async ({ page }) => {
  // Login
  await page.goto('http://localhost:5173/login')
  await page.fill('[data-testid="email"]', 'admin@dungeonlab.com')
  await page.fill('[data-testid="password"]', 'password')
  await page.click('[data-testid="login-button"]')
  
  // Navigate to campaigns
  await page.goto('http://localhost:5173/campaigns')
  
  // Create campaign
  await page.click('[data-testid="create-campaign"]')
  await page.fill('[data-testid="campaign-name"]', 'Test Campaign')
  await page.click('[data-testid="save-campaign"]')
  
  // Verify creation
  await expect(page.locator('text=Test Campaign')).toBeVisible()
})
```

## Plugin Testing

### Plugin Test Strategy
- **Build Testing**: `npm run plugins:test` verifies plugin builds
- **Unit Testing**: Test plugin logic in isolation
- **Integration Testing**: Test plugin integration with main app

### Plugin Test Structure
```
packages/plugins/plugin-name/
  ├── tests/
  │   ├── unit/
  │   ├── integration/
  │   └── fixtures/
  └── vitest.config.ts
```

## Database Testing

### MongoDB Testing with MCP
- **Examine Data**: Use MongoDB MCP tools to inspect test data
- **Query Testing**: Test complex database queries
- **Data Validation**: Verify data integrity after operations

### Example Database Testing
```typescript
import { mongodb } from '../utils/mcp-helpers.mjs'

test('should create user with proper indexes', async () => {
  const user = await User.create({ name: 'Test', email: 'test@example.com' })
  
  // Use MongoDB MCP to verify database state
  const collections = await mongodb.listCollections()
  expect(collections).toContain('users')
  
  const userDoc = await mongodb.query('users', { _id: user._id })
  expect(userDoc.name).toBe('Test')
})
```

## WebSocket Testing

### Socket.io Testing
- **Server Testing**: Test socket event handlers
- **Client Testing**: Test socket event emission and handling
- **Integration Testing**: Test full WebSocket workflows

### Example Socket Testing
```typescript
import { io } from 'socket.io-client'
import { createServer } from '../src/server.mjs'

test('should handle encounter join', async () => {
  const server = createServer()
  const clientSocket = io('http://localhost:3001')
  
  return new Promise((resolve) => {
    clientSocket.on('encounter:joined', (data) => {
      expect(data.encounterId).toBe('test-encounter')
      resolve()
    })
    
    clientSocket.emit('encounter:join', { encounterId: 'test-encounter' })
  })
})
```

## Test Data Management

### Test Fixtures
- **Location**: `tests/fixtures/` directories
- **Format**: JSON or TypeScript objects
- **Usage**: Consistent test data across tests

### Test Data Creation
```typescript
// tests/fixtures/users.ts
export const testUsers = {
  admin: {
    name: 'Admin User',
    email: 'admin@dungeonlab.com',
    role: 'admin'
  },
  player: {
    name: 'Player User', 
    email: 'player@dungeonlab.com',
    role: 'player'
  }
}
```

### Database Seeding
```typescript
import { testUsers } from '../fixtures/users.mjs'

beforeEach(async () => {
  await User.create(testUsers.admin)
  await User.create(testUsers.player)
})
```

## Performance Testing

### Load Testing Considerations
- **API Endpoints**: Test high-traffic endpoints
- **WebSocket Connections**: Test concurrent socket connections
- **Database Queries**: Test query performance under load

### Memory Testing
- **Leak Detection**: Monitor for memory leaks in long-running tests
- **Resource Cleanup**: Ensure proper cleanup after tests

## Test Environment Configuration

### Environment Variables
```env
NODE_ENV=test
MONGODB_URI=mongodb://localhost:27017/dungeon-lab-test
SESSION_SECRET=test-secret
```

### Test Configuration
- **Separate Config**: Use separate config for test environment
- **Mock External Services**: Mock third-party APIs in tests
- **Isolated State**: Ensure tests don't affect each other

## Debugging Tests

### Debug Strategies
- **Console Logging**: Use targeted console.log for debugging
- **Test Isolation**: Run single tests to isolate issues
- **Database Inspection**: Use MongoDB MCP to examine database state
- **Browser DevTools**: Use Playwright debug mode for E2E tests

### Common Test Issues
- **Async Operations**: Ensure proper async/await handling
- **Database State**: Clean up database state between tests
- **Timing Issues**: Use proper waits in E2E tests
- **Authentication**: Ensure proper user setup for authenticated tests

## Test Coverage

### Coverage Goals
- **API Endpoints**: Aim for high coverage of API routes
- **Core Business Logic**: Focus coverage on critical business logic
- **Integration Points**: Test package boundaries and integrations

### Coverage Tools
- **Vitest Coverage**: Built-in coverage reporting
- **Playwright Coverage**: E2E test coverage
- **Manual Review**: Regular coverage review and improvement

This testing strategy ensures robust, reliable testing across all aspects of the Dungeon Lab VTT application while maintaining development efficiency.