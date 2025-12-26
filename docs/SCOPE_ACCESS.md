# Scope-Limited Access Control

## Overview

The scope-limited access control system allows certain roles (primarily SUBCONTRACTOR and FOREMAN) to be restricted to specific trades, areas, or work packages, ensuring they only see and interact with resources relevant to their assigned scope.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│           Scope Access Check Flow                        │
└─────────────────────────────────────────────────────────┘

User requests resource (e.g., document)
          ↓
[1] Check base permission (role-based)
          ↓
[2] Get effective role (check inheritance)
    - Inherited role? → Grant access (bypass scope)
    - Explicit role? → Continue to scope check
          ↓
[3] Is role scope-limited?
    - PROJECT_ADMIN, MANAGER, etc? → Grant access
    - SUBCONTRACTOR, FOREMAN? → Check scope
          ↓
[4] Match user scope against resource scope
    - Match any dimension? → Grant access
    - No match? → Deny access
```

## Scope Structure

### User Scope (What user can access)

```typescript
interface UserScope {
  trades?: string[];    // e.g., ['electrical', 'lighting']
  areas?: string[];     // e.g., ['building-a-floor-3']
  phases?: string[];    // e.g., ['rough-in', 'trim-out']
  tags?: string[];      // e.g., ['critical', 'owner-required']

  // Metadata
  assignedBy?: string;
  assignedAt?: Date;
  reason?: string;
}
```

### Resource Scope (What scope tags a resource has)

```typescript
interface ResourceScope {
  trades?: string[];
  areas?: string[];
  phases?: string[];
  tags?: string[];
  visibility?: 'public' | 'tagged-only';  // default: 'tagged-only'
}
```

## Scope Matching Rules

### Rule 1: Null/Undefined User Scope = Full Access

If a user has no scope restrictions (null or undefined), they can access all resources.

```typescript
// User scope: null
// Resource scope: { trades: ['electrical'] }
// Result: ALLOW
```

### Rule 2: Empty User Scope = No Access

If a user has an empty scope object (all arrays empty), they have no access.

```typescript
// User scope: { trades: [], areas: [], phases: [], tags: [] }
// Resource scope: { trades: ['electrical'] }
// Result: DENY
```

### Rule 3: Empty/Null Resource Scope = Visibility-Based

Resources without scope tags use visibility setting:
- `public`: Accessible to all (default for daily-reports, photos)
- `tagged-only`: Requires explicit tags (default for documents, RFIs)

```typescript
// User scope: { trades: ['electrical'] }
// Resource scope: { visibility: 'public' }
// Result: ALLOW

// User scope: { trades: ['electrical'] }
// Resource scope: { visibility: 'tagged-only' }
// Result: DENY
```

### Rule 4: Any Dimension Match = Access (OR Logic)

User needs to match in ANY dimension to gain access.

```typescript
// User scope: { trades: ['electrical'], areas: ['floor-3'] }
// Resource scope: { trades: ['plumbing'], areas: ['floor-3'] }
// Result: ALLOW (areas match)

// User scope: { trades: ['electrical'], areas: ['floor-3'] }
// Resource scope: { trades: ['plumbing'], areas: ['floor-4'] }
// Result: DENY (no dimension matches)
```

### Rule 5: Hierarchical Area Matching

Users with parent area access can access child areas.

```typescript
// User scope: { areas: ['building-a'] }
// Resource scope: { areas: ['building-a-floor-3'] }
// Result: ALLOW (child area)

// User scope: { areas: ['building-a'] }
// Resource scope: { areas: ['building-a-floor-3-room-301'] }
// Result: ALLOW (descendant area)

// User scope: { areas: ['building-a-floor-3'] }
// Resource scope: { areas: ['building-a'] }
// Result: DENY (parent area - user has narrower scope)
```

## Roles and Scope

### Roles Requiring Scope

These roles **MUST** have scope assigned:
- `SUBCONTRACTOR` - Limited to assigned trades
- `FOREMAN` - Limited to assigned areas

### Roles with Optional Scope

These roles **CAN** optionally have scope:
- `VIEWER` - Can be limited to specific documents/areas
- `PROJECT_ENGINEER` - Can be limited to specific disciplines
- `INSPECTOR` - Can be limited to specific areas

### Roles Exempt from Scope

These roles **CANNOT** have scope (always full access):
- `PROJECT_ADMIN`
- `PROJECT_MANAGER`
- `SUPERINTENDENT`
- `ARCHITECT_ENGINEER`
- `OWNER_REP`

**Note:** All inherited roles (from organization) are automatically scope-exempt.

## Examples

### Example 1: Electrical Subcontractor

**User Scope:**
```json
{
  "trades": ["electrical", "lighting", "fire-alarm"]
}
```

**Resources User Can Access:**
- ✅ Document with `trades: ["electrical"]`
- ✅ Document with `trades: ["electrical", "hvac"]` (electrical matches)
- ❌ Document with `trades: ["plumbing"]`
- ❌ Document with empty/null scope and `visibility: "tagged-only"`
- ✅ RFI with `trades: ["lighting"]`
- ❌ Daily report with `areas: ["floor-3"]` (no trade match)

### Example 2: Site Foreman

**User Scope:**
```json
{
  "areas": ["building-a-floor-3", "building-a-floor-4"]
}
```

**Resources User Can Access:**
- ✅ Document with `areas: ["building-a-floor-3"]`
- ✅ Document with `areas: ["building-a-floor-3-room-301"]` (child area)
- ❌ Document with `areas: ["building-a"]` (parent area)
- ❌ Document with `areas: ["building-b"]`
- ✅ RFI with `areas: ["building-a-floor-4"]`
- ❌ Safety report with `trades: ["electrical"]` (no area match)

### Example 3: Phase-Limited Contractor

**User Scope:**
```json
{
  "trades": ["concrete"],
  "phases": ["foundation", "rough-in"]
}
```

**Resources User Can Access:**
- ✅ Task with `trades: ["concrete"], phases: ["foundation"]` (both match)
- ✅ Task with `trades: ["steel"], phases: ["foundation"]` (phase matches)
- ✅ Task with `trades: ["concrete"], phases: ["finish"]` (trade matches)
- ❌ Task with `trades: ["steel"], phases: ["finish"]` (neither matches)

### Example 4: Multi-Area Foreman

**User Scope:**
```json
{
  "areas": ["building-a/floor-1", "building-a/floor-2"],
  "trades": []
}
```

**Resources User Can Access:**
- ✅ Any document in `building-a/floor-1` or its sub-areas
- ✅ Any document in `building-a/floor-2` or its sub-areas
- ❌ Documents in `building-a/floor-3`
- ✅ Document with `trades: ["electrical"]` AND `areas: ["building-a/floor-1"]`

## Configuration Guide

### When to Use Scope

**Use Scope For:**
- Subcontractors limited to specific trades
- Foremen assigned to specific areas/floors
- Temporary consultants with limited access
- Viewers who should only see specific documents

**Don't Use Scope For:**
- Project managers (should have full visibility)
- Superintendents (should have full site access)
- Architects/Engineers (should review all design)
- Organization owners/admins (automatically exempt)

### Setting Up Scope

#### Step 1: Define Project Scope Options

Before assigning users, define your project's:
- **Trade list**: electrical, plumbing, HVAC, framing, etc.
- **Area hierarchy**: buildings, floors, rooms
- **Phase definitions**: demo, rough-in, finish, etc.

#### Step 2: Tag Resources

Tag documents, RFIs, tasks with appropriate scope:
- Be consistent with naming conventions
- Use hierarchical areas for flexibility
- Tag early to avoid access issues later

```typescript
// Example: Tag a document
const document = {
  id: 'doc-123',
  title: 'Electrical Panel Schedule',
  scope: {
    trades: ['electrical'],
    areas: ['building-a-floor-3'],
    phases: ['rough-in'],
    tags: ['critical', 'owner-required']
  }
};
```

#### Step 3: Assign User Scope

When adding subcontractors or foremen:
- Select relevant trades/areas
- Don't over-restrict (users need context)
- Review and adjust as project evolves

```typescript
// Example: Add scoped project member
await addProjectMember({
  userId: 'user-123',
  projectId: 'proj-456',
  role: ProjectRole.SUBCONTRACTOR,
  scope: {
    trades: ['electrical', 'lighting'],
    areas: ['building-a'],
    phases: ['rough-in', 'trim-out']
  }
});
```

#### Step 4: Monitor Usage

- Check scope statistics regularly
- Identify orphaned scopes
- Adjust based on user feedback

```typescript
// Get scope statistics
const stats = await scopeService.getScopeStatistics(projectId);
console.log(`Scoped users: ${stats.totalScopedUsers}`);
console.log(`Unmatched scopes: ${stats.unmatchedScopes.users.length}`);
```

## API Reference

### ScopeService Methods

#### hasScopeAccess()

Check if user has scope access to a resource.

```typescript
const hasAccess = await scopeService.hasScopeAccess(
  userId,
  projectId,
  resourceScope,
  'document'
);
```

#### filterResourcesByScope()

Filter resources based on user scope.

```typescript
const filtered = await scopeService.filterResourcesByScope(
  userId,
  projectId,
  documents,
  (doc) => doc.scope,
  'document'
);
```

#### validateScopeForRole()

Validate scope assignment for a role.

```typescript
const validation = scopeService.validateScopeForRole(
  ProjectRole.SUBCONTRACTOR,
  { trades: ['electrical'] }
);

if (!validation.valid) {
  console.error(validation.errors);
}
```

#### getProjectScopeOptions()

Get available scope options for a project.

```typescript
const options = await scopeService.getProjectScopeOptions(projectId);
// Returns: { trades, areas, phases, tags } with usage counts
```

#### getScopeStatistics()

Get scope usage statistics for reporting.

```typescript
const stats = await scopeService.getScopeStatistics(projectId);
// Returns: user counts, resource counts, unmatched scopes
```

## Standard Trades

The system includes 25+ standard trades based on CSI MasterFormat:

**Structure:**
- Concrete
- Masonry
- Structural Steel
- Metal Framing
- Framing

**Envelope:**
- Roofing
- Insulation
- Waterproofing
- Windows & Glazing
- Doors & Hardware

**Finishes:**
- Drywall
- Painting
- Flooring
- Ceilings
- Finish Carpentry

**MEP:**
- Electrical
- Lighting
- Fire Alarm
- Low Voltage
- Plumbing
- HVAC
- Fire Protection

**Site:**
- Sitework
- Paving
- Landscaping

## Standard Phases

**Project Lifecycle:**
1. Preconstruction
2. Demolition
3. Foundation
4. Structure
5. Rough-In
6. Envelope
7. Interior
8. Trim-Out
9. Punchlist
10. Closeout

## Best Practices

### 1. Consistent Naming

Use consistent naming conventions for scope values:
- Lowercase with hyphens: `building-a-floor-3`
- Avoid spaces and special characters
- Use hierarchical separators: `-` or `/`

### 2. Hierarchical Areas

Structure areas hierarchically for flexibility:
```
building-a
├── building-a-floor-1
│   ├── building-a-floor-1-room-101
│   └── building-a-floor-1-room-102
└── building-a-floor-2
    └── building-a-floor-2-room-201
```

### 3. Scope Breadth

Balance between too narrow and too broad:
- **Too narrow**: User can't see related context
- **Too broad**: Defeats purpose of scope limitation

**Validation Limits:**
- Max trades: 10
- Max areas: 20
- Max phases: 5
- Max tags: 15

### 4. Regular Review

Schedule regular scope reviews:
- Monthly for active projects
- When project phases change
- After user feedback

### 5. Audit Trail

Always log scope changes:
```typescript
scope: {
  trades: ['electrical'],
  assignedBy: 'admin-user-id',
  assignedAt: new Date(),
  reason: 'Electrical subcontractor for Building A'
}
```

## Troubleshooting

### User Can't See Expected Resources

**Check:**
1. User's assigned scope
2. Resource's scope tags
3. Resource visibility setting
4. Role inheritance (inherited roles bypass scope)

```typescript
// Debug scope access
const userScope = await scopeService.getUserScope(userId, projectId);
const matchResult = scopeService.matchesScope(
  userScope,
  resourceScope,
  resourceType
);
console.log('Match result:', matchResult);
```

### Resources Not Appearing for Anyone

**Check:**
1. Resource has `visibility: 'tagged-only'` but no tags
2. All scoped users have non-matching scope

```typescript
// Find unmatched resources
const stats = await scopeService.getScopeStatistics(projectId);
console.log('Orphaned resources:', stats.unmatchedScopes.resources);
```

### Scope Changes Not Taking Effect

**Check:**
1. Permission cache (15-minute TTL)
2. Inheritance cache (15-minute TTL)

```typescript
// Force cache clear
await permissionService.clearPermissionCache(userId, projectId);
await inheritanceService.clearInheritanceCache(userId, projectId);
```

## Security Considerations

1. **Inherited Roles Bypass Scope**: Organization owners/admins always have full access
2. **Scope Cannot Elevate Permissions**: Scope only restricts, never grants additional permissions
3. **Explicit Tagging Required**: Resources default to `tagged-only` for security
4. **No Client-Side Filtering**: All scope filtering happens server-side
5. **Audit All Changes**: Log scope assignments and modifications

## Migration Notes

If migrating from simple array-based scope to enhanced scope:

```typescript
// Old format (array)
const oldScope = ['electrical', 'lighting'];

// New format (object with dimensions)
const newScope: UserScope = {
  trades: ['electrical', 'lighting']
};

// Both formats are supported for backward compatibility
```

The system automatically detects and converts old array format to new object format.

## Related Documentation

- [Role Inheritance System](./ROLE_INHERITANCE.md)
- [Permission Matrix](./PERMISSION_MATRIX.md)
- [Multi-Level RBAC](./MULTI_LEVEL_RBAC.md)
