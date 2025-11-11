# Multi-Level Role-Based Access Control (RBAC)

## Overview

The Bob the Builder platform implements a sophisticated three-tier role-based access control system designed specifically for construction project management. This system provides granular control over user permissions at the system, organization, and project levels.

## Table of Contents

1. [Role Hierarchy](#role-hierarchy)
2. [System Architecture](#system-architecture)
3. [Entity Schemas](#entity-schemas)
4. [Role Definitions](#role-definitions)
5. [Permission Matrix](#permission-matrix)
6. [Scope-Based Access Control](#scope-based-access-control)
7. [Invitation Workflow](#invitation-workflow)
8. [Validation Rules](#validation-rules)
9. [Usage Examples](#usage-examples)
10. [Best Practices](#best-practices)

---

## Role Hierarchy

### Three-Tier Architecture

```
┌─────────────────────────────────────────────────┐
│          System Level (Platform-wide)           │
│  • SYSTEM_ADMIN - Platform administration       │
│  • USER - Regular platform user                 │
└──────────────────┬──────────────────────────────┘
                   │
         ┌─────────▼─────────┐
         │  Organization Level│
         │  • OWNER           │ (highest)
         │  • ORG_ADMIN       │
         │  • ORG_MEMBER      │
         │  • GUEST           │ (lowest)
         └─────────┬──────────┘
                   │
         ┌─────────▼─────────┐
         │   Project Level    │
         │  • PROJECT_ADMIN   │ (highest)
         │  • PROJECT_MANAGER │
         │  • PROJECT_ENGINEER│
         │  • SUPERINTENDENT  │
         │  • FOREMAN         │
         │  • ARCHITECT_ENGINEER
         │  • SUBCONTRACTOR   │
         │  • OWNER_REP       │
         │  • INSPECTOR       │
         │  • VIEWER          │ (lowest)
         └────────────────────┘
```

### Permission Inheritance

- **System roles** grant access to the platform
- **Organization roles** control access to organization-wide resources
- **Project roles** control access to specific project resources
- Higher organization roles can assign project roles to members
- Project permissions are isolated to individual projects

---

## System Architecture

### Entity Relationships

```
┌──────────────┐
│     User     │
│ (System Role)│
└──────┬───────┘
       │
       │ has many
       ▼
┌──────────────────────┐         ┌─────────────────┐
│ OrganizationMember   │─────────│  Organization   │
│ • role               │ belongs │                 │
│ • invitedAt          │    to   │                 │
│ • acceptedAt         │         │                 │
│ • joinedAt           │         │                 │
└──────────────────────┘         └─────────────────┘
       │
       │ can have
       ▼
┌──────────────────────┐         ┌─────────────────┐
│   ProjectMember      │─────────│     Project     │
│ • role               │ belongs │                 │
│ • scope              │    to   │                 │
│ • expiresAt          │         │                 │
│ • invitedAt          │         │                 │
│ • acceptedAt         │         │                 │
│ • joinedAt           │         │                 │
│ • lastAccessedAt     │         │                 │
└──────────────────────┘         └─────────────────┘
```

---

## Entity Schemas

### OrganizationMember

**Table:** `organization_members`

**Primary Key:** Composite (`user_id`, `organization_id`)

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `user_id` | UUID | No | Reference to User |
| `organization_id` | UUID | No | Reference to Organization |
| `role` | ENUM | No | Organization role |
| `added_by_user_id` | UUID | Yes | Who added this member |
| `invited_at` | TIMESTAMP | Yes | When invitation was sent |
| `accepted_at` | TIMESTAMP | Yes | When invitation was accepted |
| `joined_at` | TIMESTAMP | Yes | When member joined |
| `created_at` | TIMESTAMP | No | Record creation time |
| `updated_at` | TIMESTAMP | No | Last update time |

**Indices:**
- `IDX_org_members_user_org` - Unique composite index
- `IDX_org_members_organization` - Organization lookup
- `IDX_org_members_user` - User lookup
- `IDX_org_members_role` - Role filtering
- `IDX_org_members_invited_at` - Invitation queries
- `IDX_org_members_joined_at` - Active member queries

### ProjectMember

**Table:** `project_members`

**Primary Key:** Composite (`user_id`, `project_id`)

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `user_id` | UUID | No | Reference to User |
| `project_id` | UUID | No | Reference to Project |
| `role` | ENUM | No | Project role |
| `scope` | JSONB | Yes | Access limitations |
| `added_by_user_id` | UUID | Yes | Who added this member |
| `expires_at` | TIMESTAMP | Yes | Membership expiration |
| `invited_at` | TIMESTAMP | Yes | When invitation was sent |
| `accepted_at` | TIMESTAMP | Yes | When invitation was accepted |
| `joined_at` | TIMESTAMP | Yes | When member joined |
| `last_accessed_at` | TIMESTAMP | Yes | Last project access |
| `created_at` | TIMESTAMP | No | Record creation time |
| `updated_at` | TIMESTAMP | No | Last update time |

**Indices:**
- `IDX_proj_members_user_proj` - Unique composite index
- `IDX_proj_members_project` - Project lookup
- `IDX_proj_members_user` - User lookup
- `IDX_proj_members_role` - Role filtering
- `IDX_proj_members_expires_at` - Expiration queries
- `IDX_proj_members_invited_at` - Invitation queries
- `IDX_proj_members_joined_at` - Active member queries
- `IDX_proj_members_last_accessed` - Activity tracking

---

## Role Definitions

### Organization Roles

#### OWNER (Level 4)
**Highest organization authority**
- Full control over organization
- Can add/remove any members
- Can assign OWNER role to others
- Can manage billing and settings
- Cannot be demoted if last owner

**Use Cases:**
- Company founders
- CEO/Managing Directors
- Organization creators

#### ORG_ADMIN (Level 3)
**Administrative authority**
- Can manage organization members (except OWNERs)
- Can create and manage projects
- Can invite users
- Cannot assign OWNER role

**Use Cases:**
- Vice Presidents
- Department Heads
- Office Managers

#### ORG_MEMBER (Level 2)
**Regular organization member**
- Can view organization projects
- Can be assigned to projects
- Can invite GUEST users
- Limited administrative access

**Use Cases:**
- Regular employees
- Project participants
- Internal staff

#### GUEST (Level 1)
**Minimal organization access**
- Read-only access to assigned projects
- Cannot manage members
- Cannot create projects
- Temporary or external access

**Use Cases:**
- External consultants (temporary)
- Auditors
- Client representatives (limited access)

### Project Roles

#### PROJECT_ADMIN
**Highest project authority**
- Full control over project
- Can manage all project members
- Can modify project settings
- Can delete project
- **No scope limitations** (needs full access)

**Use Cases:**
- Project owners
- Senior project managers

#### PROJECT_MANAGER
**Day-to-day project management**
- Can manage most project members
- Can approve changes
- Can assign tasks
- Controls project schedule
- **Rarely has scope limitations**

**Use Cases:**
- Project managers
- Construction managers

#### PROJECT_ENGINEER
**Engineering oversight**
- Technical decision authority
- Can review and approve designs
- Can manage technical documentation
- Limited member management

**Use Cases:**
- Lead engineers
- Technical architects

#### SUPERINTENDENT
**On-site supervision**
- Daily site management
- Worker coordination
- Safety compliance
- Progress reporting

**Use Cases:**
- Site superintendents
- Construction supervisors

#### FOREMAN
**Trade-specific supervision**
- Manages specific trade crews
- Often has **scope limitations** (specific trades/areas)
- Quality control for their area
- Direct worker oversight

**Use Cases:**
- Electrical foreman (scope: electrical)
- Plumbing foreman (scope: plumbing)

**Example Scope:**
```json
{
  "trades": ["electrical"],
  "floors": ["1", "2", "3"]
}
```

#### ARCHITECT_ENGINEER
**Design and specification**
- Design document access
- Specification management
- Design review and approval
- Change order review

**Use Cases:**
- Architects
- Structural engineers
- MEP engineers

#### SUBCONTRACTOR
**Contract-based work**
- **Always has scope limitations** (specific work areas)
- **Always has expiration date** (contract period)
- Limited to contracted work
- Cannot manage other members

**Use Cases:**
- Electrical contractor (scope: electrical, expiry: contract end)
- HVAC contractor (scope: hvac, expiry: contract end)

**Example Configuration:**
```typescript
{
  role: ProjectRole.SUBCONTRACTOR,
  scope: ["hvac"],
  expiresAt: new Date('2025-12-31')
}
```

#### OWNER_REP
**Owner's representative**
- Owner's interests on site
- **Read-only** access
- Can review progress
- Cannot edit data

**Use Cases:**
- Client representatives
- Owner's project managers

#### INSPECTOR
**Quality and compliance**
- Inspection authority
- **Read-only** access
- Can create inspection reports
- Often has **expiration date** (inspection period)

**Use Cases:**
- Building inspectors
- Quality inspectors
- Safety inspectors

#### VIEWER
**Read-only access**
- Can view project information
- Cannot edit anything
- Cannot manage members
- Lowest project access

**Use Cases:**
- Observers
- Trainees
- Documentation purposes

---

## Permission Matrix

### Organization Level Permissions

| Action | OWNER | ORG_ADMIN | ORG_MEMBER | GUEST |
|--------|-------|-----------|------------|-------|
| View organization | ✅ | ✅ | ✅ | ✅ |
| Edit organization | ✅ | ✅ | ❌ | ❌ |
| Delete organization | ✅ | ❌ | ❌ | ❌ |
| Add OWNER | ✅ | ❌ | ❌ | ❌ |
| Add ORG_ADMIN | ✅ | ✅ | ❌ | ❌ |
| Add ORG_MEMBER | ✅ | ✅ | ✅ | ❌ |
| Add GUEST | ✅ | ✅ | ✅ | ❌ |
| Remove members | ✅ | ✅ | ❌ | ❌ |
| Create projects | ✅ | ✅ | ❌ | ❌ |
| View all projects | ✅ | ✅ | ✅ | ❌ |
| Manage billing | ✅ | ❌ | ❌ | ❌ |

### Project Level Permissions

| Action | ADMIN | MANAGER | ENGINEER | SUPER | FOREMAN | VIEWER |
|--------|-------|---------|----------|-------|---------|--------|
| View project | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit project | ✅ | ✅ | ✅ | ✅ | ✅* | ❌ |
| Delete project | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage members | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Assign tasks | ✅ | ✅ | ✅ | ✅ | ✅* | ❌ |
| Upload documents | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create reports | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Approve changes | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

\* Limited to their scope

---

## Scope-Based Access Control

### Overview

Scope provides granular access control within a project, allowing members to access only specific areas, trades, or resources.

### Scope Formats

#### Array Format (Simple)
Best for single-dimension restrictions:

```typescript
scope: ["electrical", "plumbing", "hvac"]
```

**Use Cases:**
- Trade-specific access
- Simple area restrictions

#### Object Format (Complex)
Best for multi-dimension restrictions:

```typescript
scope: {
  trades: ["electrical", "plumbing"],
  floors: ["1", "2", "3", "basement"],
  areas: ["north-wing", "south-wing"],
  buildings: ["building-a"]
}
```

**Use Cases:**
- Multi-trade contractors
- Floor-specific access
- Area-specific work
- Building-specific access

### Scope Validation Rules

1. **Format Rules:**
   - `null` or `undefined` = No scope limitations (full access)
   - Empty array `[]` is **invalid** (use `null` instead)
   - Empty object `{}` is **invalid** (use `null` instead)
   - All array elements must be non-empty strings
   - All object values must be non-empty string arrays

2. **Role-Specific Recommendations:**
   - `PROJECT_ADMIN` should **not** have scope (needs full access)
   - `PROJECT_MANAGER` with scope is **unusual** (warning issued)
   - `SUBCONTRACTOR` and `FOREMAN` **should** have scope
   - Other roles: scope is optional

### Scope Helper Methods

```typescript
// Check if member has scope limitations
member.hasScopeLimitations(): boolean

// Check access to specific scope item
member.hasAccessToScope(key?: string, value?: string): boolean

// Examples:
member.hasAccessToScope() // Has any scope?
member.hasAccessToScope('trades', 'electrical') // Has electrical access?
member.hasAccessToScope('floors') // Has any floor access?
```

### Scope Examples

#### Example 1: Electrical Subcontractor
```typescript
const electrician: ProjectMember = {
  role: ProjectRole.SUBCONTRACTOR,
  scope: ["electrical"],
  expiresAt: new Date('2025-12-31')
};

electrician.hasAccessToScope(undefined, 'electrical'); // true
electrician.hasAccessToScope(undefined, 'plumbing'); // false
```

#### Example 2: Multi-Trade Foreman
```typescript
const foreman: ProjectMember = {
  role: ProjectRole.FOREMAN,
  scope: {
    trades: ["electrical", "plumbing"],
    floors: ["1", "2"]
  }
};

foreman.hasAccessToScope('trades', 'electrical'); // true
foreman.hasAccessToScope('trades', 'hvac'); // false
foreman.hasAccessToScope('floors', '1'); // true
foreman.hasAccessToScope('floors', '5'); // false
```

#### Example 3: Full Project Access
```typescript
const projectManager: ProjectMember = {
  role: ProjectRole.PROJECT_MANAGER,
  scope: null // No limitations
};

projectManager.hasScopeLimitations(); // false
projectManager.hasAccessToScope('anything', 'anywhere'); // true
```

---

## Invitation Workflow

### Workflow States

```
┌──────────────┐
│   No Member  │
└──────┬───────┘
       │
       │ Invitation Sent
       ▼
┌──────────────┐    invitedAt: SET
│   Pending    │    acceptedAt: null
│  Invitation  │    joinedAt: null
└──────┬───────┘
       │
       │ User Accepts
       ▼
┌──────────────┐    invitedAt: SET
│   Accepted   │    acceptedAt: SET
│              │    joinedAt: null
└──────┬───────┘
       │
       │ User Joins/Activates
       ▼
┌──────────────┐    invitedAt: SET
│    Joined    │    acceptedAt: SET
│   (Active)   │    joinedAt: SET
└──────────────┘
```

### Direct Assignment (No Invitation)

For immediate access (e.g., organization owner adding admin):

```typescript
{
  role: OrganizationRole.ORG_ADMIN,
  invitedAt: null,
  acceptedAt: null,
  joinedAt: new Date() // Immediately active
}
```

### Invitation Workflow Example

```typescript
// Step 1: Send invitation
const invitation = await orgMemberRepo.save({
  userId: newUser.id,
  organizationId: org.id,
  role: OrganizationRole.ORG_MEMBER,
  invitedAt: new Date()
});

// Step 2: User accepts (later)
await orgMemberRepo.update(
  { userId: newUser.id, organizationId: org.id },
  { acceptedAt: new Date() }
);

// Step 3: User joins/activates (may be immediate or delayed)
await orgMemberRepo.update(
  { userId: newUser.id, organizationId: org.id },
  { joinedAt: new Date() }
);
```

### Helper Methods

```typescript
member.isInvitationPending(): boolean // Has invite, not accepted
member.hasJoined(): boolean // Has joined timestamp
```

### Querying Invitations

```typescript
// Find pending invitations
const pending = await memberRepo
  .createQueryBuilder('member')
  .where('member.invitedAt IS NOT NULL')
  .andWhere('member.acceptedAt IS NULL')
  .getMany();

// Find active members
const active = await memberRepo
  .createQueryBuilder('member')
  .where('member.joinedAt IS NOT NULL')
  .getMany();
```

---

## Validation Rules

### Organization Member Validation

#### Rule 1: Last Owner Protection
**Cannot remove or demote the last OWNER**

```typescript
import { validateNotRemovingLastOwner, validateNotDemotingLastOwner } from '@modules/organizations/utils/organization-member.validator';

// Before removing
await validateNotRemovingLastOwner(orgId, userId, memberRepo);

// Before demoting
await validateNotDemotingLastOwner(orgId, userId, newRole, memberRepo);
```

**Throws:** `ConflictException` if operation would leave organization without owner

#### Rule 2: Role Hierarchy
**Users cannot assign roles higher than their own**

```typescript
import { validateRoleHierarchy } from '@modules/organizations/utils/organization-member.validator';

validateRoleHierarchy(actorRole, targetRole);
```

**Rules:**
- Only `OWNER` can assign `OWNER` role
- `GUEST` cannot manage members
- Cannot assign roles higher than actor's role

#### Rule 3: Invitation Timestamps
**Timestamps must be in correct order**

```typescript
import { validateInvitationTimestamps } from '@modules/organizations/utils/organization-member.validator';

validateInvitationTimestamps(invitedAt, acceptedAt, joinedAt);
```

**Rules:**
- Cannot accept without invitation
- Cannot join without accepting
- `acceptedAt` ≥ `invitedAt`
- `joinedAt` ≥ `acceptedAt`

### Project Member Validation

#### Rule 1: Scope Validation
**Scope must be properly formatted**

```typescript
import { validateScope } from '@modules/projects/utils/project-member.validator';

validateScope(scope);
```

**Rules:**
- `null` or `undefined` = no limitations (valid)
- Array format: non-empty, all strings
- Object format: non-empty, all values are string arrays
- No empty strings allowed

#### Rule 2: Expiration Date Validation
**Expiration must be in the future**

```typescript
import { validateExpiresAt } from '@modules/projects/utils/project-member.validator';

validateExpiresAt(expiresAt, maxYearsInFuture);
```

**Rules:**
- Must be future date
- Cannot be more than 5 years in future (configurable)
- `null` = no expiration (valid)

#### Rule 3: Project Role Hierarchy
**Role assignment follows hierarchy**

```typescript
import { validateProjectRoleHierarchy } from '@modules/projects/utils/project-member.validator';

validateProjectRoleHierarchy(actorRole, targetRole);
```

**Rules:**
- Only `PROJECT_ADMIN` can assign `PROJECT_ADMIN`
- Non-admin roles cannot manage members
- Cannot assign higher admin roles

#### Rule 4: Scope Appropriateness (Warnings)
**Validates scope makes sense for role**

```typescript
import { validateScopeForRole } from '@modules/projects/utils/project-member.validator';

const warning = validateScopeForRole(role, scope);
// Returns warning string or null
```

**Warnings:**
- `PROJECT_ADMIN` with scope (should have full access)
- `SUBCONTRACTOR` or `FOREMAN` without scope (unusual)

#### Rule 5: Expiration Appropriateness (Warnings)
**Validates expiration makes sense for role**

```typescript
import { validateExpiresAtForRole } from '@modules/projects/utils/project-member.validator';

const warning = validateExpiresAtForRole(role, expiresAt);
// Returns warning string or null
```

**Warnings:**
- Core team roles with expiration (unusual)
- `SUBCONTRACTOR` or `INSPECTOR` without expiration (should be temporary)

---

## Usage Examples

### Example 1: Create Organization with Owner

```typescript
import { OrganizationRole } from '@modules/users/enums/organization-role.enum';

// Create organization
const org = await orgRepo.save({
  name: 'ACME Construction',
  slug: 'acme-construction'
});

// Add founder as owner
const ownerMember = await orgMemberRepo.save({
  userId: founder.id,
  organizationId: org.id,
  role: OrganizationRole.OWNER,
  joinedAt: new Date() // Direct assignment
});
```

### Example 2: Invite User to Organization

```typescript
// Send invitation
const invitation = await orgMemberRepo.save({
  userId: newUser.id,
  organizationId: org.id,
  role: OrganizationRole.ORG_MEMBER,
  addedByUserId: currentUser.id,
  invitedAt: new Date()
});

// Later: User accepts
await orgMemberRepo.update(
  { userId: newUser.id, organizationId: org.id },
  {
    acceptedAt: new Date(),
    joinedAt: new Date()
  }
);
```

### Example 3: Add Subcontractor with Scope and Expiration

```typescript
import { ProjectRole } from '@modules/users/enums/project-role.enum';
import { validateScope, validateExpiresAt } from '@modules/projects/utils/project-member.validator';

// Define scope
const scope = {
  trades: ['electrical'],
  floors: ['1', '2', '3']
};

// Validate
validateScope(scope); // Throws if invalid

// Set expiration (contract end date)
const expiresAt = new Date('2025-12-31');
validateExpiresAt(expiresAt); // Throws if invalid

// Create membership
const contractor = await projectMemberRepo.save({
  userId: contractorUser.id,
  projectId: project.id,
  role: ProjectRole.SUBCONTRACTOR,
  scope,
  expiresAt,
  addedByUserId: projectManager.id,
  joinedAt: new Date()
});
```

### Example 4: Promote Member with Validation

```typescript
import { validateNotDemotingLastOwner } from '@modules/organizations/utils/organization-member.validator';

// Get current member
const member = await orgMemberRepo.findOne({
  where: { userId, organizationId }
});

// Validate promotion is allowed
await validateNotDemotingLastOwner(
  organizationId,
  userId,
  OrganizationRole.ORG_ADMIN,
  orgMemberRepo
);

// Perform promotion
await orgMemberRepo.update(
  { userId, organizationId },
  { role: OrganizationRole.ORG_ADMIN }
);
```

### Example 5: Query Active Members with Scope

```typescript
// Find all active subcontractors with electrical scope
const electricians = await projectMemberRepo
  .createQueryBuilder('member')
  .where('member.role = :role', { role: ProjectRole.SUBCONTRACTOR })
  .andWhere('member.joinedAt IS NOT NULL')
  .andWhere('member.expiresAt > :now', { now: new Date() })
  .andWhere('member.scope @> :scope', { scope: JSON.stringify(['electrical']) })
  .getMany();
```

### Example 6: Transfer Organization Ownership

```typescript
import {
  validateNotRemovingLastOwner,
  validateRoleHierarchy
} from '@modules/organizations/utils/organization-member.validator';

// Step 1: Promote new owner
validateRoleHierarchy(currentOwnerRole, OrganizationRole.OWNER);

await orgMemberRepo.save({
  userId: newOwner.id,
  organizationId: org.id,
  role: OrganizationRole.OWNER,
  addedByUserId: currentOwner.id,
  joinedAt: new Date()
});

// Step 2: Demote old owner (now safe, 2 owners exist)
await validateNotDemotingLastOwner(
  org.id,
  currentOwner.id,
  OrganizationRole.ORG_ADMIN,
  orgMemberRepo
);

await orgMemberRepo.update(
  { userId: currentOwner.id, organizationId: org.id },
  { role: OrganizationRole.ORG_ADMIN }
);
```

### Example 7: Track Member Activity

```typescript
// Update last accessed timestamp
await projectMemberRepo.update(
  { userId, projectId },
  { lastAccessedAt: new Date() }
);

// Find inactive members (not accessed in 30 days)
const inactiveMembers = await projectMemberRepo
  .createQueryBuilder('member')
  .where('member.lastAccessedAt < :date', {
    date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  })
  .getMany();

// Use helper method
const daysSinceAccess = member.getDaysSinceLastAccess();
if (daysSinceAccess !== null && daysSinceAccess > 30) {
  console.log(`Member inactive for ${daysSinceAccess} days`);
}
```

---

## Best Practices

### 1. Role Assignment

**DO:**
- ✅ Assign the most restrictive role that meets requirements
- ✅ Use `GUEST` for temporary external access
- ✅ Add expiration dates for contract-based roles
- ✅ Use scope to limit subcontractor access
- ✅ Validate roles before assignment

**DON'T:**
- ❌ Give `OWNER` role unnecessarily
- ❌ Use `PROJECT_ADMIN` for regular managers
- ❌ Forget expiration dates for contractors
- ❌ Skip validation checks

### 2. Scope Management

**DO:**
- ✅ Always set scope for `SUBCONTRACTOR` and `FOREMAN`
- ✅ Use object format for multi-dimension restrictions
- ✅ Use clear, consistent scope keys (`trades`, `floors`, `areas`)
- ✅ Validate scope format before saving

**DON'T:**
- ❌ Add scope to `PROJECT_ADMIN` (needs full access)
- ❌ Use empty arrays or objects
- ❌ Use inconsistent scope keys across projects

### 3. Invitation Workflow

**DO:**
- ✅ Use invitation workflow for external users
- ✅ Track all three timestamps (`invited`, `accepted`, `joined`)
- ✅ Send email notifications at each step
- ✅ Allow users to decline invitations

**DON'T:**
- ❌ Use invitation workflow for immediate internal assignments
- ❌ Skip validation of timestamp ordering
- ❌ Forget to set `addedByUserId` for audit trail

### 4. Organization Management

**DO:**
- ✅ Always maintain at least one `OWNER`
- ✅ Validate before removing/demoting owners
- ✅ Use multiple owners for important organizations
- ✅ Document ownership transfers

**DON'T:**
- ❌ Remove the last owner
- ❌ Allow `GUEST` to manage members
- ❌ Skip hierarchy validation

### 5. Performance

**DO:**
- ✅ Use composite indices for member lookups
- ✅ Query with specific conditions (avoid `SELECT *`)
- ✅ Use query builders for complex scope queries
- ✅ Index frequently queried fields

**DON'T:**
- ❌ Load all members when you need one
- ❌ Perform N+1 queries
- ❌ Ignore database query performance

### 6. Security

**DO:**
- ✅ Always validate user permissions before operations
- ✅ Use role hierarchy to enforce access control
- ✅ Audit ownership changes
- ✅ Log permission denials

**DON'T:**
- ❌ Trust client-side role checks
- ❌ Allow users to self-promote
- ❌ Skip server-side validation
- ❌ Expose sensitive membership data

### 7. Testing

**DO:**
- ✅ Test all validation rules
- ✅ Test edge cases (last owner, scope boundaries)
- ✅ Use integration tests for database operations
- ✅ Test permission matrix thoroughly

**DON'T:**
- ❌ Skip testing validation exceptions
- ❌ Forget to test role hierarchy
- ❌ Ignore scope validation tests

---

## Conclusion

This multi-level RBAC system provides construction-specific role management with:
- ✅ Three-tier hierarchy (System → Organization → Project)
- ✅ 10 specialized project roles
- ✅ Scope-based access control
- ✅ Time-based expiration
- ✅ Invitation workflow tracking
- ✅ Comprehensive validation rules
- ✅ Activity monitoring

For implementation support or questions, refer to:
- Entity definitions: `src/modules/{organizations,projects}/entities/`
- Validators: `src/modules/{organizations,projects}/utils/`
- Tests: `src/modules/*/entities/__tests__/` and `test/integration/`

**Ready for Permission Matrix Implementation** ✅
