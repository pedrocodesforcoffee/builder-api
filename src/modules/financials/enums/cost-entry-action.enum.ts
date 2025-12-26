/**
 * Cost Entry Action Enum
 *
 * Defines the types of actions that can be recorded in cost entry history.
 */
export enum CostEntryAction {
  /** Cost entry created */
  CREATED = 'CREATED',

  /** Cost entry updated */
  UPDATED = 'UPDATED',

  /** Cost entry posted to budget */
  POSTED = 'POSTED',

  /** Cost entry voided/reversed */
  VOIDED = 'VOIDED',

  /** Cost entry transferred to another cost code */
  TRANSFERRED = 'TRANSFERRED',

  /** Cost entry approved */
  APPROVED = 'APPROVED',

  /** Cost entry rejected */
  REJECTED = 'REJECTED',

  /** Accrual converted to actual cost */
  ACCRUAL_CONVERTED = 'ACCRUAL_CONVERTED',

  /** Accrual reversed */
  ACCRUAL_REVERSED = 'ACCRUAL_REVERSED',

  /** Cost entry imported from system (e.g., payment application) */
  IMPORTED = 'IMPORTED',
}
