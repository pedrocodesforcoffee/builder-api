import { ApiProperty } from '@nestjs/swagger';
import { BudgetCategory } from '../enums/budget-category.enum';

/**
 * Variance Analysis Item DTO
 *
 * Variance analysis for a single line item.
 */
export class VarianceAnalysisItemDto {
  @ApiProperty({
    description: 'Line item ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  lineItemId!: string;

  @ApiProperty({
    description: 'Cost code',
    example: '01-1000',
  })
  costCode!: string;

  @ApiProperty({
    description: 'Cost code name',
    example: 'General Requirements',
  })
  costCodeName!: string;

  @ApiProperty({
    description: 'Category',
    enum: BudgetCategory,
    example: BudgetCategory.LABOR,
  })
  category!: BudgetCategory;

  @ApiProperty({
    description: 'Budgeted cost',
    example: 100000.0,
  })
  budgetedCost!: number;

  @ApiProperty({
    description: 'Committed cost',
    example: 80000.0,
  })
  committedCost!: number;

  @ApiProperty({
    description: 'Actual cost',
    example: 75000.0,
  })
  actualCost!: number;

  @ApiProperty({
    description: 'Variance (budgeted - actual)',
    example: 25000.0,
  })
  variance!: number;

  @ApiProperty({
    description: 'Variance percentage',
    example: 25.0,
  })
  variancePercentage!: number;

  @ApiProperty({
    description: 'Estimate at completion (EAC)',
    example: 95000.0,
  })
  eac!: number;

  @ApiProperty({
    description: 'Forecast variance (budgeted - EAC)',
    example: 5000.0,
  })
  forecastVariance!: number;
}

/**
 * Variance Analysis DTO
 *
 * Comprehensive variance analysis for a budget.
 */
export class VarianceAnalysisDto {
  @ApiProperty({
    description: 'Budget ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  budgetId!: string;

  @ApiProperty({
    description: 'Total budgeted cost',
    example: 1500000.0,
  })
  totalBudget!: number;

  @ApiProperty({
    description: 'Total committed cost',
    example: 1200000.0,
  })
  totalCommitted!: number;

  @ApiProperty({
    description: 'Total actual cost',
    example: 1000000.0,
  })
  totalActual!: number;

  @ApiProperty({
    description: 'Total variance',
    example: 500000.0,
  })
  totalVariance!: number;

  @ApiProperty({
    description: 'Variance percentage',
    example: 33.33,
  })
  variancePercentage!: number;

  @ApiProperty({
    description: 'Total estimate at completion',
    example: 1450000.0,
  })
  totalEac!: number;

  @ApiProperty({
    description: 'Forecast variance',
    example: 50000.0,
  })
  forecastVariance!: number;

  @ApiProperty({
    description: 'Line item variance details',
    type: [VarianceAnalysisItemDto],
  })
  lineItems!: VarianceAnalysisItemDto[];
}
