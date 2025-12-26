/**
 * Guard System Interfaces
 *
 * Defines interfaces and types for permission guards
 */

import { PermissionDenialReason } from '../types/permission.types';

/**
 * Extended permission denial reasons for guards
 */
export enum GuardDenialReason {
  // Inherit existing reasons
  INSUFFICIENT_PERMISSIONS = 'insufficient_permissions',
  SCOPE_RESTRICTION = 'scope_restriction',
  ACCESS_EXPIRED = 'access_expired',
  PROJECT_NOT_FOUND = 'project_not_found',
  USER_NOT_MEMBER = 'user_not_member',
  RESOURCE_NOT_FOUND = 'resource_not_found',

  // Additional guard-specific reasons
  OWNER_ONLY = 'owner_only',
  ADMIN_ONLY = 'admin_only',
  NOT_ASSIGNED = 'not_assigned',
  INVALID_STATUS = 'invalid_status',
  WORKFLOW_VIOLATION = 'workflow_violation',
  FINANCIAL_ACCESS_REQUIRED = 'financial_access_required',
}

/**
 * Permission result for guards
 */
export interface GuardPermissionResult {
  allowed: boolean;
  reason?: GuardDenialReason;
  message?: string;
  code?: string;
  requiredPermission?: string;
  userRole?: string;
  metadata?: Record<string, any>;
}

/**
 * Audit log entry for permission denials
 */
export interface AuditLogEntry {
  userId: string;
  projectId: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  reason: GuardDenialReason;
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Context for permission checks
 */
export interface PermissionContext {
  // Resource-specific context
  resourceType?: string;
  resourceId?: string;
  resourceStatus?: string;
  resourceOwnerId?: string;

  // User-specific context
  userId?: string;
  assignedTo?: string[];

  // Workflow context
  currentStatus?: string;
  targetStatus?: string;

  // Additional metadata
  metadata?: Record<string, any>;
}
