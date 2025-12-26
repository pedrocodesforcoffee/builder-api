import { IsObject, IsEnum, IsArray, IsBoolean, IsOptional, IsNumber, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ExportFormat } from '../enums/export-format.enum';

/**
 * Export Request DTO
 */
export class ExportRequestDto {
  /**
   * Search criteria for export
   */
  @IsObject()
  criteria!: Record<string, any>;

  /**
   * Export format
   */
  @IsEnum(ExportFormat)
  format!: ExportFormat;

  /**
   * Columns to include in export
   */
  @IsArray()
  @IsString({ each: true })
  columns!: string[];

  /**
   * Include custom fields in export
   */
  @IsOptional()
  @IsBoolean()
  includeCustomFields?: boolean = false;

  /**
   * Maximum records to export
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100000)
  maxRecords?: number = 10000;
}