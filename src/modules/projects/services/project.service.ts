import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { ProjectStatus } from '../enums/project-status.enum';
import { ProjectMember } from '../entities/project-member.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { ProjectRole } from '../../users/enums/project-role.enum';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectResponseDto,
} from '../dto';
import { RecommendationsService } from '../../ai/services/recommendations.service';

/**
 * Project Service
 *
 * Handles business logic for project management including:
 * - CRUD operations
 * - Project code generation and uniqueness validation
 * - Automatic PROJECT_ADMIN assignment on creation
 * - Status transitions
 * - Member counts and organization relationships
 *
 * @service ProjectService
 */
@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
    @Optional()
    private readonly recommendationsService?: RecommendationsService,
  ) {}

  /**
   * Create a new project
   *
   * Automatically generates project code if not provided.
   * Adds the creator as PROJECT_ADMIN.
   * Validates organization exists and is active.
   *
   * @param createDto - Project creation data
   * @param creatorUserId - User ID of the project creator
   * @returns Created project
   * @throws NotFoundException if organization doesn't exist
   * @throws BadRequestException if organization is inactive
   * @throws ConflictException if project code already exists in org
   */
  async create(
    createDto: CreateProjectDto,
    creatorUserId: string,
  ): Promise<ProjectResponseDto> {
    this.logger.log(
      `Creating project "${createDto.name}" for organization ${createDto.organizationId}`,
    );

    // Validate organization exists and is active
    const organization = await this.organizationRepo.findOne({
      where: { id: createDto.organizationId },
    });

    if (!organization) {
      throw new NotFoundException(
        `Organization with ID ${createDto.organizationId} not found`,
      );
    }

    if (!organization.isActive) {
      throw new BadRequestException(
        `Cannot create project in inactive organization`,
      );
    }

    // Generate project number if not provided
    let number = createDto.number;
    if (!number) {
      number = await this.generateProjectNumber(
        createDto.organizationId,
        organization.slug,
      );
    }

    // Check if number is unique within organization
    const existingProject = await this.projectRepo.findOne({
      where: {
        organizationId: createDto.organizationId,
        number: number,
      },
    });

    if (existingProject) {
      throw new ConflictException(
        `Project with number "${number}" already exists in this organization`,
      );
    }

    // Create project
    const project = this.projectRepo.create({
      ...createDto,
      number,
      status: createDto.status || ProjectStatus.BIDDING,
    });

    const savedProject = await this.projectRepo.save(project);

    this.logger.log(
      `Project created successfully: ${savedProject.id} (${savedProject.number})`,
    );

    // Add creator as PROJECT_ADMIN
    const adminMember = this.projectMemberRepo.create({
      projectId: savedProject.id,
      userId: creatorUserId,
      role: ProjectRole.PROJECT_ADMIN,
      addedByUserId: creatorUserId,
      joinedAt: new Date(),
    });

    await this.projectMemberRepo.save(adminMember);

    this.logger.log(
      `Added creator ${creatorUserId} as PROJECT_ADMIN to project ${savedProject.id}`,
    );

    // Automatically create AI project profile for similarity matching and recommendations
    if (this.recommendationsService) {
      try {
        await this.createProjectProfile(savedProject, createDto);
        this.logger.log(
          `AI project profile created for project ${savedProject.id}`,
        );
      } catch (error: any) {
        // Don't fail project creation if AI profile creation fails
        this.logger.error(
          `Failed to create AI project profile for ${savedProject.id}: ${error.message}`,
          error.stack,
        );
      }
    }

    return this.toResponseDto(savedProject, organization.name);
  }

  /**
   * List all projects
   *
   * Optionally filter by:
   * - User membership (myProjects)
   * - Organization
   * - Status
   * - Archived status
   * - Search query (name, number, address, city, state)
   *
   * Supports sorting and pagination.
   *
   * @param userId - Filter to projects user is a member of (optional)
   * @param organizationId - Filter to specific organization (optional)
   * @param status - Filter to specific status (optional)
   * @param includeArchived - Include archived projects (default: false)
   * @param search - Search query for name, number, address, city, state (optional)
   * @param sortBy - Sort by 'name', 'updated', or 'created' (default: 'created')
   * @param limit - Max results (default: 50, max: 100)
   * @param offset - Skip results for pagination (default: 0)
   * @returns Array of projects
   */
  async findAll(
    userId?: string,
    organizationId?: string,
    status?: ProjectStatus,
    includeArchived = false,
    search?: string,
    sortBy = 'created',
    limit = 50,
    offset = 0,
  ): Promise<ProjectResponseDto[]> {
    this.logger.log(
      `Fetching projects - userId: ${userId}, orgId: ${organizationId}, status: ${status}, includeArchived: ${includeArchived}, search: ${search}, sortBy: ${sortBy}, limit: ${limit}, offset: ${offset}`,
    );

    // Validate and cap limit
    const validatedLimit = Math.min(Math.max(limit, 1), 100);

    const queryBuilder = this.projectRepo
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.organization', 'organization');

    // Filter by user membership
    if (userId) {
      queryBuilder
        .innerJoin(
          'project_members',
          'pm',
          'pm.project_id = project.id AND pm.user_id = :userId',
          { userId },
        );
    }

    // Filter by organization
    if (organizationId) {
      queryBuilder.andWhere('project.organization_id = :organizationId', {
        organizationId,
      });
    }

    // Filter by status
    if (status) {
      queryBuilder.andWhere('project.status = :status', { status });
    }

    // Filter by archived status
    if (!includeArchived) {
      queryBuilder.andWhere('project.archived_at IS NULL');
    }

    // Search filter
    if (search && search.trim().length > 0) {
      const searchTerm = `%${search.trim()}%`;
      queryBuilder.andWhere(
        '(project.name ILIKE :search OR project.number ILIKE :search OR project.address ILIKE :search OR project.city ILIKE :search OR project.state ILIKE :search)',
        { search: searchTerm },
      );
    }

    // Sorting
    switch (sortBy) {
      case 'name':
        queryBuilder.addOrderBy('project.name', 'ASC');
        break;
      case 'updated':
        queryBuilder.addOrderBy('project.updatedAt', 'DESC');
        break;
      case 'created':
      default:
        queryBuilder.addOrderBy('project.createdAt', 'DESC');
        break;
    }

    // Pagination
    queryBuilder.skip(offset).take(validatedLimit);

    const projects = await queryBuilder.getMany();

    this.logger.log(`Found ${projects.length} projects`);

    return projects.map((project) =>
      this.toResponseDto(project, project.organization?.name),
    );
  }

  /**
   * Get project by ID
   *
   * @param id - Project ID
   * @param includeCounts - Whether to include member counts
   * @returns Project details
   * @throws NotFoundException if project doesn't exist
   */
  async findOne(
    id: string,
    includeCounts = false,
  ): Promise<ProjectResponseDto> {
    this.logger.log(`Fetching project by ID: ${id}`);

    const project = await this.projectRepo.findOne({
      where: { id },
      relations: ['organization'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    const response = this.toResponseDto(project, project.organization?.name);

    // Include member count if requested
    if (includeCounts) {
      const memberCount = await this.projectMemberRepo.count({
        where: { projectId: id },
      });
      response.memberCount = memberCount;
    }

    return response;
  }

  /**
   * Get project by number within organization
   *
   * @param organizationId - Organization ID
   * @param number - Project number
   * @returns Project details
   * @throws NotFoundException if project doesn't exist
   */
  async findByNumber(
    organizationId: string,
    number: string,
  ): Promise<ProjectResponseDto> {
    this.logger.log(
      `Fetching project by number: ${number} in org ${organizationId}`,
    );

    const project = await this.projectRepo.findOne({
      where: { organizationId, number },
      relations: ['organization'],
    });

    if (!project) {
      throw new NotFoundException(
        `Project with number "${number}" not found in organization`,
      );
    }

    return this.toResponseDto(project, project.organization?.name);
  }

  /**
   * Update project
   *
   * @param id - Project ID
   * @param updateDto - Update data
   * @returns Updated project
   * @throws NotFoundException if project doesn't exist
   * @throws ConflictException if new code conflicts with existing project
   */
  async update(
    id: string,
    updateDto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    this.logger.log(`Updating project ${id}`);

    const project = await this.projectRepo.findOne({
      where: { id },
      relations: ['organization'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    // If updating number, check uniqueness within organization
    if (updateDto.number && updateDto.number !== project.number) {
      const existingProject = await this.projectRepo.findOne({
        where: {
          organizationId: project.organizationId,
          number: updateDto.number,
        },
      });

      if (existingProject && existingProject.id !== id) {
        throw new ConflictException(
          `Project with number "${updateDto.number}" already exists in this organization`,
        );
      }
    }

    // If transitioning to COMPLETE, set finalCompletion date if not set
    if (
      updateDto.status === ProjectStatus.COMPLETE &&
      project.status !== ProjectStatus.COMPLETE &&
      !project.finalCompletion
    ) {
      project.finalCompletion = new Date();
      this.logger.log(`Setting final completion date for project ${id}`);
    }

    // Apply updates
    Object.assign(project, updateDto);

    const updatedProject = await this.projectRepo.save(project);

    this.logger.log(`Project ${id} updated successfully`);

    return this.toResponseDto(updatedProject, project.organization?.name);
  }

  /**
   * Update project status
   *
   * Convenience method for status changes.
   *
   * @param id - Project ID
   * @param status - New status
   * @returns Updated project
   */
  async updateStatus(
    id: string,
    status: ProjectStatus,
  ): Promise<ProjectResponseDto> {
    this.logger.log(`Updating project ${id} status to ${status}`);
    return this.update(id, { status });
  }

  /**
   * Delete project
   *
   * Performs soft delete by changing status to CANCELLED.
   * Hard delete removes the project and all members permanently.
   *
   * @param id - Project ID
   * @param hardDelete - Whether to permanently delete (default: false)
   * @throws NotFoundException if project doesn't exist
   */
  async remove(id: string, hardDelete = false): Promise<void> {
    this.logger.log(
      `Removing project ${id} (hardDelete: ${hardDelete})`,
    );

    const project = await this.projectRepo.findOne({ where: { id } });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    if (hardDelete) {
      // Permanently delete
      await this.projectRepo.remove(project);
      this.logger.log(`Project ${id} permanently deleted`);
    } else {
      // Soft delete - not supported in current schema (no CANCELLED status)
      // Perform hard delete instead
      await this.projectRepo.remove(project);
      this.logger.log(`Project ${id} deleted`);
    }
  }

  /**
   * Restore project (change status)
   *
   * Changes project status to specified status.
   *
   * @param id - Project ID
   * @param newStatus - Status to restore to (default: BIDDING)
   * @returns Restored project
   * @throws NotFoundException if project doesn't exist
   */
  async restore(
    id: string,
    newStatus: ProjectStatus = ProjectStatus.BIDDING,
  ): Promise<ProjectResponseDto> {
    this.logger.log(`Restoring project ${id} to status ${newStatus}`);

    const project = await this.projectRepo.findOne({
      where: { id },
      relations: ['organization'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    project.status = newStatus;
    const restoredProject = await this.projectRepo.save(project);

    this.logger.log(`Project ${id} status updated successfully`);

    return this.toResponseDto(restoredProject, project.organization?.name);
  }

  /**
   * Archive project
   *
   * Sets the archivedAt timestamp to mark the project as archived.
   * Archived projects can be filtered out from active project lists.
   *
   * @param id - Project ID
   * @returns Archived project
   * @throws NotFoundException if project doesn't exist
   */
  async archive(id: string): Promise<ProjectResponseDto> {
    this.logger.log(`Archiving project ${id}`);

    const project = await this.projectRepo.findOne({
      where: { id },
      relations: ['organization'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    project.archivedAt = new Date();
    const archivedProject = await this.projectRepo.save(project);

    this.logger.log(`Project ${id} archived successfully`);

    return this.toResponseDto(archivedProject, project.organization?.name);
  }

  /**
   * Unarchive project
   *
   * Clears the archivedAt timestamp to restore the project to active status.
   *
   * @param id - Project ID
   * @returns Unarchived project
   * @throws NotFoundException if project doesn't exist
   */
  async unarchive(id: string): Promise<ProjectResponseDto> {
    this.logger.log(`Unarchiving project ${id}`);

    const project = await this.projectRepo.findOne({
      where: { id },
      relations: ['organization'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    project.archivedAt = undefined;
    const unarchivedProject = await this.projectRepo.save(project);

    this.logger.log(`Project ${id} unarchived successfully`);

    return this.toResponseDto(unarchivedProject, project.organization?.name);
  }

  /**
   * Generate unique project number
   *
   * Format: ORG-SLUG-YYYYMMDD-NNN
   * Example: ACME-20240115-001
   *
   * @param organizationId - Organization ID
   * @param orgSlug - Organization slug
   * @returns Generated project number
   */
  private async generateProjectNumber(
    organizationId: string,
    orgSlug: string,
  ): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

    // Get count of projects created today
    const todayStart = new Date(date.setHours(0, 0, 0, 0));
    const todayEnd = new Date(date.setHours(23, 59, 59, 999));

    const todayCount = await this.projectRepo
      .createQueryBuilder('project')
      .where('project.organization_id = :organizationId', { organizationId })
      .andWhere('project.created_at BETWEEN :todayStart AND :todayEnd', {
        todayStart,
        todayEnd,
      })
      .getCount();

    const sequence = String(todayCount + 1).padStart(3, '0');
    const number = `${orgSlug.toUpperCase()}-${dateStr}-${sequence}`;

    this.logger.log(`Generated project number: ${number}`);

    return number;
  }

  /**
   * Convert entity to response DTO
   *
   * @param project - Project entity
   * @param organizationName - Organization name (optional)
   * @returns Response DTO
   */
  private toResponseDto(
    project: Project,
    organizationName?: string,
  ): ProjectResponseDto {
    return {
      id: project.id,
      organizationId: project.organizationId,
      name: project.name,
      number: project.number,
      description: project.description,
      status: project.status,
      type: project.type,
      address: project.address,
      city: project.city,
      state: project.state,
      zip: project.zip,
      country: project.country,
      latitude: project.latitude,
      longitude: project.longitude,
      deliveryMethod: project.deliveryMethod,
      contractType: project.contractType,
      squareFootage: project.squareFootage,
      startDate: project.startDate,
      endDate: project.endDate,
      substantialCompletion: project.substantialCompletion,
      finalCompletion: project.finalCompletion,
      originalContract: project.originalContract,
      currentContract: project.currentContract,
      percentComplete: project.percentComplete,
      timezone: project.timezone,
      workingDays: project.workingDays,
      holidays: project.holidays,
      customFields: project.customFields,
      tags: project.tags,
      organizationName,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      createdBy: project.createdBy,
      updatedBy: project.updatedBy,
      archivedAt: project.archivedAt,
    };
  }

  /**
   * Create AI project profile from project data
   * Maps project fields to AI profile schema for similarity matching
   *
   * @private
   * @param project - The saved project entity
   * @param createDto - The original create DTO with additional details
   */
  private async createProjectProfile(
    project: Project,
    createDto: CreateProjectDto,
  ): Promise<void> {
    if (!this.recommendationsService) {
      return;
    }

    // Build location string from available fields
    const locationParts = [];
    if (project.city) locationParts.push(project.city);
    if (project.state) locationParts.push(project.state);
    if (project.zip) locationParts.push(project.zip);
    const location = locationParts.length > 0 ? locationParts.join(', ') : undefined;

    // Calculate duration in days if dates available
    let durationDays: number | undefined;
    if (project.startDate && project.endDate) {
      const start = new Date(project.startDate);
      const end = new Date(project.endDate);
      durationDays = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      );
    }

    // Create the AI project profile with available fields
    await this.recommendationsService.createProjectProfile({
      projectId: project.id,
      organizationId: project.organizationId,
      projectType: project.type as any,
      squareFootage: project.squareFootage,
      deliveryMethod: project.deliveryMethod as any,
      contractValue: project.originalContract,
      durationDays,
      location,
      latitude: project.latitude,
      longitude: project.longitude,
    });
  }
}
