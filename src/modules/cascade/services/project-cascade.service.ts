/**
 * Project Cascade Service
 *
 * Handles project deletion and restoration with proper cascading
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Project, ProjectStatus } from '../../projects/entities/project.entity';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { PermissionService } from '../../permissions/services/permission.service';
import {
  ProjectDeletionResult,
  ProjectDeletionOptions,
  RestorationOptions,
} from '../interfaces/cascade.interface';

/**
 * Project Cascade Service
 *
 * Manages project deletion with cascading effects on:
 * - All project members
 * - All project resources (documents, RFIs, submittals, etc.)
 * - Permission caches
 */
@Injectable()
export class ProjectCascadeService {
  private readonly logger = new Logger(ProjectCascadeService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
    private readonly permissionService: PermissionService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Delete a project and cascade to all members and resources
   *
   * @param projectId - Project to delete
   * @param options - Deletion options
   * @returns Detailed result of deletion operation
   */
  async deleteProject(
    projectId: string,
    options: ProjectDeletionOptions,
  ): Promise<ProjectDeletionResult> {
    const result: ProjectDeletionResult = {
      projectId,
      membersRemoved: 0,
      resourcesDeleted: {
        documents: 0,
        rfis: 0,
        submittals: 0,
      },
      errors: [],
    };

    try {
      this.logger.log('Starting project deletion', {
        projectId,
        softDelete: options.softDelete,
        cascadedFrom: options.cascadedFrom,
      });

      // 1. Check permission (unless cascaded from org deletion)
      if (!options.cascadedFrom) {
        const canDelete = await this.permissionService.hasPermission(
          options.deletedBy,
          projectId,
          'project_settings:settings:delete',
        );

        if (!canDelete) {
          throw new ForbiddenException(
            'You do not have permission to delete this project',
          );
        }
      }

      // 2. Get project
      const project = await this.projectRepo.findOne({
        where: { id: projectId },
        relations: ['organization'],
      });

      if (!project) {
        throw new NotFoundException('Project not found');
      }

      // 3. Get all project members
      const members = await this.projectMemberRepo.find({
        where: { projectId },
      });

      this.logger.log(`Found ${members.length} members to remove`);

      // 4. Clear all member permission caches
      for (const member of members) {
        await this.permissionService.clearPermissionCache(
          member.userId,
          projectId,
        );
      }

      // 5. Remove project memberships
      await this.projectMemberRepo.remove(members);
      result.membersRemoved = members.length;

      // 6. Handle project resources
      // In a full implementation, you would:
      // - Delete or soft-delete documents
      // - Delete or soft-delete RFIs
      // - Delete or soft-delete submittals
      // - Delete or soft-delete tasks
      // - Delete or soft-delete daily reports
      // - Delete or soft-delete safety incidents
      // - Delete or soft-delete quality inspections
      //
      // For now, these counts remain at 0
      // You would query and delete each resource type here

      // 7. Delete project
      if (options.softDelete) {
        // For soft delete, mark as cancelled
        project.status = ProjectStatus.CANCELLED;
        await this.projectRepo.save(project);
      } else {
        // Hard delete
        await this.projectRepo.remove(project);
      }

      this.logger.log('Project deletion completed', {
        projectId,
        result,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Project deletion failed', {
        projectId,
        error: errorMessage,
        stack: errorStack,
      });

      result.errors.push(errorMessage);
      throw error;
    }
  }

  /**
   * Restore a soft-deleted project
   *
   * @param projectId - Project to restore
   * @param options - Restoration options
   */
  async restoreProject(
    projectId: string,
    options: RestorationOptions,
  ): Promise<void> {
    this.logger.log('Restoring project', { projectId });

    // Find project
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: ['organization'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.status !== ProjectStatus.CANCELLED) {
      throw new BadRequestException('Project is not deleted');
    }

    // Check if organization still exists and is active
    if (!project.organization || !project.organization.isActive) {
      throw new BadRequestException(
        'Cannot restore project: organization no longer exists or is deleted',
      );
    }

    // Restore project
    project.status = ProjectStatus.ACTIVE;
    await this.projectRepo.save(project);

    // Note: Members and resources would need separate restoration

    this.logger.log('Project restored', { projectId });
  }

  /**
   * Get deletion impact preview
   *
   * @param projectId - Project to preview
   * @returns Impact summary
   */
  async getDeletionImpact(projectId: string): Promise<{
    memberCount: number;
    resourceCount: {
      documents: number;
      rfis: number;
      submittals: number;
    };
  }> {
    const memberCount = await this.projectMemberRepo.count({
      where: { projectId },
    });

    // Resource counts would come from actual queries
    // For now, return 0
    const resourceCount = {
      documents: 0,
      rfis: 0,
      submittals: 0,
    };

    return {
      memberCount,
      resourceCount,
    };
  }

  /**
   * Validate project deletion
   *
   * @param projectId - Project to validate
   * @returns Validation result
   */
  async validateDeletion(projectId: string): Promise<{
    canDelete: boolean;
    reason?: string;
    warnings: string[];
  }> {
    const warnings: string[] = [];

    // Check for active resources that would be deleted
    const memberCount = await this.projectMemberRepo.count({
      where: { projectId },
    });

    if (memberCount > 0) {
      warnings.push(`${memberCount} members will be removed from the project`);
    }

    // Add more checks for resources
    // e.g., if project has active RFIs, add warning

    return {
      canDelete: true,
      warnings,
    };
  }
}
