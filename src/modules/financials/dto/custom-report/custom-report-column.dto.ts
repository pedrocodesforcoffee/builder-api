import { IsString, IsEnum, IsBoolean, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ColumnDataType } from '../../entities/custom-report.entity';

/**
 * Custom Report Column DTO
 *
 * Defines a column in a custom report, including its data source,
 * display properties, and optional formula for calculated columns.
 */
export class CustomReportColumnDto {
  @ApiProperty({
    description: 'Field path (e.g., "budget.totalBudget", "costCode.code")',
    example: 'budget.totalBudget',
  })
  @IsString()
  field!: string;

  @ApiProperty({
    description: 'Display label for the column',
    example: 'Total Budget',
  })
  @IsString()
  label!: string;

  @ApiProperty({
    description: 'Data type for formatting',
    enum: ColumnDataType,
    example: ColumnDataType.CURRENCY,
  })
  @IsEnum(ColumnDataType)
  dataType!: ColumnDataType;

  @ApiPropertyOptional({
    description: 'Column width in pixels',
    example: 150,
  })
  @IsOptional()
  @IsInt()
  @Min(50)
  width?: number;

  @ApiProperty({
    description: 'Whether column is visible',
    example: true,
  })
  @IsBoolean()
  visible!: boolean;

  @ApiPropertyOptional({
    description: 'Formula for calculated columns (e.g., "field1 + field2")',
    example: 'budget.totalBudget - budget.actualCost',
  })
  @IsOptional()
  @IsString()
  formula?: string;
}
