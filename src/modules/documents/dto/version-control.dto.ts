import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsUUID,
  IsArray,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * ==================== CHECKOUT DTOS ====================
 */

export class CheckoutDocumentDto {
  @ApiPropertyOptional({
    description: 'Reason for checkout',
    example: 'Updating specifications',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;

  @ApiPropertyOptional({
    description: 'Lock duration in minutes (default: 30, max: 480)',
    example: 60,
    minimum: 1,
    maximum: 480,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(480)
  lockDurationMinutes?: number;
}

export class CheckoutResponseDto {
  @ApiProperty({
    description: 'Whether checkout was successful',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Document ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  documentId!: string;

  @ApiProperty({
    description: 'Lock expiration time',
    example: '2024-01-15T16:30:00Z',
  })
  lockExpiresAt!: Date;

  @ApiPropertyOptional({
    description: 'Message about the checkout',
    example: 'Document checked out successfully',
  })
  message?: string;
}

/**
 * ==================== CHECKIN DTOS ====================
 */

export enum VersionType {
  MAJOR = 'major',
  MINOR = 'minor',
  PATCH = 'patch',
}

export class CheckinDocumentDto {
  @ApiProperty({
    description: 'Commit message describing changes',
    example: 'Updated room dimensions per RFI-042',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  comment!: string;

  @ApiProperty({
    description: 'Type of version increment',
    enum: VersionType,
    example: VersionType.MINOR,
  })
  @IsEnum(VersionType)
  versionType!: VersionType;

  @ApiPropertyOptional({
    description: 'Revision label (e.g., "A", "B", "Rev 1")',
    example: 'B',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  revisionLabel?: string;

  @ApiPropertyOptional({
    description: 'Whether this is a significant version requiring approval',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;
}

export class CheckinResponseDto {
  @ApiProperty({
    description: 'Whether checkin was successful',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Document ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  documentId!: string;

  @ApiProperty({
    description: 'New version ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  versionId!: string;

  @ApiProperty({
    description: 'New version number',
    example: 3,
  })
  versionNumber!: number;

  @ApiPropertyOptional({
    description: 'New version label',
    example: '1.2',
  })
  versionLabel?: string;

  @ApiPropertyOptional({
    description: 'Message about the checkin',
    example: 'New version created successfully',
  })
  message?: string;
}

/**
 * ==================== FORCE UNLOCK DTOS ====================
 */

export class ForceUnlockDto {
  @ApiProperty({
    description: 'Reason for forcing unlock',
    example: 'User went on vacation, urgent changes needed',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}

export class ForceUnlockResponseDto {
  @ApiProperty({
    description: 'Whether unlock was successful',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Document ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  documentId!: string;

  @ApiPropertyOptional({
    description: 'Previous lock holder ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  previousLockHolder?: string;

  @ApiPropertyOptional({
    description: 'Message about the unlock',
    example: 'Document forcefully unlocked',
  })
  message?: string;
}

/**
 * ==================== VERSION COMPARISON DTOS ====================
 */

export class CompareVersionsDto {
  @ApiProperty({
    description: 'First version ID to compare',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  fromVersionId!: string;

  @ApiProperty({
    description: 'Second version ID to compare',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsUUID()
  toVersionId!: string;
}

export class VersionDiff {
  @ApiProperty({
    description: 'Field name that changed',
    example: 'name',
  })
  field!: string;

  @ApiProperty({
    description: 'Old value',
    example: 'Drawing A-101',
  })
  oldValue: any;

  @ApiProperty({
    description: 'New value',
    example: 'Drawing A-101 Rev B',
  })
  newValue: any;
}

export class CompareVersionsResponseDto {
  @ApiProperty({
    description: 'From version number',
    example: 1,
  })
  fromVersion!: number;

  @ApiProperty({
    description: 'To version number',
    example: 2,
  })
  toVersion!: number;

  @ApiProperty({
    description: 'From version label',
    example: '1.0',
  })
  fromLabel!: string;

  @ApiProperty({
    description: 'To version label',
    example: '1.1',
  })
  toLabel!: string;

  @ApiProperty({
    description: 'List of changes between versions',
    type: [VersionDiff],
  })
  differences!: VersionDiff[];

  @ApiProperty({
    description: 'Metadata comparison',
  })
  metadataChanges!: Record<string, any>;
}

/**
 * ==================== VERSION RESTORE DTOS ====================
 */

export class RestoreVersionDto {
  @ApiProperty({
    description: 'Version ID to restore',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  versionId!: string;

  @ApiProperty({
    description: 'Comment explaining why version is being restored',
    example: 'Reverting to approved version before unauthorized changes',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  comment!: string;

  @ApiPropertyOptional({
    description: 'Whether to create new version or replace current',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  createNewVersion?: boolean;
}

export class RestoreVersionResponseDto {
  @ApiProperty({
    description: 'Whether restore was successful',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Document ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  documentId!: string;

  @ApiProperty({
    description: 'Restored version ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  restoredVersionId!: string;

  @ApiPropertyOptional({
    description: 'New version ID if createNewVersion was true',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  newVersionId?: string;

  @ApiPropertyOptional({
    description: 'Message about the restore',
    example: 'Version restored successfully',
  })
  message?: string;
}

/**
 * ==================== VERSION HISTORY DTOS ====================
 */

export class VersionHistoryItemDto {
  @ApiProperty({
    description: 'Version ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  id!: string;

  @ApiProperty({
    description: 'Version number',
    example: 2,
  })
  versionNumber!: number;

  @ApiPropertyOptional({
    description: 'Version label',
    example: '1.1',
  })
  versionLabel?: string;

  @ApiProperty({
    description: 'Version comment',
    example: 'Updated specifications',
  })
  comment!: string;

  @ApiProperty({
    description: 'Created by user ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  createdById!: string;

  @ApiProperty({
    description: 'Created by user name',
    example: 'John Doe',
  })
  createdByName!: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T14:30:00Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1048576,
  })
  fileSize!: number;

  @ApiProperty({
    description: 'Whether this is the current version',
    example: true,
  })
  isCurrent!: boolean;
}

export class VersionHistoryResponseDto {
  @ApiProperty({
    description: 'Document ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  documentId!: string;

  @ApiProperty({
    description: 'Total version count',
    example: 5,
  })
  totalVersions!: number;

  @ApiProperty({
    description: 'Current version number',
    example: 5,
  })
  currentVersion!: number;

  @ApiProperty({
    description: 'List of all versions',
    type: [VersionHistoryItemDto],
  })
  versions!: VersionHistoryItemDto[];
}

/**
 * ==================== DISTRIBUTION TRACKING DTOS ====================
 */

export class RecordDistributionDto {
  @ApiProperty({
    description: 'Version ID being distributed',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  versionId!: string;

  @ApiProperty({
    description: 'Distribution type',
    enum: ['download', 'transmittal', 'email', 'shared_link', 'api'],
    example: 'email',
  })
  @IsString()
  distributionType!: string;

  @ApiProperty({
    description: 'Recipient user ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsUUID()
  recipientId!: string;

  @ApiProperty({
    description: 'Recipient name',
    example: 'Jane Smith',
  })
  @IsString()
  @MaxLength(255)
  recipientName!: string;

  @ApiPropertyOptional({
    description: 'Recipient email',
    example: 'jane.smith@example.com',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  recipientEmail?: string;

  @ApiPropertyOptional({
    description: 'Recipient company',
    example: 'Acme Construction',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  recipientCompany?: string;

  @ApiPropertyOptional({
    description: 'Transmittal number',
    example: 'TR-2024-001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  transmittalNumber?: string;

  @ApiPropertyOptional({
    description: 'Reference number',
    example: 'REF-001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;

  @ApiPropertyOptional({
    description: 'Distribution notes',
    example: 'Sent for approval',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RecordDistributionResponseDto {
  @ApiProperty({
    description: 'Whether distribution was recorded successfully',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Distribution record ID',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  distributionId!: string;

  @ApiPropertyOptional({
    description: 'Message',
    example: 'Distribution recorded successfully',
  })
  message?: string;
}

/**
 * ==================== LOCK STATUS DTOS ====================
 */

export class LockStatusDto {
  @ApiProperty({
    description: 'Whether document is locked',
    example: true,
  })
  isLocked!: boolean;

  @ApiPropertyOptional({
    description: 'User ID who locked the document',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  lockedById?: string;

  @ApiPropertyOptional({
    description: 'User name who locked the document',
    example: 'John Doe',
  })
  lockedByName?: string;

  @ApiPropertyOptional({
    description: 'When document was locked',
    example: '2024-01-15T14:00:00Z',
  })
  lockedAt?: Date;

  @ApiPropertyOptional({
    description: 'When lock expires',
    example: '2024-01-15T15:00:00Z',
  })
  lockExpiresAt?: Date;

  @ApiPropertyOptional({
    description: 'Minutes until lock expires',
    example: 45,
  })
  lockExpiresInMinutes?: number;

  @ApiPropertyOptional({
    description: 'Whether current user can unlock',
    example: true,
  })
  canUnlock?: boolean;
}
