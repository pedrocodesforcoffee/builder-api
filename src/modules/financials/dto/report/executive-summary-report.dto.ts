/**
 * Executive Summary Report DTOs
 *
 * High-level dashboard providing project executives with key performance indicators
 * and financial health metrics at a glance.
 */

/**
 * Main DTO for Executive Summary Report
 *
 * Comprehensive dashboard with KPIs, financial metrics, risk indicators,
 * and trend data for executive-level decision making.
 */
export class ExecutiveSummaryReportDto {
  /** Project identifier */
  projectId!: string;

  /** Project name */
  projectName!: string;

  /** Project manager name */
  projectManager!: string;

  /** Report generation date (as-of date) */
  asOfDate!: Date;

  // ============================================
  // Contract & Budget
  // ============================================

  /** Contract value with owner */
  contractValue!: number;

  /** Original budget */
  originalBudget!: number;

  /** Approved change orders total */
  approvedChangeOrders!: number;

  /** Revised budget (original + change orders) */
  revisedBudget!: number;

  // ============================================
  // Costs & Commitments
  // ============================================

  /** Committed cost (subcontracts + purchase orders) */
  committedCost!: number;

  /** Actual cost incurred to date */
  actualCost!: number;

  /** Projected final cost at completion */
  projectedFinalCost!: number;

  // ============================================
  // Financial Performance
  // ============================================

  /** Budget variance (revisedBudget - projectedFinalCost) */
  budgetVariance!: number;

  /** Budget variance as percentage */
  budgetVariancePercent!: number;

  /** Projected profit (contractValue - projectedFinalCost) */
  projectedProfit!: number;

  /** Projected profit margin percentage */
  projectedProfitMargin!: number;

  // ============================================
  // Schedule Performance
  // ============================================

  /** Percent complete (based on costs) */
  percentComplete!: number;

  /** Scheduled percent complete (based on timeline) */
  scheduledPercentComplete!: number;

  /** Schedule variance in days (negative = behind) */
  scheduleVarianceDays!: number;

  /** Forecast completion date based on current performance */
  forecastCompletionDate?: Date;

  // ============================================
  // Cash Flow
  // ============================================

  /** Current cash position (received - paid) */
  currentCashPosition!: number;

  /** Projected peak cash need */
  projectedPeakCashNeed!: number;

  /** Total billed to owner to date */
  billedToDate!: number;

  /** Total received from owner */
  receivedFromOwner!: number;

  // ============================================
  // EVM Indices
  // ============================================

  /** Cost Performance Index (> 1.0 = under budget) */
  cpi!: number;

  /** Schedule Performance Index (> 1.0 = ahead of schedule) */
  spi!: number;

  // ============================================
  // Risk Indicators
  // ============================================

  /** Count of cost codes over budget */
  overBudgetLineItemsCount!: number;

  /** Count of commitments delayed */
  delayedCommitmentsCount!: number;

  /** Count of overdue invoices */
  overdueInvoicesCount!: number;

  /** Total amount of overdue invoices */
  overdueInvoicesAmount!: number;

  // ============================================
  // Top Issues
  // ============================================

  /** Top 5 cost overruns by variance */
  topCostOverruns!: ExecutiveSummaryIssueDto[];

  /** Top 5 delayed commitments by days */
  topDelayedCommitments!: ExecutiveSummaryIssueDto[];

  /** Top 5 overdue invoices by days */
  topOverdueInvoices!: ExecutiveSummaryIssueDto[];

  // ============================================
  // Trend Charts Data
  // ============================================

  /** Monthly cost trend (planned vs actual) */
  costTrend!: ExecutiveSummaryTrendDto[];

  /** Monthly cash flow trend */
  cashFlowTrend!: ExecutiveSummaryTrendDto[];

  /** Report generation timestamp */
  generatedAt!: Date;
}

/**
 * Issue or risk item for top lists
 *
 * Represents a single issue in top overruns, delays, or overdue items
 */
export class ExecutiveSummaryIssueDto {
  /** Description of the issue (cost code, commitment, invoice) */
  description!: string;

  /** Monetary value (variance, amount, etc.) */
  value!: number;

  /** Days delayed or percentage over budget */
  daysOrPercent!: number;

  /** Current status */
  status!: string;
}

/**
 * Trend data point for charts
 *
 * Monthly trend data for cost or cash flow visualization
 */
export class ExecutiveSummaryTrendDto {
  /** Month (first day of month) */
  month!: Date;

  /** Planned value for this month */
  planned!: number;

  /** Actual value for this month */
  actual!: number;
}
