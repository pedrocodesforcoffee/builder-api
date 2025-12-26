/**
 * QuickBooks Sync Status
 *
 * Tracks the status of individual sync operations.
 */
export enum QBSyncStatus {
  /** Sync operation is pending */
  PENDING = 'PENDING',

  /** Sync operation is currently in progress */
  IN_PROGRESS = 'IN_PROGRESS',

  /** Sync completed successfully */
  SUCCESS = 'SUCCESS',

  /** Sync failed with error */
  FAILED = 'FAILED',

  /** Sync was skipped (e.g., due to business rules) */
  SKIPPED = 'SKIPPED',

  /** Sync conflict detected (requires manual resolution) */
  CONFLICT = 'CONFLICT',

  /** Sync operation is queued for retry */
  RETRY = 'RETRY',
}
