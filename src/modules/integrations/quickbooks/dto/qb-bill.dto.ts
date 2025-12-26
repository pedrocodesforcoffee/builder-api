import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * QuickBooks Bill DTOs
 *
 * Data transfer objects for QuickBooks Bill entity operations.
 * Bills represent invoices received from vendors for goods or services purchased.
 *
 * API Reference: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/bill
 */

/**
 * Account-based line item (for expenses)
 */
export class QBBillAccountLineDto {
  @ApiProperty({ description: 'Line item description' })
  @IsString()
  description!: string;

  @ApiProperty({ description: 'Line item amount' })
  @IsNumber()
  amount!: number;

  @ApiProperty({ description: 'Account reference ID (expense account)' })
  @IsString()
  accountRef!: string;

  @ApiPropertyOptional({ description: 'Customer/job reference ID (for job costing)' })
  @IsOptional()
  @IsString()
  customerRef?: string;

  @ApiPropertyOptional({ description: 'Class reference ID (for classification)' })
  @IsOptional()
  @IsString()
  classRef?: string;

  @ApiPropertyOptional({ description: 'Billable status' })
  @IsOptional()
  @IsString()
  billableStatus?: 'Billable' | 'NotBillable' | 'HasBeenBilled';
}

/**
 * Item-based line item (for items)
 */
export class QBBillItemLineDto {
  @ApiProperty({ description: 'Item reference ID' })
  @IsString()
  itemRef!: string;

  @ApiProperty({ description: 'Quantity' })
  @IsNumber()
  qty!: number;

  @ApiProperty({ description: 'Unit price' })
  @IsNumber()
  unitPrice!: number;

  @ApiPropertyOptional({ description: 'Line item description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Customer/job reference ID (for job costing)' })
  @IsOptional()
  @IsString()
  customerRef?: string;

  @ApiPropertyOptional({ description: 'Class reference ID (for classification)' })
  @IsOptional()
  @IsString()
  classRef?: string;
}

/**
 * Bill line discriminator
 */
export enum QBBillLineDetailType {
  ACCOUNT_BASED_EXPENSE = 'AccountBasedExpenseLineDetail',
  ITEM_BASED_EXPENSE = 'ItemBasedExpenseLineDetail',
}

/**
 * Create bill DTO
 */
export class CreateQBBillDto {
  @ApiProperty({ description: 'Vendor reference ID' })
  @IsString()
  vendorRef!: string;

  @ApiProperty({ description: 'Accounts Payable account reference ID' })
  @IsString()
  apAccountRef!: string;

  @ApiProperty({ description: 'Transaction date (YYYY-MM-DD)' })
  @IsDateString()
  txnDate!: string;

  @ApiProperty({ description: 'Due date (YYYY-MM-DD)' })
  @IsDateString()
  dueDate!: string;

  @ApiProperty({
    description: 'Account-based line items',
    type: [QBBillAccountLineDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QBBillAccountLineDto)
  accountLines!: QBBillAccountLineDto[];

  @ApiPropertyOptional({ description: 'Document/invoice number' })
  @IsOptional()
  @IsString()
  docNumber?: string;

  @ApiPropertyOptional({ description: 'Private note (internal memo)' })
  @IsOptional()
  @IsString()
  privateNote?: string;

  @ApiPropertyOptional({ description: 'Terms reference ID (payment terms)' })
  @IsOptional()
  @IsString()
  termRef?: string;
}

/**
 * Bill line response DTO
 */
export class QBBillLineResponseDto {
  @ApiProperty({ description: 'Line number' })
  lineNum!: number;

  @ApiProperty({ description: 'Line detail type' })
  detailType!: QBBillLineDetailType;

  @ApiProperty({ description: 'Line description' })
  description!: string;

  @ApiProperty({ description: 'Line amount' })
  amount!: number;

  @ApiPropertyOptional({ description: 'Account reference' })
  accountRef?: { value: string; name: string };

  @ApiPropertyOptional({ description: 'Item reference' })
  itemRef?: { value: string; name: string };

  @ApiPropertyOptional({ description: 'Quantity (for item-based lines)' })
  qty?: number;

  @ApiPropertyOptional({ description: 'Unit price (for item-based lines)' })
  unitPrice?: number;

  @ApiPropertyOptional({ description: 'Customer reference' })
  customerRef?: { value: string; name: string };

  @ApiPropertyOptional({ description: 'Class reference' })
  classRef?: { value: string; name: string };
}

/**
 * Bill response DTO
 */
export class QBBillResponseDto {
  @ApiProperty({ description: 'QuickBooks bill ID' })
  id!: string;

  @ApiProperty({ description: 'Document number' })
  docNumber!: string;

  @ApiProperty({ description: 'Transaction date' })
  txnDate!: string;

  @ApiProperty({ description: 'Due date' })
  dueDate!: string;

  @ApiProperty({ description: 'Vendor reference' })
  vendorRef!: { value: string; name: string };

  @ApiProperty({ description: 'AP account reference' })
  apAccountRef!: { value: string; name: string };

  @ApiProperty({ description: 'Total amount' })
  totalAmt!: number;

  @ApiProperty({ description: 'Balance (unpaid amount)' })
  balance!: number;

  @ApiProperty({ description: 'Line items', type: [QBBillLineResponseDto] })
  lines!: QBBillLineResponseDto[];

  @ApiPropertyOptional({ description: 'Private note' })
  privateNote?: string;

  @ApiPropertyOptional({ description: 'Terms reference' })
  termRef?: { value: string; name: string };

  @ApiProperty({ description: 'SyncToken for optimistic locking' })
  syncToken!: string;

  @ApiProperty({ description: 'Last updated timestamp' })
  lastUpdated!: string;
}

/**
 * Create bill from payment application DTO
 */
export class CreateBillFromPaymentApplicationDto {
  @ApiProperty({ description: 'Payment application ID' })
  @IsString()
  paymentApplicationId!: string;

  @ApiPropertyOptional({
    description: 'Accounts Payable account reference ID (if not set in sync settings)',
  })
  @IsOptional()
  @IsString()
  apAccountRef?: string;

  @ApiPropertyOptional({
    description: 'Override vendor ID (use if commitment not linked to QB vendor)',
  })
  @IsOptional()
  @IsString()
  vendorRef?: string;
}

/**
 * Query bills DTO
 */
export class QueryBillsDto {
  @ApiPropertyOptional({ description: 'Vendor reference ID' })
  @IsOptional()
  @IsString()
  vendorRef?: string;

  @ApiPropertyOptional({ description: 'Unpaid bills only' })
  @IsOptional()
  @IsString()
  unpaidOnly?: string;

  @ApiPropertyOptional({ description: 'Transaction date from (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  txnDateFrom?: string;

  @ApiPropertyOptional({ description: 'Transaction date to (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  txnDateTo?: string;

  @ApiPropertyOptional({ description: 'Maximum results per page', default: 100 })
  @IsOptional()
  @IsNumber()
  maxResults?: number = 100;

  @ApiPropertyOptional({ description: 'Start position for pagination', default: 1 })
  @IsOptional()
  @IsNumber()
  startPosition?: number = 1;
}

/**
 * Bills list response DTO
 */
export class QBBillsListResponseDto {
  @ApiProperty({ type: [QBBillResponseDto], description: 'List of bills' })
  bills!: QBBillResponseDto[];

  @ApiProperty({ description: 'Total count of bills' })
  totalCount!: number;

  @ApiProperty({ description: 'Start position' })
  startPosition!: number;

  @ApiProperty({ description: 'Maximum results per page' })
  maxResults!: number;
}
