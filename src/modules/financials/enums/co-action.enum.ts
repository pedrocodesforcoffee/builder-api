/**
 * Change Order Action Enum
 *
 * Represents all possible actions that can be performed on any type of change order
 * (PCO/OCO/CCO/PACKAGE) and tracked in the change order history.
 *
 * Used for comprehensive audit trail and workflow tracking across all change order types.
 *
 * @enum CoAction
 */
export enum CoAction {
  /**
   * CREATED - Change order created
   * Initial creation of the change order record
   */
  CREATED = 'CREATED',

  /**
   * UPDATED - Change order updated
   * Modifications to change order details (amount, description, etc.)
   */
  UPDATED = 'UPDATED',

  /**
   * SUBMITTED - Submitted for approval
   * Change order submitted for review/approval
   */
  SUBMITTED = 'SUBMITTED',

  /**
   * APPROVED - Approved
   * Change order approved by authorized person
   */
  APPROVED = 'APPROVED',

  /**
   * REJECTED - Rejected
   * Change order rejected with reason
   */
  REJECTED = 'REJECTED',

  /**
   * EXECUTED - Executed/Finalized
   * Change order executed and contract/commitment updated
   */
  EXECUTED = 'EXECUTED',

  /**
   * VOIDED - Voided/Cancelled
   * Change order cancelled and marked as void
   */
  VOIDED = 'VOIDED',

  /**
   * CONVERTED - Converted to another CO type
   * PCO converted to OCO, for example
   */
  CONVERTED = 'CONVERTED',

  /**
   * UNDER_REVIEW - Placed under review
   * Change order moved to under review status
   */
  UNDER_REVIEW = 'UNDER_REVIEW',

  /**
   * DOCUMENT_ADDED - Document attached
   * Supporting document added to change order
   */
  DOCUMENT_ADDED = 'DOCUMENT_ADDED',

  /**
   * DOCUMENT_REMOVED - Document removed
   * Document removed from change order
   */
  DOCUMENT_REMOVED = 'DOCUMENT_REMOVED',

  /**
   * REVISION_REQUESTED - Revision requested
   * Changes requested by reviewer/approver
   */
  REVISION_REQUESTED = 'REVISION_REQUESTED',

  /**
   * COST_UPDATED - Cost breakdown updated
   * Cost details or breakdown modified
   */
  COST_UPDATED = 'COST_UPDATED',

  /**
   * ASSIGNED - Assigned to user/role
   * Change order assigned to specific person for review/action
   */
  ASSIGNED = 'ASSIGNED',

  /**
   * REOPENED - Reopened after rejection
   * Rejected change order reopened for revision
   */
  REOPENED = 'REOPENED',
}
