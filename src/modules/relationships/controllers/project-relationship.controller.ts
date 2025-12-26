import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProjectRelationshipService } from '../services/project-relationship.service';
import { CreateRelationshipDto } from '../dto/create-relationship.dto';
import { ProjectRelationship } from '../entities/project-relationship.entity';
import { Project } from '../../projects/entities/project.entity';

@ApiTags('Project Relationships')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/projects/:projectId/relationships')
export class ProjectRelationshipController {
  constructor(
    private readonly relationshipService: ProjectRelationshipService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a project relationship' })
  @ApiParam({ name: 'projectId', description: 'Source project ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Relationship created successfully',
    type: ProjectRelationship,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid relationship data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Relationship already exists or would create circular dependency',
  })
  async create(
    @Param('projectId') projectId: string,
    @Body() createRelationshipDto: CreateRelationshipDto,
    @Req() req: Request,
  ): Promise<ProjectRelationship> {
    const userId = (req as any).user.sub || (req as any).user.id;
    return await this.relationshipService.create(
      projectId,
      createRelationshipDto.targetProjectId,
      createRelationshipDto.relationshipType,
      userId,
      createRelationshipDto.metadata,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all relationships for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of project relationships',
    type: [ProjectRelationship],
  })
  async findAll(@Param('projectId') projectId: string): Promise<ProjectRelationship[]> {
    return await this.relationshipService.findByProject(projectId);
  }

  @Get('parent')
  @ApiOperation({ summary: 'Get parent project' })
  @ApiParam({ name: 'projectId', description: 'Child project ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Parent project',
    type: Project,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No parent project found',
  })
  async getParent(@Param('projectId') projectId: string): Promise<Project | null> {
    return await this.relationshipService.getParent(projectId);
  }

  @Post('parent')
  @ApiOperation({ summary: 'Set parent project' })
  @ApiParam({ name: 'projectId', description: 'Child project ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Parent relationship created',
    type: ProjectRelationship,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot create parent relationship - would create circular dependency',
  })
  async setParent(
    @Param('projectId') projectId: string,
    @Body('parentId') parentId: string,
    @Req() req: Request,
  ): Promise<ProjectRelationship> {
    const userId = (req as any).user.sub || (req as any).user.id;
    return await this.relationshipService.setParent(projectId, parentId, userId);
  }

  @Get('children')
  @ApiOperation({ summary: 'Get child projects' })
  @ApiParam({ name: 'projectId', description: 'Parent project ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of child projects',
    type: [Project],
  })
  async getChildren(@Param('projectId') projectId: string): Promise<Project[]> {
    return await this.relationshipService.getChildren(projectId);
  }

  @Get('ancestors')
  @ApiOperation({ summary: 'Get all ancestor projects' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of ancestor projects (parents, grandparents, etc.)',
    type: [Project],
  })
  async getAncestors(@Param('projectId') projectId: string): Promise<Project[]> {
    return await this.relationshipService.getAncestors(projectId);
  }

  @Get('descendants')
  @ApiOperation({ summary: 'Get all descendant projects' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of descendant projects (children, grandchildren, etc.)',
    type: [Project],
  })
  async getDescendants(@Param('projectId') projectId: string): Promise<Project[]> {
    return await this.relationshipService.getDescendants(projectId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a relationship' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Relationship ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Relationship removed successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Relationship not found',
  })
  async remove(@Param('id') id: string): Promise<void> {
    await this.relationshipService.remove(id);
  }
}