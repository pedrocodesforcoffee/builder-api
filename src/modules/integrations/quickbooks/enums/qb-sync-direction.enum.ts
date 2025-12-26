/**
 * QuickBooks Sync Direction
 *
 * Indicates the direction of data synchronization.
 */
export enum QBSyncDirection {
  /** Data flows from QuickBooks to Platform (import) */
  FROM_QB = 'FROM_QB',

  /** Data flows from Platform to QuickBooks (export) */
  TO_QB = 'TO_QB',

  /** Bidirectional synchronization */
  BIDIRECTIONAL = 'BIDIRECTIONAL',
}
