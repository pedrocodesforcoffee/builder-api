import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseBoolPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ScheduleOfValuesService } from '../services/schedule-of-values.service';
import {
  CreateScheduleOfValuesDto,
  ScheduleOfValuesResponseDto,
} from '../dto';

/**
 * Schedule of Values Controller
 *
 * Handles HTTP requests for Schedule of Values management.
 * All endpoints require authentication and project access.
 *
 * Base URL: /api/v1/projects/:projectId/schedule-of-values
 */
@ApiTags('Schedule of Values')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/schedule-of-values')
export class ScheduleOfValuesController {
  constructor(
    private readonly scheduleOfValuesService: ScheduleOfValuesService,
  ) {}

  /**
   * Create a new Schedule of Values
   * POST /api/v1/projects/:projectId/schedule-of-values
   */
  @Post()
  @ApiOperation({ summary: 'Create a new Schedule of Values' })
  @ApiResponse({
    status: 201,
    description: 'Schedule of Values created successfully',
    type: ScheduleOfValuesResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Commitment not found' })
  async create(
    @Param('projectId') projectId: string,
    @Body() createDto: CreateScheduleOfValuesDto,
    @CurrentUser('id') userId: string,
  ): Promise<ScheduleOfValuesResponseDto> {
    return this.scheduleOfValuesService.create(projectId, createDto, userId);
  }

  /**
   * Get all Schedule of Values for a project
   * GET /api/v1/projects/:projectId/schedule-of-values
   */
  @Get()
  @ApiOperation({ summary: 'Get all Schedule of Values for a project' })
  @ApiResponse({
    status: 200,
    description: 'Schedule of Values retrieved successfully',
    type: [ScheduleOfValuesResponseDto],
  })
  async findAll(
    @Param('projectId') projectId: string,
    @Query('includeItems', ParseBoolPipe) includeItems?: boolean,
  ): Promise<ScheduleOfValuesResponseDto[]> {
    return this.scheduleOfValuesService.findAll(
      projectId,
      includeItems ?? false,
    );
  }

  /**
   * Get a Schedule of Values by ID
   * GET /api/v1/projects/:projectId/schedule-of-values/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a Schedule of Values by ID' })
  @ApiResponse({
    status: 200,
    description: 'Schedule of Values retrieved successfully',
    type: ScheduleOfValuesResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Schedule of Values not found' })
  async findOne(
    @Param('projectId') projectId: string,
    @Param('id') sovId: string,
    @Query('includeItems', ParseBoolPipe) includeItems?: boolean,
  ): Promise<ScheduleOfValuesResponseDto> {
    return this.scheduleOfValuesService.findOne(
      projectId,
      sovId,
      includeItems ?? false,
    );
  }

  /**
   * Get Schedule of Values by commitment ID
   * GET /api/v1/projects/:projectId/schedule-of-values/commitment/:commitmentId
   */
  @Get('commitment/:commitmentId')
  @ApiOperation({ summary: 'Get Schedule of Values by commitment ID' })
  @ApiResponse({
    status: 200,
    description: 'Schedule of Values retrieved successfully',
    type: ScheduleOfValuesResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Schedule of Values not found' })
  async findByCommitment(
    @Param('projectId') projectId: string,
    @Param('commitmentId') commitmentId: string,
    @Query('includeItems', ParseBoolPipe) includeItems?: boolean,
  ): Promise<ScheduleOfValuesResponseDto | null> {
    return this.scheduleOfValuesService.findByCommitment(
      projectId,
      commitmentId,
      includeItems ?? false,
    );
  }

  /**
   * Delete a Schedule of Values
   * DELETE /api/v1/projects/:projectId/schedule-of-values/:id
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a Schedule of Values' })
  @ApiResponse({
    status: 200,
    description: 'Schedule of Values deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete SOV with existing payment applications',
  })
  @ApiResponse({ status: 404, description: 'Schedule of Values not found' })
  async delete(
    @Param('projectId') projectId: string,
    @Param('id') sovId: string,
  ): Promise<void> {
    return this.scheduleOfValuesService.delete(projectId, sovId);
  }
}
