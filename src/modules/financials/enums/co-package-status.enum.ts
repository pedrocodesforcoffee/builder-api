/**
 * Change Order Package Status Enum
 *
 * Represents the workflow states for Change Order Packages.
 * Packages group multiple change orders for batch processing.
 *
 * Status Flow:
 * DRAFT → SUBMITTED → APPROVED
 *
 * @enum CoPackageStatus
 */
export enum CoPackageStatus {
  /**
   * DRAFT - Initial state
   * Package is being assembled and can be edited
   */
  DRAFT = 'DRAFT',

  /**
   * SUBMITTED - Submitted
   * Package has been submitted for approval
   */
  SUBMITTED = 'SUBMITTED',

  /**
   * APPROVED - Approved
   * Package has been approved
   * All change orders in the package should be processed
   */
  APPROVED = 'APPROVED',
}
