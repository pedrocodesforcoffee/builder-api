# Permission Guards System

## Overview

The Permission Guards system provides comprehensive API-layer permission enforcement for the Builder API. It implements action-based permissions with caching, scope validation, expiration checking, and audit logging.

## Architecture

### Components

1. **Base Permission Guard** - Abstract base class with common permission logic
2. **Feature Guards** - 7 specialized guards for different features
3. **Guard Cache Service** - High-performance caching (<10ms response time)
4. **Audit Service** - Logs all permission denials
5. **NestJS Integration** - Decorator and guard for route protection

### Design Patterns

- **Template Method Pattern**: Base guard provides framework, feature guards implement specifics
- **Strategy Pattern**: Different guards for different features
- **Decorator Pattern**: `@Permission()` decorator for declarative route protection
- **Cache-Aside Pattern**: Check cache first, load on miss

## Feature Guards

### 1. DocumentGuard

Protects document operations with support for confidential documents and owner-based deletion.

**Actions:**
- `create` - Create new documents
- `read` - View documents
- `update` - Edit document metadata/content
- `delete` - Delete documents (owner or admin only)
- `approve` - Approve documents for distribution
- `export` - Export documents (restricted for confidential)
- `version` - Create new document versions

**Special Rules:**
- Confidential documents require admin role for export
- Document deletion requires ownership or admin role
- Approval may require admin role for certain documents

### 2. RFIGuard

Manages RFI (Request for Information) operations with assignment and workflow validation.

**Actions:**
- `create` - Create new RFIs
- `read` - View RFIs
- `update` - Edit RFI details
- `respond` - Provide response to RFI
- `assign` - Assign RFI to team member
- `close` - Close RFI

**Special Rules:**
- Only assigned users or admins can respond
- RFI must be responded to before closing
- Only managers and engineers can assign RFIs

### 3. SubmittalGuard

Controls submittal approval workflows with review requirements.

**Actions:**
- `create` - Create new submittals
- `read` - View submittals
- `review` - Review submittal (intermediate step)
- `approve` - Approve submittal
- `reject` - Reject submittal
- `require_resubmit` - Require resubmission with corrections

**Special Rules:**
- Must be reviewed before approval
- Only project managers and engineers can approve/reject
- Reviewers must be assigned or have manager/engineer role

### 4. SafetyGuard

Enforces safety incident management with investigation requirements.

**Actions:**
- `create` - Create new safety incidents
- `read` - View safety incidents
- `update` - Update incident details
- `investigate` - Conduct incident investigation
- `close` - Close incident after resolution

**Special Rules:**
- Only safety officers and supervisors can investigate
- Incident must be investigated before closing
- Reporter can update their own incidents (unless closed)

### 5. BudgetGuard

Protects financial data with strict access controls and amount-based approval thresholds.

**Actions:**
- `read` - View budget data
- `create` - Create budget items
- `update` - Update budget items
- `approve_change_order` - Approve budget change orders
- `approve_payment` - Approve payment requests
- `export` - Export financial reports

**Special Rules:**
- Financial data access limited to specific roles
- Large amounts require PROJECT_ADMIN approval
- Payments must be reviewed before approval
- No scope restrictions on financial data (all or nothing)

### 6. QualityGuard

Manages quality inspection operations with self-approval prevention.

**Actions:**
- `create` - Create new inspections
- `read` - View inspections
- `update` - Update inspection details
- `approve` - Approve/pass inspection
- `fail` - Fail inspection

**Special Rules:**
- Inspectors cannot approve their own inspections
- Failure requires a documented reason
- Only quality control officers and supervisors can approve/fail
- Cannot update completed inspections

### 7. ProjectSettingsGuard

Protects project configuration with owner-only operations for critical settings.

**Actions:**
- `read` - View project settings
- `update` - Update project settings
- `manage_members` - Add/remove project members
- `manage_permissions` - Manage role assignments
- `delete` - Delete project (admin only with confirmation)
- `configure` - Configure project structure

**Special Rules:**
- Critical settings require PROJECT_ADMIN role
- Cannot remove yourself or modify own permissions
- Project deletion requires confirmation and no active data
- Post-start structural changes require admin

## Usage

### Basic Route Protection

```typescript
import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { Permission } from '../permissions/decorators/permission.decorator';

@Controller('projects/:projectId/documents')
@UseGuards(PermissionGuard)
export class DocumentController {

  // Create document - requires documents:document:create permission
  @Permission({
    guard: 'document',
    action: 'create',
    projectParam: 'projectId'
  })
  @Post()
  async createDocument(
    @Param('projectId') projectId: string,
    @Body() createDto: CreateDocumentDto
  ) {
    // ...
  }

  // Update document - requires documents:document:update permission
  @Permission({
    guard: 'document',
    action: 'update',
    resourceParam: 'documentId',
    projectParam: 'projectId'
  })
  @Patch(':documentId')
  async updateDocument(
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @Body() updateDto: UpdateDocumentDto
  ) {
    // ...
  }
}
```

### With Context

Pass additional context for complex permission checks:

```typescript
@Permission({
  guard: 'budget',
  action: 'approve_payment',
  resourceParam: 'paymentId'
})
@Post(':paymentId/approve')
async approvePayment(
  @Param('projectId') projectId: string,
  @Param('paymentId') paymentId: string,
  @Body() approveDto: ApprovePaymentDto
) {
  // The guard will receive context from request body:
  // - amount: Payment amount for threshold check
  // - hasReview: Whether payment has been reviewed
  // ...
}
```

### Direct Guard Usage

You can also use guards directly in services:

```typescript
import { DocumentGuard } from '../permissions/guards/document.guard';

@Injectable()
export class DocumentService {
  constructor(private readonly documentGuard: DocumentGuard) {}

  async deleteDocument(projectId: string, documentId: string, userId: string) {
    // Enforce permission
    await this.documentGuard.enforcePermission(
      userId,
      projectId,
      'delete',
      documentId,
      {
        resourceOwnerId: document.createdBy,
        resourceType: 'document'
      }
    );

    // Proceed with deletion
    // ...
  }
}
```

## Caching

The guard system includes high-performance caching with automatic invalidation:

- **Cache TTL**: 5 minutes
- **Target Response Time**: <10ms for cached checks
- **Cache Key Format**: `userId:projectId:action[:resourceId]`
- **Automatic Cleanup**: Expired entries cleaned every 1 minute
- **Cache Invalidation**: Call `guardCacheService.clear(userId, projectId?)` when roles change

### Cache Statistics

Monitor cache performance:

```typescript
const stats = guardCacheService.getStatistics();
console.log(stats);
// {
//   hits: 1523,
//   misses: 287,
//   size: 450,
//   hitRate: 84.14,
//   avgResponseTime: 2.3
// }
```

## Audit Logging

All permission denials are automatically logged to the Audit Service:

```typescript
{
  userId: 'user-123',
  projectId: 'project-456',
  action: 'delete',
  resourceType: 'document',
  resourceId: 'doc-789',
  reason: 'insufficient_permissions',
  message: 'Only document owner or project admins can delete documents',
  timestamp: '2025-01-15T10:30:00Z',
  metadata: { userRole: 'VIEWER' }
}
```

### Viewing Audit Logs

```typescript
// Get recent denials
const recentDenials = await auditService.getRecentEntries(100);

// Get denials for specific user
const userDenials = await auditService.getUserEntries('user-123', 50);

// Get denials for specific project
const projectDenials = await auditService.getProjectEntries('project-456', 50);

// Get statistics
const stats = await auditService.getStatistics();
// {
//   totalEntries: 1523,
//   entriesByReason: {
//     insufficient_permissions: 890,
//     scope_restriction: 423,
//     access_expired: 210
//   },
//   entriesByAction: {
//     delete: 456,
//     approve: 234,
//     update: 833
//   }
// }
```

## Permission Context

Context provides additional data for complex permission checks:

```typescript
interface PermissionContext {
  // Resource-specific
  resourceType?: string;      // Type of resource (document, rfi, etc.)
  resourceId?: string;         // Resource ID
  resourceStatus?: string;     // Current status (open, closed, etc.)
  resourceOwnerId?: string;    // Owner user ID

  // User-specific
  userId?: string;             // User ID
  assignedTo?: string[];       // Array of assigned user IDs

  // Workflow context
  currentStatus?: string;      // Current workflow status
  targetStatus?: string;       // Target workflow status

  // Additional metadata
  metadata?: {
    amount?: number;                 // For budget approvals
    approvalThreshold?: number;      // For amount-based checks
    hasReview?: boolean;             // For review requirements
    hasInvestigation?: boolean;      // For safety incidents
    isConfidential?: boolean;        // For document export
    requiresOwnerApproval?: boolean; // For approval workflows
    [key: string]: any;              // Additional context
  };
}
```

## Error Responses

Permission denials return structured errors:

```json
{
  "error": "Permission Denied",
  "message": "Only document owner or project admins can delete documents",
  "code": "DELETE_PERMISSION_REQUIRED",
  "details": {
    "action": "delete",
    "reason": "insufficient_permissions",
    "requiredPermission": "documents:document:delete",
    "userRole": "VIEWER",
    "resourceId": "doc-789"
  }
}
```

### Common Error Codes

- `PERMISSION_DENIED` - General permission denial
- `PERMISSION_DENIED_CACHED` - Cached permission denial
- `ACCESS_EXPIRED` - User's access has expired
- `SCOPE_RESTRICTED` - Resource outside user's scope
- `NOT_ASSIGNED` - User not assigned to resource
- `INVALID_STATUS` - Resource in wrong status for action
- `WORKFLOW_VIOLATION` - Workflow requirement not met
- `ADMIN_ONLY` - Action requires admin role
- `OWNER_ONLY` - Action requires owner role
- `FINANCIAL_ACCESS_REQUIRED` - Financial data access required

## Best Practices

1. **Always Use Guards**: Protect all routes that modify data or access sensitive information
2. **Provide Context**: Pass relevant context for accurate permission checks
3. **Cache Invalidation**: Clear cache when user roles or memberships change
4. **Monitor Performance**: Track cache hit rates and response times
5. **Review Audit Logs**: Regularly review denied access attempts for security
6. **Test Permissions**: Test permission logic with different roles and contexts
7. **Document Requirements**: Clearly document permission requirements for each endpoint
8. **Fail Secure**: Default to deny if there's any doubt about permission

## Integration with Permission Service

Guards integrate seamlessly with the existing Permission Service:

- Guards use `PermissionService.checkPermission()` for basic checks
- Guards use `ScopeService` for scope validation
- Guards use `ExpirationService` for expiration checking
- Guards use `InheritanceService` indirectly through PermissionService

## Performance Considerations

- **Cache First**: Guards check cache before database
- **Minimal Database Queries**: Guards reuse PermissionService cache
- **Async Operations**: All permission checks are async
- **No Blocking**: Guards don't block other requests
- **Memory Efficient**: Cache automatically cleans up expired entries

## Testing Guards

Example test for DocumentGuard:

```typescript
describe('DocumentGuard', () => {
  let guard: DocumentGuard;
  let permissionService: PermissionService;
  let guardCacheService: GuardCacheService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DocumentGuard,
        {
          provide: PermissionService,
          useValue: {
            checkPermission: jest.fn(),
            getEffectiveRole: jest.fn(),
          },
        },
        {
          provide: GuardCacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
        // ... other mocks
      ],
    }).compile();

    guard = module.get<DocumentGuard>(DocumentGuard);
    permissionService = module.get<PermissionService>(PermissionService);
    guardCacheService = module.get<GuardCacheService>(GuardCacheService);
  });

  it('should allow document creation with valid permission', async () => {
    jest.spyOn(guardCacheService, 'get').mockReturnValue(null);
    jest.spyOn(permissionService, 'checkPermission').mockResolvedValue({
      allowed: true,
    });

    await expect(
      guard.enforcePermission('user-1', 'project-1', 'create')
    ).resolves.not.toThrow();
  });

  it('should deny document deletion for non-owner viewer', async () => {
    jest.spyOn(guardCacheService, 'get').mockReturnValue(null);
    jest.spyOn(permissionService, 'checkPermission').mockResolvedValue({
      allowed: true,
    });
    jest.spyOn(permissionService, 'getEffectiveRole').mockResolvedValue('VIEWER');

    await expect(
      guard.enforcePermission('user-1', 'project-1', 'delete', 'doc-1', {
        resourceOwnerId: 'user-2', // Different owner
      })
    ).rejects.toThrow(ForbiddenException);
  });
});
```

## Monitoring and Debugging

Enable debug logging to track guard decisions:

```typescript
// In your environment configuration
LOG_LEVEL=debug

// Guards will log:
// - Permission checks
// - Cache hits/misses
// - Denial reasons
// - Performance metrics
```

## Migration from Direct Permission Checks

Replace direct permission checks with guards:

**Before:**
```typescript
@Post()
async createDocument(@User() user, @Param('projectId') projectId: string) {
  const hasPermission = await this.permissionService.hasPermission(
    user.id,
    projectId,
    'documents:document:create'
  );

  if (!hasPermission) {
    throw new ForbiddenException();
  }

  // ...
}
```

**After:**
```typescript
@Permission({ guard: 'document', action: 'create' })
@Post()
async createDocument(@User() user, @Param('projectId') projectId: string) {
  // Permission automatically checked by guard
  // ...
}
```

## Security Considerations

1. **Trust No Input**: Always validate context data
2. **Audit Everything**: All denials are logged
3. **Cache Safely**: Cache only decisions, not sensitive data
4. **Validate Resources**: Check that resources exist before checking permissions
5. **Rate Limiting**: Guards integrate with API rate limiting
6. **SQL Injection**: Guards use TypeORM which prevents SQL injection
7. **Timing Attacks**: Use constant-time comparisons where applicable

## Future Enhancements

Potential improvements for future versions:

1. **Redis Cache**: Replace in-memory cache with Redis for distributed caching
2. **Permission Analytics**: Dashboard for permission usage and denials
3. **Dynamic Rules**: Support for custom permission rules
4. **Batch Operations**: Optimize for bulk permission checks
5. **WebSocket Support**: Real-time permission updates
6. **Role Templates**: Pre-configured role sets for common scenarios

## Support

For questions or issues with the permission guard system:

1. Check this documentation
2. Review the inline code documentation
3. Check audit logs for denial reasons
4. Enable debug logging for detailed traces
5. Contact the development team

## Version History

- **v1.0.0** (2025-01-15): Initial implementation
  - Base guard architecture
  - 7 feature-specific guards
  - Guard caching service
  - Audit logging
  - NestJS integration
