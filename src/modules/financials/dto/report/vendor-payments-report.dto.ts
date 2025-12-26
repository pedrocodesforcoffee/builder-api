import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsDateString } from 'class-validator';

/**
 * Vendor Payments Report Request DTO
 * Generates a detailed payment tracking report by vendor
 */
export class GenerateVendorPaymentsReportDto {
  @ApiProperty({ description: 'Project UUID' })
  @IsUUID()
  projectId!: string;

  @ApiProperty({ description: 'Start date for date range filter (optional)', required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ description: 'End date for date range filter (optional)', required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ description: 'Filter by vendor name (optional)', required: false })
  @IsOptional()
  vendorName?: string;
}

/**
 * Vendor Payments Line Item
 * Single payment entry for a vendor
 */
export class VendorPaymentsLineDto {
  @ApiProperty({ description: 'Vendor name' })
  vendorName!: string;

  @ApiProperty({ description: 'Commitment number' })
  commitmentNumber!: string;

  @ApiProperty({ description: 'Commitment title' })
  commitmentTitle!: string;

  @ApiProperty({ description: 'Payment application ID' })
  paymentApplicationId!: string;

  @ApiProperty({ description: 'Application number' })
  applicationNumber!: number;

  @ApiProperty({ description: 'Application date' })
  applicationDate!: Date;

  @ApiProperty({ description: 'Status' })
  status!: string;

  @ApiProperty({ description: 'Current payment due (amount requested)' })
  currentPaymentDue!: number;

  @ApiProperty({ description: 'Retainage held on this payment' })
  retainageAmount!: number;

  @ApiProperty({ description: 'Approved date' })
  approvedAt!: Date | null;

  @ApiProperty({ description: 'Paid date' })
  paidAt!: Date | null;

  @ApiProperty({ description: 'Paid by user name' })
  paidByName!: string | null;

  @ApiProperty({ description: 'Days to payment (paid date - application date)' })
  daysToPayment!: number | null;
}

/**
 * Vendor Payments Summary by Vendor
 * Aggregated payment metrics for one vendor
 */
export class VendorPaymentsSummaryDto {
  @ApiProperty({ description: 'Vendor name' })
  vendorName!: string;

  @ApiProperty({ description: 'Number of payment applications' })
  paymentCount!: number;

  @ApiProperty({ description: 'Total amount requested' })
  totalAmountRequested!: number;

  @ApiProperty({ description: 'Total amount paid' })
  totalAmountPaid!: number;

  @ApiProperty({ description: 'Total retainage held' })
  totalRetainageHeld!: number;

  @ApiProperty({ description: 'Total outstanding (requested but not paid)' })
  totalOutstanding!: number;

  @ApiProperty({ description: 'Average days to payment' })
  averageDaysToPayment!: number;
}

/**
 * Vendor Payments Report Result
 */
export class VendorPaymentsReportDto {
  @ApiProperty({ description: 'Project ID' })
  projectId!: string;

  @ApiProperty({ description: 'Project name' })
  projectName!: string;

  @ApiProperty({ description: 'Start date filter (if applied)' })
  startDate!: Date | null;

  @ApiProperty({ description: 'End date filter (if applied)' })
  endDate!: Date | null;

  @ApiProperty({ description: 'Total amount requested across all vendors' })
  totalAmountRequested!: number;

  @ApiProperty({ description: 'Total amount paid across all vendors' })
  totalAmountPaid!: number;

  @ApiProperty({ description: 'Total retainage held across all vendors' })
  totalRetainageHeld!: number;

  @ApiProperty({ description: 'Total outstanding across all vendors' })
  totalOutstanding!: number;

  @ApiProperty({ description: 'Number of vendors' })
  vendorCount!: number;

  @ApiProperty({ description: 'Number of payment applications' })
  paymentApplicationCount!: number;

  @ApiProperty({ description: 'Average days to payment (all vendors)' })
  averageDaysToPayment!: number;

  @ApiProperty({ description: 'Summary by vendor', type: [VendorPaymentsSummaryDto] })
  summaryByVendor!: VendorPaymentsSummaryDto[];

  @ApiProperty({ description: 'Detailed payment lines', type: [VendorPaymentsLineDto] })
  lines!: VendorPaymentsLineDto[];

  @ApiProperty({ description: 'Report generated at' })
  generatedAt!: Date;
}
