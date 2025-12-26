/**
 * Cost Transfer Status Enum
 *
 * Defines the workflow states for cost transfers between cost codes.
 */
export enum CostTransferStatus {
  /** Transfer request is being drafted */
  DRAFT = 'DRAFT',

  /** Transfer request has been submitted for approval */
  PENDING_APPROVAL = 'PENDING_APPROVAL',

  /** Transfer has been approved and cost entries created */
  APPROVED = 'APPROVED',

  /** Transfer request has been rejected */
  REJECTED = 'REJECTED',

  /** Transfer has been voided (reversed) */
  VOID = 'VOID',
}
