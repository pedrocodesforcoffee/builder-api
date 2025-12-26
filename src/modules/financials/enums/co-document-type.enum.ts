/**
 * Change Order Document Type Enum
 *
 * Categorizes document types that can be attached to Owner Change Orders (OCO)
 * and Commitment Change Orders (CCO).
 *
 * Used for organizing and categorizing supporting documentation.
 *
 * @enum CoDocumentType
 */
export enum CoDocumentType {
  /**
   * PROPOSAL - Proposal/Quote
   * Contractor or subcontractor proposal for the change
   */
  PROPOSAL = 'PROPOSAL',

  /**
   * BACKUP - Backup documentation
   * Supporting cost documentation, quotes, estimates
   */
  BACKUP = 'BACKUP',

  /**
   * T_AND_M - Time and Materials
   * Time and materials documentation for T&M change orders
   */
  T_AND_M = 'T_AND_M',

  /**
   * SKETCH - Sketch/Drawing
   * Technical sketches or drawings showing the change
   */
  SKETCH = 'SKETCH',

  /**
   * PHOTO - Photograph
   * Photos documenting site conditions or work
   */
  PHOTO = 'PHOTO',

  /**
   * CORRESPONDENCE - Correspondence
   * Email, letters, or other written correspondence
   */
  CORRESPONDENCE = 'CORRESPONDENCE',

  /**
   * APPROVAL - Approval documentation
   * Signed approval forms or authorization documents
   */
  APPROVAL = 'APPROVAL',

  /**
   * CONTRACT - Contract amendment
   * Formal contract amendment or modification
   */
  CONTRACT = 'CONTRACT',

  /**
   * SPECIFICATION - Specification
   * Technical specifications for the change
   */
  SPECIFICATION = 'SPECIFICATION',

  /**
   * RFI - Request for Information
   * Related RFI documentation
   */
  RFI = 'RFI',

  /**
   * OTHER - Other
   * Document type not covered by above categories
   */
  OTHER = 'OTHER',
}
