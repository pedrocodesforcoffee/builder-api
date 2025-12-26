import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsEnum, IsNumber } from 'class-validator';

/**
 * QuickBooks Account Type
 */
export enum QBAccountType {
  BANK = 'Bank',
  OTHER_CURRENT_ASSET = 'Other Current Asset',
  FIXED_ASSET = 'Fixed Asset',
  OTHER_ASSET = 'Other Asset',
  ACCOUNTS_RECEIVABLE = 'Accounts Receivable',
  EQUITY = 'Equity',
  EXPENSE = 'Expense',
  OTHER_EXPENSE = 'Other Expense',
  COST_OF_GOODS_SOLD = 'Cost of Goods Sold',
  ACCOUNTS_PAYABLE = 'Accounts Payable',
  CREDIT_CARD = 'Credit Card',
  LONG_TERM_LIABILITY = 'Long Term Liability',
  OTHER_CURRENT_LIABILITY = 'Other Current Liability',
  INCOME = 'Income',
  OTHER_INCOME = 'Other Income',
}

/**
 * QuickBooks Account Classification
 */
export enum QBAccountClassification {
  ASSET = 'Asset',
  EQUITY = 'Equity',
  EXPENSE = 'Expense',
  LIABILITY = 'Liability',
  REVENUE = 'Revenue',
}

/**
 * QuickBooks Account Response DTO
 */
export class QBAccountResponseDto {
  @ApiProperty({ description: 'QuickBooks Account ID' })
  id!: string;

  @ApiProperty({ description: 'Account name' })
  name!: string;

  @ApiProperty({ description: 'Account type', enum: QBAccountType })
  accountType!: QBAccountType;

  @ApiPropertyOptional({ description: 'Account sub-type' })
  accountSubType?: string;

  @ApiProperty({ description: 'Account classification', enum: QBAccountClassification })
  classification!: QBAccountClassification;

  @ApiPropertyOptional({ description: 'Account number' })
  accountNumber?: string;

  @ApiPropertyOptional({ description: 'Account description' })
  description?: string;

  @ApiProperty({ description: 'Is account active' })
  active!: boolean;

  @ApiPropertyOptional({ description: 'Current balance' })
  currentBalance?: number;

  @ApiPropertyOptional({ description: 'Current balance with sub-accounts' })
  currentBalanceWithSubAccounts?: number;

  @ApiPropertyOptional({ description: 'Parent account ID' })
  parentRef?: string;

  @ApiPropertyOptional({ description: 'Is sub-account' })
  subAccount?: boolean;

  @ApiProperty({ description: 'Fully qualified name (includes parent accounts)' })
  fullyQualifiedName!: string;

  @ApiProperty({ description: 'Sync token for optimistic locking' })
  syncToken!: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: string;

  @ApiProperty({ description: 'Last updated timestamp' })
  updatedAt!: string;
}

/**
 * Create QuickBooks Account DTO
 */
export class CreateQBAccountDto {
  @ApiProperty({ description: 'Account name' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Account type', enum: QBAccountType })
  @IsEnum(QBAccountType)
  accountType!: QBAccountType;

  @ApiPropertyOptional({ description: 'Account sub-type' })
  @IsOptional()
  @IsString()
  accountSubType?: string;

  @ApiPropertyOptional({ description: 'Account number' })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiPropertyOptional({ description: 'Account description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Parent account ID (for sub-accounts)' })
  @IsOptional()
  @IsString()
  parentRef?: string;
}

/**
 * Update QuickBooks Account DTO
 */
export class UpdateQBAccountDto {
  @ApiPropertyOptional({ description: 'Account name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Account number' })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiPropertyOptional({ description: 'Account description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Is account active' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({ description: 'Sync token (required for update)' })
  @IsString()
  syncToken!: string;
}

/**
 * Query Accounts Request DTO
 */
export class QueryAccountsDto {
  @ApiPropertyOptional({ description: 'Account type filter', enum: QBAccountType })
  @IsOptional()
  @IsEnum(QBAccountType)
  accountType?: QBAccountType;

  @ApiPropertyOptional({ description: 'Classification filter', enum: QBAccountClassification })
  @IsOptional()
  @IsEnum(QBAccountClassification)
  classification?: QBAccountClassification;

  @ApiPropertyOptional({ description: 'Active accounts only', default: true })
  @IsOptional()
  @IsBoolean()
  activeOnly?: boolean = true;

  @ApiPropertyOptional({ description: 'Search by name (partial match)' })
  @IsOptional()
  @IsString()
  nameContains?: string;

  @ApiPropertyOptional({ description: 'Maximum results to return', default: 100 })
  @IsOptional()
  @IsNumber()
  maxResults?: number = 100;

  @ApiPropertyOptional({ description: 'Starting position (for pagination)', default: 1 })
  @IsOptional()
  @IsNumber()
  startPosition?: number = 1;
}

/**
 * Accounts List Response DTO
 */
export class QBAccountsListResponseDto {
  @ApiProperty({ description: 'List of accounts', type: [QBAccountResponseDto] })
  accounts!: QBAccountResponseDto[];

  @ApiProperty({ description: 'Total count of accounts' })
  totalCount!: number;

  @ApiProperty({ description: 'Starting position' })
  startPosition!: number;

  @ApiProperty({ description: 'Maximum results per page' })
  maxResults!: number;
}
