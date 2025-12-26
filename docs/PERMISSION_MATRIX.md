# Permission Matrix - Complete Reference Guide

**Version:** 1.0.0
**Last Updated:** 2025-11-09
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Permission String Format](#permission-string-format)
3. [Role Hierarchy](#role-hierarchy)
4. [Complete Permission Matrix](#complete-permission-matrix)
   - [Documents](#documents)
   - [RFIs](#rfis)
   - [Submittals](#submittals)
   - [Schedule](#schedule)
   - [Daily Reports](#daily-reports)
   - [Safety](#safety)
   - [Budget & Cost](#budget--cost)
   - [Quality Control](#quality-control)
   - [Meetings](#meetings)
   - [Project Settings](#project-settings)
5. [Organization Role Inheritance](#organization-role-inheritance)
6. [Scope-Based Access Control](#scope-based-access-control)
7. [Usage Examples](#usage-examples)
8. [Best Practices](#best-practices)

---

## Overview

This document provides the complete permission matrix for the Builder API multi-level RBAC system. It defines exactly what each of the 10 project roles can do across all features in the construction project management system.

**Key Features:**
- ✅ 10 distinct project roles
- ✅ 190+ specific permissions
- ✅ Wildcard support for flexible matching
- ✅ Scope-based filtering for FOREMAN and SUBCONTRACTOR
- ✅ Organization role inheritance
- ✅ Time-based expiration support

---

## Permission String Format

**Format:** `feature:resource:action`

**Examples:**
```
documents:drawing:create    - Create drawings
rfis:rfi:respond           - Respond to RFIs
submittals:submittal:approve - Approve submittals
```

**Wildcard Support:**
```
*:*:*                      - All permissions (superuser)
documents:*:*              - All document permissions
documents:drawing:*        - All operations on drawings
documents:*:read           - Read all document types
```

---

## Role Hierarchy

### Project Roles (Ranked by Authority)

1. **PROJECT_ADMIN** - Full project access
2. **PROJECT_MANAGER** - Management without settings
3. **PROJECT_ENGINEER** - Technical focus
4. **SUPERINTENDENT** - Field operations
5. **ARCHITECT_ENGINEER** - Design & review
6. **FOREMAN** - Work area limited (scope-filtered)
7. **SUBCONTRACTOR** - Trade-specific (scope-filtered)
8. **OWNER_REP** - Owner representative
9. **INSPECTOR** - Compliance & reporting
10. **VIEWER** - Read-only observer

### Organization Roles (Inheritance)

- **OWNER** → Inherits PROJECT_ADMIN
- **ORG_ADMIN** → Inherits PROJECT_ADMIN
- **ORG_MEMBER** → No automatic access
- **GUEST** → No automatic access

---

## Complete Permission Matrix

### Legend

- ✅ Full Access
- 📖 Read Only
- ⚡ Limited Access
- 🔒 Scope-Limited (FOREMAN/SUBCONTRACTOR only)
- ❌ No Access
- 📝 Notes column provides additional context

---

## Documents

Management of drawings, specifications, photos, models, and reports.

| Permission | P_ADMIN | P_MANAGER | P_ENGINEER | SUPERINTENDENT | FOREMAN | ARCHITECT_ENG | SUBCONTRACTOR | OWNER_REP | INSPECTOR | VIEWER | Notes |
|------------|---------|-----------|------------|----------------|---------|---------------|---------------|-----------|-----------|--------|-------|
| **Drawings** |
| Create | ✅ | ✅ | ✅ | ⚡ | 🔒 | ✅ | 🔒 | ❌ | ❌ | ❌ | Superintendent: read only |
| Read | ✅ | ✅ | ✅ | ✅ | 🔒 | ✅ | 🔒 | ✅ | ✅ | ✅ | All roles can read |
| Update | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | Design roles only |
| Delete | ✅ | ⚡ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Manager: cannot delete approved |
| Approve | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | Design authority required |
| Export | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | 🔒 | ✅ | ✅ | ❌ | |
| Version | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | Track revisions |
| **Specifications** |
| Create | ✅ | ✅ | ✅ | ⚡ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | Superintendent: read only |
| Read | ✅ | ✅ | ✅ | ✅ | 🔒 | ✅ | 🔒 | ✅ | ✅ | ✅ | |
| Update | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | |
| Delete | ✅ | ⚡ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | |
| Approve | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | |
| Export | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | |
| Version | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | |
| **Photos** |
| Create | ✅ | ✅ | ❌ | ✅ | 🔒 | ❌ | 🔒 | ❌ | ✅ | ❌ | Field documentation |
| Read | ✅ | ✅ | ✅ | ✅ | 🔒 | ✅ | 🔒 | ✅ | ✅ | ✅ | |
| Update | ✅ | ✅ | ❌ | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | Metadata only |
| Delete | ✅ | ⚡ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | |
| Export | ✅ | ✅ | ✅ | ✅ | 🔒 | ❌ | 🔒 | ✅ | ✅ | ❌ | |
| **Models** |
| Create | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | BIM models |
| Read | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | |
| Update | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | |
| Delete | ✅ | ⚡ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | |
| Export | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | |
| Version | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | |
| **Reports** |
| Create | ✅ | ✅ | ✅ | ✅ | 🔒 | ❌ | 🔒 | ❌ | ✅ | ❌ | Inspection/progress reports |
| Read | ✅ | ✅ | ✅ | ✅ | 🔒 | ✅ | 🔒 | ✅ | ✅ | ✅ | |
| Update | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | 🔒 | ❌ | ❌ | ❌ | |
| Delete | ✅ | ⚡ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | |
| Export | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | |

---

## RFIs

Requests for Information management.

| Permission | P_ADMIN | P_MANAGER | P_ENGINEER | SUPERINTENDENT | FOREMAN | ARCHITECT_ENG | SUBCONTRACTOR | OWNER_REP | INSPECTOR | VIEWER | Notes |
|------------|---------|-----------|------------|----------------|---------|---------------|---------------|-----------|-----------|--------|-------|
| Create | ✅ | ✅ | ✅ | ✅ | 🔒 | ✅ | 🔒 | ❌ | ❌ | ❌ | Anyone can raise questions |
| Read | ✅ | ✅ | ✅ | ✅ | 🔒 | ✅ | 🔒 | ✅ | ✅ | ✅ | |
| Update | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | Update own RFIs |
| Delete | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Admin only |
| Assign | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Route to responsible party |
| Respond | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | Provide answer/clarification |
| Approve | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Approve response |
| Close | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Mark as resolved |

---

## Submittals

Submittal package management and approval workflow.

| Permission | P_ADMIN | P_MANAGER | P_ENGINEER | SUPERINTENDENT | FOREMAN | ARCHITECT_ENG | SUBCONTRACTOR | OWNER_REP | INSPECTOR | VIEWER | Notes |
|------------|---------|-----------|------------|----------------|---------|---------------|---------------|-----------|-----------|--------|-------|
| Create | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | 🔒 | ❌ | ❌ | ❌ | Subcontractors submit |
| Read | ✅ | ✅ | ✅ | ✅ | 🔒 | ✅ | 🔒 | ✅ | ✅ | ✅ | |
| Update | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | 🔒 | ❌ | ❌ | ❌ | Update before approval |
| Delete | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Admin only |
| Review | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | Technical review |
| Approve | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | Final authority |
| Reject | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | Send back for revision |
| Require Resubmit | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | Request resubmission |

---

## Schedule

Task and milestone management.

| Permission | P_ADMIN | P_MANAGER | P_ENGINEER | SUPERINTENDENT | FOREMAN | ARCHITECT_ENG | SUBCONTRACTOR | OWNER_REP | INSPECTOR | VIEWER | Notes |
|------------|---------|-----------|------------|----------------|---------|---------------|---------------|-----------|-----------|--------|-------|
| **Tasks** |
| Create | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Field creates tasks |
| Read | ✅ | ✅ | ✅ | ✅ | 🔒 | ✅ | 🔒 | ✅ | ✅ | ✅ | |
| Update | ✅ | ✅ | ✅ | ✅ | 🔒 | ❌ | 🔒 | ❌ | ❌ | ❌ | Update assigned tasks |
| Delete | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | |
| Assign | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Assign to crew/sub |
| Complete | ✅ | ✅ | ✅ | ✅ | 🔒 | ❌ | 🔒 | ❌ | ❌ | ❌ | Mark as done |
| **Milestones** |
| Create | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Major milestones |
| Read | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | |
| Update | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | |
| Delete | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | |
| Approve | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | Owner approval for payment |
| **Dependencies** |
| Create | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Task relationships |
| Read | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | |
| Update | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | |
| Delete | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | |

---

## Daily Reports

Daily construction logs, weather, labor, and equipment tracking.

| Permission | P_ADMIN | P_MANAGER | P_ENGINEER | SUPERINTENDENT | FOREMAN | ARCHITECT_ENG | SUBCONTRACTOR | OWNER_REP | INSPECTOR | VIEWER | Notes |
|------------|---------|-----------|------------|----------------|---------|---------------|---------------|-----------|-----------|--------|-------|
| **Daily Report** |
| Create | ✅ | ❌ | ❌ | ✅ | 🔒 | ❌ | 🔒 | ❌ | ✅ | ❌ | Field creates reports |
| Read | ✅ | ✅ | ✅ | ✅ | 🔒 | ⚡ | 🔒 | ✅ | ✅ | ✅ | Architect: limited |
| Update | ✅ | ❌ | ❌ | ✅ | 🔒 | ❌ | 🔒 | ❌ | ✅ | ❌ | Update own reports |
| Delete | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Admin only |
| Approve | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Verify and approve |
| Export | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | Generate reports |
| **Weather** |
| Create | ✅ | ❌ | ❌ | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | Daily weather conditions |
| Read | ✅ | ✅ | ✅ | ✅ | 🔒 | ❌ | 🔒 | ✅ | ✅ | ❌ | |
| Update | ✅ | ❌ | ❌ | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | |
| **Labor** |
| Create | ✅ | ❌ | ❌ | ✅ | 🔒 | ❌ | 🔒 | ❌ | ❌ | ❌ | Crew tracking |
| Read | ✅ | ✅ | ✅ | ✅ | 🔒 | ❌ | 🔒 | ✅ | ❌ | ❌ | |
| Update | ✅ | ❌ | ❌ | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | |
| **Equipment** |
| Create | ✅ | ❌ | ❌ | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | Equipment usage |
| Read | ✅ | ✅ | ✅ | ✅ | 🔒 | ❌ | ❌ | ✅ | ❌ | ❌ | |
| Update | ✅ | ❌ | ❌ | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | |

---

## Safety

Safety incidents, inspections, meetings, and toolbox talks.

| Permission | P_ADMIN | P_MANAGER | P_ENGINEER | SUPERINTENDENT | FOREMAN | ARCHITECT_ENG | SUBCONTRACTOR | OWNER_REP | INSPECTOR | VIEWER | Notes |
|------------|---------|-----------|------------|----------------|---------|---------------|---------------|-----------|-----------|--------|-------|
| **Incidents** |
| Create | ✅ | ✅ | ✅ | ✅ | 🔒 | ❌ | ❌ | ❌ | ✅ | ❌ | Report incidents |
| Read | ✅ | ✅ | ✅ | ✅ | 🔒 | ✅ | 🔒 | ✅ | ✅ | ⚡ | Viewer: summary only |
| Update | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | Update investigation |
| Delete | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | |
| Investigate | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Conduct investigation |
| Close | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Mark as resolved |
| **Inspections** |
| Create | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | Safety inspections |
| Read | ✅ | ✅ | ✅ | ✅ | 🔒 | ✅ | 🔒 | ✅ | ✅ | ❌ | |
| Update | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | |
| Delete | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | |
| **Meetings** |
| Create | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Safety meetings |
| Read | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | |
| Update | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | |
| **Toolbox Talks** |
| Create | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Daily safety briefings |
| Read | ✅ | ✅ | ✅ | ✅ | 🔒 | ✅ | 🔒 | ✅ | ✅ | ✅ | Everyone should read |
| Update | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | |

---

## Budget & Cost

Budget items, change orders, invoices, and payments.

| Permission | P_ADMIN | P_MANAGER | P_ENGINEER | SUPERINTENDENT | FOREMAN | ARCHITECT_ENG | SUBCONTRACTOR | OWNER_REP | INSPECTOR | VIEWER | Notes |
|------------|---------|-----------|------------|----------------|---------|---------------|---------------|-----------|-----------|--------|-------|
| **Budget Items** |
| Read | ✅ | ✅ | ✅ | ⚡ | ❌ | ❌ | 🔒 | ✅ | ❌ | ❌ | Super: high-level only |
| Create | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | |
| Update | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | |
| Export | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | |
| **Change Orders** |
| Read | ✅ | ✅ | ❌ | ⚡ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | |
| Create | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | |
| Update | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | |
| Approve | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | Owner approval required |
| **Invoices** |
| Read | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | 🔒 | ✅ | ❌ | ❌ | Sub: own invoices |
| Create | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | 🔒 | ❌ | ❌ | ❌ | |
| Update | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | |
| Approve | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | Owner approval |
| **Payments** |
| Read | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | |
| Approve | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | Owner authorization |

---

## Quality Control

Inspections, punch lists, and test results.

| Permission | P_ADMIN | P_MANAGER | P_ENGINEER | SUPERINTENDENT | FOREMAN | ARCHITECT_ENG | SUBCONTRACTOR | OWNER_REP | INSPECTOR | VIEWER | Notes |
|------------|---------|-----------|------------|----------------|---------|---------------|---------------|-----------|-----------|--------|-------|
| **Inspections** |
| Create | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | Create inspection |
| Read | ✅ | ✅ | ✅ | ✅ | 🔒 | ✅ | 🔒 | ✅ | ✅ | ✅ | |
| Update | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | Update findings |
| Delete | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | |
| Approve | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | Final approval |
| **Punch Items** |
| Create | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Create punch list item |
| Read | ✅ | ✅ | ✅ | ✅ | 🔒 | ✅ | 🔒 | ✅ | ✅ | ✅ | |
| Update | ✅ | ✅ | ❌ | ✅ | 🔒 | ❌ | 🔒 | ❌ | ❌ | ❌ | Resolve items |
| Delete | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | |
| **Test Results** |
| Create | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | Record test results |
| Read | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | 🔒 | ✅ | ✅ | ❌ | |
| Update | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | |
| Pass | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | Mark as passed |
| Fail | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | Mark as failed |

---

## Meetings

Meeting management, minutes, and action items.

| Permission | P_ADMIN | P_MANAGER | P_ENGINEER | SUPERINTENDENT | FOREMAN | ARCHITECT_ENG | SUBCONTRACTOR | OWNER_REP | INSPECTOR | VIEWER | Notes |
|------------|---------|-----------|------------|----------------|---------|---------------|---------------|-----------|-----------|--------|-------|
| **Meetings** |
| Create | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Schedule meeting |
| Read | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | |
| Update | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Update details |
| Delete | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | |
| Schedule | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Set date/time |
| Cancel | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Cancel meeting |
| **Minutes** |
| Create | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Record minutes |
| Read | ✅ | ✅ | ✅ | ✅ | 🔒 | ✅ | 🔒 | ✅ | ✅ | ✅ | |
| Update | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Edit minutes |
| **Action Items** |
| Create | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | Create action item |
| Read | ✅ | ✅ | ✅ | ✅ | 🔒 | ✅ | 🔒 | ✅ | ❌ | ❌ | |
| Update | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | Update status |

---

## Project Settings

Project configuration, member management, and permissions.

| Permission | P_ADMIN | P_MANAGER | P_ENGINEER | SUPERINTENDENT | FOREMAN | ARCHITECT_ENG | SUBCONTRACTOR | OWNER_REP | INSPECTOR | VIEWER | Notes |
|------------|---------|-----------|------------|----------------|---------|---------------|---------------|-----------|-----------|--------|-------|
| **Settings** |
| Read | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | View project settings |
| Update | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Admin only |
| Configure | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Advanced configuration |
| **Members** |
| Read | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | View team members |
| Invite | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Invite new members |
| Remove | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Remove members |
| Update | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Update member details |
| **Permissions** |
| Read | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | View permissions |
| Update | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Change roles/permissions |
| **Integrations** |
| Read | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | View integrations |
| Configure | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Setup integrations |

---

## Organization Role Inheritance

Organization roles automatically grant project permissions:

| Organization Role | Auto Project Role | Permissions | Notes |
|-------------------|-------------------|-------------|-------|
| **OWNER** | PROJECT_ADMIN | All permissions (`*:*:*`) | Full access to all org projects |
| **ORG_ADMIN** | PROJECT_ADMIN | All permissions (`*:*:*`) | Full access to all org projects |
| **ORG_MEMBER** | None | No automatic access | Must be added to projects explicitly |
| **GUEST** | None | No automatic access | Must be added to projects explicitly |

**Key Points:**
- Organization OWNER and ORG_ADMIN automatically become PROJECT_ADMIN on all organization projects
- No explicit project membership needed for these roles
- ORG_MEMBER and GUEST must be explicitly added as project members to gain access
- Direct project membership overrides organization inheritance

---

## Scope-Based Access Control

### Roles with Scope Limitations

Two roles have scope-based filtering:

1. **FOREMAN** - Limited to assigned work areas
2. **SUBCONTRACTOR** - Limited to assigned trades/areas

### Scope Formats

**Array Format (Simple):**
```json
["electrical", "plumbing", "hvac"]
```

**Object Format (Complex):**
```json
{
  "trades": ["electrical", "plumbing"],
  "floors": ["1", "2", "3", "basement"],
  "areas": ["north-wing", "south-wing"],
  "buildings": ["building-a"]
}
```

### Scope Matching Rules

1. **Empty user scope = NO ACCESS** to anything
2. **Empty resource scope = NO ACCESS** (explicit tagging required)
3. **Any match = ACCESS GRANTED** (if user scope overlaps with resource scope)
4. **Matching is case-sensitive**

**Examples:**

```typescript
// FOREMAN with scope: ["electrical", "lighting"]

// Document with scope: ["electrical", "floor-3"]
// Result: ✅ ALLOWED (electrical matches)

// Document with scope: ["plumbing", "floor-3"]
// Result: ❌ DENIED (no match)

// Document with no scope: []
// Result: ❌ DENIED (explicit tagging required)
```

### Non-Scope-Limited Roles

All other roles (PROJECT_ADMIN, PROJECT_MANAGER, etc.) have **full access** regardless of resource scope:

- PROJECT_ADMIN
- PROJECT_MANAGER
- PROJECT_ENGINEER
- SUPERINTENDENT
- ARCHITECT_ENGINEER
- OWNER_REP
- INSPECTOR
- VIEWER

---

## Usage Examples

### Example 1: Check Single Permission

```typescript
import { PermissionService, Permissions } from '@modules/permissions';

// Check if user can create drawings
const canCreate = await permissionService.hasPermission(
  userId,
  projectId,
  Permissions.DRAWING_CREATE
);

if (!canCreate) {
  throw new ForbiddenException('You cannot create drawings');
}

// Proceed with operation...
```

### Example 2: Bulk Permission Check for UI

```typescript
// Get multiple permissions at once for UI buttons
const permissions = await permissionService.getUserPermissionMap(
  userId,
  projectId,
  [
    Permissions.DRAWING_CREATE,
    Permissions.DRAWING_UPDATE,
    Permissions.DRAWING_DELETE,
    Permissions.DRAWING_APPROVE,
    Permissions.RFI_CREATE,
    Permissions.RFI_RESPOND,
  ]
);

// Use in frontend to show/hide buttons
// permissions = {
//   'documents:drawing:create': true,
//   'documents:drawing:update': true,
//   'documents:drawing:delete': false,
//   'documents:drawing:approve': false,
//   'rfis:rfi:create': true,
//   'rfis:rfi:respond': true
// }
```

### Example 3: Check with Scope Filtering

```typescript
// For FOREMAN or SUBCONTRACTOR roles
const hasAccess = await permissionService.checkScopeAccess(
  userId,
  projectId,
  documentId,
  ['electrical', 'lighting'] // document's scope tags
);

if (!hasAccess) {
  throw new ForbiddenException(
    'This document is outside your assigned scope'
  );
}
```

### Example 4: Check Multiple Permissions (OR logic)

```typescript
// User needs ANY of these permissions
const canManage = await permissionService.hasAnyPermission(
  userId,
  projectId,
  [
    Permissions.PROJECT_ADMIN,
    Permissions.MEMBERS_INVITE,
    Permissions.MEMBERS_REMOVE,
  ]
);

if (canManage) {
  // Show admin panel
}
```

### Example 5: Check Multiple Permissions (AND logic)

```typescript
// User needs ALL of these permissions
const canApprove = await permissionService.hasAllPermissions(
  userId,
  projectId,
  [
    Permissions.SUBMITTAL_READ,
    Permissions.SUBMITTAL_REVIEW,
    Permissions.SUBMITTAL_APPROVE,
  ]
);

if (canApprove) {
  // Show approve button
}
```

### Example 6: Get Effective Role

```typescript
// Check what role user has (considering inheritance)
const role = await permissionService.getEffectiveRole(userId, projectId);

if (role === ProjectRole.PROJECT_ADMIN) {
  // User is admin (either directly or through org role)
  console.log('User has admin access');
} else if (role === ProjectRole.VIEWER) {
  // User has read-only access
  console.log('User has viewer access');
} else if (!role) {
  // User is not a member
  throw new ForbiddenException('You are not a member of this project');
}
```

---

## Best Practices

### 1. Always Check Permissions at the API Layer

```typescript
@Controller('documents')
export class DocumentsController {
  @Post()
  async create(@User() user, @Body() dto: CreateDocumentDto) {
    // Check permission first
    const canCreate = await this.permissionService.hasPermission(
      user.id,
      dto.projectId,
      Permissions.DRAWING_CREATE
    );

    if (!canCreate) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Proceed with creation...
  }
}
```

### 2. Use Bulk Checks for UI Performance

```typescript
// Bad: Multiple individual checks
const canCreate = await permissionService.hasPermission(..., 'documents:drawing:create');
const canUpdate = await permissionService.hasPermission(..., 'documents:drawing:update');
const canDelete = await permissionService.hasPermission(..., 'documents:drawing:delete');

// Good: Single bulk check
const permissions = await permissionService.getUserPermissionMap(..., [
  'documents:drawing:create',
  'documents:drawing:update',
  'documents:drawing:delete'
]);
```

### 3. Clear Cache on Role Changes

```typescript
// When changing user's role
await projectMemberRepo.update(
  { userId, projectId },
  { role: newRole }
);

// Clear permission cache immediately
await permissionService.clearPermissionCache(userId, projectId);
```

### 4. Handle Scope for Scope-Limited Roles

```typescript
// Always check scope for documents/resources
if (isScopeLimitedRole(userRole)) {
  const hasAccess = await permissionService.checkScopeAccess(
    userId,
    projectId,
    resourceId,
    resource.scope
  );

  if (!hasAccess) {
    throw new ForbiddenException('Resource outside your scope');
  }
}
```

### 5. Use Specific Permissions Over Broad Checks

```typescript
// Bad: Checking role directly
if (userRole === ProjectRole.PROJECT_ADMIN) {
  // Do something
}

// Good: Checking specific permission
if (await permissionService.hasPermission(userId, projectId, Permissions.DRAWING_DELETE)) {
  // Do something
}
```

### 6. Handle Expiration Gracefully

```typescript
const result = await permissionService.checkPermission(
  userId,
  projectId,
  permission
);

if (!result.allowed) {
  if (result.reason === PermissionDenialReason.ACCESS_EXPIRED) {
    throw new UnauthorizedException(
      `Your access expired on ${result.expiredAt?.toLocaleDateString()}`
    );
  }

  throw new ForbiddenException(result.message);
}
```

### 7. Document Permission Requirements

```typescript
/**
 * Create a new RFI
 *
 * @requires documents:rfi:create permission
 * @scope Filtered for FOREMAN and SUBCONTRACTOR roles
 */
@Post('rfis')
async createRFI(@User() user, @Body() dto: CreateRFIDto) {
  // Implementation...
}
```

---

## Appendix: Quick Reference

### All Permission Constants

Import from: `@modules/permissions/constants/permissions.constants`

**Document Permissions:**
- `Permissions.DRAWING_CREATE`, `DRAWING_READ`, `DRAWING_UPDATE`, `DRAWING_DELETE`, `DRAWING_APPROVE`, `DRAWING_EXPORT`, `DRAWING_VERSION`
- `Permissions.SPECIFICATION_CREATE`, `SPECIFICATION_READ`, etc.
- `Permissions.PHOTO_CREATE`, `PHOTO_READ`, etc.
- `Permissions.MODEL_CREATE`, `MODEL_READ`, etc.
- `Permissions.REPORT_CREATE`, `REPORT_READ`, etc.

**RFI Permissions:**
- `Permissions.RFI_CREATE`, `RFI_READ`, `RFI_UPDATE`, `RFI_DELETE`, `RFI_ASSIGN`, `RFI_RESPOND`, `RFI_APPROVE`, `RFI_CLOSE`

**Submittal Permissions:**
- `Permissions.SUBMITTAL_CREATE`, `SUBMITTAL_READ`, `SUBMITTAL_UPDATE`, `SUBMITTAL_DELETE`, `SUBMITTAL_REVIEW`, `SUBMITTAL_APPROVE`, `SUBMITTAL_REJECT`, `SUBMITTAL_REQUIRE_RESUBMIT`

**Schedule Permissions:**
- `Permissions.TASK_CREATE`, `TASK_READ`, `TASK_UPDATE`, `TASK_DELETE`, `TASK_ASSIGN`, `TASK_COMPLETE`
- `Permissions.MILESTONE_CREATE`, `MILESTONE_READ`, `MILESTONE_UPDATE`, `MILESTONE_DELETE`, `MILESTONE_APPROVE`
- `Permissions.DEPENDENCY_CREATE`, `DEPENDENCY_READ`, `DEPENDENCY_UPDATE`, `DEPENDENCY_DELETE`

**Daily Report Permissions:**
- `Permissions.DAILY_REPORT_CREATE`, `DAILY_REPORT_READ`, `DAILY_REPORT_UPDATE`, `DAILY_REPORT_DELETE`, `DAILY_REPORT_APPROVE`, `DAILY_REPORT_EXPORT`
- `Permissions.WEATHER_CREATE`, `WEATHER_READ`, `WEATHER_UPDATE`
- `Permissions.LABOR_CREATE`, `LABOR_READ`, `LABOR_UPDATE`
- `Permissions.EQUIPMENT_CREATE`, `EQUIPMENT_READ`, `EQUIPMENT_UPDATE`

**Safety Permissions:**
- `Permissions.INCIDENT_CREATE`, `INCIDENT_READ`, `INCIDENT_UPDATE`, `INCIDENT_DELETE`, `INCIDENT_INVESTIGATE`, `INCIDENT_CLOSE`
- `Permissions.INSPECTION_CREATE`, `INSPECTION_READ`, `INSPECTION_UPDATE`, `INSPECTION_DELETE`
- `Permissions.MEETING_CREATE`, `MEETING_READ`, `MEETING_UPDATE`
- `Permissions.TOOLBOX_TALK_CREATE`, `TOOLBOX_TALK_READ`, `TOOLBOX_TALK_UPDATE`

**Budget Permissions:**
- `Permissions.BUDGET_ITEM_READ`, `BUDGET_ITEM_CREATE`, `BUDGET_ITEM_UPDATE`, `BUDGET_ITEM_EXPORT`
- `Permissions.CHANGE_ORDER_READ`, `CHANGE_ORDER_CREATE`, `CHANGE_ORDER_UPDATE`, `CHANGE_ORDER_APPROVE`
- `Permissions.INVOICE_READ`, `INVOICE_CREATE`, `INVOICE_UPDATE`, `INVOICE_APPROVE`
- `Permissions.PAYMENT_READ`, `PAYMENT_APPROVE`

**Quality Permissions:**
- `Permissions.INSPECTION_CREATE`, `INSPECTION_READ`, `INSPECTION_UPDATE`, `INSPECTION_DELETE`, `INSPECTION_APPROVE`
- `Permissions.PUNCH_ITEM_CREATE`, `PUNCH_ITEM_READ`, `PUNCH_ITEM_UPDATE`, `PUNCH_ITEM_DELETE`
- `Permissions.TEST_RESULT_CREATE`, `TEST_RESULT_READ`, `TEST_RESULT_UPDATE`, `TEST_RESULT_PASS`, `TEST_RESULT_FAIL`

**Meeting Permissions:**
- `Permissions.MEETING_CREATE`, `MEETING_READ`, `MEETING_UPDATE`, `MEETING_DELETE`, `MEETING_SCHEDULE`, `MEETING_CANCEL`
- `Permissions.MINUTES_CREATE`, `MINUTES_READ`, `MINUTES_UPDATE`
- `Permissions.ACTION_ITEM_CREATE`, `ACTION_ITEM_READ`, `ACTION_ITEM_UPDATE`

**Project Settings Permissions:**
- `Permissions.SETTINGS_READ`, `SETTINGS_UPDATE`, `SETTINGS_CONFIGURE`
- `Permissions.MEMBERS_READ`, `MEMBERS_INVITE`, `MEMBERS_REMOVE`, `MEMBERS_UPDATE`
- `Permissions.PERMISSIONS_READ`, `PERMISSIONS_UPDATE`
- `Permissions.INTEGRATIONS_READ`, `INTEGRATIONS_CONFIGURE`

---

**End of Permission Matrix Documentation**

This document provides the complete reference for all permissions in the Builder API. For implementation details, see the source code in `src/modules/permissions/`.

**Questions?** Contact the development team or refer to the implementation summary at `docs/PERMISSION_MATRIX_IMPLEMENTATION_SUMMARY.md`.
