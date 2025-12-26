import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PermissionService } from '../services/permission.service';
import {
  AddProjectMemberDto,
  UpdateMemberRolesDto,
  ProjectMemberResponseDto,
} from '../dto/permission.dto';

/**
 * Project Member Controller
 *
 * Manages project membership and role assignments.
 *
 * Endpoints:
 * - GET    /projects/:projectId/members - List all members
 * - POST   /projects/:projectId/members - Add new member
 * - PUT    /projects/:projectId/members/:memberId/roles - Update member roles
 * - DELETE /projects/:projectId/members/:memberId - Remove member
 */
@Controller('projects/:projectId/members')
export class ProjectMemberController {
  constructor(private readonly permissionService: PermissionService) {}

  /**
   * List all project members
   */
  @Get()
  async getProjectMembers(
    @Param('projectId') projectId: string,
    @Request() req: any,
  ): Promise<ProjectMemberResponseDto[]> {
    const userId = req.user.id;

    // Verify user is project member
    await this.permissionService.getMemberByUserId(userId, projectId);

    const members = await this.permissionService.getProjectMembers(projectId);

    return members.map(m => ({
      id: m.id,
      projectId: m.projectId,
      userId: m.userId || undefined,
      inviteEmail: m.inviteEmail || undefined,
      roles: m.roles as any,
      disciplines: (m.disciplines || undefined) as any,
      company: m.company || undefined,
      title: m.title || undefined,
      status: m.status,
      accessExpiresAt: m.accessExpiresAt || undefined,
      joinedAt: m.joinedAt || undefined,
      createdAt: m.createdAt,
    }));
  }

  /**
   * Add new project member
   */
  @Post()
  async addMember(
    @Param('projectId') projectId: string,
    @Body() dto: AddProjectMemberDto,
    @Request() req: any,
  ): Promise<ProjectMemberResponseDto> {
    const userId = req.user.id;

    // Verify user is owner or admin
    const isOwnerOrAdmin = await this.permissionService.isProjectOwnerOrAdmin(
      userId,
      projectId,
    );

    if (!isOwnerOrAdmin) {
      throw new Error('Only project owners/admins can add members');
    }

    const member = await this.permissionService.addProjectMember({
      projectId,
      userId: dto.userId,
      inviteEmail: dto.inviteEmail,
      roles: dto.roles,
      disciplines: dto.disciplines,
      company: dto.company,
      title: dto.title,
      invitedById: userId,
      accessExpiresAt: dto.accessExpiresAt,
    });

    return {
      id: member.id,
      projectId: member.projectId,
      userId: member.userId || undefined,
      inviteEmail: member.inviteEmail || undefined,
      roles: member.roles as any,
      disciplines: (member.disciplines || undefined) as any,
      company: member.company || undefined,
      title: member.title || undefined,
      status: member.status,
      accessExpiresAt: member.accessExpiresAt || undefined,
      joinedAt: member.joinedAt || undefined,
      createdAt: member.createdAt,
    };
  }

  /**
   * Update member roles
   */
  @Put(':memberId/roles')
  async updateMemberRoles(
    @Param('projectId') projectId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRolesDto,
    @Request() req: any,
  ): Promise<ProjectMemberResponseDto> {
    const userId = req.user.id;

    // Verify user is owner or admin
    const isOwnerOrAdmin = await this.permissionService.isProjectOwnerOrAdmin(
      userId,
      projectId,
    );

    if (!isOwnerOrAdmin) {
      throw new Error('Only project owners/admins can update member roles');
    }

    const member = await this.permissionService.updateMemberRoles(
      memberId,
      dto.roles,
      dto.disciplines,
    );

    return {
      id: member.id,
      projectId: member.projectId,
      userId: member.userId || undefined,
      inviteEmail: member.inviteEmail || undefined,
      roles: member.roles as any,
      disciplines: (member.disciplines || undefined) as any,
      company: member.company || undefined,
      title: member.title || undefined,
      status: member.status,
      accessExpiresAt: member.accessExpiresAt || undefined,
      joinedAt: member.joinedAt || undefined,
      createdAt: member.createdAt,
    };
  }

  /**
   * Remove project member
   */
  @Delete(':memberId')
  async removeMember(
    @Param('projectId') projectId: string,
    @Param('memberId') memberId: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    const userId = req.user.id;

    // Verify user is owner or admin
    const isOwnerOrAdmin = await this.permissionService.isProjectOwnerOrAdmin(
      userId,
      projectId,
    );

    if (!isOwnerOrAdmin) {
      throw new Error('Only project owners/admins can remove members');
    }

    await this.permissionService.removeMember(memberId);

    return { message: 'Member removed successfully' };
  }
}
