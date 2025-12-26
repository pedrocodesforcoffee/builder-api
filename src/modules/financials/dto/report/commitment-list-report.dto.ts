import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { CommitmentType, CommitmentStatus } from '../../enums';

/**
 * Commitment List Report Request DTO
 * Generates comprehensive list of all commitments (subcontracts + purchase orders)
 */
export class GenerateCommitmentListReportDto {
  @ApiProperty({ description: 'Project UUID' })
  @IsUUID()
  projectId!: string;

  @ApiProperty({ description: 'Filter by commitment type', required: false, enum: CommitmentType })
  @IsEnum(CommitmentType)
  @IsOptional()
  type?: CommitmentType;

  @ApiProperty({ description: 'Filter by commitment status', required: false, enum: CommitmentStatus })
  @IsEnum(CommitmentStatus)
  @IsOptional()
  status?: CommitmentStatus;

  @ApiProperty({ description: 'As-of date for snapshot (optional - defaults to now)', required: false })
  @IsDateString()
  @IsOptional()
  asOfDate?: string;
}

/**
 * Commitment Line Item
 * Single commitment in the report
 */
export class CommitmentLineDto {
  @ApiProperty({ description: 'Commitment ID' })
  commitmentId!: string;

  @ApiProperty({ description: 'Commitment number' })
  commitmentNumber!: string;

  @ApiProperty({ description: 'Commitment type', enum: CommitmentType })
  type!: CommitmentType;

  @ApiProperty({ description: 'Vendor/Subcontractor name' })
  vendorName!: string;

  @ApiProperty({ description: 'Cost code' })
  costCode!: string;

  @ApiProperty({ description: 'Cost code description' })
  costCodeDescription!: string;

  @ApiProperty({ description: 'Original amount' })
  originalAmount!: number;

  @ApiProperty({ description: 'Change orders total' })
  changeOrders!: number;

  @ApiProperty({ description: 'Revised amount (original + change orders)' })
  revisedAmount!: number;

  @ApiProperty({ description: 'Invoiced to date' })
  invoicedToDate!: number;

  @ApiProperty({ description: 'Paid to date' })
  paidToDate!: number;

  @ApiProperty({ description: 'Retention held' })
  retentionHeld!: number;

  @ApiProperty({ description: 'Remaining balance (revised - invoiced)' })
  remainingBalance!: number;

  @ApiProperty({ description: 'Commitment status', enum: CommitmentStatus })
  status!: CommitmentStatus;

  @ApiProperty({ description: 'Start date' })
  startDate!: Date;

  @ApiProperty({ description: 'End date', required: false })
  endDate?: Date;
}

/**
 * Commitment List Report Result
 */
export class CommitmentListReportDto {
  @ApiProperty({ description: 'Project ID' })
  projectId!: string;

  @ApiProperty({ description: 'Project name' })
  projectName!: string;

  @ApiProperty({ description: 'As-of date' })
  asOfDate!: Date;

  @ApiProperty({ description: 'Filter applied - commitment type', required: false, enum: CommitmentType })
  filterType?: CommitmentType;

  @ApiProperty({ description: 'Filter applied - commitment status', required: false, enum: CommitmentStatus })
  filterStatus?: CommitmentStatus;

  @ApiProperty({ description: 'Total original amount' })
  totalOriginalAmount!: number;

  @ApiProperty({ description: 'Total change orders' })
  totalChangeOrders!: number;

  @ApiProperty({ description: 'Total revised amount' })
  totalRevisedAmount!: number;

  @ApiProperty({ description: 'Total invoiced to date' })
  totalInvoicedToDate!: number;

  @ApiProperty({ description: 'Total paid to date' })
  totalPaidToDate!: number;

  @ApiProperty({ description: 'Total retention held' })
  totalRetentionHeld!: number;

  @ApiProperty({ description: 'Total remaining balance' })
  totalRemainingBalance!: number;

  @ApiProperty({ description: 'Commitment lines', type: [CommitmentLineDto] })
  lines!: CommitmentLineDto[];

  @ApiProperty({ description: 'Report generated at' })
  generatedAt!: Date;
}
