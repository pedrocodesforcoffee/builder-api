/**
 * Budget Guard
 *
 * Handles permission checking for budget and financial operations
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
 * Budget Guard
 *
 * Protects budget and financial operations:
 * - read: View budget data
 * - create: Create budget items
 * - update: Update budget items
 * - approve_change_order: Approve budget change orders
 * - approve_payment: Approve payment requests
 * - export: Export financial reports
 */
@Injectable()
export class BudgetGuard extends BasePermissionGuard {
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
    return 'budget';
  }

  /**
   * Check permission for budget action
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @param action - Action (read, create, update, approve_change_order, approve_payment, export)
   * @param resourceId - Budget item ID
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
    const resourceType = context?.resourceType || 'budget';
    const permission = `budget:${resourceType}:${action}`;

    // Check basic permission
    const permissionResult = await this.checkBasicPermission(
      userId,
      projectId,
      permission,
    );

    if (!permissionResult.allowed) {
      return permissionResult;
    }

    // Financial data never has scope restrictions - it's either full access or no access
    // This is a security best practice for financial data

    // Additional checks for specific actions
    switch (action) {
      case 'read':
        return this.checkReadPermission(userId, projectId, context);

      case 'approve_change_order':
        return this.checkApproveChangeOrderPermission(
          userId,
          projectId,
          context,
        );

      case 'approve_payment':
        return this.checkApprovePaymentPermission(userId, projectId, context);

      case 'export':
        return this.checkExportPermission(userId, projectId, context);

      default:
        return { allowed: true };
    }
  }

  /**
   * Check read permission
   *
   * Budget data is highly sensitive
   */
  private async checkReadPermission(
    userId: string,
    projectId: string,
    context?: PermissionContext,
  ): Promise<GuardPermissionResult> {
    // Get user role
    const userRole = await this.getUserRole(userId, projectId);

    // Only certain roles can view financial data
    const authorizedRoles = [
      'PROJECT_ADMIN',
      'PROJECT_MANAGER',
      'ESTIMATOR',
      'OWNER', // Organization owner
    ];

    if (!userRole || !authorizedRoles.includes(userRole)) {
      return {
        allowed: false,
        reason: GuardDenialReason.FINANCIAL_ACCESS_REQUIRED,
        message: 'You do not have permission to view financial data',
        code: 'FINANCIAL_ACCESS_DENIED',
        userRole,
      };
    }

    return { allowed: true };
  }

  /**
   * Check approve change order permission
   *
   * Requires admin or manager role and amount threshold check
   */
  private async checkApproveChangeOrderPermission(
    userId: string,
    projectId: string,
    context?: PermissionContext,
  ): Promise<GuardPermissionResult> {
    // Get user role
    const userRole = await this.getUserRole(userId, projectId);

    // Check amount threshold
    const amount = context?.metadata?.amount || 0;
    const threshold = context?.metadata?.approvalThreshold || 10000;

    // For large change orders, require PROJECT_ADMIN
    if (amount > threshold) {
      if (!userRole || userRole !== 'PROJECT_ADMIN') {
        return {
          allowed: false,
          reason: GuardDenialReason.ADMIN_ONLY,
          message: `Change orders over $${threshold.toLocaleString()} require admin approval`,
          code: 'ADMIN_APPROVAL_REQUIRED',
          metadata: {
            amount,
            threshold,
          },
        };
      }
    }

    // For smaller amounts, manager or admin
    if (
      !userRole ||
      !['PROJECT_ADMIN', 'PROJECT_MANAGER'].includes(userRole)
    ) {
      return {
        allowed: false,
        reason: GuardDenialReason.ADMIN_ONLY,
        message: 'Only project managers or admins can approve change orders',
        code: 'MANAGER_APPROVAL_REQUIRED',
      };
    }

    return { allowed: true };
  }

  /**
   * Check approve payment permission
   *
   * Similar to change order approval
   */
  private async checkApprovePaymentPermission(
    userId: string,
    projectId: string,
    context?: PermissionContext,
  ): Promise<GuardPermissionResult> {
    // Get user role
    const userRole = await this.getUserRole(userId, projectId);

    // Check amount threshold
    const amount = context?.metadata?.amount || 0;
    const threshold = context?.metadata?.approvalThreshold || 50000;

    // For large payments, require PROJECT_ADMIN
    if (amount > threshold) {
      if (!userRole || userRole !== 'PROJECT_ADMIN') {
        return {
          allowed: false,
          reason: GuardDenialReason.ADMIN_ONLY,
          message: `Payments over $${threshold.toLocaleString()} require admin approval`,
          code: 'ADMIN_APPROVAL_REQUIRED',
          metadata: {
            amount,
            threshold,
          },
        };
      }
    }

    // For smaller amounts, manager or admin
    if (
      !userRole ||
      !['PROJECT_ADMIN', 'PROJECT_MANAGER'].includes(userRole)
    ) {
      return {
        allowed: false,
        reason: GuardDenialReason.ADMIN_ONLY,
        message: 'Only project managers or admins can approve payments',
        code: 'MANAGER_APPROVAL_REQUIRED',
      };
    }

    // Check if payment has been reviewed
    if (!context?.metadata?.hasReview) {
      return {
        allowed: false,
        reason: GuardDenialReason.WORKFLOW_VIOLATION,
        message: 'Payment must be reviewed before approval',
        code: 'REVIEW_REQUIRED',
      };
    }

    return { allowed: true };
  }

  /**
   * Check export permission
   *
   * Financial exports are highly sensitive
   */
  private async checkExportPermission(
    userId: string,
    projectId: string,
    context?: PermissionContext,
  ): Promise<GuardPermissionResult> {
    // Get user role
    const userRole = await this.getUserRole(userId, projectId);

    // Only admins and managers can export financial data
    if (
      !userRole ||
      !['PROJECT_ADMIN', 'PROJECT_MANAGER', 'ESTIMATOR'].includes(userRole)
    ) {
      return {
        allowed: false,
        reason: GuardDenialReason.ADMIN_ONLY,
        message: 'Only project managers or admins can export financial data',
        code: 'EXPORT_PERMISSION_REQUIRED',
      };
    }

    // Log export for compliance
    this.logger.warn(
      `Financial data export requested by user ${userId} on project ${projectId}`,
    );

    return { allowed: true };
  }
}
