/**
 * Quality Guard
 *
 * Handles permission checking for quality inspection operations
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
 * Quality Guard
 *
 * Protects quality inspection operations:
 * - create: Create new inspections
 * - read: View inspections
 * - update: Update inspection details
 * - approve: Approve/pass inspection
 * - fail: Fail inspection
 */
@Injectable()
export class QualityGuard extends BasePermissionGuard {
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
    return 'quality';
  }

  /**
   * Check permission for quality action
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @param action - Action (create, read, update, approve, fail, pass)
   * @param resourceId - Inspection ID
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
    const permission = `quality:inspection:${action}`;

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
    if (resourceId && context?.metadata?.inspectionScope) {
      const scopeResult = await this.checkScopeAccess(
        userId,
        projectId,
        resourceId,
        context.metadata.inspectionScope,
      );

      if (!scopeResult.allowed) {
        return scopeResult;
      }
    }

    // Additional checks for specific actions
    switch (action) {
      case 'approve':
      case 'pass':
        return this.checkApprovePermission(userId, projectId, context);

      case 'fail':
        return this.checkFailPermission(userId, projectId, context);

      case 'update':
        return this.checkUpdatePermission(userId, projectId, context);

      default:
        return { allowed: true };
    }
  }

  /**
   * Check approve/pass permission
   *
   * Only quality control officers and supervisors can approve
   */
  private async checkApprovePermission(
    userId: string,
    projectId: string,
    context?: PermissionContext,
  ): Promise<GuardPermissionResult> {
    // Check status - must be in progress or pending
    const validStatuses = ['in_progress', 'pending_approval'];
    const statusResult = this.checkValidStatus(
      context?.currentStatus || '',
      validStatuses,
      'approve',
    );

    if (!statusResult.allowed) {
      return statusResult;
    }

    // Check if inspection has required documentation
    if (context?.metadata?.requiresDocumentation && !context?.metadata?.hasDocumentation) {
      return {
        allowed: false,
        reason: GuardDenialReason.WORKFLOW_VIOLATION,
        message: 'Inspection requires documentation before approval',
        code: 'DOCUMENTATION_REQUIRED',
      };
    }

    // Only quality control officers, superintendents, and admins can approve
    const userRole = await this.getUserRole(userId, projectId);

    if (
      !userRole ||
      ![
        'PROJECT_ADMIN',
        'PROJECT_MANAGER',
        'SUPERINTENDENT',
        'QUALITY_CONTROL',
      ].includes(userRole)
    ) {
      return {
        allowed: false,
        reason: GuardDenialReason.INSUFFICIENT_PERMISSIONS,
        message: 'Only quality control officers or supervisors can approve inspections',
        code: 'APPROVAL_PERMISSION_REQUIRED',
      };
    }

    // Check if inspector is trying to approve their own inspection
    if (context?.resourceOwnerId === userId) {
      return {
        allowed: false,
        reason: GuardDenialReason.WORKFLOW_VIOLATION,
        message: 'Inspectors cannot approve their own inspections',
        code: 'SELF_APPROVAL_NOT_ALLOWED',
      };
    }

    return { allowed: true };
  }

  /**
   * Check fail permission
   *
   * Similar to approve permission
   */
  private async checkFailPermission(
    userId: string,
    projectId: string,
    context?: PermissionContext,
  ): Promise<GuardPermissionResult> {
    // Check status
    const validStatuses = ['in_progress', 'pending_approval'];
    const statusResult = this.checkValidStatus(
      context?.currentStatus || '',
      validStatuses,
      'fail',
    );

    if (!statusResult.allowed) {
      return statusResult;
    }

    // Failure requires a reason
    if (!context?.metadata?.failureReason) {
      return {
        allowed: false,
        reason: GuardDenialReason.WORKFLOW_VIOLATION,
        message: 'A reason must be provided when failing an inspection',
        code: 'FAILURE_REASON_REQUIRED',
      };
    }

    // Only quality control officers, superintendents, and admins can fail
    const userRole = await this.getUserRole(userId, projectId);

    if (
      !userRole ||
      ![
        'PROJECT_ADMIN',
        'PROJECT_MANAGER',
        'SUPERINTENDENT',
        'QUALITY_CONTROL',
      ].includes(userRole)
    ) {
      return {
        allowed: false,
        reason: GuardDenialReason.INSUFFICIENT_PERMISSIONS,
        message: 'Only quality control officers or supervisors can fail inspections',
        code: 'FAIL_PERMISSION_REQUIRED',
      };
    }

    return { allowed: true };
  }

  /**
   * Check update permission
   *
   * Inspector or assigned user can update
   */
  private async checkUpdatePermission(
    userId: string,
    projectId: string,
    context?: PermissionContext,
  ): Promise<GuardPermissionResult> {
    // Cannot update completed inspections
    if (
      context?.currentStatus === 'passed' ||
      context?.currentStatus === 'failed'
    ) {
      return {
        allowed: false,
        reason: GuardDenialReason.INVALID_STATUS,
        message: 'Cannot update completed inspections',
        code: 'INSPECTION_COMPLETED',
      };
    }

    // Inspector can update their own inspections
    if (context?.resourceOwnerId === userId) {
      return { allowed: true };
    }

    // Check if user is assigned
    if (context?.assignedTo && context.assignedTo.includes(userId)) {
      return { allowed: true };
    }

    // Otherwise require quality control or admin role
    const userRole = await this.getUserRole(userId, projectId);

    if (
      !userRole ||
      ![
        'PROJECT_ADMIN',
        'PROJECT_MANAGER',
        'SUPERINTENDENT',
        'QUALITY_CONTROL',
      ].includes(userRole)
    ) {
      return {
        allowed: false,
        reason: GuardDenialReason.INSUFFICIENT_PERMISSIONS,
        message:
          'Only the inspector, assigned user, or quality control officer can update this inspection',
        code: 'UPDATE_PERMISSION_REQUIRED',
      };
    }

    return { allowed: true };
  }
}
