import {
  Controller,
  Get,
  Post,
  Put,
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
import { ProjectDependencyService } from '../services/project-dependency.service';
import { DependencyImpactService } from '../services/dependency-impact.service';
import { DependencyNetworkService } from '../services/dependency-network.service';
import { CreateDependencyDto } from '../dto/create-dependency.dto';
import { UpdateDependencyDto } from '../dto/update-dependency.dto';
import { ProjectDependency } from '../entities/project-dependency.entity';
import { Project } from '../../projects/entities/project.entity';

@ApiTags('Project Dependencies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/projects/:projectId/dependencies')
export class ProjectDependencyController {
  constructor(
    private readonly dependencyService: ProjectDependencyService,
    private readonly impactService: DependencyImpactService,
    private readonly networkService: DependencyNetworkService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a project dependency' })
  @ApiParam({ name: 'projectId', description: 'Predecessor project ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Dependency created successfully',
    type: ProjectDependency,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid dependency or would create circular dependency',
  })
  async create(
    @Param('projectId') projectId: string,
    @Body() createDependencyDto: CreateDependencyDto,
    @Req() req: Request,
  ): Promise<ProjectDependency> {
    const userId = (req as any).user.sub || (req as any).user.id;
    return await this.dependencyService.create(projectId, createDependencyDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all dependencies for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of project dependencies',
    type: [ProjectDependency],
  })
  async findAll(@Param('projectId') projectId: string): Promise<ProjectDependency[]> {
    return await this.dependencyService.findAll(projectId);
  }

  @Get('predecessors')
  @ApiOperation({ summary: 'Get predecessor projects' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of predecessor projects',
    type: [Project],
  })
  async getPredecessors(@Param('projectId') projectId: string): Promise<Project[]> {
    return await this.dependencyService.getPredecessors(projectId);
  }

  @Get('successors')
  @ApiOperation({ summary: 'Get successor projects' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of successor projects',
    type: [Project],
  })
  async getSuccessors(@Param('projectId') projectId: string): Promise<Project[]> {
    return await this.dependencyService.getSuccessors(projectId);
  }

  @Get('critical-path')
  @ApiOperation({ summary: 'Get critical path for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Projects on the critical path',
    type: [Project],
  })
  async getCriticalPath(@Param('projectId') projectId: string): Promise<Project[]> {
    return await this.dependencyService.getCriticalPath(projectId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a dependency' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Dependency ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dependency updated successfully',
    type: ProjectDependency,
  })
  async update(
    @Param('id') id: string,
    @Body() updateDependencyDto: UpdateDependencyDto,
    @Req() req: Request,
  ): Promise<ProjectDependency> {
    const userId = (req as any).user.sub || (req as any).user.id;
    return await this.dependencyService.update(id, updateDependencyDto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a dependency' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Dependency ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Dependency deleted successfully',
  })
  async remove(@Param('id') id: string): Promise<void> {
    await this.dependencyService.remove(id);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate a potential dependency' })
  @ApiParam({ name: 'projectId', description: 'Predecessor project ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dependency validation result',
  })
  async validate(
    @Param('projectId') projectId: string,
    @Body('successorId') successorId: string,
  ): Promise<{ valid: boolean; reason?: string }> {
    return await this.dependencyService.validateDependency(projectId, successorId);
  }

  @Get('impact')
  @ApiOperation({ summary: 'Analyze dependency impact' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dependency impact analysis',
  })
  async analyzeImpact(@Param('projectId') projectId: string): Promise<any> {
    return await this.impactService.analyzeImpact(projectId);
  }

  @Get('network')
  @ApiOperation({ summary: 'Get dependency network' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dependency network visualization data',
  })
  async getNetwork(@Param('projectId') projectId: string): Promise<any> {
    // Get all related projects
    const dependencies = await this.dependencyService.findAll(projectId);
    const projectIds = new Set<string>([projectId]);

    dependencies.forEach(dep => {
      projectIds.add(dep.predecessorId);
      projectIds.add(dep.successorId);
    });

    return await this.networkService.buildNetwork(Array.from(projectIds));
  }
}