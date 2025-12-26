/**
 * Milestone Status Enum
 *
 * Defines the status of a project milestone throughout its lifecycle.
 */
export enum MilestoneStatus {
  /**
   * Pending - Milestone not yet achieved
   * The milestone is scheduled but hasn't been completed yet.
   */
  PENDING = 'PENDING',

  /**
   * Achieved - Milestone successfully completed
   * The milestone was completed on or before the planned date.
   */
  ACHIEVED = 'ACHIEVED',

  /**
   * Missed - Milestone deadline passed without completion
   * The planned date has passed but the milestone hasn't been completed.
   */
  MISSED = 'MISSED',

  /**
   * Cancelled - Milestone no longer applicable
   * The milestone was cancelled and is no longer part of the project plan.
   */
  CANCELLED = 'CANCELLED',
}
