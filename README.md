# Builder API - Construction Management Backend

Enterprise-grade RESTful API for construction management built with NestJS. Production-ready platform with 18 modules, 84 controllers, 187+ services, and 500+ REST endpoints.

## 📊 Overview

**Technology Stack:**
- **Framework:** NestJS 11.1.8 (Node.js)
- **Database:** TypeORM 0.3.27 with PostgreSQL 14+
- **Authentication:** JWT with refresh token rotation (Passport.js)
- **File Storage:** AWS S3 integration
- **Background Jobs:** Scheduled task processing
- **Testing:** Jest + Supertest
- **Validation:** class-validator + class-transformer
- **Logging:** Pino (structured logging)

**Key Statistics:**
- **Modules:** 18 production modules
- **Controllers:** 84 REST controllers
- **Services:** 187+ business logic services
- **Entities:** 112 database entities
- **Endpoints:** 500+ API endpoints
- **Code Lines:** ~65,000+ lines
- **Test Coverage:** Unit + E2E tests

## 🚀 Quick Start

### Installation

```bash
# Clone and install
git clone https://github.com/bobthebuilder/builder-api.git
cd builder-api
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Database setup
npm run migration:run
npm run seed
```

### Development

```bash
# Start dev server (port 3000)
npm run start:dev

# Run tests
npm test                 # Unit tests
npm run test:e2e         # E2E tests
npm run test:cov         # Coverage report

# Database migrations
npm run migration:run    # Run migrations
npm run migration:revert # Revert last migration
npm run migration:generate -- -n Name  # Generate new
```

### Production

```bash
npm run build
npm run start:prod
```

## 🔐 Test Credentials

After seeding (`npm run seed`), you can login with:

**System Administrator:**
- Email: `admin@bobbuilder.com`
- Password: `Admin123!`

**Organization Owners:**
- Acme Construction: `john.doe@acme.com` / `Password123!`
- Summit Builders: `mike.johnson@summit.com` / `Password123!`
- Elite Properties: `david.brown@elite.com` / `Password123!`

**Quick Login Test:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bobbuilder.com","password":"Admin123!"}'
```

See [Test Credentials Documentation](./docs/TEST_CREDENTIALS.md) for complete user list and testing guide.

---

## 📦 Complete Module Reference

### 1. Authentication Module (`auth`)
**Purpose:** Secure user authentication and session management

**Controllers:** `AuthController`

**Key Endpoints:**
- `POST /auth/register` - User registration
- `POST /auth/login` - User login with JWT
- `POST /auth/refresh` - Refresh access token (rate limited)
- `POST /auth/logout` - Logout and revoke tokens
- `GET /auth/me` - Get current user profile

**Features:**
- JWT authentication with 15-minute access tokens
- Refresh token rotation with breach detection
- Failed login attempt tracking and rate limiting
- Token reuse detection with security alerts
- IP and user agent tracking
- Grace period handling for network reliability
- Global logout with token family revocation

**Entities:** `RefreshToken`, `FailedLoginAttempt`

---

### 2. Financial Management Module (`financials`)
**Purpose:** Complete construction financial management system

**27 Controllers:**
- `BudgetController` - Budget lifecycle management
- `BudgetLineItemController` - Budget line items with cost codes
- `CommitmentController` - Subcontracts & purchase orders
- `CommitmentItemController` - Commitment line items (SOV)
- `CommitmentDocumentController` - Contract documents
- `CommitmentChangeOrderController` - CCOs
- `OwnerChangeOrderController` - OCOs
- `PotentialChangeOrderController` - PCOs
- `ChangeOrderController` - General change order operations
- `ChangeOrderPackageController` - Change order packages
- `CostCodeController` - Cost code management (CSI MasterFormat)
- `CostEntryController` - Cost entry tracking
- `CostPeriodController` - Cost period management
- `CostTransferController` - Transfer costs between line items
- `AccrualController` - Accrual tracking
- `ScheduleOfValuesController` - SOV management
- `PaymentApplicationController` - Payment applications (AIA G702/G703)
- `LienWaiverController` - Lien waiver tracking
- `ApprovalThresholdController` - Approval limit configuration
- `ReportController` - Financial reports (30+ types)
- `ReportScheduleController` - Scheduled report automation
- `CustomReportController` - Custom report builder
- `FinancialDashboardController` - Dashboard with 12 endpoints

**Key Endpoints (Budget):**
- `POST /projects/:projectId/budgets/import` - Import from Excel/CSV
- `POST /projects/:projectId/budgets` - Create budget
- `GET /projects/:projectId/budgets` - List budgets
- `GET /projects/:projectId/budgets/:id` - Get budget details
- `PUT /projects/:projectId/budgets/:id` - Update budget
- `POST /projects/:projectId/budgets/:id/clone` - Clone budget
- `POST /projects/:projectId/budgets/:id/lock` - Lock budget
- `POST /projects/:projectId/budgets/:id/snapshots` - Create snapshot
- `GET /projects/:projectId/budgets/:id/summary` - Budget summary
- `GET /projects/:projectId/budgets/:id/variance` - Variance analysis
- `GET /projects/:projectId/budgets/:id/export` - Export to Excel/CSV

**Key Endpoints (Commitments):**
- `POST /projects/:projectId/commitments` - Create commitment
- `GET /projects/:projectId/commitments` - List commitments
- `POST /projects/:projectId/commitments/:id/submit` - Submit for approval
- `POST /projects/:projectId/commitments/:id/approve` - Approve commitment
- `POST /projects/:projectId/commitments/:id/activate` - Activate commitment

**Key Endpoints (Change Orders):**
- `POST /projects/:projectId/change-orders/pcos` - Create PCO
- `POST /projects/:projectId/change-orders/pcos/:id/convert` - Convert PCO to OCO
- `POST /projects/:projectId/change-orders/ocos` - Create OCO
- `POST /projects/:projectId/change-orders/ccos` - Create CCO
- Change order approval workflows
- Package management for bundling COs

**Key Endpoints (Financial Dashboard):**
- `GET /projects/:projectId/financials/dashboard` - Complete dashboard
- `GET /projects/:projectId/financials/dashboard/kpis` - Financial KPIs
- `GET /projects/:projectId/financials/dashboard/earned-value` - EVM metrics
- `GET /projects/:projectId/financials/dashboard/wip` - WIP status
- `GET /projects/:projectId/financials/dashboard/cash-flow` - Cash flow data
- `GET /projects/:projectId/financials/dashboard/cost-trend` - Cost trends
- `GET /projects/:projectId/financials/dashboard/commitment-status` - Status summary
- `GET /projects/:projectId/financials/dashboard/pending-actions` - Action items
- `GET /projects/:projectId/financials/dashboard/alerts` - Financial alerts

**Features:**
- Multi-version budget management with snapshots
- Excel/CSV import and export
- Budget locking and activation workflows
- Variance analysis and contingency tracking
- Cost code management (CSI MasterFormat)
- Three types of change orders: PCO, OCO, CCO
- Change order approval workflows with thresholds
- Schedule of Values (SOV) management
- Payment application generation (AIA forms)
- Lien waiver tracking
- 30+ financial report types (variance, aging, WIP, cash flow, etc.)
- Report scheduling and automation
- Financial dashboard with earned value management
- Real-time KPI calculations
- Cash flow projections

**Entities:** 45+ entities including `Budget`, `BudgetLineItem`, `Commitment`, `CommitmentItem`, `PotentialChangeOrder`, `OwnerChangeOrder`, `CommitmentChangeOrder`, `CostCode`, `CostEntry`, `PaymentApplication`, `ScheduleOfValues`, `LienWaiver`, etc.

---

### 3. Document Management Module (`documents`)
**Purpose:** Comprehensive document management and control system

**15 Controllers:**
- `DocumentController` - Core document operations
- `DocumentUploadController` - File upload handling
- `DocumentSimpleUploadController` - Simple upload interface
- `VersionControlController` - Version management
- `DrawingController` - Drawing management
- `DrawingSetController` - Drawing set management
- `SpecificationController` - Specifications (CSI MasterFormat)
- `AddendumController` - Addendum tracking
- `TransmittalController` - Document transmittals
- `SearchController` - Document search
- `SavedSearchController` - Saved search management
- `ActivityController` - Document activity logs
- `PermissionController` - Document permissions
- `ShareLinkController` - Share link generation
- `ProjectMemberController` - Project member management

**Features:**
- Multi-version document storage with S3 integration
- Hierarchical folder structure
- Advanced version control with branching
- Drawing and drawing set management
- Drawing revisions and cross-references
- Specification management (CSI MasterFormat)
- Product tracking within specs
- Addendum creation and tracking
- Transmittal workflow with distribution lists
- Advanced search with filters and facets
- Saved searches with notifications
- Document permissions and access control
- Share links with expiration
- Activity tracking and audit logs
- Watermarking capability
- Document locking for collaborative editing

**Background Jobs:**
- `IndexSyncJob` - Search index synchronization
- `UploadCleanupJob` - Cleanup failed uploads
- `LockExpirationJob` - Expire stale locks
- `AlertProcessingJob` - Process document alerts

**Entities:** 40+ entities including `Document`, `DocumentVersion`, `Drawing`, `DrawingRevision`, `DrawingSet`, `Specification`, `Addendum`, `Transmittal`, `DistributionList`, `SavedSearch`, `ShareLink`, etc.

---

### 4. Submittals Module (`submittals`)
**Purpose:** Construction submittal management and workflow

**2 Controllers:**
- `SubmittalController` - Submittal lifecycle management
- `SubmittalWorkflowController` - Workflow engine

**Key Endpoints:**
- `POST /projects/:projectId/submittals` - Create submittal
- `GET /projects/:projectId/submittals` - List submittals
- `GET /projects/:projectId/submittals/register` - Register view
- `GET /projects/:projectId/submittals/:id` - Get submittal details
- `PUT /projects/:projectId/submittals/:id` - Update submittal
- `POST /projects/:projectId/submittals/:id/submit` - Submit for review
- `POST /projects/:projectId/submittals/:id/respond` - Respond (approve/reject)
- `POST /projects/:projectId/submittals/:id/revisions` - Create revision
- `POST /projects/:projectId/submittals/:id/close` - Close submittal
- `POST /projects/:projectId/submittals/:id/void` - Void submittal

**Features:**
- Complete submittal lifecycle (draft → submitted → reviewed → approved/rejected → closed)
- Automatic numbering (e.g., S-001)
- Multi-revision tracking
- Approval workflow with response tracking
- Lead time analysis
- Distribution lists
- Spec section tracking (CSI MasterFormat)
- Due date management and alerts
- Submittal register view
- Item-level tracking within submittals
- Document attachments
- Manufacturer and product information

**Entities:** `Submittal`, `SubmittalItem`, `SubmittalRevision`, `SubmittalResponse`, `SubmittalHistory`, `SubmittalWorkflowStep`

---

### 5. RFIs Module (`rfis`)
**Purpose:** Request for Information (RFI) management

**1 Controller:** `RfiController`

**Key Endpoints:**
- `POST /projects/:projectId/rfis` - Create RFI
- `GET /projects/:projectId/rfis` - List RFIs
- `GET /projects/:projectId/rfis/:id` - Get RFI details
- `PUT /projects/:projectId/rfis/:id` - Update RFI
- `POST /projects/:projectId/rfis/:id/open` - Open/send RFI
- `POST /projects/:projectId/rfis/:id/responses` - Add response
- `POST /projects/:projectId/rfis/:id/close` - Close RFI
- `POST /projects/:projectId/rfis/:id/void` - Void RFI
- `POST /projects/:projectId/rfis/:id/references` - Add document reference

**Features:**
- RFI lifecycle management (draft → open → closed → void)
- Automatic numbering
- Response tracking with multiple responses
- Document reference linking
- Due date tracking and alerts
- Cost and schedule impact tracking
- Priority levels
- Status history and audit trail

**Entities:** `Rfi`, `RfiResponse`, `RfiHistory`, `RfiReference`

---

### 6. Analytics Module (`analytics`)
**Purpose:** Comprehensive analytics and reporting for RFIs and Submittals

**1 Controller:** `AnalyticsController`

**Key Endpoints:**
- `GET /projects/:projectId/analytics/rfis` - RFI analytics
- `GET /projects/:projectId/analytics/rfis/summary` - Status summary
- `GET /projects/:projectId/analytics/rfis/response-time` - Response metrics
- `GET /projects/:projectId/analytics/rfis/aging` - Aging analysis
- `GET /projects/:projectId/analytics/rfis/bottlenecks` - Bottleneck identification
- `GET /projects/:projectId/analytics/submittals` - Submittal analytics
- `GET /projects/:projectId/analytics/submittals/summary` - Status summary
- `GET /projects/:projectId/analytics/submittals/approval-metrics` - Approval metrics
- `GET /projects/:projectId/analytics/submittals/lead-time` - Lead time analysis
- `GET /projects/:projectId/analytics/submittals/contractor-performance` - Performance tracking
- `GET /projects/:projectId/analytics/dashboard` - Combined dashboard
- `POST /projects/:projectId/analytics/export` - Export analytics
- Analytics reports (saved templates)
- Historical snapshots and trends

**Features:**
- Real-time RFI and submittal analytics
- Response time and aging analysis
- Bottleneck identification
- Contractor performance tracking
- Combined dashboard views
- Export to Excel, CSV, PDF
- Saved report templates
- Historical snapshot comparison
- Trend analysis over time

**Services:** `RfiAnalyticsService`, `SubmittalAnalyticsService`, `ExportService`, `ReportService`, `AnalyticsSnapshotService`

---

### 7. Projects Module (`projects`)
**Purpose:** Core project management functionality

**8 Controllers:**
- `ProjectController` - Project CRUD operations
- `ProjectMemberController` - Team member management
- `ProjectTemplateController` - Project templates
- `ProjectPhaseController` - Phase management
- `ProjectMilestoneController` - Milestone tracking
- `ProjectDashboardController` - Dashboard data
- `ProjectFolderController` - Folder management
- `FolderTemplateController` - Folder templates

**Key Endpoints:**
- `POST /projects` - Create project
- `GET /projects` - List projects
- `GET /projects/:id` - Get project details
- `PATCH /projects/:id` - Update project
- `PATCH /projects/:id/status` - Update status
- `POST /projects/:id/archive` - Archive project
- `POST /projects/:id/restore` - Restore project
- Phase and milestone management
- Dashboard metrics and charts

**Features:**
- Complete project lifecycle management
- Project templates for quick setup
- Phase and milestone tracking
- Critical path calculation
- Member management with roles
- Hierarchical folder structure
- Status workflow (Planning → Active → On Hold → Completed → Archived)
- Project dashboard with KPIs
- Search and filtering
- Archive and restore functionality

**Entities:** `Project`, `ProjectMember`, `ProjectTemplate`, `ProjectPhase`, `ProjectMilestone`, `ProjectFolder`

---

### 8. Relationships Module (`relationships`)
**Purpose:** Project relationships, dependencies, and portfolio management

**2 Controllers:**
- `ProjectRelationshipController` - Project relationships
- `ProjectDependencyController` - Project dependencies

**Key Endpoints:**
- `POST /projects/:projectId/relationships` - Create relationship
- `GET /projects/:projectId/relationships` - List relationships
- `GET /projects/:projectId/relationships/parent` - Get parent project
- `GET /projects/:projectId/relationships/children` - Get child projects
- `GET /projects/:projectId/relationships/ancestors` - Get ancestors
- `GET /projects/:projectId/relationships/descendants` - Get descendants
- Project dependency management
- Portfolio and program views

**Features:**
- Parent-child project relationships
- Project dependencies with types (start-to-start, finish-to-finish, etc.)
- Circular dependency detection
- Dependency impact analysis
- Program management (group of related projects)
- Master project aggregation
- Portfolio views and analytics
- Hierarchy traversal
- Network analysis
- Timeline synchronization

**Services:** 15 specialized services including `ProjectRelationshipService`, `DependencyNetworkService`, `DependencyImpactService`, `ProgramMetricsService`, `PortfolioAnalyticsService`, etc.

**Background Jobs:**
- `MasterAggregationJob` - Aggregate master project data
- `ProgramMetricsJob` - Calculate program metrics
- `DependencyViolationsJob` - Check for violations
- `PortfolioCacheJob` - Cache portfolio data

**Entities:** `ProjectRelationship`, `ProjectDependency`, `ProjectProgram`, `MasterProject`, `PortfolioView`

---

### 9. Organizations Module (`organizations`)
**Purpose:** Organization entity management

**1 Controller:** `OrganizationController`

**Key Endpoints:**
- `POST /organizations` - Create organization
- `GET /organizations` - List organizations
- `GET /organizations/:id` - Get organization details
- `PATCH /organizations/:id` - Update organization
- `DELETE /organizations/:id` - Delete organization

**Features:**
- Organization CRUD operations
- Slug-based routing
- Multi-tenant architecture
- Member management
- Active/inactive status
- Soft delete support

**Entities:** `Organization`, `OrganizationMember`

---

### 10. Memberships Module (`memberships`)
**Purpose:** Organization and project membership management

**4 Controllers:**
- `OrganizationMembershipController` - Organization members
- `ProjectMembershipController` - Project members
- `BulkOperationsController` - Bulk member operations
- `MembershipHistoryController` - History tracking

**Key Endpoints:**
- `POST /organizations/:orgId/members` - Add member to organization
- `GET /organizations/:orgId/members` - List organization members
- `PATCH /organizations/:orgId/members/:userId` - Update member role
- `DELETE /organizations/:orgId/members/:userId` - Remove member
- Equivalent endpoints for project memberships
- Bulk operations for multiple members

**Features:**
- Role-based membership (Owner, Admin, Member, etc.)
- Bulk member operations (add, update, remove)
- Membership history tracking
- Cascading removal options
- Search and filtering
- Member invitation workflow

---

### 11. Permissions Module (`permissions`)
**Purpose:** Advanced permission and access control system

**9 Guards:**
- `PermissionGuard` - Generic permission guard
- `DocumentGuard` - Document-specific permissions
- `BudgetGuard` - Budget permissions
- `RfiGuard` - RFI permissions
- `SubmittalGuard` - Submittal permissions
- `QualityGuard` - Quality module permissions
- `SafetyGuard` - Safety module permissions
- `ProjectSettingsGuard` - Settings permissions
- Plus additional specialized guards

**Services:**
- `PermissionService` - Core permission logic
- `ScopeService` - Permission scopes (system, org, project, feature)
- `ExpirationService` - Time-based permissions
- `ExpirationNotificationService` - Expiration notifications
- `AuditService` - Permission audit trail
- `GuardCacheService` - Permission caching for performance
- `InheritanceService` - Permission inheritance

**Features:**
- Fine-grained permission control
- Time-based permissions with automatic expiration
- Permission inheritance from parent scopes
- Role-based access control (RBAC) integration
- Resource-level permissions
- Comprehensive audit trail
- Caching for performance
- Automated expiration notifications
- Multi-level scopes (System → Organization → Project → Feature)

---

### 12. Users Module (`users`)
**Purpose:** User entity and profile management

**Entities:** `User`

**Features (from entity):**
- Email-based authentication
- Bcrypt password hashing (12 rounds)
- System roles (USER, SYSTEM_ADMIN)
- Active/inactive status
- Email verification
- Last login tracking
- Profile information (firstName, lastName, phone)
- Full name computation
- Automatic password exclusion from serialization

---

### 13. Metrics Module (`metrics`)
**Purpose:** Real-time project metrics calculation and monitoring

**1 Controller:** `ProjectMetricsController`

**Key Endpoints:**
- `GET /projects/:projectId/metrics` - Get project metrics
- `POST /metrics/batch` - Batch get metrics for multiple projects
- `POST /projects/:projectId/metrics/refresh` - Force metric refresh
- `GET /projects/:projectId/metrics/history` - Metric history over time
- `GET /projects/:projectId/metrics/compare` - Compare time periods
- `GET /projects/:projectId/metrics/alerts` - Get metric alerts
- `GET /projects/:projectId/metrics/thresholds` - Get custom thresholds
- `POST /projects/:projectId/metrics/thresholds` - Create threshold

**Features:**
- Real-time metric calculation across all modules
- Multi-group metrics (Budget, Schedule, Documents, RFIs, Submittals, Quality, Safety, Team)
- Intelligent caching for performance
- Historical metric tracking
- KPI identification
- Automatic alert generation
- Custom threshold monitoring
- Batch calculations for efficiency
- Comparison tools for trend analysis

**Metric Groups:**
- Budget & Cost metrics
- Schedule & Timeline metrics
- Document metrics
- RFI metrics
- Submittal metrics
- Quality metrics
- Safety metrics
- Team performance metrics

**Services:** `MetricOrchestratorService` + 8 specialized calculator services

**Background Job:** `MetricCalculationJob` - Scheduled metric calculations

**Entities:** `ProjectMetrics`, `MetricSnapshot`, `MetricAlert`, `MetricThreshold`

---

### 14. Search Module (`search`)
**Purpose:** Advanced project search with caching and analytics

**4 Controllers:**
- `ProjectSearchController` - Project search
- `SavedSearchController` - Saved searches
- `SearchAutocompleteController` - Autocomplete suggestions
- `SearchAnalyticsController` - Search usage analytics
- `ExportController` - Export search results

**Key Endpoints:**
- `POST /projects/search` - Full-text search with filters
- `GET /projects/search/autocomplete` - Autocomplete suggestions
- `POST /projects/search/saved` - Save search query
- `GET /projects/search/saved` - Get saved searches
- `GET /projects/search/analytics` - Search usage analytics
- `POST /projects/search/export` - Export results to Excel/CSV

**Features:**
- Full-text project search
- Faceted search with dynamic filters
- Result caching for performance
- Search analytics and usage tracking
- Saved searches with notifications
- Autocomplete for better UX
- Export search results
- Performance tracking and optimization

**Background Job:** `ExportProcessingJob` - Process large exports

**Entities:** `SavedSearch`, `SearchAnalytics`, `ExportJob`

---

### 15. Integrations Module (`integrations`)
**Purpose:** QuickBooks Online integration for financial data sync

**15 Controllers:**
- `QuickBooksAuthController` - OAuth 2.0 authentication
- `QuickBooksConnectionController` - Connection management
- `QuickBooksAccountController` - Chart of accounts
- `QuickBooksAccountMappingController` - Account mapping
- `QuickBooksCustomerController` - Customer sync
- `QuickBooksVendorController` - Vendor sync
- `QuickBooksInvoiceController` - Invoice sync
- `QuickBooksBillController` - Bill sync
- `QuickBooksJournalEntryController` - Journal entries
- `QuickBooksEntityLinkController` - Entity linking
- `QuickBooksSyncOperationsController` - Manual sync operations
- `QuickBooksSyncHistoryController` - Sync history tracking
- `QuickBooksSyncErrorController` - Error handling
- `QuickBooksSyncSettingsController` - Sync configuration
- `QuickBooksWebhookController` - Webhook handling

**Key Endpoints:**
- `GET /integrations/quickbooks/auth/connect/:organizationId` - Get OAuth URL
- `GET /integrations/quickbooks/auth/callback` - OAuth callback
- `POST /integrations/quickbooks/auth/disconnect/:organizationId` - Disconnect
- `GET /integrations/quickbooks/auth/status/:organizationId` - Connection status
- Account, customer, vendor, invoice, bill synchronization
- Manual sync triggers
- Sync history and error logs

**Features:**
- OAuth 2.0 authentication with QuickBooks
- Automatic token refresh
- Bidirectional data synchronization
- Chart of accounts mapping
- Customer and vendor sync
- Invoice and bill sync
- Journal entry creation
- Webhook notifications for real-time updates
- Sync history and error tracking
- API rate limiting
- Token encryption for security
- Multi-environment support (sandbox/production)
- Conflict resolution strategies

**Entities:** `QBConnection`, `QBAccountMapping`, `QBEntityLink`, `QBSyncHistory`, `QBSyncError`, `QBSyncSettings`

---

### 16. Health Module (`health`)
**Purpose:** Application health monitoring and diagnostics

**1 Controller:** `HealthController`

**Key Endpoints:**
- `GET /health` - Comprehensive health check
- `GET /health/liveness` - Kubernetes liveness probe
- `GET /health/readiness` - Kubernetes readiness probe

**Health Indicators:**
- `DatabaseHealthIndicator` - Database connectivity and query performance
- `MemoryHealthIndicator` - Memory usage monitoring
- `CpuHealthIndicator` - CPU usage tracking

**Features:**
- Comprehensive system health checks
- Kubernetes-compatible probes for orchestration
- Database connection monitoring
- Resource usage tracking
- Response time measurement
- Service status aggregation
- Automatic failure detection

---

### 17. Cascade Module (`cascade`)
**Purpose:** Intelligent cascading operations for entity deletion/restoration

**3 Controllers:**
- `UserCascadeController` - User deletion cascading
- `OrganizationCascadeController` - Organization cascading
- `ProjectCascadeController` - Project cascading

**Key Endpoints (User example):**
- `GET /users/:userId/deletion-impact` - Preview deletion impact
- `GET /users/:userId/validate-deletion` - Validate if entity can be deleted
- `DELETE /users/:userId` - Delete with cascade operations
- `POST /users/:userId/restore` - Restore soft-deleted entity

**Features:**
- Soft delete with restoration capability
- Deletion impact preview showing affected entities
- Validation checks (e.g., prevent deleting sole organization owner)
- Intelligent cascading to related entities
- Comprehensive audit trail of deletions
- Restore functionality with relationship reconstruction

---

### 18. Database Module (`database`)
**Purpose:** Database health monitoring and configuration

**Services:** `DatabaseHealthService`

**Features:**
- Database connection health monitoring
- Query performance tracking
- Connection pool management
- Database migration status tracking

**Entities:** `HealthCheck`

---

## 🏗️ Architecture Patterns

### Dependency Injection
- Constructor-based injection throughout
- Service composition for reusability
- Module-based organization

### Repository Pattern
- TypeORM Repository pattern
- Custom repositories for complex queries
- QueryBuilder for advanced filtering

### DTO (Data Transfer Objects)
- Separate DTOs for requests and responses
- class-validator for input validation
- class-transformer for serialization

### Guards & Decorators
- `@UseGuards(JwtAuthGuard)` for authentication
- `@Permissions()` decorator for authorization
- Custom decorators for current user, organization, project context

### Background Jobs
- Scheduled task processing
- Metrics calculation jobs
- Report generation jobs
- Index synchronization jobs
- Alert processing jobs

### Caching Strategies
- Multi-level caching (metrics, search, permissions)
- Redis integration for distributed caching
- Intelligent cache invalidation

---

## 🔒 Security Features

### Authentication & Authorization
- JWT tokens with 15-minute expiration
- Refresh token rotation with breach detection
- Token family tracking
- Multi-level RBAC (System, Organization, Project)
- Fine-grained permissions with scopes
- Time-based permission expiration

### Security Measures
- Bcrypt password hashing (12 rounds)
- Failed login attempt tracking
- IP-based rate limiting
- Token reuse detection
- SQL injection prevention (TypeORM)
- XSS protection (class-validator)
- Input validation and sanitization
- CORS configuration
- Helmet.js security headers

### Audit & Compliance
- Comprehensive audit trails across all modules
- Permission audit logging
- Document access logs
- Financial transaction history
- Change tracking for all entities

---

## 📊 Performance Features

### Caching
- Redis for distributed caching
- Query result caching
- Permission caching
- Metric caching with TTL
- Search result caching

### Database Optimization
- Strategic indexes on all entities
- Composite indexes for common queries
- Query pagination support
- Lazy loading of relations
- Connection pooling

### Background Processing
- Async job processing
- Scheduled tasks for heavy operations
- Batch processing for bulk operations
- Queue management

---

## 📝 API Documentation

### Swagger/OpenAPI
- Auto-generated API documentation
- Available at `/api/docs` (when enabled)
- Complete endpoint reference
- Request/response schemas
- Authentication examples

### Additional Documentation
- [Test Credentials](./docs/TEST_CREDENTIALS.md) - Complete test user accounts
- [Permission Matrix](./docs/PERMISSION_MATRIX.md) - Role-based access control reference
- [Multi-Level Roles](./docs/MULTI_LEVEL_ROLES.md) - Role system architecture
- [Architecture Overview](./docs/ARCHITECTURE.md) - System design
- [Financial Dashboard API](./docs/FINANCIAL_DASHBOARD_PHASE_5_COMPLETE.md) - Financial endpoints
- [Contributing Guidelines](./docs/CONTRIBUTING.md) - Development guidelines

---

## 🧪 Testing

### Test Structure
```bash
# Unit tests
npm test                          # All unit tests
npm test -- auth.service.spec.ts  # Specific test file
npm run test:watch                # Watch mode

# E2E tests
npm run test:e2e                  # All E2E tests
npm run test:e2e -- auth          # Specific E2E suite

# Coverage
npm run test:cov                  # Generate coverage report
```

### Test Data
The seed script (`npm run seed`) creates:
- 10 test users across all roles
- 3 organizations (GC, Subcontractor, Owner/Developer)
- 5 projects with various statuses
- Sample budgets, commitments, and change orders
- Test documents and submittals

---

## 🗂️ Project Structure

```
builder-api/
├── src/
│   ├── modules/              # 18 Feature Modules
│   │   ├── analytics/        # RFI & Submittal analytics
│   │   ├── auth/             # Authentication & JWT
│   │   ├── cascade/          # Deletion cascading
│   │   ├── database/         # Database health
│   │   ├── documents/        # Document management (15 controllers)
│   │   ├── financials/       # Financial management (27 controllers)
│   │   ├── health/           # Health monitoring
│   │   ├── integrations/     # QuickBooks integration (15 controllers)
│   │   ├── memberships/      # Membership management
│   │   ├── metrics/          # Real-time metrics
│   │   ├── organizations/    # Organization management
│   │   ├── permissions/      # Permission system (9 guards)
│   │   ├── projects/         # Project management (8 controllers)
│   │   ├── relationships/    # Project relationships & portfolios
│   │   ├── rfis/             # RFI management
│   │   ├── search/           # Advanced search
│   │   ├── submittals/       # Submittal management
│   │   └── users/            # User management
│   ├── common/               # Shared utilities
│   ├── database/             # Database configuration
│   └── main.ts               # Application entry
├── test/                     # E2E tests
├── migrations/               # Database migrations
├── docs/                     # Documentation
│   ├── api/                  # API endpoint docs
│   ├── schemas/              # Database schemas
│   └── *.md                  # Various documentation
└── package.json
```

---

## 🚀 Deployment

### Environment Variables
See `.env.example` for required configuration:
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` - JWT signing secret
- `JWT_REFRESH_SECRET` - Refresh token secret
- `AWS_S3_*` - S3 configuration for file storage
- `QUICKBOOKS_*` - QuickBooks API credentials
- `REDIS_URL` - Redis connection for caching

### Production Build
```bash
npm run build
npm run start:prod
```

### Docker Support
```bash
docker build -t builder-api .
docker run -p 3000:3000 builder-api
```

### Health Checks (Kubernetes)
- Liveness: `GET /health/liveness`
- Readiness: `GET /health/readiness`

---

## 📈 Statistics Summary

| Metric | Count |
|--------|-------|
| Modules | 18 |
| Controllers | 84 |
| Services | 187+ |
| Entities | 112 |
| Endpoints | 500+ |
| Background Jobs | 15+ |
| Guards | 9+ |
| Lines of Code | ~65,000+ |

---

## 🤝 Contributing

Please read [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for development guidelines, coding standards, and pull request process.

---

## 📄 License

MIT License - See LICENSE file for details.

---

**Version:** 1.0.0
**Last Updated:** 2025-12-18
**Status:** Production Ready
