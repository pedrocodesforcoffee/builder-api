/**
 * Owner Change Order Status Enum
 *
 * Represents the workflow states for Owner Change Orders (OCOs).
 * OCOs are formal change orders to the prime contract.
 *
 * Status Flow:
 * DRAFT → PENDING_APPROVAL → APPROVED/REJECTED → EXECUTED
 *
 * @enum OcoStatus
 */
export enum OcoStatus {
  /**
   * DRAFT - Initial state
   * OCO is being created and can be edited freely
   */
  DRAFT = 'DRAFT',

  /**
   * PENDING_APPROVAL - Pending approval
   * OCO has been submitted and is awaiting approval
   * Approval requirements depend on amount thresholds
   */
  PENDING_APPROVAL = 'PENDING_APPROVAL',

  /**
   * APPROVED - Approved
   * OCO has been approved
   * Side effect: Updates prime_contract.currentAmount
   */
  APPROVED = 'APPROVED',

  /**
   * REJECTED - Rejected
   * OCO has been rejected, can be revised and resubmitted
   */
  REJECTED = 'REJECTED',

  /**
   * EXECUTED - Executed
   * OCO has been fully executed and integrated
   * This is a terminal state
   */
  EXECUTED = 'EXECUTED',
}
