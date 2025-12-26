import { IsString, IsOptional, IsNumber, IsDateString, IsArray, ValidateNested, IsBoolean, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * QuickBooks Journal Entry DTOs
 *
 * Data transfer objects for QuickBooks journal entry operations.
 * Used for exporting cost entries, accruals, and period-end adjustments.
 */

/**
 * Journal Entry Line Posting Type
 */
export enum JEPostingType {
  DEBIT = 'Debit',
  CREDIT = 'Credit',
}

/**
 * Journal Entry Line DTO
 */
export class QBJournalEntryLineDto {
  @ApiPropertyOptional({ description: 'Line ID' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: 'Line amount' })
  @IsNumber()
  amount!: number;

  @ApiProperty({ description: 'Posting type (Debit/Credit)' })
  @IsEnum(JEPostingType)
  postingType!: JEPostingType;

  @ApiProperty({ description: 'Account reference ID' })
  @IsString()
  accountRef!: string;

  @ApiPropertyOptional({ description: 'Line description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Entity reference (Customer, Vendor, etc.)' })
  @IsOptional()
  @IsString()
  entityRef?: string;

  @ApiPropertyOptional({ description: 'Entity type' })
  @IsOptional()
  @IsString()
  entityType?: 'Customer' | 'Vendor' | 'Employee';

  @ApiPropertyOptional({ description: 'Class reference' })
  @IsOptional()
  @IsString()
  classRef?: string;
}

/**
 * Create QuickBooks Journal Entry DTO
 */
export class CreateQBJournalEntryDto {
  @ApiProperty({ description: 'Transaction date' })
  @IsDateString()
  txnDate!: string;

  @ApiProperty({ description: 'Journal entry lines (must balance)', type: [QBJournalEntryLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QBJournalEntryLineDto)
  lines!: QBJournalEntryLineDto[];

  @ApiPropertyOptional({ description: 'Document number' })
  @IsOptional()
  @IsString()
  docNumber?: string;

  @ApiPropertyOptional({ description: 'Private note/memo' })
  @IsOptional()
  @IsString()
  privateNote?: string;

  @ApiPropertyOptional({ description: 'Currency reference' })
  @IsOptional()
  @IsString()
  currencyRef?: string;

  @ApiPropertyOptional({ description: 'Exchange rate' })
  @IsOptional()
  @IsNumber()
  exchangeRate?: number;
}

/**
 * Update QuickBooks Journal Entry DTO
 */
export class UpdateQBJournalEntryDto extends CreateQBJournalEntryDto {
  @ApiProperty({ description: 'QuickBooks journal entry ID' })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'Sync token for optimistic locking' })
  @IsString()
  syncToken!: string;
}

/**
 * QuickBooks Journal Entry Response DTO
 */
export class QBJournalEntryResponseDto {
  @ApiProperty({ description: 'QuickBooks journal entry ID' })
  id!: string;

  @ApiProperty({ description: 'Sync token' })
  syncToken!: string;

  @ApiProperty({ description: 'Transaction date' })
  txnDate!: string;

  @ApiPropertyOptional({ description: 'Document number' })
  docNumber?: string;

  @ApiProperty({ description: 'Journal entry lines' })
  lines!: Array<{
    id: string;
    amount: number;
    detailType: string;
    journalEntryLineDetail: {
      postingType: string;
      accountRef: { value: string; name: string };
      entityRef?: { value: string; name: string; type: string };
      classRef?: { value: string; name: string };
    };
    description?: string;
  }>;

  @ApiProperty({ description: 'Total amount (debit side)' })
  totalAmt!: number;

  @ApiPropertyOptional({ description: 'Private note' })
  privateNote?: string;

  @ApiProperty({ description: 'Metadata' })
  metaData!: {
    createTime: string;
    lastUpdatedTime: string;
  };

  @ApiPropertyOptional({ description: 'Adjustment flag' })
  adjustment?: boolean;
}

/**
 * Export Cost Entries as Journal Entry DTO
 */
export class ExportCostEntriesAsJEDto {
  @ApiProperty({ description: 'Cost entry IDs to export', type: [String] })
  @IsArray()
  @IsString({ each: true })
  costEntryIds!: string[];

  @ApiProperty({ description: 'Transaction date for the journal entry' })
  @IsDateString()
  txnDate!: string;

  @ApiPropertyOptional({ description: 'Document number' })
  @IsOptional()
  @IsString()
  docNumber?: string;

  @ApiPropertyOptional({ description: 'Memo/description' })
  @IsOptional()
  @IsString()
  memo?: string;

  @ApiPropertyOptional({ description: 'Credit account reference (AP/Cash)' })
  @IsOptional()
  @IsString()
  creditAccountRef?: string;
}

/**
 * Export Period End Journal Entry DTO
 */
export class ExportPeriodEndJEDto {
  @ApiProperty({ description: 'Cost period ID' })
  @IsString()
  costPeriodId!: string;

  @ApiProperty({ description: 'Journal entry type' })
  @IsEnum(['ACCRUAL', 'RETENTION', 'ADJUSTMENT'])
  jeType!: 'ACCRUAL' | 'RETENTION' | 'ADJUSTMENT';

  @ApiProperty({ description: 'Transaction date' })
  @IsDateString()
  txnDate!: string;

  @ApiPropertyOptional({ description: 'Document number' })
  @IsOptional()
  @IsString()
  docNumber?: string;

  @ApiPropertyOptional({ description: 'Memo' })
  @IsOptional()
  @IsString()
  memo?: string;
}

/**
 * Journal Entry Export Result DTO
 */
export class JEExportResultDto {
  @ApiProperty({ description: 'Success status' })
  @IsBoolean()
  success!: boolean;

  @ApiProperty({ description: 'QuickBooks journal entry ID' })
  @IsString()
  qbJournalEntryId!: string;

  @ApiProperty({ description: 'Number of lines' })
  @IsNumber()
  lineCount!: number;

  @ApiProperty({ description: 'Total debit amount' })
  @IsNumber()
  totalDebit!: number;

  @ApiProperty({ description: 'Total credit amount' })
  @IsNumber()
  totalCredit!: number;

  @ApiPropertyOptional({ description: 'Document number' })
  @IsOptional()
  @IsString()
  docNumber?: string;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  @IsOptional()
  @IsString()
  error?: string;
}

/**
 * Query Journal Entries DTO
 */
export class QueryJournalEntriesDto {
  @ApiPropertyOptional({ description: 'Filter by start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Filter by end date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter by account' })
  @IsOptional()
  @IsString()
  accountId?: string;

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
 * Journal Entries List Response DTO
 */
export class QBJournalEntriesListResponseDto {
  @ApiProperty({ description: 'List of journal entries', type: [QBJournalEntryResponseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QBJournalEntryResponseDto)
  journalEntries!: QBJournalEntryResponseDto[];

  @ApiProperty({ description: 'Total count' })
  @IsNumber()
  totalCount!: number;
}

/**
 * Journal Entry Status DTO
 */
export class JEStatusDto {
  @ApiProperty({ description: 'Is exported to QuickBooks' })
  @IsBoolean()
  isExported!: boolean;

  @ApiPropertyOptional({ description: 'QuickBooks journal entry ID' })
  @IsOptional()
  @IsString()
  qbJournalEntryId?: string;

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
 * Journal Entry Validation Result
 */
export class JEValidationResultDto {
  @ApiProperty({ description: 'Is valid (debits = credits)' })
  @IsBoolean()
  isValid!: boolean;

  @ApiProperty({ description: 'Total debits' })
  @IsNumber()
  totalDebits!: number;

  @ApiProperty({ description: 'Total credits' })
  @IsNumber()
  totalCredits!: number;

  @ApiPropertyOptional({ description: 'Difference amount' })
  @IsOptional()
  @IsNumber()
  difference?: number;

  @ApiPropertyOptional({ description: 'Validation errors', type: [String] })
  @IsOptional()
  @IsArray()
  errors?: string[];
}
