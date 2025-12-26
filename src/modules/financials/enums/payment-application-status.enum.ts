/**
 * PaymentApplicationStatus Enum
 *
 * Represents the lifecycle states of a payment application (AIA G702/G703).
 * Payment applications follow a workflow from draft through approval to payment.
 */
export enum PaymentApplicationStatus {
  /**
   * Payment application is being drafted and not yet ready for submission
   */
  DRAFT = 'DRAFT',

  /**
   * Payment application has been submitted and is awaiting review
   */
  SUBMITTED = 'SUBMITTED',

  /**
   * Payment application is under review by authorized personnel
   */
  UNDER_REVIEW = 'UNDER_REVIEW',

  /**
   * Payment application has been approved for payment
   * This updates commitment.invoicedAmount and budget.actualCost
   */
  APPROVED = 'APPROVED',

  /**
   * Payment application was rejected and must be revised
   */
  REJECTED = 'REJECTED',

  /**
   * Payment has been made to the vendor/subcontractor
   * This updates commitment.paidAmount
   */
  PAID = 'PAID',

  /**
   * Payment application has been voided/cancelled
   */
  VOID = 'VOID',
}
