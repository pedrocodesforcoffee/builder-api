import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CostSummaryDto } from './cost-summary.dto';
import { CostEntryType } from '../enums/cost-entry-type.enum';
import { CostEntryStatus } from '../enums/cost-entry-status.enum';

/**
 * Entry Type Summary
 * Breakdown of cost entries by type with count and total amount
 */
class EntryTypeSummary {
  @ApiProperty({
    description: 'Number of cost entries of this type',
    example: 25,
  })
  @Expose()
  count!: number;

  @ApiProperty({
    description: 'Total amount of cost entries of this type',
    example: 45000,
  })
  @Expose()
  amount!: number;
}

/**
 * Accruals Summary
 * Summary of all accruals for the project
 */
class AccrualsSummary {
  @ApiProperty({
    description: 'Total number of accruals',
    example: 12,
  })
  @Expose()
  count!: number;

  @ApiProperty({
    description: 'Total estimated amount of all accruals',
    example: 15000,
  })
  @Expose()
  estimatedAmount!: number;

  @ApiProperty({
    description: 'Number of active accruals',
    example: 8,
  })
  @Expose()
  activeCount!: number;

  @ApiProperty({
    description: 'Number of converted accruals',
    example: 3,
  })
  @Expose()
  convertedCount!: number;

  @ApiProperty({
    description: 'Number of reversed accruals',
    example: 1,
  })
  @Expose()
  reversedCount!: number;
}

/**
 * Transfers Summary
 * Summary of all cost transfers for the project
 */
class TransfersSummary {
  @ApiProperty({
    description: 'Total number of cost transfers',
    example: 5,
  })
  @Expose()
  count!: number;

  @ApiProperty({
    description: 'Total amount transferred',
    example: 8000,
  })
  @Expose()
  totalAmount!: number;

  @ApiProperty({
    description: 'Number of pending transfers',
    example: 1,
  })
  @Expose()
  pendingCount!: number;

  @ApiProperty({
    description: 'Number of approved transfers',
    example: 3,
  })
  @Expose()
  approvedCount!: number;

  @ApiProperty({
    description: 'Number of rejected transfers',
    example: 1,
  })
  @Expose()
  rejectedCount!: number;
}

/**
 * Project Cost Summary DTO
 *
 * Comprehensive financial summary for an entire project, aggregating all cost codes,
 * entries, commitments, and financial activity.
 *
 * This DTO provides a complete financial picture of a project:
 * - Overall budget, committed, actual, and forecast costs
 * - Total variance and percent complete
 * - Detailed breakdown by cost code (array of CostSummaryDto)
 * - Cost entry statistics by type (labor, material, equipment, etc.)
 * - Cost entry statistics by status (draft, posted, void, etc.)
 * - Accruals summary (estimated costs not yet invoiced)
 * - Cost transfers summary (budget reallocations)
 *
 * Financial Calculations:
 * - totalBudget = SUM(budget_line_items.amount) for this project
 * - totalCommitted = SUM(commitment_items.amount) for this project
 * - totalActual = SUM(cost_entries.totalCost) WHERE status = 'POSTED'
 * - totalForecast = totalCommitted + SUM(accruals.estimatedAmount)
 * - totalVariance = totalBudget - totalForecast
 * - percentComplete = (totalActual / totalBudget) * 100
 *
 * Use Cases:
 * - Executive project dashboards
 * - Project financial reports for stakeholders
 * - Budget performance analysis
 * - Cost forecasting and projection
 * - Financial risk assessment
 * - Period-over-period comparison
 *
 * @example
 * {
 *   "projectId": "proj-123",
 *   "projectName": "Downtown Office Building",
 *   "projectNumber": "2024-001",
 *   "totalBudget": 5000000,
 *   "totalCommitted": 4850000,
 *   "totalActual": 3200000,
 *   "totalForecast": 4900000,
 *   "totalVariance": 100000,
 *   "percentComplete": 64.0,
 *   "costCodeSummaries": [...],
 *   "entriesByType": {
 *     "LABOR": { "count": 150, "amount": 1200000 },
 *     "MATERIAL": { "count": 200, "amount": 1500000 }
 *   },
 *   "entriesByStatus": {
 *     "POSTED": 320,
 *     "DRAFT": 15,
 *     "VOID": 5
 *   },
 *   "accrualsSummary": {
 *     "count": 12,
 *     "estimatedAmount": 50000,
 *     "activeCount": 8,
 *     "convertedCount": 3,
 *     "reversedCount": 1
 *   },
 *   "transfersSummary": {
 *     "count": 5,
 *     "totalAmount": 25000,
 *     "pendingCount": 1,
 *     "approvedCount": 3,
 *     "rejectedCount": 1
 *   }
 * }
 */
export class ProjectCostSummaryDto {
  @ApiProperty({
    description: 'Project UUID',
    example: 'proj-123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  projectId!: string;

  @ApiProperty({
    description: 'Project name',
    example: 'Downtown Office Building',
  })
  @Expose()
  projectName!: string;

  @ApiProperty({
    description: 'Project number or code',
    example: '2024-001',
  })
  @Expose()
  projectNumber!: string;

  @ApiProperty({
    description: 'Total budgeted amount for the entire project',
    example: 5000000,
  })
  @Expose()
  totalBudget!: number;

  @ApiProperty({
    description: 'Total committed costs across all cost codes',
    example: 4850000,
  })
  @Expose()
  totalCommitted!: number;

  @ApiProperty({
    description: 'Total actual costs (POSTED entries) across all cost codes',
    example: 3200000,
  })
  @Expose()
  totalActual!: number;

  @ApiProperty({
    description: 'Total forecast costs (committed + accruals)',
    example: 4900000,
  })
  @Expose()
  totalForecast!: number;

  @ApiProperty({
    description: 'Total budget variance (budget - forecast). Positive = under budget',
    example: 100000,
  })
  @Expose()
  totalVariance!: number;

  @ApiProperty({
    description: 'Overall project percent complete (actual / budget * 100)',
    example: 64.0,
  })
  @Expose()
  percentComplete!: number;

  @ApiProperty({
    description: 'Array of cost summaries for each cost code',
    type: [CostSummaryDto],
  })
  @Expose()
  @Type(() => CostSummaryDto)
  costCodeSummaries!: CostSummaryDto[];

  @ApiProperty({
    description: 'Breakdown of cost entries by type with counts and amounts',
    example: {
      LABOR: { count: 150, amount: 1200000 },
      MATERIAL: { count: 200, amount: 1500000 },
      EQUIPMENT: { count: 80, amount: 400000 },
      SUBCONTRACT: { count: 50, amount: 900000 },
      OTHER_DIRECT: { count: 20, amount: 100000 },
      OVERHEAD: { count: 10, amount: 50000 },
      INVOICE: { count: 30, amount: 50000 },
      ACCRUAL: { count: 15, amount: 50000 },
    },
  })
  @Expose()
  entriesByType!: Record<CostEntryType, EntryTypeSummary>;

  @ApiProperty({
    description: 'Count of cost entries by status',
    example: {
      DRAFT: 15,
      POSTED: 320,
      VOID: 5,
      PENDING_APPROVAL: 3,
      APPROVED: 2,
      REJECTED: 1,
    },
  })
  @Expose()
  entriesByStatus!: Record<CostEntryStatus, number>;

  @ApiProperty({
    description: 'Summary of all accruals for the project',
    type: AccrualsSummary,
  })
  @Expose()
  @Type(() => AccrualsSummary)
  accrualsSummary!: AccrualsSummary;

  @ApiProperty({
    description: 'Summary of all cost transfers for the project',
    type: TransfersSummary,
  })
  @Expose()
  @Type(() => TransfersSummary)
  transfersSummary!: TransfersSummary;
}
