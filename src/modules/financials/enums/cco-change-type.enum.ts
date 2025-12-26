/**
 * Commitment Change Order Type Enum
 *
 * Categorizes the reason/type for a Commitment Change Order.
 * Used for reporting, analysis, and tracking.
 *
 * @enum CcoChangeType
 */
export enum CcoChangeType {
  /**
   * SCOPE_ADDITION - Scope addition
   * Additional work added to the commitment
   */
  SCOPE_ADDITION = 'SCOPE_ADDITION',

  /**
   * SCOPE_REDUCTION - Scope reduction
   * Work removed from the commitment (negative change order)
   */
  SCOPE_REDUCTION = 'SCOPE_REDUCTION',

  /**
   * DESIGN_CHANGE - Design change
   * Change in design affecting this commitment
   */
  DESIGN_CHANGE = 'DESIGN_CHANGE',

  /**
   * MATERIAL_SUBSTITUTION - Material substitution
   * Change in specified materials
   */
  MATERIAL_SUBSTITUTION = 'MATERIAL_SUBSTITUTION',

  /**
   * UNFORESEEN_CONDITIONS - Unforeseen conditions
   * Additional work due to unforeseen conditions
   */
  UNFORESEEN_CONDITIONS = 'UNFORESEEN_CONDITIONS',

  /**
   * OTHER - Other
   * Change type not covered by above categories
   */
  OTHER = 'OTHER',
}
