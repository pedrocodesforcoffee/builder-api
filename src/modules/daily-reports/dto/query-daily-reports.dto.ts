import {
  IsUUID,
  IsOptional,
  IsDateString,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DailyReportStatus } from '../enums/daily-report.enum';

/**
 * Query Daily Reports DTO
 * Used for filtering and paginating daily reports
 */
export class QueryDailyReportsDto {
  @ApiProperty({ description: 'Project ID to filter by' })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({ description: 'Start date for date range filter (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for date range filter (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ enum: DailyReportStatus, description: 'Filter by status' })
  @IsEnum(DailyReportStatus)
  @IsOptional()
  status?: DailyReportStatus;

  @ApiPropertyOptional({ description: 'Filter by creator user ID' })
  @IsUUID()
  @IsOptional()
  createdById?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
