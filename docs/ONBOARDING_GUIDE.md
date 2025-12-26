# Builder API - Comprehensive Developer Onboarding Guide

**Version:** 0.1.0
**Last Updated:** December 2024
**Audience:** New developers joining the Builder API project

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Tech Stack & Key Dependencies](#2-tech-stack--key-dependencies)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Directory & Module Structure](#4-directory--module-structure)
5. [Controllers](#5-controllers)
6. [Use Cases / Services](#6-use-cases--services)
7. [Domain Models & Data Layer](#7-domain-models--data-layer)
8. [Key Use Cases & Their Components](#8-key-use-cases--their-components)
9. [Patterns, Conventions & Best Practices](#9-patterns-conventions--best-practices)
10. [Testing Strategy](#10-testing-strategy)
11. [How to Add a New Feature](#11-how-to-add-a-new-feature)
12. [Deployment, Environments & Configuration](#12-deployment-environments--configuration)
13. [Glossary](#13-glossary)

---

## 1. Introduction

### What is Builder API?

Builder API is a **comprehensive construction management backend service** for the Bob the Builder platform. It provides enterprise-grade RESTful APIs for managing construction projects, financials, documents, and workflows. Think of it as a **ProCore-style construction management system** built from the ground up with modern TypeScript and NestJS.

### Who is this guide for?

This guide is designed for **new developers** joining the project. Whether you're a backend engineer, full-stack developer, or DevOps engineer, this document will help you understand how the system is organized, where to find things, and how to contribute effectively.

### Big Picture Overview

Builder API is organized into **domain-driven modules** following NestJS best practices:

```
Client Request
    ↓
API Gateway (Rate Limiting, Auth Check)
    ↓
NestJS Application
    ↓
Controller (validates input, delegates to service)
    ↓
Service/Use Case (business logic, orchestrates operations)
    ↓
Repository/TypeORM (data persistence)
    ↓
PostgreSQL Database
```

Each module is self-contained with its own controllers, services, entities, DTOs, and tests. The system follows a **clean, layered architecture** with clear separation of concerns.

---

## 2. Tech Stack & Key Dependencies

### Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18.0.0+ | JavaScript runtime |
| **NestJS** | 11.1.8 | Backend framework (TypeScript-first) |
| **TypeScript** | 5.9.3 | Type-safe language |
| **PostgreSQL** | 14+ | Primary database |
| **TypeORM** | 0.3.27 | ORM for database operations |

### Authentication & Security

- **JWT** (JSON Web Tokens) - Access tokens (15 min expiry)
- **bcrypt** - Password hashing (12 rounds)
- **Passport.js** - Authentication middleware
- **@nestjs/throttler** - Rate limiting

### Validation & Transformation

- **class-validator** - DTO validation with decorators
- **class-transformer** - Object transformation and serialization

### Infrastructure & Services

- **AWS S3** - Document storage (with mock mode for local dev)
- **Bull** - Job queues for background processing
- **Elasticsearch** - Full-text search
- **Redis** - Caching and session storage
- **Pino** - Structured logging

### External Integrations

- **QuickBooks Online** - Financial data synchronization
- **ClamAV** - Virus scanning for uploaded documents
- **Tesseract.js** - OCR for document text extraction

### Testing

- **Jest** - Test runner
- **Supertest** - HTTP assertion library
- **@nestjs/testing** - NestJS testing utilities
- **pg-mem** - In-memory PostgreSQL for tests

### Build & Development Tools

- **npm** - Package manager
- **ESLint** - Linting
- **Prettier** - Code formatting
- **ts-node** - TypeScript execution

---

## 3. High-Level Architecture

### Why NestJS?

NestJS was chosen for several compelling reasons:

1. **TypeScript First** - Strong typing, better IDE support, compile-time error detection
2. **Modular Architecture** - Scales well with application growth
3. **Dependency Injection** - Makes testing easier and promotes loose coupling
4. **Enterprise-Ready** - Built-in guards, interceptors, pipes, and filters for cross-cutting concerns
5. **Extensive Ecosystem** - Official integrations for databases, testing, validation, caching, etc.
6. **Express Compatible** - Leverages mature HTTP server with added structure
7. **Consistent Patterns** - Decorator-based programming model reduces boilerplate

### Architectural Layers

Builder API follows a **layered architecture** with clear responsibilities:

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│  Controllers (HTTP handlers, routing)   │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│        Application Layer                │
│  Services/Use Cases (business logic)    │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│          Domain Layer                   │
│  Entities (domain models, business      │
│  rules, computed properties)            │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Data Access Layer                  │
│  Repositories (TypeORM, database        │
│  operations)                            │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         PostgreSQL Database             │
└─────────────────────────────────────────┘
```

### Cross-Cutting Concerns

The following concerns are handled globally via NestJS's powerful middleware system:

- **Authentication** - JWT guards validate tokens on protected routes
- **Authorization** - Role-based access control (RBAC) at system, org, and project levels
- **Validation** - Global validation pipe validates all DTOs
- **Logging** - Pino structured logging with correlation IDs
- **Error Handling** - Global exception filter transforms errors into consistent responses
- **Serialization** - ClassSerializerInterceptor removes sensitive fields (e.g., passwords)
- **Rate Limiting** - Throttle guard prevents abuse

### Request/Response Flow

Here's what happens when a client makes a request:

```
1. HTTP Request arrives (e.g., POST /api/projects)
   ↓
2. Middleware Pipeline
   - correlation-id.middleware.ts: Adds X-Correlation-ID header
   - request-id.middleware.ts: Adds unique request ID
   - Pino logger: Logs incoming request
   ↓
3. Guard Check
   - JwtAuthGuard: Validates JWT token
   - Passport jwt.strategy.ts: Validates token signature, expiry, user exists
   - User object attached to request: req.user
   ↓
4. Validation Pipe
   - Validates request body against DTO
   - Transforms plain object to class instance
   - Strips non-whitelisted properties
   ↓
5. Controller Method
   - Extracts user with @CurrentUser() decorator
   - Extracts params, query, body
   - Delegates to service
   ↓
6. Service/Use Case
   - Executes business logic
   - Validates business rules (e.g., organization exists)
   - Orchestrates database operations
   - Calls repositories
   ↓
7. Repository/TypeORM
   - Queries/writes to PostgreSQL
   - Returns entities
   ↓
8. Service Returns Response DTO
   ↓
9. Interceptors
   - LoggingInterceptor: Logs response with duration
   - ClassSerializerInterceptor: Transforms entity to DTO (removes sensitive fields)
   ↓
10. HTTP Response sent to client (JSON)
```

---

## 4. Directory & Module Structure

### Top-Level Directory Structure

```
builder-api/
├── src/                        # Source code
│   ├── app.module.ts           # Root module (orchestrates all feature modules)
│   ├── app.controller.ts       # Root controller (health checks, app info)
│   ├── app.service.ts          # Root service
│   ├── main.ts                 # Application entry point (bootstrap)
│   │
│   ├── config/                 # Configuration management
│   │   └── configuration.ts    # Environment variable mappings
│   │
│   ├── common/                 # Shared utilities and cross-cutting concerns
│   │   ├── filters/            # Exception filters (error handling)
│   │   ├── interceptors/       # Request/response interceptors
│   │   ├── pipes/              # Custom validation/transformation pipes
│   │   ├── decorators/         # Custom decorators
│   │   ├── logging/            # Structured logging (Pino)
│   │   │   ├── logging.service.ts
│   │   │   ├── logging.interceptor.ts
│   │   │   ├── middleware/     # Request tracking middleware
│   │   │   └── decorators/     # @Log() decorator
│   │   └── services/           # Shared services (S3, etc.)
│   │       └── s3.service.ts   # AWS S3 wrapper (with mock mode)
│   │
│   ├── database/               # Database configuration
│   │   ├── ormconfig.ts        # TypeORM configuration
│   │   └── seeds/              # Database seeding scripts
│   │
│   ├── migrations/             # Database migrations (TypeORM)
│   │
│   ├── utils/                  # General utilities
│   │
│   ├── middleware/             # Custom middleware
│   │
│   ├── workflows/              # Workflow system (submittals, approvals)
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── entities/
│   │   ├── dto/
│   │   └── jobs/               # Background jobs (Bull)
│   │
│   └── modules/                # Feature modules (domain-driven)
│       ├── auth/               # Authentication & authorization
│       ├── users/              # User management
│       ├── organizations/      # Organization management
│       ├── projects/           # Project management
│       ├── financials/         # Financial management (budgets, commitments, etc.)
│       ├── documents/          # Document management system
│       ├── metrics/            # Analytics and KPIs
│       ├── relationships/      # Program/portfolio management
│       ├── search/             # Elasticsearch integration
│       ├── health/             # Health check endpoints
│       ├── integrations/       # External integrations
│       │   └── quickbooks/     # QuickBooks Online integration
│       ├── memberships/        # Membership operations (disabled due to TS errors)
│       ├── permissions/        # RBAC system (disabled due to TS errors)
│       └── cascade/            # Cascade deletion (disabled due to TS errors)
│
├── test/                       # E2E tests
├── docs/                       # Documentation
├── .env.example                # Example environment variables
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── nest-cli.json               # NestJS CLI configuration
└── jest.*.config.js            # Jest test configurations
```

### Module Structure (Generic Pattern)

Each module follows this consistent pattern:

```
src/modules/[module-name]/
├── [module-name].module.ts         # Module definition (imports, providers, exports)
├── controllers/                    # HTTP request handlers
│   └── [resource].controller.ts    # Controller for a specific resource
├── services/                       # Business logic and use cases
│   └── [use-case].service.ts       # Service for a specific use case
├── entities/                       # Database entities (TypeORM)
│   └── [entity].entity.ts          # Domain model
├── dto/                            # Data Transfer Objects (validation)
│   ├── create-[resource].dto.ts    # For POST requests
│   ├── update-[resource].dto.ts    # For PUT/PATCH requests
│   ├── [resource]-response.dto.ts  # For responses
│   └── [resource]-query.dto.ts     # For query parameters
├── enums/                          # Enumerations
│   └── [type].enum.ts              # Enum values
├── interfaces/                     # TypeScript interfaces
│   └── [type].interface.ts         # Contract definitions
├── guards/                         # Route guards (authorization)
│   └── [permission].guard.ts       # Guard for specific permission
├── decorators/                     # Custom decorators
│   └── [decorator].decorator.ts    # Decorator (e.g., @CurrentUser)
├── utils/                          # Module-specific utilities
│   └── [helper].util.ts            # Helper functions
├── jobs/                           # Background jobs (Bull queues)
│   └── [job-name].job.ts           # Job processor
├── processors/                     # Job processors
│   └── [processor-name].processor.ts
└── __tests__/                      # Unit tests
    ├── [service].spec.ts           # Service tests
    └── [controller].spec.ts        # Controller tests
```

### Key Modules Overview

#### **Auth Module** (`src/modules/auth/`)
Handles user authentication and authorization.

- **Controllers:** `auth.controller.ts`
- **Services:** `auth.service.ts`, `token.service.ts`, `token-refresh.service.ts`
- **Entities:** `refresh-token.entity.ts`, `failed-login-attempt.entity.ts`
- **Guards:** `jwt-auth.guard.ts`, `refresh-throttle.guard.ts`
- **Strategies:** `jwt.strategy.ts` (Passport)
- **Key Features:** Registration, login, token refresh, logout, rate limiting, token rotation

#### **Users Module** (`src/modules/users/`)
Manages user entities and profiles.

- **Entities:** `user.entity.ts` (core user model)
- **Enums:** `system-role.enum.ts`, `organization-role.enum.ts`, `project-role.enum.ts`
- **Note:** Users have multi-level roles (system, organization, project)

#### **Organizations Module** (`src/modules/organizations/`)
Multi-tenant organization management.

- **Entities:** `organization.entity.ts`, `organization-member.entity.ts`
- **Key Fields:** name, slug, type, email, phone, address, taxId, settings (JSONB)

#### **Projects Module** (`src/modules/projects/`)
Comprehensive construction project management.

- **Controllers:**
  - `project.controller.ts` - Project CRUD
  - `project-dashboard.controller.ts` - Dashboard metrics
  - `project-member.controller.ts` - Team management
  - `project-phase.controller.ts` - Phase/schedule management
  - `project-milestone.controller.ts` - Milestone tracking
  - `project-folder.controller.ts` - Document folder structure
  - `folder-template.controller.ts` - Reusable folder templates
  - `project-template.controller.ts` - Project templates

- **Entities:**
  - `project.entity.ts` - Core project data (location, construction details, financials, schedule)
  - `project-member.entity.ts` - Team assignments with roles
  - `project-phase.entity.ts`, `project-milestone.entity.ts`, `project-folder.entity.ts`

- **Enums:**
  - `project-type.enum.ts` (COMMERCIAL, RESIDENTIAL, etc.)
  - `delivery-method.enum.ts` (DESIGN_BID_BUILD, DESIGN_BUILD, etc.)
  - `project-status.enum.ts` (BIDDING, CONSTRUCTION, CLOSEOUT, etc.)

#### **Financials Module** (`src/modules/financials/`)
The most complex module - handles all financial operations.

- **Budget Management:**
  - `budget.controller.ts`, `budget.service.ts`, `budget-calculation.service.ts`
  - `budget-import.service.ts` (Excel/CSV import)
  - Entities: `budget.entity.ts`, `budget-line-item.entity.ts`, `cost-code.entity.ts`

- **Commitments (Subcontracts & Purchase Orders):**
  - `commitment.controller.ts`, `commitment.service.ts`
  - Entities: `commitment.entity.ts`, `commitment-item.entity.ts`
  - Statuses: DRAFT → PENDING_APPROVAL → APPROVED → ACTIVE → COMPLETE

- **Payment Applications (Pay Apps):**
  - `payment-application.controller.ts`, `payment-application.service.ts`
  - `payment-application-pdf.service.ts` (AIA G702/G703 style PDFs)
  - Entities: `payment-application.entity.ts`, `schedule-of-values.entity.ts`, `lien-waiver.entity.ts`

- **Change Orders:**
  - `potential-change-order.controller.ts` (PCO management)
  - `change-order-package.controller.ts` (bundled change orders)
  - `change-order-calculation.service.ts`, `change-order-approval.service.ts`

#### **Documents Module** (`src/modules/documents/`)
Document management system with version control.

- **Controllers:**
  - `document.controller.ts`, `document-upload.controller.ts`
  - `version-control.controller.ts` (locking, check in/out)
  - `drawing.controller.ts`, `drawing-set.controller.ts`
  - `specification.controller.ts`, `addendum.controller.ts`
  - `search.controller.ts`, `share-link.controller.ts`

- **Services:**
  - `document-upload.service.ts` (presigned URLs, multipart uploads)
  - `version-control.service.ts` (locking/unlocking)
  - `search.service.ts` (Elasticsearch integration)

- **Processors (Background Jobs):**
  - `virus-scan.processor.ts` (ClamAV)
  - `thumbnail.processor.ts` (image/PDF thumbnails)
  - `metadata.processor.ts` (metadata extraction)
  - `ocr.processor.ts` (Tesseract.js)

- **Upload Flow:** Client → Presigned URL → Quarantine Bucket → Virus Scan → Production Bucket

#### **Integrations/QuickBooks Module** (`src/modules/integrations/quickbooks/`)
Bidirectional sync with QuickBooks Online.

- **Controllers:** auth, connection, customer, vendor, invoice, bill, account, sync operations, webhook
- **Services:** OAuth token management, API client (with rate limiting), entity sync logic
- **Entities:** `qb-connection.entity.ts`, `qb-entity-link.entity.ts`, `qb-sync-history.entity.ts`
- **Processors:** Scheduled sync, token refresh, webhook processing

#### **Metrics Module** (`src/modules/metrics/`)
Project analytics and KPIs.

- **Calculators:**
  - `metric-orchestrator.service.ts` (coordinates all calculators)
  - `budget-calculator.service.ts`, `schedule-calculator.service.ts`
  - `document-calculator.service.ts`, `rfi-calculator.service.ts`
  - `safety-calculator.service.ts`, `quality-calculator.service.ts`

#### **Relationships Module** (`src/modules/relationships/`)
Program/portfolio management with project dependencies.

- **Services:**
  - `project-relationship.service.ts`, `project-program.service.ts`
  - `circular-dependency-validator.service.ts`
  - `portfolio.service.ts`, `portfolio-health.service.ts`

#### **Search Module** (`src/modules/search/`)
Elasticsearch-powered global search.

- **Services:**
  - `project-search.service.ts`, `search-autocomplete.service.ts`
  - `project-export.service.ts` (Excel/CSV export)
  - `faceted-search.service.ts`, `search-cache.service.ts` (Redis)

#### **Health Module** (`src/modules/health/`)
Kubernetes-compatible health checks.

- **Endpoints:**
  - `GET /health` - Overall health
  - `GET /health/db` - Database connectivity
  - `GET /health/redis` - Redis connectivity

---

## 5. Controllers

### What are Controllers?

Controllers in Builder API are **HTTP request handlers**. They:

- Define routes and HTTP methods (`@Get()`, `@Post()`, `@Put()`, `@Patch()`, `@Delete()`)
- Validate input using DTOs
- Extract parameters, query strings, and request bodies
- Delegate business logic to services
- Return response DTOs
- Are stateless (no business logic in controllers)

### How Controllers Fit in the Architecture

```
HTTP Request
    ↓
Controller (validates input, extracts user, delegates to service)
    ↓
Service (business logic)
    ↓
Repository (data access)
    ↓
Database
```

### Controller Catalog

Here are the key controllers in the system:

#### **Auth Controller** (`src/modules/auth/auth.controller.ts`)

**Route Prefix:** `/auth`

**Responsibilities:** User authentication and token management

**Key Endpoints:**

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login with email/password | No |
| POST | `/auth/refresh` | Refresh access token | No (uses refresh token) |
| POST | `/auth/logout` | Revoke all user tokens | Yes |
| GET | `/auth/me` | Get current user profile | Yes |

**Use Cases Called:**
- `auth.service.register()`
- `auth.service.login()`
- `token-refresh.service.refreshTokens()`
- `token.service.revokeAllUserTokens()`

**Security Features:**
- Rate limiting on login (5 attempts per 15 min)
- Rate limiting on refresh (10 requests per minute)
- Token rotation on every refresh
- Failed login tracking

#### **Project Controller** (`src/modules/projects/controllers/project.controller.ts`)

**Route Prefix:** `/api/v1/projects`

**Responsibilities:** Project CRUD operations

**Key Endpoints:**

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/projects` | Create project | Yes |
| GET | `/projects` | List projects | Yes |
| GET | `/projects/:id` | Get project details | Yes |
| PATCH | `/projects/:id` | Update project | Yes |
| DELETE | `/projects/:id` | Delete project | Yes |
| POST | `/projects/:id/archive` | Archive project | Yes |
| POST | `/projects/:id/unarchive` | Unarchive project | Yes |

**Use Cases Called:**
- `project.service.create()`
- `project.service.findAll()`
- `project.service.findOne()`
- `project.service.update()`
- `project.service.delete()`

**Business Rules:**
- Auto-generates project number if not provided: `{ORG-SLUG}-YYYYMMDD-NNN`
- Automatically assigns creator as PROJECT_ADMIN
- Validates organization exists and is active

#### **Budget Controller** (`src/modules/financials/controllers/budget.controller.ts`)

**Route Prefix:** `/api/v1/projects/:projectId/budgets`

**Responsibilities:** Budget management for projects

**Key Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/budgets` | Create budget |
| GET | `/budgets` | List budgets |
| GET | `/budgets/:id` | Get budget details |
| PATCH | `/budgets/:id` | Update budget |
| POST | `/budgets/:id/activate` | Activate budget (only one active per project) |
| POST | `/budgets/:id/lock` | Lock budget (prevents edits) |
| POST | `/budgets/:id/unlock` | Unlock budget |
| POST | `/budgets/:id/clone` | Clone budget |
| POST | `/budgets/:id/import` | Import from Excel/CSV |
| GET | `/budgets/:id/summary` | Get budget summary |
| GET | `/budgets/:id/variance` | Get variance analysis |

**Use Cases Called:**
- `budget.service.create()`, `budget.service.activate()`
- `budget-calculation.service.calculateVariance()`
- `budget-import.service.importFromExcel()`

#### **Document Upload Controller** (`src/modules/documents/controllers/document-upload.controller.ts`)

**Route Prefix:** `/api/v1/documents/upload`

**Responsibilities:** Document upload orchestration

**Key Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/upload/initiate` | Get presigned upload URL |
| POST | `/upload/complete` | Mark upload complete, trigger processing |
| POST | `/upload/multipart/initiate` | Start multipart upload (large files) |
| POST | `/upload/multipart/part-url` | Get presigned URL for part |
| POST | `/upload/multipart/complete` | Complete multipart upload |
| POST | `/upload/multipart/abort` | Abort multipart upload |

**Use Cases Called:**
- `document-upload.service.getPresignedUploadUrl()`
- `document-upload.service.completeUpload()` (enqueues virus scan)
- `document-upload.service.initiateMultipartUpload()`

**Upload Flow:**
1. Client requests presigned URL
2. Client uploads directly to S3 (quarantine bucket)
3. Client notifies server of completion
4. Server enqueues virus scan job
5. Virus scan processor scans file
6. On clean scan: move to production bucket, enqueue thumbnail/metadata/OCR jobs

#### **Commitment Controller** (`src/modules/financials/controllers/commitment.controller.ts`)

**Route Prefix:** `/api/v1/projects/:projectId/commitments`

**Responsibilities:** Subcontract and purchase order management

**Key Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/commitments` | Create commitment |
| GET | `/commitments` | List commitments |
| GET | `/commitments/:id` | Get commitment details |
| PATCH | `/commitments/:id` | Update commitment |
| POST | `/commitments/:id/submit` | Submit for approval |
| POST | `/commitments/:id/approve` | Approve commitment |
| POST | `/commitments/:id/reject` | Reject commitment |
| POST | `/commitments/:id/activate` | Activate commitment |
| POST | `/commitments/:id/complete` | Mark as complete |
| POST | `/commitments/:id/void` | Void commitment |

**Use Cases Called:**
- `commitment.service.create()`, `commitment.service.submit()`
- `commitment.service.approve()`, `commitment.service.activate()`

**Lifecycle:** DRAFT → PENDING_APPROVAL → APPROVED → ACTIVE → COMPLETE

### Controller Code Example

Here's a real example from `auth.controller.ts` (src/modules/auth/auth.controller.ts:103-115):

```typescript
@Post('register')
@HttpCode(HttpStatus.CREATED)
async register(@Body() registerDto: RegisterDto): Promise<UserResponseDto> {
  this.logger.log(
    `Registration request received for email: ${registerDto.email}`,
  );

  const user = await this.authService.register(registerDto);

  this.logger.log(`User registered successfully - ID: ${user.id}`);

  return user;
}
```

**Key Observations:**

- `@Post('register')` defines the route: `POST /auth/register`
- `@HttpCode(HttpStatus.CREATED)` sets status code to 201
- `@Body()` decorator extracts and validates request body against `RegisterDto`
- Controller logs request and delegates to `authService.register()`
- Returns `UserResponseDto` (password automatically excluded)

---

## 6. Use Cases / Services

### What are Services?

Services contain the **business logic** of the application. They:

- Validate business rules (e.g., "only one active budget per project")
- Orchestrate multiple repository calls
- Handle transactions
- Call external APIs
- Enqueue background jobs
- Return DTOs (not raw entities)

### Service Patterns

#### **Constructor Injection**

```typescript
@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
  ) {}
}
```

#### **Logging**

Every service has a logger:

```typescript
private readonly logger = new Logger(ProjectService.name);
```

#### **Error Handling**

Services throw NestJS exceptions:

```typescript
if (!organization) {
  throw new NotFoundException(`Organization ${organizationId} not found`);
}

if (existingProject) {
  throw new ConflictException(`Project number ${number} already exists`);
}
```

### Service Catalog

#### **Auth Service** (`src/modules/auth/auth.service.ts`)

**Responsibilities:**
- User registration
- User login with credential validation
- Failed login tracking
- Rate limiting enforcement

**Key Methods:**
- `register(dto: RegisterDto): Promise<UserResponseDto>`
  - Checks email uniqueness (case-insensitive)
  - Hashes password with bcrypt (12 rounds)
  - Creates user with default role `USER`
  - Returns user DTO (password excluded)

- `login(dto: LoginDto, context: LoginContext): Promise<LoginResponseDto>`
  - Checks rate limit (5 failed attempts per 15 min per IP)
  - Validates credentials
  - On success: clears failed attempts, generates tokens
  - On failure: records failed attempt with IP, user agent, reason

**Called By:**
- `auth.controller.register()`
- `auth.controller.login()`

#### **Token Refresh Service** (`src/modules/auth/token-refresh.service.ts`)

**Responsibilities:**
- Refresh token validation
- Token rotation (security best practice)
- Token reuse detection
- Grace period handling for network reliability

**Key Methods:**
- `refreshTokens(token: string, context: RefreshContext): Promise<TokenPair>`
  - Validates refresh token exists, not revoked, not expired
  - Rotates tokens: marks old token as revoked (with grace period)
  - Generates new access token (15 min expiry)
  - Generates new refresh token (7 day expiry)
  - Detects token reuse: if old token used after grace period → revoke all user sessions

**Security Features:**
- Token family tracking (detects stolen tokens)
- Grace period (5 seconds) for network retries
- Device ID tracking

**Called By:**
- `auth.controller.refresh()`

#### **Budget Service** (`src/modules/financials/services/budget.service.ts`)

**Responsibilities:**
- Budget CRUD operations
- Budget activation (enforces "only one active budget per project" rule)
- Budget locking/unlocking
- Budget cloning
- Budget archiving

**Key Methods:**
- `create(projectId: string, dto: CreateBudgetDto, userId: string): Promise<BudgetResponseDto>`
  - Validates project exists
  - Creates budget with status DRAFT
  - Links to user as creator

- `activate(budgetId: string, userId: string): Promise<BudgetResponseDto>`
  - Validates budget exists and is not already active
  - Deactivates any other active budgets for the project
  - Activates this budget
  - Uses transaction for atomicity

- `lock(budgetId: string, userId: string): Promise<BudgetResponseDto>`
  - Locks budget to prevent modifications (for period close)
  - Records who locked it and when

**Called By:**
- `budget.controller.create()`, `budget.controller.activate()`, `budget.controller.lock()`

#### **Document Upload Service** (`src/modules/documents/services/document-upload.service.ts`)

**Responsibilities:**
- Presigned URL generation for direct S3 uploads
- Multipart upload orchestration (for large files)
- Upload completion handling
- Virus scan job enqueuing

**Key Methods:**
- `getPresignedUploadUrl(dto: InitiateUploadDto): Promise<PresignedUrlResponseDto>`
  - Generates presigned PUT URL for S3 (quarantine bucket)
  - Sets expiration (15 minutes)
  - Returns URL and upload ID

- `completeUpload(uploadId: string): Promise<void>`
  - Marks upload as complete
  - Enqueues virus scan job
  - Returns immediately (processing happens in background)

- `initiateMultipartUpload(dto: InitiateMultipartUploadDto): Promise<MultipartUploadResponseDto>`
  - Creates multipart upload on S3
  - Returns upload ID

- `completeMultipartUpload(uploadId: string, parts: PartETag[]): Promise<void>`
  - Assembles parts on S3
  - Enqueues virus scan job

**Called By:**
- `document-upload.controller.initiate()`, `document-upload.controller.complete()`

#### **Commitment Service** (`src/modules/financials/services/commitment.service.ts`)

**Responsibilities:**
- Commitment (subcontract/purchase order) lifecycle management
- Approval workflow
- Financial calculations

**Key Methods:**
- `create(projectId: string, dto: CreateCommitmentDto, userId: string): Promise<CommitmentResponseDto>`
  - Validates project exists
  - Creates commitment with status DRAFT
  - Auto-generates commitment number

- `submit(commitmentId: string, userId: string): Promise<CommitmentResponseDto>`
  - Changes status: DRAFT → PENDING_APPROVAL
  - Records submission timestamp

- `approve(commitmentId: string, userId: string, reason?: string): Promise<CommitmentResponseDto>`
  - Changes status: PENDING_APPROVAL → APPROVED
  - Records approver and reason

- `activate(commitmentId: string, userId: string): Promise<CommitmentResponseDto>`
  - Changes status: APPROVED → ACTIVE
  - Commitment is now available for pay apps

**Lifecycle:** DRAFT → PENDING_APPROVAL → APPROVED → ACTIVE → COMPLETE

**Called By:**
- `commitment.controller.create()`, `commitment.controller.submit()`, `commitment.controller.approve()`

### How a Use Case is Wired

Here's a typical flow for creating a project:

```
1. Client sends POST /api/v1/projects
   Body: { name, organizationId, type, startDate, ... }

2. Controller: project.controller.create()
   - @Body() extracts and validates CreateProjectDto
   - @CurrentUser() extracts user ID from JWT
   - Calls: projectService.create(dto, userId)

3. Service: project.service.create()
   - Validates organization exists and is active
   - Generates project number if not provided
   - Creates project entity
   - Saves to database
   - Creates project member record (creator as PROJECT_ADMIN)
   - Returns ProjectResponseDto

4. Repository: TypeORM
   - Saves project to PostgreSQL
   - Returns saved entity

5. Response flows back to client
```

---

## 7. Domain Models & Data Layer

### Entity Patterns

Entities in Builder API follow consistent patterns:

#### **UUID Primary Keys**

```typescript
@PrimaryGeneratedColumn('uuid')
id!: string;
```

#### **Enum Columns**

```typescript
@Column({
  type: 'enum',
  enum: ProjectStatus,
  default: ProjectStatus.BIDDING,
})
status!: ProjectStatus;
```

#### **JSONB for Flexible Data**

```typescript
@Column({
  type: 'jsonb',
  nullable: true,
})
customFields?: Record<string, any>;
```

#### **Timestamps**

```typescript
@CreateDateColumn({ name: 'created_at' })
createdAt!: Date;

@UpdateDateColumn({ name: 'updated_at' })
updatedAt!: Date;
```

#### **Soft Deletes**

```typescript
@Column({ name: 'deleted_at', nullable: true })
deletedAt?: Date;
```

#### **Indexes**

```typescript
@Index('IDX_projects_organization', ['organizationId'])
@Index('IDX_projects_number', ['organizationId', 'number'], { unique: true })
```

#### **Foreign Keys**

```typescript
@ManyToOne(() => Organization, (org) => org.projects)
@JoinColumn({ name: 'organization_id' })
organization!: Organization;

@Column({ type: 'uuid', name: 'organization_id' })
organizationId!: string;
```

#### **Lifecycle Hooks**

```typescript
@BeforeInsert()
normalizeEmailBeforeInsert(): void {
  if (this.email) {
    this.email = this.email.toLowerCase().trim();
  }
}
```

#### **Security: Password Exclusion**

```typescript
@Column({ type: 'varchar', select: false })  // Exclude from queries
@Exclude()  // Exclude from serialization
password!: string;

toJSON(): Partial<User> {
  const { password, ...userWithoutPassword } = this;
  return userWithoutPassword;
}
```

### Key Entity Relationships

```
User
  ├── hasMany → OrganizationMember (User join table)
  └── hasMany → ProjectMember (User join table)

Organization
  ├── hasMany → Project
  └── hasMany → OrganizationMember

Project
  ├── belongsTo → Organization
  ├── hasMany → ProjectMember
  ├── hasMany → Budget
  ├── hasMany → Commitment
  ├── hasMany → Document
  ├── hasMany → ProjectPhase
  └── hasMany → ProjectMilestone

Budget
  ├── belongsTo → Project
  ├── belongsTo → User (createdBy)
  └── hasMany → BudgetLineItem

BudgetLineItem
  ├── belongsTo → Budget
  └── belongsTo → CostCode

Commitment
  ├── belongsTo → Project
  ├── hasMany → CommitmentItem
  ├── hasMany → PaymentApplication
  └── hasOne → ScheduleOfValues

CommitmentItem
  ├── belongsTo → Commitment
  └── belongsTo → CostCode

Document
  ├── belongsTo → Project
  ├── belongsTo → ProjectFolder (optional)
  ├── hasMany → DocumentVersion
  └── belongsTo → DocumentVersion (currentVersion)
```

### Important Entities

#### **User Entity** (`src/modules/users/entities/user.entity.ts`)

**Purpose:** Core user model for authentication and authorization

**Key Fields:**
- `id` - UUID
- `email` - Unique, case-insensitive (auto-lowercased)
- `password` - Hashed, excluded from queries and serialization
- `firstName`, `lastName`
- `phoneNumber`
- `systemRole` - Enum: SYSTEM_ADMIN, USER
- `isActive` - Boolean (inactive users can't log in)
- `emailVerified` - Boolean
- `lastLoginAt` - Timestamp

**Methods:**
- `fullName`: string - Getter for full name
- `isSystemAdmin()`: boolean - Check if system admin

**Security:**
- Password hashed with bcrypt (12 rounds)
- Password excluded via `@Exclude()` and `select: false`
- `toJSON()` override ensures password never serialized

**File Location:** src/modules/users/entities/user.entity.ts:25-263

#### **Project Entity** (`src/modules/projects/entities/project.entity.ts`)

**Purpose:** Comprehensive construction project data

**Key Fields:**

*Core:*
- `id` - UUID
- `number` - Unique within organization (e.g., "ACME-20241208-001")
- `name` - Display name
- `organizationId` - Foreign key

*Location:*
- `address`, `city`, `state`, `zip`, `country`
- `latitude`, `longitude` - For geolocation

*Construction:*
- `type` - Enum: COMMERCIAL, RESIDENTIAL, INFRASTRUCTURE, etc.
- `deliveryMethod` - Enum: DESIGN_BID_BUILD, DESIGN_BUILD, CM_AT_RISK, etc.
- `contractType` - String (e.g., "Lump Sum", "Cost Plus")
- `squareFootage` - Number

*Schedule:*
- `startDate`, `endDate`
- `substantialCompletion`, `finalCompletion`

*Financial:*
- `originalContract`, `currentContract` - Decimal
- `percentComplete` - Number (0-100)

*Settings:*
- `timezone` - String (e.g., "America/New_York")
- `workingDays` - Array (e.g., ["Monday", "Tuesday", ...])
- `holidays` - Array of dates

*Metadata:*
- `customFields` - JSONB (flexible key-value pairs)
- `tags` - Array
- `status` - Enum: BIDDING, CONSTRUCTION, CLOSEOUT, etc.
- `description` - Text

*Audit:*
- `createdAt`, `updatedAt`
- `createdBy`, `updatedBy` - User IDs
- `archivedAt` - Timestamp (soft delete)

**Methods:**
- `daysRemaining()`: number
- `isActive()`: boolean
- `budgetVariance()`: number
- `durationDays()`: number
- `getFullAddress()`: string

**File Location:** src/modules/projects/entities/project.entity.ts:1-150

#### **Budget Entity** (`src/modules/financials/entities/budget.entity.ts`)

**Purpose:** Project budget tracking

**Key Fields:**
- `id` - UUID
- `projectId` - Foreign key
- `name` - Display name (e.g., "2024 Q1 Budget")
- `description` - Text
- `status` - Enum: DRAFT, ACTIVE, LOCKED, ARCHIVED
- `totalBudget` - Computed from line items
- `contingency` - Decimal
- `lockedById`, `lockedAt` - Who locked and when
- `version` - Optimistic locking with `@VersionColumn()`

**Relationships:**
- `hasMany → BudgetLineItem`
- `belongsTo → Project`
- `belongsTo → User` (createdBy)

**Business Rules:**
- Only one active budget per project
- Locked budgets cannot be modified
- Uses optimistic locking to prevent concurrent edits

#### **Commitment Entity** (`src/modules/financials/entities/commitment.entity.ts`)

**Purpose:** Subcontracts and purchase orders

**Key Fields:**

*Core:*
- `id` - UUID
- `projectId` - Foreign key
- `number` - Auto-generated (e.g., "SUB-001")
- `type` - Enum: SUBCONTRACT, PURCHASE_ORDER
- `title` - Display name
- `status` - Enum: DRAFT, PENDING_APPROVAL, APPROVED, ACTIVE, COMPLETE, VOID

*Vendor:*
- `vendorName`, `vendorContact`, `vendorEmail`

*Financial:*
- `originalAmount`, `currentAmount` - Contract values
- `invoicedAmount`, `paidAmount` - Payment tracking
- `retentionPercent` - Retention percentage

*Contract:*
- `startDate`, `endDate`

*Approval:*
- `approvedById`, `approvedAt`
- `rejectedById`, `rejectedAt`, `rejectionReason`

*QuickBooks Integration:*
- `qbVendorId` - QuickBooks vendor ID
- `qbSyncStatus` - Enum: SYNCED, PENDING, ERROR
- `qbLastSyncedAt` - Timestamp

**Relationships:**
- `belongsTo → Project`
- `hasMany → CommitmentItem`
- `hasMany → PaymentApplication`
- `hasOne → ScheduleOfValues`

**Lifecycle:** DRAFT → PENDING_APPROVAL → APPROVED → ACTIVE → COMPLETE

#### **Document Entity** (`src/modules/documents/entities/document.entity.ts`)

**Purpose:** Document metadata and version control

**Key Fields:**
- `id` - UUID
- `projectId` - Foreign key
- `folderId` - Foreign key (optional, for folder hierarchy)
- `name` - Display name
- `number` - Document number (e.g., "DWG-A-001")
- `type` - Enum: RFI, SUBMITTAL, DRAWING, SPECIFICATION, PHOTO, etc.
- `currentVersionId` - Foreign key to current version
- `deletedAt` - Soft delete timestamp

**Relationships:**
- `belongsTo → Project`
- `belongsTo → ProjectFolder` (optional)
- `hasMany → DocumentVersion`
- `belongsTo → DocumentVersion` (currentVersion)

**Features:**
- Version history
- Locking for check-in/check-out
- Virus scanning before production
- Thumbnails, OCR, metadata extraction

### How Requests Flow Through Entities

Let's trace creating a budget:

```
1. Controller receives: POST /api/v1/projects/{projectId}/budgets
   Body: { name: "2024 Budget", description: "..." }

2. Controller calls: budgetService.create(projectId, dto, userId)

3. Service:
   a. Validates project exists:
      - projectRepo.findOne({ where: { id: projectId } })
      - Returns Project entity or null
      - If null, throw NotFoundException

   b. Creates budget entity:
      - budget = budgetRepo.create({
          projectId,
          name: dto.name,
          description: dto.description,
          status: BudgetStatus.DRAFT,
          createdBy: userId,
        })
      - Returns Budget entity (not yet saved)

   c. Saves to database:
      - savedBudget = await budgetRepo.save(budget)
      - TypeORM generates SQL INSERT
      - PostgreSQL saves record
      - Returns Budget entity with id, createdAt, updatedAt populated

   d. Transforms to DTO:
      - return new BudgetResponseDto(savedBudget)
      - DTO strips internal fields, formats dates, etc.

4. Controller returns DTO to client as JSON

5. ClassSerializerInterceptor serializes DTO:
   - Applies @Exclude() decorators
   - Transforms dates to ISO strings
   - Returns clean JSON response
```

### Persistence with TypeORM

TypeORM provides the data access layer:

#### **Repository Pattern**

```typescript
@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  async findOne(id: string): Promise<Project | null> {
    return this.projectRepo.findOne({
      where: { id },
      relations: ['organization', 'members'],
    });
  }
}
```

#### **Query Builder**

```typescript
const projects = await this.projectRepo
  .createQueryBuilder('project')
  .leftJoinAndSelect('project.organization', 'organization')
  .where('project.status = :status', { status: ProjectStatus.ACTIVE })
  .andWhere('project.organizationId = :orgId', { orgId })
  .orderBy('project.createdAt', 'DESC')
  .take(10)
  .skip(0)
  .getMany();
```

#### **Transactions**

```typescript
await this.connection.transaction(async (manager) => {
  // Deactivate other budgets
  await manager.update(Budget,
    { projectId, status: BudgetStatus.ACTIVE },
    { status: BudgetStatus.LOCKED }
  );

  // Activate new budget
  await manager.update(Budget, { id: budgetId }, { status: BudgetStatus.ACTIVE });
});
```

---

## 8. Key Use Cases & Their Components

Let's walk through several representative end-to-end use cases to understand how all the pieces fit together.

### Use Case 1: User Registration and Login

**Business Scenario:** A new construction manager wants to create an account and log in to manage projects.

**Components Involved:**
- **Controller:** `auth.controller.ts`
- **Services:** `auth.service.ts`, `token.service.ts`
- **Entities:** `user.entity.ts`, `refresh-token.entity.ts`, `failed-login-attempt.entity.ts`
- **DTOs:** `register.dto.ts`, `login.dto.ts`, `user-response.dto.ts`, `login-response.dto.ts`
- **Guards:** None (public endpoints)

**Step-by-Step Flow:**

**Registration:**

1. Client sends `POST /auth/register`
   ```json
   {
     "email": "john.doe@acme.com",
     "password": "SecurePass123!",
     "firstName": "John",
     "lastName": "Doe",
     "phoneNumber": "+1234567890"
   }
   ```

2. NestJS middleware:
   - Adds correlation ID
   - Logs request

3. Validation pipe:
   - Validates `RegisterDto`:
     - `email` is valid email
     - `password` meets strength requirements (min 8 chars, uppercase, lowercase, number)
     - `firstName` and `lastName` are not empty

4. Controller (`auth.controller.ts:103-115`):
   - Extracts `RegisterDto` from body
   - Calls `authService.register(registerDto)`

5. Service (`auth.service.ts`):
   - Checks if email already exists (case-insensitive):
     ```typescript
     const existingUser = await this.userRepo.findOne({
       where: { email: registerDto.email.toLowerCase() }
     });
     if (existingUser) {
       throw new ConflictException('Email already exists');
     }
     ```

   - Hashes password with bcrypt (12 rounds):
     ```typescript
     const hashedPassword = await bcrypt.hash(registerDto.password, 12);
     ```

   - Creates user:
     ```typescript
     const user = this.userRepo.create({
       email: registerDto.email.toLowerCase(),
       password: hashedPassword,
       firstName: registerDto.firstName,
       lastName: registerDto.lastName,
       phoneNumber: registerDto.phoneNumber,
       systemRole: SystemRole.USER,
     });
     ```

   - Saves to database:
     ```typescript
     const savedUser = await this.userRepo.save(user);
     ```

   - Returns `UserResponseDto` (password excluded):
     ```typescript
     return new UserResponseDto(savedUser);
     ```

6. Response sent to client (201 Created):
   ```json
   {
     "id": "uuid",
     "email": "john.doe@acme.com",
     "firstName": "John",
     "lastName": "Doe",
     "phoneNumber": "+1234567890",
     "systemRole": "user",
     "isActive": true,
     "createdAt": "2024-12-08T10:30:00.000Z"
   }
   ```

**Login:**

1. Client sends `POST /auth/login`
   ```json
   {
     "email": "john.doe@acme.com",
     "password": "SecurePass123!"
   }
   ```

2. Validation pipe validates `LoginDto`

3. Controller (`auth.controller.ts:170-192`):
   - Extracts IP address and user agent from request
   - Calls `authService.login(loginDto, { ipAddress, userAgent })`

4. Service (`auth.service.ts`):
   - **Check rate limit** (5 failed attempts per 15 min per IP):
     ```typescript
     const failedAttempts = await this.failedLoginRepo.count({
       where: {
         ipAddress,
         attemptedAt: MoreThan(fifteenMinutesAgo),
       }
     });
     if (failedAttempts >= 5) {
       throw new TooManyRequestsException('Too many failed attempts');
     }
     ```

   - **Find user** (with password field):
     ```typescript
     const user = await this.userRepo.findOne({
       where: { email: loginDto.email.toLowerCase() },
       select: ['id', 'email', 'password', 'firstName', 'lastName', 'systemRole', 'isActive'],
     });
     ```

   - **Verify password**:
     ```typescript
     const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
     if (!isPasswordValid) {
       // Record failed attempt
       await this.recordFailedAttempt(loginDto.email, ipAddress, userAgent, 'Invalid password');
       throw new UnauthorizedException('Invalid credentials');
     }
     ```

   - **On success:**
     - Clear failed attempts:
       ```typescript
       await this.failedLoginRepo.delete({ email: loginDto.email });
       ```

     - Generate access token (15 min expiry):
       ```typescript
       const accessToken = this.tokenService.generateAccessToken(user);
       ```

     - Generate refresh token (7 day expiry):
       ```typescript
       const refreshToken = await this.tokenService.generateRefreshToken(user, { ipAddress, userAgent });
       ```

     - Save refresh token to database

     - Return `LoginResponseDto`:
       ```typescript
       return {
         accessToken,
         refreshToken,
         tokenType: 'Bearer',
         expiresIn: 900,  // 15 minutes
         user: new UserResponseDto(user),
       };
       ```

5. Response sent to client (200 OK):
   ```json
   {
     "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "refreshToken": "a1b2c3d4e5f6...",
     "tokenType": "Bearer",
     "expiresIn": 900,
     "user": {
       "id": "uuid",
       "email": "john.doe@acme.com",
       "firstName": "John",
       "lastName": "Doe",
       "systemRole": "user"
     }
   }
   ```

6. Client stores tokens:
   - Access token in memory or short-lived storage
   - Refresh token in secure HTTP-only cookie or encrypted storage

7. Client includes access token in subsequent requests:
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

---

### Use Case 2: Create a Project

**Business Scenario:** An organization owner wants to create a new construction project.

**Components Involved:**
- **Controller:** `project.controller.ts`
- **Service:** `project.service.ts`
- **Entities:** `project.entity.ts`, `organization.entity.ts`, `project-member.entity.ts`
- **DTOs:** `create-project.dto.ts`, `project-response.dto.ts`
- **Guards:** `JwtAuthGuard`

**Step-by-Step Flow:**

1. Client sends `POST /api/v1/projects` with access token
   ```
   Authorization: Bearer <access-token>
   ```
   ```json
   {
     "name": "Downtown Office Tower",
     "organizationId": "org-uuid",
     "type": "COMMERCIAL",
     "deliveryMethod": "DESIGN_BUILD",
     "address": "123 Main St",
     "city": "New York",
     "state": "NY",
     "zip": "10001",
     "startDate": "2024-01-01",
     "endDate": "2025-12-31"
   }
   ```

2. Middleware adds correlation ID and logs request

3. **Guard check** (`JwtAuthGuard`):
   - Extracts token from `Authorization` header
   - Passport `jwt.strategy.ts` validates token:
     - Signature valid
     - Not expired
     - User exists and is active
   - User object attached to `req.user`

4. Validation pipe validates `CreateProjectDto`:
   - `name` is not empty
   - `organizationId` is valid UUID
   - `type` is valid enum value
   - `startDate` is valid date
   - etc.

5. Controller:
   - Extracts user with `@CurrentUser()` decorator
   - Extracts DTO from `@Body()`
   - Calls `projectService.create(dto, user.id)`

6. Service (`project.service.ts`):
   - **Validate organization exists:**
     ```typescript
     const organization = await this.orgRepo.findOne({
       where: { id: dto.organizationId, isActive: true }
     });
     if (!organization) {
       throw new NotFoundException('Organization not found');
     }
     ```

   - **Generate project number if not provided:**
     ```typescript
     if (!dto.number) {
       const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
       const count = await this.projectRepo.count({
         where: { organizationId: dto.organizationId }
       });
       dto.number = `${organization.slug.toUpperCase()}-${date}-${String(count + 1).padStart(3, '0')}`;
       // Example: "ACME-20241208-001"
     }
     ```

   - **Create project:**
     ```typescript
     const project = this.projectRepo.create({
       ...dto,
       status: ProjectStatus.BIDDING,
       createdBy: userId,
     });
     ```

   - **Save in transaction:**
     ```typescript
     await this.connection.transaction(async (manager) => {
       // Save project
       const savedProject = await manager.save(Project, project);

       // Add creator as PROJECT_ADMIN
       const membership = manager.create(ProjectMember, {
         projectId: savedProject.id,
         userId: userId,
         role: ProjectRole.PROJECT_ADMIN,
       });
       await manager.save(ProjectMember, membership);

       return savedProject;
     });
     ```

   - **Return DTO:**
     ```typescript
     return new ProjectResponseDto(savedProject);
     ```

7. Response sent to client (201 Created):
   ```json
   {
     "id": "project-uuid",
     "number": "ACME-20241208-001",
     "name": "Downtown Office Tower",
     "organizationId": "org-uuid",
     "type": "COMMERCIAL",
     "deliveryMethod": "DESIGN_BUILD",
     "status": "BIDDING",
     "address": "123 Main St",
     "city": "New York",
     "state": "NY",
     "zip": "10001",
     "startDate": "2024-01-01",
     "endDate": "2025-12-31",
     "createdAt": "2024-12-08T10:30:00.000Z",
     "createdBy": "user-uuid"
   }
   ```

---

### Use Case 3: Upload a Document with Virus Scanning

**Business Scenario:** A project manager wants to upload a submittal PDF to a project.

**Components Involved:**
- **Controllers:** `document-upload.controller.ts`, `document.controller.ts`
- **Services:** `document-upload.service.ts`, `s3.service.ts`
- **Processors:** `virus-scan.processor.ts`, `thumbnail.processor.ts`, `metadata.processor.ts`, `ocr.processor.ts`
- **Entities:** `document.entity.ts`, `document-version.entity.ts`, `document-upload.entity.ts`
- **External:** AWS S3, ClamAV, Tesseract.js

**Step-by-Step Flow:**

**Phase 1: Initiate Upload**

1. Client sends `POST /api/v1/documents/upload/initiate`
   ```json
   {
     "projectId": "project-uuid",
     "folderId": "folder-uuid",
     "fileName": "submittal-HVAC.pdf",
     "fileSize": 5242880,
     "mimeType": "application/pdf",
     "documentType": "SUBMITTAL"
   }
   ```

2. Controller validates DTO

3. Service (`document-upload.service.ts`):
   - Validates project and folder exist
   - Validates file size (max 100MB)
   - Validates MIME type (allowed types)

   - **Generate presigned URL** for S3 upload (quarantine bucket):
     ```typescript
     const s3Key = `uploads/quarantine/${projectId}/${uuid()}-${fileName}`;
     const presignedUrl = await this.s3Service.getPresignedPutUrl(
       process.env.S3_QUARANTINE_BUCKET,
       s3Key,
       {
         expiresIn: 900,  // 15 minutes
         contentType: mimeType,
       }
     );
     ```

   - **Create upload record:**
     ```typescript
     const upload = this.uploadRepo.create({
       projectId,
       folderId,
       fileName,
       fileSize,
       mimeType,
       s3Key,
       status: DocumentUploadStatus.INITIATED,
     });
     await this.uploadRepo.save(upload);
     ```

   - **Return presigned URL:**
     ```typescript
     return {
       uploadId: upload.id,
       presignedUrl,
       s3Key,
       expiresAt: new Date(Date.now() + 900000),
     };
     ```

4. Response sent to client:
   ```json
   {
     "uploadId": "upload-uuid",
     "presignedUrl": "https://s3.amazonaws.com/bucket/key?signature=...",
     "s3Key": "uploads/quarantine/project-uuid/uuid-submittal-HVAC.pdf",
     "expiresAt": "2024-12-08T10:45:00.000Z"
   }
   ```

**Phase 2: Client Uploads to S3**

5. Client uploads file directly to S3 using presigned URL:
   ```
   PUT https://s3.amazonaws.com/bucket/key?signature=...
   Content-Type: application/pdf
   <file data>
   ```

6. S3 stores file in quarantine bucket

**Phase 3: Complete Upload**

7. Client notifies server: `POST /api/v1/documents/upload/complete`
   ```json
   {
     "uploadId": "upload-uuid"
   }
   ```

8. Service (`document-upload.service.ts`):
   - **Verify file exists in S3:**
     ```typescript
     const exists = await this.s3Service.objectExists(bucket, s3Key);
     if (!exists) {
       throw new NotFoundException('File not found in S3');
     }
     ```

   - **Update upload status:**
     ```typescript
     await this.uploadRepo.update(uploadId, {
       status: DocumentUploadStatus.COMPLETED,
       completedAt: new Date(),
     });
     ```

   - **Enqueue virus scan job:**
     ```typescript
     await this.virusScanQueue.add('scan-document', {
       uploadId,
       projectId,
       s3Key,
     });
     ```

9. Response: `{ message: 'Upload complete, processing started' }`

**Phase 4: Background Processing (Async)**

10. **Virus Scan Processor** (`virus-scan.processor.ts`):
    - Downloads file from S3 (quarantine bucket)
    - Scans with ClamAV:
      ```typescript
      const scanResult = await clamScan.scanFile(filePath);
      ```

    - **If clean:**
      - Move from quarantine → production bucket:
        ```typescript
        await this.s3Service.copyObject(
          quarantineBucket, s3Key,
          productionBucket, s3Key
        );
        await this.s3Service.deleteObject(quarantineBucket, s3Key);
        ```

      - Create document record:
        ```typescript
        const document = this.documentRepo.create({
          projectId,
          folderId,
          name: fileName,
          type: documentType,
          status: DocumentStatus.ACTIVE,
        });
        await this.documentRepo.save(document);
        ```

      - Create document version:
        ```typescript
        const version = this.versionRepo.create({
          documentId: document.id,
          versionNumber: 1,
          s3Key: productionS3Key,
          fileSize,
          mimeType,
          uploadedBy: userId,
        });
        await this.versionRepo.save(version);
        ```

      - Update document currentVersionId

      - Enqueue thumbnail job
      - Enqueue metadata extraction job
      - Enqueue OCR job (if PDF or image)

    - **If infected:**
      - Delete file from quarantine bucket
      - Mark upload as FAILED
      - Log security event
      - Notify user

11. **Thumbnail Processor** (`thumbnail.processor.ts`):
    - Downloads file from S3
    - Generates thumbnail (if image or PDF):
      ```typescript
      const thumbnail = await sharp(buffer)
        .resize(200, 200, { fit: 'inside' })
        .png()
        .toBuffer();
      ```
    - Uploads thumbnail to S3
    - Updates document version with thumbnail URL

12. **Metadata Processor** (`metadata.processor.ts`):
    - Extracts metadata (file size, dimensions, etc.)
    - Updates document version

13. **OCR Processor** (`ocr.processor.ts`):
    - Runs Tesseract.js on PDF/image
    - Extracts text
    - Stores in document version `extractedText` field
    - Indexes in Elasticsearch for full-text search

**Final Result:**

Document is now:
- Stored in production S3 bucket
- Virus-free
- Has thumbnail
- Metadata extracted
- Text extracted (OCR)
- Indexed for search
- Visible in document list

---

### Use Case 4: Create and Manage a Budget

**Business Scenario:** A project manager wants to create a project budget, import line items from Excel, and activate it.

**Components Involved:**
- **Controller:** `budget.controller.ts`
- **Services:** `budget.service.ts`, `budget-import.service.ts`, `budget-calculation.service.ts`
- **Entities:** `budget.entity.ts`, `budget-line-item.entity.ts`, `cost-code.entity.ts`
- **DTOs:** `create-budget.dto.ts`, `import-budget.dto.ts`, `budget-response.dto.ts`

**Step-by-Step Flow:**

**Step 1: Create Budget**

1. Client sends `POST /api/v1/projects/:projectId/budgets`
   ```json
   {
     "name": "2024 Budget",
     "description": "Main project budget for 2024",
     "contingency": 50000.00
   }
   ```

2. Service (`budget.service.ts`):
   - Validates project exists
   - Creates budget:
     ```typescript
     const budget = this.budgetRepo.create({
       projectId,
       name: dto.name,
       description: dto.description,
       contingency: dto.contingency,
       status: BudgetStatus.DRAFT,
       createdBy: userId,
     });
     await this.budgetRepo.save(budget);
     ```

3. Response: `{ id: "budget-uuid", status: "DRAFT", ... }`

**Step 2: Import Budget Line Items from Excel**

4. Client uploads Excel file: `POST /api/v1/projects/:projectId/budgets/:budgetId/import`
   - Multipart form data with Excel file

5. Service (`budget-import.service.ts`):
   - **Parse Excel file** using ExcelJS:
     ```typescript
     const workbook = new ExcelJS.Workbook();
     await workbook.xlsx.load(buffer);
     const worksheet = workbook.getWorksheet(1);
     ```

   - **Extract rows:**
     ```typescript
     const rows = [];
     worksheet.eachRow((row, rowNumber) => {
       if (rowNumber === 1) return; // Skip header
       rows.push({
         costCode: row.getCell(1).value,
         description: row.getCell(2).value,
         quantity: row.getCell(3).value,
         unit: row.getCell(4).value,
         unitCost: row.getCell(5).value,
         totalCost: row.getCell(6).value,
       });
     });
     ```

   - **Validate cost codes exist:**
     ```typescript
     for (const row of rows) {
       const costCode = await this.costCodeRepo.findOne({
         where: { code: row.costCode, projectId }
       });
       if (!costCode) {
         throw new BadRequestException(`Cost code ${row.costCode} not found`);
       }
     }
     ```

   - **Create budget line items** (in transaction):
     ```typescript
     await this.connection.transaction(async (manager) => {
       for (const row of rows) {
         const lineItem = manager.create(BudgetLineItem, {
           budgetId,
           costCodeId: row.costCode.id,
           description: row.description,
           quantity: row.quantity,
           unit: row.unit,
           unitCost: row.unitCost,
           totalCost: row.totalCost,
         });
         await manager.save(BudgetLineItem, lineItem);
       }

       // Update budget total
       const total = rows.reduce((sum, row) => sum + row.totalCost, 0);
       await manager.update(Budget, budgetId, { totalBudget: total });
     });
     ```

6. Response: `{ imported: 150, failed: 0 }`

**Step 3: Activate Budget**

7. Client sends `POST /api/v1/projects/:projectId/budgets/:budgetId/activate`

8. Service (`budget.service.ts`):
   - **Validate budget exists and is not already active:**
     ```typescript
     const budget = await this.budgetRepo.findOne({ where: { id: budgetId } });
     if (!budget) throw new NotFoundException();
     if (budget.status === BudgetStatus.ACTIVE) {
       throw new ConflictException('Budget is already active');
     }
     ```

   - **Deactivate other active budgets** (only one active per project):
     ```typescript
     await this.connection.transaction(async (manager) => {
       // Lock other active budgets
       await manager.update(
         Budget,
         { projectId, status: BudgetStatus.ACTIVE },
         { status: BudgetStatus.LOCKED }
       );

       // Activate this budget
       await manager.update(
         Budget,
         { id: budgetId },
         { status: BudgetStatus.ACTIVE, activatedAt: new Date(), activatedBy: userId }
       );
     });
     ```

9. Response: `{ id: "budget-uuid", status: "ACTIVE", ... }`

**Step 4: View Budget Variance**

10. Client sends `GET /api/v1/projects/:projectId/budgets/:budgetId/variance`

11. Service (`budget-calculation.service.ts`):
    - **Calculate actuals from commitments:**
      ```typescript
      const commitments = await this.commitmentRepo.find({
        where: { projectId },
        relations: ['items', 'items.costCode'],
      });

      const actualsByCode = {};
      for (const commitment of commitments) {
        for (const item of commitment.items) {
          actualsByCode[item.costCodeId] = (actualsByCode[item.costCodeId] || 0) + item.amount;
        }
      }
      ```

    - **Compare to budget:**
      ```typescript
      const lineItems = await this.budgetLineItemRepo.find({
        where: { budgetId },
        relations: ['costCode'],
      });

      const variance = lineItems.map(item => ({
        costCode: item.costCode.code,
        description: item.description,
        budgeted: item.totalCost,
        actual: actualsByCode[item.costCodeId] || 0,
        variance: item.totalCost - (actualsByCode[item.costCodeId] || 0),
        percentVariance: ((item.totalCost - (actualsByCode[item.costCodeId] || 0)) / item.totalCost) * 100,
      }));
      ```

12. Response:
    ```json
    {
      "budgetId": "budget-uuid",
      "totalBudget": 1000000.00,
      "totalActual": 850000.00,
      "totalVariance": 150000.00,
      "percentComplete": 85.0,
      "lineItems": [
        {
          "costCode": "03-11-00",
          "description": "Concrete Formwork",
          "budgeted": 50000.00,
          "actual": 48000.00,
          "variance": 2000.00,
          "percentVariance": 4.0
        },
        ...
      ]
    }
    ```

---

## 9. Patterns, Conventions & Best Practices

### Decorators

Builder API makes extensive use of decorators for clean, declarative code.

#### **NestJS HTTP Decorators**

```typescript
@Controller('projects')  // Route prefix
@Get()                   // GET method
@Post()                  // POST method
@Put(':id')              // PUT with param
@Patch(':id')            // PATCH with param
@Delete(':id')           // DELETE with param
@HttpCode(HttpStatus.CREATED)  // Set status code
```

#### **Parameter Extraction Decorators**

```typescript
@Param('id') id: string              // Route param
@Query('page') page: number          // Query string
@Body() dto: CreateProjectDto        // Request body
@Headers('authorization') auth: string  // Header
@Req() req: Request                  // Full request object
@Res() res: Response                 // Full response object
```

#### **Custom Decorators**

**@CurrentUser() - Extract authenticated user** (src/common/decorators/current-user.decorator.ts):

```typescript
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

// Usage:
@Get('profile')
@UseGuards(JwtAuthGuard)
async getProfile(@CurrentUser() user: User) {
  return user;
}

// Or extract specific field:
@Post('projects')
@UseGuards(JwtAuthGuard)
async create(@Body() dto: CreateProjectDto, @CurrentUser('id') userId: string) {
  return this.projectService.create(dto, userId);
}
```

**@Log() - Automatic method logging** (src/common/logging/decorators/log.decorator.ts):

```typescript
@Log()
async createProject(dto: CreateProjectDto, userId: string): Promise<ProjectResponseDto> {
  // Method entry, exit, duration, and errors automatically logged
}
```

#### **Swagger/OpenAPI Decorators**

```typescript
@ApiTags('Projects')                           // Group endpoints
@ApiBearerAuth()                               // JWT auth required
@ApiOperation({ summary: 'Create project' })   // Endpoint description
@ApiResponse({ status: 201, type: ProjectResponseDto })  // Response schema
@ApiParam({ name: 'id', type: 'string' })      // Path parameter
@ApiQuery({ name: 'page', type: 'number' })    // Query parameter
```

#### **TypeORM Entity Decorators**

```typescript
@Entity('projects')                  // Table name
@PrimaryGeneratedColumn('uuid')      // UUID primary key
@Column({ type: 'varchar', length: 255 })  // String column
@Column({ type: 'enum', enum: ProjectStatus })  // Enum column
@Column({ type: 'jsonb' })           // JSONB column
@Column({ type: 'decimal', precision: 10, scale: 2 })  // Decimal
@CreateDateColumn()                  // Auto-created timestamp
@UpdateDateColumn()                  // Auto-updated timestamp
@Index('IDX_projects_organization')  // Index
@ManyToOne(() => Organization)       // Many-to-one relationship
@OneToMany(() => Project)            // One-to-many relationship
@JoinColumn({ name: 'organization_id' })  // FK column name
@BeforeInsert()                      // Lifecycle hook
@VersionColumn()                     // Optimistic locking
```

#### **Validation Decorators (class-validator)**

```typescript
@IsString()
@IsNotEmpty()
@MaxLength(255)
name: string;

@IsUUID()
organizationId: string;

@IsEnum(ProjectType)
type: ProjectType;

@IsDateString()
@IsOptional()
startDate?: string;

@IsNumber()
@Min(0)
@Max(100)
percentComplete: number;

@IsEmail()
email: string;

@IsLatitude()
latitude: number;

@IsLongitude()
longitude: number;

@ValidateNested()
@Type(() => AddressDto)
address: AddressDto;

@Matches(/^[A-Z0-9-]+$/)
projectNumber: string;
```

### Guards

Guards control access to routes.

#### **JWT Authentication Guard**

```typescript
// Protect a route
@UseGuards(JwtAuthGuard)
@Get('profile')
async getProfile(@CurrentUser() user: User) {
  return user;
}

// Protect entire controller
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectController {
  // All routes require authentication
}
```

#### **How JWT Guard Works**

1. Extracts token from `Authorization: Bearer <token>` header
2. Passport `jwt.strategy.ts` validates token:
   - Signature valid (using `JWT_SECRET`)
   - Not expired
   - User ID in payload
3. Loads user from database:
   ```typescript
   const user = await this.userRepo.findOne({ where: { id: payload.sub, isActive: true } });
   if (!user) throw new UnauthorizedException();
   ```
4. Attaches user to `request.user`
5. If any step fails → `401 Unauthorized`

#### **Custom Guards (Not Yet Implemented)**

```typescript
// Example: Require ORG_ADMIN role
@UseGuards(JwtAuthGuard, OrgAdminGuard)
@Delete('organizations/:id')
async deleteOrg(@Param('id') id: string) {
  // Only ORG_ADMIN can delete
}
```

### Interceptors

Interceptors wrap request/response handling for cross-cutting concerns.

#### **Global Logging Interceptor**

Configured in `main.ts`:

```typescript
app.useGlobalInterceptors(new LoggingInterceptor());
```

Logs every request/response with:
- Correlation ID
- Request ID
- Method, URL, status code
- Duration
- Error stack trace (if error)

Skips health check endpoints (configurable).

#### **Global Serialization Interceptor**

```typescript
app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
```

Transforms entities to DTOs:
- Applies `@Exclude()` decorators (removes password field)
- Applies `@Expose()` decorators
- Applies `@Transform()` decorators

### Pipes

Pipes transform and validate input.

#### **Global Validation Pipe**

Configured in `main.ts`:

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,              // Strip non-whitelisted properties
    forbidNonWhitelisted: true,   // Throw error if non-whitelisted properties present
    transform: true,              // Auto-transform to DTO class instances
    transformOptions: {
      enableImplicitConversion: true,  // Auto-convert types (string "5" → number 5)
    },
  })
);
```

**What this does:**

- **Validates DTOs** using `class-validator` decorators
- **Strips extra properties** not defined in DTO (security)
- **Transforms** plain objects to class instances
- **Auto-converts types** (e.g., query params are strings, but converts to numbers if DTO expects number)

**Example:**

```typescript
// DTO
export class CreateProjectDto {
  @IsString()
  name: string;

  @IsNumber()
  squareFootage: number;
}

// Request: POST /projects
{
  "name": "My Project",
  "squareFootage": "5000",  // String
  "maliciousField": "hack"   // Not in DTO
}

// After ValidationPipe:
{
  "name": "My Project",
  "squareFootage": 5000,  // Converted to number
  // "maliciousField" stripped
}
```

### DTOs (Data Transfer Objects)

DTOs define the shape of data for requests and responses.

#### **DTO Naming Conventions**

- `create-[resource].dto.ts` - For POST requests (creation)
- `update-[resource].dto.ts` - For PUT/PATCH requests (updates)
- `[resource]-response.dto.ts` - For responses
- `[resource]-query.dto.ts` - For query parameters (pagination, filtering)

#### **Example: Create DTO**

```typescript
export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsUUID()
  organizationId!: string;

  @IsEnum(ProjectType)
  @IsOptional()
  type?: ProjectType;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  address?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  squareFootage?: number;
}
```

#### **Example: Update DTO (Partial)**

```typescript
export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  // All fields from CreateProjectDto, but all optional
}

// Or manually:
export class UpdateProjectDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;
}
```

#### **Example: Response DTO**

```typescript
export class ProjectResponseDto {
  id: string;
  number: string;
  name: string;
  organizationId: string;
  type: ProjectType;
  status: ProjectStatus;
  address?: string;
  city?: string;
  state?: string;
  startDate?: string;
  endDate?: string;
  createdAt: Date;
  createdBy: string;

  constructor(entity: Project) {
    this.id = entity.id;
    this.number = entity.number;
    this.name = entity.name;
    // ... map all fields
  }
}
```

#### **Example: Query DTO (Pagination)**

```typescript
export class ProjectQueryDto {
  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @IsString()
  @IsOptional()
  search?: string;
}
```

### Services

#### **Service Patterns**

1. **Constructor Injection:**
   ```typescript
   constructor(
     @InjectRepository(Project)
     private readonly projectRepo: Repository<Project>,
     private readonly orgService: OrganizationService,
   ) {}
   ```

2. **Logger per Service:**
   ```typescript
   private readonly logger = new Logger(ProjectService.name);
   ```

3. **Throw NestJS Exceptions:**
   ```typescript
   throw new NotFoundException(`Project ${id} not found`);
   throw new ConflictException('Project number already exists');
   throw new BadRequestException('Invalid date range');
   throw new UnauthorizedException('Insufficient permissions');
   throw new InternalServerErrorException('Database error');
   ```

4. **Return DTOs, Not Entities:**
   ```typescript
   async findOne(id: string): Promise<ProjectResponseDto> {
     const project = await this.projectRepo.findOne({ where: { id } });
     if (!project) throw new NotFoundException();
     return new ProjectResponseDto(project);  // Transform to DTO
   }
   ```

5. **Use Transactions for Multi-Step Operations:**
   ```typescript
   await this.connection.transaction(async (manager) => {
     await manager.save(Project, project);
     await manager.save(ProjectMember, membership);
   });
   ```

### Controllers

#### **Controller Patterns**

1. **Route Prefix:**
   ```typescript
   @Controller('api/v1/projects')
   ```

2. **Apply Guards:**
   ```typescript
   @UseGuards(JwtAuthGuard)
   @Controller('projects')
   ```

3. **Swagger Documentation:**
   ```typescript
   @ApiTags('Projects')
   @ApiBearerAuth()
   @Controller('projects')
   export class ProjectController {
     @Post()
     @ApiOperation({ summary: 'Create a new project' })
     @ApiResponse({ status: 201, type: ProjectResponseDto })
     async create(...) { ... }
   }
   ```

4. **Extract User:**
   ```typescript
   @Post()
   @UseGuards(JwtAuthGuard)
   async create(
     @Body() dto: CreateProjectDto,
     @CurrentUser('id') userId: string,
   ) {
     return this.projectService.create(dto, userId);
   }
   ```

5. **Delegate to Services:**
   ```typescript
   // ✅ Good
   @Get(':id')
   async findOne(@Param('id') id: string) {
     return this.projectService.findOne(id);
   }

   // ❌ Bad (business logic in controller)
   @Get(':id')
   async findOne(@Param('id') id: string) {
     const project = await this.projectRepo.findOne({ where: { id } });
     if (!project) throw new NotFoundException();
     return project;
   }
   ```

### Entities

#### **Entity Patterns**

1. **UUID Primary Keys:**
   ```typescript
   @PrimaryGeneratedColumn('uuid')
   id!: string;
   ```

2. **Enum Columns:**
   ```typescript
   @Column({ type: 'enum', enum: ProjectStatus, default: ProjectStatus.BIDDING })
   status!: ProjectStatus;
   ```

3. **JSONB for Flexible Data:**
   ```typescript
   @Column({ type: 'jsonb', nullable: true })
   customFields?: Record<string, any>;
   ```

4. **Timestamps:**
   ```typescript
   @CreateDateColumn({ name: 'created_at' })
   createdAt!: Date;

   @UpdateDateColumn({ name: 'updated_at' })
   updatedAt!: Date;
   ```

5. **Soft Deletes:**
   ```typescript
   @Column({ name: 'deleted_at', nullable: true })
   deletedAt?: Date;
   ```

6. **Indexes on Frequently Queried Columns:**
   ```typescript
   @Index('IDX_projects_organization', ['organizationId'])
   @Index('IDX_projects_status', ['status'])
   ```

7. **Foreign Keys:**
   ```typescript
   @ManyToOne(() => Organization, (org) => org.projects)
   @JoinColumn({ name: 'organization_id' })
   organization!: Organization;

   @Column({ type: 'uuid', name: 'organization_id' })
   organizationId!: string;
   ```

8. **Computed Properties (Getters):**
   ```typescript
   get fullName(): string {
     return `${this.firstName} ${this.lastName}`;
   }

   @Expose()  // Include in JSON serialization
   get name(): string {
     return this.fullName;
   }
   ```

9. **Lifecycle Hooks:**
   ```typescript
   @BeforeInsert()
   normalizeEmail(): void {
     if (this.email) {
       this.email = this.email.toLowerCase().trim();
     }
   }
   ```

10. **Security: Exclude Sensitive Fields:**
    ```typescript
    @Column({ type: 'varchar', select: false })  // Don't select by default
    @Exclude()  // Don't serialize
    password!: string;
    ```

11. **Optimistic Locking:**
    ```typescript
    @VersionColumn()
    version!: number;
    ```

### Error Handling

#### **Service Layer: Throw NestJS Exceptions**

```typescript
if (!project) {
  throw new NotFoundException(`Project ${id} not found`);
}

if (existingProject) {
  throw new ConflictException(`Project number ${number} already exists`);
}

if (!user.isSystemAdmin()) {
  throw new ForbiddenException('Insufficient permissions');
}

if (invalidData) {
  throw new BadRequestException('Invalid input data');
}
```

#### **Logging Errors with Context**

```typescript
try {
  await this.repository.save(entity);
} catch (error) {
  this.logger.error('Failed to save entity', error, { entityId: entity.id });
  throw new InternalServerErrorException('Database error');
}
```

#### **Don't Leak Sensitive Info**

```typescript
// ❌ Bad - Leaks database details
throw new InternalServerErrorException(`Database error: ${error.message}`);

// ✅ Good - Generic error, log details server-side
this.logger.error('Database error', error);
throw new InternalServerErrorException('An error occurred');
```

### Security Best Practices

#### **1. Never Log Sensitive Data**

Logging service automatically redacts:
- password
- token
- secret
- apiKey

```typescript
// Safe - password will be redacted
this.logger.log('User login', { email, password });  // Logs: { email, password: '[REDACTED]' }
```

#### **2. Always Validate Input**

Use DTOs with `class-validator` decorators:

```typescript
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase, and number',
  })
  password: string;
}
```

Global validation pipe enabled (whitelist + forbidNonWhitelisted).

#### **3. Protect Routes with Guards**

```typescript
@UseGuards(JwtAuthGuard)
@Get('profile')
async getProfile(@CurrentUser() user: User) {
  return user;
}
```

#### **4. Check Permissions in Services**

```typescript
async delete(projectId: string, userId: string): Promise<void> {
  // Check if user is PROJECT_ADMIN
  const member = await this.memberRepo.findOne({
    where: { projectId, userId, role: ProjectRole.PROJECT_ADMIN },
  });
  if (!member) {
    throw new ForbiddenException('Only project admins can delete projects');
  }

  await this.projectRepo.delete(projectId);
}
```

#### **5. S3 Security: Quarantine → Production**

Files uploaded to quarantine bucket first. Only moved to production after virus scan passes.

```typescript
// Upload to quarantine
const presignedUrl = await this.s3Service.getPresignedPutUrl(
  process.env.S3_QUARANTINE_BUCKET,
  s3Key
);

// After virus scan passes
await this.s3Service.moveFromQuarantineToProduction(s3Key);
```

#### **6. Rate Limiting**

```typescript
// Throttle decorator
@Throttle({ refresh: { limit: 10, ttl: 60000 } })
@Post('refresh')
async refresh(...) { ... }
```

Login rate limiting handled in `auth.service.ts` (5 attempts per 15 min).

#### **7. Password Hashing**

```typescript
const hashedPassword = await bcrypt.hash(password, 12);  // 12 rounds
```

#### **8. Token Rotation**

Refresh tokens rotated on every use. Old token marked as revoked (with grace period).

#### **9. SQL Injection Prevention**

TypeORM uses parameterized queries:

```typescript
// ✅ Safe - parameterized
const user = await this.userRepo.findOne({ where: { email } });

// ❌ Unsafe - string concatenation
const user = await this.userRepo.query(`SELECT * FROM users WHERE email = '${email}'`);
```

---

## 10. Testing Strategy

Builder API has comprehensive unit tests using Jest.

### Test Organization

- **Location:** Tests are co-located with source code in `__tests__/` directories
- **Naming:** `*.spec.ts` (e.g., `auth.service.spec.ts`)
- **Types:** Unit tests (services, entities), integration tests, E2E tests

### Running Tests

```bash
# All unit tests
npm run test:unit

# All integration tests
npm run test:integration

# All E2E tests
npm run test:e2e

# All tests
npm run test:all

# With coverage
npm run test:cov

# Watch mode
npm run test:watch

# Specific file
npm test -- auth.service.spec.ts
```

### Test Structure

Tests follow the **Arrange-Act-Assert** pattern:

```typescript
describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    // Create mock repository
    const mockRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    // Create testing module
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      const dto = { email: 'test@example.com', password: 'Pass123!', ... };
      userRepository.findOne.mockResolvedValue(null);  // Email doesn't exist
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);

      // Act
      const result = await service.register(dto);

      // Assert
      expect(result).toBeDefined();
      expect(result.email).toBe(dto.email);
      expect(result).not.toHaveProperty('password');
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: dto.email.toLowerCase() },
      });
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if email exists', async () => {
      // Arrange
      const dto = { email: 'test@example.com', password: 'Pass123!', ... };
      userRepository.findOne.mockResolvedValue(mockUser);  // Email exists

      // Act & Assert
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });
  });
});
```

### Mocking

#### **Mock TypeORM Repositories**

```typescript
const mockRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
};

// Provide in testing module
{
  provide: getRepositoryToken(User),
  useValue: mockRepository,
}
```

#### **Mock External Libraries**

```typescript
// Mock bcrypt
jest.mock('bcrypt');
(bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$hashedpassword');
(bcrypt.compare as jest.Mock).mockResolvedValue(true);
```

#### **Mock Services**

```typescript
const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  getUserById: jest.fn(),
};

// Provide in testing module
{
  provide: AuthService,
  useValue: mockAuthService,
}
```

### Example: Service Test

From `src/modules/auth/__tests__/auth.service.spec.ts:82-92`:

```typescript
it('should register a new user successfully', async () => {
  const result = await service.register(mockRegisterDto);

  expect(result).toBeDefined();
  expect(result.email).toBe(mockRegisterDto.email);
  expect(result.firstName).toBe(mockRegisterDto.firstName);
  expect(result.lastName).toBe(mockRegisterDto.lastName);
  expect(result.phoneNumber).toBe(mockRegisterDto.phoneNumber);
  expect(result.role).toBe('user');
  expect(result).not.toHaveProperty('password');
});
```

### Test Coverage

The project aims for high test coverage:

- Unit tests for all services
- Unit tests for complex entities (with methods)
- Controller tests (mocking services)
- Integration tests for complex workflows
- E2E tests for critical user flows

Run coverage report:

```bash
npm run test:cov
```

Coverage report generated in `coverage/` directory.

---

## 11. How to Add a New Feature

Let's walk through adding a new feature: **Add a "favorite projects" feature for users**.

### Step 1: Plan the Feature

**Requirements:**
- Users can mark projects as favorites
- Users can list their favorite projects
- Users can remove projects from favorites

**Data Model:**
- New entity: `UserFavoriteProject`
- Fields: `id`, `userId`, `projectId`, `createdAt`
- Unique constraint: (userId, projectId)

**Endpoints:**
- `POST /api/v1/users/me/favorites/:projectId` - Add favorite
- `DELETE /api/v1/users/me/favorites/:projectId` - Remove favorite
- `GET /api/v1/users/me/favorites` - List favorites

### Step 2: Create the Entity

Create `src/modules/users/entities/user-favorite-project.entity.ts`:

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Project } from '../../projects/entities/project.entity';

@Entity('user_favorite_projects')
@Index('IDX_user_favorite_project_unique', ['userId', 'projectId'], { unique: true })
export class UserFavoriteProject {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
```

### Step 3: Create DTOs

Create `src/modules/users/dto/user-favorite-response.dto.ts`:

```typescript
import { UserFavoriteProject } from '../entities/user-favorite-project.entity';
import { ProjectResponseDto } from '../../projects/dto/project-response.dto';

export class UserFavoriteResponseDto {
  id: string;
  projectId: string;
  project?: ProjectResponseDto;
  createdAt: Date;

  constructor(entity: UserFavoriteProject) {
    this.id = entity.id;
    this.projectId = entity.projectId;
    if (entity.project) {
      this.project = new ProjectResponseDto(entity.project);
    }
    this.createdAt = entity.createdAt;
  }
}
```

### Step 4: Create the Service

Create `src/modules/users/services/user-favorite.service.ts`:

```typescript
import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserFavoriteProject } from '../entities/user-favorite-project.entity';
import { Project } from '../../projects/entities/project.entity';
import { UserFavoriteResponseDto } from '../dto/user-favorite-response.dto';

@Injectable()
export class UserFavoriteService {
  private readonly logger = new Logger(UserFavoriteService.name);

  constructor(
    @InjectRepository(UserFavoriteProject)
    private readonly favoriteRepo: Repository<UserFavoriteProject>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  async addFavorite(userId: string, projectId: string): Promise<UserFavoriteResponseDto> {
    this.logger.log(`Adding favorite: user=${userId}, project=${projectId}`);

    // Validate project exists
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    // Check if already favorited
    const existing = await this.favoriteRepo.findOne({
      where: { userId, projectId },
    });
    if (existing) {
      throw new ConflictException('Project already favorited');
    }

    // Create favorite
    const favorite = this.favoriteRepo.create({ userId, projectId });
    const saved = await this.favoriteRepo.save(favorite);

    this.logger.log(`Favorite added: ${saved.id}`);
    return new UserFavoriteResponseDto(saved);
  }

  async removeFavorite(userId: string, projectId: string): Promise<void> {
    this.logger.log(`Removing favorite: user=${userId}, project=${projectId}`);

    const favorite = await this.favoriteRepo.findOne({
      where: { userId, projectId },
    });
    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    await this.favoriteRepo.delete(favorite.id);
    this.logger.log(`Favorite removed: ${favorite.id}`);
  }

  async listFavorites(userId: string): Promise<UserFavoriteResponseDto[]> {
    this.logger.log(`Listing favorites for user: ${userId}`);

    const favorites = await this.favoriteRepo.find({
      where: { userId },
      relations: ['project'],
      order: { createdAt: 'DESC' },
    });

    return favorites.map(fav => new UserFavoriteResponseDto(fav));
  }
}
```

### Step 5: Create the Controller

Create `src/modules/users/controllers/user-favorite.controller.ts`:

```typescript
import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserFavoriteService } from '../services/user-favorite.service';
import { UserFavoriteResponseDto } from '../dto/user-favorite-response.dto';

@ApiTags('User Favorites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/users/me/favorites')
export class UserFavoriteController {
  constructor(private readonly favoriteService: UserFavoriteService) {}

  @Post(':projectId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add project to favorites' })
  @ApiResponse({ status: 201, type: UserFavoriteResponseDto })
  async addFavorite(
    @Param('projectId') projectId: string,
    @CurrentUser('id') userId: string,
  ): Promise<UserFavoriteResponseDto> {
    return this.favoriteService.addFavorite(userId, projectId);
  }

  @Delete(':projectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove project from favorites' })
  @ApiResponse({ status: 204 })
  async removeFavorite(
    @Param('projectId') projectId: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.favoriteService.removeFavorite(userId, projectId);
  }

  @Get()
  @ApiOperation({ summary: 'List favorite projects' })
  @ApiResponse({ status: 200, type: [UserFavoriteResponseDto] })
  async listFavorites(
    @CurrentUser('id') userId: string,
  ): Promise<UserFavoriteResponseDto[]> {
    return this.favoriteService.listFavorites(userId);
  }
}
```

### Step 6: Update the Module

Update `src/modules/users/users.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserFavoriteProject } from './entities/user-favorite-project.entity';
import { Project } from '../projects/entities/project.entity';
import { UserFavoriteService } from './services/user-favorite.service';
import { UserFavoriteController } from './controllers/user-favorite.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserFavoriteProject, Project]),
  ],
  providers: [UserFavoriteService],
  controllers: [UserFavoriteController],
  exports: [UserFavoriteService],
})
export class UsersModule {}
```

### Step 7: Create a Migration

```bash
npm run migration:generate -- src/migrations/AddUserFavoriteProjects
```

Review generated migration, then run:

```bash
npm run migration:run
```

### Step 8: Write Tests

Create `src/modules/users/services/__tests__/user-favorite.service.spec.ts`:

```typescript
describe('UserFavoriteService', () => {
  let service: UserFavoriteService;
  let favoriteRepo: jest.Mocked<Repository<UserFavoriteProject>>;
  let projectRepo: jest.Mocked<Repository<Project>>;

  beforeEach(async () => {
    // ... setup mocks

    const module = await Test.createTestingModule({
      providers: [
        UserFavoriteService,
        { provide: getRepositoryToken(UserFavoriteProject), useValue: mockFavoriteRepo },
        { provide: getRepositoryToken(Project), useValue: mockProjectRepo },
      ],
    }).compile();

    service = module.get(UserFavoriteService);
    // ...
  });

  describe('addFavorite', () => {
    it('should add a project to favorites', async () => {
      // Arrange
      projectRepo.findOne.mockResolvedValue(mockProject);
      favoriteRepo.findOne.mockResolvedValue(null);
      favoriteRepo.create.mockReturnValue(mockFavorite);
      favoriteRepo.save.mockResolvedValue(mockFavorite);

      // Act
      const result = await service.addFavorite(userId, projectId);

      // Assert
      expect(result).toBeDefined();
      expect(result.projectId).toBe(projectId);
      expect(favoriteRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if project not found', async () => {
      projectRepo.findOne.mockResolvedValue(null);
      await expect(service.addFavorite(userId, projectId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if already favorited', async () => {
      projectRepo.findOne.mockResolvedValue(mockProject);
      favoriteRepo.findOne.mockResolvedValue(mockFavorite);
      await expect(service.addFavorite(userId, projectId)).rejects.toThrow(ConflictException);
    });
  });

  // ... more tests
});
```

### Step 9: Test Manually

```bash
# Start dev server
npm run start:dev

# Login to get access token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bobbuilder.com","password":"Admin123!"}'

# Add favorite
curl -X POST http://localhost:3000/api/v1/users/me/favorites/{projectId} \
  -H "Authorization: Bearer <access-token>"

# List favorites
curl -X GET http://localhost:3000/api/v1/users/me/favorites \
  -H "Authorization: Bearer <access-token>"

# Remove favorite
curl -X DELETE http://localhost:3000/api/v1/users/me/favorites/{projectId} \
  -H "Authorization: Bearer <access-token>"
```

### Step 10: Document the Feature

Update relevant documentation:
- API docs (automatically via Swagger)
- Changelog (`CHANGELOG.md`)
- README if user-facing

---

## 12. Deployment, Environments & Configuration

### Environment Variables

Configuration is managed via environment variables (`.env` file in development).

**Key Variables:**

```bash
# Application
NODE_ENV=development          # development, production, test
PORT=3000                     # Server port
API_PREFIX=api                # API route prefix (e.g., /api/v1/...)

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=builder_api
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false                  # Enable SSL for production
DB_SYNCHRONIZE=true           # Auto-sync schema (dev only, use migrations in prod)
DB_LOGGING=false              # Log SQL queries

# JWT
JWT_SECRET=your-secret-key    # Change in production
JWT_EXPIRATION=15m            # Access token expiry
REFRESH_TOKEN_EXPIRATION=7d   # Refresh token expiry

# Redis
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=debug               # debug, info, warn, error

# Rate Limiting
RATE_LIMIT_WINDOW=900000      # 15 minutes in ms
RATE_LIMIT_MAX=100            # Max requests per window

# AWS S3
AWS_REGION=us-east-1
AWS_S3_BUCKET=builder-api-documents
AWS_S3_QUARANTINE_BUCKET=builder-api-quarantine
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
USE_MOCK_S3=true              # Use mock S3 for local dev (stores files locally)

# Elasticsearch
ELASTICSEARCH_NODE=http://localhost:9200

# Bull (Job Queues)
BULL_REDIS_URL=redis://localhost:6379

# QuickBooks
QUICKBOOKS_CLIENT_ID=your-client-id
QUICKBOOKS_CLIENT_SECRET=your-client-secret
QUICKBOOKS_REDIRECT_URI=http://localhost:3000/api/integrations/quickbooks/callback
QUICKBOOKS_ENVIRONMENT=sandbox  # sandbox or production
```

### Configuration Service

Configuration is centralized in `src/config/configuration.ts`:

```typescript
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRATION || '15m',
  },
  // ... more config
});
```

Access config in services:

```typescript
import { ConfigService } from '@nestjs/config';

constructor(private readonly configService: ConfigService) {}

const jwtSecret = this.configService.get<string>('jwt.secret');
```

### Development Workflow

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Start database (if using Docker)
docker-compose up -d postgres redis

# Run migrations
npm run migration:run

# Seed data
npm run seed

# Start development server (hot reload)
npm run start:dev

# Run tests
npm run test:unit

# Lint
npm run lint

# Format
npm run format
```

### Building for Production

```bash
# Build TypeScript to JavaScript
npm run build

# Output in dist/ directory
ls dist/

# Run production server
npm run start:prod
```

### Database Migrations

**Generate Migration from Entity Changes:**

```bash
npm run migration:generate -- src/migrations/MigrationName
```

**Run Migrations:**

```bash
npm run migration:run
```

**Revert Last Migration:**

```bash
npm run migration:revert
```

**Show Migration Status:**

```bash
npm run migration:show
```

**Important:**
- Use `synchronize: true` in development (auto-syncs schema)
- Use migrations in production (disable `synchronize`)

### Deployment Strategy

**Docker:**

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/

EXPOSE 3000

CMD ["node", "dist/main"]
```

**Kubernetes:**

- Liveness probe: `GET /health`
- Readiness probe: `GET /health/db`

**CI/CD (GitHub Actions):**

1. Run tests (`npm run test:all`)
2. Build (`npm run build`)
3. Build Docker image
4. Push to container registry
5. Deploy to staging/production

---

## 13. Glossary

### Project-Specific Terms

| Term | Definition |
|------|------------|
| **Builder API** | The backend API for Bob the Builder construction management platform |
| **Organization** | A multi-tenant entity representing a construction company |
| **Project** | A construction project (e.g., building a hospital) |
| **Budget** | A project's financial plan with line items mapped to cost codes |
| **Commitment** | A subcontract or purchase order |
| **PCO** | Potential Change Order - A proposed change to the contract |
| **SOV** | Schedule of Values - Breakdown of contract amount for progress billing |
| **Pay App** | Payment Application - Monthly invoice from subcontractor |
| **Lien Waiver** | Legal document waiving right to file a lien (for payment) |
| **Cost Code** | Hierarchical code for categorizing costs (CSI MasterFormat) |
| **Submittal** | Vendor-provided product information for approval |
| **RFI** | Request for Information - Question about project documents |
| **Drawing** | Construction drawing (blueprints) |
| **Specification** | Written description of materials and workmanship |
| **Addendum** | Change to bid documents before contract award |
| **Deliverables Method** | How project is procured (Design-Bid-Build, Design-Build, etc.) |
| **System Role** | Platform-wide role (SYSTEM_ADMIN, USER) |
| **Organization Role** | Role within an organization (ORG_OWNER, ORG_ADMIN, ORG_MEMBER) |
| **Project Role** | Role within a project (PROJECT_ADMIN, PROJECT_MANAGER, SUPERINTENDENT, etc.) |

### Architectural Terms

| Term | Definition |
|------|------------|
| **NestJS** | TypeScript backend framework (built on Express) |
| **TypeORM** | Object-Relational Mapper for TypeScript |
| **DTO** | Data Transfer Object - Defines shape of data for requests/responses |
| **Entity** | Database model (TypeORM class mapped to table) |
| **Repository** | Data access layer (TypeORM pattern) |
| **Service** | Business logic layer |
| **Controller** | HTTP request handler (presentation layer) |
| **Guard** | Access control (authentication/authorization) |
| **Interceptor** | Request/response wrapper (logging, transformation) |
| **Pipe** | Input validation/transformation |
| **Middleware** | Request processing before routing |
| **Decorator** | TypeScript/NestJS annotation (e.g., @Get(), @Injectable()) |
| **Dependency Injection** | Design pattern for managing dependencies (NestJS IoC container) |
| **JWT** | JSON Web Token - Token-based authentication |
| **Refresh Token** | Long-lived token for obtaining new access tokens |
| **Access Token** | Short-lived token for API access (15 min) |
| **Token Rotation** | Security practice of issuing new tokens on refresh |
| **Presigned URL** | Time-limited URL for direct S3 upload/download |
| **Multipart Upload** | S3 feature for uploading large files in parts |
| **Quarantine Bucket** | S3 bucket for uploaded files before virus scan |
| **Production Bucket** | S3 bucket for clean, virus-scanned files |
| **Bull** | Job queue library for background processing |
| **Pino** | Structured logging library |
| **Correlation ID** | Unique ID for tracking requests across services |
| **Optimistic Locking** | Concurrency control using version numbers |
| **Soft Delete** | Marking records as deleted without removing from database |

### Database Terms

| Term | Definition |
|------|------------|
| **UUID** | Universally Unique Identifier (128-bit) |
| **Primary Key** | Unique identifier for a database record |
| **Foreign Key** | Reference to another table's primary key |
| **Index** | Database structure for fast lookups |
| **JSONB** | PostgreSQL's binary JSON type (flexible storage) |
| **Enum** | Enumeration type (restricted set of values) |
| **Migration** | Script for versioned schema changes |
| **Seed** | Script for populating database with test data |
| **Transaction** | Atomic group of database operations (all or nothing) |
| **Cascade** | Automatic deletion of related records |
| **Many-to-One** | Relationship where many records reference one record |
| **One-to-Many** | Relationship where one record has many related records |
| **Join Column** | Foreign key column in relationship |

### Testing Terms

| Term | Definition |
|------|------------|
| **Unit Test** | Test of a single unit (service, function) in isolation |
| **Integration Test** | Test of multiple units working together |
| **E2E Test** | End-to-end test of full user flow |
| **Mock** | Fake implementation for testing |
| **Stub** | Fake implementation with predefined responses |
| **Test Coverage** | Percentage of code executed by tests |
| **Arrange-Act-Assert** | Test pattern: set up → execute → verify |

---

## Congratulations!

You've completed the Builder API onboarding guide! You should now understand:

- ✅ The overall architecture and tech stack
- ✅ How modules are organized
- ✅ How controllers, services, and entities work together
- ✅ Key use cases and data flows
- ✅ Patterns and conventions used throughout the codebase
- ✅ How to test your code
- ✅ How to add a new feature

### Next Steps

1. **Set up your local environment:**
   - Clone the repo
   - Install dependencies (`npm install`)
   - Set up `.env` file
   - Run migrations (`npm run migration:run`)
   - Seed data (`npm run seed`)
   - Start dev server (`npm run start:dev`)

2. **Explore the code:**
   - Read existing controllers and services
   - Run the tests (`npm run test:unit`)
   - Make a small change and see it in action

3. **Build something:**
   - Pick a small feature from the backlog
   - Follow the "How to Add a New Feature" section
   - Submit a pull request

4. **Ask questions:**
   - Join the team's Slack channel
   - Reach out to senior developers
   - Review the docs (`docs/` directory)

### Helpful Resources

- **NestJS Docs:** https://docs.nestjs.com/
- **TypeORM Docs:** https://typeorm.io/
- **PostgreSQL Docs:** https://www.postgresql.org/docs/
- **JWT Docs:** https://jwt.io/
- **Swagger Docs:** https://swagger.io/

### Reference Links

- **GitHub Repo:** https://github.com/bobthebuilder/builder-api
- **Swagger UI:** http://localhost:3000/api/docs (when running locally)
- **Test Credentials:** See `docs/TEST_CREDENTIALS.md`
- **Permission Matrix:** See `docs/PERMISSION_MATRIX.md`

---

**Happy Coding! 🚀**

*Last Updated: December 2024*
