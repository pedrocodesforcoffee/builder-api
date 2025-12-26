/**
 * Submittal Guard
 *
 * Handles permission checking for submittal operations
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
 * Submittal Guard
 *
 * Protects submittal operations:
 * - create: Create new submittals
 * - read: View submittals
 * - review: Review submittal (intermediate step)
 * - approve: Approve submittal
 * - reject: Reject submittal
 * - require_resubmit: Require resubmission
 */
@Injectable()
export class SubmittalGuard extends BasePermissionGuard {
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
    return 'submittals';
  }

  /**
   * Check permission for submittal action
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @param action - Action (create, read, review, approve, reject, require_resubmit)
   * @param resourceId - Submittal ID
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
    const permission = `submittals:submittal:${action}`;

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
    if (resourceId && context?.metadata?.submittalScope) {
      const scopeResult = await this.checkScopeAccess(
        userId,
        projectId,
        resourceId,
        context.metadata.submittalScope,
      );

      if (!scopeResult.allowed) {
        return scopeResult;
      }
    }

    // Additional checks for specific actions
    switch (action) {
      case 'review':
        return this.checkReviewPermission(userId, projectId, context);

      case 'approve':
        return this.checkApprovePermission(userId, projectId, context);

      case 'reject':
        return this.checkRejectPermission(userId, projectId, context);

      case 'require_resubmit':
        return this.checkRequireResubmitPermission(userId, projectId, context);

      default:
        return { allowed: true };
    }
  }

  /**
   * Check review permission
   *
   * Submittal must be in submitted status
   */
  private async checkReviewPermission(
    userId: string,
    projectId: string,
    context?: PermissionContext,
  ): Promise<GuardPermissionResult> {
    // Check status
    const validStatuses = ['submitted', 'under_review'];
    const statusResult = this.checkValidStatus(
      context?.currentStatus || '',
      validStatuses,
      'review',
    );

    if (!statusResult.allowed) {
      return statusResult;
    }

    // Check if user is reviewer or admin
    if (context?.assignedTo && context.assignedTo.length > 0) {
      const assignmentResult = this.checkAssignment(userId, context.assignedTo);

      if (!assignmentResult.allowed) {
        const userRole = await this.getUserRole(userId, projectId);

        if (
          !userRole ||
          !['PROJECT_ADMIN', 'PROJECT_MANAGER', 'PROJECT_ENGINEER'].includes(
            userRole,
          )
        ) {
          return {
            allowed: false,
            reason: GuardDenialReason.NOT_ASSIGNED,
            message: 'You must be assigned as a reviewer for this submittal',
            code: 'NOT_ASSIGNED_REVIEWER',
          };
        }
      }
    }

    return { allowed: true };
  }

  /**
   * Check approve permission
   *
   * Submittal must be reviewed before approval
   */
  private async checkApprovePermission(
    userId: string,
    projectId: string,
    context?: PermissionContext,
  ): Promise<GuardPermissionResult> {
    // Check status - must be reviewed
    const validStatuses = ['under_review', 'reviewed'];
    const statusResult = this.checkValidStatus(
      context?.currentStatus || '',
      validStatuses,
      'approve',
    );

    if (!statusResult.allowed) {
      return statusResult;
    }

    // Check if submittal has been reviewed
    if (!context?.metadata?.hasReview) {
      return {
        allowed: false,
        reason: GuardDenialReason.WORKFLOW_VIOLATION,
        message: 'Submittal must be reviewed before approval',
        code: 'REVIEW_REQUIRED',
      };
    }

    // Only admins and managers can approve
    const userRole = await this.getUserRole(userId, projectId);

    if (
      !userRole ||
      !['PROJECT_ADMIN', 'PROJECT_MANAGER', 'PROJECT_ENGINEER'].includes(
        userRole,
      )
    ) {
      return {
        allowed: false,
        reason: GuardDenialReason.ADMIN_ONLY,
        message: 'Only project managers and engineers can approve submittals',
        code: 'APPROVAL_PERMISSION_REQUIRED',
      };
    }

    return { allowed: true };
  }

  /**
   * Check reject permission
   *
   * Similar to approve permission
   */
  private async checkRejectPermission(
    userId: string,
    projectId: string,
    context?: PermissionContext,
  ): Promise<GuardPermissionResult> {
    // Check status
    const validStatuses = ['submitted', 'under_review', 'reviewed'];
    const statusResult = this.checkValidStatus(
      context?.currentStatus || '',
      validStatuses,
      'reject',
    );

    if (!statusResult.allowed) {
      return statusResult;
    }

    // Only admins and managers can reject
    const userRole = await this.getUserRole(userId, projectId);

    if (
      !userRole ||
      !['PROJECT_ADMIN', 'PROJECT_MANAGER', 'PROJECT_ENGINEER'].includes(
        userRole,
      )
    ) {
      return {
        allowed: false,
        reason: GuardDenialReason.ADMIN_ONLY,
        message: 'Only project managers and engineers can reject submittals',
        code: 'REJECTION_PERMISSION_REQUIRED',
      };
    }

    return { allowed: true };
  }

  /**
   * Check require resubmit permission
   *
   * Reviewer can request resubmission with corrections
   */
  private async checkRequireResubmitPermission(
    userId: string,
    projectId: string,
    context?: PermissionContext,
  ): Promise<GuardPermissionResult> {
    // Check status
    const validStatuses = ['under_review', 'reviewed'];
    const statusResult = this.checkValidStatus(
      context?.currentStatus || '',
      validStatuses,
      'require resubmission',
    );

    if (!statusResult.allowed) {
      return statusResult;
    }

    // Only reviewers, managers, and admins can require resubmission
    if (context?.assignedTo && context.assignedTo.length > 0) {
      const assignmentResult = this.checkAssignment(userId, context.assignedTo);

      if (!assignmentResult.allowed) {
        const userRole = await this.getUserRole(userId, projectId);

        if (
          !userRole ||
          !['PROJECT_ADMIN', 'PROJECT_MANAGER', 'PROJECT_ENGINEER'].includes(
            userRole,
          )
        ) {
          return {
            allowed: false,
            reason: GuardDenialReason.NOT_ASSIGNED,
            message:
              'Only assigned reviewers or managers can require resubmission',
            code: 'RESUBMIT_PERMISSION_REQUIRED',
          };
        }
      }
    }

    return { allowed: true };
  }
}
