/**
 * QuickBooks Entity Type
 *
 * Represents the types of QuickBooks entities that can be synced.
 */
export enum QBEntityType {
  /** QuickBooks Vendor entity */
  VENDOR = 'VENDOR',

  /** QuickBooks Customer entity */
  CUSTOMER = 'CUSTOMER',

  /** QuickBooks Account entity (Chart of Accounts) */
  ACCOUNT = 'ACCOUNT',

  /** QuickBooks Bill entity (vendor invoice) */
  BILL = 'BILL',

  /** QuickBooks BillPayment entity */
  BILL_PAYMENT = 'BILL_PAYMENT',

  /** QuickBooks Invoice entity (owner billing) */
  INVOICE = 'INVOICE',

  /** QuickBooks Payment entity (invoice payment) */
  PAYMENT = 'PAYMENT',

  /** QuickBooks JournalEntry entity */
  JOURNAL_ENTRY = 'JOURNAL_ENTRY',

  /** QuickBooks Purchase Order entity */
  PURCHASE_ORDER = 'PURCHASE_ORDER',
}
