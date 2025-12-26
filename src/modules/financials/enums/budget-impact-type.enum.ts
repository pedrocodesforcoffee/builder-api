/**
 * Budget Impact Type Enum
 *
 * Defines how an Owner Change Order (OCO) impacts the project budget.
 */
export enum BudgetImpactType {
  /**
   * Reduces contingency/reserve funds
   * The OCO amount is absorbed by existing contingency
   */
  CONTINGENCY = 'CONTINGENCY',

  /**
   * Updates an existing budget line item
   * The OCO amount is added to a specific cost code's budgeted amount
   */
  LINE_ITEM = 'LINE_ITEM',

  /**
   * Creates a new budget line item
   * The OCO introduces a new scope that needs a new budget line
   */
  NEW_LINE = 'NEW_LINE',
}
