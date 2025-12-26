# Document Permissions & Distribution - Implementation Guide

**Task**: 3.4.1.6
**Status**: Session 1 Complete (Foundation Layer)
**Completion**: ~40% (Database entities complete)

---

## Session 1 Summary (COMPLETED)

### ✅ Entities Created

All database entities are ready for migration:

1. **permission.enums.ts** - All permission-related enums
   - ProjectRole (14 roles from OWNER to VIEWER)
   - DocumentAction (9 actions from VIEW to VERSION)
   - MemberStatus, PermissionTargetType, ShareLinkStatus, TransmittalStatus, RecipientStatus

2. **project-member.entity.ts** - Project membership with roles
   - Supports both internal users and email invites
   - Multiple roles per member
   - Discipline-specific access for subcontractors
   - Temporary access with expiration dates

3. **folder-permission.entity.ts** - Folder-level permissions
   - Target types: ROLE, USER, COMPANY
   - Inheritable to child folders/documents
   - Expiration support

4. **document-permission.entity.ts** - Document-level overrides
   - User-specific permissions
   - Overrides folder and role permissions
   - Reason tracking for auditing

5. **document-restriction.entity.ts** - Additional security controls
   - Deny download/print flags
   - Watermark requirements
   - IP range restrictions

6. **share-link.entity.ts** - External sharing
   - Short code generation
   - Password protection (hashed)
   - Email verification
   - Download limits
   - Watermark settings (JSONB)
   - Access tracking

7. **document-access-log.entity.ts** - Complete audit trail
   - All document actions logged
   - User and external access
   - IP, user agent, geolocation
   - Success/failure tracking

8. **transmittal.entity.ts** - Formal distribution
   - Transmittal metadata
   - TransmittalDocument junction
   - TransmittalRecipient with acknowledgment tracking

9. **distribution-list.entity.ts** - Recipient groups
   - Manual and auto-computed membership
   - Criteria-based inclusion (roles, disciplines, companies)

### ✅ Module Updates

- All entities registered in TypeOrmModule
- Enums exported from index
- Entities exported from index
- DocumentsModule updated

---

## Session 2 Roadmap: Core Services

### Priority 1: Permission Service (CRITICAL)

**File**: `src/modules/documents/services/permission.service.ts`

This is the most complex service - implements hybrid RBAC + document-level permissions.

**Key Methods**:

```typescript
@Injectable()
export class PermissionService {
  // Core permission check - used throughout the system
  async checkPermission(
    userId: string,
    documentId: string,
    action: DocumentAction,
    context?: { ipAddress?: string }
  ): Promise<{ allowed: boolean; reason: string; restrictions?: any }>;

  // Get effective folder permissions (walks inheritance chain)
  private async getFolderPermissions(
    folderId: string | null,
    userId: string
  ): Promise<{ actions: DocumentAction[]; source: string }>;

  // Apply restrictions after permission granted
  private async applyRestrictions(
    documentId: string,
    action: DocumentAction,
    context?: { ipAddress?: string }
  ): Promise<{ allowed: boolean; reason: string; restrictions?: any }>;

  // Helper: Combine actions from multiple roles
  private getActionsFromRoles(roles: ProjectRole[]): DocumentAction[];

  // Helper: Check discipline restrictions for subcontractors
  private async getDocumentDiscipline(document: Document): Promise<DrawingDiscipline | null>;

  // Helper: IP range checking
  private checkIpRange(ip: string, ranges: string[]): boolean;

  // Cache invalidation
  async invalidateCache(userId: string, documentId?: string): Promise<void>;
}
```

**Role Permission Matrix** (hardcoded in service):
```typescript
private readonly ROLE_PERMISSIONS: Record<ProjectRole, DocumentAction[]> = {
  [ProjectRole.OWNER]: Object.values(DocumentAction),
  [ProjectRole.ADMIN]: Object.values(DocumentAction),
  [ProjectRole.ARCHITECT]: [VIEW, DOWNLOAD, DOWNLOAD_ORIGINAL, PRINT, EDIT, SHARE, VERSION],
  [ProjectRole.GENERAL_CONTRACTOR]: [VIEW, DOWNLOAD, PRINT, SHARE],
  // ... etc for all 14 roles
};
```

**Permission Resolution Order**:
1. Check explicit document permission → if exists, use it
2. Check folder permission (bubble up to parents) → if exists, use it
3. Fall back to project role default permissions
4. If still no permission, DENY

**Implementation Notes**:
- Use `@nestjs/cache-manager` for caching (5 min TTL)
- Install `ipaddr.js` for IP range checking: `npm install ipaddr.js`
- Cache key format: `perm:${userId}:${documentId}:${action}`
- Invalidate cache on any permission change

---

### Priority 2: Watermark Service

**File**: `src/modules/documents/services/watermark.service.ts`

**Dependencies**:
```bash
npm install pdf-lib canvas
```

**Key Methods**:

```typescript
@Injectable()
export class WatermarkService {
  // Apply watermark to PDF
  async applyWatermark(
    inputBuffer: Buffer,
    options: {
      text: string;
      recipientEmail?: string;
      accessDate?: Date;
      position?: 'diagonal' | 'header' | 'footer';
      opacity?: number;
      fontSize?: number;
    }
  ): Promise<Buffer>;

  // Apply watermark to image
  async applyImageWatermark(
    inputBuffer: Buffer,
    mimeType: string,
    options: {
      text: string;
      recipientEmail?: string;
      accessDate?: Date;
      opacity?: number;
    }
  ): Promise<Buffer>;
}
```

**Implementation Notes**:
- Use `pdf-lib` for PDF watermarking
- Use `canvas` for image watermarking
- Watermark text format: `{text} | {email} | {date}`
- Default opacity: 0.3 (30%)
- Default position: diagonal
- For images: use Sharp to composite watermark overlay

---

### Priority 3: Share Link Service

**File**: `src/modules/documents/services/share-link.service.ts`

**Dependencies**:
```bash
npm install bcrypt
```

**Key Methods**:

```typescript
@Injectable()
export class ShareLinkService {
  async createShareLink(
    documentId: string,
    dto: CreateShareLinkDto,
    userId: string
  ): Promise<ShareLinkResponse>;

  async accessSharedDocument(
    shortCode: string,
    accessInfo: {
      email?: string;
      password?: string;
      ipAddress: string;
      userAgent: string;
    }
  ): Promise<SharedDocumentResponse>;

  async revokeShareLink(shareLinkId: string, userId: string): Promise<void>;

  // Generate random URL-safe short code (16 chars)
  private generateShortCode(): string;

  // Generate pre-signed S3 URL with watermark applied
  private async generateSecureViewUrl(
    shareLink: ShareLink,
    recipientEmail?: string
  ): Promise<string>;

  // Log access to audit trail
  private async logAccess(
    shareLink: ShareLink,
    accessInfo: { email?: string; ipAddress: string; userAgent: string }
  ): Promise<void>;
}
```

**Security Checks** (in accessSharedDocument):
1. Check status (not revoked/expired/exhausted)
2. Check expiration date
3. Check download limit
4. Validate password (if set)
5. Validate email (if required/whitelisted)
6. Check IP range (if restricted)
7. Update access stats
8. Log access
9. Notify owner (if enabled)
10. Generate watermarked URLs

**Implementation Notes**:
- Max expiry: 90 days from creation
- Password: bcrypt hash with salt rounds=10
- Short code: 16 random URL-safe characters (A-Za-z0-9)
- Watermarked downloads: generate on-the-fly or cache
- Access logging: always log, even for failed attempts

---

### Priority 4: Transmittal Service

**File**: `src/modules/documents/services/transmittal.service.ts`

**Dependencies**:
```bash
npm install pdfkit  # For cover sheet generation
```

**Key Methods**:

```typescript
@Injectable()
export class TransmittalService {
  async createTransmittal(
    projectId: string,
    dto: CreateTransmittalDto,
    userId: string
  ): Promise<TransmittalResponse>;

  async acknowledgeTransmittal(
    transmittalId: string,
    dto: AcknowledgeTransmittalDto
  ): Promise<void>;

  async listTransmittals(
    projectId: string,
    query: ListTransmittalsQuery
  ): Promise<{ transmittals: TransmittalResponse[]; pagination: any }>;

  // Generate sequential number (T-001, T-002, etc.)
  private async generateTransmittalNumber(projectId: string): Promise<string>;

  // Generate PDF cover sheet
  private async generateCoverSheet(transmittal: Transmittal): Promise<string>;

  // Send email notifications
  private async sendTransmittalEmails(transmittal: Transmittal): Promise<void>;

  // Update status based on acknowledgments
  private async updateTransmittalStatus(transmittalId: string): Promise<void>;
}
```

**Transmittal Creation Flow**:
1. Generate transmittal number (T-001, T-002, etc.)
2. Create transmittal record
3. Link documents (TransmittalDocument)
4. Create recipient records (TransmittalRecipient)
5. Generate share links for each recipient (optional)
6. Generate PDF cover sheet (optional)
7. Upload cover sheet to S3
8. Send email notifications (if requested)
9. Update status to SENT

**Cover Sheet Contents**:
- Transmittal number and date
- Subject and message
- List of transmitted documents with versions
- List of recipients
- Response required notice (if applicable)

**Implementation Notes**:
- Use PDFKit for cover sheet generation
- Cover sheets stored in S3: `transmittals/{projectId}/{transmittalId}/cover-sheet.pdf`
- Email service integration needed
- Status auto-updates when all recipients acknowledge

---

## Session 3 Roadmap: Controllers & DTOs

### DTOs to Create

**File**: `src/modules/documents/dto/permission.dto.ts`

```typescript
// Project Member DTOs
export class AddProjectMemberDto { ... }
export class UpdateProjectMemberDto { ... }
export class ProjectMemberResponseDto { ... }
export class ListMembersQuery { ... }

// Permission DTOs
export class SetFolderPermissionsDto { ... }
export class FolderPermissionsResponseDto { ... }
export class SetDocumentPermissionsDto { ... }
export class DocumentPermissionsResponseDto { ... }
export class CheckPermissionDto { ... }
export class CheckPermissionResponse { ... }

// Share Link DTOs
export class CreateShareLinkDto { ... }
export class ShareLinkResponseDto { ... }
export class SharedDocumentResponseDto { ... }
export class AccessShareQuery { ... }

// Transmittal DTOs
export class CreateTransmittalDto { ... }
export class TransmittalResponseDto { ... }
export class AcknowledgeTransmittalDto { ... }
export class ListTransmittalsQuery { ... }

// Distribution List DTOs
export class CreateDistributionListDto { ... }
export class DistributionListResponseDto { ... }

// Audit DTOs
export class AuditLogQuery { ... }
export class AuditLogResponseDto { ... }
export class ExportAuditLogQuery { ... }
```

### Controllers to Create

1. **ProjectMemberController**
   - POST `/projects/:projectId/members` - Add member
   - GET `/projects/:projectId/members` - List members
   - PUT `/projects/:projectId/members/:memberId` - Update member
   - DELETE `/projects/:projectId/members/:memberId` - Remove member

2. **PermissionController**
   - PUT `/folders/:folderId/permissions` - Set folder permissions
   - GET `/folders/:folderId/permissions` - Get folder permissions
   - PUT `/documents/:documentId/permissions` - Set document permissions
   - GET `/documents/:documentId/permissions` - Get document permissions
   - POST `/documents/:documentId/check-permission` - Check permission

3. **ShareLinkController**
   - POST `/documents/:documentId/share` - Create share link
   - GET `/documents/:documentId/shares` - List document's share links
   - DELETE `/shares/:shareId` - Revoke share link
   - **PUBLIC** GET `/share/:shortCode` - Access shared document (no auth)

4. **TransmittalController**
   - POST `/projects/:projectId/transmittals` - Create transmittal
   - GET `/projects/:projectId/transmittals` - List transmittals
   - GET `/transmittals/:transmittalId` - Get transmittal
   - POST `/transmittals/:transmittalId/acknowledge` - Acknowledge receipt
   - POST `/projects/:projectId/distribution-lists` - Create distribution list
   - GET `/projects/:projectId/distribution-lists` - List distribution lists

5. **AuditController**
   - GET `/documents/:documentId/audit-log` - Get document audit log
   - GET `/projects/:projectId/audit-log/export` - Export audit log

**Implementation Notes**:
- All endpoints require authentication EXCEPT `/share/:shortCode`
- Use `@UseGuards(JwtAuthGuard)` for protected routes
- Use `@Public()` decorator for share link access
- Add rate limiting on share link access (10 req/min per IP)
- Validate all DTOs with class-validator
- Use Swagger decorators for API documentation

---

## Session 4 Roadmap: Tests & Documentation

### Unit Tests

**Files**:
- `permission.service.spec.ts`
- `watermark.service.spec.ts`
- `share-link.service.spec.ts`
- `transmittal.service.spec.ts`

**Test Coverage**:
- Permission resolution (role → folder → document)
- Permission inheritance (folder tree walking)
- Discipline restrictions for subcontractors
- IP range restrictions
- Watermark application (PDF and image)
- Share link security (password, email, expiration)
- Transmittal creation and acknowledgment
- Audit logging

### Integration Tests

**File**: `permissions-integration.spec.ts`

**Test Scenarios**:
1. Complete share link flow (create → access → download)
2. Permission cascade (update folder → affects documents)
3. Role change (update member → invalidates cache)
4. Transmittal flow (create → send → acknowledge)
5. Audit trail (all actions logged correctly)

### Documentation

**File**: `docs/PERMISSIONS_AND_DISTRIBUTION.md`

**Sections**:
1. Overview & Architecture
2. Permission Model (RBAC + document-level)
3. API Endpoints (all endpoints with examples)
4. Security Features (watermarking, IP restrictions, etc.)
5. External Sharing (share link workflows)
6. Transmittals (formal distribution workflows)
7. Audit & Compliance (logging and exports)
8. Best Practices
9. Migration Guide (from existing permission systems)
10. Troubleshooting

---

## NPM Dependencies Checklist

Before Session 2, install:

```bash
npm install bcrypt pdf-lib canvas ipaddr.js @nestjs/cache-manager pdfkit
npm install -D @types/bcrypt @types/pdfkit
```

---

## Database Migration Checklist

Before Session 2:

1. Generate TypeORM migration:
   ```bash
   npm run migration:generate -- -n AddPermissionsAndDistribution
   ```

2. Review migration file - should create 11 new tables:
   - project_members
   - folder_permissions
   - document_permissions
   - document_restrictions
   - share_links
   - document_access_logs
   - transmittals
   - transmittal_documents
   - transmittal_recipients
   - distribution_lists
   - distribution_list_members

3. Run migration:
   ```bash
   npm run migration:run
   ```

4. Verify all indices created correctly

---

## Testing Strategy

### Manual Testing Checklist

**Session 2 (after services complete)**:
- [ ] Add project member with role
- [ ] Check permission for different roles
- [ ] Set folder permission and verify inheritance
- [ ] Override document permission
- [ ] Create share link with password
- [ ] Apply watermark to PDF
- [ ] Apply watermark to image
- [ ] Access share link (valid password)
- [ ] Access share link (invalid password - should fail)

**Session 3 (after controllers complete)**:
- [ ] Full API endpoint testing via Postman/Insomnia
- [ ] Share link expires correctly
- [ ] Download limit enforced
- [ ] IP restriction blocks unauthorized access
- [ ] Transmittal creation and email sending
- [ ] Recipient acknowledgment updates status
- [ ] Audit log shows all events

**Session 4 (after tests)**:
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Coverage > 80%

---

## Known Issues & Considerations

1. **Watermarking Performance**: Applying watermarks on-the-fly can be slow for large PDFs. Consider:
   - Pre-generating watermarked versions for high-traffic share links
   - Caching watermarked files in S3 temp bucket (expire after 24h)
   - Using Lambda/worker for watermark generation

2. **Permission Cache Invalidation**: Currently invalidates per user+document. For large projects:
   - Consider Redis pub/sub for distributed cache invalidation
   - Use cache tags/groups for bulk invalidation

3. **Audit Log Volume**: Document access logs can grow very large. Plan for:
   - Log rotation (archive logs older than 1 year)
   - Separate database/table for audit logs
   - Elasticsearch for log search/analytics

4. **Email Delivery**: Transmittal emails should use queue. Consider:
   - BullMQ queue for email jobs
   - Retry logic for failed deliveries
   - Email delivery tracking (bounces, opens)

5. **Share Link Short Codes**: 16 characters gives ~2^96 combinations. Collision probability is negligible, but:
   - Add uniqueness check before insert
   - Handle rare collision case gracefully

6. **Subcontractor Discipline Restrictions**: Currently assumes document → drawing → discipline. For other doc types:
   - Add discipline field to Document entity
   - Or map document folders to disciplines

---

## Estimated Effort

- **Session 2** (Services): 4-6 hours
  - PermissionService: 2-3 hours (most complex)
  - WatermarkService: 1 hour
  - ShareLinkService: 1-1.5 hours
  - TransmittalService: 1-1.5 hours

- **Session 3** (Controllers & DTOs): 3-4 hours
  - DTOs: 1-1.5 hours
  - Controllers: 2-2.5 hours

- **Session 4** (Tests & Docs): 3-4 hours
  - Unit tests: 1.5-2 hours
  - Integration tests: 1 hour
  - Documentation: 1-1.5 hours

**Total Remaining**: 10-14 hours

---

## Quick Reference: Role Permissions

| Role | VIEW | DOWNLOAD | DOWNLOAD_ORIGINAL | PRINT | EDIT | DELETE | SHARE | MANAGE_PERMISSIONS | VERSION |
|------|------|----------|-------------------|-------|------|--------|-------|---------------------|---------|
| OWNER | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| ADMIN | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| ARCHITECT | ✓ | ✓ | ✓ | ✓ | ✓ | - | ✓ | - | ✓ |
| GENERAL_CONTRACTOR | ✓ | ✓ | - | ✓ | - | - | ✓ | - | - |
| PROJECT_MANAGER | ✓ | ✓ | - | ✓ | ✓ | - | ✓ | ✓ | ✓ |
| SUPERINTENDENT | ✓ | ✓ | - | ✓ | - | - | - | - | - |
| SUBCONTRACTOR | ✓ | ✓ | - | ✓ | - | - | - | - | - |
| INSPECTOR | ✓ | ✓ | - | - | - | - | - | - | - |
| VIEWER | ✓ | - | - | - | - | - | - | - | - |

---

## Contact & Questions

For questions during implementation:
- Review original task spec in TASK 3.4.1.6
- Check this guide for implementation details
- Refer to NestJS documentation for framework-specific patterns
- Check TypeORM docs for entity relations

---

**Next Step**: Begin Session 2 with PermissionService implementation.
