import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsDateString } from 'class-validator';

/**
 * Budget Detail Report Request DTO
 * Generates a line-by-line budget breakdown with variance analysis
 */
export class GenerateBudgetDetailReportDto {
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
 * Budget Detail Line Item
 * Single line in the budget detail report
 */
export class BudgetDetailLineDto {
  @ApiProperty({ description: 'Cost code' })
  costCode!: string;

  @ApiProperty({ description: 'Cost code description' })
  description!: string;

  @ApiProperty({ description: 'Original budget amount' })
  originalBudget!: number;

  @ApiProperty({ description: 'Change orders total' })
  changeOrders!: number;

  @ApiProperty({ description: 'Revised budget (original + change orders)' })
  revisedBudget!: number;

  @ApiProperty({ description: 'Committed cost (commitments)' })
  committedCost!: number;

  @ApiProperty({ description: 'Actual cost (posted cost entries)' })
  actualCost!: number;

  @ApiProperty({ description: 'Variance (revised - actual)' })
  variance!: number;

  @ApiProperty({ description: 'Percent complete (actual / revised * 100)' })
  percentComplete!: number;

  @ApiProperty({ description: 'Cost to complete (committed - actual)' })
  costToComplete!: number;

  @ApiProperty({ description: 'Projected final cost (actual + cost to complete)' })
  projectedFinalCost!: number;

  @ApiProperty({ description: 'Projected variance (revised - projected final)' })
  projectedVariance!: number;
}

/**
 * Budget Detail Report Result
 */
export class BudgetDetailReportDto {
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

  @ApiProperty({ description: 'Total original budget' })
  totalOriginalBudget!: number;

  @ApiProperty({ description: 'Total change orders' })
  totalChangeOrders!: number;

  @ApiProperty({ description: 'Total revised budget' })
  totalRevisedBudget!: number;

  @ApiProperty({ description: 'Total committed cost' })
  totalCommittedCost!: number;

  @ApiProperty({ description: 'Total actual cost' })
  totalActualCost!: number;

  @ApiProperty({ description: 'Total variance' })
  totalVariance!: number;

  @ApiProperty({ description: 'Total percent complete' })
  totalPercentComplete!: number;

  @ApiProperty({ description: 'Total cost to complete' })
  totalCostToComplete!: number;

  @ApiProperty({ description: 'Total projected final cost' })
  totalProjectedFinalCost!: number;

  @ApiProperty({ description: 'Total projected variance' })
  totalProjectedVariance!: number;

  @ApiProperty({ description: 'Budget detail lines', type: [BudgetDetailLineDto] })
  lines!: BudgetDetailLineDto[];

  @ApiProperty({ description: 'Report generated at' })
  generatedAt!: Date;
}
