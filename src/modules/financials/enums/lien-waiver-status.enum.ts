/**
 * Lien Waiver Status Enum
 *
 * Tracks the status of lien waiver documents through their lifecycle.
 *
 * Workflow:
 * REQUESTED → RECEIVED → APPROVED (or REJECTED)
 */
export enum LienWaiverStatus {
  /**
   * Waiver has been requested from the vendor but not yet received
   */
  REQUESTED = 'REQUESTED',

  /**
   * Waiver document has been received and uploaded
   */
  RECEIVED = 'RECEIVED',

  /**
   * Waiver has been reviewed and approved
   */
  APPROVED = 'APPROVED',

  /**
   * Waiver was rejected (incorrect dates, amounts, or signatures)
   */
  REJECTED = 'REJECTED',
}
