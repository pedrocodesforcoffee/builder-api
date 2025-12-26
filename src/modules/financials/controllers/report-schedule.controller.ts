import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ReportScheduleService } from '../services/report-schedule.service';
import {
  CreateReportScheduleDto,
  UpdateReportScheduleDto,
  QueryReportSchedulesDto,
  ExecuteReportScheduleDto,
  ReportScheduleResponseDto,
} from '../dto/report/report-schedule.dto';

/**
 * Report Schedule Controller
 *
 * REST API endpoints for managing automated financial report schedules.
 *
 * Features:
 * - Create, read, update, delete report schedules
 * - Manual execution of scheduled reports
 * - Activate/deactivate schedules
 * - Query schedules with filtering and pagination
 * - Support for all 16 financial report types
 * - Email delivery configuration
 * - Cron-based scheduling
 *
 * Base Route: /api/v1/projects/:projectId/report-schedules
 */
@ApiTags('Report Schedules')
@ApiBearerAuth()
@Controller('projects/:projectId/report-schedules')
@UseGuards(JwtAuthGuard)
export class ReportScheduleController {
  private readonly logger = new Logger(ReportScheduleController.name);

  constructor(private readonly reportScheduleService: ReportScheduleService) {}

  /**
   * Create Report Schedule
   *
   * Creates a new automated report schedule with email delivery.
   * The schedule will be automatically queued for execution based on frequency.
   *
   * POST /api/v1/projects/:projectId/report-schedules
   */
  @Post()
  @ApiOperation({ summary: 'Create a new report schedule' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: 201,
    description: 'Report schedule created successfully',
    type: ReportScheduleResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async createReportSchedule(
    @Param('projectId') projectId: string,
    @Body() dto: CreateReportScheduleDto,
    @CurrentUser() user: any,
  ): Promise<ReportScheduleResponseDto> {
    this.logger.log(
      `Creating report schedule for project ${projectId}: ${dto.reportName}`,
    );

    const schedule = await this.reportScheduleService.create(
      projectId,
      dto,
      user.id,
    );

    this.logger.log(`Report schedule created: ${schedule.id}`);
    return schedule as ReportScheduleResponseDto;
  }

  /**
   * List Report Schedules
   *
   * Retrieves all report schedules for a project with optional filtering.
   *
   * GET /api/v1/projects/:projectId/report-schedules
   */
  @Get()
  @ApiOperation({ summary: 'List all report schedules for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'List of report schedules with count',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/ReportScheduleResponseDto' },
        },
        total: { type: 'number', example: 42 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async listReportSchedules(
    @Param('projectId') projectId: string,
    @Query() query: QueryReportSchedulesDto,
  ): Promise<{ data: ReportScheduleResponseDto[]; total: number }> {
    this.logger.log(`Listing report schedules for project ${projectId}`);

    const [schedules, total] = await this.reportScheduleService.findAll(
      projectId,
      query,
    );

    return {
      data: schedules as ReportScheduleResponseDto[],
      total,
    };
  }

  /**
   * Get Report Schedule
   *
   * Retrieves a specific report schedule by ID.
   *
   * GET /api/v1/projects/:projectId/report-schedules/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific report schedule' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Report schedule ID' })
  @ApiResponse({
    status: 200,
    description: 'Report schedule details',
    type: ReportScheduleResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Report schedule not found' })
  async getReportSchedule(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ): Promise<ReportScheduleResponseDto> {
    this.logger.log(`Getting report schedule ${id} for project ${projectId}`);

    const schedule = await this.reportScheduleService.findOne(id, projectId);
    return schedule as ReportScheduleResponseDto;
  }

  /**
   * Update Report Schedule
   *
   * Updates an existing report schedule. If frequency or cron expression changes,
   * the schedule will be automatically rescheduled.
   *
   * PUT /api/v1/projects/:projectId/report-schedules/:id
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a report schedule' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Report schedule ID' })
  @ApiResponse({
    status: 200,
    description: 'Report schedule updated successfully',
    type: ReportScheduleResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Report schedule not found' })
  async updateReportSchedule(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateReportScheduleDto,
  ): Promise<ReportScheduleResponseDto> {
    this.logger.log(`Updating report schedule ${id} for project ${projectId}`);

    const schedule = await this.reportScheduleService.update(
      id,
      projectId,
      dto,
    );

    this.logger.log(`Report schedule updated: ${schedule.id}`);
    return schedule as ReportScheduleResponseDto;
  }

  /**
   * Delete Report Schedule
   *
   * Deletes a report schedule permanently. Any queued jobs will fail gracefully.
   *
   * DELETE /api/v1/projects/:projectId/report-schedules/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a report schedule' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Report schedule ID' })
  @ApiResponse({ status: 204, description: 'Report schedule deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Report schedule not found' })
  async deleteReportSchedule(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ): Promise<void> {
    this.logger.log(`Deleting report schedule ${id} for project ${projectId}`);

    await this.reportScheduleService.delete(id, projectId);
    this.logger.log(`Report schedule deleted: ${id}`);
  }

  /**
   * Execute Report Schedule
   *
   * Manually triggers immediate execution of a report schedule.
   * The report will be generated and emailed without waiting for the next scheduled run.
   * Optional overrides can be provided for recipients and parameters.
   *
   * POST /api/v1/projects/:projectId/report-schedules/:id/execute
   */
  @Post(':id/execute')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Manually execute a report schedule immediately' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Report schedule ID' })
  @ApiResponse({
    status: 202,
    description: 'Report execution queued successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Report execution queued' },
        scheduleId: { type: 'string', example: 'uuid-here' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Report schedule not found' })
  async executeReportSchedule(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto?: ExecuteReportScheduleDto,
  ): Promise<{ message: string; scheduleId: string }> {
    this.logger.log(
      `Manually executing report schedule ${id} for project ${projectId}`,
    );

    await this.reportScheduleService.execute(id, projectId, dto);

    return {
      message: 'Report execution queued',
      scheduleId: id,
    };
  }

  /**
   * Activate Report Schedule
   *
   * Activates a deactivated report schedule and queues the next run.
   *
   * POST /api/v1/projects/:projectId/report-schedules/:id/activate
   */
  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate a report schedule' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Report schedule ID' })
  @ApiResponse({
    status: 200,
    description: 'Report schedule activated successfully',
    type: ReportScheduleResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Report schedule not found' })
  async activateReportSchedule(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ): Promise<ReportScheduleResponseDto> {
    this.logger.log(
      `Activating report schedule ${id} for project ${projectId}`,
    );

    const schedule = await this.reportScheduleService.activate(id, projectId);

    this.logger.log(`Report schedule activated: ${schedule.id}`);
    return schedule as ReportScheduleResponseDto;
  }

  /**
   * Deactivate Report Schedule
   *
   * Deactivates a report schedule to prevent future automatic executions.
   * Can still be executed manually.
   *
   * POST /api/v1/projects/:projectId/report-schedules/:id/deactivate
   */
  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a report schedule' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Report schedule ID' })
  @ApiResponse({
    status: 200,
    description: 'Report schedule deactivated successfully',
    type: ReportScheduleResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Report schedule not found' })
  async deactivateReportSchedule(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ): Promise<ReportScheduleResponseDto> {
    this.logger.log(
      `Deactivating report schedule ${id} for project ${projectId}`,
    );

    const schedule = await this.reportScheduleService.deactivate(id, projectId);

    this.logger.log(`Report schedule deactivated: ${schedule.id}`);
    return schedule as ReportScheduleResponseDto;
  }

  /**
   * Get Execution History
   *
   * Retrieves the execution history for a specific report schedule.
   * Returns a list of all past executions with timing, status, and metadata.
   *
   * GET /api/v1/projects/:projectId/report-schedules/:id/executions
   */
  @Get(':id/executions')
  @ApiOperation({
    summary: 'Get execution history for a report schedule',
    description: 'Returns execution history with timing, status, file metadata, and error information',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Report schedule ID' })
  @ApiResponse({
    status: 200,
    description: 'Execution history retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              status: { type: 'string', enum: ['PENDING', 'RUNNING', 'SUCCESS', 'FAILED'] },
              startedAt: { type: 'string', format: 'date-time' },
              completedAt: { type: 'string', format: 'date-time', nullable: true },
              durationMs: { type: 'number', nullable: true },
              fileUrl: { type: 'string', nullable: true },
              fileSize: { type: 'number', nullable: true },
              errorMessage: { type: 'string', nullable: true },
              emailSent: { type: 'boolean' },
              emailSentAt: { type: 'string', format: 'date-time', nullable: true },
              rowCount: { type: 'number', nullable: true },
            },
          },
        },
        total: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Report schedule not found' })
  async getExecutionHistory(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ): Promise<{
    data: Array<{
      id: string;
      status: string;
      startedAt: Date;
      completedAt: Date | null;
      durationMs: number | null;
      fileUrl: string | null;
      fileSize: number | null;
      errorMessage: string | null;
      emailSent: boolean;
      emailSentAt: Date | null;
      rowCount: number | null;
    }>;
    total: number;
  }> {
    this.logger.log(
      `Getting execution history for report schedule ${id} in project ${projectId}`,
    );

    // First verify the schedule exists and belongs to this project
    await this.reportScheduleService.findOne(id, projectId);

    // Get execution history with pagination
    const [executions, total] = await this.reportScheduleService.getExecutionHistory(
      id,
      skip || 0,
      take || 50,
    );

    return {
      data: executions.map((execution) => ({
        id: execution.id,
        status: execution.status,
        startedAt: execution.startedAt,
        completedAt: execution.completedAt ?? null,
        durationMs: execution.durationMs ?? null,
        fileUrl: execution.fileUrl ?? null,
        fileSize: execution.fileSize ?? null,
        errorMessage: execution.errorMessage ?? null,
        emailSent: execution.emailSent,
        emailSentAt: execution.emailSentAt ?? null,
        rowCount: execution.rowCount ?? null,
      })),
      total,
    };
  }
}
