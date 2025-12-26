/**
 * Base Permission Guard
 *
 * Abstract base class for all permission guards
 * Provides common permission checking logic with caching and audit logging
 */

import { Logger, ForbiddenException } from '@nestjs/common';
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
import { Permission } from '../types/permission.types';
import { ExpirationStatus } from '../types/expiration.types';

/**
 * Abstract base guard for permission checking
 *
 * All feature-specific guards extend this class and implement:
 * - checkPermission() - Core permission logic
 * - getFeatureName() - Feature name for logging
 */
export abstract class BasePermissionGuard {
  protected readonly logger: Logger;

  constructor(
    protected readonly permissionService: PermissionService,
    protected readonly scopeService: ScopeService,
    protected readonly expirationService: ExpirationService,
    protected readonly auditService: AuditService,
    protected readonly guardCacheService: GuardCacheService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Abstract method: Check permission for specific action
   *
   * Implemented by feature-specific guards to handle their specific logic
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @param action - Action being performed
   * @param resourceId - Optional resource ID
   * @param context - Additional context for permission check
   * @returns Permission result
   */
  protected abstract checkPermission(
    userId: string,
    projectId: string,
    action: string,
    resourceId?: string,
    context?: PermissionContext,
  ): Promise<GuardPermissionResult>;

  /**
   * Abstract method: Get feature name
   *
   * @returns Feature name (e.g., 'documents', 'rfis')
   */
  protected abstract getFeatureName(): string;

  /**
   * Enforce permission check
   *
   * Main entry point for guards - checks permission and throws exception if denied
   * Uses caching for performance (<10ms for cached checks)
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @param action - Action being performed
   * @param resourceId - Optional resource ID
   * @param context - Additional context
   * @throws ForbiddenException if permission denied
   */
  async enforcePermission(
    userId: string,
    projectId: string,
    action: string,
    resourceId?: string,
    context?: PermissionContext,
  ): Promise<void> {
    // Check cache first
    const cached = this.guardCacheService.get(
      userId,
      projectId,
      action,
      resourceId,
    );

    if (cached !== null) {
      // Cache hit
      if (!cached) {
        // Cached denial - throw exception
        throw new ForbiddenException({
          error: 'Permission Denied',
          message: 'You do not have permission to perform this action (cached)',
          code: 'PERMISSION_DENIED_CACHED',
          details: {
            action,
            resourceId,
          },
        });
      }
      // Cached approval - return immediately
      return;
    }

    // Cache miss - perform full check
    const result = await this.checkPermission(
      userId,
      projectId,
      action,
      resourceId,
      context,
    );

    // Cache the result
    this.guardCacheService.set(
      userId,
      projectId,
      action,
      result.allowed,
      resourceId,
    );

    if (!result.allowed) {
      // Log denial to audit service
      await this.logPermissionDenial(
        userId,
        projectId,
        action,
        resourceId,
        result,
      );

      // Throw exception with detailed error
      throw new ForbiddenException({
        error: 'Permission Denied',
        message: result.message || 'You do not have permission to perform this action',
        code: result.code || 'PERMISSION_DENIED',
        details: {
          action,
          reason: result.reason,
          requiredPermission: result.requiredPermission,
          userRole: result.userRole,
          resourceId,
          metadata: result.metadata,
        },
      });
    }
  }

  /**
   * Check basic role-based permission
   *
   * Helper method for checking if user has a permission
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @param permission - Permission string
   * @returns Permission result
   */
  protected async checkBasicPermission(
    userId: string,
    projectId: string,
    permission: Permission,
  ): Promise<GuardPermissionResult> {
    const result = await this.permissionService.checkPermission(
      userId,
      projectId,
      permission,
    );

    if (!result.allowed) {
      return {
        allowed: false,
        reason: result.reason as GuardDenialReason,
        message: result.message,
        requiredPermission: permission,
        userRole: result.userRole,
      };
    }

    return { allowed: true };
  }

  /**
   * Check if access has expired
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @returns Permission result
   */
  protected async checkExpiration(
    userId: string,
    projectId: string,
  ): Promise<GuardPermissionResult> {
    try {
      const expirationCheck = await this.expirationService.checkExpiration(
        userId,
        projectId,
      );

      if (expirationCheck.status === ExpirationStatus.EXPIRED) {
        return {
          allowed: false,
          reason: GuardDenialReason.ACCESS_EXPIRED,
          message: `Your access expired on ${expirationCheck.expiresAt?.toLocaleDateString()}`,
          code: 'ACCESS_EXPIRED',
        };
      }

      return { allowed: true };
    } catch (error) {
      this.logger.warn(
        `Expiration check failed for user ${userId} on project ${projectId}:`,
        error,
      );
      return { allowed: true }; // Don't block if expiration check fails
    }
  }

  /**
   * Check if user has scope access to resource
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @param resourceId - Resource ID
   * @param resourceScope - Resource scope (if known)
   * @returns Permission result
   */
  protected async checkScopeAccess(
    userId: string,
    projectId: string,
    resourceId: string,
    resourceScope?: any,
  ): Promise<GuardPermissionResult> {
    try {
      // If resource scope provided, check directly
      if (resourceScope !== undefined) {
        const hasAccess = await this.scopeService.hasScopeAccess(
          userId,
          projectId,
          resourceScope,
          this.getFeatureName(),
        );

        if (!hasAccess) {
          return {
            allowed: false,
            reason: GuardDenialReason.SCOPE_RESTRICTION,
            message: 'Your scope does not include access to this resource',
            code: 'SCOPE_RESTRICTED',
          };
        }
      }

      return { allowed: true };
    } catch (error) {
      this.logger.error(
        `Scope check failed for user ${userId} on resource ${resourceId}:`,
        error,
      );
      return { allowed: true }; // Don't block if scope check fails
    }
  }

  /**
   * Check if user is assigned to a resource
   *
   * @param userId - User ID
   * @param assignedTo - Array of assigned user IDs
   * @returns Permission result
   */
  protected checkAssignment(
    userId: string,
    assignedTo: string[],
  ): GuardPermissionResult {
    if (!assignedTo.includes(userId)) {
      return {
        allowed: false,
        reason: GuardDenialReason.NOT_ASSIGNED,
        message: 'You are not assigned to this resource',
        code: 'NOT_ASSIGNED',
      };
    }

    return { allowed: true };
  }

  /**
   * Check if resource is in valid status for action
   *
   * @param currentStatus - Current status
   * @param validStatuses - Array of valid statuses
   * @param action - Action being performed
   * @returns Permission result
   */
  protected checkValidStatus(
    currentStatus: string,
    validStatuses: string[],
    action: string,
  ): GuardPermissionResult {
    if (!validStatuses.includes(currentStatus)) {
      return {
        allowed: false,
        reason: GuardDenialReason.INVALID_STATUS,
        message: `Cannot ${action} when status is ${currentStatus}`,
        code: 'INVALID_STATUS',
        metadata: {
          currentStatus,
          validStatuses,
        },
      };
    }

    return { allowed: true };
  }

  /**
   * Get user's effective role
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @returns User's effective role or null
   */
  protected async getUserRole(
    userId: string,
    projectId: string,
  ): Promise<string | null> {
    try {
      const role = await this.permissionService.getEffectiveRole(
        userId,
        projectId,
      );
      return role;
    } catch (error) {
      this.logger.error(
        `Failed to get role for user ${userId} on project ${projectId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Log permission denial to audit service
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @param action - Action attempted
   * @param resourceId - Optional resource ID
   * @param result - Permission result
   */
  private async logPermissionDenial(
    userId: string,
    projectId: string,
    action: string,
    resourceId: string | undefined,
    result: GuardPermissionResult,
  ): Promise<void> {
    try {
      await this.auditService.logPermissionDenial({
        userId,
        projectId,
        action,
        resourceType: this.getFeatureName(),
        resourceId,
        reason: result.reason || GuardDenialReason.INSUFFICIENT_PERMISSIONS,
        message: result.message || 'Permission denied',
        timestamp: new Date(),
        metadata: result.metadata,
      });
    } catch (error) {
      this.logger.error('Failed to log permission denial:', error);
    }
  }
}
