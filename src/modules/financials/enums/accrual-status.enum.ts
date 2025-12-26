/**
 * Accrual Status Enum
 *
 * Defines the lifecycle states of accrued costs (estimated unbilled costs).
 */
export enum AccrualStatus {
  /** Accrual is active and affects budget actualCost */
  ACTIVE = 'ACTIVE',

  /** Accrual has been reversed (invoice received or estimate corrected) */
  REVERSED = 'REVERSED',

  /** Accrual has been converted to actual cost entry */
  CONVERTED = 'CONVERTED',

  /** Accrual is void */
  VOID = 'VOID',
}
