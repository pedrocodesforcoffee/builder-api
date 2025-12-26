/**
 * Cash Flow Projection Report DTOs
 *
 * Forecast cash inflows (from owner payments) and outflows (to vendors/subcontractors)
 * to help manage project cash requirements.
 */

/**
 * Main DTO for Cash Flow Projection Report
 *
 * Provides monthly cash flow projections with commitment-level detail
 * for managing project liquidity and peak cash requirements.
 */
export class CashFlowProjectionReportDto {
  /** Project identifier */
  projectId!: string;

  /** Project name */
  projectName!: string;

  /** Projection start date */
  startDate!: Date;

  /** Projection end date */
  endDate!: Date;

  /** Report generation date (as-of date) */
  asOfDate!: Date;

  // ============================================
  // Summary Metrics
  // ============================================

  /** Total projected cash inflows from owner */
  totalProjectedInflows!: number;

  /** Total projected cash outflows to vendors */
  totalProjectedOutflows!: number;

  /** Net cash flow (inflows - outflows) */
  netCashFlow!: number;

  /** Peak negative cash requirement (lowest cumulative point) */
  peakCashRequirement!: number;

  /** Current cash position (received - paid) */
  currentCashPosition!: number;

  /** Total retention held by us from vendors */
  totalRetentionHeld!: number;

  /** Total retention owed to us by owner */
  totalRetentionOwed!: number;

  // ============================================
  // Monthly Projections
  // ============================================

  /** Monthly cash flow projections */
  monthlyProjections!: CashFlowMonthlyProjectionDto[];

  // ============================================
  // Commitment Detail
  // ============================================

  /** Commitment-level payment projections */
  commitmentDetails!: CashFlowCommitmentDetailDto[];

  /** Report generation timestamp */
  generatedAt!: Date;
}

/**
 * Monthly cash flow projection
 *
 * Projects cash inflows and outflows by month with cumulative tracking
 */
export class CashFlowMonthlyProjectionDto {
  /** Month (first day of month) */
  month!: Date;

  /** Projected cash inflows for this month */
  projectedInflows!: number;

  /** Projected cash outflows for this month */
  projectedOutflows!: number;

  /** Net cash flow for this month (inflows - outflows) */
  netCashFlow!: number;

  /** Cumulative cash position through this month */
  cumulativeCash!: number;
}

/**
 * Commitment-level payment detail
 *
 * Breaks down projected outflows by commitment with payment schedules
 */
export class CashFlowCommitmentDetailDto {
  /** Commitment identifier */
  commitmentId!: string;

  /** Commitment number (e.g., "SC-001") */
  commitmentNumber!: string;

  /** Vendor name */
  vendorName!: string;

  /** Revised commitment amount */
  revisedAmount!: number;

  /** Amount paid to date */
  paidToDate!: number;

  /** Retention held from vendor */
  retentionHeld!: number;

  /** Remaining balance to be paid */
  remainingBalance!: number;

  /** Projected payment schedule by month */
  projectedPayments!: CashFlowCommitmentPaymentDto[];
}

/**
 * Projected payment for a commitment in a specific month
 *
 * Individual payment projection for commitment payment schedule
 */
export class CashFlowCommitmentPaymentDto {
  /** Payment month (first day of month) */
  month!: Date;

  /** Projected payment amount for this month */
  projectedAmount!: number;
}
