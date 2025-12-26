/**
 * Commitment Change Order Status Enum
 *
 * Represents the workflow states for Commitment Change Orders (CCOs).
 * CCOs modify subcontract or purchase order amounts.
 *
 * Status Flow:
 * DRAFT → PENDING_APPROVAL → APPROVED/REJECTED → EXECUTED
 *
 * @enum CcoStatus
 */
export enum CcoStatus {
  /**
   * DRAFT - Initial state
   * CCO is being created and can be edited freely
   */
  DRAFT = 'DRAFT',

  /**
   * PENDING_APPROVAL - Pending approval
   * CCO has been submitted and is awaiting approval
   */
  PENDING_APPROVAL = 'PENDING_APPROVAL',

  /**
   * APPROVED - Approved
   * CCO has been approved
   * Side effect: Updates commitment.currentAmount
   */
  APPROVED = 'APPROVED',

  /**
   * REJECTED - Rejected
   * CCO has been rejected, can be revised and resubmitted
   */
  REJECTED = 'REJECTED',

  /**
   * EXECUTED - Executed
   * CCO has been fully executed and integrated
   * This is a terminal state
   */
  EXECUTED = 'EXECUTED',
}
