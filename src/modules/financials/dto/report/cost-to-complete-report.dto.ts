import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsDateString } from 'class-validator';

/**
 * Cost to Complete Report Request DTO
 * Generates EAC (Estimate at Completion) and ETC (Estimate to Complete) projections
 */
export class GenerateCostToCompleteReportDto {
  @ApiProperty({ description: 'Project UUID' })
  @IsUUID()
  projectId!: string;

  @ApiProperty({ description: 'Budget UUID (optional - defaults to active budget)', required: false })
  @IsUUID()
  @IsOptional()
  budgetId?: string;

  @ApiProperty({ description: 'As-of date for snapshot (optional - defaults to now)', required: false })
  @IsDateString()
  @IsOptional()
  asOfDate?: string;
}

/**
 * Cost to Complete Line Item
 * Single cost code with EAC/ETC projections
 */
export class CostToCompleteLineDto {
  @ApiProperty({ description: 'Cost code' })
  costCode!: string;

  @ApiProperty({ description: 'Cost code description' })
  description!: string;

  @ApiProperty({ description: 'Revised budget' })
  revisedBudget!: number;

  @ApiProperty({ description: 'Actual cost to date' })
  actualCost!: number;

  @ApiProperty({ description: 'Percent complete (actual / revised * 100)' })
  percentComplete!: number;

  @ApiProperty({ description: 'Earned value (percent complete * revised budget)' })
  earnedValue!: number;

  @ApiProperty({ description: 'Cost Performance Index (earned value / actual cost)' })
  cpi!: number;

  @ApiProperty({ description: 'Estimate to Complete (remaining work cost)' })
  etc!: number;

  @ApiProperty({ description: 'Estimate at Completion (actual + ETC)' })
  eac!: number;

  @ApiProperty({ description: 'Variance at Completion (revised budget - EAC)' })
  vac!: number;

  @ApiProperty({ description: 'To Complete Performance Index (work remaining / budget remaining)' })
  tcpi!: number;
}

/**
 * Cost to Complete Report Result
 */
export class CostToCompleteReportDto {
  @ApiProperty({ description: 'Project ID' })
  projectId!: string;

  @ApiProperty({ description: 'Project name' })
  projectName!: string;

  @ApiProperty({ description: 'Budget ID' })
  budgetId!: string;

  @ApiProperty({ description: 'Budget name' })
  budgetName!: string;

  @ApiProperty({ description: 'As-of date' })
  asOfDate!: Date;

  @ApiProperty({ description: 'Total revised budget' })
  totalRevisedBudget!: number;

  @ApiProperty({ description: 'Total actual cost' })
  totalActualCost!: number;

  @ApiProperty({ description: 'Total percent complete' })
  totalPercentComplete!: number;

  @ApiProperty({ description: 'Total earned value' })
  totalEarnedValue!: number;

  @ApiProperty({ description: 'Overall Cost Performance Index' })
  overallCPI!: number;

  @ApiProperty({ description: 'Total Estimate to Complete' })
  totalETC!: number;

  @ApiProperty({ description: 'Total Estimate at Completion' })
  totalEAC!: number;

  @ApiProperty({ description: 'Total Variance at Completion' })
  totalVAC!: number;

  @ApiProperty({ description: 'Overall To Complete Performance Index' })
  overallTCPI!: number;

  @ApiProperty({ description: 'Cost to Complete lines', type: [CostToCompleteLineDto] })
  lines!: CostToCompleteLineDto[];

  @ApiProperty({ description: 'Report generated at' })
  generatedAt!: Date;
}
