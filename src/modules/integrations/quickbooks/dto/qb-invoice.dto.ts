import { IsString, IsOptional, IsNumber, IsDateString, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * QuickBooks Invoice DTOs
 *
 * Data transfer objects for QuickBooks invoice operations.
 * Maps owner billings/progress payments to QuickBooks invoices.
 */

/**
 * Invoice Line Item DTO
 */
export class QBInvoiceLineDto {
  @ApiPropertyOptional({ description: 'Line ID' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: 'Line description' })
  @IsString()
  description!: string;

  @ApiProperty({ description: 'Line amount' })
  @IsNumber()
  amount!: number;

  @ApiProperty({ description: 'Sales item reference ID' })
  @IsString()
  salesItemRef!: string;

  @ApiPropertyOptional({ description: 'Quantity' })
  @IsOptional()
  @IsNumber()
  qty?: number;

  @ApiPropertyOptional({ description: 'Unit price' })
  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @ApiPropertyOptional({ description: 'Tax code reference' })
  @IsOptional()
  @IsString()
  taxCodeRef?: string;
}

/**
 * Create QuickBooks Invoice DTO
 */
export class CreateQBInvoiceDto {
  @ApiProperty({ description: 'Customer reference ID' })
  @IsString()
  customerRef!: string;

  @ApiProperty({ description: 'Transaction date' })
  @IsDateString()
  txnDate!: string;

  @ApiPropertyOptional({ description: 'Due date' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Invoice document number' })
  @IsOptional()
  @IsString()
  docNumber?: string;

  @ApiProperty({ description: 'Invoice line items', type: [QBInvoiceLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QBInvoiceLineDto)
  lines!: QBInvoiceLineDto[];

  @ApiPropertyOptional({ description: 'Private note/memo' })
  @IsOptional()
  @IsString()
  privateNote?: string;

  @ApiPropertyOptional({ description: 'Customer memo' })
  @IsOptional()
  @IsString()
  customerMemo?: string;

  @ApiPropertyOptional({ description: 'Billing address reference' })
  @IsOptional()
  @IsString()
  billAddr?: any;

  @ApiPropertyOptional({ description: 'Shipping address reference' })
  @IsOptional()
  @IsString()
  shipAddr?: any;

  @ApiPropertyOptional({ description: 'Sales term reference' })
  @IsOptional()
  @IsString()
  salesTermRef?: string;

  @ApiPropertyOptional({ description: 'Deposit/retainage amount' })
  @IsOptional()
  @IsNumber()
  deposit?: number;

  @ApiPropertyOptional({ description: 'Email delivery flag' })
  @IsOptional()
  @IsBoolean()
  emailStatus?: boolean;
}

/**
 * Update QuickBooks Invoice DTO
 */
export class UpdateQBInvoiceDto extends CreateQBInvoiceDto {
  @ApiProperty({ description: 'QuickBooks invoice ID' })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'Sync token for optimistic locking' })
  @IsString()
  syncToken!: string;
}

/**
 * QuickBooks Invoice Response DTO
 */
export class QBInvoiceResponseDto {
  @ApiProperty({ description: 'QuickBooks invoice ID' })
  id!: string;

  @ApiProperty({ description: 'Sync token' })
  syncToken!: string;

  @ApiProperty({ description: 'Customer reference' })
  customerRef!: {
    value: string;
    name: string;
  };

  @ApiProperty({ description: 'Transaction date' })
  txnDate!: string;

  @ApiPropertyOptional({ description: 'Due date' })
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Document number' })
  docNumber?: string;

  @ApiProperty({ description: 'Invoice lines' })
  lines!: Array<{
    id: string;
    amount: number;
    description: string;
    detailType: string;
    salesItemLineDetail?: {
      itemRef: { value: string; name: string };
      qty?: number;
      unitPrice?: number;
    };
  }>;

  @ApiProperty({ description: 'Total amount' })
  totalAmt!: number;

  @ApiProperty({ description: 'Balance (amount due)' })
  balance!: number;

  @ApiPropertyOptional({ description: 'Private note' })
  privateNote?: string;

  @ApiPropertyOptional({ description: 'Customer memo' })
  customerMemo?: string;

  @ApiPropertyOptional({ description: 'Email status' })
  emailStatus?: string;

  @ApiProperty({ description: 'Metadata' })
  metaData!: {
    createTime: string;
    lastUpdatedTime: string;
  };
}

/**
 * Query Invoices DTO
 */
export class QueryInvoicesDto {
  @ApiPropertyOptional({ description: 'Filter by customer ID' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Filter by status (open/paid)' })
  @IsOptional()
  @IsString()
  status?: 'open' | 'paid' | 'overdue';

  @ApiPropertyOptional({ description: 'Filter by start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Filter by end date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Maximum results' })
  @IsOptional()
  @IsNumber()
  maxResults?: number;

  @ApiPropertyOptional({ description: 'Start position' })
  @IsOptional()
  @IsNumber()
  startPosition?: number;
}

/**
 * Invoices List Response DTO
 */
export class QBInvoicesListResponseDto {
  @ApiProperty({ description: 'List of invoices', type: [QBInvoiceResponseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QBInvoiceResponseDto)
  invoices!: QBInvoiceResponseDto[];

  @ApiProperty({ description: 'Total count' })
  @IsNumber()
  totalCount!: number;
}

/**
 * Create Invoice from Owner Billing DTO
 */
export class CreateInvoiceFromOwnerBillingDto {
  @ApiProperty({ description: 'Owner billing ID (or similar entity)' })
  @IsString()
  ownerBillingId!: string;

  @ApiPropertyOptional({ description: 'QB customer ID override' })
  @IsOptional()
  @IsString()
  customerRef?: string;

  @ApiPropertyOptional({ description: 'Include retention as separate line' })
  @IsOptional()
  @IsBoolean()
  includeRetentionLine?: boolean;
}

/**
 * Invoice Export Result DTO
 */
export class InvoiceExportResultDto {
  @ApiProperty({ description: 'Success status' })
  @IsBoolean()
  success!: boolean;

  @ApiProperty({ description: 'QuickBooks invoice ID' })
  @IsString()
  qbInvoiceId!: string;

  @ApiProperty({ description: 'Platform owner billing ID' })
  @IsString()
  ownerBillingId!: string;

  @ApiProperty({ description: 'Invoice total amount' })
  @IsNumber()
  totalAmount!: number;

  @ApiPropertyOptional({ description: 'Invoice number' })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  @IsOptional()
  @IsString()
  error?: string;
}

/**
 * Invoice Status DTO
 */
export class InvoiceStatusDto {
  @ApiProperty({ description: 'Is exported to QuickBooks' })
  @IsBoolean()
  isExported!: boolean;

  @ApiPropertyOptional({ description: 'QuickBooks invoice ID' })
  @IsOptional()
  @IsString()
  qbInvoiceId?: string;

  @ApiPropertyOptional({ description: 'Last synced date' })
  @IsOptional()
  @IsDateString()
  lastSyncedAt?: string;

  @ApiPropertyOptional({ description: 'Sync status' })
  @IsOptional()
  @IsString()
  syncStatus?: 'SYNCED' | 'PENDING' | 'ERROR';

  @ApiPropertyOptional({ description: 'Error message' })
  @IsOptional()
  @IsString()
  errorMessage?: string;
}

/**
 * Record Invoice Payment DTO
 */
export class RecordInvoicePaymentDto {
  @ApiProperty({ description: 'Invoice ID' })
  @IsString()
  invoiceId!: string;

  @ApiProperty({ description: 'Payment amount' })
  @IsNumber()
  amount!: number;

  @ApiProperty({ description: 'Payment date' })
  @IsDateString()
  txnDate!: string;

  @ApiPropertyOptional({ description: 'Payment method' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Reference number' })
  @IsOptional()
  @IsString()
  refNumber?: string;

  @ApiPropertyOptional({ description: 'Private note' })
  @IsOptional()
  @IsString()
  privateNote?: string;

  @ApiPropertyOptional({ description: 'Deposit to account reference' })
  @IsOptional()
  @IsString()
  depositToAccountRef?: string;
}

/**
 * QuickBooks Payment Response DTO
 */
export class QBPaymentResponseDto {
  @ApiProperty({ description: 'Payment ID' })
  id!: string;

  @ApiProperty({ description: 'Sync token' })
  syncToken!: string;

  @ApiProperty({ description: 'Customer reference' })
  customerRef!: {
    value: string;
    name: string;
  };

  @ApiProperty({ description: 'Total amount' })
  totalAmt!: number;

  @ApiProperty({ description: 'Transaction date' })
  txnDate!: string;

  @ApiProperty({ description: 'Linked transactions (invoices)' })
  lines!: Array<{
    amount: number;
    linkedTxn: Array<{
      txnId: string;
      txnType: string;
    }>;
  }>;

  @ApiPropertyOptional({ description: 'Private note' })
  privateNote?: string;

  @ApiProperty({ description: 'Metadata' })
  metaData!: {
    createTime: string;
    lastUpdatedTime: string;
  };
}

/**
 * Invoice Sync Result DTO
 */
export class InvoiceSyncResultDto {
  @ApiProperty({ description: 'Number of invoices processed' })
  @IsNumber()
  processed!: number;

  @ApiProperty({ description: 'Number of invoices succeeded' })
  @IsNumber()
  succeeded!: number;

  @ApiProperty({ description: 'Number of invoices failed' })
  @IsNumber()
  failed!: number;

  @ApiPropertyOptional({ description: 'Error details', type: [String] })
  @IsOptional()
  @IsArray()
  errors?: string[];
}
