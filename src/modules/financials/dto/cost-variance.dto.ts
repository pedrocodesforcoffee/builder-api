import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

/**
 * Variance Status Enum
 * Categorizes the budget variance status for a cost code
 */
export enum VarianceStatus {
  /** Spending is under budget */
  UNDER_BUDGET = 'UNDER_BUDGET',

  /** Spending is within acceptable range of budget */
  ON_BUDGET = 'ON_BUDGET',

  /** Spending has exceeded budget */
  OVER_BUDGET = 'OVER_BUDGET',
}

/**
 * Variance Severity Enum
 * Indicates the severity level of budget variance
 * Based on variance percentage thresholds
 */
export enum VarianceSeverity {
  /** Variance is within 5% of budget (acceptable) */
  LOW = 'LOW',

  /** Variance is between 5-10% of budget (monitor) */
  MEDIUM = 'MEDIUM',

  /** Variance is between 10-20% of budget (action needed) */
  HIGH = 'HIGH',

  /** Variance exceeds 20% of budget (critical) */
  CRITICAL = 'CRITICAL',
}

/**
 * Variance Trend Enum
 * Indicates the direction of variance change over time
 */
export enum VarianceTrend {
  /** Variance is improving (moving toward budget) */
  IMPROVING = 'IMPROVING',

  /** Variance is stable (no significant change) */
  STABLE = 'STABLE',

  /** Variance is worsening (moving away from budget) */
  WORSENING = 'WORSENING',
}

/**
 * Cost Variance DTO
 *
 * Provides comprehensive variance analysis for a cost code, comparing
 * budgeted amounts to actual costs and identifying areas requiring attention.
 *
 * This DTO supports cost control and budget monitoring by:
 * - Calculating variance (difference between budget and actual)
 * - Computing variance percentage
 * - Classifying variance status (under, on, or over budget)
 * - Assessing severity based on variance magnitude
 * - Tracking trend direction (improving, stable, worsening)
 * - Providing explanatory notes
 *
 * Variance Calculations:
 * - variance = budgetAmount - actualCost
 * - variancePercent = (variance / budgetAmount) * 100
 *
 * Severity Thresholds:
 * - LOW: |variancePercent| <= 5%
 * - MEDIUM: 5% < |variancePercent| <= 10%
 * - HIGH: 10% < |variancePercent| <= 20%
 * - CRITICAL: |variancePercent| > 20%
 *
 * Status Classification:
 * - UNDER_BUDGET: variance > 0 (positive)
 * - ON_BUDGET: variance ~= 0 (within threshold)
 * - OVER_BUDGET: variance < 0 (negative)
 *
 * Trend Analysis:
 * - IMPROVING: Recent entries show decreasing cost rate
 * - STABLE: Cost rate is consistent
 * - WORSENING: Recent entries show increasing cost rate
 *
 * Use Cases:
 * - Budget variance reports
 * - Cost overrun identification
 * - Early warning system for budget issues
 * - Executive dashboards (highlighting critical variances)
 * - Cost control meetings and decision-making
 *
 * @example
 * {
 *   "costCodeId": "cc-123",
 *   "code": "03-100",
 *   "name": "Concrete - Foundations",
 *   "budgetAmount": 150000,
 *   "actualCost": 165000,
 *   "variance": -15000,
 *   "variancePercent": -10.0,
 *   "status": "OVER_BUDGET",
 *   "severity": "HIGH",
 *   "trend": "WORSENING",
 *   "notes": "Cost overrun due to unforeseen soil conditions requiring additional concrete and labor"
 * }
 */
export class CostVarianceDto {
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
    description: 'Original budgeted amount for this cost code',
    example: 150000,
  })
  @Expose()
  budgetAmount!: number;

  @ApiProperty({
    description: 'Actual cost to date (sum of POSTED entries)',
    example: 165000,
  })
  @Expose()
  actualCost!: number;

  @ApiProperty({
    description: 'Budget variance (budget - actual). Positive = under budget, Negative = over budget',
    example: -15000,
  })
  @Expose()
  variance!: number;

  @ApiProperty({
    description: 'Variance as a percentage of budget ((variance / budget) * 100)',
    example: -10.0,
  })
  @Expose()
  variancePercent!: number;

  @ApiProperty({
    description: 'Variance status classification',
    enum: VarianceStatus,
    example: VarianceStatus.OVER_BUDGET,
  })
  @Expose()
  status!: VarianceStatus;

  @ApiProperty({
    description: 'Variance severity level based on magnitude. LOW: <=5%, MEDIUM: 5-10%, HIGH: 10-20%, CRITICAL: >20%',
    enum: VarianceSeverity,
    example: VarianceSeverity.HIGH,
  })
  @Expose()
  severity!: VarianceSeverity;

  @ApiProperty({
    description: 'Trend direction based on recent cost entries. IMPROVING: costs decreasing, STABLE: consistent, WORSENING: costs increasing',
    enum: VarianceTrend,
    example: VarianceTrend.WORSENING,
  })
  @Expose()
  trend!: VarianceTrend;

  @ApiProperty({
    description: 'Explanatory notes about the variance, root causes, or action items',
    example: 'Cost overrun due to unforeseen soil conditions requiring additional concrete and labor',
    required: false,
  })
  @Expose()
  notes?: string;
}
