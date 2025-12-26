import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { OrganizationMember } from '../../organizations/entities/organization-member.entity';
import { User } from '../../users/entities/user.entity';
import { Project } from '../../projects/entities/project.entity';
import { ProjectRole } from '../../users/enums/project-role.enum';
import { OrganizationRole } from '../../users/enums/organization-role.enum';
import { PermissionService } from '../../permissions/services/permission.service';
import { InheritanceService } from '../../permissions/services/inheritance.service';
import { ScopeService } from '../../permissions/services/scope.service';
import { ExpirationService } from '../../permissions/services/expiration.service';
import {
  AddProjectMemberDto,
  UpdateProjectMemberDto,
  RemoveMemberDto,
} from '../dto';
import { UserScope } from '../../permissions/interfaces/user-scope.interface';

interface ListMembersOptions {
  role?: string;
  roleCategory?: string;
  search?: string;
  scopeStatus?: string;
  expirationStatus?: string;
  includeInherited?: boolean;
  page?: number;
  limit?: number;
  requestingUserId?: string;
}

/**
 * Project Membership Service
 *
 * Business logic for project membership management with scope and expiration support
 */
@Injectable()
export class ProjectMembershipService {
  private readonly logger = new Logger(ProjectMembershipService.name);

  constructor(
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,
    @InjectRepository(OrganizationMember)
    private readonly orgMemberRepo: Repository<OrganizationMember>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly permissionService: PermissionService,
    private readonly inheritanceService: InheritanceService,
    private readonly scopeService: ScopeService,
    private readonly expirationService: ExpirationService,
  ) {}

  /**
   * Add project member
   */
  async addProjectMember(
    projectId: string,
    dto: AddProjectMemberDto,
    requestingUserId: string,
  ) {
    this.logger.log(
      `Adding member ${dto.userId} to project ${projectId} with role ${dto.role}`,
    );

    // 1. Validate project exists and get organization
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: ['organization'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // 2. Check if requesting user has permission
    const hasPermission = await this.permissionService.hasPermission(
      requestingUserId,
      projectId,
      'project:members:manage',
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to manage project members',
      );
    }

    // 3. Validate target user exists and is org member
    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const orgMembership = await this.orgMemberRepo.findOne({
      where: { userId: dto.userId, organizationId: project.organizationId },
    });

    if (!orgMembership) {
      throw new BadRequestException(
        'User must be an organization member before being added to projects',
      );
    }

    // 4. Check for inherited access
    const hasInheritedAccess = await this.inheritanceService.hasInheritedAccess(
      dto.userId,
      projectId,
    );

    if (hasInheritedAccess) {
      throw new ConflictException(
        'User already has inherited access to this project as an organization owner/admin',
      );
    }

    // 5. Check if already a member
    const existing = await this.projectMemberRepo.findOne({
      where: { userId: dto.userId, projectId },
    });

    if (existing) {
      throw new ConflictException('User is already a member of this project');
    }

    // 6. Validate scope for role
    if (dto.scope) {
      const scopeValidation = this.scopeService.validateScopeForRole(
        dto.role,
        dto.scope,
      );

      if (!scopeValidation.valid) {
        throw new BadRequestException(
          `Invalid scope configuration: ${scopeValidation.reason}`,
        );
      }
    }

    // 7. Validate expiration
    if (dto.expiresAt) {
      const expirationValidation =
        this.expirationService.validateExpirationDate(
          new Date(dto.expiresAt),
          dto.role,
        );

      if (!expirationValidation.valid) {
        throw new BadRequestException(
          `Invalid expiration date: ${expirationValidation.reason}`,
        );
      }
    }

    // 8. Create membership
    const membership = this.projectMemberRepo.create({
      userId: dto.userId,
      projectId,
      role: dto.role,
      scope: dto.scope || null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      expirationReason: dto.expirationReason || null,
      expirationNotified: false,
      addedBy: requestingUserId,
      addedAt: new Date(),
    });

    const saved = await this.projectMemberRepo.save(membership);

    // 9. Clear permission cache
    await this.permissionService.clearPermissionCache(dto.userId);

    // 10. TODO: Send notification if requested

    // 11. Return with user details
    return this.projectMemberRepo.findOne({
      where: { id: saved.id },
      relations: ['user'],
    });
  }

  /**
   * List project members
   */
  async listProjectMembers(projectId: string, options: ListMembersOptions) {
    this.logger.log(`Listing members for project ${projectId}`);

    // 1. Validate access
    if (options.requestingUserId) {
      const hasPermission = await this.permissionService.hasPermission(
        options.requestingUserId,
        projectId,
        'project:members:read',
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          'You do not have permission to view project members',
        );
      }
    }

    // 2. Get project and organization
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // 3. Build query for direct members
    const queryBuilder = this.projectMemberRepo
      .createQueryBuilder('membership')
      .leftJoinAndSelect('membership.user', 'user')
      .where('membership.projectId = :projectId', { projectId });

    // 4. Apply filters
    if (options.role) {
      queryBuilder.andWhere('membership.role = :role', { role: options.role });
    }

    if (options.roleCategory) {
      const rolesInCategory = this.getRolesByCategory(options.roleCategory);
      queryBuilder.andWhere('membership.role IN (:...roles)', {
        roles: rolesInCategory,
      });
    }

    if (options.search) {
      queryBuilder.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search)',
        { search: `%${options.search}%` },
      );
    }

    if (options.scopeStatus === 'limited') {
      queryBuilder.andWhere('membership.scope IS NOT NULL');
    } else if (options.scopeStatus === 'unrestricted') {
      queryBuilder.andWhere('membership.scope IS NULL');
    }

    if (options.expirationStatus === 'expiring') {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      queryBuilder.andWhere('membership.expiresAt IS NOT NULL');
      queryBuilder.andWhere('membership.expiresAt <= :futureDate', {
        futureDate,
      });
      queryBuilder.andWhere('membership.expiresAt > :now', { now: new Date() });
    } else if (options.expirationStatus === 'expired') {
      queryBuilder.andWhere('membership.expiresAt IS NOT NULL');
      queryBuilder.andWhere('membership.expiresAt <= :now', { now: new Date() });
    } else if (options.expirationStatus === 'active') {
      queryBuilder.andWhere(
        '(membership.expiresAt IS NULL OR membership.expiresAt > :now)',
        { now: new Date() },
      );
    }

    // 5. Get total count
    const total = await queryBuilder.getCount();

    // 6. Apply pagination
    const page = options.page || 1;
    const limit = Math.min(options.limit || 50, 100);
    const offset = (page - 1) * limit;

    queryBuilder
      .orderBy('membership.role', 'ASC')
      .addOrderBy('user.name', 'ASC')
      .skip(offset)
      .take(limit);

    const members = await queryBuilder.getMany();

    // 7. Add inherited members if requested
    let inheritedMembers: any[] = [];
    if (options.includeInherited) {
      const orgMembers = await this.orgMemberRepo.find({
        where: {
          organizationId: project.organizationId,
          role: In([OrganizationRole.OWNER, OrganizationRole.ORG_ADMIN]),
        },
        relations: ['user'],
      });

      // Filter out users already in direct members
      const directMemberUserIds = members.map((m) => m.userId);
      inheritedMembers = orgMembers
        .filter((om) => !directMemberUserIds.includes(om.userId))
        .map((om) => ({
          userId: om.userId,
          projectId,
          role: ProjectRole.PROJECT_ADMIN,
          scope: null,
          expiresAt: null,
          inherited: true,
          inheritedFrom: 'organization',
          organizationRole: om.role,
          user: om.user,
        }));
    }

    // 8. Return with pagination
    return {
      data: [...members, ...inheritedMembers],
      pagination: {
        page,
        limit,
        total: total + inheritedMembers.length,
        totalPages: Math.ceil((total + inheritedMembers.length) / limit),
      },
    };
  }

  /**
   * Update project member
   */
  async updateProjectMember(
    projectId: string,
    userId: string,
    dto: UpdateProjectMemberDto,
    requestingUserId: string,
  ) {
    this.logger.log(`Updating member ${userId} in project ${projectId}`);

    // 1. Check if requesting user has permission
    const hasPermission = await this.permissionService.hasPermission(
      requestingUserId,
      projectId,
      'project:members:manage',
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to manage project members',
      );
    }

    // 2. Check for inherited access - cannot modify
    const hasInheritedAccess = await this.inheritanceService.hasInheritedAccess(
      userId,
      projectId,
    );

    if (hasInheritedAccess) {
      throw new BadRequestException(
        'Cannot modify inherited access. Remove organization role instead.',
      );
    }

    // 3. Get existing membership
    const membership = await this.projectMemberRepo.findOne({
      where: { userId, projectId },
    });

    if (!membership) {
      throw new NotFoundException('Project membership not found');
    }

    // 4. Update role if provided
    if (dto.role !== undefined) {
      membership.role = dto.role;
    }

    // 5. Update scope if provided
    if (dto.scope !== undefined) {
      if (dto.scope === null) {
        membership.scope = null;
      } else {
        const scopeValidation = this.scopeService.validateScopeForRole(
          membership.role,
          dto.scope,
        );

        if (!scopeValidation.valid) {
          throw new BadRequestException(
            `Invalid scope configuration: ${scopeValidation.reason}`,
          );
        }

        membership.scope = dto.scope;
      }
    }

    // 6. Update expiration if provided
    if (dto.expiresAt !== undefined) {
      if (dto.expiresAt === null) {
        membership.expiresAt = null;
        membership.expirationReason = null;
        membership.expirationNotified = false;
      } else {
        const expirationValidation =
          this.expirationService.validateExpirationDate(
            new Date(dto.expiresAt),
            membership.role,
          );

        if (!expirationValidation.valid) {
          throw new BadRequestException(
            `Invalid expiration date: ${expirationValidation.reason}`,
          );
        }

        membership.expiresAt = new Date(dto.expiresAt);
        membership.expirationReason = dto.expirationReason || null;
        membership.expirationNotified = false;
      }
    }

    // 7. Save updates
    membership.updatedAt = new Date();
    const updated = await this.projectMemberRepo.save(membership);

    // 8. Clear permission cache
    await this.permissionService.clearPermissionCache(userId);

    // 9. TODO: Send notification

    return this.projectMemberRepo.findOne({
      where: { id: updated.id },
      relations: ['user'],
    });
  }

  /**
   * Remove project member
   */
  async removeProjectMember(
    projectId: string,
    userId: string,
    requestingUserId: string,
    dto?: RemoveMemberDto,
  ) {
    this.logger.log(`Removing user ${userId} from project ${projectId}`);

    // 1. Check if requesting user has permission
    const hasPermission = await this.permissionService.hasPermission(
      requestingUserId,
      projectId,
      'project:members:manage',
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to manage project members',
      );
    }

    // 2. Check for inherited access - cannot remove
    const hasInheritedAccess = await this.inheritanceService.hasInheritedAccess(
      userId,
      projectId,
    );

    if (hasInheritedAccess) {
      throw new BadRequestException(
        'Cannot remove inherited access. Remove organization role instead.',
      );
    }

    // 3. Get membership
    const membership = await this.projectMemberRepo.findOne({
      where: { userId, projectId },
    });

    if (!membership) {
      throw new NotFoundException('Project membership not found');
    }

    // 4. Store removal reason if provided
    if (dto?.reason) {
      // TODO: Log removal reason to audit log
      this.logger.log(`Removal reason: ${dto.reason}`);
    }

    // 5. Remove membership
    await this.projectMemberRepo.remove(membership);

    // 6. Clear permission cache
    await this.permissionService.clearPermissionCache(userId);

    // 7. TODO: Send notification if requested
  }

  /**
   * Helper: Get roles by category
   */
  private getRolesByCategory(category: string): ProjectRole[] {
    const categories: Record<string, ProjectRole[]> = {
      admin: [ProjectRole.PROJECT_ADMIN],
      field: [
        ProjectRole.SUPERINTENDENT,
        ProjectRole.FOREMAN,
        ProjectRole.FIELD_ENGINEER,
      ],
      office: [
        ProjectRole.PROJECT_MANAGER,
        ProjectRole.PROJECT_ENGINEER,
        ProjectRole.ESTIMATOR,
      ],
      specialized: [
        ProjectRole.SAFETY_OFFICER,
        ProjectRole.QUALITY_CONTROL,
        ProjectRole.SURVEYOR,
      ],
      view: [ProjectRole.VIEWER],
    };

    return categories[category] || [];
  }
}
