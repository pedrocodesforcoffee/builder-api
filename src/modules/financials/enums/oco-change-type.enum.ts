/**
 * Owner Change Order Type Enum
 *
 * Categorizes the reason/type for an Owner Change Order.
 * Used for reporting, analysis, and workflow routing.
 *
 * @enum OcoChangeType
 */
export enum OcoChangeType {
  /**
   * SCOPE_CHANGE - Scope change
   * Change in project scope (additions or deletions)
   */
  SCOPE_CHANGE = 'SCOPE_CHANGE',

  /**
   * DESIGN_CHANGE - Design change
   * Change in design documents or specifications
   */
  DESIGN_CHANGE = 'DESIGN_CHANGE',

  /**
   * UNFORESEEN_CONDITIONS - Unforeseen conditions
   * Unexpected site conditions discovered during construction
   */
  UNFORESEEN_CONDITIONS = 'UNFORESEEN_CONDITIONS',

  /**
   * OWNER_REQUEST - Owner request
   * Change requested by the owner/client
   */
  OWNER_REQUEST = 'OWNER_REQUEST',

  /**
   * VALUE_ENGINEERING - Value engineering
   * Cost-saving alternative proposed and accepted
   */
  VALUE_ENGINEERING = 'VALUE_ENGINEERING',

  /**
   * REGULATORY - Regulatory requirement
   * Change required by code, permit, or regulatory authority
   */
  REGULATORY = 'REGULATORY',

  /**
   * OTHER - Other
   * Change type not covered by above categories
   */
  OTHER = 'OTHER',
}
