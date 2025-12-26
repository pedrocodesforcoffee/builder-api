import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID, IsString, IsBoolean } from 'class-validator';

/**
 * Create Account Mapping DTO
 */
export class CreateAccountMappingDto {
  @ApiProperty({ description: 'Mapping type', enum: ['COST_CODE', 'CATEGORY', 'DEFAULT'] })
  @IsEnum(['COST_CODE', 'CATEGORY', 'DEFAULT'])
  mappingType!: 'COST_CODE' | 'CATEGORY' | 'DEFAULT';

  @ApiPropertyOptional({ description: 'Cost code ID (required for COST_CODE type)' })
  @IsOptional()
  @IsUUID()
  costCodeId?: string;

  @ApiPropertyOptional({ description: 'Category name (required for CATEGORY type)' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'QuickBooks Account ID' })
  @IsString()
  qbAccountId!: string;

  @ApiProperty({ description: 'QuickBooks Account Name' })
  @IsString()
  qbAccountName!: string;

  @ApiProperty({ description: 'QuickBooks Account Type' })
  @IsString()
  qbAccountType!: string;

  @ApiPropertyOptional({ description: 'QuickBooks Account Classification' })
  @IsOptional()
  @IsString()
  qbAccountClassification?: string;

  @ApiPropertyOptional({ description: 'Mapping notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Update Account Mapping DTO
 */
export class UpdateAccountMappingDto {
  @ApiPropertyOptional({ description: 'Account Mapping ID' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({ description: 'QuickBooks Account ID' })
  @IsOptional()
  @IsString()
  qbAccountId?: string;

  @ApiPropertyOptional({ description: 'QuickBooks Account Name' })
  @IsOptional()
  @IsString()
  qbAccountName?: string;

  @ApiPropertyOptional({ description: 'QuickBooks Account Type' })
  @IsOptional()
  @IsString()
  qbAccountType?: string;

  @ApiPropertyOptional({ description: 'QuickBooks Account Classification' })
  @IsOptional()
  @IsString()
  qbAccountClassification?: string;

  @ApiPropertyOptional({ description: 'Mapping is active' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Mapping notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Account Mapping Response DTO
 */
export class AccountMappingResponseDto {
  @ApiProperty({ description: 'Mapping ID' })
  id!: string;

  @ApiProperty({ description: 'Organization ID' })
  organizationId!: string;

  @ApiProperty({ description: 'Mapping type', enum: ['COST_CODE', 'CATEGORY', 'DEFAULT'] })
  mappingType!: 'COST_CODE' | 'CATEGORY' | 'DEFAULT';

  @ApiPropertyOptional({ description: 'Cost code ID' })
  costCodeId?: string;

  @ApiPropertyOptional({ description: 'Cost code details' })
  costCode?: {
    code: string;
    description: string;
  };

  @ApiPropertyOptional({ description: 'Category name' })
  category?: string;

  @ApiProperty({ description: 'QuickBooks Account ID' })
  qbAccountId!: string;

  @ApiProperty({ description: 'QuickBooks Account Name' })
  qbAccountName!: string;

  @ApiProperty({ description: 'QuickBooks Account Type' })
  qbAccountType!: string;

  @ApiPropertyOptional({ description: 'QuickBooks Account Classification' })
  qbAccountClassification?: string;

  @ApiProperty({ description: 'Mapping is active' })
  active!: boolean;

  @ApiPropertyOptional({ description: 'Mapping notes' })
  notes?: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt!: Date;
}

/**
 * QuickBooks Account DTO (from QB API)
 */
export class QBAccountDto {
  @ApiProperty({ description: 'QuickBooks Account ID' })
  id!: string;

  @ApiProperty({ description: 'Account name' })
  name!: string;

  @ApiProperty({ description: 'Account type' })
  accountType!: string;

  @ApiPropertyOptional({ description: 'Account sub-type' })
  accountSubType?: string;

  @ApiPropertyOptional({ description: 'Classification' })
  classification?: string;

  @ApiPropertyOptional({ description: 'Account number' })
  accountNumber?: string;

  @ApiProperty({ description: 'Is account active' })
  active!: boolean;

  @ApiPropertyOptional({ description: 'Current balance' })
  currentBalance?: number;
}

/**
 * Auto-map Accounts Request DTO
 */
export class AutoMapAccountsDto {
  @ApiProperty({ description: 'Organization ID' })
  @IsUUID()
  organizationId!: string;

  @ApiPropertyOptional({ description: 'Create missing accounts in QuickBooks' })
  @IsOptional()
  @IsBoolean()
  createMissingAccounts?: boolean;
}
