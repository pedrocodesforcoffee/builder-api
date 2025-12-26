import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsDateString, IsEnum } from 'class-validator';

/**
 * Aging Report Type
 * AR (Accounts Receivable) or AP (Accounts Payable)
 */
export enum AgingReportType {
  AR = 'AR', // Accounts Receivable (money owed TO us)
  AP = 'AP', // Accounts Payable (money we owe TO vendors)
}

/**
 * Aging Report Request DTO
 * Generates AR/AP aging reports with aging buckets
 */
export class GenerateAgingReportDto {
  @ApiProperty({ description: 'Project UUID' })
  @IsUUID()
  projectId!: string;

  @ApiProperty({
    description: 'Report type: AR (Accounts Receivable) or AP (Accounts Payable)',
    enum: AgingReportType
  })
  @IsEnum(AgingReportType)
  reportType!: AgingReportType;

  @ApiProperty({ description: 'As-of date for aging calculation (optional - defaults to now)', required: false })
  @IsDateString()
  @IsOptional()
  asOfDate?: string;

  @ApiProperty({ description: 'Filter by vendor name (AP only, optional)', required: false })
  @IsOptional()
  vendorName?: string;
}

/**
 * Aging Report Line Item
 * Single line in the aging report showing aging buckets
 */
export class AgingReportLineDto {
  @ApiProperty({ description: 'Payment application ID (for AP reports)' })
  paymentApplicationId!: string | null;

  @ApiProperty({ description: 'Reference number (commitment number for AP)' })
  referenceNumber!: string;

  @ApiProperty({ description: 'Document title or description' })
  description!: string;

  @ApiProperty({ description: 'Vendor name (for AP) or customer name (for AR)' })
  partyName!: string;

  @ApiProperty({ description: 'Document date (application date, invoice date, etc.)' })
  documentDate!: Date;

  @ApiProperty({ description: 'Due date (if applicable)' })
  dueDate!: Date | null;

  @ApiProperty({ description: 'Days outstanding (as-of date - document date)' })
  daysOutstanding!: number;

  @ApiProperty({ description: 'Total amount' })
  totalAmount!: number;

  @ApiProperty({ description: 'Amount paid' })
  amountPaid!: number;

  @ApiProperty({ description: 'Balance due (total - paid)' })
  balanceDue!: number;

  @ApiProperty({ description: 'Current (0-30 days)' })
  current!: number;

  @ApiProperty({ description: '31-60 days' })
  days31to60!: number;

  @ApiProperty({ description: '61-90 days' })
  days61to90!: number;

  @ApiProperty({ description: '90+ days' })
  days90Plus!: number;

  @ApiProperty({ description: 'Status' })
  status!: string;
}

/**
 * Aging Report Result
 */
export class AgingReportDto {
  @ApiProperty({ description: 'Project ID' })
  projectId!: string;

  @ApiProperty({ description: 'Project name' })
  projectName!: string;

  @ApiProperty({ description: 'Report type (AR or AP)' })
  reportType!: AgingReportType;

  @ApiProperty({ description: 'As-of date' })
  asOfDate!: Date;

  @ApiProperty({ description: 'Total amount across all items' })
  totalAmount!: number;

  @ApiProperty({ description: 'Total amount paid' })
  totalAmountPaid!: number;

  @ApiProperty({ description: 'Total balance due' })
  totalBalanceDue!: number;

  @ApiProperty({ description: 'Total current (0-30 days)' })
  totalCurrent!: number;

  @ApiProperty({ description: 'Total 31-60 days' })
  totalDays31to60!: number;

  @ApiProperty({ description: 'Total 61-90 days' })
  totalDays61to90!: number;

  @ApiProperty({ description: 'Total 90+ days' })
  totalDays90Plus!: number;

  @ApiProperty({ description: 'Count of items' })
  itemCount!: number;

  @ApiProperty({ description: 'Count of overdue items (31+ days)' })
  overdueCount!: number;

  @ApiProperty({ description: 'Aging report lines', type: [AgingReportLineDto] })
  lines!: AgingReportLineDto[];

  @ApiProperty({ description: 'Report generated at' })
  generatedAt!: Date;
}
