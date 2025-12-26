/**
 * Invoice Register Report DTOs
 *
 * Comprehensive listing of all invoices (both payable to vendors and receivable from owner)
 * with aging analysis for accounts payable/receivable management.
 */

/**
 * Main DTO for Invoice Register Report
 *
 * Provides comprehensive invoice tracking with aging analysis
 * for both payable (to vendors) and receivable (from owner) invoices.
 */
export class InvoiceRegisterReportDto {
  /** Project identifier */
  projectId!: string;

  /** Project name */
  projectName!: string;

  /** Report generation date (as-of date) */
  asOfDate!: Date;

  /** Filter by invoice type (optional) */
  filterType?: 'PAYABLE' | 'RECEIVABLE';

  /** Filter by approval status (optional) */
  filterStatus?: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';

  // ============================================
  // Summary Metrics
  // ============================================

  /** Total number of invoices in report */
  totalInvoices!: number;

  /** Total invoice amount */
  totalInvoiceAmount!: number;

  /** Total amount paid */
  totalPaidAmount!: number;

  /** Total outstanding amount (unpaid) */
  totalOutstandingAmount!: number;

  /** Total retention held */
  totalRetentionHeld!: number;

  // ============================================
  // Aging Summary
  // ============================================

  /** Current (0-30 days) outstanding amount */
  agingCurrent!: number;

  /** 31-60 days outstanding amount */
  aging31To60!: number;

  /** 61-90 days outstanding amount */
  aging61To90!: number;

  /** 90+ days outstanding amount */
  aging90Plus!: number;

  // ============================================
  // Invoice Details
  // ============================================

  /** Detailed invoice listing */
  invoices!: InvoiceRegisterLineDto[];

  /** Report generation timestamp */
  generatedAt!: Date;
}

/**
 * Individual invoice line item
 *
 * Detailed information for a single invoice including aging analysis
 */
export class InvoiceRegisterLineDto {
  /** Invoice identifier */
  invoiceId!: string;

  /** Invoice number */
  invoiceNumber!: string;

  /** Invoice type (PAYABLE to vendors, RECEIVABLE from owner) */
  invoiceType!: 'PAYABLE' | 'RECEIVABLE';

  /** Invoice date */
  invoiceDate!: Date;

  /** Payment due date */
  dueDate!: Date;

  /** Vendor name (for PAYABLE) or Customer name (for RECEIVABLE) */
  vendorOrCustomerName!: string;

  /** Related commitment number (optional) */
  commitmentNumber?: string;

  /** Invoice description */
  description!: string;

  /** Invoice amount */
  amount!: number;

  /** Retention held */
  retentionHeld!: number;

  /** Amount due (amount - retention) */
  amountDue!: number;

  /** Amount paid to date */
  amountPaid!: number;

  /** Approval/payment status */
  status!: string;

  /** Days outstanding (from invoice date to as-of date) */
  daysOutstanding!: number;

  /** Aging bucket ("Current", "1-30", "31-60", "61-90", "90+") */
  agingBucket!: string;
}
