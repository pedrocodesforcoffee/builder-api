import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UserPinnedProject } from '../entities/user-pinned-project.entity';
import { Project } from '../../projects/entities/project.entity';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { PinnedProjectsResponseDto } from '../dto/pinned-projects-response.dto';
import { UpdatePinnedProjectsDto } from '../dto/update-pinned-projects.dto';

/**
 * UserPinnedProjectsService
 *
 * Handles business logic for user pinned projects:
 * - Get user's pinned projects
 * - Update/replace user's pinned projects
 * - Validate user has access to projects before pinning
 */
@Injectable()
export class UserPinnedProjectsService {
  private readonly logger = new Logger(UserPinnedProjectsService.name);

  constructor(
    @InjectRepository(UserPinnedProject)
    private readonly userPinnedProjectRepo: Repository<UserPinnedProject>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,
  ) {}

  /**
   * Get user's pinned project IDs
   *
   * @param userId - User ID
   * @returns Array of pinned project IDs
   */
  async getPinnedProjects(userId: string): Promise<PinnedProjectsResponseDto> {
    this.logger.log(`Fetching pinned projects for user ${userId}`);

    const pinnedProjects = await this.userPinnedProjectRepo.find({
      where: { userId },
      order: { position: 'ASC', pinnedAt: 'ASC' },
    });

    const projectIds = pinnedProjects.map((pp) => pp.projectId);

    this.logger.log(`Found ${projectIds.length} pinned projects for user ${userId}`);

    return { projectIds };
  }

  /**
   * Update user's pinned projects
   *
   * Replaces the entire list of pinned projects.
   * Validates:
   * - All project IDs exist
   * - User has access to all projects
   *
   * @param userId - User ID
   * @param updateDto - Update data with new project IDs
   * @returns Updated pinned projects
   * @throws NotFoundException if any project doesn't exist
   * @throws ForbiddenException if user doesn't have access to any project
   */
  async updatePinnedProjects(
    userId: string,
    updateDto: UpdatePinnedProjectsDto,
  ): Promise<PinnedProjectsResponseDto> {
    this.logger.log(
      `Updating pinned projects for user ${userId} with ${updateDto.projectIds.length} projects`,
    );

    const { projectIds } = updateDto;

    // If empty array, just delete all pinned projects
    if (projectIds.length === 0) {
      await this.userPinnedProjectRepo.delete({ userId });
      this.logger.log(`Cleared all pinned projects for user ${userId}`);
      return { projectIds: [] };
    }

    // Validate all projects exist
    const projects = await this.projectRepo.find({
      where: { id: In(projectIds) },
    });

    if (projects.length !== projectIds.length) {
      const foundIds = projects.map((p) => p.id);
      const missingIds = projectIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(
        `One or more project IDs are invalid: ${missingIds.join(', ')}`,
      );
    }

    // Validate user has access to all projects
    const userProjectMemberships = await this.projectMemberRepo.find({
      where: {
        userId,
        projectId: In(projectIds),
      },
    });

    const accessibleProjectIds = userProjectMemberships.map((pm) => pm.projectId);

    // Check if user has access to all requested projects
    const inaccessibleProjects = projectIds.filter(
      (id) => !accessibleProjectIds.includes(id),
    );

    if (inaccessibleProjects.length > 0) {
      throw new ForbiddenException(
        `You don't have access to one or more projects: ${inaccessibleProjects.join(', ')}`,
      );
    }

    // Delete existing pinned projects for this user
    await this.userPinnedProjectRepo.delete({ userId });

    // Create new pinned projects with position based on array order
    const pinnedProjectsToCreate = projectIds.map((projectId, index) => {
      return this.userPinnedProjectRepo.create({
        userId,
        projectId,
        position: index,
      });
    });

    await this.userPinnedProjectRepo.save(pinnedProjectsToCreate);

    this.logger.log(
      `Successfully updated pinned projects for user ${userId} with ${projectIds.length} projects`,
    );

    return { projectIds };
  }
}
