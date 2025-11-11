# Seed Data Documentation

This document contains all seed data created by the database seeding script for manual testing purposes.

## Running the Seed Script

```bash
npm run seed
```

This will:
1. Clear all existing data
2. Create 10 users
3. Create 3 organizations
4. Create 5 projects
5. Assign organization and project memberships

---

## Test Users

All users have the password: **`Password123!`**

### System Admin
- **Email**: `admin@bobbuilder.com`
- **Password**: `Admin123!`
- **Name**: System Admin
- **Phone**: +1-555-000-0001
- **System Role**: SYSTEM_ADMIN
- **Notes**: Can access all organizations and projects

### Acme Construction Users

#### Owner
- **Email**: `john.doe@acme.com`
- **Password**: `Password123!`
- **Name**: John Doe
- **Phone**: +1-555-100-0001
- **System Role**: USER
- **Organization Role**: OWNER
- **Projects**: Downtown Office Tower (PROJECT_ADMIN), Riverside Apartments (PROJECT_ADMIN)

#### Admin
- **Email**: `jane.smith@acme.com`
- **Password**: `Password123!`
- **Name**: Jane Smith
- **Phone**: +1-555-100-0002
- **System Role**: USER
- **Organization Role**: ORG_ADMIN
- **Projects**: Downtown Office Tower (PROJECT_MANAGER), Riverside Apartments (PROJECT_MANAGER)

#### Member
- **Email**: `robert.miller@acme.com`
- **Password**: `Password123!`
- **Name**: Robert Miller
- **Phone**: +1-555-100-0003
- **System Role**: USER
- **Organization Role**: ORG_MEMBER
- **Projects**: Downtown Office Tower (PROJECT_ENGINEER), Riverside Apartments (PROJECT_ENGINEER)

### Summit Builders Users

#### Owner
- **Email**: `mike.johnson@summit.com`
- **Password**: `Password123!`
- **Name**: Mike Johnson
- **Phone**: +1-555-200-0001
- **System Role**: USER
- **Organization Role**: OWNER
- **Projects**: Tech Campus Phase 2 (PROJECT_ADMIN)

#### Admin
- **Email**: `sarah.williams@summit.com`
- **Password**: `Password123!`
- **Name**: Sarah Williams
- **Phone**: +1-555-200-0002
- **System Role**: USER
- **Organization Role**: ORG_ADMIN
- **Projects**: Tech Campus Phase 2 (PROJECT_MANAGER)

#### Member
- **Email**: `lisa.wilson@summit.com`
- **Password**: `Password123!`
- **Name**: Lisa Wilson
- **Phone**: +1-555-200-0003
- **System Role**: USER
- **Organization Role**: ORG_MEMBER
- **Projects**: Tech Campus Phase 2 (PROJECT_ENGINEER)

### Elite Properties Users

#### Owner
- **Email**: `david.brown@elite.com`
- **Password**: `Password123!`
- **Name**: David Brown
- **Phone**: +1-555-300-0001
- **System Role**: USER
- **Organization Role**: OWNER
- **Projects**: Luxury Hotel Renovation (PROJECT_ADMIN), Shopping Mall Expansion (PROJECT_ADMIN)

#### Admin
- **Email**: `emily.davis@elite.com`
- **Password**: `Password123!`
- **Name**: Emily Davis
- **Phone**: +1-555-300-0002
- **System Role**: USER
- **Organization Role**: ORG_ADMIN
- **Projects**: Luxury Hotel Renovation (PROJECT_MANAGER), Shopping Mall Expansion (PROJECT_MANAGER)

#### Member
- **Email**: `james.moore@elite.com`
- **Password**: `Password123!`
- **Name**: James Moore
- **Phone**: +1-555-300-0003
- **System Role**: USER
- **Organization Role**: ORG_MEMBER
- **Projects**: Luxury Hotel Renovation (PROJECT_ENGINEER), Shopping Mall Expansion (PROJECT_ENGINEER)

---

## Organizations

### 1. Acme Construction
- **Slug**: `acme-construction`
- **Type**: General Contractor
- **Email**: info@acme-construction.com
- **Phone**: +1-555-100-0000
- **Address**: 123 Builder Ave, New York, NY 10001
- **Website**: https://acme-construction.com
- **Members**:
  - John Doe (OWNER)
  - Jane Smith (ORG_ADMIN)
  - Robert Miller (ORG_MEMBER)
- **Projects**: 2 (Downtown Office Tower, Riverside Apartments)

### 2. Summit Builders
- **Slug**: `summit-builders`
- **Type**: Subcontractor
- **Email**: contact@summitbuilders.com
- **Phone**: +1-555-200-0000
- **Address**: 456 Construction Blvd, Los Angeles, CA 90001
- **Website**: https://summitbuilders.com
- **Members**:
  - Mike Johnson (OWNER)
  - Sarah Williams (ORG_ADMIN)
  - Lisa Wilson (ORG_MEMBER)
- **Projects**: 1 (Tech Campus Phase 2)

### 3. Elite Properties
- **Slug**: `elite-properties`
- **Type**: Owner
- **Email**: info@eliteproperties.com
- **Phone**: +1-555-300-0000
- **Address**: 789 Property Lane, Chicago, IL 60601
- **Website**: https://eliteproperties.com
- **Members**:
  - David Brown (OWNER)
  - Emily Davis (ORG_ADMIN)
  - James Moore (ORG_MEMBER)
- **Projects**: 2 (Luxury Hotel Renovation, Shopping Mall Expansion)

---

## Projects

### 1. Downtown Office Tower
- **Organization**: Acme Construction
- **Code**: ACME-2024-001
- **Description**: 25-story mixed-use office building in downtown Manhattan
- **Location**: 100 Park Avenue, New York, NY 10001
- **Status**: ACTIVE
- **Start Date**: 2024-01-15
- **End Date**: 2025-12-31
- **Members**:
  - John Doe (PROJECT_ADMIN)
  - Jane Smith (PROJECT_MANAGER)
  - Robert Miller (PROJECT_ENGINEER)

### 2. Riverside Apartments
- **Organization**: Acme Construction
- **Code**: ACME-2024-002
- **Description**: Luxury residential complex with 150 units
- **Location**: 500 Riverside Drive, New York, NY 10027
- **Status**: PLANNING
- **Start Date**: 2024-06-01
- **End Date**: 2026-03-31
- **Members**:
  - John Doe (PROJECT_ADMIN)
  - Jane Smith (PROJECT_MANAGER)
  - Robert Miller (PROJECT_ENGINEER)

### 3. Tech Campus Phase 2
- **Organization**: Summit Builders
- **Code**: SUMMIT-2024-001
- **Description**: Modern office campus for tech company
- **Location**: 1000 Innovation Way, San Francisco, CA 94102
- **Status**: ACTIVE
- **Start Date**: 2024-02-01
- **End Date**: 2025-08-31
- **Members**:
  - Mike Johnson (PROJECT_ADMIN)
  - Sarah Williams (PROJECT_MANAGER)
  - Lisa Wilson (PROJECT_ENGINEER)

### 4. Luxury Hotel Renovation
- **Organization**: Elite Properties
- **Code**: ELITE-2024-001
- **Description**: Complete renovation of historic 5-star hotel
- **Location**: 200 Michigan Avenue, Chicago, IL 60601
- **Status**: ACTIVE
- **Start Date**: 2024-03-01
- **End Date**: 2025-06-30
- **Members**:
  - David Brown (PROJECT_ADMIN)
  - Emily Davis (PROJECT_MANAGER)
  - James Moore (PROJECT_ENGINEER)
  - System Admin (VIEWER)

### 5. Shopping Mall Expansion
- **Organization**: Elite Properties
- **Code**: ELITE-2024-002
- **Description**: Adding 50,000 sq ft retail space
- **Location**: 750 Commerce Street, Chicago, IL 60607
- **Status**: ON_HOLD
- **Start Date**: 2024-09-01
- **End Date**: 2025-12-31
- **Members**:
  - David Brown (PROJECT_ADMIN)
  - Emily Davis (PROJECT_MANAGER)
  - James Moore (PROJECT_ENGINEER)
  - System Admin (VIEWER)

---

## Manual Testing Examples

### 1. Login and Get Token

```bash
# Login as Acme Construction owner
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@acme.com",
    "password": "Password123!"
  }'

# Response:
# {
#   "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "user": {
#     "id": "uuid",
#     "email": "john.doe@acme.com",
#     "firstName": "John",
#     "lastName": "Doe"
#   }
# }
```

### 2. List Organizations

```bash
# Get organizations for logged-in user
curl -X GET http://localhost:3000/api/organizations \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Filter: All organizations (system admin only)
curl -X GET "http://localhost:3000/api/organizations?myOrgs=false" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Filter: Include inactive organizations
curl -X GET "http://localhost:3000/api/organizations?includeInactive=true" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Get Organization Details

```bash
# Get specific organization
curl -X GET http://localhost:3000/api/organizations/ORGANIZATION_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Include member and project counts
curl -X GET "http://localhost:3000/api/organizations/ORGANIZATION_ID?includeCounts=true" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. Create New Organization

```bash
curl -X POST http://localhost:3000/api/organizations \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Construction Co",
    "slug": "new-construction-co",
    "type": "General Contractor",
    "email": "info@newco.com",
    "phone": "+1-555-999-0000",
    "address": "999 New Street, City, ST 12345",
    "website": "https://newco.com"
  }'
```

### 5. List Projects

```bash
# Get projects for logged-in user
curl -X GET http://localhost:3000/api/projects \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Filter by organization
curl -X GET "http://localhost:3000/api/projects?organizationId=ORG_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Filter by status
curl -X GET "http://localhost:3000/api/projects?status=active" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# All filters combined
curl -X GET "http://localhost:3000/api/projects?myProjects=true&organizationId=ORG_ID&status=active" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 6. Get Project Details

```bash
# Get specific project
curl -X GET http://localhost:3000/api/projects/PROJECT_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Include member counts
curl -X GET "http://localhost:3000/api/projects/PROJECT_ID?includeCounts=true" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 7. Create New Project

```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "ORG_ID",
    "name": "New Project",
    "description": "Project description",
    "location": "Project location",
    "status": "planning",
    "startDate": "2024-12-01",
    "endDate": "2025-12-31"
  }'
```

### 8. Update Project Status

```bash
curl -X PATCH http://localhost:3000/api/projects/PROJECT_ID/status \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "active"
  }'
```

### 9. Get Current User

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Project Roles

The following construction-specific roles are available for project members:

1. **PROJECT_ADMIN** - Full project control
2. **PROJECT_MANAGER** - Project management and coordination
3. **PROJECT_ENGINEER** - Technical oversight
4. **SUPERINTENDENT** - Field supervision
5. **FOREMAN** - On-site crew management
6. **ARCHITECT_ENGINEER** - Design and engineering
7. **SUBCONTRACTOR** - Trade-specific work
8. **OWNER_REP** - Owner's representative
9. **INSPECTOR** - Quality and compliance inspection
10. **VIEWER** - Read-only access

---

## Organization Roles

1. **OWNER** - Full organization control, can delete org
2. **ORG_ADMIN** - Manage members and settings
3. **ORG_MEMBER** - Standard member access
4. **GUEST** - Limited read-only access

---

## System Roles

1. **SYSTEM_ADMIN** - Platform-wide administrative access
2. **USER** - Standard user account

---

## Notes for Testing

- All test users have the same password for easy testing: `Password123!`
- System Admin (`admin@bobbuilder.com`) has password: `Admin123!`
- Each organization owner can create and manage projects within their organization
- Organization admins can manage members but not delete the organization
- Project admins have full control over their projects
- The seed script clears all data before seeding, so it's safe to run multiple times
- Budget amounts are randomly generated between $5M and $15M for variety

---

## Troubleshooting

If the seed fails:

1. Ensure PostgreSQL is running
2. Check DATABASE_URL in `.env` file
3. Verify database exists: `createdb bobbuilder`
4. Check for TypeScript compilation errors
5. Ensure all entity imports are correct

To reset and re-seed:
```bash
npm run seed
```

The script automatically clears all existing data before seeding.
