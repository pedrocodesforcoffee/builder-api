import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
  MaxLength,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportType, ReportFormat } from '../entities/saved-report.entity';

export class ReportScheduleConfigDto {
  @ApiProperty({ enum: ['DAILY', 'WEEKLY', 'MONTHLY'] })
  @IsEnum(['DAILY', 'WEEKLY', 'MONTHLY'])
  frequency!: 'DAILY' | 'WEEKLY' | 'MONTHLY';

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  dayOfWeek?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  dayOfMonth?: number;

  @ApiProperty()
  @IsString()
  time!: string;

  @ApiProperty({ enum: ReportFormat })
  @IsEnum(ReportFormat)
  format!: ReportFormat;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  recipients!: string[];
}

export class ReportConfigurationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  dateRange?: {
    startDate?: string;
    endDate?: string;
    relativePeriod?: string;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  filters?: {
    statuses?: string[];
    priorities?: string[];
    disciplines?: string[];
    specSections?: string[];
    assignees?: string[];
    companies?: string[];
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groupBy?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includeCharts?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  chartTypes?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  columns?: string[];
}

export class CreateReportDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ReportType })
  @IsEnum(ReportType)
  reportType!: ReportType;

  @ApiProperty()
  @IsObject()
  @ValidateNested()
  @Type(() => ReportConfigurationDto)
  configuration!: ReportConfigurationDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isShared?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isScheduled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => ReportScheduleConfigDto)
  scheduleConfig?: ReportScheduleConfigDto;
}

export class UpdateReportDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ReportConfigurationDto)
  configuration?: ReportConfigurationDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isShared?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isScheduled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => ReportScheduleConfigDto)
  scheduleConfig?: ReportScheduleConfigDto;
}
