import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

/**
 * Budget Snapshot Response DTO
 *
 * Response DTO for budget snapshot data.
 * Contains the snapshot metadata and summary fields.
 * The full snapshot data (JSONB) is not included by default for performance.
 */
export class SnapshotResponseDto {
  @ApiProperty({
    description: 'Snapshot ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id!: string;

  @ApiProperty({
    description: 'Budget ID',
    example: '123e4567-e89b-12d3-a456-426614174111',
  })
  @Expose()
  budgetId!: string;

  @ApiProperty({
    description: 'Snapshot name',
    example: 'Month End - January 2024',
  })
  @Expose()
  name!: string;

  @ApiProperty({
    description: 'Snapshot description',
    example: 'Budget snapshot before Change Order #123',
    required: false,
  })
  @Expose()
  description?: string;

  @ApiProperty({
    description: 'Original budget amount',
    example: 1500000.0,
  })
  @Expose()
  originalAmount!: number;

  @ApiProperty({
    description: 'Revised budget amount',
    example: 1600000.0,
  })
  @Expose()
  revisedAmount!: number;

  @ApiProperty({
    description: 'Committed cost',
    example: 800000.0,
  })
  @Expose()
  committedCost!: number;

  @ApiProperty({
    description: 'Actual cost',
    example: 650000.0,
  })
  @Expose()
  actualCost!: number;

  @ApiProperty({
    description: 'User ID who created the snapshot',
    example: '123e4567-e89b-12d3-a456-426614174222',
  })
  @Expose()
  createdById!: string;

  @ApiProperty({
    description: 'Snapshot creation timestamp',
    example: '2024-01-31T23:59:59Z',
  })
  @Expose()
  @Type(() => Date)
  createdAt!: Date;
}

/**
 * Budget Snapshot Detail Response DTO
 *
 * Extended response DTO that includes the full snapshot data.
 * Used when clients need the complete budget + line items at snapshot time.
 */
export class SnapshotDetailResponseDto extends SnapshotResponseDto {
  @ApiProperty({
    description: 'Complete snapshot data (budget + line items)',
    example: {
      budget: {
        id: '123e4567-e89b-12d3-a456-426614174111',
        name: 'Original Budget',
        totalBudget: 1500000.0,
      },
      lineItems: [
        {
          id: '123e4567-e89b-12d3-a456-426614174333',
          costCodeId: '123e4567-e89b-12d3-a456-426614174444',
          budgetedCost: 100000.0,
        },
      ],
    },
  })
  @Expose()
  snapshotData!: {
    budget: Record<string, any>;
    lineItems: Record<string, any>[];
  };
}
