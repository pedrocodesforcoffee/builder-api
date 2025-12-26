import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { WorkerProfileService } from '../services/worker-profile.service';
import {
  CreateWorkerProfileDto,
  UpdateWorkerProfileDto,
  QueryWorkerProfileDto,
  WorkerProfileResponseDto,
} from '../dto/worker-profile.dto';
import { WorkerProfile } from '../entities/worker-profile.entity';

/**
 * WorkerProfileController
 *
 * Manages worker employment profiles:
 * - Link users to employment information
 * - Configure hourly rates and overtime rules
 * - Track union membership and certifications
 * - Manage project assignments
 */
@ApiTags('Worker Profiles')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
export class WorkerProfileController {
  constructor(private readonly workerProfileService: WorkerProfileService) {}

  /**
   * Create a new worker profile
   */
  @Post('v1/organizations/:organizationId/workers')
  @ApiOperation({ summary: 'Create a new worker profile' })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Worker profile created successfully',
    type: WorkerProfile,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid worker profile data' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Worker profile already exists for this user' })
  async create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: CreateWorkerProfileDto,
    @CurrentUser('id') userId: string,
  ): Promise<WorkerProfileResponseDto> {
    const workerProfile = await this.workerProfileService.create({ ...dto, organizationId }, userId);
    return this.workerProfileService.mapToResponseDto(workerProfile);
  }

  /**
   * Get all worker profiles with optional filters
   */
  @Get('v1/workers')
  @ApiOperation({
    summary: 'Get all worker profiles',
    description: 'Query worker profiles with filters for project, organization, trade, employment type, etc.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of worker profiles',
  })
  async findAll(@Query() query: QueryWorkerProfileDto): Promise<{
    data: WorkerProfileResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const result = await this.workerProfileService.findAll(query);
    return {
      ...result,
      data: result.data.map((wp) => this.workerProfileService.mapToResponseDto(wp)),
    };
  }

  /**
   * Get a specific worker profile by ID
   */
  @Get('v1/workers/:id')
  @ApiOperation({ summary: 'Get a specific worker profile by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Worker profile details',
    type: WorkerProfile,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Worker profile not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<WorkerProfileResponseDto> {
    const workerProfile = await this.workerProfileService.findOne(id);
    return this.workerProfileService.mapToResponseDto(workerProfile);
  }

  /**
   * Get worker profile by user ID
   */
  @Get('v1/users/:userId/worker-profile')
  @ApiOperation({ summary: 'Get worker profile by user ID' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Worker profile details',
    type: WorkerProfile,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Worker profile not found' })
  async findByUserId(@Param('userId', ParseUUIDPipe) userId: string): Promise<WorkerProfileResponseDto | null> {
    const workerProfile = await this.workerProfileService.findByUserId(userId);
    return workerProfile ? this.workerProfileService.mapToResponseDto(workerProfile) : null;
  }

  /**
   * Update a worker profile
   */
  @Put('v1/workers/:id')
  @ApiOperation({ summary: 'Update a worker profile' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Worker profile updated successfully',
    type: WorkerProfile,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Worker profile not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid update data' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkerProfileDto,
  ): Promise<WorkerProfileResponseDto> {
    const workerProfile = await this.workerProfileService.update(id, dto);
    return this.workerProfileService.mapToResponseDto(workerProfile);
  }

  /**
   * Deactivate a worker profile (soft delete)
   */
  @Delete('v1/workers/:id')
  @ApiOperation({ summary: 'Deactivate a worker profile (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Worker profile deactivated successfully',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Worker profile not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    await this.workerProfileService.remove(id);
    return { message: 'Worker profile deactivated successfully' };
  }

  /**
   * Reactivate a worker profile
   */
  @Post('v1/workers/:id/reactivate')
  @ApiOperation({ summary: 'Reactivate a worker profile' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Worker profile reactivated successfully',
    type: WorkerProfile,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Worker profile not found' })
  async reactivate(@Param('id', ParseUUIDPipe) id: string): Promise<WorkerProfileResponseDto> {
    const workerProfile = await this.workerProfileService.reactivate(id);
    return this.workerProfileService.mapToResponseDto(workerProfile);
  }

  /**
   * Get all workers for a specific project
   */
  @Get('v1/projects/:projectId/workers')
  @ApiOperation({
    summary: 'Get all workers for a specific project',
    description: 'Returns all worker profiles assigned to a project',
  })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of workers for the project',
    type: [WorkerProfile],
  })
  async getProjectWorkers(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('activeOnly') activeOnly?: string,
  ): Promise<WorkerProfileResponseDto[]> {
    const active = activeOnly === 'false' ? false : true;
    const workers = await this.workerProfileService.getProjectWorkers(projectId, active);
    return workers.map((wp) => this.workerProfileService.mapToResponseDto(wp));
  }

  /**
   * Get all workers for a specific organization
   */
  @Get('v1/organizations/:organizationId/workers')
  @ApiOperation({
    summary: 'Get all workers for a specific organization',
    description: 'Returns all worker profiles belonging to an organization',
  })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of workers for the organization',
    type: [WorkerProfile],
  })
  async getOrganizationWorkers(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('activeOnly') activeOnly?: string,
  ): Promise<WorkerProfileResponseDto[]> {
    const active = activeOnly === 'false' ? false : true;
    const workers = await this.workerProfileService.getOrganizationWorkers(organizationId, active);
    return workers.map((wp) => this.workerProfileService.mapToResponseDto(wp));
  }

  /**
   * Get workers by trade
   */
  @Get('v1/workers/by-trade/:trade')
  @ApiOperation({
    summary: 'Get workers by trade',
    description: 'Search for workers by trade (e.g., Electrician, Carpenter, Plumber)',
  })
  @ApiParam({ name: 'trade', type: 'string', description: 'Trade name or partial match' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of workers matching the trade',
    type: [WorkerProfile],
  })
  async getWorkersByTrade(
    @Param('trade') trade: string,
    @Query('activeOnly') activeOnly?: string,
  ): Promise<WorkerProfileResponseDto[]> {
    const active = activeOnly === 'false' ? false : true;
    const workers = await this.workerProfileService.getWorkersByTrade(trade, active);
    return workers.map((wp) => this.workerProfileService.mapToResponseDto(wp));
  }
}
