/**
 * Report Type Enum
 *
 * Defines all supported financial report types in the system.
 * Phase 1 includes the 4 core construction financial reports.
 *
 * Phase 1 (Core Reports):
 * - BUDGET_DETAIL: Line-by-line budget breakdown with variance analysis
 * - WIP: Work in Progress report with over/under billing
 * - COST_TO_COMPLETE: EAC and ETC calculations with variance
 * - COMMITMENT_LIST: All subcontracts and purchase orders
 *
 * Future Phases (2-3):
 * - EARNED_VALUE: EVM analysis with PV, EV, AC, SPI, CPI
 * - CASH_FLOW: Multi-period cash flow projections
 * - INVOICE_REGISTER: Invoice tracking with aging
 * - EXECUTIVE_SUMMARY: High-level project dashboard
 */
export enum ReportType {
  // Phase 1: Core Construction Reports
  BUDGET_DETAIL = 'BUDGET_DETAIL',
  WIP = 'WIP',
  COST_TO_COMPLETE = 'COST_TO_COMPLETE',
  COMMITMENT_LIST = 'COMMITMENT_LIST',

  // Future: Phase 2 Financial Analysis
  // EARNED_VALUE = 'EARNED_VALUE',
  // CASH_FLOW = 'CASH_FLOW',
  // INVOICE_REGISTER = 'INVOICE_REGISTER',
  // EXECUTIVE_SUMMARY = 'EXECUTIVE_SUMMARY',
}
