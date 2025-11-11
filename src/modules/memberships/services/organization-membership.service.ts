import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { OrganizationMember } from '../../organizations/entities/organization-member.entity';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Project } from '../../projects/entities/project.entity';
import { OrganizationRole } from '../../users/enums/organization-role.enum';
import { PermissionService } from '../../permissions/services/permission.service';
import {
  AddOrganizationMemberDto,
  UpdateOrganizationMemberDto,
} from '../dto';

interface ListMembersOptions {
  role?: string;
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
  requestingUserId?: string;
}

/**
 * Organization Membership Service
 *
 * Business logic for organization membership management
 */
@Injectable()
export class OrganizationMembershipService {
  private readonly logger = new Logger(OrganizationMembershipService.name);

  constructor(
    @InjectRepository(OrganizationMember)
    private readonly orgMemberRepo: Repository<OrganizationMember>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly permissionService: PermissionService,
  ) {}

  /**
   * Add organization member
   */
  async addOrganizationMember(
    orgId: string,
    dto: AddOrganizationMemberDto,
    requestingUserId: string,
  ) {
    this.logger.log(
      `Adding member ${dto.email} to organization ${orgId} with role ${dto.role}`,
    );

    // 1. Validate organization exists
    const org = await this.organizationRepo.findOne({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // 2. Check if requesting user has permission
    const requestingMember = await this.orgMemberRepo.findOne({
      where: { userId: requestingUserId, organizationId: orgId },
    });

    if (!requestingMember) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    // Only admins and owners can invite
    if (
      requestingMember.role !== OrganizationRole.OWNER &&
      requestingMember.role !== OrganizationRole.ORG_ADMIN
    ) {
      throw new ForbiddenException(
        'Only organization owners and admins can invite members',
      );
    }

    // Only owners can create other owners
    if (
      dto.role === OrganizationRole.OWNER &&
      requestingMember.role !== OrganizationRole.OWNER
    ) {
      throw new ForbiddenException(
        'Only organization owners can create other owners',
      );
    }

    // 3. Find or create user
    let user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) {
      // Create pending user
      user = this.userRepo.create({
        email: dto.email,
        name: dto.email.split('@')[0],
        isActive: false,
      });
      user = await this.userRepo.save(user);
    }

    // 4. Check if already a member
    const existing = await this.orgMemberRepo.findOne({
      where: { userId: user.id, organizationId: orgId },
    });

    if (existing) {
      throw new ConflictException('User is already a member of this organization');
    }

    // 5. Create membership
    const membership = this.orgMemberRepo.create({
      userId: user.id,
      organizationId: orgId,
      role: dto.role,
      invitedBy: requestingUserId,
      invitedAt: new Date(),
      joinedAt: user.isActive ? new Date() : undefined,
    });

    const saved = await this.orgMemberRepo.save(membership);

    // 6. Clear permission cache
    await this.permissionService.clearPermissionCache(user.id);

    // 7. TODO: Send invitation email if requested

    // 8. Return with user details
    return this.orgMemberRepo.findOne({
      where: { id: saved.id },
      relations: ['user'],
    });
  }

  /**
   * List organization members
   */
  async listOrganizationMembers(orgId: string, options: ListMembersOptions) {
    this.logger.log(`Listing members for organization ${orgId}`);

    // 1. Validate access
    if (options.requestingUserId) {
      const isMember = await this.orgMemberRepo.findOne({
        where: {
          userId: options.requestingUserId,
          organizationId: orgId,
        },
      });

      if (!isMember) {
        throw new ForbiddenException(
          'You must be an organization member to view members',
        );
      }
    }

    // 2. Build query
    const queryBuilder = this.orgMemberRepo
      .createQueryBuilder('membership')
      .leftJoinAndSelect('membership.user', 'user')
      .where('membership.organizationId = :orgId', { orgId });

    // 3. Apply filters
    if (options.role) {
      queryBuilder.andWhere('membership.role = :role', { role: options.role });
    }

    if (options.search) {
      queryBuilder.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search)',
        { search: `%${options.search}%` },
      );
    }

    if (options.status === 'active') {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive: true });
    } else if (options.status === 'invited') {
      queryBuilder.andWhere('membership.joinedAt IS NULL');
    } else if (options.status === 'inactive') {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive: false });
    }

    // 4. Get total count
    const total = await queryBuilder.getCount();

    // 5. Apply pagination
    const page = options.page || 1;
    const limit = Math.min(options.limit || 50, 100);
    const offset = (page - 1) * limit;

    queryBuilder
      .orderBy('membership.role', 'ASC')
      .addOrderBy('user.name', 'ASC')
      .skip(offset)
      .take(limit);

    const members = await queryBuilder.getMany();

    // 6. Return with pagination
    return {
      data: members,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update organization member role
   */
  async updateOrganizationMemberRole(
    orgId: string,
    userId: string,
    dto: UpdateOrganizationMemberDto,
    requestingUserId: string,
  ) {
    this.logger.log(
      `Updating role for user ${userId} in organization ${orgId} to ${dto.role}`,
    );

    // 1. Validate requesting user has permission
    const requestingMember = await this.orgMemberRepo.findOne({
      where: { userId: requestingUserId, organizationId: orgId },
    });

    if (!requestingMember) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    if (
      requestingMember.role !== OrganizationRole.OWNER &&
      requestingMember.role !== OrganizationRole.ORG_ADMIN
    ) {
      throw new ForbiddenException(
        'Only organization owners and admins can update member roles',
      );
    }

    // 2. Cannot change your own role
    if (userId === requestingUserId) {
      throw new BadRequestException('You cannot change your own role');
    }

    // 3. Get existing membership
    const membership = await this.orgMemberRepo.findOne({
      where: { userId, organizationId: orgId },
    });

    if (!membership) {
      throw new NotFoundException('Organization membership not found');
    }

    // 4. Only owners can create other owners
    if (
      dto.role === OrganizationRole.OWNER &&
      requestingMember.role !== OrganizationRole.OWNER
    ) {
      throw new ForbiddenException(
        'Only organization owners can create other owners',
      );
    }

    // 5. Cannot demote last owner
    if (membership.role === OrganizationRole.OWNER) {
      const ownerCount = await this.orgMemberRepo.count({
        where: { organizationId: orgId, role: OrganizationRole.OWNER },
      });

      if (ownerCount === 1) {
        throw new BadRequestException(
          'Cannot demote the last organization owner. Promote another member first.',
        );
      }
    }

    // 6. Update role
    membership.role = dto.role;
    membership.updatedAt = new Date();
    const updated = await this.orgMemberRepo.save(membership);

    // 7. Clear permission cache (affects all org projects)
    await this.permissionService.clearPermissionCache(userId);

    // 8. TODO: Send notification

    return this.orgMemberRepo.findOne({
      where: { id: updated.id },
      relations: ['user'],
    });
  }

  /**
   * Remove organization member
   */
  async removeOrganizationMember(
    orgId: string,
    userId: string,
    requestingUserId: string,
    removeFromProjects: boolean = false,
  ) {
    this.logger.log(`Removing user ${userId} from organization ${orgId}`);

    // 1. Validate requesting user has permission
    const requestingMember = await this.orgMemberRepo.findOne({
      where: { userId: requestingUserId, organizationId: orgId },
    });

    if (!requestingMember) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    if (
      requestingMember.role !== OrganizationRole.OWNER &&
      requestingMember.role !== OrganizationRole.ORG_ADMIN
    ) {
      throw new ForbiddenException(
        'Only organization owners and admins can remove members',
      );
    }

    // 2. Cannot remove yourself
    if (userId === requestingUserId) {
      throw new BadRequestException(
        'You cannot remove yourself from the organization',
      );
    }

    // 3. Get membership
    const membership = await this.orgMemberRepo.findOne({
      where: { userId, organizationId: orgId },
    });

    if (!membership) {
      throw new NotFoundException('Organization membership not found');
    }

    // 4. Cannot remove last owner
    if (membership.role === OrganizationRole.OWNER) {
      const ownerCount = await this.orgMemberRepo.count({
        where: { organizationId: orgId, role: OrganizationRole.OWNER },
      });

      if (ownerCount === 1) {
        throw new BadRequestException('Cannot remove the last organization owner');
      }
    }

    // 5. Optionally remove from all projects
    if (removeFromProjects) {
      const projects = await this.projectRepo.find({
        where: { organizationId: orgId },
      });

      for (const project of projects) {
        await this.projectMemberRepo.delete({
          userId,
          projectId: project.id,
        });
      }
    }

    // 6. Remove organization membership
    await this.orgMemberRepo.remove(membership);

    // 7. Clear permission cache
    await this.permissionService.clearPermissionCache(userId);

    // 8. TODO: Send notification
  }
}
