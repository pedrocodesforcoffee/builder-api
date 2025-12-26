# Contributing to Builder API

Thank you for your interest in contributing to the Builder API project! This document provides guidelines and standards for contributing.

## Code of Conduct

### Our Pledge
We are committed to providing a welcoming and inspiring community for all. Please be respectful and constructive in your interactions.

### Expected Behavior
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior
- Harassment, trolling, or discriminatory comments
- Publishing others' private information without permission
- Other conduct which could reasonably be considered inappropriate

## Development Workflow

### Getting Started

1. **Fork the repository**
```bash
git clone https://github.com/your-username/builder-api.git
cd builder-api
npm install
```

2. **Create a feature branch**
```bash
git checkout -b feature/your-feature-name
```

3. **Make your changes**
   - Write code following our coding standards
   - Add tests for new functionality
   - Update documentation as needed

4. **Run tests**
```bash
npm test
npm run lint
```

5. **Commit your changes**
```bash
git add .
git commit -m "feat: add your feature description"
```

6. **Push to your fork**
```bash
git push origin feature/your-feature-name
```

7. **Open a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Provide a clear description of your changes

## Coding Standards

### JavaScript/Node.js Style Guide

- **Use ES6+ syntax**: Arrow functions, destructuring, async/await
- **Indentation**: 2 spaces (no tabs)
- **Semicolons**: Use semicolons at the end of statements
- **Quotes**: Use single quotes for strings
- **Line length**: Maximum 100 characters
- **Naming conventions**:
  - `camelCase` for variables and functions
  - `PascalCase` for classes and constructors
  - `UPPER_SNAKE_CASE` for constants
  - Descriptive names (avoid single letters except in loops)

### Code Examples

**Good:**
```javascript
const getUserById = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

const MAX_RETRY_ATTEMPTS = 3;
```

**Bad:**
```javascript
function get(id) {
    var u = User.findById(id)
    return u
}

var max = 3
```

### ESLint Configuration

We use ESLint to enforce code quality. Run before committing:

```bash
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues
```

## Testing Requirements

### Test Coverage
- Minimum 70% code coverage for new features (branches, functions, lines, statements)
- All bug fixes must include a regression test
- Tests must pass before PR can be merged

### Test Types

We use Jest with TypeScript for all testing. The testing infrastructure includes three levels:

**Unit Tests** (in `src/**/*.spec.ts`)
- Test individual methods and classes in isolation
- Mock all external dependencies (database, services, etc.)
- Fast execution (no I/O operations)
- Use mocks from `test/mocks/`

**Integration Tests** (in `test/integration/**/*.spec.ts`)
- Test interactions between components with real dependencies
- Use test database (in-memory, test containers, or dedicated test DB)
- Verify data persistence and business logic
- Run sequentially to avoid conflicts

**E2E Tests** (in `test/e2e/**/*.spec.ts`)
- Test complete user flows through the API
- Use full application stack with real HTTP requests
- Require PostgreSQL test database
- Run sequentially to ensure isolation

### Test Infrastructure

#### Test Helpers

Located in `test/helpers/`:
- **test-database.helper.ts**: Database setup with multiple strategies
- **test-app.helper.ts**: NestJS application setup for E2E tests
- **test-utils.helper.ts**: Utility functions for tests

#### Test Fixtures

Located in `test/fixtures/`:
- Use `@faker-js/faker` for generating realistic test data
- Base fixture factory for creating test entities
- Example: `healthCheckFixture.build()` or `healthCheckFixture.create(repository)`

#### Test Mocks

Located in `test/mocks/`:
- **logger.mock.ts**: Mock logger service
- **repository.mock.ts**: Mock TypeORM repositories
- **config.mock.ts**: Mock ConfigService

### Writing Unit Tests

```typescript
// src/modules/user/user.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { createMockRepository } from '@test/mocks/repository.mock';
import { createMockLogger } from '@test/mocks/logger.mock';
import { User } from './user.entity';

describe('UserService', () => {
  let service: UserService;
  let userRepository;
  let logger;

  beforeEach(async () => {
    userRepository = createMockRepository<User>();
    logger = createMockLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: 'UserRepository', useValue: userRepository },
        { provide: LoggingService, useValue: logger },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = { id: '123', name: 'John Doe' };
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById('123');

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: '123' } });
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('999')).rejects.toThrow(NotFoundException);
    });
  });
});
```

### Writing Integration Tests

```typescript
// test/integration/user.spec.ts
import { TestDatabaseHelper, createTestDatabase, DatabaseStrategy } from '@test/helpers/test-database.helper';
import { User } from '@modules/user/user.entity';

describe('User Integration Tests', () => {
  let dbHelper: TestDatabaseHelper;

  beforeAll(async () => {
    dbHelper = createTestDatabase({
      strategy: DatabaseStrategy.IN_MEMORY, // or TEST_CONTAINER or DEDICATED_DB
      entities: [User],
    });
    await dbHelper.initialize();
  });

  afterAll(async () => {
    await dbHelper.destroy();
  });

  afterEach(async () => {
    await dbHelper.cleanup(); // Clear data between tests
  });

  it('should create and retrieve user', async () => {
    const repository = dbHelper.getRepository(User);

    const user = repository.create({ name: 'John Doe', email: 'john@example.com' });
    const saved = await repository.save(user);

    expect(saved.id).toBeDefined();

    const found = await repository.findOne({ where: { id: saved.id } });
    expect(found?.name).toBe('John Doe');
  });
});
```

### Writing E2E Tests

```typescript
// test/e2e/user.spec.ts
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import * as request from 'supertest';

describe('User API (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send({ name: 'John Doe', email: 'john@example.com' })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('John Doe');
    });

    it('should return 400 for invalid data', async () => {
      await request(app.getHttpServer())
        .post('/api/users')
        .send({ name: '' })
        .expect(400);
    });
  });
});
```

### Running Tests

```bash
# Run all tests (unit, integration, e2e)
npm test

# Run specific test types
npm run test:unit              # Unit tests only
npm run test:integration       # Integration tests only
npm run test:e2e              # E2E tests only

# Run all test types sequentially
npm run test:all

# Watch mode for development
npm run test:watch
npm run test:watch:unit

# Coverage reports
npm run test:cov              # All tests with coverage
npm run test:cov:unit         # Unit tests with coverage
npm run test:cov:integration  # Integration tests with coverage

# CI/CD
npm run test:ci               # Optimized for CI environments

# Debug tests
npm run test:debug

# Clear Jest cache
npm run test:clear
```

### Database Test Strategies

Configure via `TEST_DB_STRATEGY` environment variable:

1. **in-memory** (default for unit/integration tests)
   - Uses pg-mem for fast, isolated tests
   - No external dependencies
   - Limitations: Some PostgreSQL features not supported

2. **test-container** (recommended for integration tests)
   - Uses Docker to spin up PostgreSQL container
   - Full PostgreSQL compatibility
   - Requires Docker to be running

3. **dedicated-db** (for E2E tests)
   - Uses dedicated PostgreSQL test database
   - Configure in `.env.test`
   - Create database: `createdb builder_api_test`

Example:
```bash
TEST_DB_STRATEGY=test-container npm run test:integration
```

### Test Fixtures

Use fixtures to create test data:

```typescript
import { userFixture } from '@test/fixtures/user.fixture';
import { fixtures } from '@test/fixtures/base.fixture';

// Build entity (not saved)
const user = userFixture.build({ name: 'Custom Name' });

// Create in database
const savedUser = await userFixture.create(repository, { email: 'test@example.com' });

// Create multiple
const users = await userFixture.createMany(repository, 10);

// Use faker utilities
const email = fixtures.email();
const uuid = fixtures.uuid();
const pastDate = fixtures.pastDate(1); // 1 year ago
```

## API Design Guidelines

### RESTful Conventions

- Use nouns for resource names: `/projects`, `/users`
- Use HTTP methods appropriately:
  - `GET` - Retrieve resources
  - `POST` - Create new resources
  - `PUT` - Update entire resources
  - `PATCH` - Partial updates
  - `DELETE` - Remove resources

### Endpoint Examples

```javascript
// Good
GET    /api/projects              // List all projects
GET    /api/projects/:id          // Get specific project
POST   /api/projects              // Create new project
PUT    /api/projects/:id          // Update project
DELETE /api/projects/:id          // Delete project

// Bad
GET    /api/getProjects
POST   /api/createProject
GET    /api/project/:id/delete
```

### Response Format

```javascript
// Success response
{
  "data": {
    "id": "123",
    "name": "Project Name"
  },
  "meta": {
    "timestamp": "2024-11-06T12:00:00Z"
  }
}

// Error response
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "name",
        "message": "Name is required"
      }
    ]
  }
}

// List response with pagination
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Handling

```javascript
// Use appropriate HTTP status codes
200 - OK
201 - Created
204 - No Content
400 - Bad Request
401 - Unauthorized
403 - Forbidden
404 - Not Found
422 - Unprocessable Entity
500 - Internal Server Error

// Custom error classes
class ValidationError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 422;
    this.details = details;
  }
}
```

## Database Guidelines

### Schema Design

```javascript
// Use migrations for schema changes
exports.up = (knex) => {
  return knex.schema.createTable('projects', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name').notNullable();
    table.text('description');
    table.string('status').notNullable().defaultTo('active');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.index('status');
    table.index('created_at');
  });
};

exports.down = (knex) => {
  return knex.schema.dropTable('projects');
};
```

### Query Optimization

```javascript
// Good: Use indexes
await db.query('SELECT * FROM projects WHERE status = $1', ['active']);

// Good: Limit results
await db.query('SELECT * FROM projects LIMIT 100');

// Good: Use transactions
await db.transaction(async (trx) => {
  await trx('projects').insert(projectData);
  await trx('tasks').insert(tasksData);
});

// Bad: N+1 queries
for (const project of projects) {
  const tasks = await db.query('SELECT * FROM tasks WHERE project_id = $1', [project.id]);
}

// Good: Join or batch query
const projectsWithTasks = await db.query(`
  SELECT p.*, json_agg(t.*) as tasks
  FROM projects p
  LEFT JOIN tasks t ON t.project_id = p.id
  GROUP BY p.id
`);
```

## Security Best Practices

### Input Validation

```javascript
const Joi = require('joi');

const projectSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(500),
  startDate: Joi.date().iso(),
  budget: Joi.number().positive()
});

const validateProject = async (req, res, next) => {
  try {
    await projectSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(422).json({ error: error.details });
  }
};
```

### SQL Injection Prevention

```javascript
// Good: Use parameterized queries
await db.query('SELECT * FROM users WHERE email = $1', [email]);

// Bad: String concatenation
await db.query(`SELECT * FROM users WHERE email = '${email}'`);
```

### Authentication & Authorization

```javascript
// Middleware for authentication
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Middleware for authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
```

## Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates
- `perf`: Performance improvements

### Examples

```
feat(projects): add project creation endpoint

Implement POST /api/projects endpoint with validation and
database persistence. Includes tests and documentation.

Closes #123
```

```
fix(auth): resolve token refresh issue

Token was not refreshing correctly causing users to be logged out.
Now properly refreshes token before expiration.

Fixes #456
```

## Pull Request Process

### Before Submitting

- [ ] Code follows the style guide
- [ ] All tests pass locally
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] No TypeScript/ESLint errors
- [ ] Commit messages follow convention
- [ ] No merge conflicts with main branch

### PR Description Template

```markdown
## Description
Brief description of what this PR does

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe the tests you added or how you tested the changes

## Checklist
- [ ] Tests pass locally
- [ ] Code follows style guide
- [ ] Documentation updated
- [ ] No breaking changes (or documented)

## Related Issues
Closes #123
Related to #456
```

### Review Process

1. **Automated Checks**: CI/CD runs tests and linting
2. **Peer Review**: At least one approval required from maintainers
3. **Testing**: Changes tested in staging environment
4. **Merge**: Squash and merge into main branch

### Review Guidelines for Reviewers

- Check code quality and adherence to standards
- Verify tests are adequate
- Look for potential bugs or edge cases
- Check for security vulnerabilities
- Provide constructive feedback
- Approve only when satisfied with changes

## Documentation

### When to Update Documentation

- Adding new API endpoints
- Changing existing endpoint behavior
- Adding new configuration options
- Modifying database schema
- Updating deployment procedures

### Documentation Locations

- **API Documentation**: `docs/api/`
- **Architecture**: `docs/ARCHITECTURE.md`
- **Runbook**: `docs/RUNBOOK.md`
- **Code Comments**: Inline for complex logic

### API Documentation Example

```javascript
/**
 * Create a new project
 *
 * @route POST /api/projects
 * @param {Object} req.body - Project data
 * @param {string} req.body.name - Project name (required)
 * @param {string} req.body.description - Project description
 * @param {string} req.body.startDate - ISO 8601 date string
 * @returns {Object} Created project
 * @throws {ValidationError} If input is invalid
 * @throws {UnauthorizedError} If user not authenticated
 */
router.post('/projects', authenticate, async (req, res) => {
  // Implementation
});
```

## Performance Considerations

### Async/Await Best Practices

```javascript
// Good: Run independent operations in parallel
const [users, projects] = await Promise.all([
  User.findAll(),
  Project.findAll()
]);

// Bad: Sequential when not needed
const users = await User.findAll();
const projects = await Project.findAll();
```

### Caching

```javascript
// Cache expensive operations
const getCachedProjects = async (userId) => {
  const cacheKey = `projects:${userId}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const projects = await Project.findByUserId(userId);
  await redis.setex(cacheKey, 3600, JSON.stringify(projects));

  return projects;
};
```

### Database Connection Pooling

```javascript
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## Getting Help

- **Questions**: Open a GitHub Discussion
- **Bug Reports**: Create a GitHub Issue with the bug template
- **Feature Requests**: Create a GitHub Issue with the feature template
- **Security Issues**: Email security@bobthebuilder.com (do not create public issue)
- **Slack**: #builder-api channel

## Recognition

Contributors will be recognized in:
- CHANGELOG.md for each release
- Contributors section in README.md
- Annual contributor spotlight

## Additional Resources

- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Express.js Documentation](https://expressjs.com/)
- [PostgreSQL Best Practices](https://wiki.postgresql.org/wiki/Don%27t_Do_This)
- [REST API Design Guide](https://restfulapi.net/)

Thank you for contributing to Builder API!
