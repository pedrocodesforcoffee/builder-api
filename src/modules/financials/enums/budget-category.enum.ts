/**
 * Budget Category Enum
 *
 * Represents the primary cost categories for budget line items.
 * Aligns with standard construction accounting practices.
 */
export enum BudgetCategory {
  /**
   * Direct labor costs including wages, benefits, and burden
   */
  LABOR = 'LABOR',

  /**
   * Material costs for construction supplies and equipment
   */
  MATERIAL = 'MATERIAL',

  /**
   * Equipment costs including rental and owned equipment
   */
  EQUIPMENT = 'EQUIPMENT',

  /**
   * Subcontractor costs for outsourced work
   */
  SUBCONTRACT = 'SUBCONTRACT',

  /**
   * Other costs not fitting into the above categories
   * (e.g., permits, insurance, overhead allocation)
   */
  OTHER = 'OTHER',
}
