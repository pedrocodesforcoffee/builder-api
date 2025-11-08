# Database Schema Documentation

This document describes the database schema for the Builder API application.

## Database Information

- **Database**: PostgreSQL
- **ORM**: TypeORM v0.3.27
- **Extensions**: uuid-ossp (for UUID generation)

---

## Overview

The Builder API uses a multi-level permission system designed for construction project management, similar to ProCore. The system consists of three levels of access control:

1. **System Level** - Platform-wide administrative access
2. **Organization Level** - Company/organization access control
3. **Project Level** - Construction project-specific permissions

---

## Tables

### Users Table

The `users` table stores authenticated user information with system-level roles.

#### Table Structure

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| id | UUID | PK, AUTO | Unique identifier (UUID v4) |
| email | VARCHAR(255) | UNIQUE, NOT NULL, INDEX | User email address (stored in lowercase) |
| phone_number | VARCHAR(20) | NULL | Optional phone number (international format supported) |
| password | VARCHAR(255) | NOT NULL | Hashed password (bcrypt) - NEVER plain text |
| first_name | VARCHAR(100) | NOT NULL | User's first name (trimmed) |
| last_name | VARCHAR(100) | NOT NULL | User's last name (trimmed) |
| system_role | ENUM | NOT NULL, DEFAULT='user' | System-wide role: 'user', 'system_admin' |
| is_active | BOOLEAN | NOT NULL, DEFAULT=true | Whether the user account is active |
| email_verified | BOOLEAN | NOT NULL, DEFAULT=false | Whether email has been verified |
| last_login_at | TIMESTAMP | NULL | Timestamp of last successful login |
| created_at | TIMESTAMP | NOT NULL, AUTO | Record creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, AUTO | Record last update timestamp |

#### Indexes

| Index Name | Type | Columns | Purpose |
|-----------|------|---------|---------|
| PRIMARY | Primary Key | id | Unique identifier |
| IDX_users_email | Index | email | Login query performance |
| IDX_users_email_unique | Unique Index | email | Email uniqueness (case-insensitive) |
| IDX_users_system_role | Index | system_role | Role filtering queries |
| IDX_users_is_active | Index | is_active | Active user filtering |

#### Enum Values

**system_role enum**: `'user'` | `'system_admin'`

- **user**: Default role for all registered users
- **system_admin**: Platform administrator with full access

#### Triggers

| Trigger Name | Event | Purpose |
|-------------|-------|---------|
| update_users_updated_at | BEFORE UPDATE | Automatically updates `updated_at` timestamp |

---

### Organizations Table

The `organizations` table stores company/organization information.

#### Table Structure

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| id | UUID | PK, AUTO | Unique identifier (UUID v4) |
| name | VARCHAR(255) | NOT NULL | Organization name |
| slug | VARCHAR(100) | UNIQUE, NOT NULL, INDEX | URL-friendly identifier |
| is_active | BOOLEAN | NOT NULL, DEFAULT=true | Whether organization is active |
| settings | JSONB | DEFAULT={} | Organization-specific settings (branding, features) |
| created_at | TIMESTAMP | NOT NULL, AUTO | Record creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, AUTO | Record last update timestamp |

#### Indexes

| Index Name | Type | Columns | Purpose |
|-----------|------|---------|---------|
| PRIMARY | Primary Key | id | Unique identifier |
| IDX_organizations_slug | Unique Index | slug | URL lookup optimization |
| IDX_organizations_is_active | Index | is_active | Active organization filtering |

---

### Organization Members Table

The `organization_members` table manages the many-to-many relationship between users and organizations with role-based access control.

#### Table Structure

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| user_id | UUID | PK (composite), FK → users.id | Reference to user |
| organization_id | UUID | PK (composite), FK → organizations.id | Reference to organization |
| role | ENUM | NOT NULL | User's role in this organization |
| added_by_user_id | UUID | NULL, FK → users.id | User who added this member |
| created_at | TIMESTAMP | NOT NULL, AUTO | Membership creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, AUTO | Membership update timestamp |

#### Indexes

| Index Name | Type | Columns | Purpose |
|-----------|------|---------|---------|
| PRIMARY | Primary Key | (user_id, organization_id) | Composite unique identifier |
| IDX_org_members_user_org | Unique Index | (user_id, organization_id) | Prevent duplicate memberships |
| IDX_org_members_user | Index | user_id | User membership lookups |
| IDX_org_members_organization | Index | organization_id | Organization member lookups |
| IDX_org_members_role | Index | role | Role-based filtering |

#### Enum Values

**role enum**: `'owner'` | `'org_admin'` | `'org_member'` | `'guest'`

Role hierarchy (highest to lowest):
- **owner**: Full organization control including billing and deletion
- **org_admin**: Administrative access, auto-granted PROJECT_ADMIN on all projects
- **org_member**: Standard member access
- **guest**: Limited read-only access

#### Foreign Key Constraints

- `user_id` → `users.id` (CASCADE on delete)
- `organization_id` → `organizations.id` (CASCADE on delete)
- `added_by_user_id` → `users.id` (SET NULL on delete)

---

### Projects Table

The `projects` table stores construction project information.

#### Table Structure

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| id | UUID | PK, AUTO | Unique identifier (UUID v4) |
| organization_id | UUID | NOT NULL, FK → organizations.id | Parent organization |
| name | VARCHAR(255) | NOT NULL | Project name |
| code | VARCHAR(50) | NOT NULL | Project code (unique within org) |
| description | TEXT | NULL | Project description |
| status | ENUM | NOT NULL, DEFAULT='planning' | Current project status |
| location | TEXT | NULL | Project address/location |
| start_date | DATE | NULL | Planned start date |
| end_date | DATE | NULL | Planned end date |
| actual_completion_date | DATE | NULL | Actual completion date |
| settings | JSONB | DEFAULT={} | Project-specific settings |
| created_at | TIMESTAMP | NOT NULL, AUTO | Record creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, AUTO | Record last update timestamp |

#### Indexes

| Index Name | Type | Columns | Purpose |
|-----------|------|---------|---------|
| PRIMARY | Primary Key | id | Unique identifier |
| IDX_projects_code | Unique Index | (organization_id, code) | Unique project codes per org |
| IDX_projects_organization | Index | organization_id | Organization project lookups |
| IDX_projects_status | Index | status | Status-based filtering |
| IDX_projects_start_date | Index | start_date | Date-based queries |

#### Enum Values

**status enum**: `'planning'` | `'active'` | `'on_hold'` | `'completed'` | `'cancelled'`

- **planning**: Project in planning phase
- **active**: Active construction
- **on_hold**: Temporarily paused
- **completed**: Successfully finished
- **cancelled**: Project cancelled

#### Foreign Key Constraints

- `organization_id` → `organizations.id` (CASCADE on delete)

---

### Project Members Table

The `project_members` table manages the many-to-many relationship between users and projects with construction-specific roles.

#### Table Structure

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| user_id | UUID | PK (composite), FK → users.id | Reference to user |
| project_id | UUID | PK (composite), FK → projects.id | Reference to project |
| role | ENUM | NOT NULL | User's role in this project |
| added_by_user_id | UUID | NULL, FK → users.id | User who added this member |
| expires_at | TIMESTAMP | NULL | Optional expiration for temporary access |
| created_at | TIMESTAMP | NOT NULL, AUTO | Membership creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, AUTO | Membership update timestamp |

#### Indexes

| Index Name | Type | Columns | Purpose |
|-----------|------|---------|---------|
| PRIMARY | Primary Key | (user_id, project_id) | Composite unique identifier |
| IDX_proj_members_user_proj | Unique Index | (user_id, project_id) | Prevent duplicate memberships |
| IDX_proj_members_user | Index | user_id | User membership lookups |
| IDX_proj_members_project | Index | project_id | Project member lookups |
| IDX_proj_members_role | Index | role | Role-based filtering |
| IDX_proj_members_expires_at | Index | expires_at | Expiration cleanup queries |

#### Enum Values

**role enum**: Construction-specific roles following industry standards

Administrative roles:
- **project_admin**: Full project control and settings management
- **project_manager**: Project oversight, budget, schedule management
- **project_engineer**: Technical oversight and coordination

Field roles:
- **superintendent**: On-site construction supervision
- **foreman**: Specific crew management
- **subcontractor**: Trade-specific contractor work

Professional roles:
- **architect_engineer**: Design and engineering consultant
- **owner_rep**: Owner's representative
- **inspector**: Quality assurance and compliance

Other roles:
- **viewer**: Read-only access

#### Foreign Key Constraints

- `user_id` → `users.id` (CASCADE on delete)
- `project_id` → `projects.id` (CASCADE on delete)
- `added_by_user_id` → `users.id` (SET NULL on delete)

---

### Refresh Tokens Table

The `refresh_tokens` table stores hashed refresh tokens for JWT authentication.

#### Table Structure

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| id | UUID | PK, AUTO | Unique identifier |
| user_id | UUID | NOT NULL, FK → users.id | Reference to user |
| token_hash | VARCHAR(255) | UNIQUE, NOT NULL | SHA-256 hash of refresh token |
| expires_at | TIMESTAMP | NOT NULL, INDEX | Token expiration timestamp |
| revoked_at | TIMESTAMP | NULL | Token revocation timestamp |
| ip_address | VARCHAR(45) | NULL | Client IP address |
| user_agent | TEXT | NULL | Client user agent |
| created_at | TIMESTAMP | NOT NULL, AUTO | Token creation timestamp |

#### Foreign Key Constraints

- `user_id` → `users.id` (CASCADE on delete)

---

### Failed Login Attempts Table

The `failed_login_attempts` table tracks failed authentication attempts for rate limiting.

#### Table Structure

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| id | UUID | PK, AUTO | Unique identifier |
| email | VARCHAR(255) | NOT NULL, INDEX | Attempted email address |
| ip_address | VARCHAR(45) | NOT NULL, INDEX | Client IP address |
| user_agent | TEXT | NULL | Client user agent |
| reason | VARCHAR(50) | NULL | Failure reason |
| attempted_at | TIMESTAMP | NOT NULL, INDEX | Attempt timestamp |

#### Indexes

| Index Name | Type | Columns | Purpose |
|-----------|------|---------|---------|
| IDX_failed_login_email_ip | Composite Index | (email, ip_address) | Rate limit checks |
| IDX_failed_login_attempted_at | Index | attempted_at | Cleanup old records |

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────┐
│             users                   │
├─────────────────────────────────────┤
│ id (PK)                             │
│ email (UNIQUE)                      │
│ phone_number                        │
│ password                            │
│ first_name                          │
│ last_name                           │
│ system_role (ENUM)                  │◄────┐
│ is_active                           │     │
│ email_verified                      │     │
│ last_login_at                       │     │
│ created_at                          │     │
│ updated_at                          │     │
└─────────────────────────────────────┘     │
            │           │                    │
            │           │                    │
            │           └──────────────┐     │
            │                          │     │
            ▼                          ▼     │
┌─────────────────────────────┐  ┌───────────────────────────┐
│  organization_members       │  │    project_members        │
├─────────────────────────────┤  ├───────────────────────────┤
│ user_id (PK, FK)            │  │ user_id (PK, FK)          │
│ organization_id (PK, FK)    │  │ project_id (PK, FK)       │
│ role (ENUM)                 │  │ role (ENUM)               │
│ added_by_user_id (FK)       │──┤ added_by_user_id (FK)     │
│ created_at                  │  │ expires_at                │
│ updated_at                  │  │ created_at                │
└─────────────────────────────┘  │ updated_at                │
            │                     └───────────────────────────┘
            │                                  │
            ▼                                  │
┌─────────────────────────────────┐           │
│       organizations             │           │
├─────────────────────────────────┤           │
│ id (PK)                         │           │
│ name                            │           │
│ slug (UNIQUE)                   │           │
│ is_active                       │           │
│ settings (JSONB)                │           │
│ created_at                      │           │
│ updated_at                      │           │
└─────────────────────────────────┘           │
            │                                  │
            │                                  │
            ▼                                  │
┌─────────────────────────────────┐           │
│          projects               │           │
├─────────────────────────────────┤           │
│ id (PK)                         │◄──────────┘
│ organization_id (FK)            │
│ name                            │
│ code                            │
│ description                     │
│ status (ENUM)                   │
│ location                        │
│ start_date                      │
│ end_date                        │
│ actual_completion_date          │
│ settings (JSONB)                │
│ created_at                      │
│ updated_at                      │
└─────────────────────────────────┘
```

---

## Permission Hierarchy

### System Level
- **SYSTEM_ADMIN**: Full platform access, bypasses all org/project checks
- **USER**: Standard user requiring org/project membership

### Organization Level (Hierarchy)
1. **OWNER**: Full control including billing and deletion
2. **ORG_ADMIN**: Administrative access + auto PROJECT_ADMIN on all org projects
3. **ORG_MEMBER**: Standard member access
4. **GUEST**: Limited read-only access

### Project Level (Construction Roles)
Administrative hierarchy:
1. **PROJECT_ADMIN** > PROJECT_MANAGER > PROJECT_ENGINEER

All roles:
- PROJECT_ADMIN, PROJECT_MANAGER, PROJECT_ENGINEER
- SUPERINTENDENT, FOREMAN
- ARCHITECT_ENGINEER, SUBCONTRACTOR
- OWNER_REP, INSPECTOR, VIEWER

### Access Inheritance
- System admins get access to everything
- Organization OWNER and ORG_ADMIN automatically get PROJECT_ADMIN role on all organization projects
- Project members can have temporary access via `expires_at`

---

## Security Considerations

### Password Security
- Passwords hashed with bcrypt (12 rounds)
- Password field excluded from default SELECT queries
- Never exposed in API responses via serialization exclusion
- Strong password validation (8+ chars, upper, lower, number, special char)

### Token Security
- Refresh tokens hashed with SHA-256 before storage
- Access tokens expire after 15 minutes
- Refresh tokens expire after 7 days
- Tokens can be revoked individually or all for a user

### Rate Limiting
- Failed login attempts tracked per email/IP combination
- Maximum 5 attempts per 15-minute window
- 15-minute lockout after exceeding limit

### Email Security
- All emails stored in lowercase for consistency
- Case-insensitive uniqueness checks
- Email verification field for validation workflows

---

## Migration History

| Version | Date | Description |
|---------|------|-------------|
| 1699000000000 | 2024-11-04 | Initial schema |
| 1733673600000 | 2024-12-08 | Create users table |
| 1733760000000 | 2024-12-09 | Create refresh_tokens table |
| 1733760100000 | 2024-12-09 | Create failed_login_attempts table |
| 1762634644566 | 2025-11-08 | Multi-level permission system: organizations, projects, members |

---

## Naming Conventions

### Tables
- Lowercase, plural form (e.g., `users`, `projects`)
- Snake case for multi-word names (e.g., `project_members`)

### Columns
- Lowercase, snake_case (e.g., `first_name`, `created_at`)
- Consistent naming:
  - Primary keys: `id`
  - Foreign keys: `{table}_id` (e.g., `user_id`)
  - Timestamps: `created_at`, `updated_at`, `deleted_at`
  - Boolean flags: `is_*` or `has_*` prefix

### Indexes
- Format: `IDX_{table}_{column(s)}` (e.g., `IDX_users_email`)
- Unique indexes: `IDX_{table}_{column}_unique` or include uniqueness in name

### Enums
- Lowercase, snake_case values
- Table-specific: `{table}_{column}_enum`

---

## Performance Optimization

### Indexing Strategy
1. **Primary Keys**: Automatically indexed (UUID)
2. **Foreign Keys**: All indexed for join performance
3. **Unique Constraints**: Automatically indexed
4. **Frequently Queried**: Role fields, status fields, active flags
5. **Composite Indexes**: User-org and user-project lookups
6. **Date Fields**: start_date, expires_at for range queries

### Query Optimization
- Use `select: false` for sensitive fields (password)
- Leverage composite indexes for membership checks
- Use JSONB for flexible settings storage
- Implement pagination for large result sets
- Consider query result caching for permission checks

---

## Backup and Recovery

### Recommended Strategy
1. **Daily automated backups** of entire database
2. **Transaction log backups** for point-in-time recovery
3. **Test restore procedures** regularly
4. **Store backups** securely off-site
5. **Document recovery procedures**

---

## Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2024-12-08 | 1.0.0 | Initial documentation with users table | Claude Code |
| 2025-11-08 | 2.0.0 | Multi-level permission system implementation | Claude Code |

---

## References

- [TypeORM Documentation](https://typeorm.io/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [ProCore Permission Model](https://developers.procore.com/) (Inspiration)
- [Database Design Best Practices](https://www.postgresql.org/docs/current/ddl.html)
