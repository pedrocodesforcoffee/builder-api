import { ApiProperty } from '@nestjs/swagger';
import { CommitmentStatus } from '../enums/commitment-status.enum';
import { CommitmentType } from '../enums/commitment-type.enum';

/**
 * Commitment Summary DTO
 *
 * Comprehensive commitment overview with financial metrics.
 */
export class CommitmentSummaryDto {
  @ApiProperty({
    description: 'Commitment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  commitmentId!: string;

  @ApiProperty({
    description: 'Commitment number',
    example: 'SC-001',
  })
  number!: string;

  @ApiProperty({
    description: 'Commitment title',
    example: 'HVAC Installation',
  })
  title!: string;

  @ApiProperty({
    description: 'Commitment type',
    enum: CommitmentType,
    example: CommitmentType.SUBCONTRACT,
  })
  type!: CommitmentType;

  @ApiProperty({
    description: 'Commitment status',
    enum: CommitmentStatus,
    example: CommitmentStatus.ACTIVE,
  })
  status!: CommitmentStatus;

  @ApiProperty({
    description: 'Vendor/subcontractor name',
    example: 'ACME HVAC Systems',
  })
  vendorName!: string;

  @ApiProperty({
    description: 'Original commitment amount',
    example: 500000.0,
  })
  originalAmount!: number;

  @ApiProperty({
    description: 'Current commitment amount (with change orders)',
    example: 525000.0,
  })
  currentAmount!: number;

  @ApiProperty({
    description: 'Change order amount (difference from original)',
    example: 25000.0,
  })
  changeOrderAmount!: number;

  @ApiProperty({
    description: 'Total invoiced amount to date',
    example: 300000.0,
  })
  invoicedAmount!: number;

  @ApiProperty({
    description: 'Total paid amount to date',
    example: 270000.0,
  })
  paidAmount!: number;

  @ApiProperty({
    description: 'Retention held',
    example: 30000.0,
  })
  retentionHeld!: number;

  @ApiProperty({
    description: 'Retention percentage',
    example: 10.0,
  })
  retentionPercent!: number;

  @ApiProperty({
    description: 'Remaining balance',
    example: 225000.0,
  })
  remainingBalance!: number;

  @ApiProperty({
    description: 'Percentage complete',
    example: 57.14,
  })
  percentComplete!: number;

  @ApiProperty({
    description: 'Number of line items',
    example: 12,
  })
  lineItemCount!: number;

  @ApiProperty({
    description: 'Number of invoices',
    example: 3,
  })
  invoiceCount!: number;

  @ApiProperty({
    description: 'Number of change orders',
    example: 1,
  })
  changeOrderCount!: number;
}
