/**
 * Project Settings Guard
 *
 * Handles permission checking for project configuration operations
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
 * Project Settings Guard
 *
 * Protects project configuration operations:
 * - read: View project settings
 * - update: Update project settings
 * - manage_members: Add/remove project members
 * - manage_permissions: Manage role assignments
 * - delete: Delete project (owner only)
 * - configure: Configure project structure
 */
@Injectable()
export class ProjectSettingsGuard extends BasePermissionGuard {
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
    return 'project_settings';
  }

  /**
   * Check permission for project settings action
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @param action - Action (read, update, manage_members, manage_permissions, delete, configure)
   * @param resourceId - Not used for settings
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
    const permission = `project_settings:settings:${action}`;

    // Check basic permission
    const permissionResult = await this.checkBasicPermission(
      userId,
      projectId,
      permission,
    );

    if (!permissionResult.allowed) {
      return permissionResult;
    }

    // Settings operations never have scope restrictions
    // You either have full settings access or none

    // Additional checks for specific actions
    switch (action) {
      case 'update':
        return this.checkUpdatePermission(userId, projectId, context);

      case 'manage_members':
        return this.checkManageMembersPermission(userId, projectId, context);

      case 'manage_permissions':
        return this.checkManagePermissionsPermission(
          userId,
          projectId,
          context,
        );

      case 'delete':
        return this.checkDeletePermission(userId, projectId, context);

      case 'configure':
        return this.checkConfigurePermission(userId, projectId, context);

      default:
        return { allowed: true };
    }
  }

  /**
   * Check update permission
   *
   * Only admins can update project settings
   */
  private async checkUpdatePermission(
    userId: string,
    projectId: string,
    context?: PermissionContext,
  ): Promise<GuardPermissionResult> {
    const userRole = await this.getUserRole(userId, projectId);

    if (!userRole || !['PROJECT_ADMIN', 'PROJECT_MANAGER'].includes(userRole)) {
      return {
        allowed: false,
        reason: GuardDenialReason.ADMIN_ONLY,
        message: 'Only project admins can update project settings',
        code: 'ADMIN_PERMISSION_REQUIRED',
      };
    }

    // Critical settings require PROJECT_ADMIN
    if (context?.metadata?.criticalSetting) {
      if (userRole !== 'PROJECT_ADMIN') {
        return {
          allowed: false,
          reason: GuardDenialReason.ADMIN_ONLY,
          message: 'Only project admins can update critical settings',
          code: 'ADMIN_ONLY_SETTING',
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check manage members permission
   *
   * Admins and managers can manage members
   */
  private async checkManageMembersPermission(
    userId: string,
    projectId: string,
    context?: PermissionContext,
  ): Promise<GuardPermissionResult> {
    const userRole = await this.getUserRole(userId, projectId);

    if (!userRole || !['PROJECT_ADMIN', 'PROJECT_MANAGER'].includes(userRole)) {
      return {
        allowed: false,
        reason: GuardDenialReason.ADMIN_ONLY,
        message: 'Only project admins and managers can manage members',
        code: 'MEMBER_MANAGEMENT_PERMISSION_REQUIRED',
      };
    }

    // Removing admin members requires admin role
    if (
      context?.metadata?.action === 'remove' &&
      context?.metadata?.targetRole === 'PROJECT_ADMIN'
    ) {
      if (userRole !== 'PROJECT_ADMIN') {
        return {
          allowed: false,
          reason: GuardDenialReason.ADMIN_ONLY,
          message: 'Only project admins can remove other admins',
          code: 'ADMIN_REMOVAL_RESTRICTED',
        };
      }

      // Cannot remove yourself
      if (context?.metadata?.targetUserId === userId) {
        return {
          allowed: false,
          reason: GuardDenialReason.WORKFLOW_VIOLATION,
          message: 'Cannot remove yourself from project',
          code: 'SELF_REMOVAL_NOT_ALLOWED',
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check manage permissions permission
   *
   * Only admins can manage role assignments
   */
  private async checkManagePermissionsPermission(
    userId: string,
    projectId: string,
    context?: PermissionContext,
  ): Promise<GuardPermissionResult> {
    const userRole = await this.getUserRole(userId, projectId);

    // Only PROJECT_ADMIN can manage permissions
    if (!userRole || userRole !== 'PROJECT_ADMIN') {
      return {
        allowed: false,
        reason: GuardDenialReason.ADMIN_ONLY,
        message: 'Only project admins can manage permissions',
        code: 'PERMISSION_MANAGEMENT_ADMIN_ONLY',
      };
    }

    // Cannot modify own permissions
    if (context?.metadata?.targetUserId === userId) {
      return {
        allowed: false,
        reason: GuardDenialReason.WORKFLOW_VIOLATION,
        message: 'Cannot modify your own permissions',
        code: 'SELF_PERMISSION_MODIFICATION_NOT_ALLOWED',
      };
    }

    return { allowed: true };
  }

  /**
   * Check delete permission
   *
   * Only owner can delete project
   */
  private async checkDeletePermission(
    userId: string,
    projectId: string,
    context?: PermissionContext,
  ): Promise<GuardPermissionResult> {
    const userRole = await this.getUserRole(userId, projectId);

    // Only PROJECT_ADMIN can delete projects
    if (!userRole || userRole !== 'PROJECT_ADMIN') {
      return {
        allowed: false,
        reason: GuardDenialReason.OWNER_ONLY,
        message: 'Only project admins can delete projects',
        code: 'DELETE_ADMIN_ONLY',
      };
    }

    // Require confirmation
    if (!context?.metadata?.confirmed) {
      return {
        allowed: false,
        reason: GuardDenialReason.WORKFLOW_VIOLATION,
        message: 'Project deletion requires confirmation',
        code: 'DELETION_CONFIRMATION_REQUIRED',
      };
    }

    // Cannot delete project with active data
    if (context?.metadata?.hasActiveData) {
      return {
        allowed: false,
        reason: GuardDenialReason.WORKFLOW_VIOLATION,
        message: 'Cannot delete project with active data',
        code: 'ACTIVE_DATA_EXISTS',
      };
    }

    return { allowed: true };
  }

  /**
   * Check configure permission
   *
   * Configure project structure (trades, areas, phases)
   */
  private async checkConfigurePermission(
    userId: string,
    projectId: string,
    context?: PermissionContext,
  ): Promise<GuardPermissionResult> {
    const userRole = await this.getUserRole(userId, projectId);

    if (!userRole || !['PROJECT_ADMIN', 'PROJECT_MANAGER'].includes(userRole)) {
      return {
        allowed: false,
        reason: GuardDenialReason.ADMIN_ONLY,
        message: 'Only project admins and managers can configure project structure',
        code: 'CONFIGURATION_PERMISSION_REQUIRED',
      };
    }

    // Structural changes after project start require admin
    if (context?.metadata?.projectStarted) {
      if (userRole !== 'PROJECT_ADMIN') {
        return {
          allowed: false,
          reason: GuardDenialReason.ADMIN_ONLY,
          message:
            'Only project admins can modify project structure after project has started',
          code: 'POST_START_CONFIGURATION_ADMIN_ONLY',
        };
      }
    }

    return { allowed: true };
  }
}
