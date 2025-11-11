/**
 * Organization Cascade Controller
 *
 * Handles organization deletion and restoration with cascading effects
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
import { OrganizationCascadeService } from '../services/organization-cascade.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { DeleteOrganizationDto, RestoreOrganizationDto } from '../dto';

/**
 * Organization Cascade Controller
 *
 * Provides endpoints for cascading organization operations:
 * - DELETE /organizations/:orgId - Delete organization with cascade
 * - POST /organizations/:orgId/restore - Restore soft-deleted organization
 * - GET /organizations/:orgId/deletion-impact - Preview deletion impact
 */
@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationCascadeController {
  constructor(
    private readonly orgCascadeService: OrganizationCascadeService,
  ) {}

  /**
   * Get deletion impact preview
   *
   * Shows what would be affected if organization is deleted
   */
  @Get(':orgId/deletion-impact')
  async getDeletionImpact(@Param('orgId') orgId: string) {
    return this.orgCascadeService.getDeletionImpact(orgId);
  }

  /**
   * Delete organization with cascading effects
   *
   * Deletes all projects in the organization and removes all members
   * Can soft delete (mark as inactive) or hard delete (permanent removal)
   *
   * @throws ForbiddenException if user is not an organization owner
   * @throws NotFoundException if organization not found
   */
  @Delete(':orgId')
  @HttpCode(HttpStatus.OK)
  async deleteOrganization(
    @Param('orgId') orgId: string,
    @Body() dto: DeleteOrganizationDto,
    @CurrentUser() user: User,
  ) {
    // Perform deletion
    const result = await this.orgCascadeService.deleteOrganization(orgId, {
      deletedBy: user.id,
      reason: dto.reason,
      softDelete: dto.softDelete ?? true, // Default to soft delete
    });

    return {
      message: 'Organization deleted successfully',
      ...result,
    };
  }

  /**
   * Restore a soft-deleted organization
   *
   * @throws BadRequestException if organization is not deleted
   * @throws NotFoundException if organization not found
   */
  @Post(':orgId/restore')
  @HttpCode(HttpStatus.OK)
  async restoreOrganization(
    @Param('orgId') orgId: string,
    @Body() dto: RestoreOrganizationDto,
    @CurrentUser() user: User,
  ) {
    await this.orgCascadeService.restoreOrganization(orgId, {
      restoredBy: user.id,
      reason: dto.reason,
    });

    return {
      message: 'Organization restored successfully',
      organizationId: orgId,
    };
  }
}
