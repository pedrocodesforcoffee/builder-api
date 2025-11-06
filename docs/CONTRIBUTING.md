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
- Minimum 80% code coverage for new features
- All bug fixes must include a regression test
- Tests must pass before PR can be merged

### Writing Tests

**Unit Tests** (in `tests/unit/`)
- Test individual functions and methods
- Mock external dependencies
- Fast execution

**Integration Tests** (in `tests/integration/`)
- Test API endpoints end-to-end
- Use test database
- Verify data persistence

### Test Example

```javascript
// tests/unit/services/userService.test.js
const UserService = require('../../src/services/userService');

describe('UserService', () => {
  describe('getUserById', () => {
    it('should return user when found', async () => {
      const userId = '123';
      const mockUser = { id: userId, name: 'John Doe' };

      User.findById = jest.fn().mockResolvedValue(mockUser);

      const result = await UserService.getUserById(userId);

      expect(result).toEqual(mockUser);
      expect(User.findById).toHaveBeenCalledWith(userId);
    });

    it('should throw error when user not found', async () => {
      User.findById = jest.fn().mockResolvedValue(null);

      await expect(UserService.getUserById('999'))
        .rejects
        .toThrow('User not found');
    });
  });
});
```

### Running Tests

```bash
npm test                    # Run all tests
npm run test:unit           # Run unit tests only
npm run test:integration    # Run integration tests only
npm run test:coverage       # Generate coverage report
npm run test:watch          # Watch mode for development
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
