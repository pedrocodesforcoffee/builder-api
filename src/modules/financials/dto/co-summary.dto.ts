import { ApiProperty } from '@nestjs/swagger';

/**
 * Change Order Summary DTO
 *
 * Comprehensive summary of all change orders in a project.
 * Aggregates OCOs and CCOs to provide project-level insights.
 */
export class COSummaryDto {
  @ApiProperty({
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  projectId!: string;

  // ==================== OCO SUMMARY ====================

  @ApiProperty({
    description: 'Total number of OCOs',
    example: 15,
  })
  totalOcoCount!: number;

  @ApiProperty({
    description: 'Total OCO amount across all statuses',
    example: 150000,
  })
  totalOcoAmount!: number;

  @ApiProperty({
    description: 'OCOs in DRAFT status',
    example: 3,
  })
  ocoDraftCount!: number;

  @ApiProperty({
    description: 'OCOs in PENDING_APPROVAL status',
    example: 2,
  })
  ocoPendingCount!: number;

  @ApiProperty({
    description: 'OCOs in APPROVED status',
    example: 5,
  })
  ocoApprovedCount!: number;

  @ApiProperty({
    description: 'OCOs in REJECTED status',
    example: 1,
  })
  ocoRejectedCount!: number;

  @ApiProperty({
    description: 'OCOs in EXECUTED status',
    example: 4,
  })
  ocoExecutedCount!: number;

  @ApiProperty({
    description: 'Total approved OCO amount',
    example: 100000,
  })
  ocoApprovedAmount!: number;

  @ApiProperty({
    description: 'Total executed OCO amount',
    example: 80000,
  })
  ocoExecutedAmount!: number;

  // ==================== CCO SUMMARY ====================

  @ApiProperty({
    description: 'Total number of CCOs',
    example: 20,
  })
  totalCcoCount!: number;

  @ApiProperty({
    description: 'Total CCO amount across all statuses',
    example: 200000,
  })
  totalCcoAmount!: number;

  @ApiProperty({
    description: 'CCOs in DRAFT status',
    example: 5,
  })
  ccoDraftCount!: number;

  @ApiProperty({
    description: 'CCOs in PENDING_APPROVAL status',
    example: 3,
  })
  ccoPendingCount!: number;

  @ApiProperty({
    description: 'CCOs in APPROVED status',
    example: 6,
  })
  ccoApprovedCount!: number;

  @ApiProperty({
    description: 'CCOs in REJECTED status',
    example: 2,
  })
  ccoRejectedCount!: number;

  @ApiProperty({
    description: 'CCOs in EXECUTED status',
    example: 4,
  })
  ccoExecutedCount!: number;

  @ApiProperty({
    description: 'Total approved CCO amount',
    example: 120000,
  })
  ccoApprovedAmount!: number;

  @ApiProperty({
    description: 'Total executed CCO amount',
    example: 90000,
  })
  ccoExecutedAmount!: number;

  // ==================== COMBINED SUMMARY ====================

  @ApiProperty({
    description: 'Total change orders (OCO + CCO)',
    example: 35,
  })
  totalChangeOrderCount!: number;

  @ApiProperty({
    description: 'Total change order amount (OCO + CCO)',
    example: 350000,
  })
  totalChangeOrderAmount!: number;

  @ApiProperty({
    description: 'Total approved amount (OCO + CCO)',
    example: 220000,
  })
  totalApprovedAmount!: number;

  @ApiProperty({
    description: 'Total executed amount (OCO + CCO)',
    example: 170000,
  })
  totalExecutedAmount!: number;

  @ApiProperty({
    description: 'Budget impact percentage',
    example: 8.5,
  })
  budgetImpactPercentage!: number;
}
