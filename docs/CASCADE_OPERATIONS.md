# Cascade Operations System

## Overview

The Cascade Operations system handles deletion and restoration of users, organizations, and projects with proper data integrity, referential integrity, and cascading effects. It prevents orphaned data and ensures all related records are properly handled.

## Core Components

### 1. UserCascadeService

Handles user deletion with cascading to:
- Organization memberships
- Project memberships
- Resource assignments
- Permission caches

**Key Features:**
- Sole owner protection (prevents deletion if user is sole owner of any organization)
- Transaction-based deletion for atomicity
- Resource preservation (documents, comments, audit trail)
- Permission cache invalidation
- Soft delete support
- Validation before deletion
- Impact preview

### 2. OrganizationCascadeService

Handles organization deletion with cascading to:
- All projects in the organization
- All organization members
- Billing/subscription data

**Key Features:**
- Owner-only deletion (only org owners can delete)
- Automatic project deletion
- Member removal
- Permission cache clearing
- Soft delete support
- Impact preview

### 3. ProjectCascadeService

Handles project deletion with cascading to:
- All project members
- All project resources (documents, RFIs, submittals, etc.)
- Permission caches

**Key Features:**
- Permission-based deletion
- Member removal
- Resource cleanup
- Soft delete support
- Parent organization validation on restore
- Impact preview

## Usage Examples

### Delete a User

```typescript
import { UserCascadeService } from '../cascade/services/user-cascade.service';

@Injectable()
export class UserManagementService {
  constructor(
    private readonly userCascadeService: UserCascadeService
  ) {}

  async deleteUser(userId: string, deletedBy: string) {
    // 1. Validate deletion
    const validation = await this.userCascadeService.validateDeletion(userId);

    if (!validation.canDelete) {
      throw new BadRequestException(validation.reason);
    }

    // 2. Get impact preview
    const impact = await this.userCascadeService.getDeleteionImpact(userId);
    console.log(`Will remove from ${impact.organizationMemberships} orgs`);
    console.log(`Will remove from ${impact.projectMemberships} projects`);

    // 3. Delete user
    const result = await this.userCascadeService.deleteUser(userId, {
      deletedBy,
      reason: 'User requested account deletion',
      softDelete: true
    });

    return {
      message: 'User deleted successfully',
      organizationMembershipsRemoved: result.organizationMembershipsRemoved,
      projectMembershipsRemoved: result.projectMembershipsRemoved
    };
  }
}
```

### Delete an Organization

```typescript
async deleteOrganization(orgId: string, deletedBy: string) {
  // 1. Check if user is owner
  const isOwner = await this.checkOwnership(deletedBy, orgId);
  if (!isOwner) {
    throw new ForbiddenException('Only owners can delete organization');
  }

  // 2. Get impact preview
  const impact = await this.orgCascadeService.getDeletionImpact(orgId);
  console.log(`Will delete ${impact.projectCount} projects`);
  console.log(`Will remove ${impact.memberCount} members`);

  // 3. Delete organization
  const result = await this.orgCascadeService.deleteOrganization(orgId, {
    deletedBy,
    reason: 'Organization dissolved',
    softDelete: true
  });

  return {
    message: 'Organization deleted successfully',
    projectsDeleted: result.projectsDeleted,
    membersRemoved: result.membersRemoved,
    errors: result.errors
  };
}
```

### Delete a Project

```typescript
async deleteProject(projectId: string, deletedBy: string) {
  // 1. Validate deletion
  const validation = await this.projectCascadeService.validateDeletion(projectId);

  if (validation.warnings.length > 0) {
    console.warn('Warnings:', validation.warnings);
  }

  // 2. Get impact preview
  const impact = await this.projectCascadeService.getDeletionImpact(projectId);
  console.log(`Will remove ${impact.memberCount} members`);
  console.log(`Will delete ${impact.resourceCount.documents} documents`);

  // 3. Delete project
  const result = await this.projectCascadeService.deleteProject(projectId, {
    deletedBy,
    reason: 'Project completed',
    softDelete: true
  });

  return {
    message: 'Project deleted successfully',
    membersRemoved: result.membersRemoved,
    resourcesDeleted: result.resourcesDeleted
  };
}
```

### Restore Soft-Deleted Entities

```typescript
// Restore user
await userCascadeService.restoreUser(userId, {
  restoredBy: adminId,
  reason: 'User account reinstated'
});

// Restore organization
await orgCascadeService.restoreOrganization(orgId, {
  restoredBy: adminId,
  reason: 'Organization reactivated'
});

// Restore project
await projectCascadeService.restoreProject(projectId, {
  restoredBy: adminId,
  reason: 'Project reopened'
});
```

## Deletion Flow

### User Deletion Flow

```
1. Validate user exists
2. Check for sole ownership (blocker)
   ├─ If sole owner → Throw error
   └─ Continue
3. Get all organization memberships
4. Get all project memberships
5. Handle resource assignments
   ├─ RFIs → Reassign or unassign
   ├─ Documents → Preserve with deleted flag
   ├─ Comments → Preserve with deleted flag
   └─ Audit events → Preserve with deleted flag
6. Remove organization memberships
7. Remove project memberships
8. Clear all permission caches
9. Mark user as deleted (soft) or remove (hard)
10. Commit transaction
```

### Organization Deletion Flow

```
1. Validate organization exists
2. Check user is owner (permission check)
   ├─ If not owner → Throw error
   └─ Continue
3. Get all projects in organization
4. Delete each project (cascade)
   └─ ProjectCascadeService.deleteProject()
5. Get all organization members
6. Clear permission caches for all members
7. Remove all memberships
8. Handle billing cleanup
9. Mark organization as deleted (soft) or remove (hard)
```

### Project Deletion Flow

```
1. Validate project exists
2. Check permission (unless cascaded from org)
   ├─ If no permission → Throw error
   └─ Continue
3. Get all project members
4. Clear permission caches for all members
5. Handle all project resources
   ├─ Documents
   ├─ RFIs
   ├─ Submittals
   ├─ Tasks
   ├─ Daily reports
   ├─ Safety incidents
   └─ Quality inspections
6. Remove all memberships
7. Mark project as deleted (soft) or remove (hard)
```

## Soft Delete vs Hard Delete

### Soft Delete
- Marks entity as inactive/deleted
- Preserves all data for recovery
- Allows restoration
- Recommended for production

### Hard Delete
- Permanently removes entity
- Cannot be recovered
- Faster cleanup
- Use only when certain

## Blockers and Validations

### User Deletion Blockers

1. **Sole Owner**: User is the only owner of one or more organizations
   - **Solution**: Transfer ownership or delete the organization first

### Organization Deletion Blockers

1. **Not Owner**: User requesting deletion is not an organization owner
   - **Solution**: Have an owner perform the deletion

### Project Deletion Blockers

1. **No Permission**: User does not have delete permission
   - **Solution**: Grant appropriate permission or have admin delete

## Data Preservation

### User Deletion Preserves:
- Documents created by user (marks creator as deleted)
- Comments by user (marks author as deleted)
- Audit events (marks actor as deleted)
- RFIs created by user (marks creator as deleted)
- Submittals created by user (marks creator as deleted)

### Organization Deletion Removes:
- All projects (cascading)
- All memberships
- Billing data

### Project Deletion Removes:
- All memberships
- All resources (depending on soft/hard delete)

## Permission Cache Invalidation

All cascade operations automatically clear permission caches:

```typescript
// User deletion
- Clears cache for user across all projects
- Format: permissionService.clearPermissionCache(userId)

// Organization deletion
- Clears cache for all members
- Each member's cache cleared individually

// Project deletion
- Clears cache for all members on that project
- Format: permissionService.clearPermissionCache(userId, projectId)
```

## Transaction Safety

User deletion uses database transactions to ensure atomicity:

```typescript
// Start transaction
await queryRunner.startTransaction();

try {
  // Perform all deletion operations
  // ...

  // Commit if successful
  await queryRunner.commitTransaction();
} catch (error) {
  // Rollback on any error
  await queryRunner.rollbackTransaction();
  throw error;
}
```

## Error Handling

All cascade services return detailed error information:

```typescript
interface DeletionResult {
  userId/organizationId/projectId: string;
  // ... counts
  errors: string[];  // Array of error messages
}
```

Errors are logged but don't stop the entire cascade - operations continue for other items.

## Impact Preview

Before deleting, check the impact:

```typescript
// User deletion impact
const impact = await userCascadeService.getDeleteionImpact(userId);
// Returns:
// - organizationMemberships: number
// - projectMemberships: number
// - blockers: string[]

// Organization deletion impact
const impact = await orgCascadeService.getDeletionImpact(orgId);
// Returns:
// - projectCount: number
// - memberCount: number
// - totalResources: number

// Project deletion impact
const impact = await projectCascadeService.getDeletionImpact(projectId);
// Returns:
// - memberCount: number
// - resourceCount: { documents, rfis, submittals }
```

## Best Practices

1. **Always Validate First**: Use validation methods before deletion
2. **Show Impact**: Display impact preview to users
3. **Use Soft Delete**: Default to soft delete in production
4. **Transaction Wrap**: Wrap critical operations in transactions
5. **Clear Caches**: Ensure permission caches are cleared
6. **Audit Trail**: Log all deletion operations
7. **Handle Errors**: Collect and report all errors
8. **Confirm Actions**: Require user confirmation for deletions
9. **Test Thoroughly**: Test all cascade paths
10. **Monitor Performance**: Track deletion operation times

## Future Enhancements

### Scheduled Cleanup
- Automatic deletion of old soft-deleted entities
- Configurable retention periods
- Compliance with data retention policies

### Bulk Operations
- Bulk user deletion
- Bulk project deletion
- Batch processing for performance

### Async Deletion
- Queue-based deletion for large datasets
- Background job processing
- Progress tracking

### Recovery Wizard
- UI for browsing soft-deleted entities
- Selective restoration
- Dependency resolution

### Advanced Validation
- Check for active billing
- Verify no pending operations
- Compliance checks

## Migration Considerations

To fully support soft delete, entities need additional columns:

```typescript
@Column({ type: 'timestamp', nullable: true })
deletedAt: Date;

@Column({ nullable: true })
deletedBy: string;

@Column({ nullable: true })
deletionReason: string;
```

Consider adding these to:
- Users
- Organizations
- Projects
- Organization memberships
- Project memberships
- All resource entities

## Testing Checklist

- [ ] User deletion removes from all orgs
- [ ] User deletion removes from all projects
- [ ] Sole owner protection works
- [ ] Resource assignments handled correctly
- [ ] Permission caches cleared
- [ ] Soft delete allows recovery
- [ ] Hard delete permanently removes
- [ ] Transaction rollback on error
- [ ] Organization deletion removes all projects
- [ ] Organization deletion removes all members
- [ ] Only owners can delete organizations
- [ ] Project deletion removes all members
- [ ] Project deletion handles all resources
- [ ] Permission checks enforced
- [ ] Cannot restore if parent deleted
- [ ] Impact preview accurate
- [ ] Validation catches blockers
- [ ] Error messages clear and helpful

## Performance Considerations

- Large organizations may have many projects (deletion takes time)
- Batch database operations where possible
- Consider async processing for large deletions
- Monitor transaction duration
- Implement timeouts for safety

## Security Considerations

- Always validate permissions before deletion
- Log all deletion operations for audit
- Require confirmation for destructive operations
- Prevent deletion of critical system entities
- Rate limit deletion operations
- Implement multi-factor auth for sensitive deletions

## Support

For questions or issues:
1. Check this documentation
2. Review inline code documentation
3. Check audit logs for deletion history
4. Enable debug logging for detailed traces
5. Contact development team

## Version History

- **v1.0.0** (2025-01-15): Initial implementation
  - UserCascadeService
  - OrganizationCascadeService
  - ProjectCascadeService
  - Soft delete support
  - Impact preview
  - Validation system
