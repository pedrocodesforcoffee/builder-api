# Share Link Downloads

This document describes the share link download functionality, which allows secure external sharing of documents with comprehensive access controls.

## Overview

The share link download feature enables users to share documents externally via secure, time-limited URLs. Each share link can be configured with various security controls including password protection, email restrictions, download limits, IP filtering, and dynamic watermarking.

## Architecture

### Components

- **ShareLinkController** (`src/modules/documents/controllers/share-link.controller.ts`)
  - Handles HTTP requests for share link operations
  - Public endpoint: `POST /s/:shortCode/download`
  - Protected endpoints for management (require JWT auth)

- **ShareLinkService** (`src/modules/documents/services/share-link.service.ts`)
  - Core business logic for share link operations
  - Validates access permissions (10-step security check)
  - Manages document downloads with optional watermarking
  - Tracks access and download statistics

- **S3Service** (`src/common/services/s3.service.ts`)
  - Handles file storage and retrieval from S3/Mock S3
  - Supports both production and quarantine buckets

- **WatermarkService** (`src/modules/documents/services/watermark.service.ts`)
  - Applies dynamic watermarks to downloaded documents
  - Supports PDF and image formats
  - Embeds recipient information for traceability

## API Endpoints

### Public Endpoints (No Authentication Required)

#### Download via Share Link
```
POST /s/:shortCode/download
```

**Request Body:**
```typescript
{
  password?: string;      // Required if link has password protection
  email?: string;         // Required if link requires email
}
```

**Response:**
- **Success (200)**: Binary file download with headers:
  - `Content-Type`: Document MIME type
  - `Content-Disposition`: `attachment; filename="<filename>"`
  - `Content-Length`: File size in bytes

- **Error Responses:**
  - `401 Unauthorized`: Password or email required but not provided
  - `403 Forbidden`: Access denied (expired, revoked, limit exceeded, IP restricted)
  - `404 Not Found`: Share link or document not found
  - `500 Internal Server Error`: Server error during processing

#### Access Shared Document (Metadata Only)
```
POST /s/:shortCode/access
```

Returns document metadata without downloading the file.

### Protected Endpoints (Require JWT Authentication)

#### Create Share Link
```
POST /projects/:projectId/share-links
```

#### Get Share Link Details
```
GET /share-links/:shareLinkId
```

#### Update Share Link
```
PUT /share-links/:shareLinkId
```

#### Revoke Share Link
```
DELETE /share-links/:shareLinkId
```

#### Get Share Link Statistics
```
GET /share-links/:shareLinkId/stats
```

#### List Project Share Links
```
GET /projects/:projectId/share-links
```

#### List Document Share Links
```
GET /documents/:documentId/share-links
```

## Security Features

### 10-Step Access Validation

The `validateShareLinkAccess` method performs comprehensive security checks:

1. **Link Existence**: Verify share link exists in database
2. **Status Check**: Ensure link status is ACTIVE (not REVOKED or EXHAUSTED)
3. **Expiration Check**: Verify link hasn't expired (auto-expires if past date)
4. **Password Validation**: Verify password if required (bcrypt comparison)
5. **Email Requirement**: Check email is provided if required
6. **Email Whitelist**: Verify email is in allowed list if specified
7. **Download Limit**: Check download count hasn't exceeded max downloads
8. **IP Restrictions**: Validate IP address against allowed ranges (supports wildcards)
9. **Access Tracking**: Increment access count and update last accessed timestamp
10. **Access Logging**: Log access attempt with all relevant details

### Password Protection

- Passwords are hashed using bcrypt (10 rounds)
- Never stored in plain text
- Compared securely during access validation

### Email Restrictions

- Can require email for all downloads
- Optional whitelist of specific allowed emails
- Logged for traceability

### Download Limits

- Optional max download count
- Automatically changes status to EXHAUSTED when limit reached
- Prevents further downloads after limit

### IP Restrictions

- Optional IP range filtering
- Supports exact matches and wildcard patterns (e.g., `192.168.*`)
- Uses regex pattern matching for flexible rules

### Watermarking

- Optional dynamic watermarking for PDFs
- Embeds recipient information (name, email, company, purpose)
- Helps trace document distribution
- Gracefully handles watermarking errors (returns original file)

## Data Flow

### Download Flow

1. Client sends POST request to `/s/:shortCode/download`
2. Controller extracts shortCode, password, email, IP address, user agent
3. Service validates access (10-step check)
4. Service retrieves document from database (with current version)
5. Service downloads file from S3 using s3Key
6. Service applies watermark if enabled (optional)
7. Service increments download count
8. Service logs access with full details
9. Controller sets response headers (Content-Type, Content-Disposition, Content-Length)
10. Controller sends file buffer to client

### Error Handling

- All errors are caught and logged
- Appropriate HTTP status codes returned
- Error messages are user-friendly but don't expose sensitive information
- Failed access attempts are logged for security monitoring

## Database Schema

### ShareLink Entity

```typescript
{
  id: string;                    // UUID
  shortCode: string;             // 16-char random URL-safe string
  documentId: string;            // Reference to Document
  status: ShareLinkStatus;       // ACTIVE | EXPIRED | REVOKED | EXHAUSTED
  passwordHash: string | null;   // Bcrypt hash
  requireEmail: boolean;         // Email mandatory flag
  allowedEmails: string[] | null; // Email whitelist
  maxDownloads: number | null;   // Download limit
  downloadCount: number;         // Current download count
  accessCount: number;           // Access attempt count
  allowedIpRanges: string[] | null; // IP whitelist
  allowDownload: boolean;        // Download permission
  allowPrint: boolean;           // Print permission
  watermarkEnabled: boolean;     // Watermark flag
  watermarkSettings: object | null; // Watermark config
  recipientName: string | null;  // Intended recipient
  recipientCompany: string | null; // Recipient company
  purpose: string | null;        // Sharing purpose
  notifyOnAccess: boolean;       // Email notification flag
  expiresAt: Date;               // Expiration date
  lastAccessedAt: Date | null;   // Last access timestamp
  revokedAt: Date | null;        // Revocation timestamp
  revokedById: string | null;    // User who revoked
  createdById: string;           // Creator user ID
  createdAt: Date;               // Creation timestamp
}
```

## Testing

### Unit Tests

Located at: `src/modules/documents/services/__tests__/share-link.service.spec.ts`

Covers:
- Successful download scenarios
- All security validation scenarios
- Watermarking (enabled/disabled/error handling)
- Access tracking and logging
- Error conditions

Run tests:
```bash
npm test share-link.service.spec.ts
```

### E2E Tests

Located at: `src/modules/documents/controllers/__tests__/share-link.controller.e2e.spec.ts`

Covers:
- Full download flow via HTTP
- Various security scenarios
- Header validation
- Error responses

Run E2E tests:
```bash
npm run test:e2e
```

## Usage Examples

### Creating a Share Link (via API)

```typescript
POST /projects/{projectId}/share-links
Authorization: Bearer <jwt_token>

{
  "documentId": "doc-123",
  "password": "secret123",
  "requireEmail": true,
  "allowedEmails": ["user@example.com"],
  "maxDownloads": 10,
  "allowDownload": true,
  "allowPrint": false,
  "watermarkEnabled": true,
  "recipientName": "John Doe",
  "recipientCompany": "Acme Corp",
  "purpose": "Review",
  "notifyOnAccess": true,
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

### Downloading via Share Link (Public)

```typescript
POST /s/abc123xyz456/download

{
  "password": "secret123",
  "email": "user@example.com"
}
```

Response will be a file download with appropriate headers.

## Monitoring and Logging

### Access Logs

All download attempts are logged via `PermissionService.logAccess()`:

```typescript
{
  documentId: string;
  versionId: string;
  action: DocumentAction.DOWNLOAD;
  shareLinkId: string;
  externalEmail: string | undefined;
  ipAddress: string;
  userAgent: string | undefined;
  details: {
    success: boolean;
    watermarkApplied: boolean;
    downloadFormat: string;
  }
}
```

### Metrics

Track these metrics for monitoring:
- Download success/failure rates
- Most accessed share links
- Average downloads per link
- Watermarking success rate
- Access attempts from restricted IPs/emails
- Links approaching/exceeding limits

## Best Practices

### For Developers

1. **Never skip security checks**: Always use `validateShareLinkAccess()`
2. **Log all access**: Both successful and failed attempts
3. **Handle errors gracefully**: Return appropriate error messages without exposing internals
4. **Test thoroughly**: Cover all security scenarios in tests
5. **Monitor performance**: S3 downloads and watermarking can be slow

### For Users

1. **Use strong passwords**: If password protection is enabled
2. **Set appropriate expiration**: Don't make links last longer than necessary
3. **Use email restrictions**: When sharing with known recipients
4. **Enable watermarking**: For sensitive documents
5. **Monitor access logs**: Review who accessed your documents
6. **Revoke when done**: Revoke links that are no longer needed

## Troubleshooting

### Common Issues

#### "Object not found" Error
- **Cause**: Document file not in production bucket
- **Solution**: Ensure file is uploaded to correct S3 bucket (builder-documents)

#### Downloads Not Counting
- **Cause**: Database transaction not committed
- **Solution**: Verify `shareLinkRepo.save()` is being called

#### Watermark Not Applied
- **Cause**: Watermarking error (gracefully handled)
- **Solution**: Check console logs for watermark errors, verify PDF format is supported

#### 403 Forbidden on Valid Link
- **Cause**: Link may be expired, exhausted, or IP restricted
- **Solution**: Check link status, expiration date, download count, and IP restrictions

## Future Enhancements

Potential improvements:
- [ ] Analytics dashboard for share link performance
- [ ] Scheduled link cleanup job (remove expired links)
- [ ] Email notifications on access
- [ ] More granular permissions (view-only, annotation, etc.)
- [ ] Link usage reports
- [ ] Bulk link creation
- [ ] Link templates for common scenarios
- [ ] Integration with DRM systems
- [ ] Advanced watermark customization
- [ ] QR code generation for links
