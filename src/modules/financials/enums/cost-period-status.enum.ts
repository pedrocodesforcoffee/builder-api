/**
 * Cost Period Status Enum
 *
 * Defines the status of cost tracking periods (typically monthly).
 */
export enum CostPeriodStatus {
  /** Period is open for cost entries */
  OPEN = 'OPEN',

  /** Period is closed, no further entries allowed */
  CLOSED = 'CLOSED',

  /** Period is locked for auditing/reporting */
  LOCKED = 'LOCKED',
}
