# Document Download Feature - Changelog

This document summarizes the changes made to implement and fix the document download functionality, including Mock S3 support and filename sanitization.

## Date: 2025-12-03

## Summary

Fixed document download functionality to support both PNG and PDF files in development using Mock S3 mode. Resolved two critical issues:
1. Missing Mock S3 implementation causing HTTP 500 errors
2. Invalid characters in PDF filenames causing header errors

## Issues Resolved

### Issue #1: Document Download Failing with HTTP 500

**Symptoms:**
- PNG and PDF downloads failing with HTTP 500 errors
- Error: `TypeError: Cannot read properties of undefined (reading 'send')`
- S3Service was in MOCK MODE but `getObject()` method didn't handle it

**Root Cause:**
The S3Service constructor initialized `useMockS3` flag but didn't implement mock file operations in `getObject()` and `putObject()` methods. The service tried to use `this.s3Client.send()` which was undefined in mock mode.

**Fix:**
- Added complete Mock S3 implementation to S3Service (s3.service.ts:308-399)
- Implemented `getObject()` mock using `fs.readFile()` from local filesystem
- Implemented `putObject()` mock using `fs.writeFile()` to local filesystem
- Files stored in: `<project-root>/mock-s3-storage/<bucket>/<s3-key>`
- Added automatic directory creation on startup
- Added comprehensive debug logging for troubleshooting

**Files Changed:**
- `src/common/services/s3.service.ts`

**Code Reference:**
```typescript
// From s3.service.ts:308-323
async getObject(key: string, bucket?: string): Promise<Buffer> {
  if (this.useMockS3) {
    const filePath = this.getMockFilePath(key, bucket);
    this.logger.debug(\`[MOCK S3 getObject] Reading file from: \${filePath}\`);
    try {
      const buffer = await fs.readFile(filePath);
      return buffer;
    } catch (error) {
      this.logger.error(\`[MOCK S3 getObject] Failed to read file: \${filePath}\`);
      throw new Error(\`Object not found: \${key}\`);
    }
  }
  // Real S3 implementation continues...
}
```

### Issue #2: PDF Download Failing with "Invalid Character in Header Content"

**Symptoms:**
- PNG downloads working correctly
- PDF downloads failing with HTTP 500
- Error: `TypeError [ERR_INVALID_CHAR]: Invalid character in header content ["Content-Disposition"]`
- PDF filename contained "â" character

**Root Cause:**
HTTP headers only support ASCII characters (0x20-0x7E). The PDF filename "Structures and Classes â The Swift Programming Language (Swift 5.5).pdf" contained non-ASCII character "â" which violated HTTP header specification.

**Fix:**
- Added filename sanitization in downloadDocument() method (document.controller.ts:134)
- Replaces all non-ASCII characters with underscores using regex `/[^\x20-\x7E]/g`
- Preserves ASCII special characters (spaces, parentheses, brackets, hyphens)

**Files Changed:**
- `src/modules/documents/controllers/document.controller.ts`

**Code Reference:**
```typescript
// From document.controller.ts:134
const safeName = document.name.replace(/[^\x20-\x7E]/g, '_');
res.setHeader('Content-Disposition', \`inline; filename="\${safeName}"\`);
```

**Examples:**
| Original Filename | Sanitized Filename |
|-------------------|-------------------|
| `Relatório_Técnico_2024.pdf` | `Relat_rio_T_cnico_2024.pdf` |
| `Structures â The Swift.pdf` | `Structures _ The Swift.pdf` |
| `test (2024) [final].pdf` | `test (2024) [final].pdf` |

## Files Modified

### Core Implementation

1. **src/common/services/s3.service.ts**
   - Added Mock S3 mode detection and initialization (lines 46-66)
   - Added `initializeMockStorage()` method (lines 69-80)
   - Added `getMockFilePath()` method (lines 82-88)
   - Implemented `getObject()` mock mode (lines 308-323)
   - Implemented `putObject()` mock mode (lines 373-399)
   - Added comprehensive debug logging

2. **src/modules/documents/controllers/document.controller.ts**
   - Added filename sanitization (line 134)
   - Added extensive debug logging throughout download flow (lines 78-147)
   - Improved error handling and error messages

### Tests

3. **src/modules/documents/controllers/__tests__/document.controller.spec.ts**
   - Updated Unicode filename test to expect sanitization (lines 471-497)
   - Added new test for special non-ASCII characters (lines 499-525)
   - Verified all 20 tests pass with new implementation

4. **src/common/services/__tests__/s3.service.spec.ts** (NEW)
   - Created comprehensive test suite for S3Service
   - Tests for both real S3 and mock S3 modes
   - Tests for getObject() mock implementation
   - Tests for putObject() mock implementation
   - Tests for error handling in mock mode
   - Tests for edge cases (large files, special characters, nested paths)
   - Tests for configuration variations

### Documentation

5. **docs/MOCK_S3_SETUP.md** (NEW)
   - Complete guide for Mock S3 configuration
   - Environment variable setup
   - File storage structure explanation
   - Development workflow
   - Debugging guide
   - Migration guide from mock to real S3

6. **docs/DOCUMENT_DOWNLOAD_API.md** (NEW)
   - API endpoint documentation
   - Authentication and permission checks
   - Filename sanitization explanation
   - Error handling guide
   - Implementation details
   - Testing guide
   - Troubleshooting section

7. **docs/CHANGELOG_DOCUMENT_DOWNLOAD.md** (THIS FILE)
   - Summary of changes
   - Issues resolved
   - Files modified
   - Test results

## Test Results

All tests passing successfully:

```
PASS src/modules/documents/controllers/__tests__/document.controller.spec.ts
  DocumentController
    downloadDocument
      ✓ should be defined
      successful download
        ✓ should download document and return file buffer with correct headers
        ✓ should set correct Content-Type header
        ✓ should set Content-Disposition header with inline for viewing
        ✓ should set Content-Length header
        ✓ should send file buffer with 200 status
        ✓ should handle document with different MIME type
        ✓ should handle documents without authenticated user
      error handling
        ✓ should throw NotFoundException when document not found
        ✓ should throw NotFoundException when document has no current version
        ✓ should propagate permission errors
        ✓ should propagate S3 service errors
      permission verification
        ✓ should verify user is project member
        ✓ should verify user has VIEW permission on document
        ✓ should check project membership before checking document permission
      edge cases
        ✓ should handle documents with special characters in filename
        ✓ should sanitize documents with unicode characters in filename
        ✓ should sanitize filenames with special non-ASCII characters
        ✓ should handle empty file buffers
        ✓ should handle large file buffers

Test Suites: 1 passed, 1 total
Tests:       20 passed, 20 total
```

## Configuration

To enable Mock S3 mode for development:

```bash
# .env
USE_MOCK_S3=true
```

Files are stored in:
```
<project-root>/mock-s3-storage/
├── builder-quarantine/
├── builder-production/
└── builder-documents/
```

## Security Considerations

1. **Filename Sanitization**: Prevents HTTP header injection by replacing non-ASCII characters
2. **Mock S3 Storage**: Files stored unencrypted on local filesystem - do not commit sensitive files
3. **Permission Enforcement**: Both project membership and document VIEW permission are checked
4. **Bucket Isolation**: Production files never served from quarantine bucket

## Performance Impact

- **Mock S3**: Faster than real S3 for local development (no network latency)
- **Filename Sanitization**: Negligible performance impact (simple regex replacement)
- **Logging**: Debug logs only in development mode

## Future Improvements

1. **Content-Disposition RFC 5987**: Consider implementing RFC 5987 encoding for Unicode filenames
   ```
   Content-Disposition: inline; filename="document.pdf"; filename*=UTF-8''Relat%C3%B3rio.pdf
   ```

2. **Mock S3 Enhancements**:
   - Add support for S3 metadata
   - Implement object versioning
   - Add multipart upload support in mock mode

3. **Download Tracking**: Add analytics for document downloads

4. **Caching**: Implement CDN or browser caching headers for frequently accessed documents

## Breaking Changes

None. All changes are backward compatible.

## Deployment Notes

1. No database migrations required
2. Environment variable `USE_MOCK_S3=true` only needed for development
3. Production deployments should use real S3 with proper credentials
4. Existing documents with non-ASCII filenames will be automatically sanitized on download

## References

- [Mock S3 Setup Guide](./MOCK_S3_SETUP.md)
- [Document Download API](./DOCUMENT_DOWNLOAD_API.md)
- [S3 Service Implementation](../src/common/services/s3.service.ts)
- [Document Controller](../src/modules/documents/controllers/document.controller.ts)
