/**
 * Cost Entry Status Enum
 *
 * Defines the lifecycle states of a cost entry.
 */
export enum CostEntryStatus {
  /** Entry is being drafted, not yet posted */
  DRAFT = 'DRAFT',

  /** Entry has been posted and affects budget actualCost */
  POSTED = 'POSTED',

  /** Entry has been voided (reversed) */
  VOID = 'VOID',

  /** Entry is pending approval (for transfers) */
  PENDING_APPROVAL = 'PENDING_APPROVAL',

  /** Entry has been approved */
  APPROVED = 'APPROVED',

  /** Entry has been rejected */
  REJECTED = 'REJECTED',
}
