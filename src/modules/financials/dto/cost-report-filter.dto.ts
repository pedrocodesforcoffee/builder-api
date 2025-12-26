import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsUUID,
  IsEnum,
  IsDateString,
  IsArray,
  IsNumber,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CostEntryType } from '../enums/cost-entry-type.enum';
import { CostEntryStatus } from '../enums/cost-entry-status.enum';

/**
 * Report Group By Enum
 * Defines how cost report data should be grouped
 */
export enum ReportGroupBy {
  /** Group by cost code */
  COST_CODE = 'COST_CODE',

  /** Group by time period (month, quarter, etc.) */
  PERIOD = 'PERIOD',

  /** Group by cost entry type (labor, material, etc.) */
  TYPE = 'TYPE',

  /** Group by cost entry status (draft, posted, etc.) */
  STATUS = 'STATUS',
}

/**
 * Variance Type Filter Enum
 * Filter to include specific variance types in the report
 */
export enum VarianceType {
  /** Include only positive variances (under budget) */
  POSITIVE = 'POSITIVE',

  /** Include only negative variances (over budget) */
  NEGATIVE = 'NEGATIVE',

  /** Include all variances */
  ALL = 'ALL',
}

/**
 * Cost Report Filter DTO
 *
 * Comprehensive filtering parameters for generating cost reports and summaries.
 *
 * This DTO enables flexible report generation with multiple filter dimensions:
 *
 * **Scope Filters:**
 * - projectId (required) - Limits report to a specific project
 * - budgetId (optional) - Limits to a specific budget within the project
 * - costCodeId[] (optional) - Includes only specified cost codes
 *
 * **Date Range Filters:**
 * - fromDate (optional) - Start date for cost entries
 * - toDate (optional) - End date for cost entries
 *
 * **Grouping:**
 * - groupBy (optional) - How to group/aggregate report data
 *   - COST_CODE: One row per cost code
 *   - PERIOD: One row per time period
 *   - TYPE: One row per cost type
 *   - STATUS: One row per status
 *
 * **Variance Filters:**
 * - minVariance (optional) - Minimum variance amount to include
 * - maxVariance (optional) - Maximum variance amount to include
 * - varianceType (optional) - Include positive, negative, or all variances
 *
 * **Cost Type Filters:**
 * - includeTypes[] (optional) - Only include these cost entry types
 * - includeStatuses[] (optional) - Only include these cost entry statuses
 *
 * Use Cases:
 * - Cost summary reports by cost code
 * - Monthly/quarterly cost analysis
 * - Budget variance reports (over/under budget)
 * - Cost type analysis (labor vs material vs equipment)
 * - Status-based reports (posted vs draft vs void)
 * - Custom filtered exports for stakeholders
 *
 * @example
 * {
 *   "projectId": "proj-123",
 *   "budgetId": "budget-456",
 *   "costCodeId": ["cc-100", "cc-200"],
 *   "fromDate": "2024-01-01",
 *   "toDate": "2024-03-31",
 *   "groupBy": "COST_CODE",
 *   "minVariance": -50000,
 *   "maxVariance": 0,
 *   "varianceType": "NEGATIVE",
 *   "includeTypes": ["LABOR", "MATERIAL"],
 *   "includeStatuses": ["POSTED"]
 * }
 */
export class CostReportFilterDto {
  @ApiProperty({
    description: 'Project UUID (required) - Defines the scope of the report',
    example: 'proj-123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  projectId!: string;

  @ApiPropertyOptional({
    description: 'Budget UUID (optional) - Filter by specific budget',
    example: 'budget-123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  budgetId?: string;

  @ApiPropertyOptional({
    description: 'Array of cost code UUIDs to include in the report',
    type: [String],
    example: ['cc-123e4567', 'cc-234e5678', 'cc-345e6789'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  costCodeId?: string[];

  @ApiPropertyOptional({
    description: 'Start date for filtering cost entries (ISO 8601 format)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'End date for filtering cost entries (ISO 8601 format)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({
    description: 'Group report data by: COST_CODE, PERIOD, TYPE, or STATUS',
    enum: ReportGroupBy,
    example: ReportGroupBy.COST_CODE,
  })
  @IsOptional()
  @IsEnum(ReportGroupBy)
  groupBy?: ReportGroupBy;

  @ApiPropertyOptional({
    description: 'Minimum variance amount to include (use negative for over-budget filter)',
    example: -50000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minVariance?: number;

  @ApiPropertyOptional({
    description: 'Maximum variance amount to include (use 0 for over-budget only)',
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxVariance?: number;

  @ApiPropertyOptional({
    description: 'Filter by variance type: POSITIVE (under budget), NEGATIVE (over budget), or ALL',
    enum: VarianceType,
    example: VarianceType.NEGATIVE,
  })
  @IsOptional()
  @IsEnum(VarianceType)
  varianceType?: VarianceType;

  @ApiPropertyOptional({
    description: 'Array of cost entry types to include in the report',
    type: [String],
    enum: CostEntryType,
    example: [CostEntryType.LABOR, CostEntryType.MATERIAL, CostEntryType.EQUIPMENT],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(CostEntryType, { each: true })
  includeTypes?: CostEntryType[];

  @ApiPropertyOptional({
    description: 'Array of cost entry statuses to include in the report',
    type: [String],
    enum: CostEntryStatus,
    example: [CostEntryStatus.POSTED],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(CostEntryStatus, { each: true })
  includeStatuses?: CostEntryStatus[];
}
