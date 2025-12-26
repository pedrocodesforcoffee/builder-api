/**
 * Permission System Types
 *
 * Defines types for the permission matrix system
 * Format: feature:resource:action
 */

/**
 * Permission string format: "feature:resource:action"
 * Examples:
 * - "documents:drawing:create"
 * - "rfis:rfi:respond"
 * - "submittals:submittal:approve"
 *
 * Wildcards supported:
 * - "*:*:*" = all permissions
 * - "documents:*:*" = all document permissions
 * - "documents:drawing:*" = all drawing operations
 */
export type Permission = string;

/**
 * Feature categories in the construction management system
 */
export enum FeatureCategory {
  DOCUMENTS = 'documents',
  RFIS = 'rfis',
  SUBMITTALS = 'submittals',
  SCHEDULE = 'schedule',
  DAILY_REPORTS = 'daily_reports',
  SAFETY = 'safety',
  BUDGET = 'budget',
  QUALITY = 'quality',
  MEETINGS = 'meetings',
  PROJECT_SETTINGS = 'project_settings',
}

/**
 * Document resource types
 */
export enum DocumentResource {
  DRAWING = 'drawing',
  SPECIFICATION = 'specification',
  PHOTO = 'photo',
  MODEL = 'model',
  REPORT = 'report',
}

/**
 * Document actions
 */
export enum DocumentAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  EXPORT = 'export',
  VERSION = 'version',
}

/**
 * RFI actions
 */
export enum RfiAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  ASSIGN = 'assign',
  RESPOND = 'respond',
  APPROVE = 'approve',
  CLOSE = 'close',
}

/**
 * Submittal actions
 */
export enum SubmittalAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  REVIEW = 'review',
  APPROVE = 'approve',
  REJECT = 'reject',
  REQUIRE_RESUBMIT = 'require_resubmit',
}

/**
 * Schedule actions
 */
export enum ScheduleAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  ASSIGN = 'assign',
  COMPLETE = 'complete',
  APPROVE = 'approve',
}

/**
 * Daily report actions
 */
export enum DailyReportAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  EXPORT = 'export',
}

/**
 * Safety actions
 */
export enum SafetyAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  INVESTIGATE = 'investigate',
  CLOSE = 'close',
}

/**
 * Budget actions
 */
export enum BudgetAction {
  READ = 'read',
  CREATE = 'create',
  UPDATE = 'update',
  APPROVE = 'approve',
  EXPORT = 'export',
}

/**
 * Quality actions
 */
export enum QualityAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  FAIL = 'fail',
  PASS = 'pass',
}

/**
 * Meeting actions
 */
export enum MeetingAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  SCHEDULE = 'schedule',
  CANCEL = 'cancel',
}

/**
 * Project settings actions
 */
export enum ProjectSettingsAction {
  READ = 'read',
  UPDATE = 'update',
  INVITE = 'invite',
  REMOVE = 'remove',
  CONFIGURE = 'configure',
}

/**
 * Common action types used across features
 */
export enum CommonAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: PermissionDenialReason;
  required?: Permission;
  userRole?: string;
  userScope?: string[];
  resourceScope?: string[];
  message?: string;
  expiredAt?: Date;
}

/**
 * Reasons for permission denial
 */
export enum PermissionDenialReason {
  INSUFFICIENT_PERMISSIONS = 'insufficient_permissions',
  SCOPE_RESTRICTION = 'scope_restriction',
  ACCESS_EXPIRED = 'access_expired',
  PROJECT_NOT_FOUND = 'project_not_found',
  USER_NOT_MEMBER = 'user_not_member',
  RESOURCE_NOT_FOUND = 'resource_not_found',
}

/**
 * Permission cache entry
 */
export interface PermissionCache {
  userId: string;
  projectId: string;
  permissions: Set<string>;
  effectiveRole: string | null;
  scope: string[] | null;
  expiresAt: Date | null;
  cachedAt: Date;
  cacheExpiresAt: Date;
}

/**
 * Bulk permission check result
 */
export type PermissionMap = Record<Permission, boolean>;

/**
 * Scope access result
 */
export interface ScopeAccessResult {
  hasAccess: boolean;
  userScope: string[];
  resourceScope: string[];
  matchedScopes: string[];
}
