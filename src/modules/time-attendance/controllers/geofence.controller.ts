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
import { GeofenceService } from '../services/geofence.service';
import {
  CreateProjectGeofenceDto,
  UpdateProjectGeofenceDto,
  ValidateLocationDto,
  GeofenceValidationResultDto,
} from '../dto/geofence.dto';
import { ProjectGeofence } from '../entities/project-geofence.entity';

/**
 * GeofenceController
 *
 * Manages GPS geofencing for construction sites:
 * - Create circular or polygon geofences
 * - Validate GPS coordinates against geofences
 * - Enforce clock-in/out location restrictions
 */
@ApiTags('Geofences')
@ApiBearerAuth()
@Controller('v1/projects/:projectId/geofences')
@UseGuards(JwtAuthGuard)
export class GeofenceController {
  constructor(private readonly geofenceService: GeofenceService) {}

  /**
   * Create a new geofence for a project
   */
  @Post()
  @ApiOperation({ summary: 'Create a new geofence for a project' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Geofence created successfully',
    type: ProjectGeofence,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid geofence configuration' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateProjectGeofenceDto,
    @CurrentUser('id') userId: string,
  ): Promise<ProjectGeofence> {
    return await this.geofenceService.create(projectId, dto, userId);
  }

  /**
   * Get all geofences for a project
   */
  @Get()
  @ApiOperation({ summary: 'Get all geofences for a project' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of geofences',
    type: [ProjectGeofence],
  })
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('activeOnly') activeOnly?: string,
  ): Promise<ProjectGeofence[]> {
    const active = activeOnly === 'true' || activeOnly === undefined;
    return await this.geofenceService.findAll(projectId, active);
  }

  /**
   * Get a specific geofence by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific geofence by ID' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Geofence details',
    type: ProjectGeofence,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Geofence not found' })
  async findOne(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProjectGeofence> {
    return await this.geofenceService.findOne(id);
  }

  /**
   * Update a geofence
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a geofence' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Geofence updated successfully',
    type: ProjectGeofence,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Geofence not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid geofence configuration' })
  async update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectGeofenceDto,
  ): Promise<ProjectGeofence> {
    return await this.geofenceService.update(id, dto);
  }

  /**
   * Delete a geofence (soft delete)
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a geofence (soft delete)' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Geofence deleted successfully',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Geofence not found' })
  async remove(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.geofenceService.remove(id);
    return { message: 'Geofence deleted successfully' };
  }

  /**
   * Validate a GPS location against all active geofences for a project
   */
  @Post('validate')
  @ApiOperation({
    summary: 'Validate a GPS location against geofences',
    description:
      'Checks if GPS coordinates are within project geofence boundaries. Returns validation status and distance from nearest geofence.',
  })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Location validation result',
    type: GeofenceValidationResultDto,
  })
  async validateLocation(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: ValidateLocationDto,
  ): Promise<GeofenceValidationResultDto> {
    return await this.geofenceService.validateLocation(projectId, dto);
  }

  /**
   * Get all active geofences for a project (convenience endpoint)
   */
  @Get('active')
  @ApiOperation({ summary: 'Get all active geofences for a project' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of active geofences',
    type: [ProjectGeofence],
  })
  async getActiveGeofences(@Param('projectId', ParseUUIDPipe) projectId: string): Promise<ProjectGeofence[]> {
    return await this.geofenceService.getActiveGeofences(projectId);
  }
}
