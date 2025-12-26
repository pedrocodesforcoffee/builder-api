import { IsString, IsOptional, IsEmail, IsBoolean, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QBPhoneDto, QBEmailDto, QBAddressDto } from './qb-vendor.dto';

/**
 * QuickBooks Customer DTOs
 *
 * Data transfer objects for QuickBooks customer (owner) operations.
 * Maps construction project owners to QuickBooks customers for invoicing.
 */

/**
 * Create QuickBooks Customer DTO
 */
export class CreateQBCustomerDto {
  @ApiProperty({ description: 'Customer display name' })
  @IsString()
  displayName!: string;

  @ApiPropertyOptional({ description: 'Customer given name' })
  @IsOptional()
  @IsString()
  givenName?: string;

  @ApiPropertyOptional({ description: 'Customer family name' })
  @IsOptional()
  @IsString()
  familyName?: string;

  @ApiPropertyOptional({ description: 'Company name' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ description: 'Primary email address' })
  @IsOptional()
  @IsEmail()
  primaryEmailAddr?: string;

  @ApiPropertyOptional({ description: 'Primary phone number' })
  @IsOptional()
  @IsString()
  primaryPhone?: string;

  @ApiPropertyOptional({ description: 'Billing address' })
  @IsOptional()
  @ValidateNested()
  @Type(() => QBAddressDto)
  billAddr?: QBAddressDto;

  @ApiPropertyOptional({ description: 'Shipping address' })
  @IsOptional()
  @ValidateNested()
  @Type(() => QBAddressDto)
  shipAddr?: QBAddressDto;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Payment terms (e.g., Net 30)' })
  @IsOptional()
  @IsString()
  paymentTermsRef?: string;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

/**
 * Update QuickBooks Customer DTO
 */
export class UpdateQBCustomerDto extends CreateQBCustomerDto {
  @ApiProperty({ description: 'QuickBooks customer ID' })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'Sync token for optimistic locking' })
  @IsString()
  syncToken!: string;
}

/**
 * QuickBooks Customer Response DTO
 */
export class QBCustomerResponseDto {
  @ApiProperty({ description: 'QuickBooks customer ID' })
  id!: string;

  @ApiProperty({ description: 'Sync token' })
  syncToken!: string;

  @ApiProperty({ description: 'Customer display name' })
  displayName!: string;

  @ApiPropertyOptional({ description: 'Given name' })
  givenName?: string;

  @ApiPropertyOptional({ description: 'Family name' })
  familyName?: string;

  @ApiPropertyOptional({ description: 'Company name' })
  companyName?: string;

  @ApiPropertyOptional({ description: 'Primary email' })
  primaryEmailAddr?: QBEmailDto;

  @ApiPropertyOptional({ description: 'Primary phone' })
  primaryPhone?: QBPhoneDto;

  @ApiPropertyOptional({ description: 'Billing address' })
  billAddr?: QBAddressDto;

  @ApiPropertyOptional({ description: 'Shipping address' })
  shipAddr?: QBAddressDto;

  @ApiPropertyOptional({ description: 'Notes' })
  notes?: string;

  @ApiPropertyOptional({ description: 'Balance' })
  balance?: number;

  @ApiPropertyOptional({ description: 'Is active' })
  active?: boolean;

  @ApiProperty({ description: 'Created time' })
  metaData!: {
    createTime: string;
    lastUpdatedTime: string;
  };
}

/**
 * Query Customers DTO
 */
export class QueryCustomersDto {
  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Filter by name (contains)' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ description: 'Maximum results' })
  @IsOptional()
  @IsNumber()
  maxResults?: number;

  @ApiPropertyOptional({ description: 'Start position for pagination' })
  @IsOptional()
  @IsNumber()
  startPosition?: number;
}

/**
 * Customers List Response DTO
 */
export class QBCustomersListResponseDto {
  @ApiProperty({ description: 'List of customers', type: [QBCustomerResponseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QBCustomerResponseDto)
  customers!: QBCustomerResponseDto[];

  @ApiProperty({ description: 'Total count' })
  @IsNumber()
  totalCount!: number;

  @ApiProperty({ description: 'Start position' })
  @IsNumber()
  startPosition!: number;

  @ApiProperty({ description: 'Max results per page' })
  @IsNumber()
  maxResults!: number;
}

/**
 * Link Customer DTO
 */
export class LinkCustomerDto {
  @ApiProperty({ description: 'Platform project ID or owner entity ID' })
  @IsString()
  entityId!: string;

  @ApiProperty({ description: 'QuickBooks customer ID' })
  @IsString()
  qbCustomerId!: string;
}

/**
 * Sync Customer DTO
 */
export class SyncCustomerDto {
  @ApiProperty({ description: 'Platform entity ID (project or owner)' })
  @IsString()
  entityId!: string;

  @ApiPropertyOptional({ description: 'Display name override' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ description: 'Email override' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Phone override' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Address override' })
  @IsOptional()
  @ValidateNested()
  @Type(() => QBAddressDto)
  address?: QBAddressDto;
}

/**
 * Customer Sync Result DTO
 */
export class CustomerSyncResultDto {
  @ApiProperty({ description: 'Success status' })
  @IsBoolean()
  success!: boolean;

  @ApiProperty({ description: 'QuickBooks customer ID' })
  @IsString()
  qbCustomerId!: string;

  @ApiProperty({ description: 'Platform entity ID' })
  @IsString()
  entityId!: string;

  @ApiPropertyOptional({ description: 'Sync operation (created/updated)' })
  @IsOptional()
  @IsString()
  operation?: 'created' | 'updated';

  @ApiPropertyOptional({ description: 'Error message if failed' })
  @IsOptional()
  @IsString()
  error?: string;
}
