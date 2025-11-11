# Role Inheritance System Documentation

## Overview

The Role Inheritance System automatically cascades organization-level roles to project-level permissions, ensuring that organization owners and admins have appropriate access to all projects within their organization.

## Inheritance Hierarchy

```
┌─────────────────────────────────────────────────────┐
│         Permission Check Flow                        │
└─────────────────────────────────────────────────────┘

User requests access to Project X

          ↓

[1] Is user System Admin?
    YES → Grant PROJECT_ADMIN (bypass all other checks)
    NO  → Continue

          ↓

[2] Get Project's Organization

          ↓

[3] Is user OWNER of organization?
    YES → Grant PROJECT_ADMIN (inherited)
    NO  → Continue

          ↓

[4] Is user ORG_ADMIN of organization?
    YES → Grant PROJECT_ADMIN (inherited)
    NO  → Continue

          ↓

[5] Does user have explicit ProjectMembership?
    YES → Check expiration
          - Expired? → DENY ACCESS
          - Valid? → Use assigned role
    NO  → Continue

          ↓

[6] DENY ACCESS (no membership)
```

## Role Resolution Rules

### 1. System Admin (Highest Priority)

**Role**: `SYSTEM_ADMIN`
**Access**: Complete access to ALL organizations and projects
**Inheritance**: Automatic PROJECT_ADMIN on all projects
**Expiration**: Never expires
**Scope**: No scope limitations

```typescript
// Example: System Admin Access
const result = await inheritanceService.getEffectiveRole(systemAdminId, anyProjectId);
// Returns: { effectiveRole: PROJECT_ADMIN, source: 'system_admin', isInherited: true }
```

### 2. Organization OWNER

**Role**: `OrganizationRole.OWNER`
**Inherits**: `PROJECT_ADMIN` on ALL organization projects
**Automatic**: YES - no explicit ProjectMembership needed
**Override**: Cannot be demoted on org projects
**Expiration**: Never expires (organization-level)
**Scope**: No scope limitations

```typescript
// Example: Org Owner Access
const result = await inheritanceService.getEffectiveRole(ownerId, orgProjectId);
// Returns: {
//   effectiveRole: PROJECT_ADMIN,
//   source: 'org_owner',
//   isInherited: true,
//   organizationRole: OrganizationRole.OWNER
// }
```

### 3. Organization ORG_ADMIN

**Role**: `OrganizationRole.ORG_ADMIN`
**Inherits**: `PROJECT_ADMIN` on ALL organization projects
**Automatic**: YES - no explicit ProjectMembership needed
**Override**: Cannot be demoted on org projects
**Expiration**: Never expires (organization-level)
**Scope**: No scope limitations

```typescript
// Example: Org Admin Access
const result = await inheritanceService.getEffectiveRole(adminId, orgProjectId);
// Returns: {
//   effectiveRole: PROJECT_ADMIN,
//   source: 'org_admin',
//   isInherited: true,
//   organizationRole: OrganizationRole.ORG_ADMIN
// }
```

### 4. Organization ORG_MEMBER

**Role**: `OrganizationRole.ORG_MEMBER`
**Inherits**: NOTHING - no automatic project access
**Automatic**: NO - must be explicitly added to projects
**Access**: Only projects where explicitly added as member

```typescript
// Example: Org Member (no project membership)
const result = await inheritanceService.getEffectiveRole(memberId, orgProjectId);
// Returns: { effectiveRole: null, source: 'none', isInherited: false }

// Example: Org Member (with explicit project membership)
const result = await inheritanceService.getEffectiveRole(memberId, projectId);
// Returns: {
//   effectiveRole: SUPERINTENDENT,
//   source: 'explicit',
//   isInherited: false,
//   projectRole: SUPERINTENDENT
// }
```

## Conflict Resolution

When multiple role sources exist, the system follows this precedence order:

### Precedence Order (Highest to Lowest)

1. **System Admin** - Always wins, complete access
2. **Organization OWNER** - Always PROJECT_ADMIN on org projects
3. **Organization ORG_ADMIN** - Always PROJECT_ADMIN on org projects
4. **Explicit Project Membership** - User's assigned project role
5. **No Access** - Not a member

### Scenario Examples

#### Scenario 1: Org Owner with Explicit Lower Role

```typescript
// User is ORG OWNER
// Explicit ProjectMembership: VIEWER
// Resolution: PROJECT_ADMIN (org owner inheritance wins)

const result = await inheritanceService.getEffectiveRole(ownerId, projectId);
// result.effectiveRole === PROJECT_ADMIN
// result.source === 'org_owner'
// Reason: Cannot demote org owners on their own projects
```

#### Scenario 2: Org Admin with Expired Explicit Role

```typescript
// User is ORG_ADMIN
// Explicit ProjectMembership: SUPERINTENDENT (expired yesterday)
// Resolution: PROJECT_ADMIN (org admin inheritance never expires)

const result = await inheritanceService.getEffectiveRole(adminId, projectId);
// result.effectiveRole === PROJECT_ADMIN
// result.source === 'org_admin'
// Reason: Organization-level access doesn't expire
```

#### Scenario 3: Multiple Organization Memberships

```typescript
// User is OWNER in Org A, MEMBER in Org B
// Project belongs to Org A
// Resolution: PROJECT_ADMIN (owner in project's org)

const result = await inheritanceService.getEffectiveRole(userId, orgAProjectId);
// result.effectiveRole === PROJECT_ADMIN
// result.source === 'org_owner'
// Reason: Only the project's organization matters
```

## InheritanceService API

### getEffectiveRole()

Get effective role for a user on a project with full inheritance resolution.

```typescript
const result = await inheritanceService.getEffectiveRole(userId, projectId);

interface EffectiveRoleResult {
  effectiveRole: ProjectRole | null;
  source: 'system_admin' | 'org_owner' | 'org_admin' | 'explicit' | 'none';
  organizationRole?: OrganizationRole;
  projectRole?: ProjectRole;
  isInherited: boolean;
  organizationId?: string;
  organizationName?: string;
}
```

### hasInheritedAccess()

Check if user has inherited (vs explicit) access.

```typescript
const isInherited = await inheritanceService.hasInheritedAccess(userId, projectId);
// true if user has access via system admin, org owner, or org admin
// false if explicit membership or no access
```

### getInheritanceChain()

Get detailed inheritance chain showing how user got their permissions.

```typescript
const chain = await inheritanceService.getInheritanceChain(userId, projectId);

// Example for Org Owner:
// {
//   steps: [
//     { level: 1, type: 'organization', role: 'OWNER', source: 'OrganizationMember', description: '...' },
//     { level: 2, type: 'project', role: 'PROJECT_ADMIN', source: 'Inheritance', description: '...' }
//   ],
//   finalRole: 'PROJECT_ADMIN',
//   hasAccess: true
// }
```

### getUserAccessibleProjects()

Get all projects a user has access to (including inherited).

```typescript
const projects = await inheritanceService.getUserAccessibleProjects(userId, orgId);

// Returns ProjectAccess[] with inherited and explicit memberships
// System admins get ALL projects
// Org owners/admins get all org projects
// Org members get only explicitly assigned projects
```

### canChangeProjectRole()

Check if a role change is allowed (protects inherited roles).

```typescript
const validation = await inheritanceService.canChangeProjectRole(
  targetUserId,
  projectId,
  newRole,
  requestingUserId
);

// Returns { allowed: false, reason: '...' } for:
// - System admins (cannot change)
// - Org owners (cannot change on their org projects)
// - Org admins (cannot change on their org projects)

// Returns { allowed: true } for:
// - Explicit project members (can be changed by PROJECT_ADMIN)
```

### getProjectMembers()

Get all members of a project with inheritance info.

```typescript
const members = await inheritanceService.getProjectMembers(projectId, includeInherited);

// Returns ProjectMemberWithInheritance[] with:
// - All system admins (if includeInherited=true)
// - All org owners/admins (if includeInherited=true)
// - All explicit project members
// Each member includes: isInherited, source, scope, expiresAt
```

## Integration with PermissionService

The PermissionService automatically uses InheritanceService for role resolution:

```typescript
// PermissionService.buildPermissionCache() uses InheritanceService
const hasAccess = await permissionService.hasPermission(userId, projectId, 'documents:drawing:create');

// Under the hood:
// 1. InheritanceService.getEffectiveRole() determines the role
// 2. PermissionService checks if that role has the required permission
// 3. For explicit roles, also checks scope and expiration
// 4. For inherited roles, bypasses scope and expiration checks
```

## Cache Behavior

**Inheritance Cache**: 15-minute TTL
**Permission Cache**: 15-minute TTL

**Cache Invalidation Triggers**:
- User's organization role changes
- User's project role changes
- User added/removed from organization
- User added/removed from project
- Project's organization changes
- User deleted

```typescript
// Clear inheritance cache manually
await inheritanceService.clearInheritanceCache(userId, projectId);

// Clear all caches for a user
await inheritanceService.clearInheritanceCache(userId);

// Clear all caches for an organization
await inheritanceService.clearOrganizationCache(organizationId);
```

## UI Display Guidelines

### Show Inherited vs Explicit Roles

**Inherited Role Badge**:
```
┌─────────────────────────────┐
│ John Smith                   │
│ PROJECT_ADMIN               │
│ 👑 Organization Owner       │
└─────────────────────────────┘
```

**Explicit Role Badge**:
```
┌─────────────────────────────┐
│ Jane Doe                     │
│ SUPERINTENDENT              │
│ Assigned on Jan 15, 2024    │
└─────────────────────────────┘
```

### Inheritance Tooltip

When hovering over inherited roles:
```
"This user has PROJECT_ADMIN permissions because they are an
Organization Owner. This role cannot be changed at the project
level. To modify their permissions, change their organization
role in Settings."
```

### Role Change Blocked Message

When trying to change inherited role:
```
"Cannot change project role for [User Name] because they are an
Organization [Owner/Admin]. They automatically have PROJECT_ADMIN
access to all organization projects.

To change their permissions:
1. Go to Organization Settings
2. Change their organization role to ORG_MEMBER
3. Then assign them a specific project role"
```

## Testing

Run unit tests:
```bash
npm run test -- inheritance.service.spec.ts
```

Test scenarios covered:
- ✅ System admin bypass
- ✅ Org OWNER inheritance to PROJECT_ADMIN
- ✅ Org ORG_ADMIN inheritance to PROJECT_ADMIN
- ✅ Org ORG_MEMBER no inheritance
- ✅ Explicit role usage for org members
- ✅ Expired explicit membership handling
- ✅ Priority of org owner over expired explicit role
- ✅ Role change protection for inherited roles
- ✅ Inheritance chain tracking

## Security Considerations

1. **Immutable Inheritance**: Organization owners/admins cannot be demoted at project level
2. **Expiration Only for Explicit**: Inherited roles never expire
3. **Scope Only for Explicit**: Inherited roles bypass scope restrictions
4. **System Admin Audit**: All system admin actions should be logged
5. **Cache Invalidation**: Ensure caches are cleared on role changes

## Best Practices

1. **Use InheritanceService for all role checks**: Don't bypass it with direct database queries
2. **Display inheritance source in UI**: Users should understand why they have access
3. **Protect against role escalation**: Only PROJECT_ADMIN can change roles
4. **Log role changes**: Audit trail for compliance
5. **Clear caches on updates**: Prevent stale permission data

## Migration from Task 3.2.3.2

The existing PermissionService has been updated to use InheritanceService:

**Before**: PermissionService had its own inheritance logic in `buildPermissionCache()`
**After**: PermissionService delegates to InheritanceService.getEffectiveRole()

**No API changes**: Existing permission checks continue to work
**Enhanced**: Now properly handles system admin and provides inheritance chain tracking
