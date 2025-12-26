import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsDateString } from 'class-validator';

/**
 * Payment History Report Request DTO
 * Generates a chronological report of all payment applications (AIA G702/G703)
 */
export class GeneratePaymentHistoryReportDto {
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

  @ApiProperty({ description: 'Filter by commitment ID (optional)', required: false })
  @IsUUID()
  @IsOptional()
  commitmentId?: string;

  @ApiProperty({ description: 'Filter by vendor name (optional)', required: false })
  @IsOptional()
  vendorName?: string;
}

/**
 * Payment History Line Item
 * Single payment application in the payment history report
 */
export class PaymentHistoryLineDto {
  @ApiProperty({ description: 'Payment application ID' })
  paymentApplicationId!: string;

  @ApiProperty({ description: 'Application number' })
  applicationNumber!: number;

  @ApiProperty({ description: 'Application date' })
  applicationDate!: Date;

  @ApiProperty({ description: 'Billing period start' })
  periodStart!: Date;

  @ApiProperty({ description: 'Billing period end' })
  periodEnd!: Date;

  @ApiProperty({ description: 'Commitment number' })
  commitmentNumber!: string;

  @ApiProperty({ description: 'Commitment title' })
  commitmentTitle!: string;

  @ApiProperty({ description: 'Vendor name' })
  vendorName!: string;

  @ApiProperty({ description: 'Payment application status' })
  status!: string;

  @ApiProperty({ description: 'Total completed and stored to date (AIA G702 Column G)' })
  totalCompletedAndStored!: number;

  @ApiProperty({ description: 'Retainage percentage' })
  retainagePercent!: number;

  @ApiProperty({ description: 'Retainage amount' })
  retainageAmount!: number;

  @ApiProperty({ description: 'Total earned less retainage' })
  totalEarnedLessRetainage!: number;

  @ApiProperty({ description: 'Previous payments' })
  previousPayments!: number;

  @ApiProperty({ description: 'Current payment due' })
  currentPaymentDue!: number;

  @ApiProperty({ description: 'Approved date' })
  approvedAt!: Date | null;

  @ApiProperty({ description: 'Approved by user name' })
  approvedByName!: string | null;

  @ApiProperty({ description: 'Paid date' })
  paidAt!: Date | null;

  @ApiProperty({ description: 'Paid by user name' })
  paidByName!: string | null;
}

/**
 * Payment History Report Result
 */
export class PaymentHistoryReportDto {
  @ApiProperty({ description: 'Project ID' })
  projectId!: string;

  @ApiProperty({ description: 'Project name' })
  projectName!: string;

  @ApiProperty({ description: 'Start date filter (if applied)' })
  startDate!: Date | null;

  @ApiProperty({ description: 'End date filter (if applied)' })
  endDate!: Date | null;

  @ApiProperty({ description: 'Total completed and stored' })
  totalCompletedAndStored!: number;

  @ApiProperty({ description: 'Total retainage amount' })
  totalRetainageAmount!: number;

  @ApiProperty({ description: 'Total earned less retainage' })
  totalEarnedLessRetainage!: number;

  @ApiProperty({ description: 'Total previous payments' })
  totalPreviousPayments!: number;

  @ApiProperty({ description: 'Total current payment due' })
  totalCurrentPaymentDue!: number;

  @ApiProperty({ description: 'Count of payment applications' })
  paymentApplicationCount!: number;

  @ApiProperty({ description: 'Count of approved payment applications' })
  approvedCount!: number;

  @ApiProperty({ description: 'Count of paid payment applications' })
  paidCount!: number;

  @ApiProperty({ description: 'Payment history lines', type: [PaymentHistoryLineDto] })
  lines!: PaymentHistoryLineDto[];

  @ApiProperty({ description: 'Report generated at' })
  generatedAt!: Date;
}
