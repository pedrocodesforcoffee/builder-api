import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportFormat } from '../entities/saved-report.entity';

export enum ExportDataType {
  RFI_LIST = 'RFI_LIST',
  RFI_ANALYTICS = 'RFI_ANALYTICS',
  SUBMITTAL_LIST = 'SUBMITTAL_LIST',
  SUBMITTAL_REGISTER = 'SUBMITTAL_REGISTER',
  SUBMITTAL_ANALYTICS = 'SUBMITTAL_ANALYTICS',
  COMBINED_DASHBOARD = 'COMBINED_DASHBOARD',
  USER_PERFORMANCE = 'USER_PERFORMANCE',
}

export class ExportRequestDto {
  @ApiProperty({ enum: ExportDataType })
  @IsEnum(ExportDataType)
  dataType!: ExportDataType;

  @ApiProperty({ enum: ReportFormat })
  @IsEnum(ReportFormat)
  format!: ReportFormat;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  columns?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
