import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';

/**
 * Dashboard Query Parameters DTO
 *
 * Optional query parameters for the main dashboard endpoint.
 */
export class DashboardParamsDto {
  @ApiProperty({
    description: 'Start date for time-series data (ISO 8601)',
    example: '2024-01-01T00:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({
    description: 'End date for time-series data (ISO 8601)',
    example: '2024-12-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiProperty({
    description: 'Time period grouping for charts',
    enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY'],
    example: 'MONTHLY',
    required: false,
  })
  @IsOptional()
  @IsEnum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY'])
  period?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';

  @ApiProperty({
    description: 'Include dismissed alerts',
    example: false,
    required: false,
  })
  @IsOptional()
  includeDismissedAlerts?: boolean;
}
