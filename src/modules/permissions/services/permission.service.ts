/**
 * Permission Service
 *
 * Core service for checking user permissions in projects
 * Implements caching, scope filtering, and role inheritance
 */

import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { OrganizationMember } from '../../organizations/entities/organization-member.entity';
import { Project } from '../../projects/entities/project.entity';
import { ProjectRole } from '../../users/enums/project-role.enum';
import { SystemRole } from '../../users/enums/system-role.enum';
import {
  Permission,
  PermissionCheckResult,
  PermissionDenialReason,
  PermissionMap,
  PermissionCache,
} from '../types/permission.types';
import {
  PROJECT_ROLE_PERMISSIONS,
  isScopeLimitedRole,
} from '../constants/role-permissions.matrix';
import {
  hasPermission as matchesPermission,
  hasAnyPermission as matchesAnyPermission,
  hasAllPermissions as matchesAllPermissions,
  createPermissionMap,
} from '../utils/permission-matcher.util';
import { checkScopeAccess } from '../utils/scope-matcher.util';
import { InheritanceService } from './inheritance.service';
import { ScopeService } from './scope.service';
import { ExpirationService } from './expiration.service';
import { ResourceScope } from '../types/scope.types';
import { ExpirationStatus } from '../types/expiration.types';

/**
 * Permission Service
 *
 * Provides permission checking with:
 * - Role-based permissions
 * - Organization role inheritance
 * - Scope-based filtering
 * - Expiration checking
 * - Aggressive caching (<10ms responses)
 */
@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  // In-memory cache (in production, use Redis)
  private permissionCache: Map<string, PermissionCache> = new Map();
  private readonly CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

  constructor(
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,
    @InjectRepository(OrganizationMember)
    private readonly organizationMemberRepo: Repository<OrganizationMember>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly inheritanceService: InheritanceService,
    @Inject(forwardRef(() => ScopeService))
    private readonly scopeService: ScopeService,
    @Inject(forwardRef(() => ExpirationService))
    private readonly expirationService: ExpirationService,
  ) {}

  /**
   * Check if user has a specific permission
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @param permission - Permission to check
   * @param resourceId - Optional resource ID for scope checking
   * @returns true if user has permission
   */
  async hasPermission(
    userId: string,
    projectId: string,
    permission: Permission,
    resourceId?: string,
  ): Promise<boolean> {
    const result = await this.checkPermission(
      userId,
      projectId,
      permission,
      resourceId,
    );
    return result.allowed;
  }

  /**
   * Check permission with detailed result
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @param permission - Permission to check
   * @param resourceId - Optional resource ID for scope checking
   * @returns Detailed permission check result
   */
  async checkPermission(
    userId: string,
    projectId: string,
    permission: Permission,
    resourceId?: string,
  ): Promise<PermissionCheckResult> {
    try {
      // Get user's permissions (cached)
      const cache = await this.getUserPermissionCache(userId, projectId);

      if (!cache) {
        return {
          allowed: false,
          reason: PermissionDenialReason.USER_NOT_MEMBER,
          required: permission,
          message: 'User is not a member of this project',
        };
      }

      // Check expiration using ExpirationService
      // This provides enhanced expiration checking with proper handling of inherited roles
      try {
        const expirationCheck = await this.expirationService.checkExpiration(
          userId,
          projectId,
        );

        if (expirationCheck.status === ExpirationStatus.EXPIRED) {
          return {
            allowed: false,
            reason: PermissionDenialReason.ACCESS_EXPIRED,
            required: permission,
            expiredAt: expirationCheck.expiresAt,
            message: `Your project access expired on ${expirationCheck.expiresAt?.toLocaleDateString()}`,
          };
        }
      } catch (error) {
        // If expiration check fails (e.g., user not found), continue with permission check
        // The cache already validated that user is a member
        this.logger.warn(
          `Expiration check failed for user ${userId} on project ${projectId}:`,
          error,
        );
      }

      // Check permission match
      const userPermissions = Array.from(cache.permissions);
      const hasMatch = matchesPermission(userPermissions, permission);

      if (!hasMatch) {
        return {
          allowed: false,
          reason: PermissionDenialReason.INSUFFICIENT_PERMISSIONS,
          required: permission,
          userRole: cache.effectiveRole || undefined,
          message: `Your role (${cache.effectiveRole}) does not have permission: ${permission}`,
        };
      }

      // If scope-limited role and resource provided, check scope
      if (
        cache.effectiveRole &&
        isScopeLimitedRole(cache.effectiveRole as ProjectRole) &&
        resourceId
      ) {
        // In real implementation, fetch resource scope from database
        // For now, we'll allow if user has scope
        if (!cache.scope || cache.scope.length === 0) {
          return {
            allowed: false,
            reason: PermissionDenialReason.SCOPE_RESTRICTION,
            required: permission,
            userScope: cache.scope || undefined,
            message: 'Your scope does not include access to this resource',
          };
        }
      }

      return {
        allowed: true,
      };
    } catch (error) {
      this.logger.error(
        `Error checking permission for user ${userId} on project ${projectId}:`,
        error,
      );
      return {
        allowed: false,
        reason: PermissionDenialReason.INSUFFICIENT_PERMISSIONS,
        required: permission,
        message: 'Error checking permissions',
      };
    }
  }

  /**
   * Check if user has ANY of the permissions
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @param permissions - Array of permissions (OR logic)
   * @returns true if user has at least one permission
   */
  async hasAnyPermission(
    userId: string,
    projectId: string,
    permissions: Permission[],
  ): Promise<boolean> {
    if (permissions.length === 0) {
      return false;
    }

    const cache = await this.getUserPermissionCache(userId, projectId);
    if (!cache) {
      return false;
    }

    // Check expiration using ExpirationService
    try {
      const expirationCheck = await this.expirationService.checkExpiration(
        userId,
        projectId,
      );

      if (expirationCheck.status === ExpirationStatus.EXPIRED) {
        return false;
      }
    } catch (error) {
      // If expiration check fails, log and continue
      this.logger.warn(
        `Expiration check failed for user ${userId} on project ${projectId}:`,
        error,
      );
    }

    const userPermissions = Array.from(cache.permissions);
    return matchesAnyPermission(userPermissions, permissions);
  }

  /**
   * Check if user has ALL of the permissions
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @param permissions - Array of permissions (AND logic)
   * @returns true if user has all permissions
   */
  async hasAllPermissions(
    userId: string,
    projectId: string,
    permissions: Permission[],
  ): Promise<boolean> {
    if (permissions.length === 0) {
      return true;
    }

    const cache = await this.getUserPermissionCache(userId, projectId);
    if (!cache) {
      return false;
    }

    // Check expiration using ExpirationService
    try {
      const expirationCheck = await this.expirationService.checkExpiration(
        userId,
        projectId,
      );

      if (expirationCheck.status === ExpirationStatus.EXPIRED) {
        return false;
      }
    } catch (error) {
      // If expiration check fails, log and continue
      this.logger.warn(
        `Expiration check failed for user ${userId} on project ${projectId}:`,
        error,
      );
    }

    const userPermissions = Array.from(cache.permissions);
    return matchesAllPermissions(userPermissions, permissions);
  }

  /**
   * Get all permissions for a user on a project
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @returns Array of permission strings
   */
  async getUserPermissions(
    userId: string,
    projectId: string,
  ): Promise<string[]> {
    const cache = await this.getUserPermissionCache(userId, projectId);
    if (!cache) {
      return [];
    }

    return Array.from(cache.permissions);
  }

  /**
   * Get effective role (considering inheritance)
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @returns Effective ProjectRole or null
   */
  async getEffectiveRole(
    userId: string,
    projectId: string,
  ): Promise<ProjectRole | null> {
    const cache = await this.getUserPermissionCache(userId, projectId);
    if (!cache) {
      return null;
    }

    return cache.effectiveRole as ProjectRole | null;
  }

  /**
   * Check if permission is scope-limited and validate scope
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @param resourceId - Resource ID (for future use)
   * @param resourceScope - Resource's scope tags (old format for backward compatibility)
   * @returns true if user has scope access
   * @deprecated Use scopeService.hasScopeAccess with ResourceScope type instead
   */
  async checkScopeAccess(
    userId: string,
    projectId: string,
    resourceId: string,
    resourceScope: string[] | Record<string, string[]>,
  ): Promise<boolean> {
    const cache = await this.getUserPermissionCache(userId, projectId);
    if (!cache) {
      return false;
    }

    // Check expiration
    if (cache.expiresAt && cache.expiresAt < new Date()) {
      return false;
    }

    // Only scope-limited roles need scope checking
    if (
      !cache.effectiveRole ||
      !isScopeLimitedRole(cache.effectiveRole as ProjectRole)
    ) {
      return true; // Non-scope-limited roles have full access
    }

    // Use old scope matching for backward compatibility
    const result = checkScopeAccess(cache.scope || null, resourceScope);
    return result.hasAccess;
  }

  /**
   * Check scope access with new enhanced scope types
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @param resourceScope - Resource's scope (new format)
   * @param resourceType - Type of resource
   * @returns true if user has scope access
   */
  async checkEnhancedScopeAccess(
    userId: string,
    projectId: string,
    resourceScope: ResourceScope | null,
    resourceType: string = 'document',
  ): Promise<boolean> {
    return this.scopeService.hasScopeAccess(
      userId,
      projectId,
      resourceScope,
      resourceType,
    );
  }

  /**
   * Bulk permission check for UI
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @param permissions - Array of permissions to check
   * @returns Map of permission -> boolean
   */
  async getUserPermissionMap(
    userId: string,
    projectId: string,
    permissions: Permission[],
  ): Promise<PermissionMap> {
    const cache = await this.getUserPermissionCache(userId, projectId);
    if (!cache) {
      // Return all false
      return permissions.reduce((map, perm) => {
        map[perm] = false;
        return map;
      }, {} as PermissionMap);
    }

    // Check expiration using ExpirationService
    try {
      const expirationCheck = await this.expirationService.checkExpiration(
        userId,
        projectId,
      );

      if (expirationCheck.status === ExpirationStatus.EXPIRED) {
        return permissions.reduce((map, perm) => {
          map[perm] = false;
          return map;
        }, {} as PermissionMap);
      }
    } catch (error) {
      // If expiration check fails, log and continue
      this.logger.warn(
        `Expiration check failed for user ${userId} on project ${projectId}:`,
        error,
      );
    }

    const userPermissions = Array.from(cache.permissions);
    return createPermissionMap(userPermissions, permissions);
  }

  /**
   * Clear permission cache for user/project
   *
   * @param userId - User ID
   * @param projectId - Optional project ID (clears all if not provided)
   */
  async clearPermissionCache(
    userId: string,
    projectId?: string,
  ): Promise<void> {
    if (projectId) {
      const cacheKey = this.getCacheKey(userId, projectId);
      this.permissionCache.delete(cacheKey);
      this.logger.debug(
        `Cleared permission cache for user ${userId} on project ${projectId}`,
      );
    } else {
      // Clear all cache entries for this user
      const keysToDelete: string[] = [];
      for (const key of this.permissionCache.keys()) {
        if (key.startsWith(`${userId}:`)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.permissionCache.delete(key));
      this.logger.debug(
        `Cleared all permission cache for user ${userId} (${keysToDelete.length} entries)`,
      );
    }
  }

  /**
   * Check if user is system admin (bypasses all checks)
   *
   * @param userId - User ID
   * @returns true if user is system admin
   */
  async isSystemAdmin(userId: string): Promise<boolean> {
    // In real implementation, fetch user's system role
    // For now, return false
    // TODO: Implement system role check
    return false;
  }

  /**
   * Get or build user permission cache
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @returns Permission cache or null if user not member
   */
  private async getUserPermissionCache(
    userId: string,
    projectId: string,
  ): Promise<PermissionCache | null> {
    const cacheKey = this.getCacheKey(userId, projectId);

    // Check cache
    const cached = this.permissionCache.get(cacheKey);
    if (cached && cached.cacheExpiresAt > new Date()) {
      return cached;
    }

    // Build cache from database
    const cache = await this.buildPermissionCache(userId, projectId);
    if (!cache) {
      return null;
    }

    // Store in cache
    this.permissionCache.set(cacheKey, cache);

    return cache;
  }

  /**
   * Build permission cache from database using InheritanceService
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @returns Permission cache or null
   */
  private async buildPermissionCache(
    userId: string,
    projectId: string,
  ): Promise<PermissionCache | null> {
    // Use InheritanceService to get effective role
    const roleResult = await this.inheritanceService.getEffectiveRole(
      userId,
      projectId,
    );

    if (!roleResult.effectiveRole) {
      return null; // No access
    }

    // Get scope and expiration for explicit project members only
    let scope: string[] | null = null;
    let expiresAt: Date | null = null;

    if (roleResult.source === 'explicit') {
      // Get scope and expiration from ProjectMember
      const projectMember = await this.projectMemberRepo.findOne({
        where: { userId, projectId },
      });

      if (projectMember) {
        scope = Array.isArray(projectMember.scope)
          ? projectMember.scope
          : null;
        expiresAt = projectMember.expiresAt || null;
      }
    }
    // Inherited roles don't have scope or expiration

    // Get permissions for role
    const rolePermissions = PROJECT_ROLE_PERMISSIONS[roleResult.effectiveRole] || [];

    const now = new Date();
    const cacheExpiresAt = new Date(now.getTime() + this.CACHE_TTL_MS);

    return {
      userId,
      projectId,
      permissions: new Set(rolePermissions),
      effectiveRole: roleResult.effectiveRole,
      scope,
      expiresAt,
      cachedAt: now,
      cacheExpiresAt,
    };
  }

  /**
   * Generate cache key
   */
  private getCacheKey(userId: string, projectId: string): string {
    return `${userId}:${projectId}`;
  }

  /**
   * Clean expired cache entries (should be run periodically)
   */
  async cleanExpiredCache(): Promise<number> {
    const now = new Date();
    let cleaned = 0;

    for (const [key, cache] of this.permissionCache.entries()) {
      if (cache.cacheExpiresAt < now) {
        this.permissionCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned ${cleaned} expired cache entries`);
    }

    return cleaned;
  }
}
