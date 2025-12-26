/**
 * Report Status Enum
 *
 * Lifecycle status for generated reports.
 * Reports progress from PENDING → GENERATING → COMPLETED/FAILED.
 */
export enum ReportStatus {
  PENDING = 'PENDING',
  GENERATING = 'GENERATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}
