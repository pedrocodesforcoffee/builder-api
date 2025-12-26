import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CostEntryAction } from '../enums/cost-entry-action.enum';

/**
 * Nested User DTO
 * Simplified user information for the user who performed the action
 */
class UserInfoDto {
  @ApiProperty({ description: 'User first name' })
  @Expose()
  firstName!: string;

  @ApiProperty({ description: 'User last name' })
  @Expose()
  lastName!: string;

  @ApiProperty({ description: 'User email address' })
  @Expose()
  email!: string;
}

/**
 * Cost Entry History Response DTO
 *
 * Complete audit trail record for a cost entry action.
 *
 * This DTO provides comprehensive tracking of all changes and actions
 * performed on a cost entry throughout its lifecycle. It includes:
 * - The specific action taken (created, updated, posted, voided, etc.)
 * - Detailed change tracking (before/after values in JSONB format)
 * - User attribution (who performed the action)
 * - Timestamp (when the action occurred)
 * - Context information (IP address, user agent, notes)
 *
 * The changes field is a JSONB object that stores the delta between
 * old and new values, enabling full reconstruction of the entry's history.
 *
 * Use cases:
 * - Compliance and audit requirements
 * - Dispute resolution and accountability
 * - Change tracking and rollback capabilities
 * - Security monitoring and forensics
 *
 * @example
 * {
 *   "id": "hist-123",
 *   "costEntryId": "entry-456",
 *   "action": "UPDATED",
 *   "changes": {
 *     "totalCost": { "old": 1000, "new": 1200 },
 *     "description": { "old": "Labor", "new": "Labor - Week 1" }
 *   },
 *   "performedById": "user-789",
 *   "performedAt": "2024-01-15T10:30:00Z",
 *   "ipAddress": "192.168.1.100",
 *   "userAgent": "Mozilla/5.0...",
 *   "notes": "Updated cost based on revised timesheet",
 *   "performedBy": {
 *     "firstName": "John",
 *     "lastName": "Doe",
 *     "email": "john.doe@example.com"
 *   }
 * }
 */
export class CostEntryHistoryResponseDto {
  @ApiProperty({
    description: 'History record UUID',
    example: 'hist-123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id!: string;

  @ApiProperty({
    description: 'Cost entry UUID that this history record belongs to',
    example: 'entry-123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  costEntryId!: string;

  @ApiProperty({
    description: 'Action performed on the cost entry',
    enum: CostEntryAction,
    example: CostEntryAction.UPDATED,
  })
  @Expose()
  action!: CostEntryAction;

  @ApiProperty({
    description: 'UUID of the user who performed the action',
    example: 'user-123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  performedById!: string;

  @ApiProperty({
    description: 'Timestamp when the action was performed',
    example: '2024-01-15T10:30:00Z',
  })
  @Expose()
  @Type(() => Date)
  performedAt!: Date;

  @ApiProperty({
    description: 'JSONB object containing the changes made (before/after values)',
    example: {
      totalCost: { old: 1000, new: 1200 },
      description: { old: 'Labor', new: 'Labor - Week 1' },
    },
    required: false,
  })
  @Expose()
  changes?: Record<string, any>;

  @ApiProperty({
    description: 'IP address from which the action was performed',
    example: '192.168.1.100',
    required: false,
  })
  @Expose()
  ipAddress?: string;

  @ApiProperty({
    description: 'User agent string of the client that performed the action',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    required: false,
  })
  @Expose()
  userAgent?: string;

  @ApiProperty({
    description: 'Additional notes or comments about the action',
    example: 'Updated cost based on revised timesheet from project manager',
    required: false,
  })
  @Expose()
  notes?: string;

  @ApiProperty({
    description: 'User who performed the action',
    type: UserInfoDto,
    required: false,
  })
  @Expose()
  @Type(() => UserInfoDto)
  performedBy?: UserInfoDto;
}
