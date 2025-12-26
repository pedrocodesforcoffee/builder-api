import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsDateString, IsNumber, Min, Max } from 'class-validator';

/**
 * Budget Variance Report Request DTO
 * Generates a variance-focused report highlighting over/under budget items
 */
export class GenerateBudgetVarianceReportDto {
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

  @ApiProperty({
    description: 'Variance threshold percentage (0-100) to flag items (optional - defaults to 10%)',
    required: false,
    minimum: 0,
    maximum: 100
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  varianceThreshold?: number;
}

/**
 * Budget Variance Line Item
 * Single line in the budget variance report with variance metrics
 */
export class BudgetVarianceLineDto {
  @ApiProperty({ description: 'Cost code' })
  costCode!: string;

  @ApiProperty({ description: 'Cost code description' })
  description!: string;

  @ApiProperty({ description: 'Budgeted cost' })
  budgetedCost!: number;

  @ApiProperty({ description: 'Actual cost (posted cost entries)' })
  actualCost!: number;

  @ApiProperty({ description: 'Variance amount (budgeted - actual)' })
  variance!: number;

  @ApiProperty({ description: 'Variance percentage ((variance / budgeted) * 100)' })
  variancePercent!: number;

  @ApiProperty({ description: 'Percent spent ((actual / budgeted) * 100)' })
  percentSpent!: number;

  @ApiProperty({ description: 'Remaining budget (budgeted - actual)' })
  remainingBudget!: number;

  @ApiProperty({
    description: 'Variance status flag: OVER (over budget), UNDER (under budget), ON_TARGET (within threshold)'
  })
  varianceStatus!: 'OVER' | 'UNDER' | 'ON_TARGET';

  @ApiProperty({ description: 'Is this line flagged for exceeding variance threshold?' })
  isFlagged!: boolean;
}

/**
 * Budget Variance Report Result
 */
export class BudgetVarianceReportDto {
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

  @ApiProperty({ description: 'Variance threshold percentage used for flagging' })
  varianceThreshold!: number;

  @ApiProperty({ description: 'Total budgeted cost' })
  totalBudgetedCost!: number;

  @ApiProperty({ description: 'Total actual cost' })
  totalActualCost!: number;

  @ApiProperty({ description: 'Total variance' })
  totalVariance!: number;

  @ApiProperty({ description: 'Total variance percentage' })
  totalVariancePercent!: number;

  @ApiProperty({ description: 'Total percent spent' })
  totalPercentSpent!: number;

  @ApiProperty({ description: 'Total remaining budget' })
  totalRemainingBudget!: number;

  @ApiProperty({ description: 'Count of cost codes over budget' })
  overBudgetCount!: number;

  @ApiProperty({ description: 'Count of cost codes under budget' })
  underBudgetCount!: number;

  @ApiProperty({ description: 'Count of cost codes on target (within threshold)' })
  onTargetCount!: number;

  @ApiProperty({ description: 'Count of cost codes flagged for exceeding variance threshold' })
  flaggedCount!: number;

  @ApiProperty({ description: 'Budget variance lines', type: [BudgetVarianceLineDto] })
  lines!: BudgetVarianceLineDto[];

  @ApiProperty({ description: 'Report generated at' })
  generatedAt!: Date;
}
