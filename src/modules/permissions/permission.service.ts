import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { OrganizationMember } from '../organizations/entities/organization-member.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { SystemRole } from '../users/enums/system-role.enum';
import { OrganizationRole } from '../users/enums/organization-role.enum';
import { ProjectRole } from '../users/enums/project-role.enum';

/**
 * Permission Check Result
 */
export interface PermissionCheckResult {
  hasAccess: boolean;
  reason?: string;
  role?: OrganizationRole | ProjectRole;
}

/**
 * Permission Service
 *
 * Handles permission checks for the multi-level permission system.
 * Implements the following hierarchy:
 *
 * 1. System Level: SYSTEM_ADMIN has access to everything
 * 2. Organization Level: Organization roles determine org-wide access
 * 3. Project Level: Project roles determine project-specific access
 * 4. Inheritance: Org OWNER and ORG_ADMIN automatically get PROJECT_ADMIN on all projects
 *
 * Features:
 * - System admin bypass (system admins can access anything)
 * - Organization membership checks with role hierarchy
 * - Project membership checks with role hierarchy
 * - Automatic project access for organization admins
 * - Expiration checks for project memberships
 *
 * @service PermissionService
 */
@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(
    @InjectRepository(OrganizationMember)
    private readonly orgMemberRepository: Repository<OrganizationMember>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,
  ) {}

  /**
   * Check if user has access to an organization
   *
   * Access is granted if:
   * 1. User is a system admin, OR
   * 2. User is a member of the organization with sufficient role
   *
   * @param user - User to check
   * @param organizationId - Organization ID
   * @param minimumRole - Minimum required role (optional)
   * @returns PermissionCheckResult
   */
  async hasOrganizationAccess(
    user: User,
    organizationId: string,
    minimumRole?: OrganizationRole,
  ): Promise<PermissionCheckResult> {
    // 1. System admins have access to everything
    if (user.systemRole === SystemRole.SYSTEM_ADMIN) {
      this.logger.debug(
        `System admin ${user.id} granted access to organization ${organizationId}`,
      );
      return {
        hasAccess: true,
        reason: 'system_admin',
      };
    }

    // 2. Check organization membership
    const membership = await this.orgMemberRepository.findOne({
      where: {
        userId: user.id,
        organizationId,
      },
    });

    if (!membership) {
      this.logger.debug(
        `User ${user.id} denied access to organization ${organizationId}: not a member`,
      );
      return {
        hasAccess: false,
        reason: 'not_a_member',
      };
    }

    // 3. If minimum role is specified, check role hierarchy
    if (minimumRole && !membership.hasRoleLevel(minimumRole)) {
      this.logger.debug(
        `User ${user.id} denied access to organization ${organizationId}: insufficient role (${membership.role} < ${minimumRole})`,
      );
      return {
        hasAccess: false,
        reason: 'insufficient_role',
        role: membership.role,
      };
    }

    this.logger.debug(
      `User ${user.id} granted access to organization ${organizationId} with role ${membership.role}`,
    );
    return {
      hasAccess: true,
      role: membership.role,
    };
  }

  /**
   * Check if user has access to a project
   *
   * Access is granted if:
   * 1. User is a system admin, OR
   * 2. User is an owner/admin of the parent organization (automatic PROJECT_ADMIN), OR
   * 3. User is a direct member of the project with sufficient role
   *
   * @param user - User to check
   * @param projectId - Project ID
   * @param organizationId - Parent organization ID (required for inheritance check)
   * @param minimumRole - Minimum required role (optional)
   * @returns PermissionCheckResult
   */
  async hasProjectAccess(
    user: User,
    projectId: string,
    organizationId: string,
    minimumRole?: ProjectRole,
  ): Promise<PermissionCheckResult> {
    // 1. System admins have access to everything
    if (user.systemRole === SystemRole.SYSTEM_ADMIN) {
      this.logger.debug(
        `System admin ${user.id} granted access to project ${projectId}`,
      );
      return {
        hasAccess: true,
        reason: 'system_admin',
      };
    }

    // 2. Check if user is an organization admin (automatic project admin access)
    const orgMembership = await this.orgMemberRepository.findOne({
      where: {
        userId: user.id,
        organizationId,
      },
    });

    if (orgMembership && orgMembership.isAdmin()) {
      this.logger.debug(
        `Organization admin ${user.id} granted access to project ${projectId} via org role ${orgMembership.role}`,
      );
      // Organization admins are treated as PROJECT_ADMIN
      const effectiveRole = ProjectRole.PROJECT_ADMIN;

      // Check if they meet the minimum role requirement
      if (minimumRole && !this.compareProjectRoles(effectiveRole, minimumRole)) {
        return {
          hasAccess: false,
          reason: 'insufficient_role',
          role: effectiveRole,
        };
      }

      return {
        hasAccess: true,
        reason: 'organization_admin',
        role: effectiveRole,
      };
    }

    // 3. Check direct project membership
    const projectMembership = await this.projectMemberRepository.findOne({
      where: {
        userId: user.id,
        projectId,
      },
    });

    if (!projectMembership) {
      this.logger.debug(
        `User ${user.id} denied access to project ${projectId}: not a member`,
      );
      return {
        hasAccess: false,
        reason: 'not_a_member',
      };
    }

    // 4. Check if membership has expired
    if (projectMembership.isExpired()) {
      this.logger.debug(
        `User ${user.id} denied access to project ${projectId}: membership expired`,
      );
      return {
        hasAccess: false,
        reason: 'membership_expired',
        role: projectMembership.role,
      };
    }

    // 5. If minimum role is specified, check role hierarchy
    if (minimumRole && !this.compareProjectRoles(projectMembership.role, minimumRole)) {
      this.logger.debug(
        `User ${user.id} denied access to project ${projectId}: insufficient role (${projectMembership.role} < ${minimumRole})`,
      );
      return {
        hasAccess: false,
        reason: 'insufficient_role',
        role: projectMembership.role,
      };
    }

    this.logger.debug(
      `User ${user.id} granted access to project ${projectId} with role ${projectMembership.role}`,
    );
    return {
      hasAccess: true,
      role: projectMembership.role,
    };
  }

  /**
   * Get user's organization membership
   *
   * @param userId - User ID
   * @param organizationId - Organization ID
   * @returns OrganizationMember or null
   */
  async getOrganizationMembership(
    userId: string,
    organizationId: string,
  ): Promise<OrganizationMember | null> {
    return this.orgMemberRepository.findOne({
      where: {
        userId,
        organizationId,
      },
      relations: ['user', 'organization'],
    });
  }

  /**
   * Get user's project membership
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @returns ProjectMember or null
   */
  async getProjectMembership(
    userId: string,
    projectId: string,
  ): Promise<ProjectMember | null> {
    return this.projectMemberRepository.findOne({
      where: {
        userId,
        projectId,
      },
      relations: ['user', 'project'],
    });
  }

  /**
   * Get all organizations a user has access to
   *
   * @param userId - User ID
   * @returns List of organization memberships
   */
  async getUserOrganizations(userId: string): Promise<OrganizationMember[]> {
    return this.orgMemberRepository.find({
      where: { userId },
      relations: ['organization'],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Get all projects a user has access to within an organization
   *
   * @param userId - User ID
   * @param organizationId - Organization ID (optional)
   * @returns List of project memberships
   */
  async getUserProjects(
    userId: string,
    organizationId?: string,
  ): Promise<ProjectMember[]> {
    const query = this.projectMemberRepository
      .createQueryBuilder('pm')
      .leftJoinAndSelect('pm.project', 'project')
      .where('pm.user_id = :userId', { userId });

    if (organizationId) {
      query.andWhere('project.organization_id = :organizationId', { organizationId });
    }

    query.orderBy('pm.created_at', 'DESC');

    return query.getMany();
  }

  /**
   * Compare project roles for hierarchy
   * Returns true if actualRole >= minimumRole in the admin hierarchy
   *
   * @param actualRole - User's actual role
   * @param minimumRole - Minimum required role
   * @returns boolean
   */
  private compareProjectRoles(
    actualRole: ProjectRole,
    minimumRole: ProjectRole,
  ): boolean {
    const adminRoleHierarchy: Record<string, number> = {
      [ProjectRole.PROJECT_ADMIN]: 3,
      [ProjectRole.PROJECT_MANAGER]: 2,
      [ProjectRole.PROJECT_ENGINEER]: 1,
    };

    const actualLevel = adminRoleHierarchy[actualRole] || 0;
    const minimumLevel = adminRoleHierarchy[minimumRole] || 0;

    return actualLevel >= minimumLevel;
  }
}
