/**
 * QuickBooks Connection Status
 *
 * Tracks the current state of the QuickBooks Online connection.
 */
export enum QBConnectionStatus {
  /** Connection has been established and is active */
  CONNECTED = 'CONNECTED',

  /** Connection is currently being established (OAuth in progress) */
  CONNECTING = 'CONNECTING',

  /** Connection has been explicitly disconnected by user */
  DISCONNECTED = 'DISCONNECTED',

  /** Connection failed due to authentication error */
  AUTH_FAILED = 'AUTH_FAILED',

  /** Connection expired (tokens no longer valid) */
  EXPIRED = 'EXPIRED',

  /** Connection encountered an error */
  ERROR = 'ERROR',
}
