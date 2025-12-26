import { IsOptional, IsBoolean, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Custom Report Query DTO
 *
 * Query parameters for listing custom reports.
 */
export class CustomReportQueryDto {
  @ApiPropertyOptional({
    description: 'Include only public reports',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  publicOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Include only private reports (created by current user)',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  privateOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Number of records to skip',
    example: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  skip?: number;

  @ApiPropertyOptional({
    description: 'Number of records to return',
    example: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  take?: number;
}
