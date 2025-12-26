/**
 * QuickBooks Payment Application Events
 *
 * Event classes for payment application lifecycle events that trigger
 * QuickBooks synchronization operations.
 *
 * Events:
 * - PaymentApplicationApprovedEvent: Triggered when payment application is approved
 * - PaymentApplicationPaidEvent: Triggered when payment application is marked as paid
 */

/**
 * Payment Application Approved Event
 *
 * Emitted when a payment application is approved.
 * Triggers creation of a Bill in QuickBooks.
 *
 * Event name: 'payment-application.approved'
 */
export class PaymentApplicationApprovedEvent {
  constructor(
    public readonly paymentApplicationId: string,
    public readonly commitmentId: string,
    public readonly organizationId: string,
    public readonly projectId: string,
    public readonly approvedById: string,
    public readonly approvedAt: Date,
    public readonly totalEarnedLessRetainage: number,
    public readonly currentPaymentDue: number,
  ) {}
}

/**
 * Payment Application Paid Event
 *
 * Emitted when a payment application is marked as paid.
 * Triggers creation of a BillPayment in QuickBooks.
 *
 * Event name: 'payment-application.paid'
 */
export class PaymentApplicationPaidEvent {
  constructor(
    public readonly paymentApplicationId: string,
    public readonly commitmentId: string,
    public readonly organizationId: string,
    public readonly projectId: string,
    public readonly paidById: string,
    public readonly paidAt: Date,
    public readonly currentPaymentDue: number,
  ) {}
}
