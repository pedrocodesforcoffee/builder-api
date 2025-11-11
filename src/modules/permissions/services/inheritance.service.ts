/**
 * Inheritance Service
 *
 * Handles role inheritance from organization-level to project-level.
 * Implements the role resolution hierarchy:
 * 1. System Admin (highest priority)
 * 2. Organization OWNER (inherits PROJECT_ADMIN)
 * 3. Organization ORG_ADMIN (inherits PROJECT_ADMIN)
 * 4. Explicit Project Membership
 * 5. No Access
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Project } from '../../projects/entities/project.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { OrganizationMember } from '../../organizations/entities/organization-member.entity';
import { ProjectRole } from '../../users/enums/project-role.enum';
import { OrganizationRole } from '../../users/enums/organization-role.enum';
import {
  EffectiveRoleResult,
  InheritanceChain,
  InheritanceStep,
  ProjectAccess,
  RoleChangeValidation,
  ProjectMemberWithInheritance,
  InheritanceCache,
  RoleSource,
} from '../types/inheritance.types';

/**
 * Service for handling role inheritance logic
 */
@Injectable()
export class InheritanceService {
  private readonly logger = new Logger(InheritanceService.name);
  private readonly inheritanceCache: Map<string, InheritanceCache> = new Map();
  private readonly CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,
    @InjectRepository(OrganizationMember)
    private readonly organizationMemberRepo: Repository<OrganizationMember>,
  ) {}

  /**
   * Get effective role for a user on a project
   *
   * Implements the inheritance hierarchy:
   * 1. System Admin → PROJECT_ADMIN (bypasses all checks)
   * 2. Org OWNER → PROJECT_ADMIN (inherited)
   * 3. Org ORG_ADMIN → PROJECT_ADMIN (inherited)
   * 4. Explicit ProjectMembership → assigned role
   * 5. No membership → null
   *
   * @param userId - User to check
   * @param projectId - Project to check access for
   * @returns Effective role with inheritance information
   */
  async getEffectiveRole(
    userId: string,
    projectId: string,
  ): Promise<EffectiveRoleResult> {
    // Check cache first
    const cached = this.getCachedRole(userId, projectId);
    if (cached) {
      return {
        effectiveRole: cached.effectiveRole,
        source: cached.source,
        isInherited: cached.isInherited,
        organizationRole: cached.organizationRole,
        organizationId: cached.organizationId,
      };
    }

    // Step 1: Check System Admin (highest priority)
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      return this.buildResult(null, 'none', false);
    }

    if (user.isSystemAdmin()) {
      this.logger.debug(`User ${userId} is system admin, granting PROJECT_ADMIN`);
      const result = this.buildResult(ProjectRole.PROJECT_ADMIN, 'system_admin', true);
      this.cacheResult(userId, projectId, result, ''); // No org for system admin
      return result;
    }

    // Step 2: Get project's organization
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: ['organization'],
    });

    if (!project) {
      this.logger.debug(`Project ${projectId} not found`);
      return this.buildResult(null, 'none', false);
    }

    const organizationId = project.organizationId;

    // Step 3: Check organization membership
    const orgMembership = await this.organizationMemberRepo.findOne({
      where: {
        userId,
        organizationId,
      },
    });

    // Step 4: Check for ORG OWNER inheritance
    if (orgMembership?.role === OrganizationRole.OWNER) {
      this.logger.debug(
        `User ${userId} is org OWNER, inheriting PROJECT_ADMIN on project ${projectId}`,
      );
      const result = this.buildResult(
        ProjectRole.PROJECT_ADMIN,
        'org_owner',
        true,
        organizationId,
        project.organization?.name,
        OrganizationRole.OWNER,
      );
      this.cacheResult(userId, projectId, result, organizationId);
      return result;
    }

    // Step 5: Check for ORG_ADMIN inheritance
    if (orgMembership?.role === OrganizationRole.ORG_ADMIN) {
      this.logger.debug(
        `User ${userId} is org ORG_ADMIN, inheriting PROJECT_ADMIN on project ${projectId}`,
      );
      const result = this.buildResult(
        ProjectRole.PROJECT_ADMIN,
        'org_admin',
        true,
        organizationId,
        project.organization?.name,
        OrganizationRole.ORG_ADMIN,
      );
      this.cacheResult(userId, projectId, result, organizationId);
      return result;
    }

    // Step 6: Check explicit project membership
    const projectMembership = await this.projectMemberRepo.findOne({
      where: {
        userId,
        projectId,
      },
    });

    if (projectMembership) {
      // Check if expired
      if (
        projectMembership.expiresAt &&
        projectMembership.expiresAt < new Date()
      ) {
        this.logger.debug(
          `User ${userId} project membership on ${projectId} expired at ${projectMembership.expiresAt}`,
        );
        const result = this.buildResult(null, 'none', false, organizationId);
        this.cacheResult(userId, projectId, result, organizationId);
        return result;
      }

      this.logger.debug(
        `User ${userId} has explicit ${projectMembership.role} role on project ${projectId}`,
      );
      const result = this.buildResult(
        projectMembership.role,
        'explicit',
        false,
        organizationId,
        project.organization?.name,
        orgMembership?.role,
        projectMembership.role,
      );
      this.cacheResult(userId, projectId, result, organizationId);
      return result;
    }

    // Step 7: No access
    this.logger.debug(`User ${userId} has no access to project ${projectId}`);
    const result = this.buildResult(null, 'none', false, organizationId);
    this.cacheResult(userId, projectId, result, organizationId);
    return result;
  }

  /**
   * Check if user has inherited access to a project
   *
   * @param userId - User to check
   * @param projectId - Project to check
   * @returns True if user has inherited access
   */
  async hasInheritedAccess(
    userId: string,
    projectId: string,
  ): Promise<boolean> {
    const result = await this.getEffectiveRole(userId, projectId);
    return result.isInherited && result.effectiveRole !== null;
  }

  /**
   * Get inheritance chain showing how user got their permissions
   *
   * @param userId - User to check
   * @param projectId - Project to check
   * @returns Complete inheritance chain
   */
  async getInheritanceChain(
    userId: string,
    projectId: string,
  ): Promise<InheritanceChain> {
    const result = await this.getEffectiveRole(userId, projectId);
    const steps: InheritanceStep[] = [];

    if (result.source === 'system_admin') {
      steps.push({
        level: 1,
        type: 'system_admin',
        role: 'SYSTEM_ADMIN',
        source: 'User.systemRole',
        description: 'System administrator with complete platform access',
      });
    } else if (result.source === 'org_owner' || result.source === 'org_admin') {
      const orgRole =
        result.source === 'org_owner'
          ? OrganizationRole.OWNER
          : OrganizationRole.ORG_ADMIN;
      const orgRoleDisplay = orgRole === OrganizationRole.OWNER ? 'OWNER' : 'ORG_ADMIN';

      steps.push({
        level: 1,
        type: 'organization',
        role: orgRoleDisplay,
        source: 'OrganizationMember',
        description: `Organization ${orgRole.toLowerCase()} of "${result.organizationName || 'Unknown'}"`,
      });

      steps.push({
        level: 2,
        type: 'project',
        role: 'PROJECT_ADMIN',
        source: 'Inheritance',
        description: `Inherited PROJECT_ADMIN from organization ${orgRoleDisplay} role`,
      });
    } else if (result.source === 'explicit') {
      if (result.organizationRole) {
        steps.push({
          level: 1,
          type: 'organization',
          role: result.organizationRole.toUpperCase(),
          source: 'OrganizationMember',
          description: `Organization member of "${result.organizationName || 'Unknown'}"`,
        });
      }

      steps.push({
        level: result.organizationRole ? 2 : 1,
        type: 'project',
        role: result.projectRole?.toUpperCase() || 'UNKNOWN',
        source: 'ProjectMember',
        description: `Explicitly assigned as ${result.projectRole?.toUpperCase() || 'UNKNOWN'}`,
      });
    }

    return {
      userId,
      projectId,
      steps,
      finalRole: result.effectiveRole,
      hasAccess: result.effectiveRole !== null,
    };
  }

  /**
   * Get all projects a user has access to (including inherited)
   *
   * @param userId - User to check
   * @param organizationId - Optional: filter by organization
   * @returns List of accessible projects with access details
   */
  async getUserAccessibleProjects(
    userId: string,
    organizationId?: string,
  ): Promise<ProjectAccess[]> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      return [];
    }

    const accessList: ProjectAccess[] = [];

    // If system admin, return all projects
    if (user.isSystemAdmin()) {
      const whereClause = organizationId ? { organizationId } : {};
      const projects = await this.projectRepo.find({
        where: whereClause,
        relations: ['organization'],
      });

      return projects.map((project) => ({
        projectId: project.id,
        projectName: project.name,
        organizationId: project.organizationId,
        organizationName: project.organization?.name || 'Unknown',
        role: ProjectRole.PROJECT_ADMIN,
        source: 'system_admin' as RoleSource,
        isInherited: true,
      }));
    }

    // Get user's organization memberships
    const orgMemberships = organizationId
      ? await this.organizationMemberRepo.find({
          where: { userId, organizationId },
          relations: ['organization'],
        })
      : await this.organizationMemberRepo.find({
          where: { userId },
          relations: ['organization'],
        });

    // For each org where user is OWNER or ORG_ADMIN, add all projects
    for (const orgMembership of orgMemberships) {
      if (
        orgMembership.role === OrganizationRole.OWNER ||
        orgMembership.role === OrganizationRole.ORG_ADMIN
      ) {
        const projects = await this.projectRepo.find({
          where: { organizationId: orgMembership.organizationId },
          relations: ['organization'],
        });

        for (const project of projects) {
          accessList.push({
            projectId: project.id,
            projectName: project.name,
            organizationId: project.organizationId,
            organizationName: project.organization?.name || 'Unknown',
            role: ProjectRole.PROJECT_ADMIN,
            source:
              orgMembership.role === OrganizationRole.OWNER
                ? 'org_owner'
                : 'org_admin',
            isInherited: true,
          });
        }
      }
    }

    // Get explicit project memberships
    const projectMemberships = await this.projectMemberRepo.find({
      where: { userId },
      relations: ['project', 'project.organization'],
    });

    for (const membership of projectMemberships) {
      // Skip if expired
      if (membership.expiresAt && membership.expiresAt < new Date()) {
        continue;
      }

      // Skip if already added via inheritance (inherited always wins)
      const alreadyAdded = accessList.find(
        (access) => access.projectId === membership.projectId,
      );
      if (alreadyAdded) {
        continue;
      }

      // Filter by organizationId if provided
      if (organizationId && membership.project.organizationId !== organizationId) {
        continue;
      }

      accessList.push({
        projectId: membership.projectId,
        projectName: membership.project.name,
        organizationId: membership.project.organizationId,
        organizationName: membership.project.organization?.name || 'Unknown',
        role: membership.role,
        source: 'explicit',
        isInherited: false,
        scope: membership.scope,
        expiresAt: membership.expiresAt || undefined,
      });
    }

    return accessList;
  }

  /**
   * Check if a role change is allowed
   *
   * Cannot change roles for:
   * - System admins
   * - Organization owners (on their org projects)
   * - Organization admins (on their org projects)
   *
   * @param targetUserId - User whose role would be changed
   * @param projectId - Project where role would be changed
   * @param newRole - New role to assign
   * @param requestingUserId - User requesting the change
   * @returns Validation result
   */
  async canChangeProjectRole(
    targetUserId: string,
    projectId: string,
    newRole: ProjectRole,
    requestingUserId: string,
  ): Promise<RoleChangeValidation> {
    const targetRole = await this.getEffectiveRole(targetUserId, projectId);

    // Cannot change role for system admins
    if (targetRole.source === 'system_admin') {
      return {
        allowed: false,
        reason: 'Cannot change role for system administrators',
        currentRole: targetRole.effectiveRole || undefined,
        currentSource: targetRole.source,
      };
    }

    // Cannot change role for org owners
    if (targetRole.source === 'org_owner') {
      return {
        allowed: false,
        reason:
          'Cannot change role for organization owners. They automatically have PROJECT_ADMIN access to all organization projects.',
        currentRole: targetRole.effectiveRole || undefined,
        currentSource: targetRole.source,
      };
    }

    // Cannot change role for org admins
    if (targetRole.source === 'org_admin') {
      return {
        allowed: false,
        reason:
          'Cannot change role for organization admins. They automatically have PROJECT_ADMIN access to all organization projects.',
        currentRole: targetRole.effectiveRole || undefined,
        currentSource: targetRole.source,
      };
    }

    // Can only change explicit roles
    if (targetRole.source !== 'explicit') {
      return {
        allowed: false,
        reason: 'User does not have explicit project membership',
        currentRole: targetRole.effectiveRole || undefined,
        currentSource: targetRole.source,
      };
    }

    // Check if requesting user has permission to change roles
    // (This would integrate with PermissionService in a real implementation)
    const requestingRole = await this.getEffectiveRole(requestingUserId, projectId);
    if (requestingRole.effectiveRole !== ProjectRole.PROJECT_ADMIN) {
      return {
        allowed: false,
        reason: 'You must be a PROJECT_ADMIN to change user roles',
        currentRole: targetRole.effectiveRole || undefined,
        currentSource: targetRole.source,
      };
    }

    return {
      allowed: true,
      currentRole: targetRole.effectiveRole || undefined,
      currentSource: targetRole.source,
    };
  }

  /**
   * Get all members of a project (including inherited)
   *
   * @param projectId - Project to get members for
   * @param includeInherited - Whether to include inherited members
   * @returns List of project members with inheritance info
   */
  async getProjectMembers(
    projectId: string,
    includeInherited: boolean = true,
  ): Promise<ProjectMemberWithInheritance[]> {
    const members: ProjectMemberWithInheritance[] = [];

    // Get project's organization
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: ['organization'],
    });

    if (!project) {
      return [];
    }

    if (includeInherited) {
      // Get all system admins
      const systemAdmins = await this.userRepo.find({
        where: { systemRole: 'system_admin' },
      });

      for (const admin of systemAdmins) {
        members.push({
          userId: admin.id,
          userName: admin.fullName,
          userEmail: admin.email,
          role: ProjectRole.PROJECT_ADMIN,
          source: 'system_admin',
          isInherited: true,
        });
      }

      // Get all org owners and admins
      const orgMembers = await this.organizationMemberRepo.find({
        where: {
          organizationId: project.organizationId,
          role: In([OrganizationRole.OWNER, OrganizationRole.ORG_ADMIN]),
        },
        relations: ['user'],
      });

      for (const orgMember of orgMembers) {
        // Skip if already added as system admin
        if (members.find((m) => m.userId === orgMember.userId)) {
          continue;
        }

        members.push({
          userId: orgMember.userId,
          userName: orgMember.user.fullName,
          userEmail: orgMember.user.email,
          role: ProjectRole.PROJECT_ADMIN,
          source:
            orgMember.role === OrganizationRole.OWNER ? 'org_owner' : 'org_admin',
          isInherited: true,
          organizationRole: orgMember.role,
        });
      }
    }

    // Get explicit project members
    const projectMembers = await this.projectMemberRepo.find({
      where: { projectId },
      relations: ['user'],
    });

    for (const projectMember of projectMembers) {
      // Skip expired memberships
      if (projectMember.expiresAt && projectMember.expiresAt < new Date()) {
        continue;
      }

      // Check if user already has inherited access
      const existingMember = members.find((m) => m.userId === projectMember.userId);
      if (existingMember) {
        // User has inherited admin access, don't show explicit role
        continue;
      }

      members.push({
        userId: projectMember.userId,
        userName: projectMember.user.fullName,
        userEmail: projectMember.user.email,
        role: projectMember.role,
        source: 'explicit',
        isInherited: false,
        scope: projectMember.scope,
        expiresAt: projectMember.expiresAt || undefined,
        addedAt: projectMember.createdAt,
      });
    }

    return members;
  }

  /**
   * Clear inheritance cache for a user
   *
   * @param userId - User to clear cache for
   * @param projectId - Optional: clear cache for specific project only
   */
  async clearInheritanceCache(userId: string, projectId?: string): Promise<void> {
    if (projectId) {
      const cacheKey = this.getCacheKey(userId, projectId);
      this.inheritanceCache.delete(cacheKey);
      this.logger.debug(`Cleared inheritance cache for user ${userId}, project ${projectId}`);
    } else {
      // Clear all caches for this user
      const keysToDelete: string[] = [];
      for (const key of this.inheritanceCache.keys()) {
        if (key.startsWith(`${userId}:`)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach((key) => this.inheritanceCache.delete(key));
      this.logger.debug(`Cleared all inheritance caches for user ${userId}`);
    }
  }

  /**
   * Clear inheritance cache for all users in an organization
   *
   * @param organizationId - Organization to clear cache for
   */
  async clearOrganizationCache(organizationId: string): Promise<void> {
    // Get all users in this organization
    const orgMembers = await this.organizationMemberRepo.find({
      where: { organizationId },
    });

    for (const member of orgMembers) {
      await this.clearInheritanceCache(member.userId);
    }

    this.logger.debug(`Cleared inheritance cache for organization ${organizationId}`);
  }

  /**
   * Build effective role result
   */
  private buildResult(
    role: ProjectRole | null,
    source: RoleSource,
    isInherited: boolean,
    organizationId?: string,
    organizationName?: string,
    organizationRole?: OrganizationRole,
    projectRole?: ProjectRole,
  ): EffectiveRoleResult {
    return {
      effectiveRole: role,
      source,
      isInherited,
      organizationId,
      organizationName,
      organizationRole,
      projectRole,
    };
  }

  /**
   * Get cache key for user/project
   */
  private getCacheKey(userId: string, projectId: string): string {
    return `${userId}:${projectId}`;
  }

  /**
   * Get cached role if available and not expired
   */
  private getCachedRole(
    userId: string,
    projectId: string,
  ): InheritanceCache | null {
    const cacheKey = this.getCacheKey(userId, projectId);
    const cached = this.inheritanceCache.get(cacheKey);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (cached.expiresAt < new Date()) {
      this.inheritanceCache.delete(cacheKey);
      return null;
    }

    return cached;
  }

  /**
   * Cache a role result
   */
  private cacheResult(
    userId: string,
    projectId: string,
    result: EffectiveRoleResult,
    organizationId: string,
  ): void {
    const cacheKey = this.getCacheKey(userId, projectId);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.CACHE_TTL_MS);

    this.inheritanceCache.set(cacheKey, {
      userId,
      projectId,
      effectiveRole: result.effectiveRole,
      source: result.source,
      isInherited: result.isInherited,
      organizationId,
      organizationRole: result.organizationRole,
      cachedAt: now,
      expiresAt,
    });
  }
}
