import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsDateString } from 'class-validator';

/**
 * Subcontractor Summary Report Request DTO
 * Generates performance metrics by vendor/subcontractor
 */
export class GenerateSubcontractorSummaryReportDto {
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
 * Subcontractor Summary Line Item
 * Performance metrics for a single vendor/subcontractor
 */
export class SubcontractorSummaryLineDto {
  @ApiProperty({ description: 'Vendor name' })
  vendorName!: string;

  @ApiProperty({ description: 'Vendor contact' })
  vendorContact!: string;

  @ApiProperty({ description: 'Vendor email' })
  vendorEmail!: string;

  @ApiProperty({ description: 'Number of commitments' })
  commitmentCount!: number;

  @ApiProperty({ description: 'Total original contract value' })
  originalContractValue!: number;

  @ApiProperty({ description: 'Total change orders' })
  changeOrders!: number;

  @ApiProperty({ description: 'Total revised contract value' })
  revisedContractValue!: number;

  @ApiProperty({ description: 'Total invoiced amount' })
  invoicedAmount!: number;

  @ApiProperty({ description: 'Total paid amount' })
  paidAmount!: number;

  @ApiProperty({ description: 'Total retention held' })
  retentionHeld!: number;

  @ApiProperty({ description: 'Total outstanding balance (invoiced - paid)' })
  outstandingBalance!: number;

  @ApiProperty({ description: 'Remaining contract balance (revised - invoiced)' })
  remainingContractBalance!: number;

  @ApiProperty({ description: 'Percent complete (invoiced / revised * 100)' })
  percentComplete!: number;

  @ApiProperty({ description: 'Number of payment applications' })
  paymentApplicationCount!: number;

  @ApiProperty({ description: 'Number of approved payment applications' })
  approvedPaymentCount!: number;

  @ApiProperty({ description: 'Number of paid payment applications' })
  paidPaymentCount!: number;
}

/**
 * Subcontractor Summary Report Result
 */
export class SubcontractorSummaryReportDto {
  @ApiProperty({ description: 'Project ID' })
  projectId!: string;

  @ApiProperty({ description: 'Project name' })
  projectName!: string;

  @ApiProperty({ description: 'As-of date' })
  asOfDate!: Date;

  @ApiProperty({ description: 'Total number of vendors' })
  vendorCount!: number;

  @ApiProperty({ description: 'Total original contract value (all vendors)' })
  totalOriginalContractValue!: number;

  @ApiProperty({ description: 'Total change orders (all vendors)' })
  totalChangeOrders!: number;

  @ApiProperty({ description: 'Total revised contract value (all vendors)' })
  totalRevisedContractValue!: number;

  @ApiProperty({ description: 'Total invoiced amount (all vendors)' })
  totalInvoicedAmount!: number;

  @ApiProperty({ description: 'Total paid amount (all vendors)' })
  totalPaidAmount!: number;

  @ApiProperty({ description: 'Total retention held (all vendors)' })
  totalRetentionHeld!: number;

  @ApiProperty({ description: 'Total outstanding balance (all vendors)' })
  totalOutstandingBalance!: number;

  @ApiProperty({ description: 'Total remaining contract balance (all vendors)' })
  totalRemainingContractBalance!: number;

  @ApiProperty({ description: 'Overall percent complete' })
  overallPercentComplete!: number;

  @ApiProperty({ description: 'Subcontractor summary lines', type: [SubcontractorSummaryLineDto] })
  lines!: SubcontractorSummaryLineDto[];

  @ApiProperty({ description: 'Report generated at' })
  generatedAt!: Date;
}
