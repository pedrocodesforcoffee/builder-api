/**
 * Document Guard
 *
 * Handles permission checking for document operations
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
 * Document Guard
 *
 * Protects document operations:
 * - create: Create new documents
 * - read: View documents
 * - update: Edit document metadata/content
 * - delete: Delete documents
 * - approve: Approve documents for distribution
 * - export: Export documents
 * - version: Create new document versions
 */
@Injectable()
export class DocumentGuard extends BasePermissionGuard {
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
    return 'documents';
  }

  /**
   * Check permission for document action
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @param action - Action (create, read, update, delete, approve, export, version)
   * @param resourceId - Document ID
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
    const documentType = context?.resourceType || 'document';
    const permission = `documents:${documentType}:${action}`;

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
    if (resourceId && context?.metadata?.documentScope) {
      const scopeResult = await this.checkScopeAccess(
        userId,
        projectId,
        resourceId,
        context.metadata.documentScope,
      );

      if (!scopeResult.allowed) {
        return scopeResult;
      }
    }

    // Additional checks for specific actions
    switch (action) {
      case 'approve':
        return this.checkApprovePermission(userId, projectId, context);

      case 'delete':
        return this.checkDeletePermission(userId, projectId, context);

      case 'export':
        return this.checkExportPermission(userId, projectId, context);

      default:
        return { allowed: true };
    }
  }

  /**
   * Check approve permission
   *
   * Approval may require admin role or specific approval permission
   */
  private async checkApprovePermission(
    userId: string,
    projectId: string,
    context?: PermissionContext,
  ): Promise<GuardPermissionResult> {
    // If document requires owner approval and user is not owner
    if (
      context?.metadata?.requiresOwnerApproval &&
      context?.resourceOwnerId !== userId
    ) {
      const userRole = await this.getUserRole(userId, projectId);

      // Only admins can approve documents requiring owner approval
      if (!userRole || !['PROJECT_ADMIN', 'PROJECT_MANAGER'].includes(userRole)) {
        return {
          allowed: false,
          reason: GuardDenialReason.ADMIN_ONLY,
          message: 'Only project admins can approve this document',
          code: 'ADMIN_APPROVAL_REQUIRED',
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check delete permission
   *
   * May require ownership or admin role
   */
  private async checkDeletePermission(
    userId: string,
    projectId: string,
    context?: PermissionContext,
  ): Promise<GuardPermissionResult> {
    // If document is owned by user, allow deletion
    if (context?.resourceOwnerId === userId) {
      return { allowed: true };
    }

    // Otherwise, require admin role
    const userRole = await this.getUserRole(userId, projectId);
    if (!userRole || !['PROJECT_ADMIN', 'PROJECT_MANAGER'].includes(userRole)) {
      return {
        allowed: false,
        reason: GuardDenialReason.INSUFFICIENT_PERMISSIONS,
        message: 'Only document owner or project admins can delete documents',
        code: 'DELETE_PERMISSION_REQUIRED',
      };
    }

    return { allowed: true };
  }

  /**
   * Check export permission
   *
   * Export may be restricted based on document classification
   */
  private async checkExportPermission(
    userId: string,
    projectId: string,
    context?: PermissionContext,
  ): Promise<GuardPermissionResult> {
    // If document is confidential, require admin role
    if (context?.metadata?.isConfidential) {
      const userRole = await this.getUserRole(userId, projectId);

      if (!userRole || !['PROJECT_ADMIN', 'PROJECT_MANAGER'].includes(userRole)) {
        return {
          allowed: false,
          reason: GuardDenialReason.INSUFFICIENT_PERMISSIONS,
          message: 'Only admins can export confidential documents',
          code: 'CONFIDENTIAL_EXPORT_RESTRICTED',
        };
      }
    }

    return { allowed: true };
  }
}
