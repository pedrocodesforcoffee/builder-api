import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Custom Report Result DTO
 *
 * Result of executing a custom report.
 */
export class CustomReportResultDto {
  @ApiProperty({
    description: 'Report metadata',
  })
  reportInfo!: {
    reportId: string;
    reportName: string;
    projectId: string;
    generatedAt: Date;
    rowCount: number;
    executionTimeMs: number;
  };

  @ApiProperty({
    description: 'Column definitions',
  })
  columns!: Array<{
    field: string;
    label: string;
    dataType: string;
  }>;

  @ApiProperty({
    description: 'Report data rows',
    type: 'array',
  })
  data!: any[];

  @ApiPropertyOptional({
    description: 'Aggregated totals (if showTotals is true)',
  })
  totals?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Subtotals by group (if showSubtotals is true)',
  })
  subtotals?: Array<{
    groupKey: string;
    groupValue: any;
    totals: Record<string, any>;
  }>;
}
