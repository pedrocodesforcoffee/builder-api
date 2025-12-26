# Security Patterns and Guidelines

**CRITICAL**: This document defines security patterns that MUST be followed for ALL API endpoints and file operations in the Builder API.

## Table of Contents

1. [File Upload Security](#file-upload-security)
2. [Input Sanitization](#input-sanitization)
3. [Rate Limiting](#rate-limiting)
4. [Audit Logging](#audit-logging)
5. [Quarantine Architecture](#quarantine-architecture)
6. [Implementation Checklist](#implementation-checklist)

---

## File Upload Security

### 1. Magic Byte Validation (REQUIRED)

**NEVER trust client-provided MIME types.** Always validate file content using magic bytes.

```typescript
// ✅ CORRECT - Validate file content
import { validateFileType } from '../utils/file-type-validator';

const buffer = await s3Service.getObject(s3Key);
const validation = await validateFileType(buffer, claimedMimeType, fileName);

if (!validation.valid) {
  throw new BadRequestException(`Invalid file type: ${validation.reason}`);
}

// ❌ WRONG - Trusting client MIME type
if (dto.mimeType === 'image/jpeg') {
  // Process as JPEG - DANGEROUS!
}
```

**Location**: `/src/modules/documents/utils/file-type-validator.ts`

### 2. Dangerous File Type Handling (REQUIRED)

Certain file types require special security processing:

| File Type | Risk | Handler | Reason |
|-----------|------|---------|--------|
| SVG | HIGH | `sanitizeSvg()` | Can contain JavaScript |
| XML | HIGH | `sanitizeXml()` | XXE attacks |
| ZIP/RAR | HIGH | `validateArchive()` | Zip bombs, path traversal |
| Office Docs | MEDIUM | `detectOfficeMacros()` | Malicious macros |

```typescript
// ✅ CORRECT - Process dangerous files
import { processDangerousFile } from '../utils/dangerous-file-handler';

if (requiresSecurityProcessing(mimeType)) {
  const check = await processDangerousFile(buffer, mimeType);

  if (!check.safe) {
    // Log security event
    await securityAudit.log('upload.dangerous_content', {
      uploadId, mimeType, threats: check.threats
    });

    throw new BadRequestException(`File rejected: ${check.reason}`);
  }

  // Use sanitized version if available
  if (check.sanitized) {
    buffer = check.sanitized;
  }
}
```

**Location**: `/src/modules/documents/utils/dangerous-file-handler.ts`

### 3. File Name Sanitization (REQUIRED)

**ALWAYS sanitize filenames** to prevent path traversal and command injection.

```typescript
// ✅ CORRECT
import { sanitizeFileName } from '../utils/sanitize';

const safeFileName = sanitizeFileName(userProvidedFileName);
const s3Key = `projects/${projectId}/documents/${safeFileName}`;

// ❌ WRONG - Using unsanitized filename
const s3Key = `projects/${projectId}/documents/${dto.fileName}`; // DANGEROUS!
```

**What it prevents**:
- Path traversal: `../../../etc/passwd`
- Null byte attacks: `file.txt\0.exe`
- Hidden files: `.htaccess`
- Command injection: `file;rm -rf /`

**Location**: `/src/modules/documents/utils/sanitize.ts`

---

## Input Sanitization

### Required for ALL User Input

**Rule**: Sanitize BEFORE storing in database, not just before display.

```typescript
import {
  sanitizeFileName,
  sanitizeDocumentName,
  sanitizeMetadata,
  sanitizeTags,
  sanitizeDescription
} from '../utils/sanitize';

// File operations
const fileName = sanitizeFileName(dto.fileName);

// Display names
const documentName = sanitizeDocumentName(dto.name);

// Descriptions
const description = sanitizeDescription(dto.description, 5000);

// Tags
const tags = sanitizeTags(dto.tags, 20, 50);

// Arbitrary metadata
const metadata = sanitizeMetadata(dto.customFields, {
  maxKeyLength: 50,
  maxValueLength: 1000,
  maxProperties: 50,
  allowedTypes: ['string', 'number', 'boolean']
});
```

### XSS Prevention

The sanitization functions remove:
- `<script>` tags
- `<iframe>` tags
- Event handlers (`onclick`, `onerror`, etc.)
- `javascript:` protocol
- Control characters and null bytes

---

## Rate Limiting

### Upload Rate Limits (REQUIRED)

Implement rate limiting on ALL upload endpoints:

```typescript
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { UseGuards } from '@nestjs/common';

@Controller('documents/upload')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
export class DocumentUploadController {

  @Post('single/initiate')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 per minute
  async initiateSingleUpload() {
    // ...
  }

  @Post('multipart/initiate')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 per minute
  async initiateMultipartUpload() {
    // ...
  }
}
```

### Storage Quota Guard (REQUIRED)

Implement storage quotas per project:

```typescript
@Injectable()
export class StorageQuotaGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const { projectId } = req.params;
    const { fileSize } = req.body;

    const usage = await this.storageService.getProjectUsage(projectId);
    const quota = await this.storageService.getProjectQuota(projectId);

    if (usage + fileSize > quota) {
      // Log quota exceeded event
      await this.securityAudit.log('upload.quota_exceeded', {
        userId: req.user.id,
        projectId,
        currentUsage: usage,
        quota,
        attemptedSize: fileSize
      });

      throw new ForbiddenException('Project storage quota exceeded');
    }

    return true;
  }
}

// Apply to upload endpoints
@UseGuards(JwtAuthGuard, StorageQuotaGuard)
@Post('single/initiate')
async initiateSingleUpload() {
  // ...
}
```

---

## Audit Logging

### Security Event Logging (REQUIRED)

Log ALL security-relevant events:

```typescript
// Security events enum
export enum SecurityEvent {
  // Upload events
  UPLOAD_INITIATED = 'upload.initiated',
  UPLOAD_COMPLETED = 'upload.completed',
  UPLOAD_FAILED_VALIDATION = 'upload.failed.validation',
  UPLOAD_FAILED_VIRUS = 'upload.failed.virus',
  UPLOAD_SUSPICIOUS_TIMING = 'upload.suspicious.timing',
  UPLOAD_SUSPICIOUS_TYPE = 'upload.suspicious.type_mismatch',
  UPLOAD_DANGEROUS_CONTENT = 'upload.dangerous_content',

  // Rate limiting
  RATE_LIMIT_HIT = 'upload.rate_limit',
  QUOTA_EXCEEDED = 'upload.quota_exceeded',

  // Access events
  UNAUTHORIZED_ACCESS = 'access.unauthorized',
  FORBIDDEN_ACTION = 'access.forbidden',
}

// Usage
await this.securityAudit.log(SecurityEvent.UPLOAD_FAILED_VALIDATION, {
  userId: req.user.id,
  projectId,
  uploadId,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  details: {
    fileName,
    claimedType: dto.mimeType,
    detectedType: validation.detectedType,
    reason: validation.reason
  }
});
```

### What to Log

**Always log**:
- User ID
- Project ID
- IP address
- User agent
- Timestamp (automatic)
- Event details

**High-severity events** (should trigger alerts):
- Virus detected
- Type mismatch (potential attack)
- Rate limit exceeded repeatedly
- Quota exceeded repeatedly
- Dangerous content detected

---

## Quarantine Architecture

### Separate S3 Buckets (REQUIRED)

Files MUST be quarantined until virus scan passes:

```typescript
// S3 bucket configuration
export const S3_BUCKETS = {
  QUARANTINE: process.env.S3_QUARANTINE_BUCKET || 'builder-uploads-quarantine',
  PRODUCTION: process.env.S3_DOCUMENTS_BUCKET || 'builder-documents',
};

// On upload completion
async completeUpload(uploadId: string) {
  // Upload goes to QUARANTINE
  const s3Key = this.generateS3Key(projectId, fileName);
  await this.s3Service.putObject(s3Key, buffer, {
    bucket: S3_BUCKETS.QUARANTINE
  });

  // Document status: QUARANTINED
  document.status = DocumentStatus.QUARANTINED;

  // Queue virus scan
  await this.virusScanQueue.add({ uploadId, s3Key });
}

// After virus scan passes
async onVirusScanPassed(uploadId: string) {
  const upload = await this.uploadRepository.findOne({ where: { id: uploadId } });

  // Move from quarantine to production
  await this.s3Service.copyObject(
    upload.s3Key,
    upload.s3Key,
    S3_BUCKETS.QUARANTINE,
    S3_BUCKETS.PRODUCTION
  );

  // Delete from quarantine
  await this.s3Service.deleteObject(upload.s3Key, S3_BUCKETS.QUARANTINE);

  // Update document status
  document.status = DocumentStatus.DRAFT;
}
```

### Access Control

**NO access to quarantined files**:

```typescript
// ✅ CORRECT - Check document status
async getDownloadUrl(versionId: string) {
  const version = await this.versionRepository.findOne({
    where: { id: versionId },
    relations: ['document']
  });

  // CRITICAL: Check if still quarantined
  if (version.document.status === DocumentStatus.QUARANTINED) {
    throw new ForbiddenException('Document is still being scanned for viruses');
  }

  // Only serve from production bucket
  return this.s3Service.getPresignedGetUrl(
    version.s3Key,
    S3_BUCKETS.PRODUCTION
  );
}

// ❌ WRONG - Serving before scan
async getDownloadUrl(versionId: string) {
  return this.s3Service.getPresignedGetUrl(version.s3Key); // DANGEROUS!
}
```

---

## Implementation Checklist

### For Every Upload Endpoint

- [ ] Rate limiting applied (`@Throttle` decorator)
- [ ] Storage quota guard applied
- [ ] Input sanitization (filename, metadata)
- [ ] Magic byte validation on file content
- [ ] Dangerous file type handling
- [ ] Quarantine-first upload (not direct to production)
- [ ] Security audit logging
- [ ] Error handling (don't leak system info)

### For Every File Download Endpoint

- [ ] Permission check (user can access file)
- [ ] Quarantine status check (not still scanning)
- [ ] Content-Disposition header (force download for dangerous types)
- [ ] Content-Security-Policy header
- [ ] Serve from production bucket only
- [ ] Access logging

### For Every Processor (Bull Queue)

- [ ] Idempotent (can run multiple times safely)
- [ ] Error handling with retry logic
- [ ] Status updates to upload record
- [ ] Security event logging
- [ ] Timeout handling

---

## Code Review Checklist

When reviewing code that handles file uploads or user input:

### Critical Security Checks

1. **Input Sanitization**
   - [ ] All user input is sanitized before storage
   - [ ] Filenames are sanitized
   - [ ] Metadata is sanitized
   - [ ] No raw user input in S3 keys

2. **File Validation**
   - [ ] Magic byte validation is performed
   - [ ] File type matches expected type
   - [ ] Dangerous file types are processed
   - [ ] File size is validated

3. **Access Control**
   - [ ] Authentication required
   - [ ] Authorization checked (user can access resource)
   - [ ] Quarantine status checked
   - [ ] No direct S3 access from client

4. **Rate Limiting**
   - [ ] Throttle guards applied
   - [ ] Storage quotas enforced
   - [ ] Per-user limits
   - [ ] Per-project limits

5. **Logging**
   - [ ] Security events logged
   - [ ] Failed attempts logged
   - [ ] Suspicious activity flagged
   - [ ] No sensitive data in logs

### Common Vulnerabilities to Check For

❌ **Path Traversal**
```typescript
// BAD
const path = `uploads/${userId}/${fileName}`;

// GOOD
const path = `uploads/${userId}/${sanitizeFileName(fileName)}`;
```

❌ **Type Confusion**
```typescript
// BAD
if (mimeType === 'image/jpeg') { /* trust it */ }

// GOOD
const validation = await validateFileType(buffer, mimeType, fileName);
if (!validation.valid) throw new Error();
```

❌ **XXE in XML**
```typescript
// BAD
const xml = new XMLParser().parse(userXml);

// GOOD
const check = await sanitizeXml(userXml);
if (!check.safe) throw new Error();
```

❌ **Zip Bombs**
```typescript
// BAD
await extract(zipFile, outputDir);

// GOOD
const check = await validateArchive(zipBuffer);
if (!check.safe) throw new Error();
```

❌ **Direct S3 Access**
```typescript
// BAD
@Get('download/:key')
async download(@Param('key') key: string) {
  return this.s3.getPresignedUrl(key); // User controls key!
}

// GOOD
@Get('download/:versionId')
async download(@Param('versionId') versionId: string) {
  const version = await this.getVersion(versionId);
  // Check permissions
  // Check quarantine status
  return this.s3.getPresignedUrl(version.s3Key);
}
```

---

## Testing Requirements

### Security Test Cases (REQUIRED)

Every upload feature MUST have these tests:

```typescript
describe('Upload Security', () => {
  describe('File Type Validation', () => {
    it('should reject .exe disguised as .jpg', async () => {
      // Upload file with JPEG extension but EXE magic bytes
      const result = await uploadFile(exeWithJpgExtension);
      expect(result.status).toBe(400);
      expect(result.error).toContain('type mismatch');
    });

    it('should reject files with null bytes in filename', async () => {
      const result = await uploadFile('file.txt\0.exe');
      expect(result.status).toBe(400);
    });
  });

  describe('Dangerous Content', () => {
    it('should sanitize SVG with script tags', async () => {
      const svg = '<svg><script>alert("xss")</script></svg>';
      const result = await uploadFile(svg, 'image/svg+xml');
      expect(result.sanitized).not.toContain('<script>');
    });

    it('should reject XML with XXE payload', async () => {
      const xml = '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>';
      const result = await uploadFile(xml, 'application/xml');
      expect(result.status).toBe(400);
    });

    it('should reject zip bombs', async () => {
      // 1KB file that expands to 10GB
      const result = await uploadFile(zipBomb);
      expect(result.status).toBe(400);
      expect(result.error).toContain('compression ratio');
    });
  });

  describe('Rate Limiting', () => {
    it('should block after 10 uploads per minute', async () => {
      for (let i = 0; i < 10; i++) {
        await uploadFile(validFile);
      }

      const result = await uploadFile(validFile);
      expect(result.status).toBe(429);
    });
  });

  describe('Access Control', () => {
    it('should deny access to quarantined files', async () => {
      const { uploadId } = await uploadFile(validFile);
      // File is quarantined, virus scan pending

      const result = await downloadFile(uploadId);
      expect(result.status).toBe(403);
      expect(result.error).toContain('being scanned');
    });
  });
});
```

---

## Environment Configuration

Add to `.env`:

```bash
# S3 Buckets (REQUIRED)
S3_QUARANTINE_BUCKET=builder-uploads-quarantine
S3_DOCUMENTS_BUCKET=builder-documents

# Upload Limits
MAX_FILE_SIZE=5368709120  # 5GB in bytes
MAX_SINGLE_UPLOAD_SIZE=104857600  # 100MB
MULTIPART_THRESHOLD=104857600  # 100MB
PART_SIZE=10485760  # 10MB

# Rate Limits
UPLOAD_RATE_LIMIT=10  # Per minute per user
UPLOAD_DAILY_LIMIT=500  # Per day per user

# Storage Quotas
DEFAULT_PROJECT_QUOTA=10737418240  # 10GB default
```

---

## Future Sections

When implementing new features, always ask:

1. **Does this accept user input?**
   - If yes → Apply sanitization

2. **Does this handle files?**
   - If yes → Apply magic byte validation, dangerous file handling

3. **Is this rate-limited?**
   - If no → Add rate limiting

4. **Are security events logged?**
   - If no → Add audit logging

5. **Can users control resource access?**
   - If yes → Verify authorization, prevent IDOR

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [CWE-22: Path Traversal](https://cwe.mitre.org/data/definitions/22.html)
- [CWE-611: XXE](https://cwe.mitre.org/data/definitions/611.html)
- [CWE-79: XSS](https://cwe.mitre.org/data/definitions/79.html)

---

**Last Updated**: 2024-11-25
**Applies To**: All document upload and file handling features
**Review Frequency**: Before each major release
