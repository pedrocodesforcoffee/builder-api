import {
  IsString,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * QuickBooks Vendor DTOs
 *
 * Data transfer objects for QuickBooks Vendor entity operations.
 * Vendors in QuickBooks represent companies or individuals from whom you buy goods or services.
 *
 * API Reference: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/vendor
 */

/**
 * Phone number structure
 */
export class QBPhoneDto {
  @ApiPropertyOptional({ description: 'Free form phone number' })
  @IsOptional()
  @IsString()
  freeFormNumber?: string;
}

/**
 * Email address structure
 */
export class QBEmailDto {
  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  address?: string;
}

/**
 * Physical address structure
 */
export class QBAddressDto {
  @ApiPropertyOptional({ description: 'Line 1 of the address' })
  @IsOptional()
  @IsString()
  line1?: string;

  @ApiPropertyOptional({ description: 'Line 2 of the address' })
  @IsOptional()
  @IsString()
  line2?: string;

  @ApiPropertyOptional({ description: 'Line 3 of the address' })
  @IsOptional()
  @IsString()
  line3?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Country subdivision code (e.g., state, province)' })
  @IsOptional()
  @IsString()
  countrySubDivisionCode?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Country' })
  @IsOptional()
  @IsString()
  country?: string;
}

/**
 * Create vendor DTO
 */
export class CreateQBVendorDto {
  @ApiProperty({ description: 'Vendor display name' })
  @IsString()
  displayName!: string;

  @ApiPropertyOptional({ description: 'Company name' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ description: 'Given name (first name)' })
  @IsOptional()
  @IsString()
  givenName?: string;

  @ApiPropertyOptional({ description: 'Family name (last name)' })
  @IsOptional()
  @IsString()
  familyName?: string;

  @ApiPropertyOptional({ description: 'Primary phone number' })
  @IsOptional()
  @ValidateNested()
  @Type(() => QBPhoneDto)
  primaryPhone?: QBPhoneDto;

  @ApiPropertyOptional({ description: 'Mobile phone number' })
  @IsOptional()
  @ValidateNested()
  @Type(() => QBPhoneDto)
  mobile?: QBPhoneDto;

  @ApiPropertyOptional({ description: 'Primary email address' })
  @IsOptional()
  @ValidateNested()
  @Type(() => QBEmailDto)
  primaryEmailAddr?: QBEmailDto;

  @ApiPropertyOptional({ description: 'Website URL' })
  @IsOptional()
  @IsString()
  webAddr?: string;

  @ApiPropertyOptional({ description: 'Billing address' })
  @IsOptional()
  @ValidateNested()
  @Type(() => QBAddressDto)
  billAddr?: QBAddressDto;

  @ApiPropertyOptional({ description: 'Tax identifier (e.g., EIN, SSN)' })
  @IsOptional()
  @IsString()
  taxIdentifier?: string;

  @ApiPropertyOptional({ description: 'Terms reference ID (payment terms)' })
  @IsOptional()
  @IsString()
  termRef?: string;

  @ApiPropertyOptional({ description: 'Vendor 1099 indicator' })
  @IsOptional()
  @IsBoolean()
  vendor1099?: boolean;

  @ApiPropertyOptional({ description: 'Account number' })
  @IsOptional()
  @IsString()
  accNum?: string;

  @ApiPropertyOptional({ description: 'Print on check name' })
  @IsOptional()
  @IsString()
  printOnCheckName?: string;
}

/**
 * Update vendor DTO
 */
export class UpdateQBVendorDto {
  @ApiProperty({ description: 'SyncToken for optimistic locking' })
  @IsString()
  syncToken!: string;

  @ApiPropertyOptional({ description: 'Vendor display name' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ description: 'Company name' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ description: 'Given name (first name)' })
  @IsOptional()
  @IsString()
  givenName?: string;

  @ApiPropertyOptional({ description: 'Family name (last name)' })
  @IsOptional()
  @IsString()
  familyName?: string;

  @ApiPropertyOptional({ description: 'Primary phone number' })
  @IsOptional()
  @ValidateNested()
  @Type(() => QBPhoneDto)
  primaryPhone?: QBPhoneDto;

  @ApiPropertyOptional({ description: 'Primary email address' })
  @IsOptional()
  @ValidateNested()
  @Type(() => QBEmailDto)
  primaryEmailAddr?: QBEmailDto;

  @ApiPropertyOptional({ description: 'Billing address' })
  @IsOptional()
  @ValidateNested()
  @Type(() => QBAddressDto)
  billAddr?: QBAddressDto;

  @ApiPropertyOptional({ description: 'Active status' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Terms reference ID (payment terms)' })
  @IsOptional()
  @IsString()
  termRef?: string;

  @ApiPropertyOptional({ description: 'Account number' })
  @IsOptional()
  @IsString()
  accNum?: string;
}

/**
 * Query vendors DTO
 */
export class QueryVendorsDto {
  @ApiPropertyOptional({ description: 'Display name contains (partial match)' })
  @IsOptional()
  @IsString()
  displayNameContains?: string;

  @ApiPropertyOptional({ description: 'Active vendors only', default: true })
  @IsOptional()
  @IsBoolean()
  activeOnly?: boolean = true;

  @ApiPropertyOptional({ description: 'Vendor 1099 status' })
  @IsOptional()
  @IsBoolean()
  vendor1099?: boolean;

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
 * Vendor response DTO
 */
export class QBVendorResponseDto {
  @ApiProperty({ description: 'QuickBooks vendor ID' })
  id!: string;

  @ApiProperty({ description: 'Vendor display name' })
  displayName!: string;

  @ApiPropertyOptional({ description: 'Company name' })
  companyName?: string;

  @ApiPropertyOptional({ description: 'Given name (first name)' })
  givenName?: string;

  @ApiPropertyOptional({ description: 'Family name (last name)' })
  familyName?: string;

  @ApiPropertyOptional({ description: 'Primary phone number' })
  primaryPhone?: QBPhoneDto;

  @ApiPropertyOptional({ description: 'Mobile phone number' })
  mobile?: QBPhoneDto;

  @ApiPropertyOptional({ description: 'Primary email address' })
  primaryEmailAddr?: QBEmailDto;

  @ApiPropertyOptional({ description: 'Website URL' })
  webAddr?: string;

  @ApiPropertyOptional({ description: 'Billing address' })
  billAddr?: QBAddressDto;

  @ApiPropertyOptional({ description: 'Tax identifier' })
  taxIdentifier?: string;

  @ApiPropertyOptional({ description: 'Terms reference' })
  termRef?: string;

  @ApiPropertyOptional({ description: 'Vendor 1099 indicator' })
  vendor1099?: boolean;

  @ApiPropertyOptional({ description: 'Account number' })
  accNum?: string;

  @ApiPropertyOptional({ description: 'Print on check name' })
  printOnCheckName?: string;

  @ApiProperty({ description: 'Active status' })
  active!: boolean;

  @ApiProperty({ description: 'Balance amount' })
  balance!: number;

  @ApiProperty({ description: 'SyncToken for optimistic locking' })
  syncToken!: string;

  @ApiProperty({ description: 'Last updated timestamp' })
  lastUpdated!: string;
}

/**
 * Vendors list response DTO
 */
export class QBVendorsListResponseDto {
  @ApiProperty({ type: [QBVendorResponseDto], description: 'List of vendors' })
  vendors!: QBVendorResponseDto[];

  @ApiProperty({ description: 'Total count of vendors' })
  totalCount!: number;

  @ApiProperty({ description: 'Start position' })
  startPosition!: number;

  @ApiProperty({ description: 'Maximum results per page' })
  maxResults!: number;
}

/**
 * Link vendor to commitment DTO
 */
export class LinkVendorToCommitmentDto {
  @ApiProperty({ description: 'Platform commitment ID' })
  @IsString()
  commitmentId!: string;

  @ApiProperty({ description: 'QuickBooks vendor ID' })
  @IsString()
  qbVendorId!: string;
}

/**
 * Sync vendor from commitment DTO
 */
export class SyncVendorFromCommitmentDto {
  @ApiProperty({ description: 'Platform commitment ID to sync' })
  @IsString()
  commitmentId!: string;

  @ApiPropertyOptional({
    description: 'Create new vendor if not linked',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  createIfNotExists?: boolean = true;
}
