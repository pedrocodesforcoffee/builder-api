# Test Credentials and Users

This document provides comprehensive information about all test accounts created by the database seed script.

## Overview

The seed script creates:
- **10 users** representing all construction roles
- **3 organizations** (General Contractor, Subcontractor, Owner)
- **5 projects** with various statuses and role assignments
- Comprehensive organization and project memberships

## Quick Start

```bash
# Run seed script to create test data
npm run seed

# Or reset database and re-seed
npm run migration:revert && npm run migration:run && npm run seed
```

## System Administrator

### Admin Account
- **Email:** `admin@bobbuilder.com`
- **Password:** `Admin123!`
- **System Role:** SYSTEM_ADMIN
- **Organization Memberships:** None
- **Project Memberships:** Viewer on projects 4 & 5
- **Use Case:** System administration, global operations, testing admin-level features

## Organization Users

### Acme Construction (General Contractor)

#### John Doe - Organization Owner
- **Email:** `john.doe@acme.com`
- **Password:** `Password123!`
- **System Role:** USER
- **Organization Role:** OWNER
- **Projects:**
  - Downtown Office Tower: PROJECT_ADMIN
  - Riverside Apartments: PROJECT_ADMIN
- **Use Case:** Organization management, project creation, owner-level permissions

#### Jane Smith - Organization Admin
- **Email:** `jane.smith@acme.com`
- **Password:** `Password123!`
- **System Role:** USER
- **Organization Role:** ORG_ADMIN
- **Projects:**
  - Downtown Office Tower: PROJECT_MANAGER
  - Riverside Apartments: PROJECT_ENGINEER
- **Use Case:** Organization administration, managing members, project oversight

#### Robert Miller - Organization Member
- **Email:** `robert.miller@acme.com`
- **Password:** `Password123!`
- **System Role:** USER
- **Organization Role:** ORG_MEMBER
- **Projects:**
  - Downtown Office Tower: SUPERINTENDENT
  - Riverside Apartments: FOREMAN
- **Use Case:** Field supervision, day-to-day construction management

---

### Summit Builders (Subcontractor)

#### Mike Johnson - Organization Owner
- **Email:** `mike.johnson@summit.com`
- **Password:** `Password123!`
- **System Role:** USER
- **Organization Role:** OWNER
- **Projects:**
  - Tech Campus Phase 2: PROJECT_ADMIN
- **Use Case:** Subcontractor business owner, project management

#### Sarah Williams - Organization Admin
- **Email:** `sarah.williams@summit.com`
- **Password:** `Password123!`
- **System Role:** USER
- **Organization Role:** ORG_ADMIN
- **Projects:**
  - Tech Campus Phase 2: SUBCONTRACTOR
- **Use Case:** Subcontractor coordination, specialized work management

#### Lisa Wilson - Organization Member
- **Email:** `lisa.wilson@summit.com`
- **Password:** `Password123!`
- **System Role:** USER
- **Organization Role:** ORG_MEMBER
- **Projects:**
  - Riverside Apartments: ARCHITECT_ENGINEER
  - Tech Campus Phase 2: OWNER_REP
- **Use Case:** Design review, architectural coordination, owner representation

---

### Elite Properties (Owner/Developer)

#### David Brown - Organization Owner
- **Email:** `david.brown@elite.com`
- **Password:** `Password123!`
- **System Role:** USER
- **Organization Role:** OWNER
- **Projects:**
  - Luxury Hotel Renovation: PROJECT_ADMIN
  - Shopping Mall Expansion: PROJECT_ADMIN
- **Use Case:** Property owner, development oversight, investment management

#### Emily Davis - Organization Admin
- **Email:** `emily.davis@elite.com`
- **Password:** `Password123!`
- **System Role:** USER
- **Organization Role:** ORG_ADMIN
- **Projects:**
  - Luxury Hotel Renovation: INSPECTOR
  - Shopping Mall Expansion: PROJECT_MANAGER
- **Use Case:** Quality assurance, compliance inspection, project management

#### James Moore - Organization Member
- **Email:** `james.moore@elite.com`
- **Password:** `Password123!`
- **System Role:** USER
- **Organization Role:** ORG_MEMBER
- **Projects:**
  - Luxury Hotel Renovation: VIEWER
  - Shopping Mall Expansion: PROJECT_ENGINEER
- **Use Case:** Read-only access, reporting, engineering tasks

---

## Project Role Descriptions

### 1. PROJECT_ADMIN
- **Permissions:** Full project control, member management, settings
- **Users:** John Doe, Mike Johnson, David Brown
- **Use Case:** Project ownership, complete administrative access

### 2. PROJECT_MANAGER
- **Permissions:** Project oversight, task management, reporting
- **Users:** Jane Smith (Downtown Office), Emily Davis (Shopping Mall)
- **Use Case:** Day-to-day project management, coordination

### 3. PROJECT_ENGINEER
- **Permissions:** Technical documentation, engineering tasks
- **Users:** Jane Smith (Riverside), James Moore (Shopping Mall)
- **Use Case:** Engineering design, technical reviews

### 4. SUPERINTENDENT
- **Permissions:** Field operations, worker supervision
- **Users:** Robert Miller (Downtown Office)
- **Use Case:** On-site construction management, safety oversight

### 5. FOREMAN
- **Permissions:** Crew management, daily operations
- **Users:** Robert Miller (Riverside)
- **Use Case:** Direct worker supervision, task coordination

### 6. ARCHITECT_ENGINEER
- **Permissions:** Design review, architectural coordination
- **Users:** Lisa Wilson (Riverside)
- **Use Case:** Design compliance, architectural oversight

### 7. SUBCONTRACTOR
- **Permissions:** Specialized work areas, subcontract management
- **Users:** Sarah Williams (Tech Campus)
- **Use Case:** Specialty trade coordination, subcontract work

### 8. OWNER_REP
- **Permissions:** Owner interests, approval authority
- **Users:** Lisa Wilson (Tech Campus)
- **Use Case:** Owner representation, decision authority

### 9. INSPECTOR
- **Permissions:** Quality control, compliance verification
- **Users:** Emily Davis (Luxury Hotel)
- **Use Case:** Quality assurance, code compliance

### 10. VIEWER
- **Permissions:** Read-only access
- **Users:** James Moore (Luxury Hotel), System Admin (Shopping Mall)
- **Use Case:** Stakeholder visibility, reporting

---

## Organizations

### Acme Construction
- **Type:** General Contractor
- **Slug:** `acme-construction`
- **Email:** info@acme-construction.com
- **Phone:** +1-555-100-0000
- **Address:** 123 Builder Ave, New York, NY 10001
- **Website:** https://acme-construction.com
- **Members:** 3 (John Doe, Jane Smith, Robert Miller)
- **Projects:** 2 (Downtown Office Tower, Riverside Apartments)

### Summit Builders
- **Type:** Subcontractor
- **Slug:** `summit-builders`
- **Email:** contact@summitbuilders.com
- **Phone:** +1-555-200-0000
- **Address:** 456 Construction Blvd, Los Angeles, CA 90001
- **Website:** https://summitbuilders.com
- **Members:** 3 (Mike Johnson, Sarah Williams, Lisa Wilson)
- **Projects:** 1 (Tech Campus Phase 2)

### Elite Properties
- **Type:** Owner/Developer
- **Slug:** `elite-properties`
- **Email:** info@eliteproperties.com
- **Phone:** +1-555-300-0000
- **Address:** 789 Property Lane, Chicago, IL 60601
- **Website:** https://eliteproperties.com
- **Members:** 3 (David Brown, Emily Davis, James Moore)
- **Projects:** 2 (Luxury Hotel Renovation, Shopping Mall Expansion)

---

## Projects

### 1. Downtown Office Tower
- **Code:** ACME-2024-001
- **Organization:** Acme Construction
- **Status:** ACTIVE
- **Location:** 100 Park Avenue, New York, NY 10001
- **Duration:** Jan 15, 2024 - Dec 31, 2025
- **Description:** 25-story mixed-use office building in downtown Manhattan
- **Team:**
  - John Doe (PROJECT_ADMIN)
  - Jane Smith (PROJECT_MANAGER)
  - Robert Miller (SUPERINTENDENT)

### 2. Riverside Apartments
- **Code:** ACME-2024-002
- **Organization:** Acme Construction
- **Status:** PLANNING
- **Location:** 500 Riverside Drive, New York, NY 10027
- **Duration:** Jun 1, 2024 - Mar 31, 2026
- **Description:** Luxury residential complex with 150 units
- **Team:**
  - John Doe (PROJECT_ADMIN)
  - Jane Smith (PROJECT_ENGINEER)
  - Robert Miller (FOREMAN)
  - Lisa Wilson (ARCHITECT_ENGINEER)

### 3. Tech Campus Phase 2
- **Code:** SUMMIT-2024-001
- **Organization:** Summit Builders
- **Status:** ACTIVE
- **Location:** 1000 Innovation Way, San Francisco, CA 94102
- **Duration:** Feb 1, 2024 - Aug 31, 2025
- **Description:** Modern office campus for tech company
- **Team:**
  - Mike Johnson (PROJECT_ADMIN)
  - Sarah Williams (SUBCONTRACTOR)
  - Lisa Wilson (OWNER_REP)

### 4. Luxury Hotel Renovation
- **Code:** ELITE-2024-001
- **Organization:** Elite Properties
- **Status:** ACTIVE
- **Location:** 200 Michigan Avenue, Chicago, IL 60601
- **Duration:** Mar 1, 2024 - Jun 30, 2025
- **Description:** Complete renovation of historic 5-star hotel
- **Team:**
  - David Brown (PROJECT_ADMIN)
  - Emily Davis (INSPECTOR)
  - James Moore (VIEWER)

### 5. Shopping Mall Expansion
- **Code:** ELITE-2024-002
- **Organization:** Elite Properties
- **Status:** ON_HOLD
- **Location:** 750 Commerce Street, Chicago, IL 60607
- **Duration:** Sep 1, 2024 - Dec 31, 2025
- **Description:** Adding 50,000 sq ft retail space
- **Team:**
  - David Brown (PROJECT_ADMIN)
  - Emily Davis (PROJECT_MANAGER)
  - James Moore (PROJECT_ENGINEER)
  - System Admin (VIEWER)

---

## Testing Scenarios

### Authentication Testing
```bash
# Login as system admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bobbuilder.com","password":"Admin123!"}'

# Login as organization owner
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john.doe@acme.com","password":"Password123!"}'
```

### Permission Testing

#### System Admin Permissions
- Test with: `admin@bobbuilder.com`
- Should have: Global access to all resources
- Test cases: User management, system settings, all organizations

#### Organization Owner Permissions
- Test with: `john.doe@acme.com`, `mike.johnson@summit.com`, `david.brown@elite.com`
- Should have: Full control over their organization and projects
- Test cases: Create projects, manage members, organization settings

#### Organization Admin Permissions
- Test with: `jane.smith@acme.com`, `sarah.williams@summit.com`, `emily.davis@elite.com`
- Should have: Member management, limited organization settings
- Test cases: Add/remove members, update organization details

#### Project Role Permissions
- Test each project role with different endpoints
- Verify role-based access control
- Test cross-organization access restrictions

### Multi-Role Testing

#### Users with Multiple Roles
- **Lisa Wilson:** ORG_MEMBER + ARCHITECT_ENGINEER + OWNER_REP
- **Emily Davis:** ORG_ADMIN + INSPECTOR + PROJECT_MANAGER
- **James Moore:** ORG_MEMBER + VIEWER + PROJECT_ENGINEER

Test these users to verify:
- Proper role aggregation
- Correct permission calculation
- Context-appropriate access

### Cross-Organization Testing

#### Scenario 1: Accessing Other Organizations
- Login as `john.doe@acme.com` (Acme Construction)
- Attempt to access Summit Builders projects
- **Expected:** Access denied (403)

#### Scenario 2: Project Collaboration
- Login as `lisa.wilson@summit.com`
- Access Riverside Apartments (Acme project where she's ARCHITECT_ENGINEER)
- **Expected:** Access granted with ARCHITECT_ENGINEER permissions

### Edge Cases

#### No Organization Membership
- User: `admin@bobbuilder.com` (system admin)
- Test: Creating/accessing organizations without membership
- **Expected:** System admin has global access

#### Read-Only Access
- User: `james.moore@elite.com` (VIEWER on Luxury Hotel)
- Test: Attempt to modify project data
- **Expected:** Read operations succeed, write operations fail

#### Multi-Project Access
- User: `john.doe@acme.com` (PROJECT_ADMIN on 2 projects)
- Test: Switching between projects, accessing both
- **Expected:** Full access to both projects

---

## API Testing Examples

### Get User Profile
```bash
TOKEN="<your-jwt-token>"

curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### List Organizations
```bash
# As organization member
curl -X GET http://localhost:3000/api/organizations \
  -H "Authorization: Bearer $TOKEN"
```

### List Projects
```bash
# All accessible projects
curl -X GET http://localhost:3000/api/projects \
  -H "Authorization: Bearer $TOKEN"

# Filter by status
curl -X GET "http://localhost:3000/api/projects?status=active" \
  -H "Authorization: Bearer $TOKEN"

# Filter by organization
curl -X GET "http://localhost:3000/api/projects?organizationId=<org-id>" \
  -H "Authorization: Bearer $TOKEN"
```

### Create New Project
```bash
# As organization owner or admin
curl -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "<org-id>",
    "name": "Test Project",
    "code": "TEST-001",
    "description": "Test project description",
    "location": "Test Location",
    "status": "planning",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  }'
```

---

## Postman Collection

Import the Postman collection from `/postman/` directory for pre-configured requests with:
- All test user credentials
- Authentication workflows
- CRUD operations for each resource
- Permission testing scenarios

---

## Password Policy

All test accounts use the following password:
- **Default:** `Password123!`
- **Admin:** `Admin123!`

**Note:** These are test credentials only. Never use these passwords in production.

---

## Security Notes

1. **Test Environment Only:** These credentials are for development and testing
2. **Reset Regularly:** Run seed script to reset to known state
3. **No Sensitive Data:** Test data contains no real personal information
4. **Email Verification:** All accounts are pre-verified (`emailVerified: true`)
5. **Active Status:** All accounts are active (`isActive: true`)

---

## Troubleshooting

### Seed Script Fails
```bash
# Check database connection
npm run migration:show

# Reset database
npm run migration:revert
npm run migration:run
npm run seed
```

### Authentication Fails
- Verify email and password are correct
- Check database seed ran successfully
- Verify JWT_SECRET is configured in `.env`

### Permission Denied
- Verify user has appropriate role for the operation
- Check organization/project membership
- Review permission matrix in `/docs/PERMISSION_MATRIX.md`

---

## Related Documentation

- [Permission Matrix](./PERMISSION_MATRIX.md) - Complete permission reference
- [Multi-Level Roles](./MULTI_LEVEL_ROLES.md) - Role system architecture
- [Manual Testing Checklist](./MANUAL_TESTING_CHECKLIST.md) - Testing procedures
- [Architecture](./ARCHITECTURE.md) - System design overview

---

Last Updated: November 10, 2025
