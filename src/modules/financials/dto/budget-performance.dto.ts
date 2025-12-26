import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

/**
 * Top Cost Overrun
 * Individual cost code with the highest overruns
 */
class TopCostOverrun {
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
  code!: string;

  @ApiProperty({
    description: 'Cost code name',
    example: 'Concrete - Foundations',
  })
  @Expose()
  name!: string;

  @ApiProperty({
    description: 'Budgeted amount for this cost code',
    example: 150000,
  })
  @Expose()
  budgetAmount!: number;

  @ApiProperty({
    description: 'Actual cost for this cost code',
    example: 165000,
  })
  @Expose()
  actualCost!: number;

  @ApiProperty({
    description: 'Variance (budget - actual). Negative = over budget',
    example: -15000,
  })
  @Expose()
  variance!: number;

  @ApiProperty({
    description: 'Variance percentage ((variance / budget) * 100)',
    example: -10.0,
  })
  @Expose()
  variancePercent!: number;
}

/**
 * Budget Performance DTO
 *
 * Comprehensive budget performance metrics and key performance indicators (KPIs)
 * for project cost management and forecasting.
 *
 * This DTO provides advanced financial analysis including:
 * - Cost Performance Index (CPI) - Industry standard metric
 * - Budget consumption rate and burn rate analysis
 * - Estimate at Completion (EAC) forecasting
 * - Top cost overruns identification
 * - Budget health status indicators
 *
 * Key Formulas:
 * - CPI (Cost Performance Index) = budgetedCost / actualCost
 *   - CPI > 1.0 = Under budget (good performance)
 *   - CPI = 1.0 = On budget
 *   - CPI < 1.0 = Over budget (poor performance)
 *
 * - Budget Consumption Rate = (actualCost / totalBudget) * 100
 *   - Indicates what % of budget has been spent
 *
 * - Estimate at Completion (EAC) = totalBudget / CPI
 *   - Projects the final total cost based on current performance
 *
 * - Budget Remaining = totalBudget - actualCost
 *   - How much budget is left to spend
 *
 * - Forecasted Overrun = EAC - totalBudget
 *   - Expected amount over/under budget at completion
 *
 * Use Cases:
 * - Executive dashboards and KPI reporting
 * - Financial forecasting and projection
 * - Risk identification and mitigation planning
 * - Performance tracking against industry benchmarks
 * - Budget variance analysis and corrective action planning
 * - Stakeholder reporting and cost control
 *
 * @example
 * {
 *   "projectId": "proj-123",
 *   "totalBudget": 5000000,
 *   "totalCommitted": 4850000,
 *   "totalActual": 3200000,
 *   "budgetRemaining": 1800000,
 *   "costPerformanceIndex": 1.56,
 *   "budgetConsumptionRate": 64.0,
 *   "estimateAtCompletion": 3205128,
 *   "forecastedOverrun": -1794872,
 *   "topCostOverruns": [
 *     {
 *       "costCodeId": "cc-100",
 *       "code": "03-100",
 *       "name": "Concrete - Foundations",
 *       "budgetAmount": 150000,
 *       "actualCost": 165000,
 *       "variance": -15000,
 *       "variancePercent": -10.0
 *     }
 *   ],
 *   "totalCostCodes": 45,
 *   "overBudgetCostCodes": 5,
 *   "underBudgetCostCodes": 38,
 *   "onBudgetCostCodes": 2
 * }
 */
export class BudgetPerformanceDto {
  @ApiProperty({
    description: 'Project UUID',
    example: 'proj-123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  projectId!: string;

  @ApiProperty({
    description: 'Total budgeted amount for the project',
    example: 5000000,
  })
  @Expose()
  totalBudget!: number;

  @ApiProperty({
    description: 'Total committed costs (from approved commitments)',
    example: 4850000,
  })
  @Expose()
  totalCommitted!: number;

  @ApiProperty({
    description: 'Total actual costs (from POSTED cost entries)',
    example: 3200000,
  })
  @Expose()
  totalActual!: number;

  @ApiProperty({
    description: 'Budget remaining (budget - actual)',
    example: 1800000,
  })
  @Expose()
  budgetRemaining!: number;

  @ApiProperty({
    description: 'Cost Performance Index (CPI = budget / actual). >1.0 is good, <1.0 is poor',
    example: 1.56,
  })
  @Expose()
  costPerformanceIndex!: number;

  @ApiProperty({
    description: 'Budget consumption rate as a percentage ((actual / budget) * 100)',
    example: 64.0,
  })
  @Expose()
  budgetConsumptionRate!: number;

  @ApiProperty({
    description: 'Estimate at Completion (EAC = budget / CPI). Projected final cost',
    example: 3205128,
  })
  @Expose()
  estimateAtCompletion!: number;

  @ApiProperty({
    description: 'Forecasted overrun at completion (EAC - budget). Negative = under budget',
    example: -1794872,
  })
  @Expose()
  forecastedOverrun!: number;

  @ApiProperty({
    description: 'Array of top cost code overruns (sorted by variance, worst first)',
    type: [TopCostOverrun],
  })
  @Expose()
  @Type(() => TopCostOverrun)
  topCostOverruns!: TopCostOverrun[];

  @ApiProperty({
    description: 'Total number of cost codes in the budget',
    example: 45,
  })
  @Expose()
  totalCostCodes!: number;

  @ApiProperty({
    description: 'Number of cost codes over budget (variance < 0)',
    example: 5,
  })
  @Expose()
  overBudgetCostCodes!: number;

  @ApiProperty({
    description: 'Number of cost codes under budget (variance > 0)',
    example: 38,
  })
  @Expose()
  underBudgetCostCodes!: number;

  @ApiProperty({
    description: 'Number of cost codes on budget (variance ~= 0, within 1%)',
    example: 2,
  })
  @Expose()
  onBudgetCostCodes!: number;
}
