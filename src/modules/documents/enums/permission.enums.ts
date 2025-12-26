/**
 * Permission Enums
 *
 * Defines project roles, document actions, and permission-related enums
 * for the document permissions and distribution system.
 */

/**
 * Project roles with default permission sets
 */
export enum ProjectRole {
  // Full access roles
  OWNER = 'owner',
  ADMIN = 'admin',

  // Design team roles
  ARCHITECT = 'architect',
  ENGINEER = 'engineer',
  CONSULTANT = 'consultant',

  // Construction team roles
  GENERAL_CONTRACTOR = 'general_contractor',
  PROJECT_MANAGER = 'project_manager',
  SUPERINTENDENT = 'superintendent',
  PROJECT_ENGINEER = 'project_engineer',

  // Trade roles
  SUBCONTRACTOR = 'subcontractor',
  SUPPLIER = 'supplier',

  // External roles
  INSPECTOR = 'inspector',
  VIEWER = 'viewer'
}

/**
 * Actions that can be performed on documents
 */
export enum DocumentAction {
  VIEW = 'view',
  DOWNLOAD = 'download',
  DOWNLOAD_ORIGINAL = 'download_original',
  PRINT = 'print',
  EDIT = 'edit',
  DELETE = 'delete',
  SHARE = 'share',
  MANAGE_PERMISSIONS = 'manage_permissions',
  VERSION = 'version'
}

/**
 * Project member status
 */
export enum MemberStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked'
}

/**
 * Permission target type (role, user, or company)
 */
export enum PermissionTargetType {
  ROLE = 'role',
  USER = 'user',
  COMPANY = 'company'
}

/**
 * Share link status
 */
export enum ShareLinkStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  EXHAUSTED = 'exhausted',
  REVOKED = 'revoked'
}

/**
 * Transmittal status
 */
export enum TransmittalStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PARTIALLY_ACKNOWLEDGED = 'partially_acknowledged',
  FULLY_ACKNOWLEDGED = 'fully_acknowledged',
  EXPIRED = 'expired'
}

/**
 * Transmittal recipient status
 */
export enum RecipientStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  VIEWED = 'viewed',
  DOWNLOADED = 'downloaded',
  ACKNOWLEDGED = 'acknowledged',
  FAILED = 'failed'
}
