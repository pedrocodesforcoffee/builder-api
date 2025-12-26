import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

/**
 * Budget Export Format
 */
export enum BudgetExportFormat {
  EXCEL = 'excel',
  CSV = 'csv',
}

/**
 * Budget Export Request DTO
 *
 * Parameters for exporting a budget.
 */
export class BudgetExportDto {
  @ApiProperty({
    description: 'Export format',
    enum: BudgetExportFormat,
    example: BudgetExportFormat.EXCEL,
  })
  @IsEnum(BudgetExportFormat)
  format!: BudgetExportFormat;

  @ApiProperty({
    description: 'Include summary sheet (Excel only)',
    required: false,
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeSummary?: boolean = true;
}
