import { IsOptional, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Custom Report Parameters DTO
 *
 * Runtime parameters for executing a custom report.
 * These values populate any filters marked as isParameter:true in the config.
 */
export class CustomReportParamsDto {
  @ApiPropertyOptional({
    description: 'Runtime parameter values (key-value pairs matching filter parameterNames)',
    example: {
      budgetStatus: 'ACTIVE',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    },
  })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;
}
