import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * QuickBooks BillPayment DTOs
 *
 * Data transfer objects for QuickBooks BillPayment entity operations.
 * BillPayments record payments made to vendors for outstanding bills.
 *
 * API Reference: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/billpayment
 */

/**
 * Payment type enum
 */
export enum QBPaymentType {
  CHECK = 'Check',
  CREDIT_CARD = 'CreditCard',
}

/**
 * Line item linking payment to bill
 */
export class QBBillPaymentLineDto {
  @ApiProperty({ description: 'Linked transaction ID (Bill ID)' })
  @IsString()
  linkedTxnId!: string;

  @ApiProperty({ description: 'Amount applied to this bill' })
  @IsNumber()
  amount!: number;
}

/**
 * Create bill payment DTO
 */
export class CreateQBBillPaymentDto {
  @ApiProperty({ description: 'Vendor reference ID' })
  @IsString()
  vendorRef!: string;

  @ApiProperty({ description: 'Payment type (Check or CreditCard)' })
  @IsEnum(QBPaymentType)
  payType!: QBPaymentType;

  @ApiProperty({ description: 'Total payment amount' })
  @IsNumber()
  totalAmt!: number;

  @ApiProperty({ description: 'Transaction date (YYYY-MM-DD)' })
  @IsDateString()
  txnDate!: string;

  @ApiProperty({
    description: 'Line items linking payment to bills',
    type: [QBBillPaymentLineDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QBBillPaymentLineDto)
  lines!: QBBillPaymentLineDto[];

  @ApiPropertyOptional({
    description: 'Bank account reference ID (for Check payments)',
  })
  @IsOptional()
  @IsString()
  bankAccountRef?: string;

  @ApiPropertyOptional({
    description: 'Credit card account reference ID (for CreditCard payments)',
  })
  @IsOptional()
  @IsString()
  creditCardAccountRef?: string;

  @ApiPropertyOptional({ description: 'Check number (for Check payments)' })
  @IsOptional()
  @IsString()
  checkNum?: string;

  @ApiPropertyOptional({ description: 'Private note (internal memo)' })
  @IsOptional()
  @IsString()
  privateNote?: string;
}

/**
 * Bill payment line response DTO
 */
export class QBBillPaymentLineResponseDto {
  @ApiProperty({ description: 'Linked transaction type' })
  linkedTxnType!: string;

  @ApiProperty({ description: 'Linked transaction ID (Bill ID)' })
  linkedTxnId!: string;

  @ApiProperty({ description: 'Amount applied to bill' })
  amount!: number;
}

/**
 * Bill payment response DTO
 */
export class QBBillPaymentResponseDto {
  @ApiProperty({ description: 'QuickBooks bill payment ID' })
  id!: string;

  @ApiProperty({ description: 'Transaction date' })
  txnDate!: string;

  @ApiProperty({ description: 'Vendor reference' })
  vendorRef!: { value: string; name: string };

  @ApiProperty({ description: 'Payment type' })
  payType!: QBPaymentType;

  @ApiProperty({ description: 'Total payment amount' })
  totalAmt!: number;

  @ApiProperty({
    description: 'Line items linking to bills',
    type: [QBBillPaymentLineResponseDto],
  })
  lines!: QBBillPaymentLineResponseDto[];

  @ApiPropertyOptional({ description: 'Bank account reference' })
  bankAccountRef?: { value: string; name: string };

  @ApiPropertyOptional({ description: 'Credit card account reference' })
  creditCardAccountRef?: { value: string; name: string };

  @ApiPropertyOptional({ description: 'Check number' })
  checkNum?: string;

  @ApiPropertyOptional({ description: 'Private note' })
  privateNote?: string;

  @ApiProperty({ description: 'SyncToken for optimistic locking' })
  syncToken!: string;

  @ApiProperty({ description: 'Last updated timestamp' })
  lastUpdated!: string;
}

/**
 * Create bill payment from payment application DTO
 */
export class CreateBillPaymentFromPaymentApplicationDto {
  @ApiProperty({ description: 'Payment application ID' })
  @IsString()
  paymentApplicationId!: string;

  @ApiProperty({ description: 'Payment type (Check or CreditCard)' })
  @IsEnum(QBPaymentType)
  payType!: QBPaymentType;

  @ApiPropertyOptional({
    description: 'Bank account reference ID (required for Check payments)',
  })
  @IsOptional()
  @IsString()
  bankAccountRef?: string;

  @ApiPropertyOptional({
    description: 'Credit card account reference ID (required for CreditCard payments)',
  })
  @IsOptional()
  @IsString()
  creditCardAccountRef?: string;

  @ApiPropertyOptional({ description: 'Check number (for Check payments)' })
  @IsOptional()
  @IsString()
  checkNum?: string;
}

/**
 * Query bill payments DTO
 */
export class QueryBillPaymentsDto {
  @ApiPropertyOptional({ description: 'Vendor reference ID' })
  @IsOptional()
  @IsString()
  vendorRef?: string;

  @ApiPropertyOptional({ description: 'Payment type' })
  @IsOptional()
  @IsEnum(QBPaymentType)
  payType?: QBPaymentType;

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
 * Bill payments list response DTO
 */
export class QBBillPaymentsListResponseDto {
  @ApiProperty({
    type: [QBBillPaymentResponseDto],
    description: 'List of bill payments',
  })
  billPayments!: QBBillPaymentResponseDto[];

  @ApiProperty({ description: 'Total count of bill payments' })
  totalCount!: number;

  @ApiProperty({ description: 'Start position' })
  startPosition!: number;

  @ApiProperty({ description: 'Maximum results per page' })
  maxResults!: number;
}
