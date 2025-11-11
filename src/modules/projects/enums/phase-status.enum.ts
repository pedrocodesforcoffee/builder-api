/**
 * Phase Status Enum
 *
 * Defines the status of a project phase throughout its lifecycle.
 */
export enum PhaseStatus {
  /**
   * Not Started - Phase hasn't begun
   * The phase is planned but work hasn't started yet.
   */
  NOT_STARTED = 'NOT_STARTED',

  /**
   * In Progress - Phase is actively being worked on
   * Work on this phase is currently underway.
   */
  IN_PROGRESS = 'IN_PROGRESS',

  /**
   * Delayed - Phase is behind schedule
   * The phase is in progress but behind the planned schedule.
   */
  DELAYED = 'DELAYED',

  /**
   * Completed - Phase is finished
   * All work for this phase has been completed.
   */
  COMPLETED = 'COMPLETED',

  /**
   * Cancelled - Phase was cancelled
   * The phase was cancelled and will not be completed.
   */
  CANCELLED = 'CANCELLED',

  /**
   * On Hold - Phase is paused
   * Work on this phase has been temporarily suspended.
   */
  ON_HOLD = 'ON_HOLD',
}
