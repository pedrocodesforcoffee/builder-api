# Membership Management API

## Overview

The Membership Management API provides comprehensive endpoints for managing organization and project memberships with advanced features including:
- Role-based access control (RBAC)
- Scope-limited access (trades, areas, phases)
- Time-based expiration
- Role inheritance from organization to projects
- Bulk operations
- History tracking and statistics

## Authentication

All endpoints require JWT authentication via the `Authorization` header:
```
Authorization: Bearer <your-jwt-token>
```

## Organization Membership Endpoints

### Add Organization Member

Add a new member to an organization. Only owners and org admins can invite members.

**Endpoint:** `POST /organizations/:orgId/members`

**Request Body:**
```json
{
  "email": "user@example.com",
  "role": "ORG_MEMBER",
  "sendInvite": true
}
```

**Parameters:**
- `email` (string, required): Email address of the user to add
- `role` (enum, required): Organization role - `OWNER`, `ORG_ADMIN`, or `ORG_MEMBER`
- `sendInvite` (boolean, optional): Whether to send invitation email (default: true)

**Response:** `201 Created`
```json
{
  "id": "membership-uuid",
  "userId": "user-uuid",
  "organizationId": "org-uuid",
  "role": "ORG_MEMBER",
  "invitedBy": "admin-uuid",
  "invitedAt": "2025-01-15T10:00:00Z",
  "joinedAt": "2025-01-15T10:05:00Z",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

**Error Responses:**
- `404 Not Found`: Organization not found
- `403 Forbidden`: Insufficient permissions or attempting to create owner without owner role
- `409 Conflict`: User is already a member
- `400 Bad Request`: Invalid request body

**Example:**
```bash
curl -X POST https://api.example.com/organizations/org-123/members \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newmember@company.com",
    "role": "ORG_MEMBER",
    "sendInvite": true
  }'
```

---

### List Organization Members

Retrieve all members of an organization with filtering and pagination.

**Endpoint:** `GET /organizations/:orgId/members`

**Query Parameters:**
- `role` (string, optional): Filter by role (`OWNER`, `ORG_ADMIN`, `ORG_MEMBER`)
- `search` (string, optional): Search by name or email
- `status` (string, optional): Filter by status - `active`, `invited`, `inactive`
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 50, max: 100)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "membership-uuid",
      "userId": "user-uuid",
      "organizationId": "org-uuid",
      "role": "ORG_MEMBER",
      "invitedAt": "2025-01-15T10:00:00Z",
      "joinedAt": "2025-01-15T10:05:00Z",
      "user": {
        "id": "user-uuid",
        "email": "user@example.com",
        "name": "User Name",
        "isActive": true
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 125,
    "totalPages": 3
  }
}
```

**Example:**
```bash
curl "https://api.example.com/organizations/org-123/members?role=ORG_MEMBER&page=1&limit=20" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

### Update Organization Member Role

Update an organization member's role. Cannot update your own role or demote the last owner.

**Endpoint:** `PATCH /organizations/:orgId/members/:userId`

**Request Body:**
```json
{
  "role": "ORG_ADMIN"
}
```

**Response:** `200 OK`
```json
{
  "id": "membership-uuid",
  "userId": "user-uuid",
  "organizationId": "org-uuid",
  "role": "ORG_ADMIN",
  "updatedAt": "2025-01-15T11:00:00Z",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

**Error Responses:**
- `404 Not Found`: Membership not found
- `403 Forbidden`: Insufficient permissions
- `400 Bad Request`: Cannot update own role or demote last owner

---

### Remove Organization Member

Remove a member from an organization. Optionally remove from all projects.

**Endpoint:** `DELETE /organizations/:orgId/members/:userId`

**Query Parameters:**
- `removeFromProjects` (boolean, optional): Also remove from all projects (default: false)

**Response:** `204 No Content`

**Error Responses:**
- `404 Not Found`: Membership not found
- `403 Forbidden`: Insufficient permissions
- `400 Bad Request`: Cannot remove self or last owner

**Example:**
```bash
curl -X DELETE "https://api.example.com/organizations/org-123/members/user-456?removeFromProjects=true" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## Project Membership Endpoints

### Add Project Member

Add a member to a project with optional scope and expiration settings.

**Endpoint:** `POST /projects/:projectId/members`

**Request Body:**
```json
{
  "userId": "user-uuid",
  "role": "PROJECT_ENGINEER",
  "scope": {
    "tradeIds": ["trade-1", "trade-2"],
    "areaIds": ["area-1"],
    "phaseIds": []
  },
  "expiresAt": "2025-12-31T23:59:59Z",
  "expirationReason": "Temporary contractor access",
  "sendNotification": true
}
```

**Parameters:**
- `userId` (string, required): ID of user to add (must be org member)
- `role` (enum, required): Project role
- `scope` (object, optional): Scope limitations
  - `tradeIds` (array): Limit to specific trades
  - `areaIds` (array): Limit to specific areas
  - `phaseIds` (array): Limit to specific phases
- `expiresAt` (datetime, optional): Expiration date
- `expirationReason` (string, optional): Reason for expiration
- `sendNotification` (boolean, optional): Send notification (default: true)

**Available Project Roles:**
- `PROJECT_ADMIN` - Full project access
- `PROJECT_MANAGER` - Project management
- `PROJECT_ENGINEER` - Engineering tasks
- `SUPERINTENDENT` - Field supervision
- `FOREMAN` - Team leadership
- `FIELD_ENGINEER` - Field engineering
- `ESTIMATOR` - Cost estimation
- `SAFETY_OFFICER` - Safety compliance
- `QUALITY_CONTROL` - Quality assurance
- `SURVEYOR` - Site surveying
- `VIEWER` - Read-only access

**Response:** `201 Created`
```json
{
  "id": "membership-uuid",
  "userId": "user-uuid",
  "projectId": "project-uuid",
  "role": "PROJECT_ENGINEER",
  "scope": {
    "tradeIds": ["trade-1", "trade-2"],
    "areaIds": ["area-1"],
    "phaseIds": []
  },
  "expiresAt": "2025-12-31T23:59:59Z",
  "expirationReason": "Temporary contractor access",
  "expirationNotified": false,
  "addedBy": "admin-uuid",
  "addedAt": "2025-01-15T10:00:00Z",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

**Error Responses:**
- `404 Not Found`: Project or user not found
- `403 Forbidden`: Insufficient permissions
- `400 Bad Request`: User not an org member, invalid scope, or invalid expiration
- `409 Conflict`: User already has access (direct or inherited)

---

### List Project Members

Retrieve all project members with advanced filtering, including inherited members.

**Endpoint:** `GET /projects/:projectId/members`

**Query Parameters:**
- `role` (string, optional): Filter by specific role
- `roleCategory` (string, optional): Filter by category - `admin`, `field`, `office`, `specialized`, `view`
- `search` (string, optional): Search by name or email
- `scopeStatus` (string, optional): Filter by scope - `limited`, `unrestricted`
- `expirationStatus` (string, optional): Filter by expiration - `active`, `expiring`, `expired`
- `includeInherited` (boolean, optional): Include org owners/admins (default: false)
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 50, max: 100)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "membership-uuid",
      "userId": "user-uuid",
      "projectId": "project-uuid",
      "role": "PROJECT_ENGINEER",
      "scope": {
        "tradeIds": ["trade-1"],
        "areaIds": [],
        "phaseIds": []
      },
      "expiresAt": "2025-12-31T23:59:59Z",
      "expirationNotified": false,
      "user": {
        "id": "user-uuid",
        "email": "user@example.com",
        "name": "User Name"
      }
    },
    {
      "userId": "owner-uuid",
      "projectId": "project-uuid",
      "role": "PROJECT_ADMIN",
      "scope": null,
      "expiresAt": null,
      "inherited": true,
      "inheritedFrom": "organization",
      "organizationRole": "OWNER",
      "user": {
        "id": "owner-uuid",
        "email": "owner@example.com",
        "name": "Organization Owner"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 45,
    "totalPages": 1
  }
}
```

**Example:**
```bash
curl "https://api.example.com/projects/proj-123/members?roleCategory=field&expirationStatus=expiring&includeInherited=true" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

### Update Project Member

Update a project member's role, scope, or expiration. Cannot modify inherited access.

**Endpoint:** `PATCH /projects/:projectId/members/:userId`

**Request Body:**
```json
{
  "role": "SUPERINTENDENT",
  "scope": {
    "tradeIds": ["trade-1", "trade-2", "trade-3"],
    "areaIds": ["area-1"],
    "phaseIds": ["phase-1"]
  },
  "expiresAt": "2026-06-30T23:59:59Z",
  "expirationReason": "Extended contract"
}
```

**Note:** All fields are optional. Provide only the fields you want to update. Set to `null` to clear scope or expiration.

**Response:** `200 OK` (returns updated membership)

**Error Responses:**
- `404 Not Found`: Membership not found
- `403 Forbidden`: Insufficient permissions
- `400 Bad Request`: Cannot modify inherited access, invalid scope, or invalid expiration

---

### Remove Project Member

Remove a member from a project with optional reason.

**Endpoint:** `DELETE /projects/:projectId/members/:userId`

**Request Body (optional):**
```json
{
  "reason": "Contract ended",
  "notifyUser": true
}
```

**Response:** `204 No Content`

**Error Responses:**
- `404 Not Found`: Membership not found
- `403 Forbidden`: Insufficient permissions
- `400 Bad Request`: Cannot remove inherited access

---

## Bulk Operations

### Bulk Add Members

Add multiple members to a project at once (max 100).

**Endpoint:** `POST /projects/:projectId/members/bulk/add`

**Request Body:**
```json
{
  "members": [
    {
      "userId": "user-1",
      "role": "FIELD_ENGINEER",
      "scope": null,
      "expiresAt": null
    },
    {
      "userId": "user-2",
      "role": "FOREMAN",
      "scope": { "tradeIds": ["trade-1"] },
      "expiresAt": "2025-12-31T23:59:59Z"
    }
  ]
}
```

**Response:** `200 OK`
```json
{
  "success": [
    {
      "id": "membership-1",
      "userId": "user-1",
      "role": "FIELD_ENGINEER"
    }
  ],
  "failed": [
    {
      "data": {
        "userId": "user-2",
        "role": "FOREMAN"
      },
      "error": "User already a member"
    }
  ],
  "summary": {
    "total": 2,
    "succeeded": 1,
    "failed": 1
  }
}
```

---

### Bulk Update Members

Update multiple members at once (max 100).

**Endpoint:** `PATCH /projects/:projectId/members/bulk/update`

**Request Body:**
```json
{
  "updates": [
    {
      "userId": "user-1",
      "role": "SUPERINTENDENT"
    },
    {
      "userId": "user-2",
      "expiresAt": "2026-01-31T23:59:59Z"
    }
  ]
}
```

**Response:** Same format as bulk add

---

### Bulk Remove Members

Remove multiple members at once (max 100).

**Endpoint:** `DELETE /projects/:projectId/members/bulk/remove`

**Request Body:**
```json
{
  "userIds": ["user-1", "user-2", "user-3"],
  "reason": "Project phase completed"
}
```

**Response:** Same format as bulk add

---

## History and Statistics

### Get Member History

Retrieve role change history for a specific member.

**Endpoint:** `GET /projects/:projectId/members/:userId/history`

**Response:** `200 OK`
```json
{
  "userId": "user-uuid",
  "userName": "User Name",
  "userEmail": "user@example.com",
  "changes": [
    {
      "timestamp": "2025-01-15T10:00:00Z",
      "field": "membership",
      "oldValue": null,
      "newValue": "added",
      "changedBy": "admin-uuid"
    },
    {
      "timestamp": "2025-02-01T14:30:00Z",
      "field": "membership",
      "oldValue": "previous_state",
      "newValue": "updated",
      "changedBy": "admin-uuid"
    }
  ]
}
```

---

### Get Project Statistics

Retrieve comprehensive membership statistics for a project.

**Endpoint:** `GET /projects/:projectId/members/statistics`

**Response:** `200 OK`
```json
{
  "totalMembers": 45,
  "membersByRole": {
    "PROJECT_ADMIN": 3,
    "PROJECT_ENGINEER": 8,
    "SUPERINTENDENT": 5,
    "FOREMAN": 12,
    "FIELD_ENGINEER": 10,
    "VIEWER": 7
  },
  "membersByRoleCategory": {
    "admin": 3,
    "field": 27,
    "office": 8,
    "specialized": 0,
    "view": 7
  },
  "scopeStatistics": {
    "limited": 18,
    "unrestricted": 27
  },
  "expirationStatistics": {
    "active": 42,
    "expiring": 5,
    "expired": 3
  }
}
```

---

### Get Pending Renewals

Retrieve members whose access is expiring soon.

**Endpoint:** `GET /projects/:projectId/members/pending-renewals`

**Query Parameters:**
- `daysAhead` (number, optional): Days to look ahead (default: 30)

**Response:** `200 OK`
```json
[
  {
    "userId": "user-uuid",
    "userName": "User Name",
    "userEmail": "user@example.com",
    "role": "PROJECT_ENGINEER",
    "expiresAt": "2025-02-15T23:59:59Z",
    "daysRemaining": 12,
    "expirationReason": "Temporary contractor",
    "expirationNotified": false
  }
]
```

---

## Error Handling

All endpoints use standard HTTP status codes and return errors in the following format:

```json
{
  "statusCode": 400,
  "message": "Detailed error message",
  "error": "Bad Request"
}
```

**Common Status Codes:**
- `200 OK` - Success
- `201 Created` - Resource created
- `204 No Content` - Success with no body
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing or invalid auth
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict
- `500 Internal Server Error` - Server error

---

## Best Practices

1. **Permission Checks**: All operations validate permissions using RBAC
2. **Inherited Access**: Org owners/admins automatically get PROJECT_ADMIN on all projects
3. **Scope Validation**: Scopes are validated for role compatibility
4. **Expiration**: Set appropriate expiration dates for temporary access
5. **Bulk Operations**: Use for efficiency when managing multiple members
6. **Pagination**: Always use pagination for list endpoints
7. **Error Handling**: Check error responses and handle appropriately
8. **Cache**: Permission caches are automatically cleared on membership changes

---

## Rate Limiting

API requests are subject to rate limiting:
- Standard endpoints: 100 requests/minute
- Bulk operations: 10 requests/minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1643723400
```
