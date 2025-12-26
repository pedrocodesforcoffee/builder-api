import { IsNumber, IsOptional, IsBoolean, IsDateString, Min, Max, IsInt } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for updating a project profile
 * Used when project completes or when updating completion data
 */
export class UpdateProjectProfileDto {
  @ApiPropertyOptional({ description: 'Mark project as complete', example: true })
  @IsOptional()
  @IsBoolean()
  isComplete?: boolean;

  @ApiPropertyOptional({ description: 'Completion date', example: '2025-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  completionDate?: string;

  @ApiPropertyOptional({ description: 'Final cost in dollars', example: 5250000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  finalCost?: number;

  @ApiPropertyOptional({ description: 'Cost variance percentage (positive = over budget)', example: 5.0 })
  @IsOptional()
  @IsNumber()
  costVariancePercent?: number;

  @ApiPropertyOptional({ description: 'Schedule variance in days (positive = late)', example: 10 })
  @IsOptional()
  @IsInt()
  scheduleVarianceDays?: number;

  @ApiPropertyOptional({ description: 'Total RFI count', example: 45 })
  @IsOptional()
  @IsInt()
  @Min(0)
  rfiCount?: number;

  @ApiPropertyOptional({ description: 'Total change order count', example: 12 })
  @IsOptional()
  @IsInt()
  @Min(0)
  changeOrderCount?: number;

  @ApiPropertyOptional({ description: 'Total change order value', example: 250000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  changeOrderValue?: number;

  @ApiPropertyOptional({ description: 'Total safety incident count', example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  safetyIncidentCount?: number;

  @ApiPropertyOptional({ description: 'Total quality issue count', example: 8 })
  @IsOptional()
  @IsInt()
  @Min(0)
  qualityIssueCount?: number;

  @ApiPropertyOptional({ description: 'Client satisfaction score (0-100)', example: 92.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  clientSatisfactionScore?: number;

  @ApiPropertyOptional({ description: 'Profit margin percentage', example: 8.5 })
  @IsOptional()
  @IsNumber()
  profitMarginPercent?: number;

  @ApiPropertyOptional({ description: 'Additional metadata', example: { finalNotes: 'Project completed successfully' } })
  @IsOptional()
  metadata?: Record<string, any>;
}
