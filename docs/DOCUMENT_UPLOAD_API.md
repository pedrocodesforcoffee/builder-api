# Document Upload API Documentation

## Overview

The Document Upload API provides a complete solution for uploading documents to the Builder platform with support for both single and multipart uploads. The system handles large files efficiently, performs automatic processing (virus scanning, thumbnail generation, OCR, metadata extraction), and maintains complete version history.

## Features

- **Single and Multipart Uploads**: Support for files up to 5GB
- **Direct-to-S3 Uploads**: Pre-signed URLs for efficient client-side uploads
- **Automatic Processing**: Virus scanning, thumbnails, OCR, and metadata extraction
- **Version Control**: Complete document version history
- **Upload Tracking**: Real-time status monitoring
- **Cleanup Jobs**: Automatic cleanup of expired/abandoned uploads

## Base URL

```
/api/documents/upload
```

## Authentication

All endpoints require authentication via JWT Bearer token:

```
Authorization: Bearer <your-jwt-token>
```

## File Size and Type Limits

- **Maximum file size**: 5GB
- **Single upload limit**: 100MB (files larger than this should use multipart upload)
- **Allowed MIME types**:
  - Documents: `application/pdf`
  - Images: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/tiff`
  - CAD: `application/dwg`, `application/dxf`
  - Office: `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

---

## Endpoints

### 1. Initiate Single Upload

Initialize a single-file upload and receive pre-signed S3 URL.

**Endpoint:** `POST /api/documents/upload/single/initiate`

**Request Body:**

```json
{
  "projectId": "uuid",
  "fileName": "string",
  "fileSize": 1024000,
  "mimeType": "application/pdf",
  "documentName": "string",
  "documentType": "specification|drawing|photo|other",
  "description": "string (optional)",
  "tags": ["string"] (optional)
}
```

**Response:** `201 Created`

```json
{
  "uploadId": "uuid",
  "uploadUrl": "https://s3.amazonaws.com/...",
  "uploadFields": {
    "key": "string",
    "policy": "string",
    "x-amz-algorithm": "string",
    "x-amz-credential": "string",
    "x-amz-date": "string",
    "x-amz-signature": "string"
  },
  "s3Key": "string",
  "expiresAt": "2024-01-01T00:00:00.000Z"
}
```

**Usage Flow:**

1. Client calls this endpoint to initiate upload
2. Client receives pre-signed POST URL and fields
3. Client performs POST upload directly to S3 using the URL and fields
4. Client calls complete endpoint after S3 upload succeeds

**Example:**

```bash
curl -X POST https://api.builder.com/api/documents/upload/single/initiate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "123e4567-e89b-12d3-a456-426614174000",
    "fileName": "blueprint.pdf",
    "fileSize": 2048000,
    "mimeType": "application/pdf",
    "documentName": "Foundation Blueprint",
    "documentType": "drawing"
  }'
```

---

### 2. Initiate Multipart Upload

Initialize a multipart upload for files larger than 100MB.

**Endpoint:** `POST /api/documents/upload/multipart/initiate`

**Request Body:**

```json
{
  "projectId": "uuid",
  "fileName": "string",
  "fileSize": 104857600,
  "mimeType": "application/pdf",
  "documentName": "string",
  "documentType": "specification|drawing|photo|other",
  "description": "string (optional)",
  "tags": ["string"] (optional)
}
```

**Response:** `201 Created`

```json
{
  "uploadId": "uuid",
  "s3UploadId": "string",
  "s3Key": "string",
  "partSize": 10485760,
  "totalParts": 10
}
```

**Usage Flow:**

1. Client calls this endpoint to initiate multipart upload
2. Client receives uploadId, s3UploadId, partSize, and totalParts
3. Client splits file into parts of `partSize` bytes
4. For each part, client calls get part upload URL endpoint
5. Client uploads each part to S3 using the pre-signed URL
6. Client calls complete multipart upload endpoint with ETags

---

### 3. Get Part Upload URL

Get pre-signed URL for uploading a specific part in multipart upload.

**Endpoint:** `GET /api/documents/upload/:uploadId/part/:partNumber`

**Path Parameters:**

- `uploadId`: UUID of the upload
- `partNumber`: Part number (1-indexed, max 10000)

**Response:** `200 OK`

```json
{
  "partNumber": 1,
  "uploadUrl": "https://s3.amazonaws.com/..."
}
```

**Example:**

```bash
curl -X GET https://api.builder.com/api/documents/upload/123e4567.../part/1 \
  -H "Authorization: Bearer <token>"
```

---

### 4. Complete Multipart Upload

Complete a multipart upload after all parts have been uploaded.

**Endpoint:** `POST /api/documents/upload/multipart/:uploadId/complete`

**Path Parameters:**

- `uploadId`: UUID of the upload

**Request Body:**

```json
{
  "parts": [
    { "PartNumber": 1, "ETag": "etag-string-1" },
    { "PartNumber": 2, "ETag": "etag-string-2" }
  ]
}
```

**Response:** `200 OK`

```json
{
  "uploadId": "uuid",
  "status": "processing",
  "documentId": "uuid",
  "versionId": "uuid"
}
```

---

### 5. Complete Single Upload

Complete a single upload after the file has been uploaded to S3.

**Endpoint:** `POST /api/documents/upload/single/:uploadId/complete`

**Path Parameters:**

- `uploadId`: UUID of the upload

**Response:** `200 OK`

```json
{
  "uploadId": "uuid",
  "status": "processing",
  "documentId": "uuid",
  "versionId": "uuid"
}
```

---

### 6. Get Upload Status

Get the current status of an upload including processing progress.

**Endpoint:** `GET /api/documents/upload/:uploadId/status`

**Path Parameters:**

- `uploadId`: UUID of the upload

**Response:** `200 OK`

```json
{
  "uploadId": "uuid",
  "status": "processing",
  "documentId": "uuid",
  "versionId": "uuid",
  "documentUrl": "https://s3.amazonaws.com/...",
  "processingStatus": {
    "virusScan": {
      "status": "completed",
      "scannedAt": "2024-01-01T00:00:00.000Z",
      "clean": true
    },
    "thumbnails": {
      "status": "completed",
      "urls": {
        "small": "https://...",
        "medium": "https://...",
        "large": "https://..."
      }
    },
    "ocr": {
      "status": "completed",
      "textLength": 5000,
      "language": "eng"
    },
    "metadata": {
      "status": "completed",
      "fieldsExtracted": 10
    }
  }
}
```

**Status Values:**

- `initiated`: Upload has been initialized
- `uploading`: File is being uploaded to S3
- `uploaded`: File upload to S3 is complete
- `processing`: Background processing (virus scan, thumbnails, OCR, metadata)
- `complete`: Upload and all processing complete
- `failed`: Upload or processing failed
- `aborted`: Upload was aborted by user

**Processing Status Values:**

- `pending`: Not started
- `processing`: Currently being processed
- `completed`: Processing successful
- `failed`: Processing failed
- `skipped`: Processing was skipped (e.g., file type not supported)

---

### 7. Abort Upload

Abort an in-progress upload and clean up resources.

**Endpoint:** `DELETE /api/documents/upload/:uploadId`

**Path Parameters:**

- `uploadId`: UUID of the upload

**Response:** `200 OK`

```json
{
  "message": "Upload aborted successfully"
}
```

---

### 8. List Project Uploads

List all uploads for a specific project.

**Endpoint:** `GET /api/documents/upload/project/:projectId`

**Path Parameters:**

- `projectId`: UUID of the project

**Query Parameters:**

- `status`: Filter by status (optional)
- `limit`: Number of results (default: 50, max: 100)
- `offset`: Pagination offset (default: 0)

**Response:** `200 OK`

```json
{
  "uploads": [
    {
      "uploadId": "uuid",
      "fileName": "string",
      "fileSize": 1024000,
      "mimeType": "string",
      "documentName": "string",
      "documentType": "string",
      "status": "complete",
      "uploadType": "single",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "completedAt": "2024-01-01T00:05:00.000Z"
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

---

## Upload Flow Examples

### Single Upload Flow

```
1. Client: POST /upload/single/initiate
   Server: Returns { uploadId, uploadUrl, uploadFields }

2. Client: POST to S3 using uploadUrl and uploadFields
   S3: Returns 204 No Content

3. Client: POST /upload/single/:uploadId/complete
   Server: Returns { uploadId, status: "processing", documentId, versionId }

4. Client: GET /upload/:uploadId/status (poll for completion)
   Server: Returns current status and processing progress

5. Client: GET /upload/:uploadId/status (when status is "complete")
   Server: Returns { status: "complete", documentUrl, processingStatus }
```

### Multipart Upload Flow

```
1. Client: POST /upload/multipart/initiate
   Server: Returns { uploadId, s3UploadId, partSize, totalParts }

2. Client: Split file into parts of partSize

3. For each part:
   Client: GET /upload/:uploadId/part/:partNumber
   Server: Returns { partNumber, uploadUrl }

   Client: PUT to S3 using uploadUrl
   S3: Returns ETag in response header

4. Client: POST /upload/multipart/:uploadId/complete with all ETags
   Server: Returns { uploadId, status: "processing", documentId, versionId }

5. Client: Poll GET /upload/:uploadId/status until complete
```

---

## Processing Pipeline

After upload completion, documents go through an automatic processing pipeline:

### 1. Virus Scan (Priority 1)

- Uses ClamAV to scan for viruses
- If virus detected: upload marked as FAILED, file deleted from S3
- If clean: processing continues

### 2. Thumbnail Generation (Priority 2)

- Generates 3 thumbnail sizes: 150x150, 300x300, 600x600
- Supported for: images and PDFs
- Stores thumbnails in S3 with pre-signed URLs

### 3. OCR Text Extraction (Priority 3)

- Extracts text from PDFs using pdf-parse
- Extracts text from images using Tesseract OCR
- Stores extracted text for full-text search

### 4. Metadata Extraction (Priority 3)

- Extracts PDF metadata (title, author, pages, creation date)
- Extracts image EXIF data (camera, GPS, date taken)
- Stores metadata in document version

---

## Error Responses

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "File size exceeds maximum allowed size of 5GB",
  "error": "Bad Request"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Upload not found",
  "error": "Not Found"
}
```

### 409 Conflict

```json
{
  "statusCode": 409,
  "message": "Upload is not in a valid state for this operation",
  "error": "Conflict"
}
```

---

## Rate Limits

- **Upload initiation**: 100 requests per minute per user
- **Status checks**: 1000 requests per minute per user
- **Part URL requests**: 500 requests per minute per upload

---

## Cleanup and Expiry

- **Initiated uploads**: Expire after 24 hours if not completed
- **Failed uploads**: Retained for 7 days for debugging, then deleted
- **Cleanup job**: Runs daily at 2 AM to remove expired uploads

---

## Best Practices

1. **Use multipart upload for files > 100MB** for better reliability and resumability
2. **Implement exponential backoff** when polling upload status
3. **Handle S3 upload failures** gracefully and call abort endpoint
4. **Store ETags from S3 responses** when uploading multipart parts
5. **Monitor upload status** and handle processing failures appropriately
6. **Set appropriate timeouts** for long-running uploads

---

## Code Examples

### JavaScript/TypeScript Example (Single Upload)

```typescript
async function uploadDocument(file: File, projectId: string) {
  // 1. Initiate upload
  const initResponse = await fetch('/api/documents/upload/single/initiate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      projectId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      documentName: file.name,
      documentType: 'specification'
    })
  });

  const { uploadId, uploadUrl, uploadFields } = await initResponse.json();

  // 2. Upload to S3
  const formData = new FormData();
  Object.entries(uploadFields).forEach(([key, value]) => {
    formData.append(key, value);
  });
  formData.append('file', file);

  await fetch(uploadUrl, {
    method: 'POST',
    body: formData
  });

  // 3. Complete upload
  const completeResponse = await fetch(
    `/api/documents/upload/single/${uploadId}/complete`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  const { documentId, versionId } = await completeResponse.json();

  // 4. Poll for completion
  let status = 'processing';
  while (status === 'processing') {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const statusResponse = await fetch(
      `/api/documents/upload/${uploadId}/status`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    const statusData = await statusResponse.json();
    status = statusData.status;
  }

  return { uploadId, documentId, versionId };
}
```

---

## Support

For issues or questions about the Document Upload API, contact the development team or open an issue in the project repository.
