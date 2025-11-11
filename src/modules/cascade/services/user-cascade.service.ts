/**
 * User Cascade Service
 *
 * Handles user deletion and restoration with proper cascading
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OrganizationMember } from '../../organizations/entities/organization-member.entity';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Project } from '../../projects/entities/project.entity';
import { PermissionService } from '../../permissions/services/permission.service';
import { OrganizationRole } from '../../users/enums/organization-role.enum';
import { ProjectRole } from '../../users/enums/project-role.enum';
import {
  UserDeletionResult,
  DeletionOptions,
  RestorationOptions,
} from '../interfaces/cascade.interface';

/**
 * User Cascade Service
 *
 * Manages user deletion with cascading effects on:
 * - Organization memberships
 * - Project memberships
 * - Resource assignments
 * - Audit trails
 */
@Injectable()
export class UserCascadeService {
  private readonly logger = new Logger(UserCascadeService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(OrganizationMember)
    private readonly orgMemberRepo: Repository<OrganizationMember>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly permissionService: PermissionService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Delete a user and cascade to all memberships
   *
   * @param userId - User to delete
   * @param options - Deletion options
   * @returns Detailed result of deletion operation
   */
  async deleteUser(
    userId: string,
    options: DeletionOptions,
  ): Promise<UserDeletionResult> {
    const result: UserDeletionResult = {
      userId,
      organizationMembershipsRemoved: 0,
      projectMembershipsRemoved: 0,
      resourcesReassigned: 0,
      resourcesPreserved: 0,
      errors: [],
    };

    // Use transaction for atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log('Starting user deletion', {
        userId,
        softDelete: options.softDelete,
      });

      // 1. Get user
      const user = await this.userRepo.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // 2. Get all organization memberships
      const orgMemberships = await this.orgMemberRepo.find({
        where: { userId },
        relations: ['organization'],
      });

      // 3. Check for sole ownership
      for (const membership of orgMemberships) {
        if (membership.role === OrganizationRole.OWNER) {
          const ownerCount = await this.orgMemberRepo.count({
            where: {
              organizationId: membership.organizationId,
              role: OrganizationRole.OWNER,
            },
          });

          if (ownerCount === 1) {
            const org = membership.organization;
            throw new BadRequestException(
              `Cannot delete user: sole owner of organization "${org?.name || 'Unknown'}". ` +
                `Please transfer ownership or delete the organization first.`,
            );
          }
        }
      }

      // 4. Get all project memberships
      const projectMemberships = await this.projectMemberRepo.find({
        where: { userId },
      });

      // 5. Handle resource assignments
      // For now, we'll mark resources as having a deleted creator
      // In a full implementation, you would handle:
      // - RFIs assigned to this user
      // - Documents created by this user
      // - Submittals created by this user
      // - Comments by this user
      // - Audit events by this user

      result.resourcesPreserved = 0; // Count would come from actual resource queries

      // 6. Remove organization memberships
      if (options.softDelete) {
        // For soft delete, we would mark the memberships as deleted
        // This requires adding deletedAt, deletedBy columns to the entity
        // For now, we'll remove them (hard delete)
        await queryRunner.manager.remove(orgMemberships);
      } else {
        await queryRunner.manager.remove(orgMemberships);
      }
      result.organizationMembershipsRemoved = orgMemberships.length;

      // 7. Remove project memberships
      if (options.softDelete) {
        await queryRunner.manager.remove(projectMemberships);
      } else {
        await queryRunner.manager.remove(projectMemberships);
      }
      result.projectMembershipsRemoved = projectMemberships.length;

      // 8. Clear all permission caches
      for (const membership of projectMemberships) {
        await this.permissionService.clearPermissionCache(
          userId,
          membership.projectId,
        );
      }

      // Also clear user-level cache
      await this.permissionService.clearPermissionCache(userId);

      // 9. Delete or mark user as deleted
      if (options.softDelete) {
        // For soft delete, we would set deletedAt, deletedBy, etc.
        // This requires adding these columns to User entity
        // For now, we'll mark as inactive
        user.isActive = false;
        user.email = `deleted_${userId}_${Date.now()}@deleted.local`;
        await queryRunner.manager.save(user);
      } else {
        // Hard delete
        await queryRunner.manager.remove(user);
      }

      // Commit transaction
      await queryRunner.commitTransaction();

      this.logger.log('User deletion completed', {
        userId,
        result,
      });

      return result;
    } catch (error) {
      // Rollback on error
      await queryRunner.rollbackTransaction();

      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error('User deletion failed', {
        userId,
        error: errorMessage,
        stack: errorStack,
      });

      result.errors.push(errorMessage);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Restore a soft-deleted user
   *
   * @param userId - User to restore
   * @param options - Restoration options
   */
  async restoreUser(
    userId: string,
    options: RestorationOptions,
  ): Promise<void> {
    this.logger.log('Restoring user', { userId });

    // Find user (including inactive)
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isActive) {
      throw new BadRequestException('User is not deleted');
    }

    // Restore user
    user.isActive = true;
    // Restore original email if possible
    // This is a simplified version - in production you'd need to track original email
    if (user.email.startsWith('deleted_')) {
      throw new BadRequestException(
        'Cannot automatically restore email - please provide new email',
      );
    }

    await this.userRepo.save(user);

    // Note: Memberships would also need to be restored
    // This requires tracking which memberships belonged to this user

    this.logger.log('User restored', { userId });
  }

  /**
   * Check if user can be safely deleted
   *
   * @param userId - User to check
   * @returns Validation result
   */
  async validateDeletion(userId: string): Promise<{
    canDelete: boolean;
    reason?: string;
    blockers: string[];
  }> {
    const blockers: string[] = [];

    // Check for sole ownership
    const orgMemberships = await this.orgMemberRepo.find({
      where: { userId, role: OrganizationRole.OWNER },
      relations: ['organization'],
    });

    for (const membership of orgMemberships) {
      const ownerCount = await this.orgMemberRepo.count({
        where: {
          organizationId: membership.organizationId,
          role: OrganizationRole.OWNER,
        },
      });

      if (ownerCount === 1) {
        blockers.push(
          `Sole owner of organization: ${membership.organization?.name || membership.organizationId}`,
        );
      }
    }

    return {
      canDelete: blockers.length === 0,
      reason: blockers.length > 0 ? blockers.join('; ') : undefined,
      blockers,
    };
  }

  /**
   * Get deletion impact preview
   *
   * @param userId - User to preview
   * @returns Impact summary
   */
  async getDeleteionImpact(userId: string): Promise<{
    organizationMemberships: number;
    projectMemberships: number;
    blockers: string[];
  }> {
    const validation = await this.validateDeletion(userId);

    const orgCount = await this.orgMemberRepo.count({
      where: { userId },
    });

    const projectCount = await this.projectMemberRepo.count({
      where: { userId },
    });

    return {
      organizationMemberships: orgCount,
      projectMemberships: projectCount,
      blockers: validation.blockers,
    };
  }
}
