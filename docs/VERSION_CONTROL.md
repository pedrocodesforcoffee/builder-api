# Document Version Control System

Complete documentation for the document version control system with checkout/checkin workflow, version comparison, and distribution tracking.

## Table of Contents

- [Overview](#overview)
- [Key Concepts](#key-concepts)
- [API Endpoints](#api-endpoints)
- [Workflows](#workflows)
- [Data Models](#data-models)
- [Security Considerations](#security-considerations)
- [Best Practices](#best-practices)

---

## Overview

The Version Control System provides enterprise-grade document management with pessimistic locking, automatic versioning, and complete audit trails. It's designed for construction projects where document control and compliance are critical.

### Features

- **Checkout/Checkin Workflow**: Pessimistic locking prevents concurrent edits
- **Automatic Versioning**: Semantic versioning (major.minor.patch)
- **Version Comparison**: Diff any two versions
- **Version Restoration**: Non-destructive rollback
- **Distribution Tracking**: Full audit trail for compliance
- **Lock Management**: Auto-expiration, force unlock, extension
- **Audit Trail**: Every operation logged with user, timestamp, IP

---

## Key Concepts

### Pessimistic Locking

Documents must be "checked out" (locked) before editing. Only the lock holder can make changes. Locks automatically expire to prevent indefinite holds.

### Version Numbering

- **Sequential Numbers**: 1, 2, 3, ... (internal tracking)
- **Semantic Labels**: "1.0", "1.1", "2.0" (user-facing)
- **Version Types**: MAJOR, MINOR, PATCH

### Lock Lifecycle

1. **Checkout**: User locks document (default 30 minutes)
2. **Active**: User edits document
3. **Checkin**: User saves and creates new version
4. **Expired**: Auto-unlock after timeout

---

## API Endpoints

Base path: `/api/projects/:projectId/documents`

### 1. Checkout Document (Lock)

Locks a document for exclusive editing.

**Endpoint**: `POST /:documentId/checkout`

**Request Body**:
```json
{
  "comment": "Working on room dimensions",
  "lockDurationMinutes": 60
}
```

**Response** (200):
```json
{
  "success": true,
  "documentId": "123e4567-e89b-12d3-a456-426614174000",
  "lockExpiresAt": "2024-01-15T16:30:00Z",
  "message": "Document checked out successfully"
}
```

**Error Responses**:
- `404`: Document not found
- `409`: Document already locked by another user

---

### 2. Checkin Document (Unlock + Version)

Unlocks document and creates a new version.

**Endpoint**: `POST /:documentId/checkin`

**Request Body**:
```json
{
  "comment": "Updated room dimensions per RFI-042",
  "versionType": "minor",
  "revisionLabel": "B",
  "requiresApproval": false
}
```

**Response** (200):
```json
{
  "success": true,
  "documentId": "123e4567-e89b-12d3-a456-426614174000",
  "versionId": "123e4567-e89b-12d3-a456-426614174001",
  "versionNumber": 3,
  "versionLabel": "1.2",
  "message": "Document checked in successfully"
}
```

**Error Responses**:
- `400`: Document not locked
- `403`: Document locked by another user
- `404`: Document not found

---

### 3. Force Unlock

Forcefully unlocks a document (admin only).

**Endpoint**: `POST /:documentId/force-unlock`

**Request Body**:
```json
{
  "reason": "User went on vacation, urgent changes needed"
}
```

**Response** (200):
```json
{
  "success": true,
  "documentId": "123e4567-e89b-12d3-a456-426614174000",
  "previousLockHolder": "123e4567-e89b-12d3-a456-426614174002",
  "message": "Document forcefully unlocked"
}
```

---

### 4. Get Version History

Retrieves all versions of a document.

**Endpoint**: `GET /:documentId/versions`

**Response** (200):
```json
{
  "documentId": "123e4567-e89b-12d3-a456-426614174000",
  "totalVersions": 5,
  "currentVersion": 5,
  "versions": [
    {
      "id": "version-5-id",
      "versionNumber": 5,
      "versionLabel": "2.0",
      "comment": "Major revision after review",
      "createdById": "user-id",
      "createdByName": "John Doe",
      "createdAt": "2024-01-15T14:30:00Z",
      "fileSize": 1048576,
      "isCurrent": true
    }
  ]
}
```

---

### 5. Compare Versions

Compares two versions and returns differences.

**Endpoint**: `POST /:documentId/versions/compare`

**Request Body**:
```json
{
  "fromVersionId": "version-1-id",
  "toVersionId": "version-2-id"
}
```

**Response** (200):
```json
{
  "fromVersion": 1,
  "toVersion": 2,
  "fromLabel": "1.0",
  "toLabel": "1.1",
  "differences": [
    {
      "field": "fileName",
      "oldValue": "Drawing A-101.pdf",
      "newValue": "Drawing A-101 Rev B.pdf"
    },
    {
      "field": "fileSize",
      "oldValue": 1048576,
      "newValue": 1148576
    }
  ],
  "metadataChanges": {
    "rooms": {
      "old": ["101", "102"],
      "new": ["101", "102", "103"]
    }
  }
}
```

---

### 6. Restore Version

Restores a previous version (creates new version by default).

**Endpoint**: `POST /:documentId/versions/restore`

**Request Body**:
```json
{
  "versionId": "version-3-id",
  "comment": "Reverting to approved version before unauthorized changes",
  "createNewVersion": true
}
```

**Response** (200):
```json
{
  "success": true,
  "documentId": "123e4567-e89b-12d3-a456-426614174000",
  "restoredVersionId": "version-3-id",
  "newVersionId": "version-6-id",
  "message": "Version 3 restored as new version 6"
}
```

---

### 7. Get Lock Status

Checks if a document is locked and by whom.

**Endpoint**: `GET /:documentId/lock-status`

**Response** (200):
```json
{
  "isLocked": true,
  "lockedById": "user-id",
  "lockedByName": "John Doe",
  "lockedAt": "2024-01-15T14:00:00Z",
  "lockExpiresAt": "2024-01-15T15:00:00Z",
  "lockExpiresInMinutes": 45,
  "canUnlock": true
}
```

---

### 8. Record Distribution

Records that a version was distributed (for compliance).

**Endpoint**: `POST /versions/:versionId/distributions`

**Request Body**:
```json
{
  "versionId": "version-id",
  "distributionType": "email",
  "recipientId": "recipient-user-id",
  "recipientName": "Jane Smith",
  "recipientEmail": "jane.smith@example.com",
  "recipientCompany": "Acme Construction",
  "transmittalNumber": "TR-2024-001",
  "referenceNumber": "REF-001",
  "notes": "Sent for approval"
}
```

**Response** (201):
```json
{
  "success": true,
  "distributionId": "distribution-id",
  "message": "Distribution recorded successfully"
}
```

---

## Workflows

### Standard Edit Workflow

```
1. User checks out document
   POST /:documentId/checkout
   → Document locked for 30 minutes

2. User edits document
   (Upload new version file via upload endpoint)

3. User checks in document
   POST /:documentId/checkin
   → New version created
   → Document unlocked
   → Lock history recorded
```

### Version Comparison Workflow

```
1. Get version history
   GET /:documentId/versions
   → List all versions

2. Compare two versions
   POST /:documentId/versions/compare
   → See what changed

3. Restore if needed
   POST /:documentId/versions/restore
   → Rollback to previous version
```

### Distribution Tracking Workflow

```
1. User downloads/emails document

2. System records distribution
   POST /versions/:versionId/distributions
   → Creates audit trail

3. Later, query distributions
   → See who received which version when
```

---

## Data Models

### DocumentLockHistory

Tracks every lock operation for audit purposes.

```typescript
{
  id: string;
  documentId: string;
  action: 'checkout' | 'checkin' | 'force_unlock' | 'expired';
  userId: string;
  userName: string;
  actionAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  reason: string | null;
  relatedVersionId: string | null;
  metadata: {
    lockDuration?: number;
    forceUnlockedBy?: string;
    expirationTime?: string;
    checkoutComment?: string;
    checkinComment?: string;
  };
}
```

### VersionDistribution

Tracks document distribution for compliance.

```typescript
{
  id: string;
  versionId: string;
  distributionType: 'download' | 'transmittal' | 'email' | 'shared_link' | 'api';
  recipientId: string;
  recipientName: string;
  recipientEmail: string | null;
  recipientCompany: string | null;
  distributedBy: string;
  distributedByName: string;
  distributedAt: Date;
  transmittalNumber: string | null;
  referenceNumber: string | null;
  notes: string | null;
  acknowledged: boolean;
  acknowledgedAt: Date | null;
  acknowledgedBy: string | null;
}
```

---

## Security Considerations

### Lock Ownership Validation

- Only the lock holder can checkin
- Admins can force unlock (logged)
- Expired locks are auto-cleaned

### Audit Trail

Every operation is logged with:
- User ID and name
- IP address
- User agent
- Timestamp
- Reason/comment

### Distribution Tracking

Required for:
- Legal compliance
- Construction liability
- RFI/submittal tracking
- ISO 9001 compliance

---

## Best Practices

### Lock Duration

- **Short edits**: 15-30 minutes
- **Long edits**: 1-2 hours
- **Maximum**: 8 hours (480 minutes)

### Version Types

- **MAJOR**: Significant changes, new revision letter
- **MINOR**: Small changes, updates
- **PATCH**: Bug fixes, typos

### Comments

Always include meaningful comments:
```
✅ "Updated room 101 dimensions per RFI-042"
✅ "Fixed typo in note 3"
✅ "Added detail callout per architect request"

❌ "Changes"
❌ "Update"
❌ "v2"
```

### Distribution Tracking

Record distributions for:
- Email sends
- Transmittals
- Public link shares
- API downloads
- Manual distributions

### Force Unlock

Only use when:
- User unavailable (vacation, emergency)
- Lock expired but system didn't clean up
- Emergency changes needed

Always provide a reason for audit trail.

---

## Scheduled Jobs

### Lock Expiration Job

Runs every 5 minutes to auto-unlock expired documents.

**What it does**:
1. Finds documents with `lockExpiresAt < now`
2. Unlocks them
3. Records in lock history
4. Logs the action

**Configuration**:
```typescript
@Cron(CronExpression.EVERY_5_MINUTES)
async handleExpiredLocks(): Promise<void>
```

---

## Error Handling

### Common Errors

| Code | Error | Solution |
|------|-------|----------|
| 404 | Document not found | Check document ID |
| 409 | Already locked | Wait or request force unlock |
| 403 | Not lock owner | Only lock owner can checkin |
| 400 | Not locked | Document must be checked out first |

### Conflict Resolution

If checkout fails due to existing lock:
1. Check lock status: `GET /:documentId/lock-status`
2. Wait for expiration OR
3. Request admin force unlock if urgent

---

## Integration Examples

### Frontend Integration

```typescript
// Checkout document
const checkout = await fetch(`/api/projects/${projectId}/documents/${docId}/checkout`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    comment: 'Updating dimensions',
    lockDurationMinutes: 60
  })
});

// Edit document...

// Checkin document
const checkin = await fetch(`/api/projects/${projectId}/documents/${docId}/checkin`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    comment: 'Updated dimensions per RFI-042',
    versionType: 'minor',
    revisionLabel: 'B'
  })
});
```

### CLI Integration

```bash
# Checkout
curl -X POST https://api.example.com/api/projects/$PROJECT_ID/documents/$DOC_ID/checkout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"comment":"Updating","lockDurationMinutes":60}'

# Checkin
curl -X POST https://api.example.com/api/projects/$PROJECT_ID/documents/$DOC_ID/checkin \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"comment":"Updated","versionType":"minor"}'
```

---

## Troubleshooting

### Lock Won't Release

1. Check if expired: `GET /:documentId/lock-status`
2. Wait 5 minutes for auto-cleanup job
3. Admin force unlock if urgent

### Version Not Created

- Ensure document was checked out
- Verify you're the lock owner
- Check for validation errors in response

### Distribution Not Recorded

- Verify version ID is correct
- Check recipient user exists
- Ensure required fields are provided

---

## Support

For issues or questions:
- Check error response details
- Review audit logs in `document_lock_history`
- Contact system administrator for force unlock requests
