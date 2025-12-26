import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProjectMembershipService } from '../services/project-membership.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import {
  AddProjectMemberDto,
  UpdateProjectMemberDto,
  RemoveMemberDto,
} from '../dto';

/**
 * Project Membership Controller
 *
 * Handles CRUD operations for project memberships with scope and expiration support
 */
@Controller('projects/:projectId/members')
@UseGuards(JwtAuthGuard)
export class ProjectMembershipController {
  constructor(
    private readonly membershipService: ProjectMembershipService,
  ) {}

  /**
   * Add project member
   */
  @Post()
  async addMember(
    @Param('projectId') projectId: string,
    @Body() dto: AddProjectMemberDto,
    @CurrentUser() user: User,
  ) {
    return this.membershipService.addProjectMember(projectId, dto, user.id);
  }

  /**
   * List project members
   */
  @Get()
  async listMembers(
    @Param('projectId') projectId: string,
    @Query('role') role?: string,
    @Query('roleCategory') roleCategory?: string,
    @Query('search') search?: string,
    @Query('scopeStatus') scopeStatus?: string,
    @Query('expirationStatus') expirationStatus?: string,
    @Query('includeInherited') includeInherited?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: User,
  ) {
    return this.membershipService.listProjectMembers(projectId, {
      role,
      roleCategory,
      search,
      scopeStatus,
      expirationStatus,
      includeInherited: includeInherited === 'true',
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      requestingUserId: user?.id,
    });
  }

  /**
   * Update project member
   */
  @Patch(':userId')
  async updateMember(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateProjectMemberDto,
    @CurrentUser() user: User,
  ) {
    return this.membershipService.updateProjectMember(
      projectId,
      userId,
      dto,
      user.id,
    );
  }

  /**
   * Remove project member
   */
  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
    @Body() dto: RemoveMemberDto,
    @CurrentUser() user?: User,
  ) {
    await this.membershipService.removeProjectMember(
      projectId,
      userId,
      user?.id || '',
      dto,
    );
  }
}
