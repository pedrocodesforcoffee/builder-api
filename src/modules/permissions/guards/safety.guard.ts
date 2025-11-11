/**
 * Safety Guard
 *
 * Handles permission checking for safety incident operations
 */

import { Injectable } from '@nestjs/common';
import { BasePermissionGuard } from './base-permission.guard';
import { PermissionService } from '../services/permission.service';
import { ScopeService } from '../services/scope.service';
import { ExpirationService } from '../services/expiration.service';
import { AuditService } from '../services/audit.service';
import { GuardCacheService } from '../services/guard-cache.service';
import {
  GuardPermissionResult,
  GuardDenialReason,
  PermissionContext,
} from '../interfaces/guard.interface';

/**
 * Safety Guard
 *
 * Protects safety incident operations:
 * - create: Create new safety incidents
 * - read: View safety incidents
 * - update: Update incident details
 * - investigate: Conduct incident investigation
 * - close: Close incident after resolution
 */
@Injectable()
export class SafetyGuard extends BasePermissionGuard {
  constructor(
    permissionService: PermissionService,
    scopeService: ScopeService,
    expirationService: ExpirationService,
    auditService: AuditService,
    guardCacheService: GuardCacheService,
  ) {
    super(permissionService, scopeService, expirationService, auditService, guardCacheService);
  }

  protected getFeatureName(): string {
    return 'safety';
  }

  /**
   * Check permission for safety action
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @param action - Action (create, read, update, investigate, close)
   * @param resourceId - Safety incident ID
   * @param context - Additional context
   * @returns Permission result
   */
  protected async checkPermission(
    userId: string,
    projectId: string,
    action: string,
    resourceId?: string,
    context?: PermissionContext,
  ): Promise<GuardPermissionResult> {
    // Check expiration
    const expirationResult = await this.checkExpiration(userId, projectId);
    if (!expirationResult.allowed) {
      return expirationResult;
    }

    // Build permission string
    const permission = `safety:incident:${action}`;

    // Check basic permission
    const permissionResult = await this.checkBasicPermission(
      userId,
      projectId,
      permission,
    );

    if (!permissionResult.allowed) {
      return permissionResult;
    }

    // Check scope if resource ID provided
    if (resourceId && context?.metadata?.incidentScope) {
      const scopeResult = await this.checkScopeAccess(
        userId,
        projectId,
        resourceId,
        context.metadata.incidentScope,
      );

      if (!scopeResult.allowed) {
        return scopeResult;
      }
    }

    // Additional checks for specific actions
    switch (action) {
      case 'investigate':
        return this.checkInvestigatePermission(userId, projectId, context);

      case 'close':
        return this.checkClosePermission(userId, projectId, context);

      case 'update':
        return this.checkUpdatePermission(userId, projectId, context);

      default:
        return { allowed: true };
    }
  }

  /**
   * Check investigate permission
   *
   * Only safety officers and admins can investigate
   */
  private async checkInvestigatePermission(
    userId: string,
    projectId: string,
    context?: PermissionContext,
  ): Promise<GuardPermissionResult> {
    // Check status - must be open
    const validStatuses = ['open', 'reported'];
    const statusResult = this.checkValidStatus(
      context?.currentStatus || '',
      validStatuses,
      'investigate',
    );

    if (!statusResult.allowed) {
      return statusResult;
    }

    // Only safety officers, superintendents, and admins can investigate
    const userRole = await this.getUserRole(userId, projectId);

    if (
      !userRole ||
      ![
        'PROJECT_ADMIN',
        'PROJECT_MANAGER',
        'SUPERINTENDENT',
        'SAFETY_OFFICER',
      ].includes(userRole)
    ) {
      return {
        allowed: false,
        reason: GuardDenialReason.INSUFFICIENT_PERMISSIONS,
        message: 'Only safety officers or supervisors can investigate incidents',
        code: 'INVESTIGATION_PERMISSION_REQUIRED',
      };
    }

    return { allowed: true };
  }

  /**
   * Check close permission
   *
   * Incident must be investigated before closing
   */
  private async checkClosePermission(
    userId: string,
    projectId: string,
    context?: PermissionContext,
  ): Promise<GuardPermissionResult> {
    // Check if incident has been investigated
    if (!context?.metadata?.hasInvestigation) {
      return {
        allowed: false,
        reason: GuardDenialReason.WORKFLOW_VIOLATION,
        message: 'Incident must be investigated before closing',
        code: 'INVESTIGATION_REQUIRED',
      };
    }

    // Check status
    const validStatuses = ['under_investigation', 'investigated'];
    const statusResult = this.checkValidStatus(
      context?.currentStatus || '',
      validStatuses,
      'close',
    );

    if (!statusResult.allowed) {
      return statusResult;
    }

    // Only safety officers and admins can close
    const userRole = await this.getUserRole(userId, projectId);

    if (
      !userRole ||
      ![
        'PROJECT_ADMIN',
        'PROJECT_MANAGER',
        'SAFETY_OFFICER',
        'SUPERINTENDENT',
      ].includes(userRole)
    ) {
      return {
        allowed: false,
        reason: GuardDenialReason.ADMIN_ONLY,
        message: 'Only safety officers or admins can close safety incidents',
        code: 'CLOSE_PERMISSION_REQUIRED',
      };
    }

    return { allowed: true };
  }

  /**
   * Check update permission
   *
   * Reporter or assigned investigator can update
   */
  private async checkUpdatePermission(
    userId: string,
    projectId: string,
    context?: PermissionContext,
  ): Promise<GuardPermissionResult> {
    // Reporter can always update their own incidents (unless closed)
    if (context?.resourceOwnerId === userId) {
      if (context?.currentStatus === 'closed') {
        return {
          allowed: false,
          reason: GuardDenialReason.INVALID_STATUS,
          message: 'Cannot update closed incidents',
          code: 'INCIDENT_CLOSED',
        };
      }
      return { allowed: true };
    }

    // Check if user is assigned investigator
    if (context?.assignedTo && context.assignedTo.includes(userId)) {
      return { allowed: true };
    }

    // Otherwise require admin/safety officer role
    const userRole = await this.getUserRole(userId, projectId);

    if (
      !userRole ||
      ![
        'PROJECT_ADMIN',
        'PROJECT_MANAGER',
        'SAFETY_OFFICER',
        'SUPERINTENDENT',
      ].includes(userRole)
    ) {
      return {
        allowed: false,
        reason: GuardDenialReason.INSUFFICIENT_PERMISSIONS,
        message:
          'Only the reporter, assigned investigator, or safety officer can update this incident',
        code: 'UPDATE_PERMISSION_REQUIRED',
      };
    }

    return { allowed: true };
  }
}
