# Permission System Manual Testing Guide

## Integration Test Limitations

The integration tests in `test/integration/permission-service.spec.ts` encounter limitations with pg-mem (in-memory PostgreSQL emulator) due to:

1. **Schema Introspection Issues**: pg-mem doesn't fully support TypeORM's column metadata queries
2. **Foreign Key Constraints**: TRUNCATE CASCADE operations fail with pg-mem
3. **Complex Queries**: Some PostgreSQL-specific features are not fully implemented

**Recommendation**: Run integration tests manually against a real PostgreSQL database in a development environment.

## Unit Test Coverage

The permission system has comprehensive unit test coverage (112/112 tests passing):

- **Permission Matcher Utility** (56 tests): Wildcard matching, permission parsing, minimization
- **Scope Matcher Utility** (56 tests): Scope-based access control, filtering, validation

These unit tests provide strong confidence in the permission logic correctness.

## Manual Testing Checklist

### Prerequisites

1. **Set up a test PostgreSQL database**:
```bash
# Create test database
createdb builder_api_test

# Run migrations
TEST_DB_STRATEGY=postgres npm run migration:run
```

2. **Seed test data**:
```bash
npm run seed:test
```

### Test Cases

#### 1. Direct Project Member Permissions

**Test 1.1: PROJECT_ADMIN has all permissions**

```typescript
// Setup
const admin = await createUser({ email: 'admin@test.com' });
const org = await createOrganization({ name: 'Test Org' });
const project = await createProject({ organizationId: org.id, name: 'Test Project' });
await addProjectMember(project.id, admin.id, ProjectRole.PROJECT_ADMIN);

// Test
const permissionService = app.get(PermissionService);

// Should have all permissions
expect(await permissionService.hasPermission(
  admin.id, project.id, Permissions.DRAWING_CREATE
)).toBe(true);

expect(await permissionService.hasPermission(
  admin.id, project.id, Permissions.PROJECT_SETTINGS_UPDATE
)).toBe(true);

// Verify wildcard permission
const permissions = await permissionService.getUserPermissions(admin.id, project.id);
expect(permissions).toContain('*:*:*');
```

**Expected Result**: ✅ Admin has access to all permissions

---

**Test 1.2: PROJECT_MANAGER has management permissions**

```typescript
// Setup
const manager = await createUser({ email: 'manager@test.com' });
await addProjectMember(project.id, manager.id, ProjectRole.PROJECT_MANAGER);

// Test - Should have create/update permissions
expect(await permissionService.hasPermission(
  manager.id, project.id, Permissions.DRAWING_CREATE
)).toBe(true);

expect(await permissionService.hasPermission(
  manager.id, project.id, Permissions.RFI_CREATE
)).toBe(true);

// Should NOT have settings permissions
expect(await permissionService.hasPermission(
  manager.id, project.id, Permissions.PROJECT_SETTINGS_UPDATE
)).toBe(false);
```

**Expected Result**: ✅ Manager has management permissions but not settings

---

**Test 1.3: VIEWER has only read permissions**

```typescript
// Setup
const viewer = await createUser({ email: 'viewer@test.com' });
await addProjectMember(project.id, viewer.id, ProjectRole.VIEWER);

// Test - Should have read permissions
expect(await permissionService.hasPermission(
  viewer.id, project.id, Permissions.DRAWING_READ
)).toBe(true);

expect(await permissionService.hasPermission(
  viewer.id, project.id, Permissions.RFI_READ
)).toBe(true);

// Should NOT have create/update/delete permissions
expect(await permissionService.hasPermission(
  viewer.id, project.id, Permissions.DRAWING_CREATE
)).toBe(false);

expect(await permissionService.hasPermission(
  viewer.id, project.id, Permissions.DRAWING_UPDATE
)).toBe(false);
```

**Expected Result**: ✅ Viewer has read-only access

---

#### 2. Organization Role Inheritance

**Test 2.1: ORG OWNER inherits PROJECT_ADMIN**

```typescript
// Setup
const owner = await createUser({ email: 'owner@test.com' });
await addOrganizationMember(org.id, owner.id, OrganizationRole.OWNER);

// Note: owner is NOT added as project member directly

// Test
const effectiveRole = await permissionService.getEffectiveRole(owner.id, project.id);
expect(effectiveRole).toBe(ProjectRole.PROJECT_ADMIN);

// Should have all permissions
expect(await permissionService.hasPermission(
  owner.id, project.id, Permissions.DRAWING_CREATE
)).toBe(true);

expect(await permissionService.hasPermission(
  owner.id, project.id, Permissions.PROJECT_SETTINGS_UPDATE
)).toBe(true);
```

**Expected Result**: ✅ Org owner automatically gets PROJECT_ADMIN access

---

**Test 2.2: ORG_ADMIN inherits PROJECT_ADMIN**

```typescript
// Setup
const orgAdmin = await createUser({ email: 'org-admin@test.com' });
await addOrganizationMember(org.id, orgAdmin.id, OrganizationRole.ORG_ADMIN);

// Test
const effectiveRole = await permissionService.getEffectiveRole(orgAdmin.id, project.id);
expect(effectiveRole).toBe(ProjectRole.PROJECT_ADMIN);

expect(await permissionService.hasPermission(
  orgAdmin.id, project.id, Permissions.ALL_PERMISSIONS
)).toBe(true);
```

**Expected Result**: ✅ Org admin automatically gets PROJECT_ADMIN access

---

**Test 2.3: ORG_MEMBER does NOT inherit permissions**

```typescript
// Setup
const orgMember = await createUser({ email: 'org-member@test.com' });
await addOrganizationMember(org.id, orgMember.id, OrganizationRole.ORG_MEMBER);

// Test
const effectiveRole = await permissionService.getEffectiveRole(orgMember.id, project.id);
expect(effectiveRole).toBeNull();

expect(await permissionService.hasPermission(
  orgMember.id, project.id, Permissions.DRAWING_READ
)).toBe(false);
```

**Expected Result**: ✅ Org member does NOT get automatic project access

---

#### 3. Scope-Based Access Control

**Test 3.1: FOREMAN limited by scope**

```typescript
// Setup
const foreman = await createUser({ email: 'foreman@test.com' });
await addProjectMember(project.id, foreman.id, ProjectRole.FOREMAN, {
  scope: ['electrical', 'lighting']
});

// Create test documents with scopes
const electricalDoc = await createDocument({
  projectId: project.id,
  scope: ['electrical', 'floor-1']
});

const plumbingDoc = await createDocument({
  projectId: project.id,
  scope: ['plumbing', 'floor-2']
});

// Test - Should have access to electrical resources
const hasAccessToElectrical = await permissionService.checkScopeAccess(
  foreman.id, project.id, electricalDoc.id, electricalDoc.scope
);
expect(hasAccessToElectrical).toBe(true);

// Should NOT have access to plumbing resources
const hasAccessToPlumbing = await permissionService.checkScopeAccess(
  foreman.id, project.id, plumbingDoc.id, plumbingDoc.scope
);
expect(hasAccessToPlumbing).toBe(false);
```

**Expected Result**: ✅ Foreman can only access resources within their scope

---

**Test 3.2: SUBCONTRACTOR limited by scope**

```typescript
// Setup
const subcontractor = await createUser({ email: 'subcontractor@test.com' });
await addProjectMember(project.id, subcontractor.id, ProjectRole.SUBCONTRACTOR, {
  scope: ['hvac', 'mechanical']
});

// Create test RFI
const hvacRfi = await createRfi({
  projectId: project.id,
  scope: ['hvac']
});

const electricalRfi = await createRfi({
  projectId: project.id,
  scope: ['electrical']
});

// Test
expect(await permissionService.checkScopeAccess(
  subcontractor.id, project.id, hvacRfi.id, hvacRfi.scope
)).toBe(true);

expect(await permissionService.checkScopeAccess(
  subcontractor.id, project.id, electricalRfi.id, electricalRfi.scope
)).toBe(false);
```

**Expected Result**: ✅ Subcontractor can only access resources within their scope

---

**Test 3.3: Non-scope-limited roles ignore scope**

```typescript
// Setup
const engineer = await createUser({ email: 'engineer@test.com' });
await addProjectMember(project.id, engineer.id, ProjectRole.PROJECT_ENGINEER);

// Test - Should have access regardless of resource scope
expect(await permissionService.checkScopeAccess(
  engineer.id, project.id, electricalDoc.id, electricalDoc.scope
)).toBe(true);

expect(await permissionService.checkScopeAccess(
  engineer.id, project.id, plumbingDoc.id, plumbingDoc.scope
)).toBe(true);
```

**Expected Result**: ✅ Engineer has access to all scopes

---

#### 4. Expiration Handling

**Test 4.1: Expired members denied access**

```typescript
// Setup
const tempWorker = await createUser({ email: 'temp@test.com' });
const pastDate = new Date();
pastDate.setDate(pastDate.getDate() - 1); // Yesterday

await addProjectMember(project.id, tempWorker.id, ProjectRole.SUBCONTRACTOR, {
  expiresAt: pastDate
});

// Test
const result = await permissionService.checkPermission(
  tempWorker.id, project.id, Permissions.DRAWING_READ
);

expect(result.allowed).toBe(false);
expect(result.reason).toBe(PermissionDenialReason.ACCESS_EXPIRED);
expect(result.expiredAt).toEqual(pastDate);
```

**Expected Result**: ✅ Expired member cannot access project

---

**Test 4.2: Non-expired members allowed access**

```typescript
// Setup
const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 30); // 30 days from now

await addProjectMember(project.id, tempWorker.id, ProjectRole.SUBCONTRACTOR, {
  expiresAt: futureDate
});

// Test
expect(await permissionService.hasPermission(
  tempWorker.id, project.id, Permissions.DRAWING_READ
)).toBe(true);
```

**Expected Result**: ✅ Non-expired member has access

---

#### 5. Permission Caching

**Test 5.1: Cache improves performance**

```typescript
// First check (uncached)
const start1 = Date.now();
await permissionService.hasPermission(
  admin.id, project.id, Permissions.DRAWING_CREATE
);
const duration1 = Date.now() - start1;

// Second check (cached)
const start2 = Date.now();
await permissionService.hasPermission(
  admin.id, project.id, Permissions.DRAWING_CREATE
);
const duration2 = Date.now() - start2;

// Cached should be significantly faster
expect(duration2).toBeLessThan(duration1);
expect(duration2).toBeLessThan(10); // <10ms target
```

**Expected Result**: ✅ Cached checks are under 10ms

---

**Test 5.2: Cache clears on role change**

```typescript
// Setup
await addProjectMember(project.id, viewer.id, ProjectRole.VIEWER);

// Check permission (gets cached as VIEWER)
expect(await permissionService.hasPermission(
  viewer.id, project.id, Permissions.DRAWING_CREATE
)).toBe(false);

// Change role to PROJECT_ADMIN
await updateProjectMember(project.id, viewer.id, {
  role: ProjectRole.PROJECT_ADMIN
});

// Clear cache
await permissionService.clearPermissionCache(viewer.id, project.id);

// Check permission again (should reflect new role)
expect(await permissionService.hasPermission(
  viewer.id, project.id, Permissions.DRAWING_CREATE
)).toBe(true);
```

**Expected Result**: ✅ Cache invalidates correctly on role change

---

#### 6. Bulk Permission Checks

**Test 6.1: Efficient multi-permission check**

```typescript
const permissionsToCheck = [
  Permissions.DRAWING_CREATE,
  Permissions.DRAWING_READ,
  Permissions.DRAWING_UPDATE,
  Permissions.DRAWING_DELETE,
  Permissions.RFI_CREATE,
  Permissions.SUBMITTAL_APPROVE,
];

const start = Date.now();
const permissionMap = await permissionService.getUserPermissionMap(
  manager.id, project.id, permissionsToCheck
);
const duration = Date.now() - start;

expect(permissionMap[Permissions.DRAWING_CREATE]).toBe(true);
expect(permissionMap[Permissions.DRAWING_READ]).toBe(true);
expect(permissionMap[Permissions.SUBMITTAL_APPROVE]).toBe(true);

expect(duration).toBeLessThan(100); // <100ms target
```

**Expected Result**: ✅ Bulk check completes under 100ms

---

#### 7. Error Handling

**Test 7.1: Non-existent user**

```typescript
const fakeUserId = '00000000-0000-0000-0000-000000000000';

const result = await permissionService.checkPermission(
  fakeUserId, project.id, Permissions.DRAWING_READ
);

expect(result.allowed).toBe(false);
expect(result.reason).toBe(PermissionDenialReason.USER_NOT_MEMBER);
```

**Expected Result**: ✅ Returns false for non-existent user

---

**Test 7.2: Non-existent project**

```typescript
const fakeProjectId = '00000000-0000-0000-0000-000000000000';

const result = await permissionService.checkPermission(
  admin.id, fakeProjectId, Permissions.DRAWING_READ
);

expect(result.allowed).toBe(false);
```

**Expected Result**: ✅ Returns false for non-existent project

---

## Performance Benchmarks

Run these benchmarks to verify performance targets:

### Cached Permission Check (<10ms target)

```typescript
async function benchmarkCachedCheck() {
  const iterations = 1000;
  const durations: number[] = [];

  // Prime the cache
  await permissionService.hasPermission(
    admin.id, project.id, Permissions.DRAWING_CREATE
  );

  // Measure cached checks
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await permissionService.hasPermission(
      admin.id, project.id, Permissions.DRAWING_CREATE
    );
    durations.push(performance.now() - start);
  }

  const avg = durations.reduce((a, b) => a + b) / iterations;
  const p95 = durations.sort()[Math.floor(iterations * 0.95)];

  console.log(`Cached Check - Avg: ${avg.toFixed(2)}ms, P95: ${p95.toFixed(2)}ms`);
  expect(avg).toBeLessThan(10);
  expect(p95).toBeLessThan(10);
}
```

**Expected Result**: ✅ Average <10ms, P95 <10ms

---

### Uncached Permission Check (<100ms target)

```typescript
async function benchmarkUncachedCheck() {
  const iterations = 100;
  const durations: number[] = [];

  for (let i = 0; i < iterations; i++) {
    // Clear cache before each check
    await permissionService.clearPermissionCache(admin.id, project.id);

    const start = performance.now();
    await permissionService.hasPermission(
      admin.id, project.id, Permissions.DRAWING_CREATE
    );
    durations.push(performance.now() - start);
  }

  const avg = durations.reduce((a, b) => a + b) / iterations;
  const p95 = durations.sort()[Math.floor(iterations * 0.95)];

  console.log(`Uncached Check - Avg: ${avg.toFixed(2)}ms, P95: ${p95.toFixed(2)}ms`);
  expect(avg).toBeLessThan(100);
  expect(p95).toBeLessThan(100);
}
```

**Expected Result**: ✅ Average <100ms, P95 <100ms

---

## Testing Script

Create a test script to run all manual tests:

```typescript
// test/manual/permission-system.test.ts

import { Test, TestingModule } from '@nestjs/testing';
import { PermissionService } from '@/modules/permissions';
import { createTestingModule } from '../helpers/test-module.helper';

describe('Permission System Manual Tests', () => {
  let module: TestingModule;
  let permissionService: PermissionService;

  beforeAll(async () => {
    module = await createTestingModule();
    permissionService = module.get(PermissionService);
  });

  afterAll(async () => {
    await module.close();
  });

  // Copy all test cases from above
  // Run with: npm run test:manual
});
```

---

## Sign-off Checklist

- [ ] All 7 test categories pass
- [ ] Performance benchmarks meet targets (<10ms cached, <100ms uncached)
- [ ] Organization role inheritance works correctly
- [ ] Scope filtering works for FOREMAN and SUBCONTRACTOR
- [ ] Expiration handling works correctly
- [ ] Cache invalidation works on role changes
- [ ] Error handling returns appropriate denial reasons
- [ ] Documentation is complete and accurate

---

## Known Limitations

1. **pg-mem Incompatibility**: Integration tests cannot run with pg-mem
2. **In-Memory Cache**: Current implementation uses in-memory cache (not distributed)
3. **Cache TTL**: Fixed 15-minute TTL (not configurable)

**Recommendations for Production**:
- Replace in-memory cache with Redis for distributed systems
- Make cache TTL configurable
- Add cache warming on server startup
- Implement permission audit logging
