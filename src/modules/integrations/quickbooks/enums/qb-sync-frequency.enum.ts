/**
 * QuickBooks Sync Frequency
 *
 * Defines how often automated synchronization should occur.
 */
export enum QBSyncFrequency {
  /** Sync in real-time when events occur */
  REALTIME = 'REALTIME',

  /** Sync every hour */
  HOURLY = 'HOURLY',

  /** Sync every 6 hours */
  EVERY_6_HOURS = 'EVERY_6_HOURS',

  /** Sync once per day */
  DAILY = 'DAILY',

  /** Sync once per week */
  WEEKLY = 'WEEKLY',

  /** Manual sync only (no automation) */
  MANUAL = 'MANUAL',
}
