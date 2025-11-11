/**
 * AlertStatus Enum
 *
 * Status states for metric alerts
 */
export enum AlertStatus {
  /** Alert is currently active and unresolved */
  ACTIVE = 'ACTIVE',

  /** Alert has been resolved (metric back to normal) */
  RESOLVED = 'RESOLVED',

  /** Alert has been acknowledged by a user but not yet resolved */
  ACKNOWLEDGED = 'ACKNOWLEDGED',
}