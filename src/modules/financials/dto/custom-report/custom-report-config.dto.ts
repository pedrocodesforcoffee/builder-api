import {
  IsEnum,
  IsArray,
  IsBoolean,
  ValidateNested,
  IsOptional,
  IsString,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrimaryEntity } from '../../entities/custom-report.entity';
import { CustomReportColumnDto } from './custom-report-column.dto';
import { CustomReportFilterDto } from './custom-report-filter.dto';
import { CustomReportJoinDto } from './custom-report-join.dto';
import { CustomReportAggregationDto } from './custom-report-aggregation.dto';
import { CustomReportSortDto } from './custom-report-sort.dto';

/**
 * Custom Report Configuration DTO
 *
 * Complete configuration for a custom report, including entity selection,
 * joins, columns, filters, aggregations, and display options.
 *
 * This is the core structure that defines how a custom report queries and
 * displays data.
 */
export class CustomReportConfigDto {
  @ApiProperty({
    description: 'Primary entity to query',
    enum: PrimaryEntity,
    example: PrimaryEntity.BUDGET,
  })
  @IsEnum(PrimaryEntity)
  primaryEntity!: PrimaryEntity;

  @ApiPropertyOptional({
    description: 'Custom alias for primary entity (defaults to lowercase entity name)',
    example: 'b',
  })
  @IsOptional()
  @IsString()
  primaryAlias?: string;

  @ApiProperty({
    description: 'Entity joins to include',
    type: [CustomReportJoinDto],
    example: [
      {
        entity: 'BudgetLineItem',
        alias: 'lineItem',
        on: 'budget.id = lineItem.budgetId',
        type: 'LEFT',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomReportJoinDto)
  joins!: CustomReportJoinDto[];

  @ApiProperty({
    description: 'Columns to include in report',
    type: [CustomReportColumnDto],
    example: [
      {
        field: 'budget.name',
        label: 'Budget Name',
        dataType: 'STRING',
        visible: true,
      },
      {
        field: 'budget.totalBudget',
        label: 'Total Budget',
        dataType: 'CURRENCY',
        visible: true,
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomReportColumnDto)
  columns!: CustomReportColumnDto[];

  @ApiProperty({
    description: 'Filters to apply',
    type: [CustomReportFilterDto],
    example: [
      {
        field: 'budget.status',
        operator: 'EQUALS',
        value: 'ACTIVE',
        isParameter: false,
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomReportFilterDto)
  filters!: CustomReportFilterDto[];

  @ApiProperty({
    description: 'Fields to group by',
    type: [String],
    example: ['costCode.code'],
  })
  @IsArray()
  @IsString({ each: true })
  groupBy!: string[];

  @ApiProperty({
    description: 'Aggregations to calculate',
    type: [CustomReportAggregationDto],
    example: [
      {
        field: 'budget.totalBudget',
        function: 'SUM',
        label: 'Total Budget',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomReportAggregationDto)
  aggregations!: CustomReportAggregationDto[];

  @ApiProperty({
    description: 'Sort order',
    type: [CustomReportSortDto],
    example: [
      {
        field: 'costCode.code',
        direction: 'ASC',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomReportSortDto)
  sortBy!: CustomReportSortDto[];

  @ApiProperty({
    description: 'Show totals row',
    example: true,
  })
  @IsBoolean()
  showTotals!: boolean;

  @ApiProperty({
    description: 'Show subtotals for grouped data',
    example: false,
  })
  @IsBoolean()
  showSubtotals!: boolean;

  @ApiPropertyOptional({
    description: 'Maximum number of rows to return',
    example: 1000,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Number of rows to skip (for pagination)',
    example: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}
