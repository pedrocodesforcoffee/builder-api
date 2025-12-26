import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

/**
 * Cost Summary DTO
 *
 * Provides a comprehensive financial summary for a single cost code within a project budget.
 *
 * This DTO aggregates all financial activity for a cost code and calculates key metrics:
 * - Budget allocation (original budgeted amount)
 * - Committed costs (sum of all commitment amounts against this cost code)
 * - Actual costs (sum of all POSTED cost entries)
 * - Forecast costs (committed + accruals = projected final cost)
 * - Variance (budget - forecast = remaining budget)
 * - Percent complete (actual / budget * 100)
 *
 * Financial Formulas:
 * - committedCost = SUM(commitment_items.amount) WHERE cost_code_id = this.costCodeId
 * - actualCost = SUM(cost_entries.totalCost) WHERE status = 'POSTED' AND cost_code_id = this.costCodeId
 * - forecastCost = committedCost + SUM(accruals.estimatedAmount)
 * - variance = budgetAmount - forecastCost
 * - percentComplete = (actualCost / budgetAmount) * 100
 *
 * Use Cases:
 * - Cost code detail reports
 * - Budget vs actual analysis
 * - Project financial dashboards
 * - Variance analysis and forecasting
 * - Cost control and monitoring
 *
 * @example
 * {
 *   "costCodeId": "cc-123",
 *   "costCode": "03-100",
 *   "costCodeName": "Concrete - Foundations",
 *   "budgetAmount": 150000,
 *   "committedCost": 145000,
 *   "actualCost": 98000,
 *   "forecastCost": 148000,
 *   "variance": 2000,
 *   "percentComplete": 65.33,
 *   "costEntryCount": 45,
 *   "lastEntryDate": "2024-01-15T00:00:00Z"
 * }
 */
export class CostSummaryDto {
  @ApiProperty({
    description: 'Cost code UUID',
    example: 'cc-123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  costCodeId!: string;

  @ApiProperty({
    description: 'Cost code string (e.g., "03-100")',
    example: '03-100',
  })
  @Expose()
  costCode!: string;

  @ApiProperty({
    description: 'Cost code name or description',
    example: 'Concrete - Foundations',
  })
  @Expose()
  costCodeName!: string;

  @ApiProperty({
    description: 'Original budgeted amount for this cost code',
    example: 150000,
  })
  @Expose()
  budgetAmount!: number;

  @ApiProperty({
    description: 'Sum of all commitment amounts allocated to this cost code',
    example: 145000,
  })
  @Expose()
  committedCost!: number;

  @ApiProperty({
    description: 'Sum of all POSTED cost entry amounts (actual spend to date)',
    example: 98000,
  })
  @Expose()
  actualCost!: number;

  @ApiProperty({
    description: 'Projected final cost (committed + accruals)',
    example: 148000,
  })
  @Expose()
  forecastCost!: number;

  @ApiProperty({
    description: 'Budget variance (budget - forecast). Positive = under budget, Negative = over budget',
    example: 2000,
  })
  @Expose()
  variance!: number;

  @ApiProperty({
    description: 'Percentage of budget actually spent (actual / budget * 100)',
    example: 65.33,
  })
  @Expose()
  percentComplete!: number;

  @ApiProperty({
    description: 'Total number of cost entries for this cost code',
    example: 45,
  })
  @Expose()
  costEntryCount!: number;

  @ApiProperty({
    description: 'Date of the most recent cost entry',
    example: '2024-01-15T00:00:00Z',
    required: false,
  })
  @Expose()
  @Type(() => Date)
  lastEntryDate?: Date;
}
