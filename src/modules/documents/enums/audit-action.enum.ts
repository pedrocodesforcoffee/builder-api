/**
 * Document Audit Action Enum
 *
 * Defines all trackable actions that can be performed on documents.
 * Used for comprehensive audit logging and compliance.
 */
export enum DocumentAuditAction {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  RESTORED = 'restored',
  VERSION_ADDED = 'version_added',
  VERSION_RESTORED = 'version_restored',
  LOCKED = 'locked',
  UNLOCKED = 'unlocked',
  STATUS_CHANGED = 'status_changed',
  MOVED = 'moved',
  COPIED = 'copied',
  DOWNLOADED = 'downloaded',
  VIEWED = 'viewed',
  SHARED = 'shared',
  PERMISSION_CHANGED = 'permission_changed',
  METADATA_UPDATED = 'metadata_updated',
}
