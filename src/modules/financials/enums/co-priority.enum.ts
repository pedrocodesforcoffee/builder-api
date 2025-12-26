/**
 * Change Order Priority Enum
 *
 * Indicates the urgency/priority of a change order.
 * Used for workflow prioritization and reporting.
 *
 * @enum CoPriority
 */
export enum CoPriority {
  /**
   * LOW - Low priority
   * Non-urgent change order, can be processed in normal workflow
   */
  LOW = 'LOW',

  /**
   * MEDIUM - Medium priority (default)
   * Standard priority change order
   */
  MEDIUM = 'MEDIUM',

  /**
   * HIGH - High priority
   * Urgent change order, requires expedited review
   */
  HIGH = 'HIGH',

  /**
   * CRITICAL - Critical priority
   * Critical change order, may impact project schedule or safety
   * Requires immediate attention
   */
  CRITICAL = 'CRITICAL',
}
