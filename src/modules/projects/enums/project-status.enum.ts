/**
 * Project Status Enum
 *
 * Defines the lifecycle status of a construction project.
 * Represents the progression from initial bidding through completion.
 */
export enum ProjectStatus {
  /**
   * Bidding Phase
   * Project is being bid by contractors, estimates are being prepared.
   */
  BIDDING = 'bidding',

  /**
   * Awarded
   * Contract has been awarded but work has not started yet.
   * Mobilization and preconstruction activities may be ongoing.
   */
  AWARDED = 'awarded',

  /**
   * Preconstruction
   * Planning, permitting, and preparation before actual construction begins.
   * Includes buyout, scheduling, and coordination.
   */
  PRECONSTRUCTION = 'preconstruction',

  /**
   * Construction
   * Active construction phase. Work is being performed on site.
   */
  CONSTRUCTION = 'construction',

  /**
   * Closeout
   * Construction is substantially complete. Final inspections, punchlist,
   * and administrative closeout activities are underway.
   */
  CLOSEOUT = 'closeout',

  /**
   * Warranty Period
   * Project is complete and in the warranty/maintenance period.
   * Monitoring for defects covered under warranty.
   */
  WARRANTY = 'warranty',

  /**
   * Complete
   * Project is fully complete, all closeout activities finished,
   * warranty period has ended.
   */
  COMPLETE = 'complete',
}
