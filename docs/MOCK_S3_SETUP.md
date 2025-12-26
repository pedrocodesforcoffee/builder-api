# Mock S3 Setup Guide

This guide explains how to configure and use Mock S3 mode for local development without requiring AWS credentials or an actual S3 connection.

## Overview

Mock S3 mode allows developers to work with the document management system locally by storing files on the local filesystem instead of AWS S3. This is particularly useful for:

- Local development without AWS credentials
- Testing without S3 costs
- Faster development iteration
- CI/CD pipelines without AWS configuration

## Configuration

### Environment Variables

Set the following environment variable to enable Mock S3 mode:

```bash
USE_MOCK_S3=true
```

### Optional Environment Variables

```bash
# AWS region (default: us-east-1) - still used for bucket naming conventions
AWS_REGION=us-east-1

# Default bucket name (default: builder-documents)
AWS_S3_BUCKET=builder-documents
```

### Example .env File

```env
# Enable Mock S3 for local development
USE_MOCK_S3=true

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/builder_db

# JWT
JWT_SECRET=your-secret-key

# Port
PORT=3000
```

## How Mock S3 Works

### File Storage Location

When Mock S3 is enabled, files are stored in the following directory structure:

```
<project-root>/mock-s3-storage/
├── builder-quarantine/       # Quarantine bucket (pre-virus scan)
│   └── <s3-key-path>
├── builder-production/        # Production bucket (post-virus scan)
│   └── <s3-key-path>
└── <custom-bucket-name>/      # Custom buckets
    └── <s3-key-path>
```

### Automatic Directory Creation

The S3 service automatically creates the necessary directory structure on startup:

```typescript
// From S3Service constructor (s3.service.ts:52-66)
if (this.useMockS3) {
  this.logger.log(`S3 Service initialized in MOCK MODE - storing files locally at: ${this.mockStoragePath}`);
  this.initializeMockStorage();
}
```

### File Operations

All S3 operations are translated to filesystem operations:

| S3 Operation | Mock Implementation |
|--------------|---------------------|
| `getObject()` | `fs.readFile()` |
| `putObject()` | `fs.writeFile()` + `fs.mkdir()` |
| `deleteObject()` | `fs.unlink()` |
| `copyObject()` | `fs.copyFile()` |

## Usage Examples

### Uploading a File

```typescript
// The code remains the same - S3Service automatically uses mock mode
await s3Service.putObject(
  's3Key',
  fileBuffer,
  'application/pdf',
  'builder-quarantine'
);

// File is written to:
// <project-root>/mock-s3-storage/builder-quarantine/<s3Key>
```

### Downloading a File

```typescript
// The code remains the same
const buffer = await s3Service.getObject(
  's3Key',
  'builder-production'
);

// File is read from:
// <project-root>/mock-s3-storage/builder-production/<s3Key>
```

### Testing with Mock S3

Mock S3 integrates seamlessly with Jest tests:

```typescript
describe('Document Download with Mock S3', () => {
  beforeEach(() => {
    // Mock fs.readFile for tests
    (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('test content'));
  });

  it('should download document', async () => {
    const buffer = await s3Service.getObject('test.pdf');
    expect(buffer.toString()).toBe('test content');
  });
});
```

## Bucket Architecture

The system uses a two-bucket architecture for security:

### Quarantine Bucket (`builder-quarantine`)

- Files are uploaded here first
- Files remain in quarantine until virus scan passes
- **SECURITY**: Never serve files directly from quarantine

```typescript
const quarantineBucket = s3Service.getQuarantineBucket();
// Returns: 'builder-quarantine'
```

### Production Bucket (`builder-production`)

- Only verified, safe files are stored here
- Files are moved here after successful virus scan
- Public download endpoints serve files from this bucket

```typescript
const productionBucket = s3Service.getProductionBucket();
// Returns: 'builder-production'
```

## Development Workflow

### Starting Development Server

1. Set `USE_MOCK_S3=true` in your `.env` file
2. Start the development server:
   ```bash
   npm run start:dev
   ```
3. Look for the log message:
   ```
   S3 Service initialized in MOCK MODE - storing files locally at: /path/to/project/mock-s3-storage
   ```

### Inspecting Stored Files

You can directly inspect files in the mock storage directory:

```bash
# List all files in mock storage
ls -R mock-s3-storage/

# View a specific file
cat mock-s3-storage/builder-production/projects/123/documents/file.pdf

# Check file metadata
stat mock-s3-storage/builder-production/projects/123/documents/file.pdf
```

### Seeding Test Data

To pre-populate mock storage with test files:

```bash
# Create test directories
mkdir -p mock-s3-storage/builder-production/projects/test-project-id/documents

# Copy test files
cp test-fixtures/sample.pdf mock-s3-storage/builder-production/projects/test-project-id/documents/
```

## Error Handling

### File Not Found

When a file doesn't exist, Mock S3 throws a consistent error:

```typescript
try {
  await s3Service.getObject('non-existent.pdf');
} catch (error) {
  console.error(error.message);
  // Error: Object not found: non-existent.pdf
}
```

### Permission Errors

If the application doesn't have write permissions:

```
Error: EACCES: permission denied, mkdir 'mock-s3-storage/builder-production'
```

**Solution**: Ensure the application has write permissions to the project directory.

## Switching Between Mock and Real S3

### Enabling Real S3

1. Remove or set to false:
   ```env
   USE_MOCK_S3=false
   ```

2. Add AWS credentials:
   ```env
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=your-bucket-name
   ```

3. Restart the application

### Migrating Mock Data to Real S3

To migrate files from mock storage to real S3:

```bash
# Use AWS CLI to sync
aws s3 sync mock-s3-storage/builder-production/ s3://your-bucket-name/ --region us-east-1
```

## Testing

### Unit Tests

Mock S3 is automatically used in unit tests. See `s3.service.spec.ts:308` for examples.

### Integration Tests

For integration tests with mock S3:

```typescript
describe('Document Upload (Integration)', () => {
  beforeAll(async () => {
    process.env.USE_MOCK_S3 = 'true';
    // Initialize test module
  });

  it('should upload and download file', async () => {
    // Test implementation
  });
});
```

## Debugging

### Enable Debug Logging

The S3 service includes debug logging for mock operations:

```typescript
// From s3.service.ts:312-322
this.logger.debug(`[MOCK S3 getObject] Reading file from: ${filePath}`);
this.logger.debug(`[MOCK S3 getObject] Bucket: ${bucket}, Key: ${key}`);
```

### Common Issues

1. **Files not persisting**: Check that `mock-s3-storage/` is not in `.gitignore` if you want to commit test data
2. **Permission denied**: Ensure write permissions for the project directory
3. **File not found**: Verify the S3 key path matches the filesystem path exactly

## Performance Considerations

Mock S3 has different performance characteristics than real S3:

- **Faster**: No network latency
- **Synchronous**: Local filesystem operations are typically faster
- **Limited Concurrency**: Filesystem operations may have different concurrency limits than S3

For production-like performance testing, use real S3.

## Security Notes

- Mock S3 stores files **unencrypted** on the local filesystem
- Do not commit sensitive files in `mock-s3-storage/` to version control
- Add `mock-s3-storage/` to `.gitignore` for production repositories

## Related Documentation

- [Document Download API](./DOCUMENT_DOWNLOAD_API.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [S3 Service Implementation](../src/common/services/s3.service.ts)
