import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AggregationFunction } from '../../entities/custom-report.entity';

/**
 * Custom Report Aggregation DTO
 *
 * Defines an aggregation function to apply in a custom report.
 */
export class CustomReportAggregationDto {
  @ApiProperty({
    description: 'Field to aggregate (e.g., "budget.totalBudget")',
    example: 'budget.totalBudget',
  })
  @IsString()
  field!: string;

  @ApiProperty({
    description: 'Aggregation function',
    enum: AggregationFunction,
    example: AggregationFunction.SUM,
  })
  @IsEnum(AggregationFunction)
  function!: AggregationFunction;

  @ApiProperty({
    description: 'Display label for aggregation',
    example: 'Total Budget',
  })
  @IsString()
  label!: string;

  @ApiPropertyOptional({
    description: 'Alias for the aggregation result',
    example: 'totalBudget',
  })
  @IsOptional()
  @IsString()
  alias?: string;
}
