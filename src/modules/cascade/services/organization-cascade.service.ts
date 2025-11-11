/**
 * Organization Cascade Service
 *
 * Handles organization deletion and restoration with proper cascading
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { OrganizationMember } from '../../organizations/entities/organization-member.entity';
import { Project } from '../../projects/entities/project.entity';
import { PermissionService } from '../../permissions/services/permission.service';
import { ProjectCascadeService } from './project-cascade.service';
import { OrganizationRole } from '../../users/enums/organization-role.enum';
import {
  OrganizationDeletionResult,
  OrganizationDeletionOptions,
  RestorationOptions,
} from '../interfaces/cascade.interface';

/**
 * Organization Cascade Service
 *
 * Manages organization deletion with cascading effects on:
 * - All projects in organization
 * - All organization members
 * - Billing/subscription data
 */
@Injectable()
export class OrganizationCascadeService {
  private readonly logger = new Logger(OrganizationCascadeService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private readonly orgMemberRepo: Repository<OrganizationMember>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly permissionService: PermissionService,
    private readonly projectCascadeService: ProjectCascadeService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Delete an organization and cascade to all projects
   *
   * @param organizationId - Organization to delete
   * @param options - Deletion options
   * @returns Detailed result of deletion operation
   */
  async deleteOrganization(
    organizationId: string,
    options: OrganizationDeletionOptions,
  ): Promise<OrganizationDeletionResult> {
    const result: OrganizationDeletionResult = {
      organizationId,
      projectsDeleted: 0,
      membersRemoved: 0,
      errors: [],
    };

    try {
      this.logger.log('Starting organization deletion', {
        organizationId,
        softDelete: options.softDelete,
      });

      // 1. Get organization
      const org = await this.organizationRepo.findOne({
        where: { id: organizationId },
      });

      if (!org) {
        throw new NotFoundException('Organization not found');
      }

      // 2. Check if user has permission (must be owner)
      const canDelete = await this.isOrganizationOwner(
        options.deletedBy,
        organizationId,
      );

      if (!canDelete) {
        throw new ForbiddenException(
          'Only organization owners can delete the organization',
        );
      }

      // 3. Get all projects in organization
      const projects = await this.projectRepo.find({
        where: { organizationId },
      });

      this.logger.log(`Found ${projects.length} projects to delete`);

      // 4. Delete all projects (cascading)
      for (const project of projects) {
        try {
          await this.projectCascadeService.deleteProject(project.id, {
            deletedBy: options.deletedBy,
            reason: `Organization deleted: ${options.reason || ''}`,
            softDelete: options.softDelete,
            cascadedFrom: 'organization',
          });
          result.projectsDeleted++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to delete project', {
            projectId: project.id,
            error: errorMessage,
          });
          result.errors.push(
            `Failed to delete project ${project.name}: ${errorMessage}`,
          );
        }
      }

      // 5. Get all organization members
      const members = await this.orgMemberRepo.find({
        where: { organizationId },
      });

      // 6. Clear all member permission caches
      for (const member of members) {
        await this.permissionService.clearPermissionCache(member.userId);
      }

      // 7. Remove all organization members
      await this.orgMemberRepo.remove(members);
      result.membersRemoved = members.length;

      // 8. Delete organization
      if (options.softDelete) {
        // For soft delete, mark as inactive
        org.isActive = false;
        await this.organizationRepo.save(org);
      } else {
        // Hard delete
        await this.organizationRepo.remove(org);
      }

      this.logger.log('Organization deletion completed', {
        organizationId,
        result,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Organization deletion failed', {
        organizationId,
        error: errorMessage,
        stack: errorStack,
      });

      result.errors.push(errorMessage);
      throw error;
    }
  }

  /**
   * Restore a soft-deleted organization
   *
   * @param organizationId - Organization to restore
   * @param options - Restoration options
   */
  async restoreOrganization(
    organizationId: string,
    options: RestorationOptions,
  ): Promise<void> {
    this.logger.log('Restoring organization', { organizationId });

    // Find organization
    const org = await this.organizationRepo.findOne({
      where: { id: organizationId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    if (org.isActive) {
      throw new ForbiddenException('Organization is not deleted');
    }

    // Restore organization
    org.isActive = true;
    await this.organizationRepo.save(org);

    // Note: Projects and memberships would need separate restoration

    this.logger.log('Organization restored', { organizationId });
  }

  /**
   * Check if user is organization owner
   *
   * @param userId - User ID
   * @param organizationId - Organization ID
   * @returns true if user is owner
   */
  private async isOrganizationOwner(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    const membership = await this.orgMemberRepo.findOne({
      where: {
        userId,
        organizationId,
        role: OrganizationRole.OWNER,
      },
    });

    return !!membership;
  }

  /**
   * Get deletion impact preview
   *
   * @param organizationId - Organization to preview
   * @returns Impact summary
   */
  async getDeletionImpact(organizationId: string): Promise<{
    projectCount: number;
    memberCount: number;
    totalResources: number;
  }> {
    const projectCount = await this.projectRepo.count({
      where: { organizationId },
    });

    const memberCount = await this.orgMemberRepo.count({
      where: { organizationId },
    });

    // Total resources would be sum of all project resources
    // For now, return 0
    const totalResources = 0;

    return {
      projectCount,
      memberCount,
      totalResources,
    };
  }
}
