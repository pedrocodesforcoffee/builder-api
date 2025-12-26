/**
 * Potential Change Order Status Enum
 *
 * Represents the workflow states for Potential Change Orders (PCOs).
 * PCOs track potential changes before they become formal owner change orders.
 *
 * Status Flow:
 * DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED → CONVERTED
 *
 * @enum PcoStatus
 */
export enum PcoStatus {
  /**
   * DRAFT - Initial state
   * PCO is being created and can be edited freely
   */
  DRAFT = 'DRAFT',

  /**
   * SUBMITTED - Submitted for review
   * PCO has been submitted by contractor for review
   */
  SUBMITTED = 'SUBMITTED',

  /**
   * UNDER_REVIEW - Under review
   * PCO is being reviewed by project team/architect
   */
  UNDER_REVIEW = 'UNDER_REVIEW',

  /**
   * APPROVED - Approved
   * PCO has been approved and can be converted to OCO
   */
  APPROVED = 'APPROVED',

  /**
   * REJECTED - Rejected
   * PCO has been rejected, can be revised and resubmitted
   */
  REJECTED = 'REJECTED',

  /**
   * CONVERTED - Converted to OCO
   * PCO has been converted to an Owner Change Order
   * This is a terminal state
   */
  CONVERTED = 'CONVERTED',
}
