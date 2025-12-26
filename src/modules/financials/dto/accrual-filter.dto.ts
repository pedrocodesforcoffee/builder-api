import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsEnum,
  IsDateString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { AccrualStatus } from '../enums';

/**
 * Accrual Filter DTO
 *
 * Data Transfer Object for filtering, searching, and paginating accruals.
 * Provides comprehensive query capabilities for accrual lists and reports.
 *
 * **Query Features:**
 * - Filter by project, budget, cost code
 * - Filter by status (ACTIVE, REVERSED, CONVERTED, VOID)
 * - Filter by date range (from/to)
 * - Filter by commitment or cost period
 * - Pagination support (page, limit)
 * - Sorting support (sortBy, sortOrder)
 *
 * **Default Behavior:**
 * - Page: 1 (first page)
 * - Limit: 50 records per page (max 100)
 * - Sort By: accrualDate (most recent first)
 * - Sort Order: DESC (descending)
 *
 * **Use Cases:**
 * - List all accruals for a project
 * - Find accruals for specific cost code
 * - Get active accruals for budget reporting
 * - Search accruals by date range
 * - Generate period-based accrual reports
 *
 * @class AccrualFilterDto
 */
export class AccrualFilterDto {
  /**
   * Project UUID filter
   *
   * Filter accruals by project.
   * If not provided, returns accruals from all accessible projects.
   *
   * @example '123e4567-e89b-12d3-a456-426614174000'
   */
  @ApiPropertyOptional({
    description: 'Filter by Project UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Project ID must be a valid UUID v4' })
  projectId?: string;

  /**
   * Budget UUID filter
   *
   * Filter accruals by budget.
   * Useful for budget-specific reports.
   *
   * @example '223e4567-e89b-12d3-a456-426614174001'
   */
  @ApiPropertyOptional({
    description: 'Filter by Budget UUID',
    example: '223e4567-e89b-12d3-a456-426614174001',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Budget ID must be a valid UUID v4' })
  budgetId?: string;

  /**
   * Cost Code UUID filter
   *
   * Filter accruals by cost code.
   * Useful for cost code analysis and tracking.
   *
   * @example '323e4567-e89b-12d3-a456-426614174002'
   */
  @ApiPropertyOptional({
    description: 'Filter by Cost Code UUID',
    example: '323e4567-e89b-12d3-a456-426614174002',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Cost Code ID must be a valid UUID v4' })
  costCodeId?: string;

  /**
   * Status filter
   *
   * Filter accruals by status.
   * Common use: status=ACTIVE for current accruals only.
   *
   * @example 'ACTIVE'
   */
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: AccrualStatus,
    example: AccrualStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(AccrualStatus, {
    message: 'Status must be one of: ACTIVE, REVERSED, CONVERTED, VOID',
  })
  status?: AccrualStatus;

  /**
   * From date filter
   *
   * Filter accruals with accrualDate on or after this date.
   * Used in combination with toDate for date range queries.
   *
   * @example '2025-11-01'
   */
  @ApiPropertyOptional({
    description: 'Filter by accrual date from (inclusive) - ISO 8601 format',
    example: '2025-11-01',
    type: 'string',
    format: 'date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'From date must be a valid ISO 8601 date string' })
  fromDate?: Date;

  /**
   * To date filter
   *
   * Filter accruals with accrualDate on or before this date.
   * Used in combination with fromDate for date range queries.
   *
   * @example '2025-11-30'
   */
  @ApiPropertyOptional({
    description: 'Filter by accrual date to (inclusive) - ISO 8601 format',
    example: '2025-11-30',
    type: 'string',
    format: 'date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'To date must be a valid ISO 8601 date string' })
  toDate?: Date;

  /**
   * Commitment UUID filter
   *
   * Filter accruals linked to a specific commitment.
   * Useful for commitment-related accrual tracking.
   *
   * @example '423e4567-e89b-12d3-a456-426614174003'
   */
  @ApiPropertyOptional({
    description: 'Filter by Commitment UUID',
    example: '423e4567-e89b-12d3-a456-426614174003',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Commitment ID must be a valid UUID v4' })
  commitmentId?: string;

  /**
   * Cost Period UUID filter
   *
   * Filter accruals by cost period.
   * Useful for period-based reporting and analysis.
   *
   * @example '523e4567-e89b-12d3-a456-426614174004'
   */
  @ApiPropertyOptional({
    description: 'Filter by Cost Period UUID',
    example: '523e4567-e89b-12d3-a456-426614174004',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Cost Period ID must be a valid UUID v4' })
  costPeriodId?: string;

  /**
   * Page number
   *
   * The page number for pagination (1-indexed).
   * Must be a positive integer.
   *
   * @example 1
   */
  @ApiPropertyOptional({
    description: 'Page number for pagination (default: 1)',
    example: 1,
    minimum: 1,
    type: 'integer',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  /**
   * Records per page
   *
   * Number of records to return per page.
   * Maximum 100 to prevent performance issues.
   *
   * @example 50
   */
  @ApiPropertyOptional({
    description: 'Number of records per page (default: 50, max: 100)',
    example: 50,
    minimum: 1,
    maximum: 100,
    type: 'integer',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number = 50;

  /**
   * Sort field
   *
   * Field to sort results by.
   * Common options: accrualDate, estimatedCost, status, createdAt.
   *
   * @example 'accrualDate'
   */
  @ApiPropertyOptional({
    description: 'Field to sort by (default: accrualDate)',
    example: 'accrualDate',
    enum: ['accrualDate', 'estimatedCost', 'status', 'createdAt', 'accrualNumber'],
  })
  @IsOptional()
  @IsIn(['accrualDate', 'estimatedCost', 'status', 'createdAt', 'accrualNumber'], {
    message:
      'Sort by must be one of: accrualDate, estimatedCost, status, createdAt, accrualNumber',
  })
  sortBy?: string = 'accrualDate';

  /**
   * Sort order
   *
   * Direction to sort results.
   * ASC: ascending (oldest/smallest first)
   * DESC: descending (newest/largest first)
   *
   * @example 'DESC'
   */
  @ApiPropertyOptional({
    description: 'Sort order - ASC or DESC (default: DESC)',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @Transform(({ value }) => value?.toUpperCase())
  @IsIn(['ASC', 'DESC'], { message: 'Sort order must be ASC or DESC' })
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
