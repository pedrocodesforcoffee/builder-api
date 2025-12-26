# Document Download API

This document describes the API endpoints and implementation details for downloading documents in the Builder application.

## Table of Contents

- [Overview](#overview)
- [Endpoints](#endpoints)
- [Authentication](#authentication)
- [Filename Sanitization](#filename-sanitization)
- [Error Handling](#error-handling)
- [Implementation Details](#implementation-details)
- [Testing](#testing)

## Overview

The document download system provides secure, permission-controlled access to project documents. Documents are retrieved from S3 (or mock S3 in development) and streamed directly to the client with appropriate headers.

### Key Features

- **Permission-based access**: Users must be project members and have VIEW permission
- **S3 integration**: Supports both real S3 and mock S3 for development
- **Filename sanitization**: Automatically handles special characters in filenames
- **Multiple file types**: Supports PDFs, images, Office documents, and more
- **Inline viewing**: Sets Content-Disposition to \`inline\` for browser preview

## Endpoints

### Download Document (Project Scope)

Downloads a document file with project-level permission checking.

\`\`\`
GET /api/projects/:projectId/documents/:documentId/download
\`\`\`

**Path Parameters:**
- \`projectId\` (string, UUID): The project ID
- \`documentId\` (string, UUID): The document ID

**Headers:**
- \`Authorization: Bearer <token>\` (optional): JWT authentication token

**Response:**
- **Status**: \`200 OK\`
- **Content-Type**: Document's MIME type (e.g., \`application/pdf\`, \`image/png\`)
- **Content-Disposition**: \`inline; filename="<sanitized-filename>"\`
- **Content-Length**: File size in bytes
- **Body**: Binary file data

**Example:**

\`\`\`bash
curl -X GET \\
  'http://localhost:3000/api/projects/123e4567-e89b-12d3-a456-426614174000/documents/223e4567-e89b-12d3-a456-426614174000/download' \\
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \\
  --output document.pdf
\`\`\`

**Implementation:** [document.controller.ts:71-150](../src/modules/documents/controllers/document.controller.ts)

## Authentication

### JWT Authentication

Both endpoints support optional JWT authentication:

- **With authentication**: Requires user to be a project member and have VIEW permission
- **Without authentication**: May be used for public share links (if implemented)

### Permission Checks

The download flow performs two permission checks:

1. **Project membership**: Verifies user is a member of the project
2. **Document VIEW permission**: Verifies user has VIEW permission on the document

## Filename Sanitization

The API automatically sanitizes filenames to ensure HTTP header compatibility.

### Why Sanitization is Needed

HTTP headers only support ASCII characters (0x20-0x7E). Filenames with special characters (Unicode, emojis, etc.) cause the error:

\`\`\`
TypeError [ERR_INVALID_CHAR]: Invalid character in header content ["Content-Disposition"]
\`\`\`

### Sanitization Implementation

The sanitization replaces all non-ASCII printable characters with underscores:

\`\`\`typescript
// From document.controller.ts:134
const safeName = document.name.replace(/[^\x20-\x7E]/g, '_');
res.setHeader('Content-Disposition', \`inline; filename="\${safeName}"\`);
\`\`\`

### Examples

| Original Filename | Sanitized Filename |
|-------------------|-------------------|
| \`document.pdf\` | \`document.pdf\` |
| \`Relatório_Técnico_2024.pdf\` | \`Relat_rio_T_cnico_2024.pdf\` |
| \`Structures â The Swift Programming Language.pdf\` | \`Structures _ The Swift Programming Language.pdf\` |
| \`test (2024) [final].pdf\` | \`test (2024) [final].pdf\` |
| \`file with spaces.pdf\` | \`file with spaces.pdf\` |

## Error Handling

### HTTP Status Codes

| Status Code | Description | Scenario |
|-------------|-------------|----------|
| \`200 OK\` | Success | Document downloaded successfully |
| \`401 Unauthorized\` | Not authenticated | Missing or invalid JWT token |
| \`403 Forbidden\` | Permission denied | User doesn't have VIEW permission |
| \`404 Not Found\` | Document not found | Document ID doesn't exist or has been deleted |
| \`404 Not Found\` | Version not found | Document exists but has no current version |
| \`500 Internal Server Error\` | Server error | S3 error, database error, or other server issue |

## Implementation Details

### Download Flow

\`\`\`
1. Client Request
   ↓
2. Authentication (JWT)
   ↓
3. Check Project Membership
   ↓
4. Check VIEW Permission
   ↓
5. Fetch Document from Database
   ↓
6. Validate currentVersion exists
   ↓
7. Fetch File from S3
   ↓
8. Sanitize Filename
   ↓
9. Set Response Headers
   ↓
10. Stream File to Client
\`\`\`

## Testing

### Unit Tests

Tests are located at: \`src/modules/documents/controllers/__tests__/document.controller.spec.ts\`

**Coverage:**
- ✅ Successful document download
- ✅ Permission verification (project membership + VIEW permission)
- ✅ Content-Type header setting
- ✅ Content-Disposition header setting
- ✅ Content-Length header setting
- ✅ Filename sanitization for Unicode characters
- ✅ Filename sanitization for non-ASCII characters
- ✅ Error handling (document not found, version not found, permission denied)
- ✅ S3 service error propagation
- ✅ Large file handling
- ✅ Empty file handling

**Running Tests:**

\`\`\`bash
# Run all tests
npm test

# Run document controller tests
npm test document.controller.spec

# Run with coverage
npm run test:cov
\`\`\`

## Related Documentation

- [Mock S3 Setup Guide](./MOCK_S3_SETUP.md)
- [S3 Service Implementation](../src/common/services/s3.service.ts)
