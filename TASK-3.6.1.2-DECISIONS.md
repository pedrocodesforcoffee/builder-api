# Task 3.6.1.2: Budget Management - Implementation Decisions

**Date:** 2025-12-05
**Status:** Ready to Implement

## Questions Resolved

### 1. Authorization: What RBAC/permissions system should we integrate with?

**Answer:** ✅ **Permission Guard System with Dedicated Budget Guard**

**Findings from Codebase:**
- System has a robust permission framework at `/src/modules/permissions/`
- Uses `@Permission()` decorator with guard-specific implementations
- Already has `BudgetGuard` referenced in `permission.guard.ts:14` and used in switch statement at line 158
- Pattern: Each resource type has its own guard (DocumentGuard, RFIGuard, BudgetGuard, etc.)

**Implementation Pattern:**
```typescript
// In controller
@UseGuards(JwtAuthGuard, PermissionGuard)
@Permission({ guard: 'budget', action: 'create' })
@Post('/projects/:projectId/budgets')
async create() {
  // Action is enforced by BudgetGuard
}
```

**Required Actions:**
1. Locate or create `/src/modules/permissions/guards/budget.guard.ts`
2. Implement actions: `create`, `read`, `update`, `delete`, `lock`, `unlock`, `activate`, `import`, `export`
3. Budget guard should check project membership and role-based permissions
4. Register in PermissionGuard if not already done (appears to be at line 158)

---

### 2. File Storage: Where to store uploaded files? S3? Temporary filesystem?

**Answer:** ✅ **Integrate with Existing Document Management System**

**Findings from Codebase:**
- Comprehensive document upload system exists at `/src/modules/documents/controllers/document-upload.controller.ts`
- Uses S3 with pre-signed URLs for direct uploads
- Has multipart upload support for large files (>100MB)
- Upload workflow: initiate → upload to S3 → complete
- Has `DocumentUploadService` handling all S3 operations
- Storage quota management via `StorageQuotaGuard`

**Implementation Approach:**
For Excel/CSV imports:
1. **Option A (Recommended):** Use document upload flow
   - Import file gets uploaded as document
   - Budget import service processes uploaded document
   - Document becomes audit trail
   - Benefits: Consistent file handling, audit trail, quota enforcement

2. **Option B:** Temporary in-memory processing
   - For smaller files (<10MB)
   - Parse directly from multipart form data
   - No persistent storage
   - Faster but no audit trail

**Recommendation:** Use Option A for audit compliance (requirement #3). Store uploaded Excel/CSV as a document with metadata linking to budget.

**Required Actions:**
1. Reuse `DocumentUploadService` or similar S3 utilities
2. Create budget import documents with type `BUDGET_IMPORT`
3. Link import document ID to budget metadata
4. Process file from S3 after upload complete

---

### 3. Historical Snapshots: Need full audit trail or just current state?

**Answer:** ✅ **Full Audit Trail Required**

**Decision:** Implement complete audit system for budget changes

**Implementation Approach:**

**Database Schema Addition:**
```typescript
// New entity: BudgetAuditLog
@Entity('budget_audit_logs')
export class BudgetAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  budgetId: string;

  @Column({ type: 'uuid', nullable: true })
  lineItemId: string; // null for budget-level changes

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 50 })
  action: string; // CREATE, UPDATE, DELETE, LOCK, UNLOCK, ACTIVATE, etc.

  @Column({ type: 'jsonb', nullable: true })
  before: any; // Previous state

  @Column({ type: 'jsonb', nullable: true })
  after: any; // New state

  @Column({ type: 'jsonb', nullable: true })
  metadata: any; // Additional context

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({ type: 'inet', nullable: true })
  ipAddress: string;

  @Column({ type: 'varchar', nullable: true })
  userAgent: string;
}
```

**Snapshot Implementation:**
```typescript
// Snapshots are reconstructed from audit log
async getSnapshot(budgetId: string, date: Date): Promise<BudgetSnapshotDto> {
  // 1. Get all audit logs up to specified date
  // 2. Replay changes to reconstruct state at that point in time
  // 3. Return budget state as of that date
}
```

**Required Actions:**
1. Create `BudgetAuditLog` entity
2. Create `BudgetAuditService` to log all changes
3. Integrate audit logging into all budget/line item mutations
4. Implement snapshot reconstruction from audit logs
5. Add database migration for audit log table

---

### 4. Concurrency: How to handle multiple users editing same budget?

**Answer:** ✅ **Optimistic Locking with Version Control**

**Recommendation:** Implement optimistic locking to prevent data loss while allowing concurrent reads

**Implementation Strategy:**

**1. Add Version Column to Entities:**
```typescript
@Entity('budgets')
export class Budget {
  // ... existing fields

  @VersionColumn()
  version: number; // Auto-incremented by TypeORM on each update

  @Column({ type: 'uuid', nullable: true })
  lockedBy: string; // User ID who locked the budget

  @Column({ type: 'timestamp', nullable: true })
  lockedAt: Date; // When budget was locked
}
```

**2. Lock/Unlock Workflow:**
```
User A locks budget → lockedBy = userId, lockedAt = now, status = LOCKED
Other users see "Budget locked by User A since 2:30 PM"
User A makes changes → All operations check lock ownership
User A unlocks → lockedBy = null, lockedAt = null, status = ACTIVE
```

**3. Optimistic Locking on Updates:**
```typescript
// Client sends version number with update
async update(id: string, dto: UpdateBudgetDto, expectedVersion: number) {
  const result = await budgetRepo.update(
    { id, version: expectedVersion }, // WHERE clause includes version
    dto
  );

  if (result.affected === 0) {
    throw new ConflictException(
      'Budget was modified by another user. Please refresh and try again.'
    );
  }
}
```

**4. Real-time Notifications (Optional Future Enhancement):**
- WebSocket notifications when budget is locked/unlocked
- Show who is currently viewing/editing
- Not required for initial implementation

**Concurrency Rules:**
1. **Reading:** Always allowed, multiple users can view simultaneously
2. **Editing (DRAFT/ACTIVE):** Lock required, exclusive to one user
3. **Locked Budgets:** Only the lock owner can edit or unlock
4. **Version Conflicts:** Return 409 Conflict with clear message
5. **Auto-unlock:** Lock expires after 1 hour of inactivity (optional)

**Required Actions:**
1. Add `@VersionColumn()` to Budget and BudgetLineItem entities
2. Add `lockedBy` and `lockedAt` columns
3. Implement lock/unlock service methods
4. Add version checking to all update operations
5. Return version in all response DTOs
6. Frontend must send version with updates

---

### 5. API Versioning: Stick with v1?

**Answer:** ✅ **Yes, use `/api/v1/`**

**Decision:** All endpoints under `/api/v1/projects/:projectId/budgets/...`

**Rationale:**
- Consistent with existing document upload endpoints
- Allows future API evolution
- Standard REST practice

**Endpoint Structure:**
```
/api/v1/projects/:projectId/budgets
/api/v1/projects/:projectId/budgets/:budgetId
/api/v1/projects/:projectId/budgets/:budgetId/line-items
/api/v1/projects/:projectId/budgets/:budgetId/import
/api/v1/projects/:projectId/budgets/:budgetId/export
etc.
```

---

## Summary of Decisions

| Question | Decision | Impact |
|----------|----------|---------|
| Authorization | PermissionGuard + BudgetGuard | Medium - Need to implement/locate BudgetGuard |
| File Storage | Reuse DocumentUploadService | Medium - Integration work required |
| Audit Trail | Full audit log with snapshots | High - New entity + service needed |
| Concurrency | Optimistic locking + version control | Medium - Add version columns, lock workflow |
| API Versioning | v1 | Low - Follow existing pattern |

## Additional Architectural Decisions

### Concurrency Edge Cases

**Scenario 1: Budget Deletion While Locked**
- **Rule:** Cannot delete locked budget
- **Resolution:** User must unlock first, then delete

**Scenario 2: Lock Timeout**
- **Rule:** Locks auto-expire after 1 hour
- **Implementation:** Background job checks `lockedAt + 1 hour < now`
- **Notification:** User gets warning at 50 minutes

**Scenario 3: Multiple Line Item Edits**
- **Rule:** Line items inherit parent budget lock
- **Resolution:** Check if budget is locked before any line item operation

### Performance Optimizations

**Caching Strategy:**
- Cache budget summaries (TTL: 5 minutes)
- Invalidate on any budget/line item change
- Use Redis if available, in-memory otherwise

**Query Optimization:**
- Index on `budgets.project_id, budgets.status`
- Index on `budget_line_items.budget_id`
- Index on `budget_audit_logs.budget_id, budget_audit_logs.timestamp`

### Error Handling

**Budget Locked by Another User:**
```json
{
  "statusCode": 409,
  "message": "Budget is locked by John Doe since 2:30 PM",
  "error": "Conflict",
  "lockedBy": {
    "userId": "uuid",
    "userName": "John Doe",
    "lockedAt": "2025-12-05T14:30:00Z"
  }
}
```

**Version Conflict:**
```json
{
  "statusCode": 409,
  "message": "Budget was modified by another user",
  "error": "Conflict",
  "currentVersion": 5,
  "expectedVersion": 4
}
```

---

## Implementation Priority

Based on decisions above, here's the recommended implementation order:

### Phase 1: Core Infrastructure (CRITICAL)
1. Create `BudgetAuditLog` entity + migration
2. Create `BudgetAuditService`
3. Add version columns to Budget/BudgetLineItem (migration)
4. Locate/verify `BudgetGuard` implementation

### Phase 2: Enhanced Services
1. Integrate audit logging into all mutations
2. Implement lock/unlock with version control
3. Implement snapshot reconstruction
4. Add concurrency checks

### Phase 3: Import/Export
1. Integrate with DocumentUploadService
2. Implement Excel/CSV parsing
3. Store import files as documents

### Phase 4: Controllers & API
1. Implement all REST endpoints
2. Add permission decorators
3. Integrate versioning in responses

### Phase 5: Testing & Documentation
1. Test concurrency scenarios
2. Test audit trail reconstruction
3. Document API with examples

---

**Approved for Implementation:** 2025-12-05
**Next Step:** Begin Phase 1 (Core Infrastructure)
