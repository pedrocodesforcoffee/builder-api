import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsUUID,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CostTransferStatus } from '../enums/cost-transfer-status.enum';

/**
 * Cost Transfer Filter DTO
 *
 * Parameters for filtering, sorting, and paginating cost transfers.
 *
 * Supports comprehensive filtering by:
 * - Related entities (project, budget, from/to cost codes)
 * - Transfer status (draft, pending, approved, rejected, void)
 * - Date ranges (fromDate, toDate for requestedAt timestamp)
 *
 * Includes pagination and sorting capabilities for efficient
 * retrieval of large cost transfer datasets.
 *
 * Example usage:
 * GET /cost-transfers?projectId=xxx&status=PENDING_APPROVAL&page=1&limit=50
 */
export class CostTransferFilterDto {
  /**
   * Project UUID (Optional)
   * Filter cost transfers by project
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
   * Filter cost transfers by budget
   */
  @ApiPropertyOptional({
    description: 'Filter by budget UUID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID()
  budgetId?: string;

  /**
   * From Cost Code UUID (Optional)
   * Filter by source cost code
   */
  @ApiPropertyOptional({
    description: 'Filter by source cost code UUID (FROM)',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsOptional()
  @IsUUID()
  fromCostCodeId?: string;

  /**
   * To Cost Code UUID (Optional)
   * Filter by target cost code
   */
  @ApiPropertyOptional({
    description: 'Filter by target cost code UUID (TO)',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  @IsOptional()
  @IsUUID()
  toCostCodeId?: string;

  /**
   * Cost Transfer Status (Optional)
   * Filter by transfer status
   */
  @ApiPropertyOptional({
    description: 'Filter by cost transfer status',
    enum: CostTransferStatus,
    example: CostTransferStatus.PENDING_APPROVAL,
  })
  @IsOptional()
  @IsEnum(CostTransferStatus)
  status?: CostTransferStatus;

  /**
   * From Date (Optional)
   * Filter transfers requested on or after this date
   */
  @ApiPropertyOptional({
    description: 'Filter transfers requested on or after this date (ISO 8601)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  /**
   * To Date (Optional)
   * Filter transfers requested on or before this date
   */
  @ApiPropertyOptional({
    description: 'Filter transfers requested on or before this date (ISO 8601)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

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
    default: 'requestedAt',
    example: 'requestedAt',
    enum: ['requestedAt', 'amount', 'status', 'approvedAt', 'createdAt', 'updatedAt'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'requestedAt';

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
