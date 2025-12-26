import { ApiProperty } from '@nestjs/swagger';
import { DocumentStatus } from '../enums';

export class SingleUploadResponseDto {
  @ApiProperty({
    description: 'Unique upload ID for tracking',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  uploadId!: string;

  @ApiProperty({
    description: 'Upload type',
    example: 'single',
  })
  uploadType!: 'single';

  @ApiProperty({
    description: 'Pre-signed URL for direct S3 upload (PUT request)',
    example: 'https://bucket.s3.amazonaws.com/path/to/file?X-Amz-Signature=...',
  })
  presignedUrl!: string;

  @ApiProperty({
    description: 'When the pre-signed URL expires (ISO 8601)',
    example: '2025-01-15T12:30:00Z',
  })
  presignedUrlExpires!: string;

  @ApiProperty({
    description: 'S3 key where file will be stored',
    example: 'projects/123/documents/1234567890-uuid/file.pdf',
  })
  s3Key!: string;

  @ApiProperty({
    description: 'Maximum file size allowed',
    example: 5368709120,
  })
  maxFileSize!: number;
}

export class MultipartUploadPartDto {
  @ApiProperty({ description: 'Part number (1-indexed)', example: 1 })
  partNumber!: number;

  @ApiProperty({
    description: 'Pre-signed URL for this part',
    example: 'https://bucket.s3.amazonaws.com/path?partNumber=1&...',
  })
  presignedUrl!: string;

  @ApiProperty({
    description: 'When this pre-signed URL expires',
    example: '2025-01-15T12:30:00Z',
  })
  presignedUrlExpires!: string;
}

export class MultipartUploadResponseDto {
  @ApiProperty({
    description: 'Unique upload ID for tracking',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  uploadId!: string;

  @ApiProperty({
    description: 'Upload type',
    example: 'multipart',
  })
  uploadType!: 'multipart';

  @ApiProperty({
    description: "S3's multipart upload ID",
    example: 'exampleUploadId',
  })
  s3UploadId!: string;

  @ApiProperty({
    description: 'S3 key where file will be stored',
    example: 'projects/123/documents/1234567890-uuid/file.pdf',
  })
  s3Key!: string;

  @ApiProperty({
    description: 'Size of each part in bytes',
    example: 10485760,
  })
  partSize!: number;

  @ApiProperty({
    description: 'Total number of parts',
    example: 10,
  })
  totalParts!: number;

  @ApiProperty({
    description: 'Pre-signed URLs for each part',
    type: [MultipartUploadPartDto],
  })
  parts!: MultipartUploadPartDto[];
}

export type UploadResponseDto =
  | SingleUploadResponseDto
  | MultipartUploadResponseDto;

export class CompleteUploadResponseDto {
  @ApiProperty({
    description: 'Created document information',
  })
  document!: {
    id: string;
    name: string;
    number: string | null;
    currentVersionId: string;
    status: DocumentStatus;
  };

  @ApiProperty({
    description: 'Created version information',
  })
  version!: {
    id: string;
    versionNumber: number;
    fileName: string;
    fileSize: number;
  };
}

export class AbortUploadResponseDto {
  @ApiProperty({ description: 'Whether abort was successful' })
  success!: boolean;

  @ApiProperty({ description: 'Cleanup statistics' })
  cleanedUp!: {
    s3Objects: number;
    dbRecords: number;
  };
}

export class UploadStatusResponseDto {
  @ApiProperty({ description: 'Upload ID' })
  uploadId!: string;

  @ApiProperty({
    description: 'Current status',
    enum: [
      'initiated',
      'uploading',
      'processing',
      'complete',
      'failed',
      'aborted',
    ],
  })
  status!: string;

  @ApiProperty({ description: 'Associated document ID (if complete)' })
  documentId?: string;

  @ApiProperty({ description: 'Associated version ID (if complete)' })
  versionId?: string;

  @ApiProperty({ description: 'Error information (if failed)' })
  error?: {
    code: string;
    message: string;
  };
}
