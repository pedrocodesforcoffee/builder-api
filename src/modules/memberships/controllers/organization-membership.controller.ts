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
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { OrganizationMembershipService } from '../services/organization-membership.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import {
  AddOrganizationMemberDto,
  UpdateOrganizationMemberDto,
} from '../dto';

/**
 * Organization Membership Controller
 *
 * Handles CRUD operations for organization memberships
 */
@Controller('organizations/:orgId/members')
@UseGuards(JwtAuthGuard)
export class OrganizationMembershipController {
  constructor(
    private readonly membershipService: OrganizationMembershipService,
  ) {}

  /**
   * Add organization member
   */
  @Post()
  async addMember(
    @Param('orgId') orgId: string,
    @Body() dto: AddOrganizationMemberDto,
    @CurrentUser() user: User,
  ) {
    return this.membershipService.addOrganizationMember(orgId, dto, user.id);
  }

  /**
   * List organization members
   */
  @Get()
  async listMembers(
    @Param('orgId') orgId: string,
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: User,
  ) {
    return this.membershipService.listOrganizationMembers(orgId, {
      role,
      search,
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      requestingUserId: user?.id,
    });
  }

  /**
   * Update organization member role
   */
  @Patch(':userId')
  async updateMemberRole(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateOrganizationMemberDto,
    @CurrentUser() user: User,
  ) {
    return this.membershipService.updateOrganizationMemberRole(
      orgId,
      userId,
      dto,
      user.id,
    );
  }

  /**
   * Remove organization member
   */
  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @Query('removeFromProjects') removeFromProjects?: string,
    @CurrentUser() user?: User,
  ) {
    await this.membershipService.removeOrganizationMember(
      orgId,
      userId,
      user?.id || '',
      removeFromProjects === 'true',
    );
  }
}
