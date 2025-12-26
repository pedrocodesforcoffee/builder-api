# Testing Guide

## Testing Strategy

### Test Types

#### Unit Tests (`tests/unit/`)
- Test individual functions, methods, and classes in isolation
- Mock external dependencies (database, APIs, services)
- Fast execution (milliseconds)
- High code coverage target: 80%+

**Example:**
```javascript
// tests/unit/services/userService.test.js
const UserService = require('../../src/services/userService');

describe('UserService', () => {
  it('should create a new user', async () => {
    const userData = { name: 'John', email: 'john@example.com' };
    const result = await UserService.createUser(userData);
    expect(result).toHaveProperty('id');
  });
});
```

#### Integration Tests (`tests/integration/`)
- Test API endpoints end-to-end
- Use test database (separate from development)
- Verify request/response flows
- Test middleware, validation, and error handling

**Example:**
```javascript
// tests/integration/projects.test.js
const request = require('supertest');
const app = require('../../src/app');

describe('POST /api/projects', () => {
  it('should create a new project', async () => {
    const response = await request(app)
      .post('/api/projects')
      .send({ name: 'Construction Site A' })
      .expect(201);

    expect(response.body).toHaveProperty('id');
  });
});
```

#### Fixtures (`tests/fixtures/`)
- Sample data for testing
- Reusable test data sets
- Database seed data for integration tests

## Test User Accounts

The following test user accounts exist in the development database for manual testing and integration tests:

| Email | Password | First Name | Last Name | Purpose | Source |
|-------|----------|------------|-----------|---------|--------|
| `john.doe@example.com` | `SecurePass123@` | John | Doe | Registration API documentation examples | [docs/api/auth/registration.md](../docs/api/auth/registration.md) |
| `test-refresh@example.com` | `TestPassword123@` | Test | User | E2E testing of refresh token functionality | [test/auth-refresh.e2e-spec.ts](../test/auth-refresh.e2e-spec.ts) |
| `logout-test@example.com` | `SecurePass123@` | Logout | Test | Testing logout across multiple devices/sessions | [docs/api/auth/logout.md](../docs/api/auth/logout.md) |
| `multilevel@test.com` | *(Unknown)* | Multi | Level | Testing multi-level permission system | Manual testing |

### Using Test Accounts

**Login via API:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePass123@"
  }'
```

**Login via psql (check user details):**
```bash
psql -h localhost -U postgres -d builder_api_dev \
  -c "SELECT id, email, first_name, last_name, system_role FROM users WHERE email = 'john.doe@example.com';"
```

### Notes

- These accounts persist across test runs (except for E2E tests that clean up `%e2e-test%` emails)
- E2E tests create and clean up temporary users with emails matching `%e2e-test%` pattern
- Test accounts have the default `user` role (system-level)
- Rate limiting applies: 6 failed login attempts within 15 minutes will lock the account temporarily

### Creating New Test Users

To create a new test user for development:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newtest@example.com",
    "password": "TestPassword123@",
    "firstName": "Test",
    "lastName": "User"
  }'
```

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

Coverage report will be generated in `coverage/` directory.

## Writing New Tests

### Best Practices

1. **Descriptive test names**: Use clear, descriptive names that explain what is being tested
   ```javascript
   // Good
   it('should return 404 when project does not exist', ...)

   // Bad
   it('test project', ...)
   ```

2. **Arrange-Act-Assert pattern**:
   ```javascript
   it('should calculate project cost', () => {
     // Arrange
     const materials = [{ cost: 100 }, { cost: 200 }];

     // Act
     const total = calculateTotalCost(materials);

     // Assert
     expect(total).toBe(300);
   });
   ```

3. **One assertion per test**: Focus each test on a single behavior

4. **Mock external dependencies**: Don't make real API calls or database queries in unit tests

5. **Clean up after tests**: Reset mocks, clear test data
   ```javascript
   afterEach(() => {
     jest.clearAllMocks();
   });
   ```

### Test Structure

```javascript
describe('Feature or Component', () => {
  describe('method or endpoint', () => {
    beforeEach(() => {
      // Setup before each test
    });

    afterEach(() => {
      // Cleanup after each test
    });

    it('should handle success case', () => {
      // Test implementation
    });

    it('should handle error case', () => {
      // Test implementation
    });
  });
});
```

## Test Configuration

### Jest Configuration (jest.config.js)
```javascript
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/'],
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

## Continuous Integration

Tests run automatically on:
- Every push to feature branches
- Pull request creation
- Merge to main branch

All tests must pass before merging.

## Debugging Tests

### Run specific test file
```bash
npm test -- tests/unit/services/userService.test.js
```

### Run tests matching pattern
```bash
npm test -- --testNamePattern="should create user"
```

### Debug mode
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

Then open `chrome://inspect` in Chrome to debug.

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
