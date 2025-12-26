import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsDateString } from 'class-validator';

/**
 * Commitment Status Report Request DTO
 * Generates a comprehensive commitment status report by vendor
 */
export class GenerateCommitmentStatusReportDto {
  @ApiProperty({ description: 'Project UUID' })
  @IsUUID()
  projectId!: string;

  @ApiProperty({ description: 'As-of date for snapshot (optional - defaults to now)', required: false })
  @IsDateString()
  @IsOptional()
  asOfDate?: string;

  @ApiProperty({ description: 'Filter by vendor name (optional)', required: false })
  @IsOptional()
  vendorName?: string;
}

/**
 * Commitment Status Line Item
 * Single line in the commitment status report
 */
export class CommitmentStatusLineDto {
  @ApiProperty({ description: 'Commitment ID' })
  commitmentId!: string;

  @ApiProperty({ description: 'Commitment number' })
  commitmentNumber!: string;

  @ApiProperty({ description: 'Commitment title' })
  title!: string;

  @ApiProperty({ description: 'Commitment type (SUBCONTRACT or PURCHASE_ORDER)' })
  type!: string;

  @ApiProperty({ description: 'Vendor name' })
  vendorName!: string;

  @ApiProperty({ description: 'Vendor contact' })
  vendorContact!: string;

  @ApiProperty({ description: 'Commitment status' })
  status!: string;

  @ApiProperty({ description: 'Original commitment amount' })
  originalAmount!: number;

  @ApiProperty({ description: 'Change orders total' })
  changeOrders!: number;

  @ApiProperty({ description: 'Revised commitment amount (original + change orders)' })
  revisedAmount!: number;

  @ApiProperty({ description: 'Invoiced amount (approved payment applications)' })
  invoicedAmount!: number;

  @ApiProperty({ description: 'Paid amount' })
  paidAmount!: number;

  @ApiProperty({ description: 'Retention percentage' })
  retentionPercent!: number;

  @ApiProperty({ description: 'Retention held (calculated from invoiced amount)' })
  retentionHeld!: number;

  @ApiProperty({ description: 'Remaining balance (revised - invoiced)' })
  remainingBalance!: number;

  @ApiProperty({ description: 'Percent complete (invoiced / revised * 100)' })
  percentComplete!: number;

  @ApiProperty({ description: 'Start date' })
  startDate!: Date | null;

  @ApiProperty({ description: 'End date' })
  endDate!: Date | null;
}

/**
 * Commitment Status Report Result
 */
export class CommitmentStatusReportDto {
  @ApiProperty({ description: 'Project ID' })
  projectId!: string;

  @ApiProperty({ description: 'Project name' })
  projectName!: string;

  @ApiProperty({ description: 'As-of date' })
  asOfDate!: Date;

  @ApiProperty({ description: 'Total original amount' })
  totalOriginalAmount!: number;

  @ApiProperty({ description: 'Total change orders' })
  totalChangeOrders!: number;

  @ApiProperty({ description: 'Total revised amount' })
  totalRevisedAmount!: number;

  @ApiProperty({ description: 'Total invoiced amount' })
  totalInvoicedAmount!: number;

  @ApiProperty({ description: 'Total paid amount' })
  totalPaidAmount!: number;

  @ApiProperty({ description: 'Total retention held' })
  totalRetentionHeld!: number;

  @ApiProperty({ description: 'Total remaining balance' })
  totalRemainingBalance!: number;

  @ApiProperty({ description: 'Overall percent complete' })
  overallPercentComplete!: number;

  @ApiProperty({ description: 'Count of commitments' })
  commitmentCount!: number;

  @ApiProperty({ description: 'Commitment status lines', type: [CommitmentStatusLineDto] })
  lines!: CommitmentStatusLineDto[];

  @ApiProperty({ description: 'Report generated at' })
  generatedAt!: Date;
}
