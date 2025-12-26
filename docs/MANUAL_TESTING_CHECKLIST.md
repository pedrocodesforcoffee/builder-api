# Manual Testing Checklist - Multi-Level Role Models (Task 3.2.3.1)

## Overview

This document provides a comprehensive checklist for manually testing all functionality implemented in Task 3.2.3.1: Multi-Level Role Models.

**Test Date:** 2025-11-09
**Tested By:** Development Team
**Version:** 1.0.0

---

## Table of Contents

1. [Entity Field Verification](#entity-field-verification)
2. [Database Migration Verification](#database-migration-verification)
3. [Validation Logic Testing](#validation-logic-testing)
4. [Unit Test Verification](#unit-test-verification)
5. [Integration Test Verification](#integration-test-verification)
6. [End-to-End Workflow Testing](#end-to-end-workflow-testing)
7. [Performance Testing](#performance-testing)
8. [Security Audit](#security-audit)
9. [Documentation Review](#documentation-review)
10. [Test Results Summary](#test-results-summary)

---

## 1. Entity Field Verification

### ProjectMember Entity

- [ ] **scope field (JSONB)**
  - [ ] Field exists in entity
  - [ ] Column exists in database
  - [ ] Can store array format: `["electrical", "plumbing"]`
  - [ ] Can store object format: `{ trades: ["electrical"], floors: ["1"] }`
  - [ ] Nullable constraint works correctly
  - [ ] Index exists: `IDX_proj_members_scope`

- [ ] **invitedAt field (timestamp)**
  - [ ] Field exists in entity
  - [ ] Column exists in database
  - [ ] Can be null
  - [ ] Stores timestamp correctly
  - [ ] Index exists: `IDX_proj_members_invited_at`

- [ ] **acceptedAt field (timestamp)**
  - [ ] Field exists in entity
  - [ ] Column exists in database
  - [ ] Can be null
  - [ ] Stores timestamp correctly
  - [ ] Index exists: `IDX_proj_members_accepted_at`

- [ ] **joinedAt field (timestamp)**
  - [ ] Field exists in entity
  - [ ] Column exists in database
  - [ ] Can be null
  - [ ] Stores timestamp correctly
  - [ ] Index exists: `IDX_proj_members_joined_at`

- [ ] **lastAccessedAt field (timestamp)**
  - [ ] Field exists in entity
  - [ ] Column exists in database
  - [ ] Can be null
  - [ ] Stores timestamp correctly
  - [ ] Index exists: `IDX_proj_members_last_accessed_at`

- [ ] **Helper Methods**
  - [ ] `isExpired()` works correctly
  - [ ] `hasScopeLimitations()` returns true when scope exists
  - [ ] `hasAccessToScope()` validates array format
  - [ ] `hasAccessToScope()` validates object format
  - [ ] `isInvitationPending()` checks workflow state
  - [ ] `hasJoined()` validates joined state
  - [ ] `getDaysSinceLastAccess()` calculates correctly
  - [ ] All role permission methods work (isProjectAdmin, canManageMembers, canEditData)

### OrganizationMember Entity

- [ ] **invitedAt field (timestamp)**
  - [ ] Field exists in entity
  - [ ] Column exists in database
  - [ ] Can be null
  - [ ] Stores timestamp correctly
  - [ ] Index exists: `IDX_org_members_invited_at`

- [ ] **acceptedAt field (timestamp)**
  - [ ] Field exists in entity
  - [ ] Column exists in database
  - [ ] Can be null
  - [ ] Stores timestamp correctly
  - [ ] Index exists: `IDX_org_members_accepted_at`

- [ ] **joinedAt field (timestamp)**
  - [ ] Field exists in entity
  - [ ] Column exists in database
  - [ ] Can be null
  - [ ] Stores timestamp correctly
  - [ ] Index exists: `IDX_org_members_joined_at`

- [ ] **Helper Methods**
  - [ ] `isOwner()` returns true for OWNER role
  - [ ] `isAdmin()` returns true for OWNER and ORG_ADMIN
  - [ ] `isInvitationPending()` checks workflow state
  - [ ] `hasJoined()` validates joined state

---

## 2. Database Migration Verification

- [ ] **Migration File**
  - [ ] File exists: `1762636000000-AddScopeAndInvitationFieldsToMemberships.ts`
  - [ ] Migration name is descriptive
  - [ ] up() method adds all columns
  - [ ] down() method removes all columns
  - [ ] All indices created in up()
  - [ ] All indices removed in down()

- [ ] **Migration Execution**
  - [ ] Migration ran successfully: `npm run migration:run`
  - [ ] All columns added to `project_members` table:
    - [ ] scope (jsonb)
    - [ ] invited_at (timestamp)
    - [ ] accepted_at (timestamp)
    - [ ] joined_at (timestamp)
    - [ ] last_accessed_at (timestamp)
  - [ ] All columns added to `organization_members` table:
    - [ ] invited_at (timestamp)
    - [ ] accepted_at (timestamp)
    - [ ] joined_at (timestamp)
  - [ ] All 8 indices created successfully
  - [ ] No errors in migration log
  - [ ] Database schema matches entity definitions

- [ ] **Rollback Test**
  - [ ] down() method tested (if safe to do so)
  - [ ] Columns removed correctly
  - [ ] Indices removed correctly
  - [ ] Can re-run up() after down()

---

## 3. Validation Logic Testing

### Organization Member Validators

- [ ] **validateNotRemovingLastOwner()**
  - [ ] Allows removing non-owner members
  - [ ] Allows removing owner when multiple owners exist
  - [ ] Throws ConflictException when removing last owner
  - [ ] Error message: "Cannot remove the last owner from an organization"
  - [ ] Returns without error when member not found

- [ ] **validateNotDemotingLastOwner()**
  - [ ] Allows promoting any member to owner
  - [ ] Allows demoting non-owner members
  - [ ] Allows demoting owner when multiple owners exist
  - [ ] Throws ConflictException when demoting last owner
  - [ ] Error message: "Cannot demote the last owner"
  - [ ] Returns without error when member not found

- [ ] **validateRoleHierarchy()**
  - [ ] OWNER can assign any role including OWNER
  - [ ] Only OWNER can assign OWNER role
  - [ ] ORG_ADMIN can assign ORG_ADMIN, ORG_MEMBER, GUEST
  - [ ] ORG_ADMIN cannot assign OWNER
  - [ ] ORG_MEMBER can assign GUEST and ORG_MEMBER
  - [ ] ORG_MEMBER cannot assign ORG_ADMIN or OWNER
  - [ ] GUEST cannot manage any members
  - [ ] Throws appropriate BadRequestException for violations

- [ ] **validateInvitationTimestamps()**
  - [ ] Accepts all null timestamps
  - [ ] Accepts only invitedAt
  - [ ] Accepts invitedAt + acceptedAt
  - [ ] Accepts complete workflow (invitedAt + acceptedAt + joinedAt)
  - [ ] Throws when acceptedAt without invitedAt
  - [ ] Throws when joinedAt without acceptedAt
  - [ ] Throws when acceptedAt before invitedAt
  - [ ] Throws when joinedAt before acceptedAt
  - [ ] Accepts same timestamps (edge case)

### Project Member Validators

- [ ] **validateScope()**
  - [ ] Accepts null scope
  - [ ] Accepts undefined scope
  - [ ] Accepts valid array: `["electrical", "plumbing"]`
  - [ ] Accepts valid object: `{ trades: ["electrical"] }`
  - [ ] Rejects empty array
  - [ ] Rejects array with non-string elements
  - [ ] Rejects array with empty strings
  - [ ] Rejects empty object
  - [ ] Rejects object with empty array values
  - [ ] Rejects object with non-array values
  - [ ] Rejects object with non-string array elements
  - [ ] Rejects invalid format (number, string)

- [ ] **validateExpiresAt()**
  - [ ] Accepts null expiresAt
  - [ ] Accepts undefined expiresAt
  - [ ] Accepts future date
  - [ ] Rejects past date
  - [ ] Rejects current time (edge case)
  - [ ] Rejects date more than 5 years in future (default)
  - [ ] Accepts date within custom max years
  - [ ] Rejects date beyond custom max years
  - [ ] Rejects invalid date object

- [ ] **validateProjectRoleHierarchy()**
  - [ ] PROJECT_ADMIN can assign any role
  - [ ] Only PROJECT_ADMIN can assign PROJECT_ADMIN role
  - [ ] PROJECT_MANAGER can assign non-admin roles
  - [ ] PROJECT_MANAGER cannot assign PROJECT_ADMIN
  - [ ] Lower roles cannot assign higher admin roles
  - [ ] Non-admin roles cannot manage members
  - [ ] Can assign same level role
  - [ ] Throws appropriate BadRequestException

- [ ] **validateInvitationTimestamps()**
  - [ ] Same tests as organization validators

- [ ] **validateScopeForRole()**
  - [ ] Warns when PROJECT_ADMIN has scope
  - [ ] Warns when PROJECT_MANAGER has scope
  - [ ] Warns when SUBCONTRACTOR has no scope
  - [ ] Warns when FOREMAN has no scope
  - [ ] No warning for SUBCONTRACTOR with scope
  - [ ] No warning for PROJECT_ADMIN without scope
  - [ ] No warning for other roles

- [ ] **validateExpiresAtForRole()**
  - [ ] Warns when PROJECT_ADMIN has expiration
  - [ ] Warns when PROJECT_MANAGER has expiration
  - [ ] Warns when SUBCONTRACTOR has no expiration
  - [ ] Warns when INSPECTOR has no expiration
  - [ ] No warning for SUBCONTRACTOR with expiration
  - [ ] No warning for PROJECT_ADMIN without expiration
  - [ ] No warning for other roles

---

## 4. Unit Test Verification

### Run All Unit Tests

```bash
npm run test:unit
```

- [ ] **All tests pass**
- [ ] **No test failures**
- [ ] **No test errors**
- [ ] **Test coverage meets requirements**

### Entity Tests

- [ ] **ProjectMember Entity (44 tests)**
  - [ ] Helper method tests pass
  - [ ] isExpired() tests pass
  - [ ] hasScopeLimitations() tests pass
  - [ ] hasAccessToScope() array tests pass
  - [ ] hasAccessToScope() object tests pass
  - [ ] isInvitationPending() tests pass
  - [ ] hasJoined() tests pass
  - [ ] getDaysSinceLastAccess() tests pass
  - [ ] Role permission method tests pass

- [ ] **OrganizationMember Entity (32 tests)**
  - [ ] Helper method tests pass
  - [ ] isOwner() tests pass
  - [ ] isAdmin() tests pass
  - [ ] isInvitationPending() tests pass
  - [ ] hasJoined() tests pass

### Validator Tests

- [ ] **Project Member Validators (49 tests)**
  - [ ] validateScope() tests pass (17 tests)
  - [ ] validateExpiresAt() tests pass (9 tests)
  - [ ] validateProjectRoleHierarchy() tests pass (10 tests)
  - [ ] validateInvitationTimestamps() tests pass (11 tests)
  - [ ] validateScopeForRole() tests pass (6 tests)
  - [ ] validateExpiresAtForRole() tests pass (6 tests)

- [ ] **Organization Member Validators (36 tests)**
  - [ ] validateNotRemovingLastOwner() tests pass (5 tests)
  - [ ] validateNotDemotingLastOwner() tests pass (6 tests)
  - [ ] validateRoleHierarchy() tests pass (12 tests)
  - [ ] validateInvitationTimestamps() tests pass (10 tests)
  - [ ] Integration scenario tests pass (3 tests)

**Total Unit Tests:** 161 tests

---

## 5. Integration Test Verification

### Run All Integration Tests

```bash
TEST_DB_STRATEGY=in-memory npm run test:integration
```

- [ ] **All tests pass**
- [ ] **No test failures**
- [ ] **No test errors**
- [ ] **Database operations successful**

### Membership Entities Integration Tests (28 tests)

- [ ] **OrganizationMember Entity (8 tests)**
  - [ ] Create with basic fields
  - [ ] Create with invitation workflow fields
  - [ ] Update invitation timestamps
  - [ ] Query by invitation status
  - [ ] Enforce role hierarchy

- [ ] **ProjectMember Entity (18 tests)**
  - [ ] Create with basic fields
  - [ ] Create with scope (array format)
  - [ ] Create with scope (object format)
  - [ ] Query by scope limitations
  - [ ] Create with expiration date
  - [ ] Track lastAccessedAt
  - [ ] Create with invitation workflow
  - [ ] Query expired memberships
  - [ ] Test all project roles
  - [ ] Complex queries with multiple filters

- [ ] **Performance Tests (2 tests)**
  - [ ] Indices used for organization member queries
  - [ ] Indices used for project member queries

### Membership Validators Integration Tests (8 tests)

- [ ] **validateNotRemovingLastOwner (3 tests)**
  - [ ] Allow removing non-owner
  - [ ] Allow removing owner with multiple owners
  - [ ] Throw when removing last owner

- [ ] **validateNotDemotingLastOwner (4 tests)**
  - [ ] Allow promoting to owner
  - [ ] Allow demoting non-owner
  - [ ] Allow demoting owner with multiple owners
  - [ ] Throw when demoting last owner

- [ ] **Real-world scenarios (1 test)**
  - [ ] Complete organization lifecycle

**Total Integration Tests:** 36 tests

---

## 6. End-to-End Workflow Testing

### Organization Member Workflows

- [ ] **Create Organization with Founder**
  - [ ] Create user
  - [ ] Create organization
  - [ ] Add user as OWNER with joinedAt timestamp
  - [ ] Verify user is owner
  - [ ] Verify user can manage members

- [ ] **Invite Member to Organization**
  - [ ] Create invitation with invitedAt timestamp
  - [ ] Verify invitation is pending
  - [ ] Member accepts invitation (set acceptedAt)
  - [ ] Member joins organization (set joinedAt)
  - [ ] Verify member is active

- [ ] **Promote Member to Admin**
  - [ ] OWNER promotes ORG_MEMBER to ORG_ADMIN
  - [ ] Verify new role applied
  - [ ] Verify admin can manage members
  - [ ] Verify admin cannot assign OWNER role

- [ ] **Add Second Owner**
  - [ ] OWNER adds another OWNER
  - [ ] Verify two owners exist
  - [ ] Original owner can now be demoted/removed

- [ ] **Attempt to Remove Last Owner**
  - [ ] Create organization with single owner
  - [ ] Attempt to remove owner
  - [ ] Verify ConflictException thrown
  - [ ] Verify organization still has owner

- [ ] **Attempt to Demote Last Owner**
  - [ ] Create organization with single owner
  - [ ] Attempt to demote owner to ORG_ADMIN
  - [ ] Verify ConflictException thrown
  - [ ] Verify owner role maintained

### Project Member Workflows

- [ ] **Add Project Manager**
  - [ ] Create project
  - [ ] Add user as PROJECT_MANAGER
  - [ ] Set joinedAt timestamp
  - [ ] Verify manager can manage members
  - [ ] Verify manager can edit data

- [ ] **Add Subcontractor with Scope**
  - [ ] Define scope: `{ trades: ["electrical"], floors: ["1", "2"] }`
  - [ ] Validate scope format
  - [ ] Set expiration date (6 months)
  - [ ] Validate expiration date
  - [ ] Add subcontractor with scope and expiration
  - [ ] Verify scope stored correctly
  - [ ] Verify expiration stored correctly

- [ ] **Check Scope Access**
  - [ ] Verify `hasScopeLimitations()` returns true
  - [ ] Verify `hasAccessToScope("trades", "electrical")` returns true
  - [ ] Verify `hasAccessToScope("trades", "plumbing")` returns false
  - [ ] Verify `hasAccessToScope("floors", "3")` returns false

- [ ] **Track Member Activity**
  - [ ] Member accesses project
  - [ ] Update lastAccessedAt timestamp
  - [ ] Verify timestamp updated
  - [ ] Check `getDaysSinceLastAccess()` returns 0

- [ ] **Expire Membership**
  - [ ] Create member with past expiration date
  - [ ] Verify `isExpired()` returns true
  - [ ] Query expired memberships
  - [ ] Verify expired member included in results

- [ ] **Invitation Workflow**
  - [ ] Invite user with invitedAt
  - [ ] Verify `isInvitationPending()` returns true
  - [ ] User accepts (set acceptedAt)
  - [ ] User joins (set joinedAt)
  - [ ] Verify `hasJoined()` returns true
  - [ ] Verify `isInvitationPending()` returns false

### Role Hierarchy Enforcement

- [ ] **Organization Hierarchy**
  - [ ] OWNER can assign OWNER
  - [ ] ORG_ADMIN cannot assign OWNER
  - [ ] ORG_ADMIN can assign ORG_ADMIN
  - [ ] ORG_MEMBER can assign GUEST
  - [ ] ORG_MEMBER cannot assign ORG_ADMIN
  - [ ] GUEST cannot manage members

- [ ] **Project Hierarchy**
  - [ ] PROJECT_ADMIN can assign PROJECT_ADMIN
  - [ ] PROJECT_MANAGER cannot assign PROJECT_ADMIN
  - [ ] PROJECT_MANAGER can assign PROJECT_MANAGER
  - [ ] Lower roles cannot manage members

---

## 7. Performance Testing

### Database Query Performance

- [ ] **Index Usage Verification**
  - [ ] Run EXPLAIN on organization member queries
  - [ ] Verify index scan used (not sequential scan)
  - [ ] Run EXPLAIN on project member queries
  - [ ] Verify index scan used
  - [ ] Check query execution time < 100ms for single lookups

- [ ] **Scope Query Performance**
  - [ ] Query members with scope limitations
  - [ ] Verify JSONB index used (if GIN index added)
  - [ ] Check query execution time acceptable

- [ ] **Invitation Status Queries**
  - [ ] Query pending invitations (invitedAt IS NOT NULL, acceptedAt IS NULL)
  - [ ] Verify indices used
  - [ ] Check query execution time

- [ ] **Expired Membership Queries**
  - [ ] Query expired memberships (expiresAt < NOW())
  - [ ] Verify index used
  - [ ] Check query execution time

### Load Testing (if applicable)

- [ ] **Multiple Concurrent Operations**
  - [ ] Create 100 organization members concurrently
  - [ ] Create 100 project members concurrently
  - [ ] Verify no deadlocks
  - [ ] Verify no race conditions

- [ ] **Large Dataset Queries**
  - [ ] Create 1000 members
  - [ ] Query all members with filters
  - [ ] Verify response time acceptable
  - [ ] Verify memory usage acceptable

---

## 8. Security Audit

### Permission Enforcement

- [ ] **Organization Level**
  - [ ] Non-owner cannot assign OWNER role
  - [ ] Non-admin cannot manage members
  - [ ] Guest cannot perform any management
  - [ ] Cannot remove last owner
  - [ ] Cannot demote last owner

- [ ] **Project Level**
  - [ ] Non-admin cannot assign PROJECT_ADMIN
  - [ ] Non-manager cannot manage members
  - [ ] Scope limitations enforced for subcontractors
  - [ ] Expired memberships handled correctly

### Data Validation

- [ ] **Scope Validation**
  - [ ] Invalid scope formats rejected
  - [ ] Empty scopes rejected
  - [ ] SQL injection attempts in scope blocked

- [ ] **Timestamp Validation**
  - [ ] Future dates for expiresAt required
  - [ ] Timestamp order enforced (invited < accepted < joined)
  - [ ] Invalid dates rejected

- [ ] **Role Validation**
  - [ ] Invalid roles rejected by enum
  - [ ] Role hierarchy enforced
  - [ ] Role changes validated

---

## 9. Documentation Review

- [ ] **MULTI_LEVEL_ROLES.md**
  - [ ] Document exists
  - [ ] Table of contents complete
  - [ ] All sections present:
    - [ ] Role Hierarchy diagrams
    - [ ] System Architecture
    - [ ] Entity Schemas
    - [ ] Role Definitions (all 14 roles)
    - [ ] Permission Matrix
    - [ ] Scope-Based Access Control
    - [ ] Invitation Workflow
    - [ ] Validation Rules
    - [ ] Usage Examples (7 examples)
    - [ ] Best Practices
  - [ ] ASCII diagrams render correctly
  - [ ] Code examples are accurate
  - [ ] All role definitions complete
  - [ ] Permission matrices accurate

- [ ] **README Updates**
  - [ ] Main README mentions multi-level roles
  - [ ] Links to MULTI_LEVEL_ROLES.md

- [ ] **Code Comments**
  - [ ] Entities well-documented
  - [ ] Validators have clear descriptions
  - [ ] Helper methods documented
  - [ ] Complex logic explained

---

## 10. Test Results Summary

### Automated Test Results

**Unit Tests:**
- Total: 161 tests
- Passed: ___
- Failed: ___
- Skipped: ___
- Duration: ___ seconds

**Integration Tests:**
- Total: 36 tests
- Passed: ___
- Failed: ___
- Skipped: ___
- Duration: ___ seconds

**Total Tests:** 197 tests

### Manual Test Results

**Entity Verification:**
- Items tested: ___
- Items passed: ___
- Items failed: ___
- Pass rate: ___%

**Validation Logic:**
- Items tested: ___
- Items passed: ___
- Items failed: ___
- Pass rate: ___%

**End-to-End Workflows:**
- Workflows tested: ___
- Workflows passed: ___
- Workflows failed: ___
- Pass rate: ___%

**Performance Tests:**
- Tests run: ___
- Tests passed: ___
- Average query time: ___ ms
- Index usage: ___% of queries

**Security Audit:**
- Items checked: ___
- Items passed: ___
- Items failed: ___
- Pass rate: ___%

**Documentation Review:**
- Sections reviewed: ___
- Sections complete: ___
- Sections incomplete: ___
- Completion rate: ___%

---

## Issues Found

| # | Category | Issue | Severity | Status | Notes |
|---|----------|-------|----------|--------|-------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

**Severity Levels:**
- Critical: System breaking, data loss, security vulnerability
- High: Major functionality broken
- Medium: Minor functionality issues
- Low: Cosmetic or documentation issues

---

## Sign-Off

**Task Status:** ☐ Complete ☐ Incomplete

**Completion Criteria Met:**
- [ ] All automated tests passing
- [ ] All manual tests completed
- [ ] No critical or high severity issues
- [ ] Documentation complete and accurate
- [ ] Performance acceptable
- [ ] Security audit passed

**Tested By:** ___________________________
**Date:** ___________________________
**Signature:** ___________________________

**Reviewed By:** ___________________________
**Date:** ___________________________
**Signature:** ___________________________

---

## Next Steps

Based on test results:

1. Fix any critical or high severity issues
2. Address medium/low issues as time permits
3. Update documentation if discrepancies found
4. Proceed to next task if all criteria met

---

**End of Manual Testing Checklist**
