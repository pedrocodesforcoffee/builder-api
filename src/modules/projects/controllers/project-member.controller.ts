import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProjectMemberService } from '../services/project-member.service';
import { AddProjectMemberDto } from '../dto/members/add-project-member.dto';
import { UpdateProjectMemberDto } from '../dto/members/update-project-member.dto';
import { ProjectMember } from '../entities/project-member.entity';

/**
 * Controller for managing project team members
 */
@ApiTags('Project Members')
@Controller('projects/:projectId/members')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProjectMemberController {
  constructor(private readonly memberService: ProjectMemberService) {}

  /**
   * List all team members for a project
   */
  @Get()
  @ApiOperation({
    summary: 'List project team members',
    description: 'Get all team members assigned to a project with their user details',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'List of project team members',
    type: [ProjectMember],
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  async listMembers(
    @Param('projectId') projectId: string,
  ): Promise<ProjectMember[]> {
    return this.memberService.listMembers(projectId);
  }

  /**
   * Add a team member to a project
   */
  @Post()
  @ApiOperation({
    summary: 'Add team member to project',
    description: 'Add a user to a project with a specific role. Supports adding by userId or email.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 201,
    description: 'Team member added successfully',
    type: ProjectMember,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input - missing userId or email',
  })
  @ApiResponse({
    status: 404,
    description: 'Project or user not found',
  })
  @ApiResponse({
    status: 409,
    description: 'User is already a member of this project',
  })
  async addMember(
    @Param('projectId') projectId: string,
    @Body() dto: AddProjectMemberDto,
  ): Promise<ProjectMember> {
    return this.memberService.addMember(projectId, dto);
  }

  /**
   * Get a specific team member
   */
  @Get(':userId')
  @ApiOperation({
    summary: 'Get team member details',
    description: 'Get details of a specific team member',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiResponse({
    status: 200,
    description: 'Team member details',
    type: ProjectMember,
  })
  @ApiResponse({
    status: 404,
    description: 'Team member not found',
  })
  async getMember(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
  ): Promise<ProjectMember> {
    return this.memberService.getMember(projectId, userId);
  }

  /**
   * Update a team member's role
   */
  @Patch(':userId')
  @ApiOperation({
    summary: 'Update team member role',
    description: 'Update the role of a team member in the project',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiResponse({
    status: 200,
    description: 'Team member role updated successfully',
    type: ProjectMember,
  })
  @ApiResponse({
    status: 404,
    description: 'Team member not found',
  })
  async updateMember(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateProjectMemberDto,
  ): Promise<ProjectMember> {
    return this.memberService.updateMember(projectId, userId, dto);
  }

  /**
   * Remove a team member from a project
   */
  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove team member from project',
    description: 'Remove a user from the project team',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiResponse({
    status: 204,
    description: 'Team member removed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Team member not found',
  })
  async removeMember(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
  ): Promise<void> {
    return this.memberService.removeMember(projectId, userId);
  }
}
