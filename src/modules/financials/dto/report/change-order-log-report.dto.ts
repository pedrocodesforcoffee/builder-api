import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsDateString, IsEnum } from 'class-validator';

/**
 * Change Order Type Filter
 */
export enum ChangeOrderTypeFilter {
  ALL = 'ALL',
  PCO = 'PCO', // Potential Change Orders
  OCO = 'OCO', // Owner Change Orders
  CCO = 'CCO', // Commitment Change Orders
}

/**
 * Change Order Log Report Request DTO
 * Generates a complete chronological log of all change orders
 */
export class GenerateChangeOrderLogReportDto {
  @ApiProperty({ description: 'Project UUID' })
  @IsUUID()
  projectId!: string;

  @ApiProperty({
    description: 'Filter by change order type (ALL, PCO, OCO, CCO)',
    enum: ChangeOrderTypeFilter,
    required: false
  })
  @IsEnum(ChangeOrderTypeFilter)
  @IsOptional()
  typeFilter?: ChangeOrderTypeFilter;

  @ApiProperty({ description: 'Start date for date range filter (optional)', required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ description: 'End date for date range filter (optional)', required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}

/**
 * Change Order Log Line Item
 * Single change order in the log
 */
export class ChangeOrderLogLineDto {
  @ApiProperty({ description: 'Change order ID' })
  changeOrderId!: string;

  @ApiProperty({ description: 'Change order type (PCO, OCO, CCO)' })
  type!: string;

  @ApiProperty({ description: 'Change order number' })
  number!: string;

  @ApiProperty({ description: 'Title' })
  title!: string;

  @ApiProperty({ description: 'Description' })
  description!: string;

  @ApiProperty({ description: 'Status' })
  status!: string;

  @ApiProperty({ description: 'Change type (if applicable)' })
  changeType!: string | null;

  @ApiProperty({ description: 'Priority (if applicable)' })
  priority!: string | null;

  @ApiProperty({ description: 'Amount' })
  amount!: number;

  @ApiProperty({ description: 'Approved amount (if different from requested)' })
  approvedAmount!: number | null;

  @ApiProperty({ description: 'Related entity name (commitment name for CCO, prime contract for OCO)' })
  relatedEntity!: string | null;

  @ApiProperty({ description: 'Created date' })
  createdAt!: Date;

  @ApiProperty({ description: 'Created by user name' })
  createdByName!: string;

  @ApiProperty({ description: 'Submitted date' })
  submittedAt!: Date | null;

  @ApiProperty({ description: 'Approved date' })
  approvedAt!: Date | null;

  @ApiProperty({ description: 'Approved by user name' })
  approvedByName!: string | null;

  @ApiProperty({ description: 'Rejected date' })
  rejectedAt!: Date | null;

  @ApiProperty({ description: 'Rejected by user name' })
  rejectedByName!: string | null;

  @ApiProperty({ description: 'Rejection reason' })
  rejectionReason!: string | null;
}

/**
 * Change Order Log Report Result
 */
export class ChangeOrderLogReportDto {
  @ApiProperty({ description: 'Project ID' })
  projectId!: string;

  @ApiProperty({ description: 'Project name' })
  projectName!: string;

  @ApiProperty({ description: 'Type filter applied' })
  typeFilter!: ChangeOrderTypeFilter;

  @ApiProperty({ description: 'Start date filter (if applied)' })
  startDate!: Date | null;

  @ApiProperty({ description: 'End date filter (if applied)' })
  endDate!: Date | null;

  @ApiProperty({ description: 'Total change order count' })
  totalCount!: number;

  @ApiProperty({ description: 'PCO count' })
  pcoCount!: number;

  @ApiProperty({ description: 'OCO count' })
  ocoCount!: number;

  @ApiProperty({ description: 'CCO count' })
  ccoCount!: number;

  @ApiProperty({ description: 'Total amount (all change orders)' })
  totalAmount!: number;

  @ApiProperty({ description: 'Total approved amount' })
  totalApprovedAmount!: number;

  @ApiProperty({ description: 'Pending count (submitted, under review)' })
  pendingCount!: number;

  @ApiProperty({ description: 'Approved count' })
  approvedCount!: number;

  @ApiProperty({ description: 'Rejected count' })
  rejectedCount!: number;

  @ApiProperty({ description: 'Change order log lines', type: [ChangeOrderLogLineDto] })
  lines!: ChangeOrderLogLineDto[];

  @ApiProperty({ description: 'Report generated at' })
  generatedAt!: Date;
}
