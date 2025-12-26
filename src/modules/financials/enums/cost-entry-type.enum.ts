/**
 * Cost Entry Type Enum
 *
 * Defines the different types of costs that can be tracked.
 */
export enum CostEntryType {
  /** Direct labor costs (wages, benefits) */
  LABOR = 'LABOR',

  /** Material costs (purchased materials, supplies) */
  MATERIAL = 'MATERIAL',

  /** Equipment costs (rental, depreciation, fuel) */
  EQUIPMENT = 'EQUIPMENT',

  /** Subcontractor costs (from commitments/invoices) */
  SUBCONTRACT = 'SUBCONTRACT',

  /** Other direct costs (permits, fees, etc.) */
  OTHER_DIRECT = 'OTHER_DIRECT',

  /** Overhead allocation */
  OVERHEAD = 'OVERHEAD',

  /** Invoice-based costs (vendor invoices) */
  INVOICE = 'INVOICE',

  /** Accrued costs (estimated unbilled) */
  ACCRUAL = 'ACCRUAL',
}
