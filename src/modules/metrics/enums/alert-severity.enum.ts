/**
 * AlertSeverity Enum
 *
 * Severity levels for metric alerts
 */
export enum AlertSeverity {
  /** Informational alert, no immediate action required */
  INFO = 'INFO',

  /** Warning alert, should be monitored */
  WARNING = 'WARNING',

  /** Critical alert, requires immediate attention */
  CRITICAL = 'CRITICAL',
}