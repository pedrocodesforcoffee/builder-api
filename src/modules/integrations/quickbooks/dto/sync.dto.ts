import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID, IsString, IsBoolean } from 'class-validator';
import { QBEntityType, QBSyncDirection, QBSyncStatus } from '../enums';

/**
 * Trigger Sync Request DTO
 */
export class TriggerSyncDto {
  @ApiProperty({ description: 'Entity type to sync', enum: QBEntityType })
  @IsEnum(QBEntityType)
  entityType!: QBEntityType;

  @ApiPropertyOptional({ description: 'Specific entity ID to sync' })
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiProperty({ description: 'Sync direction', enum: QBSyncDirection })
  @IsEnum(QBSyncDirection)
  direction!: QBSyncDirection;

  @ApiPropertyOptional({ description: 'Force sync even if recently synced' })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

/**
 * Sync History Response DTO
 */
export class QBSyncHistoryResponseDto {
  @ApiProperty({ description: 'Sync history ID' })
  id!: string;

  @ApiProperty({ description: 'Sync type', enum: ['CREATE', 'UPDATE', 'DELETE', 'READ'] })
  syncType!: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ';

  @ApiProperty({ description: 'Sync direction', enum: QBSyncDirection })
  syncDirection!: QBSyncDirection;

  @ApiProperty({ description: 'QuickBooks entity type', enum: QBEntityType })
  qbEntityType!: QBEntityType;

  @ApiPropertyOptional({ description: 'QuickBooks entity ID' })
  qbEntityId?: string;

  @ApiProperty({ description: 'Platform entity type' })
  platformEntityType!: string;

  @ApiProperty({ description: 'Platform entity ID' })
  platformEntityId!: string;

  @ApiProperty({ description: 'Sync status', enum: QBSyncStatus })
  status!: QBSyncStatus;

  @ApiProperty({ description: 'Sync started timestamp' })
  startedAt!: Date;

  @ApiPropertyOptional({ description: 'Sync completed timestamp' })
  completedAt?: Date;

  @ApiPropertyOptional({ description: 'Duration in milliseconds' })
  durationMs?: number;

  @ApiProperty({ description: 'Trigger source', enum: ['MANUAL', 'SCHEDULED', 'EVENT', 'WEBHOOK', 'RETRY'] })
  triggerSource!: 'MANUAL' | 'SCHEDULED' | 'EVENT' | 'WEBHOOK' | 'RETRY';

  @ApiPropertyOptional({ description: 'Error message if failed' })
  errorMessage?: string;

  @ApiPropertyOptional({ description: 'Error code if failed' })
  errorCode?: string;

  @ApiProperty({ description: 'Retry count' })
  retryCount!: number;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;
}

/**
 * Sync Error Response DTO
 */
export class QBSyncErrorResponseDto {
  @ApiProperty({ description: 'Error ID' })
  id!: string;

  @ApiProperty({ description: 'Error type', enum: ['AUTH', 'RATE_LIMIT', 'VALIDATION', 'CONFLICT', 'NETWORK', 'MAPPING', 'OTHER'] })
  errorType!: 'AUTH' | 'RATE_LIMIT' | 'VALIDATION' | 'CONFLICT' | 'NETWORK' | 'MAPPING' | 'OTHER';

  @ApiPropertyOptional({ description: 'Error code' })
  errorCode?: string;

  @ApiProperty({ description: 'Error message' })
  errorMessage!: string;

  @ApiProperty({ description: 'QuickBooks entity type', enum: QBEntityType })
  qbEntityType!: QBEntityType;

  @ApiPropertyOptional({ description: 'QuickBooks entity ID' })
  qbEntityId?: string;

  @ApiProperty({ description: 'Platform entity type' })
  platformEntityType!: string;

  @ApiProperty({ description: 'Platform entity ID' })
  platformEntityId!: string;

  @ApiProperty({ description: 'Sync direction', enum: ['TO_QB', 'FROM_QB'] })
  syncDirection!: 'TO_QB' | 'FROM_QB';

  @ApiProperty({ description: 'Retry count' })
  retryCount!: number;

  @ApiProperty({ description: 'Maximum retries allowed' })
  maxRetries!: number;

  @ApiPropertyOptional({ description: 'Next retry timestamp' })
  nextRetryAt?: Date;

  @ApiProperty({ description: 'Is error resolved' })
  resolved!: boolean;

  @ApiPropertyOptional({ description: 'Resolution type' })
  resolutionType?: 'AUTO_RETRY' | 'MANUAL_FIX' | 'IGNORED' | 'DELETED';

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt!: Date;
}

/**
 * Resolve Sync Error DTO
 */
export class ResolveSyncErrorDto {
  @ApiProperty({ description: 'Error ID' })
  @IsUUID()
  errorId!: string;

  @ApiProperty({ description: 'Resolution type', enum: ['AUTO_RETRY', 'MANUAL_FIX', 'IGNORED', 'DELETED'] })
  @IsEnum(['AUTO_RETRY', 'MANUAL_FIX', 'IGNORED', 'DELETED'])
  resolutionType!: 'AUTO_RETRY' | 'MANUAL_FIX' | 'IGNORED' | 'DELETED';

  @ApiPropertyOptional({ description: 'Resolution notes' })
  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}
