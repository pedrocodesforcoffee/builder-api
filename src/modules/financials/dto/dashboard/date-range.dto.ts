import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';

/**
 * Date Range Query Parameters DTO
 *
 * Date range filtering for time-series endpoints (cash flow, cost trend).
 */
export class DateRangeDto {
  @ApiProperty({
    description: 'Start date (ISO 8601)',
    example: '2024-01-01T00:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({
    description: 'End date (ISO 8601)',
    example: '2024-12-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiProperty({
    description: 'Time period grouping',
    enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY'],
    example: 'MONTHLY',
    required: false,
  })
  @IsOptional()
  @IsEnum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY'])
  period?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
}
