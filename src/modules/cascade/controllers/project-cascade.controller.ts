/**
 * Project Cascade Controller
 *
 * Handles project deletion and restoration with cascading effects
 */

import {
  Controller,
  Delete,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProjectCascadeService } from '../services/project-cascade.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { DeleteProjectDto, RestoreProjectDto } from '../dto';

/**
 * Project Cascade Controller
 *
 * Provides endpoints for cascading project operations:
 * - DELETE /projects/:projectId - Delete project with cascade
 * - POST /projects/:projectId/restore - Restore soft-deleted project
 * - GET /projects/:projectId/deletion-impact - Preview deletion impact
 * - GET /projects/:projectId/validate-deletion - Validate if project can be deleted
 */
@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectCascadeController {
  constructor(
    private readonly projectCascadeService: ProjectCascadeService,
  ) {}

  /**
   * Get deletion impact preview
   *
   * Shows what would be affected if project is deleted
   */
  @Get(':projectId/deletion-impact')
  async getDeletionImpact(@Param('projectId') projectId: string) {
    return this.projectCascadeService.getDeletionImpact(projectId);
  }

  /**
   * Validate if project can be deleted
   *
   * Checks for warnings about active resources
   */
  @Get(':projectId/validate-deletion')
  async validateDeletion(@Param('projectId') projectId: string) {
    return this.projectCascadeService.validateDeletion(projectId);
  }

  /**
   * Delete project with cascading effects
   *
   * Removes all members and handles all project resources
   * Can soft delete (mark as inactive) or hard delete (permanent removal)
   *
   * @throws ForbiddenException if user doesn't have permission to delete
   * @throws NotFoundException if project not found
   */
  @Delete(':projectId')
  @HttpCode(HttpStatus.OK)
  async deleteProject(
    @Param('projectId') projectId: string,
    @Body() dto: DeleteProjectDto,
    @CurrentUser() user: User,
  ) {
    // Perform deletion
    const result = await this.projectCascadeService.deleteProject(projectId, {
      deletedBy: user.id,
      reason: dto.reason,
      softDelete: dto.softDelete ?? true, // Default to soft delete
    });

    return {
      message: 'Project deleted successfully',
      ...result,
    };
  }

  /**
   * Restore a soft-deleted project
   *
   * @throws BadRequestException if project is not deleted or parent organization is deleted
   * @throws NotFoundException if project not found
   */
  @Post(':projectId/restore')
  @HttpCode(HttpStatus.OK)
  async restoreProject(
    @Param('projectId') projectId: string,
    @Body() dto: RestoreProjectDto,
    @CurrentUser() user: User,
  ) {
    await this.projectCascadeService.restoreProject(projectId, {
      restoredBy: user.id,
      reason: dto.reason,
    });

    return {
      message: 'Project restored successfully',
      projectId,
    };
  }
}
