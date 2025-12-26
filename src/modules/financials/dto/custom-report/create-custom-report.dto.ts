import { IsString, IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomReportConfigDto } from './custom-report-config.dto';

/**
 * Create Custom Report DTO
 *
 * Request DTO for creating a new custom report.
 */
export class CreateCustomReportDto {
  @ApiProperty({
    description: 'Report name',
    example: 'Budget Summary by Cost Code',
  })
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    description: 'Report description',
    example: 'Summarizes budget amounts grouped by cost code division',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Report configuration',
    type: CustomReportConfigDto,
  })
  @ValidateNested()
  @Type(() => CustomReportConfigDto)
  config!: CustomReportConfigDto;

  @ApiProperty({
    description: 'Make report visible to all project members',
    example: false,
  })
  @IsBoolean()
  isPublic!: boolean;
}
