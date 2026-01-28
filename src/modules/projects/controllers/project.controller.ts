import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ParseBoolPipe,
  ParseEnumPipe,
  DefaultValuePipe,
  Req,
} from '@nestjs/common';
import { ProjectService } from '../services/project.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectResponseDto,
} from '../dto';
import { ProjectStatus } from '../enums/project-status.enum';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Request } from 'express';

/**
 * Project Controller
 *
 * Handles all project-related HTTP endpoints:
 * - Create new projects
 * - List projects (all, user-specific, org-specific, filtered by status)
 * - Get project details by ID or code
 * - Update project information
 * - Update project status
 * - Delete/cancel projects
 * - Restore cancelled projects
 *
 * All endpoints require authentication (JwtAuthGuard)
 * RBAC permissions will be added in a subsequent step
 */
@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  /**
   * Create a new project
   *
   * POST /projects
   *
   * Creates a new project and automatically adds the creator as PROJECT_ADMIN.
   *
   * @param createDto - Project creation data
   * @param req - Request with authenticated user
   * @returns Created project
   *
   * @example
   * Request:
   * ```json
   * {
   *   "organizationId": "uuid",
   *   "name": "Downtown Office Tower",
   *   "code": "NYC-TOWER-2024",
   *   "description": "20-story mixed-use building",
   *   "location": "123 Main St, New York, NY",
   *   "startDate": "2024-01-15",
   *   "endDate": "2025-06-30"
   * }
   * ```
   *
   * Success Response (201):
   * ```json
   * {
   *   "id": "uuid",
   *   "organizationId": "uuid",
   *   "name": "Downtown Office Tower",
   *   "code": "NYC-TOWER-2024",
   *   "status": "planning",
   *   "createdAt": "2024-01-01T00:00:00.000Z"
   * }
   * ```
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateProjectDto,
    @Req() req: Request,
  ): Promise<ProjectResponseDto> {
    const userId = (req as any).user.id;
    return this.projectService.create(createDto, userId);
  }

  /**
   * List all projects
   *
   * GET /projects
   *
   * Returns all projects the user has access to.
   * Optionally filter by organization, status, or archived status.
   * Supports server-side search, sorting, and pagination.
   *
   * @param myProjects - If true, only return projects the user is a member of
   * @param organizationId - Filter to specific organization
   * @param status - Filter to specific status
   * @param includeArchived - Include archived projects (default: false)
   * @param search - Search by project name, number, address, city, state
   * @param sortBy - Sort by 'name', 'updated', or 'created' (default: 'created')
   * @param limit - Max results to return (default: 50, max: 100)
   * @param offset - Number of results to skip (for pagination)
   * @param req - Request with authenticated user
   * @returns Array of projects
   *
   * @example
   * Request:
   * ```
   * GET /projects?myProjects=true&search=tower&status=active&sortBy=updated&limit=10
   * ```
   *
   * Success Response (200):
   * ```json
   * [
   *   {
   *     "id": "uuid",
   *     "organizationId": "uuid",
   *     "organizationName": "Acme Construction",
   *     "name": "Downtown Office Tower",
   *     "code": "NYC-TOWER-2024",
   *     "status": "active",
   *     "location": "123 Main St, New York, NY",
   *     "startDate": "2024-01-15",
   *     "endDate": "2025-06-30"
   *   }
   * ]
   * ```
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('myProjects', new DefaultValuePipe(true), ParseBoolPipe)
    myProjects: boolean,
    @Query('organizationId') organizationId?: string,
    @Query(
      'status',
      new DefaultValuePipe(undefined),
      new ParseEnumPipe(ProjectStatus, { optional: true }),
    )
    status?: ProjectStatus,
    @Query('includeArchived', new DefaultValuePipe(false), ParseBoolPipe)
    includeArchived?: boolean,
    @Query('search') search?: string,
    @Query('sortBy', new DefaultValuePipe('created')) sortBy?: string,
    @Query('limit', new DefaultValuePipe(50)) limit?: number,
    @Query('offset', new DefaultValuePipe(0)) offset?: number,
    @Req() req?: Request,
  ): Promise<ProjectResponseDto[]> {
    const userId = myProjects ? (req as any).user.id : undefined;
    console.log(`[ProjectController] findAll - myProjects: ${myProjects}, userId: ${userId}, organizationId: ${organizationId}, status: ${status}, includeArchived: ${includeArchived}, search: ${search}, sortBy: ${sortBy}, limit: ${limit}, offset: ${offset}`);
    return this.projectService.findAll(
      userId,
      organizationId,
      status,
      includeArchived,
      search,
      sortBy,
      limit,
      offset,
    );
  }

  /**
   * Get project by ID
   *
   * GET /projects/:id
   *
   * Returns detailed information about a specific project.
   *
   * @param id - Project ID
   * @param includeCounts - Whether to include member counts
   * @returns Project details
   *
   * @example
   * Request:
   * ```
   * GET /projects/uuid?includeCounts=true
   * ```
   *
   * Success Response (200):
   * ```json
   * {
   *   "id": "uuid",
   *   "organizationId": "uuid",
   *   "organizationName": "Acme Construction",
   *   "name": "Downtown Office Tower",
   *   "code": "NYC-TOWER-2024",
   *   "description": "20-story mixed-use building",
   *   "status": "active",
   *   "location": "123 Main St, New York, NY",
   *   "startDate": "2024-01-15",
   *   "endDate": "2025-06-30",
   *   "memberCount": 12,
   *   "settings": {},
   *   "createdAt": "2024-01-01T00:00:00.000Z",
   *   "updatedAt": "2024-01-01T00:00:00.000Z"
   * }
   * ```
   *
   * Error Response (404):
   * ```json
   * {
   *   "statusCode": 404,
   *   "message": "Project with ID uuid not found",
   *   "error": "Not Found"
   * }
   * ```
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeCounts', new DefaultValuePipe(false), ParseBoolPipe)
    includeCounts: boolean,
  ): Promise<ProjectResponseDto> {
    return this.projectService.findOne(id, includeCounts);
  }

  /**
   * Get project by code
   *
   * GET /projects/by-code/:organizationId/:code
   *
   * Returns project details by organization and code.
   * Useful for URL-friendly project access.
   *
   * @param organizationId - Organization ID
   * @param code - Project code
   * @returns Project details
   *
   * @example
   * Request:
   * ```
   * GET /projects/by-code/uuid/NYC-TOWER-2024
   * ```
   *
   * Success Response (200):
   * ```json
   * {
   *   "id": "uuid",
   *   "name": "Downtown Office Tower",
   *   "code": "NYC-TOWER-2024",
   *   "status": "active"
   * }
   * ```
   */
  @Get('by-number/:organizationId/:number')
  @HttpCode(HttpStatus.OK)
  async findByNumber(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('number') number: string,
  ): Promise<ProjectResponseDto> {
    return this.projectService.findByNumber(organizationId, number);
  }

  /**
   * Update project
   *
   * PATCH /projects/:id
   *
   * Updates an existing project's information.
   * Requires PROJECT_ADMIN or PROJECT_MANAGER role.
   *
   * @param id - Project ID
   * @param updateDto - Update data
   * @returns Updated project
   *
   * @example
   * Request:
   * ```json
   * {
   *   "name": "Downtown Office Tower - Phase 2",
   *   "endDate": "2025-12-31",
   *   "status": "active"
   * }
   * ```
   *
   * Success Response (200):
   * ```json
   * {
   *   "id": "uuid",
   *   "name": "Downtown Office Tower - Phase 2",
   *   "endDate": "2025-12-31",
   *   "status": "active",
   *   "updatedAt": "2024-01-02T00:00:00.000Z"
   * }
   * ```
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.projectService.update(id, updateDto);
  }

  /**
   * Update project status
   *
   * PATCH /projects/:id/status
   *
   * Updates only the project status.
   * Convenience endpoint for status transitions.
   *
   * @param id - Project ID
   * @param status - New status
   * @returns Updated project
   *
   * @example
   * Request:
   * ```json
   * {
   *   "status": "active"
   * }
   * ```
   *
   * Success Response (200):
   * ```json
   * {
   *   "id": "uuid",
   *   "status": "active",
   *   "updatedAt": "2024-01-02T00:00:00.000Z"
   * }
   * ```
   */
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status', new ParseEnumPipe(ProjectStatus)) status: ProjectStatus,
  ): Promise<ProjectResponseDto> {
    return this.projectService.updateStatus(id, status);
  }

  /**
   * Delete project
   *
   * DELETE /projects/:id
   *
   * Soft-deletes a project by setting status to CANCELLED.
   * Hard delete removes the project permanently.
   * Requires PROJECT_ADMIN role.
   *
   * @param id - Project ID
   * @param hardDelete - Whether to permanently delete (requires system admin)
   *
   * @example
   * Request:
   * ```
   * DELETE /projects/uuid?hardDelete=false
   * ```
   *
   * Success Response (204):
   * No content
   *
   * Error Response (403):
   * ```json
   * {
   *   "statusCode": 403,
   *   "message": "Only project administrators can delete the project",
   *   "error": "Forbidden"
   * }
   * ```
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('hardDelete', new DefaultValuePipe(false), ParseBoolPipe)
    hardDelete: boolean,
  ): Promise<void> {
    await this.projectService.remove(id, hardDelete);
  }

  /**
   * Archive project
   *
   * POST /projects/:id/archive
   *
   * Archives a project by setting the archivedAt timestamp.
   * Archived projects can be filtered out from active project lists.
   * Requires PROJECT_ADMIN role.
   *
   * @param id - Project ID
   * @returns Archived project
   *
   * Success Response (200):
   * ```json
   * {
   *   "id": "uuid",
   *   "archivedAt": "2024-01-03T00:00:00.000Z",
   *   "updatedAt": "2024-01-03T00:00:00.000Z"
   * }
   * ```
   */
  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  async archive(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProjectResponseDto> {
    return this.projectService.archive(id);
  }

  /**
   * Unarchive project
   *
   * POST /projects/:id/unarchive
   *
   * Unarchives a project by clearing the archivedAt timestamp.
   * Requires PROJECT_ADMIN role.
   *
   * @param id - Project ID
   * @returns Unarchived project
   *
   * Success Response (200):
   * ```json
   * {
   *   "id": "uuid",
   *   "archivedAt": null,
   *   "updatedAt": "2024-01-03T00:00:00.000Z"
   * }
   * ```
   */
  @Post(':id/unarchive')
  @HttpCode(HttpStatus.OK)
  async unarchive(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProjectResponseDto> {
    return this.projectService.unarchive(id);
  }

  /**
   * Restore cancelled project
   *
   * POST /projects/:id/restore
   *
   * Changes project status from CANCELLED back to PLANNING or specified status.
   * Requires PROJECT_ADMIN role.
   *
   * @param id - Project ID
   * @param newStatus - Status to restore to (default: PLANNING)
   * @returns Restored project
   *
   * @example
   * Request:
   * ```json
   * {
   *   "status": "planning"
   * }
   * ```
   *
   * Success Response (200):
   * ```json
   * {
   *   "id": "uuid",
   *   "status": "planning",
   *   "updatedAt": "2024-01-03T00:00:00.000Z"
   * }
   * ```
   */
  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  async restore(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(
      'status',
      new DefaultValuePipe(ProjectStatus.BIDDING),
      new ParseEnumPipe(ProjectStatus),
    )
    newStatus: ProjectStatus,
  ): Promise<ProjectResponseDto> {
    return this.projectService.restore(id, newStatus);
  }
}
