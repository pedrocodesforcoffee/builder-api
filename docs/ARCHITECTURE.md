# Architecture Overview

## System Overview

Builder API follows a microservices-based architecture with a focus on scalability, maintainability, and performance.

## Architecture Diagram

```
┌─────────────┐
│   Clients   │
│ (Web/Mobile)│
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│   API Gateway   │
│  (Rate Limit,   │
│   Auth Check)   │
└────────┬────────┘
         │
         ▼
┌──────────────────┐
│   Builder API    │
│    (NestJS)      │
│                  │
│  ┌────────────┐  │
│  │  Modules   │  │
│  └─────┬──────┘  │
│        │         │
│  ┌─────▼──────┐  │
│  │Controllers │  │
│  └─────┬──────┘  │
│        │         │
│  ┌─────▼──────┐  │
│  │ Services   │  │
│  └─────┬──────┘  │
│        │         │
│  ┌─────▼──────┐  │
│  │  Models    │  │
│  └────────────┘  │
└────────┬─────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌─────────┐ ┌──────────┐
│PostgreSQL│ │  Redis   │
│(Primary) │ │ (Cache)  │
└──────────┘ └──────────┘
```

## API Layer

### Technology Stack
- **Framework**: NestJS (TypeScript)
- **Authentication**: JWT (JSON Web Tokens) with Passport
- **Validation**: class-validator and class-transformer
- **Documentation**: OpenAPI/Swagger via @nestjs/swagger
- **Configuration**: @nestjs/config for environment management

### Why NestJS?

NestJS was chosen as the framework for Builder API due to several key advantages:

1. **TypeScript First**: Built with TypeScript from the ground up, providing strong typing, better IDE support, and improved code quality through compile-time error detection.

2. **Modular Architecture**: NestJS enforces a modular architecture that scales well with application growth. Modules encapsulate related functionality, making the codebase easier to navigate and maintain.

3. **Dependency Injection**: Built-in IoC (Inversion of Control) container makes testing easier and promotes loose coupling between components.

4. **Enterprise-Ready**: Provides out-of-the-box support for common enterprise patterns including guards, interceptors, pipes, and filters for cross-cutting concerns.

5. **Extensive Ecosystem**: Rich ecosystem with official integrations for databases (TypeORM, Prisma), testing (Jest), validation, caching, and more.

6. **Express Compatible**: Built on top of Express (with option for Fastify), leveraging a mature and well-tested HTTP server while adding structure and conventions.

7. **Consistent Patterns**: Decorator-based programming model inspired by Angular provides consistency and reduces boilerplate code.

### Module Structure

The application follows a modular structure with clear separation of concerns:

```
src/
├── app.module.ts           # Root module that orchestrates all feature modules
├── app.controller.ts       # Root controller for health checks and app info
├── app.service.ts          # Root service for application-level operations
├── main.ts                 # Application entry point with bootstrap logic
├── common/                 # Shared utilities and cross-cutting concerns
│   ├── filters/            # Exception filters for error handling
│   ├── interceptors/       # Interceptors for request/response transformation
│   ├── pipes/              # Validation and transformation pipes
│   ├── logging/            # Structured logging with Pino
│   └── decorators/         # Custom decorators for metadata
├── config/                 # Configuration management
│   └── configuration.ts    # Environment variable mappings
└── modules/                # Feature modules (organized by domain)
    ├── auth/               # Authentication & authorization
    │   ├── guards/         # JWT auth guards
    │   ├── strategies/     # Passport strategies
    │   └── decorators/     # Auth decorators (@CurrentUser)
    ├── users/              # User management
    │   ├── entities/       # User entity
    │   └── enums/          # Role enums (System, Org, Project)
    ├── organizations/      # Organization management
    │   └── entities/       # Organization & OrganizationMember entities
    ├── projects/           # Project management
    │   └── entities/       # Project & ProjectMember entities
    ├── memberships/        # Membership operations
    │   ├── controllers/    # Org/Project membership endpoints
    │   └── services/       # Membership management logic
    ├── permissions/        # RBAC permission system
    │   ├── services/       # Permission checking & inheritance
    │   ├── guards/         # Resource-specific guards
    │   └── constants/      # Permission matrices
    ├── cascade/            # Cascade operations (NEW in v0.3.0)
    │   ├── services/       # User/Org/Project cascade services
    │   ├── controllers/    # Cascade API endpoints
    │   ├── dto/            # Deletion/restoration DTOs
    │   └── interfaces/     # Cascade type definitions
    ├── health/             # Health check endpoints
    └── database/           # Database configuration
    └── [feature-name]/     # Generic feature structure
        ├── [feature].module.ts
        ├── [feature].controller.ts
        ├── [feature].service.ts
        ├── dto/            # Data Transfer Objects
        ├── entities/       # Database entities
        └── interfaces/     # TypeScript interfaces
```

### Cascade Module (v0.3.0)

The cascade module provides safe deletion and restoration operations with referential integrity:

**Key Features:**
- Transaction-based deletion for atomicity
- Soft delete support with recovery options
- Sole owner protection (prevents orphaned organizations)
- Impact preview before deletion
- Permission cache invalidation
- Cascading deletion across entity relationships

**Services:**
- `UserCascadeService`: Deletes users from all organizations/projects
- `OrganizationCascadeService`: Deletes organizations and all their projects
- `ProjectCascadeService`: Deletes projects and removes all members

**Endpoints:**
- Delete operations with cascading effects
- Restoration endpoints for soft-deleted entities
- Validation endpoints to check deletion blockers
- Impact preview endpoints to show what will be affected

See [CASCADE_OPERATIONS.md](../docs/CASCADE_OPERATIONS.md) for detailed documentation.

### TypeScript Configuration

The project uses strict TypeScript configuration to ensure type safety:

- **Strict Mode**: Enabled to catch potential bugs at compile time
- **Target**: ES2021 for modern JavaScript features
- **Path Aliases**: Configured for clean imports
  - `@src/*` → `src/*`
  - `@modules/*` → `src/modules/*`
  - `@common/*` → `src/common/*`
  - `@config/*` → `src/config/*`
- **Decorators**: Enabled for NestJS decorator-based programming
- **Source Maps**: Generated for easier debugging

### Development Workflow

#### Local Development
```bash
# Install dependencies
npm install

# Start in development mode with hot-reload
npm run start:dev

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run e2e tests
npm run test:e2e
```

#### Building for Production
```bash
# Build the application
npm run build

# Start production server
npm run start:prod
```

### Key Components

#### Modules
Organize related functionality into cohesive units. Each module can import other modules and export providers for use by other modules.

#### Controllers
Handle HTTP requests and responses, validate input, and delegate to services.

#### Services
Contain business logic, orchestrate data operations, and handle external integrations.

#### Models
Define data structures and database interactions using an ORM (Sequelize or Prisma).

#### Middleware
- Authentication and authorization
- Request logging
- Error handling
- Rate limiting

## Data Layer

### Primary Database: PostgreSQL
- **Purpose**: Persistent data storage
- **Schema**: Normalized relational schema
- **Migrations**: Managed via migration tool (e.g., Knex, Sequelize)

### Caching: Redis
- **Purpose**: Session storage, caching frequently accessed data
- **Strategy**: Cache-aside pattern
- **TTL**: Configured per data type

## External Integrations

### Planned Integrations
- **Payment Gateway**: Stripe or similar (for invoicing)
- **SMS Notifications**: Twilio (for alerts)
- **Email Service**: SendGrid or Amazon SES
- **File Storage**: AWS S3 or similar (for document uploads)

## Security

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- API key authentication for service-to-service calls

### Data Protection
- Encryption at rest (database level)
- Encryption in transit (TLS/HTTPS)
- Input validation and sanitization
- SQL injection prevention via ORM

### Rate Limiting
- Per-user rate limits
- Per-endpoint throttling
- DDoS protection via reverse proxy

## Deployment

### Container Strategy
- **Containerization**: Docker
- **Orchestration**: Kubernetes (production) or Docker Compose (development)
- **CI/CD**: GitHub Actions

### Environments
- **Development**: Local Docker containers
- **Staging**: Cloud-hosted (mirrors production)
- **Production**: Auto-scaling cloud deployment

### Monitoring & Logging
- **Application Logging**: Winston or Pino
- **APM**: New Relic or Datadog
- **Error Tracking**: Sentry
- **Metrics**: Prometheus + Grafana

## Scalability Considerations

- Horizontal scaling of API instances
- Database read replicas for read-heavy workloads
- Connection pooling for database efficiency
- Caching strategy to reduce database load
- Async job processing for heavy operations (e.g., report generation)
