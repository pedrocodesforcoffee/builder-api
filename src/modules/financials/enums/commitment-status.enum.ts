/**
 * Commitment Status Enum
 *
 * Represents the lifecycle states of a commitment (subcontract or purchase order).
 */
export enum CommitmentStatus {
  /**
   * Commitment is being drafted and not yet ready for approval
   */
  DRAFT = 'DRAFT',

  /**
   * Commitment is awaiting approval from authorized personnel
   */
  PENDING_APPROVAL = 'PENDING_APPROVAL',

  /**
   * Commitment has been approved but not yet executed/active
   */
  APPROVED = 'APPROVED',

  /**
   * Commitment is active and work/deliveries are ongoing
   */
  ACTIVE = 'ACTIVE',

  /**
   * All work/deliveries are complete, final invoicing may be pending
   */
  COMPLETE = 'COMPLETE',

  /**
   * Commitment is closed, all invoicing and payments are complete
   */
  CLOSED = 'CLOSED',

  /**
   * Commitment has been voided/cancelled
   */
  VOID = 'VOID',
}
