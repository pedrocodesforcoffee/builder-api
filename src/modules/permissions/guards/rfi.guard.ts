/**
 * RFI Guard
 *
 * Handles permission checking for RFI (Request for Information) operations
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
 * RFI Guard
 *
 * Protects RFI operations:
 * - create: Create new RFIs
 * - read: View RFIs
 * - update: Edit RFI details
 * - respond: Provide response to RFI
 * - assign: Assign RFI to team member
 * - close: Close RFI
 */
@Injectable()
export class RFIGuard extends BasePermissionGuard {
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
    return 'rfis';
  }

  /**
   * Check permission for RFI action
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @param action - Action (create, read, update, respond, assign, close)
   * @param resourceId - RFI ID
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
    const permission = `rfis:rfi:${action}`;

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
    if (resourceId && context?.metadata?.rfiScope) {
      const scopeResult = await this.checkScopeAccess(
        userId,
        projectId,
        resourceId,
        context.metadata.rfiScope,
      );

      if (!scopeResult.allowed) {
        return scopeResult;
      }
    }

    // Additional checks for specific actions
    switch (action) {
      case 'respond':
        return this.checkRespondPermission(userId, projectId, context);

      case 'assign':
        return this.checkAssignPermission(userId, projectId, context);

      case 'close':
        return this.checkClosePermission(userId, projectId, context);

      default:
        return { allowed: true };
    }
  }

  /**
   * Check respond permission
   *
   * Only assigned users or admins can respond
   */
  private async checkRespondPermission(
    userId: string,
    projectId: string,
    context?: PermissionContext,
  ): Promise<GuardPermissionResult> {
    // Check if RFI is in open status
    if (context?.currentStatus !== 'open' && context?.currentStatus !== 'draft') {
      return {
        allowed: false,
        reason: GuardDenialReason.INVALID_STATUS,
        message: `Cannot respond to RFI with status: ${context?.currentStatus}`,
        code: 'RFI_NOT_OPEN',
      };
    }

    // Check if user is assigned
    if (context?.assignedTo && context.assignedTo.length > 0) {
      const assignmentResult = this.checkAssignment(userId, context.assignedTo);

      if (!assignmentResult.allowed) {
        // Check if user is admin (admins can respond even if not assigned)
        const userRole = await this.getUserRole(userId, projectId);

        if (
          !userRole ||
          !['PROJECT_ADMIN', 'PROJECT_MANAGER'].includes(userRole)
        ) {
          return {
            allowed: false,
            reason: GuardDenialReason.NOT_ASSIGNED,
            message: 'You must be assigned to this RFI to respond',
            code: 'NOT_ASSIGNED_TO_RFI',
          };
        }
      }
    }

    return { allowed: true };
  }

  /**
   * Check assign permission
   *
   * Only admins and managers can assign RFIs
   */
  private async checkAssignPermission(
    userId: string,
    projectId: string,
    context?: PermissionContext,
  ): Promise<GuardPermissionResult> {
    const userRole = await this.getUserRole(userId, projectId);

    if (
      !userRole ||
      ![
        'PROJECT_ADMIN',
        'PROJECT_MANAGER',
        'PROJECT_ENGINEER',
        'SUPERINTENDENT',
      ].includes(userRole)
    ) {
      return {
        allowed: false,
        reason: GuardDenialReason.INSUFFICIENT_PERMISSIONS,
        message: 'Only managers and engineers can assign RFIs',
        code: 'ASSIGNMENT_PERMISSION_REQUIRED',
      };
    }

    return { allowed: true };
  }

  /**
   * Check close permission
   *
   * RFI must be responded to before closing
   */
  private async checkClosePermission(
    userId: string,
    projectId: string,
    context?: PermissionContext,
  ): Promise<GuardPermissionResult> {
    // Check if RFI has been responded to
    if (!context?.metadata?.hasResponse) {
      return {
        allowed: false,
        reason: GuardDenialReason.WORKFLOW_VIOLATION,
        message: 'RFI must have a response before it can be closed',
        code: 'RFI_RESPONSE_REQUIRED',
      };
    }

    // Check if user is the creator, assignee, or admin
    const isCreator = context?.resourceOwnerId === userId;
    const isAssignee = context?.assignedTo?.includes(userId);

    if (!isCreator && !isAssignee) {
      const userRole = await this.getUserRole(userId, projectId);

      if (
        !userRole ||
        !['PROJECT_ADMIN', 'PROJECT_MANAGER'].includes(userRole)
      ) {
        return {
          allowed: false,
          reason: GuardDenialReason.INSUFFICIENT_PERMISSIONS,
          message:
            'Only the creator, assignee, or project admin can close this RFI',
          code: 'CLOSE_PERMISSION_REQUIRED',
        };
      }
    }

    return { allowed: true };
  }
}
