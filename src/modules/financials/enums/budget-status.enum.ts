/**
 * Budget Status Enum
 *
 * Represents the lifecycle states of a budget.
 */
export enum BudgetStatus {
  /**
   * Budget is in draft state and can be freely edited
   */
  DRAFT = 'DRAFT',

  /**
   * Budget is active and being tracked against actual costs
   */
  ACTIVE = 'ACTIVE',

  /**
   * Budget is locked for period close or final review
   * Changes require special approval
   */
  LOCKED = 'LOCKED',

  /**
   * Budget is archived and no longer active
   * Kept for historical reference
   */
  ARCHIVED = 'ARCHIVED',
}
