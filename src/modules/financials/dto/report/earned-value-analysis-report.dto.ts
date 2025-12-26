/**
 * Earned Value Analysis (EVA) Report DTOs
 *
 * Advanced EVM report with historical tracking, trend analysis, and forecasting.
 * Goes beyond Cost-to-Complete report by adding time-based analysis.
 */

/**
 * Main DTO for Earned Value Analysis Report
 *
 * Provides comprehensive EVM metrics at project level with cost code breakdown
 * and monthly trend analysis for forecasting.
 */
export class EarnedValueAnalysisReportDto {
  /** Project identifier */
  projectId!: string;

  /** Project name */
  projectName!: string;

  /** Budget identifier */
  budgetId!: string;

  /** Budget name */
  budgetName!: string;

  /** Report generation date (as-of date) */
  asOfDate!: Date;

  // ============================================
  // Project-level EVM Metrics
  // ============================================

  /** Budget at Completion - Total budget */
  bac!: number;

  /** Planned Value - Scheduled work value as of reporting date */
  pv!: number;

  /** Earned Value - Completed work value */
  ev!: number;

  /** Actual Cost - Actual costs incurred */
  ac!: number;

  /** Cost Variance = EV - AC (Positive = under budget, Negative = over budget) */
  cv!: number;

  /** Schedule Variance = EV - PV (Positive = ahead of schedule, Negative = behind schedule) */
  sv!: number;

  /** Cost Performance Index = EV / AC (> 1.0 = under budget, < 1.0 = over budget) */
  cpi!: number;

  /** Schedule Performance Index = EV / PV (> 1.0 = ahead of schedule, < 1.0 = behind schedule) */
  spi!: number;

  /** Estimate at Completion = BAC / CPI */
  eac!: number;

  /** Estimate to Complete = EAC - AC */
  etc!: number;

  /** Variance at Completion = BAC - EAC */
  vac!: number;

  /** To Complete Performance Index = (BAC - EV) / (BAC - AC) */
  tcpi!: number;

  /** Forecast completion date based on current SPI */
  forecastCompletionDate?: Date;

  // ============================================
  // Cost Code Breakdown
  // ============================================

  /** Cost code level EVM metrics */
  lines!: EarnedValueAnalysisLineDto[];

  // ============================================
  // Monthly Trend Data
  // ============================================

  /** Monthly trend data for charting and analysis */
  monthlyTrends!: EarnedValueMonthlyTrendDto[];

  /** Report generation timestamp */
  generatedAt!: Date;
}

/**
 * Cost code level EVM metrics
 *
 * Breakdown of EVM calculations by cost code for detailed analysis
 */
export class EarnedValueAnalysisLineDto {
  /** Cost code (e.g., "01-100") */
  costCode!: string;

  /** Cost code description */
  description!: string;

  /** Budget at Completion for this cost code */
  bac!: number;

  /** Planned Value for this cost code */
  pv!: number;

  /** Earned Value for this cost code */
  ev!: number;

  /** Actual Cost for this cost code */
  ac!: number;

  /** Cost Variance = EV - AC */
  cv!: number;

  /** Schedule Variance = EV - PV */
  sv!: number;

  /** Cost Performance Index = EV / AC */
  cpi!: number;

  /** Schedule Performance Index = EV / PV */
  spi!: number;

  /** Estimate at Completion = BAC / CPI */
  eac!: number;

  /** Estimate to Complete = EAC - AC */
  etc!: number;

  /** Variance at Completion = BAC - EAC */
  vac!: number;
}

/**
 * Monthly trend data point
 *
 * Historical EVM metrics by month for trend analysis and forecasting
 */
export class EarnedValueMonthlyTrendDto {
  /** Month (first day of month) */
  month!: Date;

  /** Planned Value for this month */
  plannedValue!: number;

  /** Earned Value for this month */
  earnedValue!: number;

  /** Actual Cost for this month */
  actualCost!: number;

  /** Cost Performance Index for this month */
  cpi!: number;

  /** Schedule Performance Index for this month */
  spi!: number;
}
