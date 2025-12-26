import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CoAction } from '../enums/co-action.enum';

/**
 * Change Order History Response DTO
 *
 * Response DTO for change order history entries.
 * Provides audit trail information for all change order actions.
 */
export class ChangeOrderHistoryResponseDto {
  @ApiProperty({
    description: 'History entry ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id!: string;

  @ApiProperty({
    description: 'Change order ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  changeOrderId!: string;

  @ApiProperty({
    description: 'Change order type',
    enum: ['PCO', 'OCO', 'CCO', 'PACKAGE'],
    example: 'OCO',
  })
  @Expose()
  changeOrderType!: 'PCO' | 'OCO' | 'CCO' | 'PACKAGE';

  @ApiProperty({
    description: 'Action performed',
    enum: CoAction,
    example: CoAction.APPROVED,
  })
  @Expose()
  action!: CoAction;

  @ApiProperty({
    description: 'Previous status (if applicable)',
    example: 'PENDING_APPROVAL',
    nullable: true,
  })
  @Expose()
  previousStatus?: string;

  @ApiProperty({
    description: 'New status (if applicable)',
    example: 'APPROVED',
    nullable: true,
  })
  @Expose()
  newStatus?: string;

  @ApiProperty({
    description: 'Detailed change information',
    example: { field: 'amount', oldValue: 10000, newValue: 12000 },
    nullable: true,
  })
  @Expose()
  changes?: Record<string, any>;

  @ApiProperty({
    description: 'Optional notes about the action',
    example: 'Approved after review with project team',
    nullable: true,
  })
  @Expose()
  notes?: string;

  @ApiProperty({
    description: 'User ID who performed the action',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  performedBy!: string;

  @ApiProperty({
    description: 'Timestamp when action was performed',
    example: '2024-01-15T10:30:00Z',
  })
  @Expose()
  @Type(() => Date)
  performedAt!: Date;
}
