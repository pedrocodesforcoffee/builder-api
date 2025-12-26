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
import { CostPeriodStatus } from '../enums/cost-period-status.enum';

/**
 * Cost Period Filter DTO
 *
 * Parameters for filtering, sorting, and paginating cost periods.
 *
 * Supports comprehensive filtering by:
 * - Related entities (project, budget)
 * - Period status (OPEN, CLOSED, LOCKED)
 * - Date ranges (fromDate, toDate for period start/end dates)
 *
 * Includes pagination and sorting capabilities for efficient
 * retrieval of large cost period datasets.
 *
 * Example usage:
 * GET /cost-periods?projectId=xxx&status=OPEN&page=1&limit=50&sortBy=periodStart&sortOrder=DESC
 */
export class CostPeriodFilterDto {
  /**
   * Project UUID (Optional)
   * Filter cost periods by project
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
   * Filter cost periods by budget
   */
  @ApiPropertyOptional({
    description: 'Filter by budget UUID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID()
  budgetId?: string;

  /**
   * Cost Period Status (Optional)
   * Filter by period status
   */
  @ApiPropertyOptional({
    description: 'Filter by cost period status',
    enum: CostPeriodStatus,
    example: CostPeriodStatus.OPEN,
  })
  @IsOptional()
  @IsEnum(CostPeriodStatus)
  status?: CostPeriodStatus;

  /**
   * From Date (Optional)
   * Filter periods starting on or after this date
   */
  @ApiPropertyOptional({
    description: 'Filter periods starting on or after this date (ISO 8601)',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  /**
   * To Date (Optional)
   * Filter periods ending on or before this date
   */
  @ApiPropertyOptional({
    description: 'Filter periods ending on or before this date (ISO 8601)',
    example: '2025-12-31',
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
    default: 'periodStart',
    example: 'periodStart',
    enum: ['periodStart', 'periodEnd', 'periodName', 'status', 'createdAt', 'updatedAt'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'periodStart';

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
