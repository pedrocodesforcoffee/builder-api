/**
 * LienWaiverType Enum
 *
 * Represents the type of lien waiver document.
 * Lien waivers protect owners from future claims by releasing payment rights.
 */
export enum LienWaiverType {
  /**
   * Conditional Waiver - Waives lien rights upon receipt of payment
   * Used when payment has been approved but not yet received
   * Becomes effective only when payment clears
   */
  CONDITIONAL = 'CONDITIONAL',

  /**
   * Unconditional Waiver - Waives lien rights immediately
   * Used after payment has been received and cleared
   * Effective immediately upon signing
   */
  UNCONDITIONAL = 'UNCONDITIONAL',
}
