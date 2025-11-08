# Builder API - Construction Management Backend Service

RESTful API for Bob the Builder construction management platform. Built with enterprise-grade security, scalability, and comprehensive authentication features.

## Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** NestJS 11.1.8
- **Database:** PostgreSQL 14+
- **ORM:** TypeORM 0.3.27
- **Authentication:** JWT with Passport.js
- **Logging:** Pino (structured logging)
- **Testing:** Jest + Supertest
- **Validation:** class-validator + class-transformer

## Prerequisites

- Node.js 18.0.0 or higher
- npm package manager
- PostgreSQL 14+ (for production setup)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/bobthebuilder/builder-api.git
cd builder-api
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run database migrations:
```bash
npm run migration:run
```

## Development

Start the development server:
```bash
npm run start:dev
```

Run tests:
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Specific test file
npm test -- auth.service.spec.ts
```

Run database migrations:
```bash
# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Generate new migration
npm run migration:generate -- -n MigrationName

# Show migration status
npm run migration:show
```

Build and run production:
```bash
npm run build
npm run start:prod
```

## Documentation

- [API Documentation](./docs/api/) - API endpoints and usage
- [Architecture Overview](./docs/ARCHITECTURE.md) - System design and architecture
- [Contributing Guidelines](./docs/CONTRIBUTING.md) - How to contribute to this project

## Features

### Authentication & Authorization ✅
- **User Registration:** Secure account creation with password validation
- **JWT Authentication:** Token-based authentication with 15-minute access tokens
- **Token Refresh:** Automatic token rotation with breach detection
- **Multi-level RBAC:** System, Organization, and Project-level permissions
- **Session Management:** Global logout with token revocation
- **Rate Limiting:** Protection against brute force attacks
- **Audit Logging:** Comprehensive security event tracking

### Health Monitoring ✅
- **Liveness Probe:** Kubernetes-compatible health check
- **Readiness Probe:** Database connectivity verification
- **Comprehensive Health Check:** Detailed system status

### Security Features ✅
- Bcrypt password hashing (12 rounds)
- JWT token rotation
- Token family tracking
- Token reuse detection
- Failed login attempt tracking
- IP-based rate limiting
- Input validation and sanitization
- SQL injection prevention
- XSS protection

## Project Structure

```
builder-api/
├── src/
│   ├── modules/
│   │   ├── auth/              # Authentication module
│   │   │   ├── guards/        # JWT guards
│   │   │   ├── strategies/    # Passport strategies
│   │   │   ├── dto/           # Data transfer objects
│   │   │   ├── entities/      # Database entities
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── token.service.ts
│   │   │   └── token-refresh.service.ts
│   │   ├── users/             # User management
│   │   ├── organizations/     # Organization management
│   │   ├── projects/          # Project management
│   │   ├── health/            # Health check endpoints
│   │   └── logging/           # Structured logging
│   ├── common/                # Shared utilities
│   ├── database/              # Database configuration
│   └── main.ts                # Application entry point
├── test/                      # E2E tests
├── docs/                      # Documentation
│   ├── api/                   # API documentation
│   │   └── auth/              # Auth endpoint docs
│   ├── schemas/               # Database schemas
│   ├── ARCHITECTURE.md
│   ├── CONTRIBUTING.md
│   └── RUNBOOK.md
└── migrations/                # Database migrations
```

## Contributing

Please read [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
