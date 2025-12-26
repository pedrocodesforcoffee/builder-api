import { IsString, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FilterOperator } from '../../entities/custom-report.entity';

/**
 * Custom Report Filter DTO
 *
 * Defines a filter condition for a custom report.
 * Filters can be static (value provided in config) or dynamic (value provided at runtime).
 */
export class CustomReportFilterDto {
  @ApiProperty({
    description: 'Field to filter on (e.g., "budget.status", "commitment.vendorName")',
    example: 'budget.status',
  })
  @IsString()
  field!: string;

  @ApiProperty({
    description: 'Filter operator',
    enum: FilterOperator,
    example: FilterOperator.EQUALS,
  })
  @IsEnum(FilterOperator)
  operator!: FilterOperator;

  @ApiPropertyOptional({
    description: 'Filter value (if not a runtime parameter)',
    example: 'ACTIVE',
  })
  @IsOptional()
  value?: any;

  @ApiProperty({
    description: 'Whether value is provided at runtime',
    example: false,
  })
  @IsBoolean()
  isParameter!: boolean;

  @ApiPropertyOptional({
    description: 'Name of runtime parameter (if isParameter is true)',
    example: 'budgetStatus',
  })
  @IsOptional()
  @IsString()
  parameterName?: string;
}
