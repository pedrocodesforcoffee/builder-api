# Builder API - Endpoint Documentation

Welcome to the Builder API documentation. This document provides an overview of all available API endpoints.

## Base URL

```
http://localhost:3000/api
```

**Production**: `https://api.bobthebuilder.com/api` (when deployed)

---

## API Versioning

Currently, the API does not use versioning. All endpoints are accessible under the `/api` prefix.

---

## Available Endpoints

### Authentication Endpoints

Authentication and user management endpoints.

| Endpoint | Method | Description | Documentation |
|----------|--------|-------------|---------------|
| `/api/auth/register` | POST | Register a new user account | [Registration Docs](./auth/registration.md) |
| `/api/auth/login` | POST | User login with email/password | [Login Docs](./auth/login.md) |
| `/api/auth/logout` | POST | User logout (revoke all tokens) | [Logout Docs](./auth/logout.md) |
| `/api/auth/refresh` | POST | Refresh access token (with rotation) | [Refresh Docs](./auth/refresh.md) |
| `/api/auth/forgot-password` | POST | Initiate password reset | Coming soon |

### Health Check Endpoints

System health and monitoring endpoints.

| Endpoint | Method | Description | Documentation |
|----------|--------|-------------|---------------|
| `/api/health` | GET | Comprehensive health check | [Health Docs](./health-endpoints.md) |
| `/api/health/liveness` | GET | Liveness probe (Kubernetes) | [Health Docs](./health-endpoints.md) |
| `/api/health/readiness` | GET | Readiness probe (Kubernetes) | [Health Docs](./health-endpoints.md) |

### Membership Endpoints

Organization and project membership management.

| Endpoint | Method | Description | Documentation |
|----------|--------|-------------|---------------|
| `/api/organizations/:orgId/members` | GET, POST | Manage organization members | [Membership Docs](./MEMBERSHIP_ENDPOINTS.md) |
| `/api/organizations/:orgId/members/:userId` | PATCH, DELETE | Update/remove org member | [Membership Docs](./MEMBERSHIP_ENDPOINTS.md) |
| `/api/projects/:projectId/members` | GET, POST | Manage project members | [Membership Docs](./MEMBERSHIP_ENDPOINTS.md) |
| `/api/projects/:projectId/members/:userId` | PATCH, DELETE | Update/remove project member | [Membership Docs](./MEMBERSHIP_ENDPOINTS.md) |

### Cascade Operations Endpoints

Deletion and restoration operations with cascading effects.

| Endpoint | Method | Description | Documentation |
|----------|--------|-------------|---------------|
| `/api/users/:userId` | DELETE | Delete user with cascade | [Cascade Docs](../CASCADE_OPERATIONS.md) |
| `/api/users/:userId/restore` | POST | Restore soft-deleted user | [Cascade Docs](../CASCADE_OPERATIONS.md) |
| `/api/users/:userId/deletion-impact` | GET | Preview deletion impact | [Cascade Docs](../CASCADE_OPERATIONS.md) |
| `/api/users/:userId/validate-deletion` | GET | Validate deletion eligibility | [Cascade Docs](../CASCADE_OPERATIONS.md) |
| `/api/organizations/:orgId` | DELETE | Delete organization with cascade | [Cascade Docs](../CASCADE_OPERATIONS.md) |
| `/api/organizations/:orgId/restore` | POST | Restore soft-deleted organization | [Cascade Docs](../CASCADE_OPERATIONS.md) |
| `/api/organizations/:orgId/deletion-impact` | GET | Preview deletion impact | [Cascade Docs](../CASCADE_OPERATIONS.md) |
| `/api/projects/:projectId` | DELETE | Delete project with cascade | [Cascade Docs](../CASCADE_OPERATIONS.md) |
| `/api/projects/:projectId/restore` | POST | Restore soft-deleted project | [Cascade Docs](../CASCADE_OPERATIONS.md) |
| `/api/projects/:projectId/deletion-impact` | GET | Preview deletion impact | [Cascade Docs](../CASCADE_OPERATIONS.md) |
| `/api/projects/:projectId/validate-deletion` | GET | Validate deletion eligibility | [Cascade Docs](../CASCADE_OPERATIONS.md) |

### General Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api` | GET | API information and version |

---

## Authentication

Most endpoints (excluding registration, login, and health checks) require authentication via JWT tokens.

### Authentication Header Format

```http
Authorization: Bearer <your-jwt-token>
```

### Obtaining a Token

1. Register a new account: `POST /api/auth/register`
2. Login with credentials: `POST /api/auth/login` (coming soon)
3. Use the returned JWT token in the Authorization header

---

## Common Response Formats

### Success Response

```json
{
  "data": { ... },
  "message": "Success message (optional)"
}
```

### Error Response

```json
{
  "statusCode": 400,
  "message": "Error description or array of validation errors",
  "error": "Error type (e.g., Bad Request, Unauthorized)"
}
```

---

## HTTP Status Codes

The API uses standard HTTP status codes:

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data or validation error |
| 401 | Unauthorized | Authentication required or failed |
| 403 | Forbidden | Authenticated but insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict (e.g., duplicate email) |
| 500 | Internal Server Error | Server error occurred |

---

## Rate Limiting

To protect the API from abuse, rate limiting is implemented on certain endpoints:

| Endpoint | Limit | Window | Action on Exceed |
|----------|-------|--------|------------------|
| `/api/auth/login` | 5 failed attempts | 15 minutes | Block all login attempts from IP |
| `/api/auth/refresh` | 10 requests | 1 minute | Return 429 Too Many Requests |
| General API | No limit | - | Coming soon |
| Health checks | Unlimited | - | Never limited |

### Failed Login Attempts

After 5 failed login attempts from the same IP address within 15 minutes:
- All login attempts from that IP are blocked for 15 minutes
- Error message: "Too many failed login attempts. Please try again in 15 minutes."
- Successful login resets the counter

### Token Refresh Rate Limiting

The refresh endpoint allows 10 requests per minute per IP address:
- Error message: "Too many refresh requests. Please try again later."
- Helps prevent token enumeration attacks

---

## Request/Response Format

All requests and responses use JSON format unless otherwise specified.

### Request Headers

```http
Content-Type: application/json
Authorization: Bearer <token> (for protected endpoints)
```

### Response Headers

```http
Content-Type: application/json
X-Request-Id: <unique-request-id>
```

---

## Pagination

For endpoints that return lists, pagination is supported using query parameters:

```http
GET /api/resource?page=1&limit=20&sort=createdAt&order=desc
```

**Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sort`: Sort field (default: createdAt)
- `order`: Sort order (asc or desc, default: desc)

**Response Format:**
```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## Error Handling

### Validation Errors (400)

```json
{
  "statusCode": 400,
  "message": [
    "email must be a valid email",
    "password must be at least 8 characters"
  ],
  "error": "Bad Request"
}
```

### Authentication Errors (401)

```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

### Not Found Errors (404)

```json
{
  "statusCode": 404,
  "message": "Resource not found",
  "error": "Not Found"
}
```

### Server Errors (500)

```json
{
  "statusCode": 500,
  "message": "An unexpected error occurred",
  "error": "Internal Server Error"
}
```

---

## CORS

CORS is enabled for the following origins:

- `http://localhost:3000` (Development)
- `http://localhost:3001` (Development)
- Production domains (to be configured)

---

## API Changelog

### Version 0.3.0 (2025-01-15)

**Added:**
- Cascade operations system for safe deletion/restoration
- User deletion with cascading to all memberships
- Organization deletion with cascading to all projects
- Project deletion with cascading to all members and resources
- Soft delete support with recovery option
- Deletion impact preview endpoints
- Deletion validation with sole owner protection
- Permission cache invalidation on cascade operations
- Comprehensive cascade documentation

**Endpoints:**
- 11 cascade operation endpoints (delete, restore, validate, impact)
- Transaction-safe deletion operations
- RESTful cascade API design

**Safety:**
- Sole owner protection (prevents orphaned organizations)
- Impact preview before deletion
- Validation endpoints to check blockers
- Soft delete default (allows recovery)
- Transaction-based atomicity
- Referential integrity preservation

### Version 0.2.0 (2025-11-08)

**Added:**
- User login endpoint with JWT authentication
- Token refresh endpoint with automatic token rotation
- User logout endpoint (revokes all sessions)
- JWT-based authentication with Passport.js
- Multi-level RBAC (System, Organization, Project roles)
- JWT permissions (organizations and projects in token payload)
- Token refresh with rotation and breach detection
- Grace period handling for network reliability
- Rate limiting on refresh endpoint (10 req/min)
- Failed login attempt tracking and IP blocking
- Comprehensive test coverage (22 tests)
- Membership management endpoints
- Role inheritance system
- Scope-based access control
- Permission expiration support
- Permission guards

**Security:**
- JWT access tokens (15-minute expiration)
- Refresh tokens with rotation (7-day expiration)
- Token family tracking for breach detection
- Token reuse detection with automatic revocation
- Rate limiting on authentication endpoints
- Failed login attempt tracking (5 attempts per 15 min)
- IP address and user agent tracking
- Audit logging for all authentication events

### Version 0.1.0 (2024-12-08)

**Added:**
- User registration endpoint
- Health check endpoints
- Database connectivity
- Structured logging with Pino
- Comprehensive error handling

**Security:**
- Bcrypt password hashing (12 rounds)
- Input validation with class-validator
- SQL injection prevention
- XSS protection

---

## Testing the API

### Using cURL

```bash
# Health check
curl http://localhost:3000/api/health

# Register a user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123@",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Using Postman

1. Import the API collection (coming soon)
2. Set the base URL to `http://localhost:3000/api`
3. Use the provided examples

### Using JavaScript/TypeScript

```typescript
const API_BASE_URL = 'http://localhost:3000/api';

async function registerUser(userData) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });

  return await response.json();
}
```

---

## Support & Resources

- **GitHub Repository**: https://github.com/bobthebuilder/builder-api
- **Issue Tracker**: https://github.com/bobthebuilder/builder-api/issues
- **Documentation**: Full documentation in `/docs` directory
- **Changelog**: See [CHANGELOG.md](../CHANGELOG.md)

---

## Development

### Running Locally

```bash
# Install dependencies
npm install

# Run migrations
npm run migration:run

# Start development server
npm run start:dev

# Run tests
npm run test
```

### Environment Variables

See [.env.example](../../.env.example) for required environment variables.

---

## License

MIT License - See [LICENSE](../../LICENSE) for details.
