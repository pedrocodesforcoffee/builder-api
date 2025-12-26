/**
 * Prime Contract Status Enum
 *
 * Represents the lifecycle states of a prime contract (owner contract).
 */
export enum PrimeContractStatus {
  /**
   * Contract is being drafted and not yet executed
   */
  DRAFT = 'DRAFT',

  /**
   * Contract is active and work is ongoing
   */
  ACTIVE = 'ACTIVE',

  /**
   * All work is complete, final billing may be pending
   */
  COMPLETE = 'COMPLETE',

  /**
   * Contract is closed, all billing and closeout complete
   */
  CLOSED = 'CLOSED',
}
