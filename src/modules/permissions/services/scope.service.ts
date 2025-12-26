/**
 * Scope Service
 *
 * Handles scope-based access control for project resources
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { Project } from '../../projects/entities/project.entity';
import {
  UserScope,
  ResourceScope,
  ScopeMatchResult,
  ScopeValidationResult,
  ScopeOptions,
  ScopeOption,
  ScopeStatistics,
  ScopeUsageCounts,
} from '../types/scope.types';
import {
  matchesScope,
  validateScopeForRole,
  filterResourcesByScope,
  getScopeSummary,
  isScopeEmpty,
} from '../utils/scope-matching.util';
import {
  STANDARD_TRADES,
  STANDARD_PHASES,
  ScopeValidationRules,
  DEFAULT_SCOPE_VALIDATION_RULES,
} from '../constants/scope-config.constants';
import { ProjectRole } from '../../users/enums/project-role.enum';
import { InheritanceService } from './inheritance.service';

/**
 * Scope Service
 *
 * Provides scope-based access control:
 * - Scope matching (trades, areas, phases, tags)
 * - Resource filtering based on user scope
 * - Scope validation
 * - Scope options management
 * - Scope statistics and reporting
 */
@Injectable()
export class ScopeService {
  private readonly logger = new Logger(ScopeService.name);

  constructor(
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly inheritanceService: InheritanceService,
  ) {}

  /**
   * Check if user has scope access to a resource
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @param resourceId - Resource ID (for future use with resource-specific scope)
   * @param resourceScope - Resource's scope tags
   * @param resourceType - Type of resource
   * @returns true if user has access
   */
  async hasScopeAccess(
    userId: string,
    projectId: string,
    resourceScope: ResourceScope | null,
    resourceType: string = 'document',
  ): Promise<boolean> {
    try {
      // Get user's scope
      const userScope = await this.getUserScope(userId, projectId);

      // Check if user's role is inherited (inherited roles bypass scope)
      const roleResult = await this.inheritanceService.getEffectiveRole(
        userId,
        projectId,
      );

      if (roleResult.isInherited) {
        this.logger.debug(
          `User ${userId} has inherited role ${roleResult.effectiveRole}, bypassing scope check`,
        );
        return true;
      }

      // Match scope
      const matchResult = matchesScope(userScope, resourceScope, resourceType);

      if (!matchResult.hasAccess) {
        this.logger.debug(
          `Scope access denied for user ${userId} on ${resourceType}: ${matchResult.reason}`,
        );
      }

      return matchResult.hasAccess;
    } catch (error) {
      this.logger.error(
        `Error checking scope access for user ${userId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Check if user scope matches resource scope (with details)
   *
   * @param userScope - User's scope
   * @param resourceScope - Resource's scope
   * @param resourceType - Resource type
   * @returns Match result with details
   */
  matchesScope(
    userScope: UserScope | null,
    resourceScope: ResourceScope | null,
    resourceType: string = 'document',
  ): ScopeMatchResult {
    return matchesScope(userScope, resourceScope, resourceType);
  }

  /**
   * Get user's scope from project membership
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @returns User's scope or null
   */
  async getUserScope(
    userId: string,
    projectId: string,
  ): Promise<UserScope | null> {
    const membership = await this.projectMemberRepo.findOne({
      where: { userId, projectId },
    });

    if (!membership) {
      return null;
    }

    // Check if scope field exists and is valid
    if (!membership.scope) {
      return null;
    }

    // Handle both array and object scope formats for backward compatibility
    if (Array.isArray(membership.scope)) {
      // Old format: convert array to trades
      return {
        trades: membership.scope as string[],
      };
    }

    // New format: UserScope object
    return membership.scope as unknown as UserScope;
  }

  /**
   * Filter resources based on user scope
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @param resources - Resources to filter
   * @param getScopeFromResource - Function to extract scope from resource
   * @param resourceType - Resource type
   * @returns Filtered resources
   */
  async filterResourcesByScope<T>(
    userId: string,
    projectId: string,
    resources: T[],
    getScopeFromResource: (resource: T) => ResourceScope | null | undefined,
    resourceType: string = 'document',
  ): Promise<T[]> {
    // Check if user has inherited role (inherited roles bypass scope)
    const roleResult = await this.inheritanceService.getEffectiveRole(
      userId,
      projectId,
    );

    if (roleResult.isInherited) {
      this.logger.debug(
        `User ${userId} has inherited role, returning all resources`,
      );
      return resources;
    }

    // Get user's scope
    const userScope = await this.getUserScope(userId, projectId);

    // Filter resources
    return filterResourcesByScope(
      userScope,
      resources,
      getScopeFromResource,
      resourceType,
    );
  }

  /**
   * Validate scope for a role
   *
   * @param role - Project role
   * @param scope - Scope to validate
   * @param rules - Validation rules (optional)
   * @returns Validation result
   */
  validateScopeForRole(
    role: ProjectRole,
    scope: UserScope | null,
    rules?: ScopeValidationRules,
  ): ScopeValidationResult {
    return validateScopeForRole(
      role,
      scope,
      rules || DEFAULT_SCOPE_VALIDATION_RULES,
    );
  }

  /**
   * Get available scope options for a project
   *
   * @param projectId - Project ID
   * @returns Scope options with usage counts
   */
  async getProjectScopeOptions(projectId: string): Promise<ScopeOptions> {
    try {
      // Get usage counts
      const usageCounts = await this.getScopeUsageCounts(projectId);

      // Build trades options
      const trades: ScopeOption[] = STANDARD_TRADES.map((trade) => ({
        ...trade,
        usageCount: usageCounts.trades[trade.value] || 0,
      }));

      // Get project-specific areas (from project configuration)
      const project = await this.projectRepo.findOne({
        where: { id: projectId },
      });

      const areas: ScopeOption[] = [];
      // TODO: Load areas from project configuration or custom fields
      // For now, return empty array - this would be populated based on project structure

      // Build phases options
      const phases: ScopeOption[] = STANDARD_PHASES.map((phase) => ({
        ...phase,
        usageCount: usageCounts.phases[phase.value] || 0,
      }));

      // Get custom tags from actual usage
      const customTags = await this.getProjectCustomTags(projectId);
      const tags: ScopeOption[] = customTags.map((tag) => ({
        value: tag,
        label: tag,
        usageCount: usageCounts.tags[tag] || 0,
      }));

      return {
        trades,
        areas,
        phases,
        tags,
      };
    } catch (error) {
      this.logger.error(
        `Error getting scope options for project ${projectId}:`,
        error,
      );
      return {
        trades: STANDARD_TRADES.map((t) => ({ ...t, usageCount: 0 })),
        areas: [],
        phases: STANDARD_PHASES.map((p) => ({ ...p, usageCount: 0 })),
        tags: [],
      };
    }
  }

  /**
   * Get scope usage counts for a project
   *
   * @param projectId - Project ID
   * @returns Usage counts by dimension
   */
  async getScopeUsageCounts(projectId: string): Promise<ScopeUsageCounts> {
    const counts: ScopeUsageCounts = {
      trades: {},
      areas: {},
      phases: {},
      tags: {},
    };

    try {
      // Get all project members with scope
      const members = await this.projectMemberRepo.find({
        where: { projectId },
      });

      for (const member of members) {
        if (!member.scope) {
          continue;
        }

        const scope = Array.isArray(member.scope)
          ? { trades: member.scope }
          : (member.scope as unknown as UserScope);

        // Count trades
        if (scope.trades) {
          for (const trade of scope.trades) {
            counts.trades[trade] = (counts.trades[trade] || 0) + 1;
          }
        }

        // Count areas
        if (scope.areas) {
          for (const area of scope.areas) {
            counts.areas[area] = (counts.areas[area] || 0) + 1;
          }
        }

        // Count phases
        if (scope.phases) {
          for (const phase of scope.phases) {
            counts.phases[phase] = (counts.phases[phase] || 0) + 1;
          }
        }

        // Count tags
        if (scope.tags) {
          for (const tag of scope.tags) {
            counts.tags[tag] = (counts.tags[tag] || 0) + 1;
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Error getting scope usage counts for project ${projectId}:`,
        error,
      );
    }

    return counts;
  }

  /**
   * Get custom tags used in a project
   *
   * @param projectId - Project ID
   * @returns Array of unique custom tags
   */
  async getProjectCustomTags(projectId: string): Promise<string[]> {
    const tags = new Set<string>();

    try {
      const members = await this.projectMemberRepo.find({
        where: { projectId },
      });

      for (const member of members) {
        if (!member.scope) {
          continue;
        }

        const scope = Array.isArray(member.scope)
          ? null
          : (member.scope as unknown as UserScope);

        if (scope?.tags) {
          scope.tags.forEach((tag) => tags.add(tag));
        }
      }
    } catch (error) {
      this.logger.error(
        `Error getting custom tags for project ${projectId}:`,
        error,
      );
    }

    return Array.from(tags);
  }

  /**
   * Get scope statistics for a project
   *
   * @param projectId - Project ID
   * @returns Scope statistics
   */
  async getScopeStatistics(projectId: string): Promise<ScopeStatistics> {
    const usageCounts = await this.getScopeUsageCounts(projectId);

    const members = await this.projectMemberRepo.find({
      where: { projectId },
      relations: ['user'],
    });

    const scopedMembers = members.filter((m) => m.scope && !isScopeEmpty(m.scope as unknown as UserScope));

    // Calculate statistics
    const usersByScope = {
      trades: usageCounts.trades,
      areas: usageCounts.areas,
      phases: usageCounts.phases,
    };

    // TODO: Calculate resourcesByScope from actual resource usage
    const resourcesByScope = {
      trades: {},
      areas: {},
      phases: {},
    };

    return {
      projectId,
      totalScopedUsers: scopedMembers.length,
      totalScopedResources: 0, // TODO: Count from actual resources
      usersByScope,
      resourcesByScope,
      unmatchedScopes: {
        users: [], // TODO: Find users with no matching resources
        resources: [], // TODO: Find resources with no matching users
      },
    };
  }

  /**
   * Check if user can modify another user's scope
   *
   * @param targetUserId - User whose scope would be modified
   * @param projectId - Project ID
   * @param requestingUserId - User requesting the change
   * @returns true if allowed
   */
  async canModifyScope(
    targetUserId: string,
    projectId: string,
    requestingUserId: string,
  ): Promise<boolean> {
    try {
      // Check if requesting user has PROJECT_ADMIN role
      const requestingRole = await this.inheritanceService.getEffectiveRole(
        requestingUserId,
        projectId,
      );

      if (requestingRole.effectiveRole !== ProjectRole.PROJECT_ADMIN) {
        return false;
      }

      // Check if target user has inherited role (cannot modify scope for inherited roles)
      const targetRole = await this.inheritanceService.getEffectiveRole(
        targetUserId,
        projectId,
      );

      if (targetRole.isInherited) {
        this.logger.debug(
          `Cannot modify scope for user ${targetUserId} with inherited role`,
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Error checking scope modification permission:`,
        error,
      );
      return false;
    }
  }

  /**
   * Get scope summary for display
   *
   * @param scope - User scope
   * @returns Human-readable summary
   */
  getScopeSummary(scope: UserScope | null): string {
    return getScopeSummary(scope);
  }
}
