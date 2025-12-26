# Role Permission Matrix

## Overview

This document provides a comprehensive permission matrix for all 10 project roles in the BobTheBuilder construction management system. The matrix shows which permissions each role has across all modules.

## Legend

- ✅ = Full Access (Create, Read, Update, Delete, Approve)
- 📖 = Read Only
- ✏️ = Read + Create/Update (no Delete/Approve)
- 🔍 = Scope-Limited (only assigned items)
- ❌ = No Access
- 👑 = Approval Authority

## Project Roles

1. **PROJECT_ADMIN** - Full project control
2. **PROJECT_MANAGER** - Project management & coordination
3. **PROJECT_ENGINEER** - Technical oversight
4. **SUPERINTENDENT** - Field supervision
5. **FOREMAN** - On-site crew management (scope-limited)
6. **ARCHITECT_ENGINEER** - Design and engineering consultant
7. **SUBCONTRACTOR** - Trade-specific contractor (scope-limited)
8. **OWNER_REP** - Owner's representative
9. **INSPECTOR** - Quality & compliance inspection
10. **VIEWER** - Read-only access

## Documents Module

### Drawings

| Permission | ADMIN | PM | PE | SUPER | FORE | A/E | SUB | OWNER | INSP | VIEW |
|------------|-------|----|----|-------|------|-----|-----|-------|------|------|
| Read | ✅ | ✅ | ✅ | 📖 | 🔍 | ✅ | 🔍 | 📖 | 📖 | 📖 |
| Create | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Update | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Approve | ✅ | ✅ | ❌ | ❌ | ❌ | 👑 | ❌ | 👑 | ❌ | ❌ |
| Version | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Export | ✅ | ✅ | ✅ | ❌ | 🔍 | ✅ | ❌ | ❌ | ❌ | ❌ |

### Specifications

| Permission | ADMIN | PM | PE | SUPER | FORE | A/E | SUB | OWNER | INSP | VIEW |
|------------|-------|----|----|-------|------|-----|-----|-------|------|------|
| Read | ✅ | ✅ | ✅ | 📖 | 🔍 | ✅ | 🔍 | 📖 | 📖 | 📖 |
| Create | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Update | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Approve | ✅ | ✅ | ❌ | ❌ | ❌ | 👑 | ❌ | 👑 | ❌ | ❌ |

### Photos

| Permission | ADMIN | PM | PE | SUPER | FORE | A/E | SUB | OWNER | INSP | VIEW |
|------------|-------|----|----|-------|------|-----|-----|-------|------|------|
| Read | ✅ | ✅ | 📖 | ✅ | 🔍 | 📖 | 🔍 | 📖 | 📖 | 📖 |
| Create | ✅ | ✅ | ❌ | ✅ | 🔍 | ❌ | 🔍 | ❌ | ✅ | ❌ |
| Update | ✅ | ✅ | ❌ | ✅ | 🔍 | ❌ | ❌ | ❌ | ❌ | ❌ |
| Export | ✅ | ✅ | ❌ | ✅ | 🔍 | ❌ | ❌ | ❌ | ✅ | ❌ |

### Reports

| Permission | ADMIN | PM | PE | SUPER | FORE | A/E | SUB | OWNER | INSP | VIEW |
|------------|-------|----|----|-------|------|-----|-----|-------|------|------|
| Read | ✅ | ✅ | 📖 | ✅ | 🔍 | 📖 | 🔍 | 📖 | 📖 | 📖 |
| Create | ✅ | ✅ | ✅ | ✅ | 🔍 | ❌ | 🔍 | ❌ | ✅ | ❌ |
| Export | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Approve | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | 👑 | ❌ | ❌ |

## RFIs (Request for Information)

| Permission | ADMIN | PM | PE | SUPER | FORE | A/E | SUB | OWNER | INSP | VIEW |
|------------|-------|----|----|-------|------|-----|-----|-------|------|------|
| Read | ✅ | ✅ | ✅ | ✅ | 🔍 | ✅ | 🔍 | 📖 | 📖 | 🔍 |
| Create | ✅ | ✅ | ✅ | ✅ | 🔍 | ✅ | 🔍 | ❌ | ❌ | ❌ |
| Update | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Respond | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Close | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

## Submittals

| Permission | ADMIN | PM | PE | SUPER | FORE | A/E | SUB | OWNER | INSP | VIEW |
|------------|-------|----|----|-------|------|-----|-----|-------|------|------|
| Read | ✅ | ✅ | ✅ | 📖 | 🔍 | ✅ | 🔍 | ✅ | 📖 | 🔍 |
| Create | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | 🔍 | ❌ | ❌ | ❌ |
| Update | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | 🔍 | ❌ | ❌ | ❌ |
| Review | ✅ | ✅ | ✅ | ❌ | ❌ | 👑 | ❌ | ❌ | ❌ | ❌ |
| Approve | ✅ | ✅ | ❌ | ❌ | ❌ | 👑 | ❌ | 👑 | ❌ | ❌ |
| Reject | ✅ | ✅ | ❌ | ❌ | ❌ | 👑 | ❌ | 👑 | ❌ | ❌ |

## Schedule

### Tasks

| Permission | ADMIN | PM | PE | SUPER | FORE | A/E | SUB | OWNER | INSP | VIEW |
|------------|-------|----|----|-------|------|-----|-----|-------|------|------|
| Read | ✅ | ✅ | 📖 | 📖 | 🔍 | 📖 | 🔍 | 📖 | 📖 | 📖 |
| Create | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Update | ✅ | ✅ | ✅ | ✅ | 🔍 | ❌ | 🔍 | ❌ | ❌ | ❌ |
| Assign | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Complete | ✅ | ✅ | ✅ | ✅ | 🔍 | ❌ | 🔍 | ❌ | ❌ | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Milestones

| Permission | ADMIN | PM | PE | SUPER | FORE | A/E | SUB | OWNER | INSP | VIEW |
|------------|-------|----|----|-------|------|-----|-----|-------|------|------|
| Read | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | 📖 |
| Create | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Approve | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | 👑 | ❌ | ❌ |

## Daily Reports

| Permission | ADMIN | PM | PE | SUPER | FORE | A/E | SUB | OWNER | INSP | VIEW |
|------------|-------|----|----|-------|------|-----|-----|-------|------|------|
| Read | ✅ | 📖 | 📖 | ✅ | 🔍 | 📖 | 🔍 | 📖 | 📖 | 🔍 |
| Create | ✅ | ❌ | ❌ | ✅ | 🔍 | ❌ | 🔍 | ❌ | ✅ | ❌ |
| Update | ✅ | ❌ | ❌ | ✅ | 🔍 | ❌ | 🔍 | ❌ | ❌ | ❌ |
| Approve | ✅ | 👑 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Export | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Weather/Labor/Equipment Logs

| Permission | ADMIN | PM | PE | SUPER | FORE | A/E | SUB | OWNER | INSP | VIEW |
|------------|-------|----|----|-------|------|-----|-----|-------|------|------|
| Read | ✅ | ✅ | 📖 | ✅ | 🔍 | ❌ | ❌ | 📖 | 📖 | ❌ |
| Create | ✅ | ❌ | ❌ | ✅ | 🔍 | ❌ | ✏️ | ❌ | ❌ | ❌ |

## Safety

### Incidents

| Permission | ADMIN | PM | PE | SUPER | FORE | A/E | SUB | OWNER | INSP | VIEW |
|------------|-------|----|----|-------|------|-----|-----|-------|------|------|
| Read | ✅ | ✅ | 📖 | ✅ | 🔍 | 📖 | 📖 | 📖 | 📖 | ❌ |
| Create | ✅ | ✅ | ✅ | ✅ | 🔍 | ❌ | ❌ | ❌ | ✅ | ❌ |
| Update | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Close | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Inspections

| Permission | ADMIN | PM | PE | SUPER | FORE | A/E | SUB | OWNER | INSP | VIEW |
|------------|-------|----|----|-------|------|-----|-----|-------|------|------|
| Read | ✅ | ✅ | 📖 | ✅ | 📖 | 📖 | 📖 | 📖 | ✅ | ❌ |
| Create | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Update | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Approve | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | 👑 | ❌ | ❌ |

### Toolbox Talks

| Permission | ADMIN | PM | PE | SUPER | FORE | A/E | SUB | OWNER | INSP | VIEW |
|------------|-------|----|----|-------|------|-----|-----|-------|------|------|
| Read | ✅ | ✅ | 📖 | ✅ | 📖 | 📖 | 📖 | 📖 | 📖 | 📖 |
| Create | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Conduct | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

## Budget

### Budget Items

| Permission | ADMIN | PM | PE | SUPER | FORE | A/E | SUB | OWNER | INSP | VIEW |
|------------|-------|----|----|-------|------|-----|-----|-------|------|------|
| Read | ✅ | ✅ | 📖 | 📖 | ❌ | ❌ | 🔍 | ✅ | ❌ | ❌ |
| Create | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Update | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Export | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Change Orders

| Permission | ADMIN | PM | PE | SUPER | FORE | A/E | SUB | OWNER | INSP | VIEW |
|------------|-------|----|----|-------|------|-----|-----|-------|------|------|
| Read | ✅ | ✅ | ❌ | 📖 | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Create | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Update | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Approve | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 👑 | ❌ | ❌ |

### Invoices

| Permission | ADMIN | PM | PE | SUPER | FORE | A/E | SUB | OWNER | INSP | VIEW |
|------------|-------|----|----|-------|------|-----|-----|-------|------|------|
| Read | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | 🔍 | ✅ | ❌ | ❌ |
| Create | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | 🔍 | ❌ | ❌ | ❌ |
| Update | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Approve | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 👑 | ❌ | ❌ |

### Payments

| Permission | ADMIN | PM | PE | SUPER | FORE | A/E | SUB | OWNER | INSP | VIEW |
|------------|-------|----|----|-------|------|-----|-----|-------|------|------|
| Read | ✅ | 📖 | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Approve | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 👑 | ❌ | ❌ |

## Quality Control

### Punch Items

| Permission | ADMIN | PM | PE | SUPER | FORE | A/E | SUB | OWNER | INSP | VIEW |
|------------|-------|----|----|-------|------|-----|-----|-------|------|------|
| Read | ✅ | ✅ | 📖 | ✅ | 🔍 | 📖 | 🔍 | 📖 | ✅ | 🔍 |
| Create | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Update | ✅ | ✅ | 🔍 | ✅ | 🔍 | ❌ | 🔍 | ❌ | ✅ | ❌ |
| Close | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |

### Test Results

| Permission | ADMIN | PM | PE | SUPER | FORE | A/E | SUB | OWNER | INSP | VIEW |
|------------|-------|----|----|-------|------|-----|-----|-------|------|------|
| Read | ✅ | ✅ | 📖 | 📖 | ❌ | 📖 | 📖 | 📖 | ✅ | ❌ |
| Create | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Update | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |

## Meetings

| Permission | ADMIN | PM | PE | SUPER | FORE | A/E | SUB | OWNER | INSP | VIEW |
|------------|-------|----|----|-------|------|-----|-----|-------|------|------|
| Read | ✅ | ✅ | 📖 | ✅ | ❌ | 📖 | ❌ | 📖 | 📖 | ❌ |
| Create | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Update | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Meeting Minutes

| Permission | ADMIN | PM | PE | SUPER | FORE | A/E | SUB | OWNER | INSP | VIEW |
|------------|-------|----|----|-------|------|-----|-----|-------|------|------|
| Read | ✅ | ✅ | 📖 | ✅ | 🔍 | 📖 | 🔍 | 📖 | 📖 | 🔍 |
| Create | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Update | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Action Items

| Permission | ADMIN | PM | PE | SUPER | FORE | A/E | SUB | OWNER | INSP | VIEW |
|------------|-------|----|----|-------|------|-----|-----|-------|------|------|
| Read | ✅ | ✅ | 📖 | ✅ | 🔍 | 📖 | 🔍 | 📖 | ❌ | ❌ |
| Create | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Update | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Complete | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |

## Project Settings

### Settings

| Permission | ADMIN | PM | PE | SUPER | FORE | A/E | SUB | OWNER | INSP | VIEW |
|------------|-------|----|----|-------|------|-----|-----|-------|------|------|
| Read | ✅ | 📖 | 📖 | 📖 | ❌ | ❌ | ❌ | 📖 | ❌ | ❌ |
| Update | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Members

| Permission | ADMIN | PM | PE | SUPER | FORE | A/E | SUB | OWNER | INSP | VIEW |
|------------|-------|----|----|-------|------|-----|-----|-------|------|------|
| Read | ✅ | 📖 | ❌ | ❌ | ❌ | ❌ | ❌ | 📖 | ❌ | ❌ |
| Invite | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Update | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Remove | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Permissions

| Permission | ADMIN | PM | PE | SUPER | FORE | A/E | SUB | OWNER | INSP | VIEW |
|------------|-------|----|----|-------|------|-----|-----|-------|------|------|
| Read | ✅ | 📖 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Update | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Integrations

| Permission | ADMIN | PM | PE | SUPER | FORE | A/E | SUB | OWNER | INSP | VIEW |
|------------|-------|----|----|-------|------|-----|-----|-------|------|------|
| Read | ✅ | 📖 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Update | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

## Scope-Limited Roles

### Foreman (FOREMAN)
- **Scope Type:** Trades, Areas, or Phases
- **Behavior:** Can only access items within assigned scope
- **Example:** Foreman assigned to "Electrical" trade can only see electrical tasks, RFIs, and reports

### Subcontractor (SUBCONTRACTOR)
- **Scope Type:** Trades, Contract Areas
- **Behavior:** Limited to their contract scope
- **Example:** HVAC subcontractor can only access HVAC-related items

## Permission String Format

All permissions follow the format: `{module}:{resource}:{action}`

### Examples:
- `documents:drawing:read`
- `documents:drawing:create`
- `documents:drawing:update`
- `documents:drawing:delete`
- `documents:drawing:approve`
- `documents:drawing:export`
- `documents:drawing:version`

### Wildcard Permissions:
- `*:*:*` - All permissions (PROJECT_ADMIN)
- `documents:*:*` - All document permissions
- `documents:drawing:*` - All drawing permissions

## Implementation Reference

**Source Code Location:**
- Permission Matrix: `src/modules/permissions/constants/role-permissions.matrix.ts`
- Project Roles: `src/modules/users/enums/project-role.enum.ts`
- Permission Constants: `src/modules/permissions/constants/permissions.constants.ts`

## Notes

1. **PROJECT_ADMIN** has `ALL_PERMISSIONS` wildcard
2. **Scope-limited roles** (Foreman, Subcontractor) have additional filtering at the data layer
3. **Owner Representative** has approval authority on major decisions but cannot modify construction data
4. **Inspector** has full quality control access but limited access to other modules
5. **Architect/Engineer** has design authority including approval rights on drawings and submittals
6. **Project Manager** has broad access but cannot modify project settings or permissions
7. **Viewer** role is read-only with minimal access, suitable for stakeholders

---

**Document Version:** 1.0
**Last Updated:** 2025-11-10
**Maintained By:** Development Team
