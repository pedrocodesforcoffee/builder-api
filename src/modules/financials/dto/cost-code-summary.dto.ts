import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CostEntryType } from '../enums/cost-entry-type.enum';

/**
 * Entry Breakdown by Type
 * Count and amount breakdown for each cost entry type
 */
class EntryTypeBreakdown {
  @ApiProperty({
    description: 'Number of entries',
    example: 15,
  })
  @Expose()
  count!: number;

  @ApiProperty({
    description: 'Total amount',
    example: 25000,
  })
  @Expose()
  amount!: number;
}

/**
 * Cost Code Summary DTO
 *
 * Detailed financial report for a specific cost code, providing comprehensive
 * information about budget allocation, commitments, actual costs, accruals,
 * and forecasts.
 *
 * This DTO aggregates all financial activity and provides:
 * - Cost code identification and metadata (code, name, division, description)
 * - Budget data (amount, line item count)
 * - Commitment data (total committed, number of commitments)
 * - Cost entry data (actual cost, entry count, breakdown by type)
 * - Accrual data (estimated unbilled costs)
 * - Forecast calculations (projected final cost, variance, completion %)
 * - Recent activity tracking (last entry details)
 *
 * Financial Formulas:
 * - committedAmount = SUM(commitment_items.amount) WHERE cost_code_id = this
 * - actualCost = SUM(cost_entries.totalCost) WHERE status = 'POSTED'
 * - accrualAmount = SUM(accruals.estimatedAmount) WHERE status = 'ACTIVE'
 * - forecastCost = committedAmount + accrualAmount
 * - variance = budgetAmount - forecastCost
 * - percentComplete = (actualCost / budgetAmount) * 100
 *
 * Use Cases:
 * - Cost code detail reports and deep-dive analysis
 * - Budget vs actual tracking at the cost code level
 * - Commitment and accrual monitoring
 * - Cost control and variance analysis
 * - Forecasting and project completion estimates
 *
 * @example
 * {
 *   "costCodeId": "cc-123",
 *   "code": "03-100",
 *   "name": "Concrete - Foundations",
 *   "division": "03 - Concrete",
 *   "description": "All foundation concrete work including footings and slabs",
 *   "budgetAmount": 150000,
 *   "budgetLineItemCount": 5,
 *   "committedAmount": 145000,
 *   "commitmentCount": 3,
 *   "actualCost": 98000,
 *   "entryCount": 45,
 *   "entryBreakdown": {
 *     "LABOR": { "count": 20, "amount": 45000 },
 *     "MATERIAL": { "count": 15, "amount": 35000 },
 *     "EQUIPMENT": { "count": 10, "amount": 18000 }
 *   },
 *   "accrualAmount": 5000,
 *   "accrualCount": 2,
 *   "forecastCost": 148000,
 *   "variance": 2000,
 *   "percentComplete": 65.33,
 *   "lastEntryDate": "2024-01-15T00:00:00Z",
 *   "lastEntryAmount": 2500,
 *   "lastEntryDescription": "Concrete pour - Section B"
 * }
 */
export class CostCodeSummaryDto {
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
    description: 'Division name or category',
    example: '03 - Concrete',
  })
  @Expose()
  division!: string;

  @ApiProperty({
    description: 'Detailed description of the cost code',
    example: 'All foundation concrete work including footings and slabs',
    required: false,
  })
  @Expose()
  description?: string;

  @ApiProperty({
    description: 'Total budgeted amount for this cost code',
    example: 150000,
  })
  @Expose()
  budgetAmount!: number;

  @ApiProperty({
    description: 'Number of budget line items allocated to this cost code',
    example: 5,
  })
  @Expose()
  budgetLineItemCount!: number;

  @ApiProperty({
    description: 'Total committed amount from all commitments',
    example: 145000,
  })
  @Expose()
  committedAmount!: number;

  @ApiProperty({
    description: 'Number of commitments referencing this cost code',
    example: 3,
  })
  @Expose()
  commitmentCount!: number;

  @ApiProperty({
    description: 'Total actual cost (sum of POSTED entries)',
    example: 98000,
  })
  @Expose()
  actualCost!: number;

  @ApiProperty({
    description: 'Total number of cost entries',
    example: 45,
  })
  @Expose()
  entryCount!: number;

  @ApiProperty({
    description: 'Breakdown of cost entries by type with counts and amounts',
    example: {
      LABOR: { count: 20, amount: 45000 },
      MATERIAL: { count: 15, amount: 35000 },
      EQUIPMENT: { count: 10, amount: 18000 },
      SUBCONTRACT: { count: 0, amount: 0 },
      OTHER_DIRECT: { count: 0, amount: 0 },
      OVERHEAD: { count: 0, amount: 0 },
      INVOICE: { count: 0, amount: 0 },
      ACCRUAL: { count: 0, amount: 0 },
    },
  })
  @Expose()
  entryBreakdown!: Record<CostEntryType, EntryTypeBreakdown>;

  @ApiProperty({
    description: 'Total estimated amount of active accruals',
    example: 5000,
  })
  @Expose()
  accrualAmount!: number;

  @ApiProperty({
    description: 'Number of active accruals',
    example: 2,
  })
  @Expose()
  accrualCount!: number;

  @ApiProperty({
    description: 'Projected final cost (committed + accruals)',
    example: 148000,
  })
  @Expose()
  forecastCost!: number;

  @ApiProperty({
    description: 'Budget variance (budget - forecast). Positive = under budget',
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
    description: 'Date of the most recent cost entry',
    example: '2024-01-15T00:00:00Z',
    required: false,
  })
  @Expose()
  @Type(() => Date)
  lastEntryDate?: Date;

  @ApiProperty({
    description: 'Amount of the most recent cost entry',
    example: 2500,
    required: false,
  })
  @Expose()
  lastEntryAmount?: number;

  @ApiProperty({
    description: 'Description of the most recent cost entry',
    example: 'Concrete pour - Section B',
    required: false,
  })
  @Expose()
  lastEntryDescription?: string;
}
