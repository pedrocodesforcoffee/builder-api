import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsUUID,
  IsEnum,
  IsDateString,
  IsString,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CostEntryType } from '../enums/cost-entry-type.enum';
import { CostEntryStatus } from '../enums/cost-entry-status.enum';

/**
 * Cost Entry Filter DTO
 *
 * Parameters for filtering, sorting, and paginating cost entries.
 *
 * Supports comprehensive filtering by:
 * - Related entities (project, budget, cost code, commitment, cost period)
 * - Entry attributes (type, status, vendor, invoice number)
 * - Date ranges (fromDate, toDate)
 *
 * Includes pagination and sorting capabilities for efficient
 * retrieval of large cost entry datasets.
 */
export class CostEntryFilterDto {
  /**
   * Project UUID (Optional)
   * Filter cost entries by project
   */
  @ApiPropertyOptional({
    description: 'Filter by project UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  /**
   * Budget UUID (Optional)
   * Filter cost entries by budget
   */
  @ApiPropertyOptional({
    description: 'Filter by budget UUID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID()
  budgetId?: string;

  /**
   * Cost Code UUID (Optional)
   * Filter cost entries by cost code
   */
  @ApiPropertyOptional({
    description: 'Filter by cost code UUID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsOptional()
  @IsUUID()
  costCodeId?: string;

  /**
   * Cost Entry Type (Optional)
   * Filter by cost entry type
   */
  @ApiPropertyOptional({
    description: 'Filter by cost entry type',
    enum: CostEntryType,
    example: CostEntryType.MATERIAL,
  })
  @IsOptional()
  @IsEnum(CostEntryType)
  type?: CostEntryType;

  /**
   * Cost Entry Status (Optional)
   * Filter by cost entry status
   */
  @ApiPropertyOptional({
    description: 'Filter by cost entry status',
    enum: CostEntryStatus,
    example: CostEntryStatus.POSTED,
  })
  @IsOptional()
  @IsEnum(CostEntryStatus)
  status?: CostEntryStatus;

  /**
   * From Date (Optional)
   * Filter entries on or after this date
   */
  @ApiPropertyOptional({
    description: 'Filter entries on or after this date (ISO 8601)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  /**
   * To Date (Optional)
   * Filter entries on or before this date
   */
  @ApiPropertyOptional({
    description: 'Filter entries on or before this date (ISO 8601)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  /**
   * Commitment UUID (Optional)
   * Filter cost entries linked to a specific commitment
   */
  @ApiPropertyOptional({
    description: 'Filter by commitment UUID',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  @IsOptional()
  @IsUUID()
  commitmentId?: string;

  /**
   * Cost Period UUID (Optional)
   * Filter cost entries by cost period
   */
  @ApiPropertyOptional({
    description: 'Filter by cost period UUID',
    example: '123e4567-e89b-12d3-a456-426614174005',
  })
  @IsOptional()
  @IsUUID()
  costPeriodId?: string;

  /**
   * Vendor (Optional)
   * Filter by vendor name (partial match)
   */
  @ApiPropertyOptional({
    description: 'Filter by vendor name (partial match)',
    example: 'ABC Supply',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  vendor?: string;

  /**
   * Invoice Number (Optional)
   * Filter by invoice number (partial match)
   */
  @ApiPropertyOptional({
    description: 'Filter by invoice number (partial match)',
    example: 'INV-2024',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  invoiceNumber?: string;

  /**
   * Page (Optional)
   * Page number for pagination (1-based)
   */
  @ApiProperty({
    description: 'Page number (1-based)',
    required: false,
    default: 1,
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /**
   * Limit (Optional)
   * Number of items per page
   */
  @ApiProperty({
    description: 'Number of items per page',
    required: false,
    default: 50,
    minimum: 1,
    maximum: 100,
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  /**
   * Sort By (Optional)
   * Field to sort by
   */
  @ApiProperty({
    description: 'Field to sort by',
    required: false,
    default: 'entryDate',
    example: 'entryDate',
    enum: [
      'entryDate',
      'totalCost',
      'type',
      'status',
      'vendor',
      'invoiceNumber',
      'createdAt',
      'updatedAt',
      'postedAt',
    ],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'entryDate';

  /**
   * Sort Order (Optional)
   * Sort direction (ascending or descending)
   */
  @ApiProperty({
    description: 'Sort order (ascending or descending)',
    required: false,
    default: 'DESC',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
