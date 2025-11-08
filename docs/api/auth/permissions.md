# Multi-Level Permission System Documentation

## Overview

The Builder API implements a comprehensive multi-level permission system designed for construction project management, inspired by ProCore. The system provides fine-grained access control at three distinct levels: System, Organization, and Project.

---

## Architecture

### Three-Level Hierarchy

```
┌──────────────────────────────────────────────────┐
│           SYSTEM LEVEL                           │
│  ┌──────────────┐         ┌──────────────┐     │
│  │     USER     │         │ SYSTEM_ADMIN │     │
│  └──────────────┘         └──────────────┘     │
└──────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────┐
│        ORGANIZATION LEVEL                        │
│  ┌───────┐  ┌──────────┐  ┌───────────┐  ┌────┐│
│  │ OWNER │  │ ORG_ADMIN│  │ ORG_MEMBER│  │GUEST││
│  └───────┘  └──────────┘  └───────────┘  └────┘│
└──────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────┐
│           PROJECT LEVEL                          │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────┐│
│  │PROJECT_ADMIN │  │PROJECT_MGR  │  │ENGINEER  ││
│  └──────────────┘  └─────────────┘  └──────────┘│
│  ┌──────────────┐  ┌─────────────┐  ┌──────────┐│
│  │SUPERINTENDENT│  │   FOREMAN   │  │ARCHITECT ││
│  └──────────────┘  └─────────────┘  └──────────┘│
│  ┌──────────────┐  ┌─────────────┐  ┌──────────┐│
│  │SUBCONTRACTOR │  │  OWNER_REP  │  │INSPECTOR ││
│  └──────────────┘  └─────────────┘  └──────────┘│
│  ┌──────────────┐                                │
│  │   VIEWER     │                                │
│  └──────────────┘                                │
└──────────────────────────────────────────────────┘
```

---

## Level 1: System Roles

### SystemRole Enum

System roles control platform-wide access and are assigned at the user level.

| Role | Value | Description | Access Level |
|------|-------|-------------|--------------|
| **USER** | `user` | Default role for all registered users | Standard platform access |
| **SYSTEM_ADMIN** | `system_admin` | Platform administrator | Full unrestricted access |

### System Role Details

#### USER
- **Default**: Yes (assigned on registration)
- **Capabilities**:
  - Create and join organizations
  - Access projects they're assigned to
  - Standard API access
- **Restrictions**:
  - Cannot access other users' data
  - Requires org/project membership for access
  - Cannot perform system administration

#### SYSTEM_ADMIN
- **Default**: No (granted manually)
- **Capabilities**:
  - Bypass all organization and project access checks
  - Access all organizations and projects
  - View system-wide statistics
  - Manage platform configuration
- **Use Case**: Platform administrators, support staff

### System Role Assignment

System roles can only be changed by:
1. Manual database update by another system admin
2. System-level administrative endpoints (future)

```sql
-- Grant system admin access (use with caution)
UPDATE users
SET system_role = 'system_admin'
WHERE email = 'admin@example.com';
```

---

## Level 2: Organization Roles

### OrganizationRole Enum

Organization roles determine access within a specific company/organization.

| Role | Value | Description | Hierarchy Level |
|------|-------|-------------|-----------------|
| **OWNER** | `owner` | Organization owner | 4 (Highest) |
| **ORG_ADMIN** | `org_admin` | Organization administrator | 3 |
| **ORG_MEMBER** | `org_member` | Standard member | 2 |
| **GUEST** | `guest` | Limited access guest | 1 (Lowest) |

### Organization Role Details

#### OWNER
- **Hierarchy**: Highest (Level 4)
- **Capabilities**:
  - Full organization control
  - Manage billing and subscription
  - Delete organization
  - Transfer ownership
  - Add/remove all members
  - Create/delete projects
  - **Auto-granted PROJECT_ADMIN on ALL organization projects**
- **Restrictions**:
  - Only one owner per organization (ownership can be transferred)

#### ORG_ADMIN
- **Hierarchy**: High (Level 3)
- **Capabilities**:
  - Manage organization settings
  - Invite/remove members (except owner)
  - Create/delete projects
  - Manage organization-wide permissions
  - **Auto-granted PROJECT_ADMIN on ALL organization projects**
- **Restrictions**:
  - Cannot manage billing
  - Cannot delete organization
  - Cannot remove owner

#### ORG_MEMBER
- **Hierarchy**: Standard (Level 2)
- **Capabilities**:
  - View organization details
  - Can be assigned to projects
  - Create personal projects (if enabled)
- **Restrictions**:
  - Cannot manage organization settings
  - Cannot invite members
  - Project access determined by project membership

#### GUEST
- **Hierarchy**: Lowest (Level 1)
- **Capabilities**:
  - View assigned projects only
  - Read-only access to shared data
- **Restrictions**:
  - Cannot create or modify data
  - Cannot invite members
  - Limited to specific assigned projects
- **Use Case**: External stakeholders (clients, consultants)

### Organization Role Inheritance

**Key Rule**: Organization OWNER and ORG_ADMIN automatically receive PROJECT_ADMIN access on ALL projects within their organization.

```typescript
// Automatic inheritance
if (userOrgRole === 'owner' || userOrgRole === 'org_admin') {
  effectiveProjectRole = 'project_admin';
}
```

---

## Level 3: Project Roles

### ProjectRole Enum

Project roles are construction-specific and determine access within individual projects.

#### Administrative Roles (Hierarchy)

| Role | Value | Description | Admin Level |
|------|-------|-------------|-------------|
| **PROJECT_ADMIN** | `project_admin` | Full project control | 3 (Highest) |
| **PROJECT_MANAGER** | `project_manager` | Project oversight | 2 |
| **PROJECT_ENGINEER** | `project_engineer` | Technical oversight | 1 |

#### Field Roles

| Role | Value | Description |
|------|-------|-------------|
| **SUPERINTENDENT** | `superintendent` | On-site construction supervision |
| **FOREMAN** | `foreman` | Crew management |

#### Professional Roles

| Role | Value | Description |
|------|-------|-------------|
| **ARCHITECT_ENGINEER** | `architect_engineer` | Design and engineering consultant |
| **SUBCONTRACTOR** | `subcontractor` | Trade-specific contractor |
| **OWNER_REP** | `owner_rep` | Owner's representative |
| **INSPECTOR** | `inspector` | Quality and compliance |

#### Other Roles

| Role | Value | Description |
|------|-------|-------------|
| **VIEWER** | `viewer` | Read-only access |

### Project Role Details

#### PROJECT_ADMIN
- **Capabilities**:
  - Full access to all project features
  - Manage project settings
  - Add/remove project members
  - Archive/delete project
  - Approve all documents
- **Auto-granted to**: Org OWNER and ORG_ADMIN

#### PROJECT_MANAGER
- **Capabilities**:
  - Oversee project execution
  - Manage schedules and budgets
  - Approve submittals and RFIs
  - Create and assign tasks
- **Restrictions**:
  - Cannot modify project settings
  - Cannot manage permissions

#### PROJECT_ENGINEER
- **Capabilities**:
  - Technical oversight
  - Manage drawings and specifications
  - Review technical submittals
  - Create RFIs and change orders
  - Quality control documentation
- **Focus**: Technical aspects

#### SUPERINTENDENT
- **Capabilities**:
  - On-site supervision
  - Daily reports and field observations
  - Coordinate subcontractors
  - Update construction progress
  - Safety documentation
- **Focus**: Field operations

#### FOREMAN
- **Capabilities**:
  - Lead work crews
  - Update task progress
  - Submit daily work logs
  - Report material usage
- **Restrictions**:
  - Limited to assigned work areas

#### ARCHITECT_ENGINEER
- **Capabilities**:
  - View and markup drawings
  - Respond to RFIs
  - Review submittals
- **Access**: Read-only for most areas
- **Use Case**: Design consultants

#### SUBCONTRACTOR
- **Capabilities**:
  - View relevant drawings/specs
  - Submit progress updates
  - Upload work documentation
- **Restrictions**:
  - Limited to assigned scope
- **Use Case**: Trade contractors

#### OWNER_REP
- **Capabilities**:
  - View all project data
  - Comment and request changes
  - Approve major milestones
- **Restrictions**:
  - Cannot modify construction data
- **Use Case**: Client representatives

#### INSPECTOR
- **Capabilities**:
  - Create inspection reports
  - Flag non-compliance issues
  - Upload inspection documentation
- **Access**: Read-only for most data
- **Use Case**: QA/QC inspectors

#### VIEWER
- **Capabilities**:
  - Read-only access to assigned data
- **Restrictions**:
  - Cannot create, edit, or delete anything
- **Use Case**: Stakeholders needing visibility

---

## Permission Checking

### PermissionService API

The `PermissionService` provides methods for checking access:

#### Check Organization Access

```typescript
interface PermissionCheckResult {
  hasAccess: boolean;
  reason?: string;
  role?: OrganizationRole | ProjectRole;
}

// Check basic organization access
const result = await permissionService.hasOrganizationAccess(
  user,
  organizationId
);

// Check with minimum role requirement
const result = await permissionService.hasOrganizationAccess(
  user,
  organizationId,
  OrganizationRole.ORG_ADMIN // Requires admin or higher
);
```

#### Check Project Access

```typescript
// Check basic project access
const result = await permissionService.hasProjectAccess(
  user,
  projectId,
  organizationId // Required for org admin inheritance
);

// Check with minimum role requirement
const result = await permissionService.hasProjectAccess(
  user,
  projectId,
  organizationId,
  ProjectRole.PROJECT_MANAGER // Requires PM or higher admin role
);
```

#### Get User Memberships

```typescript
// Get all organizations
const orgs = await permissionService.getUserOrganizations(userId);

// Get all projects
const projects = await permissionService.getUserProjects(userId);

// Get projects in specific organization
const orgProjects = await permissionService.getUserProjects(
  userId,
  organizationId
);
```

### Permission Check Flow

```
1. Is user SYSTEM_ADMIN?
   ├─ YES → Grant access immediately
   └─ NO → Continue to next check

2. Organization Access Check:
   ├─ Has organization membership?
   │  ├─ YES → Check role hierarchy
   │  └─ NO → Deny access
   └─ Meets minimum role requirement?
      ├─ YES → Grant access
      └─ NO → Deny access

3. Project Access Check:
   ├─ Is user org OWNER or ORG_ADMIN?
   │  ├─ YES → Grant PROJECT_ADMIN access
   │  └─ NO → Continue
   ├─ Has project membership?
   │  ├─ YES → Check expiration
   │  └─ NO → Deny access
   ├─ Is membership expired?
   │  ├─ YES → Deny access
   │  └─ NO → Check role
   └─ Meets minimum role requirement?
      ├─ YES → Grant access
      └─ NO → Deny access
```

---

## Temporary Access

### Project Membership Expiration

Project members can have temporary access using the `expires_at` field:

```typescript
// Add member with 30-day expiration
await projectMemberRepository.save({
  userId: contractor.id,
  projectId: project.id,
  role: ProjectRole.SUBCONTRACTOR,
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  addedByUserId: currentUser.id,
});
```

**Use Cases**:
- Temporary contractors
- Short-term consultants
- Time-limited audits
- Guest access with expiration

---

## Best Practices

### 1. Principle of Least Privilege
- Grant minimum necessary role
- Use GUEST for external stakeholders
- Use temporary access for contractors
- Regular access reviews

### 2. Role Assignment Strategy
- **System Admin**: Limit to 2-3 trusted administrators
- **Organization Owner**: One per organization
- **Organization Admins**: Small team of trusted managers
- **Project Admins**: Project leads only
- **Project Roles**: Match actual job responsibilities

### 3. Security Considerations
- System admin access requires manual intervention
- Organization ownership transfer requires verification
- Regular audit of expired memberships
- Monitor permission changes
- Log all access denials

### 4. Performance Optimization
- Cache permission check results (5-15 minutes)
- Use composite indexes for membership lookups
- Batch permission checks where possible
- Consider read replicas for permission queries

---

## API Integration Examples

### Protecting Routes with Role Checks

```typescript
@Controller('projects')
export class ProjectsController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get(':id')
  async getProject(
    @Param('id') projectId: string,
    @CurrentUser() user: User,
  ) {
    const project = await this.projectsService.findOne(projectId);

    // Check project access
    const access = await this.permissionService.hasProjectAccess(
      user,
      projectId,
      project.organizationId,
    );

    if (!access.hasAccess) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return project;
  }

  @Patch(':id')
  async updateProject(
    @Param('id') projectId: string,
    @Body() updateDto: UpdateProjectDto,
    @CurrentUser() user: User,
  ) {
    const project = await this.projectsService.findOne(projectId);

    // Require PROJECT_ADMIN or higher
    const access = await this.permissionService.hasProjectAccess(
      user,
      projectId,
      project.organizationId,
      ProjectRole.PROJECT_ADMIN,
    );

    if (!access.hasAccess) {
      throw new ForbiddenException('Only project admins can update settings');
    }

    return this.projectsService.update(projectId, updateDto);
  }
}
```

### Custom Guards

```typescript
@Injectable()
export class OrganizationRoleGuard implements CanActivate {
  constructor(private readonly permissionService: PermissionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const organizationId = request.params.organizationId;
    const requiredRole = this.reflector.get<OrganizationRole>(
      'requiredRole',
      context.getHandler(),
    );

    const access = await this.permissionService.hasOrganizationAccess(
      user,
      organizationId,
      requiredRole,
    );

    return access.hasAccess;
  }
}

// Usage
@UseGuards(OrganizationRoleGuard)
@RequiredRole(OrganizationRole.ORG_ADMIN)
@Delete(':organizationId/members/:userId')
async removeMember(...) { }
```

---

## Database Queries

### Common Permission Queries

```sql
-- Check if user is system admin
SELECT system_role FROM users WHERE id = $1;

-- Check organization membership
SELECT role FROM organization_members
WHERE user_id = $1 AND organization_id = $2;

-- Check project membership with expiration
SELECT role, expires_at FROM project_members
WHERE user_id = $1 AND project_id = $2
  AND (expires_at IS NULL OR expires_at > NOW());

-- Get all user's organizations
SELECT o.*, om.role
FROM organizations o
INNER JOIN organization_members om ON o.id = om.organization_id
WHERE om.user_id = $1
ORDER BY o.name;

-- Get all user's projects with effective role
SELECT p.*, pm.role, om.role as org_role
FROM projects p
LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $1
INNER JOIN organization_members om ON p.organization_id = om.organization_id
WHERE om.user_id = $1
  AND (pm.expires_at IS NULL OR pm.expires_at > NOW());
```

---

## Troubleshooting

### Common Issues

#### 1. "User cannot access organization"
**Check**:
- User has organization membership
- Membership is not expired (for project members)
- User account is active (is_active = true)

#### 2. "Org admin cannot access project"
**Verify**:
- Organization membership role is OWNER or ORG_ADMIN
- Organization ID matches project's organization
- Permission service includes organizationId in check

#### 3. "Permission check performance slow"
**Solutions**:
- Ensure indexes exist on membership tables
- Implement permission caching
- Use query optimization
- Check for N+1 query problems

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2025-11-08 | Initial multi-level permission system implementation |

---

## References

- [Database Schema Documentation](../../schemas/database-schema.md)
- [Registration API](./registration.md)
- [ProCore Developer Docs](https://developers.procore.com/) (Inspiration)
