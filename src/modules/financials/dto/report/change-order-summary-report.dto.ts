import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsDateString } from 'class-validator';

/**
 * Change Order Summary Report Request DTO
 * Generates an aggregated summary of change orders by type and status
 */
export class GenerateChangeOrderSummaryReportDto {
  @ApiProperty({ description: 'Project UUID' })
  @IsUUID()
  projectId!: string;

  @ApiProperty({ description: 'As-of date for snapshot (optional - defaults to now)', required: false })
  @IsDateString()
  @IsOptional()
  asOfDate?: string;
}

/**
 * Change Order Summary by Type
 * Aggregated summary for one change order type (PCO, OCO, CCO)
 */
export class ChangeOrderTypeSummaryDto {
  @ApiProperty({ description: 'Change order type (PCO, OCO, CCO)' })
  type!: string;

  @ApiProperty({ description: 'Total count' })
  totalCount!: number;

  @ApiProperty({ description: 'Draft count' })
  draftCount!: number;

  @ApiProperty({ description: 'Submitted/Pending count' })
  pendingCount!: number;

  @ApiProperty({ description: 'Approved count' })
  approvedCount!: number;

  @ApiProperty({ description: 'Rejected count' })
  rejectedCount!: number;

  @ApiProperty({ description: 'Total amount (all statuses)' })
  totalAmount!: number;

  @ApiProperty({ description: 'Draft amount' })
  draftAmount!: number;

  @ApiProperty({ description: 'Pending amount' })
  pendingAmount!: number;

  @ApiProperty({ description: 'Approved amount' })
  approvedAmount!: number;

  @ApiProperty({ description: 'Rejected amount' })
  rejectedAmount!: number;

  @ApiProperty({ description: 'Approval rate (approved / (approved + rejected) * 100)' })
  approvalRate!: number;
}

/**
 * Change Order Summary by Status
 * Cross-type aggregation by status
 */
export class ChangeOrderStatusSummaryDto {
  @ApiProperty({ description: 'Status name' })
  status!: string;

  @ApiProperty({ description: 'Count across all types' })
  count!: number;

  @ApiProperty({ description: 'Amount across all types' })
  amount!: number;
}

/**
 * Change Order Summary Report Result
 */
export class ChangeOrderSummaryReportDto {
  @ApiProperty({ description: 'Project ID' })
  projectId!: string;

  @ApiProperty({ description: 'Project name' })
  projectName!: string;

  @ApiProperty({ description: 'As-of date' })
  asOfDate!: Date;

  @ApiProperty({ description: 'Total change order count (all types)' })
  totalChangeOrderCount!: number;

  @ApiProperty({ description: 'Total amount (all types, all statuses)' })
  totalAmount!: number;

  @ApiProperty({ description: 'Total approved amount' })
  totalApprovedAmount!: number;

  @ApiProperty({ description: 'Total pending amount' })
  totalPendingAmount!: number;

  @ApiProperty({ description: 'Total rejected amount' })
  totalRejectedAmount!: number;

  @ApiProperty({ description: 'Overall approval rate' })
  overallApprovalRate!: number;

  @ApiProperty({ description: 'Summary by type (PCO, OCO, CCO)', type: [ChangeOrderTypeSummaryDto] })
  byType!: ChangeOrderTypeSummaryDto[];

  @ApiProperty({ description: 'Summary by status', type: [ChangeOrderStatusSummaryDto] })
  byStatus!: ChangeOrderStatusSummaryDto[];

  @ApiProperty({ description: 'Report generated at' })
  generatedAt!: Date;
}
