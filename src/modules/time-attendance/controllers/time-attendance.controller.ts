import {
  Controller,
  Get,
  Post,
  Put,
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
import { TimeAttendanceService } from '../services/time-attendance.service';
import {
  ClockInDto,
  ClockOutDto,
  BreakStartDto,
  BreakEndDto,
  LunchStartDto,
  LunchEndDto,
} from '../dto/clock-event.dto';
import {
  CreateTimeEntryDto,
  UpdateTimeEntryDto,
  QueryTimeEntriesDto,
  SubmitTimeEntryDto,
  ApproveTimeEntryDto,
  RejectTimeEntryDto,
  LockTimeEntryDto,
  AllocateToCostCodesDto,
  TimeEntryResponseDto,
} from '../dto/time-entry.dto';
import {
  DailyReportQueryDto,
  WeeklyReportQueryDto,
  PayrollExportDto,
  DailyReportResponseDto,
  WeeklyReportResponseDto,
  PayrollExportResponseDto,
} from '../dto/report.dto';
import { TimeEntry } from '../entities/time-entry.entity';
import { ClockEvent } from '../entities/clock-event.entity';

/**
 * TimeAttendanceController
 *
 * Main controller for time & attendance operations:
 * - Clock in/out with GPS validation
 * - Break and lunch tracking
 * - Time entry management and approval workflows
 * - Cost code allocation
 * - Reporting and payroll export
 */
@ApiTags('Time & Attendance')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
export class TimeAttendanceController {
  constructor(private readonly timeAttendanceService: TimeAttendanceService) {}

  // ==================== CLOCK OPERATIONS ====================

  /**
   * Clock in to a project with GPS validation
   */
  @Post('v1/time-attendance/clock-in')
  @ApiOperation({
    summary: 'Clock in to a project',
    description: 'Records clock-in time with GPS coordinates and validates against project geofences',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Clocked in successfully',
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Already clocked in or invalid data' })
  async clockIn(
    @Body() dto: ClockInDto,
    @CurrentUser('id') userId: string,
  ): Promise<{ timeEntry: TimeEntry; clockEvent: ClockEvent; warning?: string }> {
    return await this.timeAttendanceService.clockIn(dto, userId);
  }

  /**
   * Clock out from a project
   */
  @Post('v1/time-attendance/clock-out')
  @ApiOperation({
    summary: 'Clock out from a project',
    description: 'Records clock-out time, calculates hours worked, and applies overtime rules',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Clocked out successfully',
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Not clocked in or invalid data' })
  async clockOut(
    @Body() dto: ClockOutDto,
    @CurrentUser('id') userId: string,
  ): Promise<{ timeEntry: TimeEntry; clockEvent: ClockEvent; warning?: string }> {
    return await this.timeAttendanceService.clockOut(dto, userId);
  }

  /**
   * Start a break
   */
  @Post('v1/time-attendance/break-start')
  @ApiOperation({
    summary: 'Start a break',
    description: 'Records break start time (paid break)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Break started successfully',
    type: ClockEvent,
  })
  async breakStart(@Body() dto: BreakStartDto, @CurrentUser('id') userId: string): Promise<ClockEvent> {
    return await this.timeAttendanceService.breakStart(dto.timeEntryId, dto, userId);
  }

  /**
   * End a break
   */
  @Post('v1/time-attendance/break-end')
  @ApiOperation({
    summary: 'End a break',
    description: 'Records break end time and calculates break duration',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Break ended successfully',
    type: ClockEvent,
  })
  async breakEnd(@Body() dto: BreakEndDto, @CurrentUser('id') userId: string): Promise<ClockEvent> {
    return await this.timeAttendanceService.breakEnd(dto.timeEntryId, dto, userId);
  }

  /**
   * Start lunch
   */
  @Post('v1/time-attendance/lunch-start')
  @ApiOperation({
    summary: 'Start lunch',
    description: 'Records lunch start time (unpaid lunch)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Lunch started successfully',
    type: ClockEvent,
  })
  async lunchStart(@Body() dto: LunchStartDto, @CurrentUser('id') userId: string): Promise<ClockEvent> {
    return await this.timeAttendanceService.lunchStart(dto.timeEntryId, dto, userId);
  }

  /**
   * End lunch
   */
  @Post('v1/time-attendance/lunch-end')
  @ApiOperation({
    summary: 'End lunch',
    description: 'Records lunch end time and calculates lunch duration',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lunch ended successfully',
    type: ClockEvent,
  })
  async lunchEnd(@Body() dto: LunchEndDto, @CurrentUser('id') userId: string): Promise<ClockEvent> {
    return await this.timeAttendanceService.lunchEnd(dto.timeEntryId, dto, userId);
  }

  // ==================== TIME ENTRY MANAGEMENT ====================

  /**
   * Query time entries with filters
   */
  @Get('v1/projects/:projectId/time-entries')
  @ApiOperation({
    summary: 'Query time entries for a project',
    description: 'Get time entries with filters for date range, worker, status, etc.',
  })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of time entries',
  })
  async queryTimeEntries(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: QueryTimeEntriesDto,
  ): Promise<{
    data: TimeEntryResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const result = await this.timeAttendanceService.findAll({ ...query, projectId });
    return {
      ...result,
      data: result.data.map((te) => this.timeAttendanceService.mapToResponseDto(te)),
    };
  }

  /**
   * Get a specific time entry by ID
   */
  @Get('v1/time-entries/:id')
  @ApiOperation({ summary: 'Get a specific time entry by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Time entry details',
    type: TimeEntry,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Time entry not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<TimeEntryResponseDto> {
    const timeEntry = await this.timeAttendanceService.findOne(id);
    return this.timeAttendanceService.mapToResponseDto(timeEntry);
  }

  /**
   * Create a manual time entry
   */
  @Post('v1/time-entries')
  @ApiOperation({
    summary: 'Create a manual time entry',
    description: 'Manually create a time entry (for supervisors to enter time on behalf of workers)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Time entry created successfully',
    type: TimeEntry,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid time entry data' })
  async create(@Body() dto: CreateTimeEntryDto, @CurrentUser('id') userId: string): Promise<TimeEntryResponseDto> {
    const timeEntry = await this.timeAttendanceService.create(dto, userId);
    return this.timeAttendanceService.mapToResponseDto(timeEntry);
  }

  /**
   * Update a time entry
   */
  @Put('v1/time-entries/:id')
  @ApiOperation({
    summary: 'Update a time entry',
    description: 'Update time entry details (only allowed in DRAFT status)',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Time entry updated successfully',
    type: TimeEntry,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Time entry not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Time entry cannot be edited (locked or already approved)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTimeEntryDto,
    @CurrentUser('id') userId: string,
  ): Promise<TimeEntryResponseDto> {
    const timeEntry = await this.timeAttendanceService.update(id, dto, userId);
    return this.timeAttendanceService.mapToResponseDto(timeEntry);
  }

  // ==================== APPROVAL WORKFLOW ====================

  /**
   * Submit time entry for approval
   */
  @Post('v1/time-entries/:id/submit')
  @ApiOperation({
    summary: 'Submit time entry for approval',
    description: 'Change status from DRAFT to SUBMITTED',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Time entry submitted successfully',
    type: TimeEntry,
  })
  async submitForApproval(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitTimeEntryDto,
    @CurrentUser('id') userId: string,
  ): Promise<TimeEntryResponseDto> {
    const timeEntry = await this.timeAttendanceService.submitForApproval(id, dto, userId);
    return this.timeAttendanceService.mapToResponseDto(timeEntry);
  }

  /**
   * Approve time entry
   */
  @Post('v1/time-entries/:id/approve')
  @ApiOperation({
    summary: 'Approve time entry',
    description: 'Change status from SUBMITTED to APPROVED (requires foreman, superintendent, or PM role)',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Time entry approved successfully',
    type: TimeEntry,
  })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveTimeEntryDto,
    @CurrentUser('id') userId: string,
  ): Promise<TimeEntryResponseDto> {
    const timeEntry = await this.timeAttendanceService.approve(id, dto, userId);
    return this.timeAttendanceService.mapToResponseDto(timeEntry);
  }

  /**
   * Reject time entry
   */
  @Post('v1/time-entries/:id/reject')
  @ApiOperation({
    summary: 'Reject time entry',
    description: 'Change status from SUBMITTED to REJECTED with reason',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Time entry rejected successfully',
    type: TimeEntry,
  })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectTimeEntryDto,
    @CurrentUser('id') userId: string,
  ): Promise<TimeEntryResponseDto> {
    const timeEntry = await this.timeAttendanceService.reject(id, dto, userId);
    return this.timeAttendanceService.mapToResponseDto(timeEntry);
  }

  /**
   * Lock time entry for payroll
   */
  @Post('v1/time-entries/:id/lock')
  @ApiOperation({
    summary: 'Lock time entry for payroll',
    description: 'Prevent further edits to time entry (usually after payroll export)',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Time entry locked successfully',
    type: TimeEntry,
  })
  async lock(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<TimeEntryResponseDto> {
    const timeEntry = await this.timeAttendanceService.lock(id, userId);
    return this.timeAttendanceService.mapToResponseDto(timeEntry);
  }

  // ==================== COST CODE ALLOCATION ====================

  /**
   * Allocate time entry hours to cost codes
   */
  @Post('v1/time-entries/:id/allocate')
  @ApiOperation({
    summary: 'Allocate time entry hours to cost codes',
    description: 'Split hours across multiple cost codes using percentages or hours',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cost allocation saved successfully',
    type: TimeEntry,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid allocation (percentages must sum to 100%)' })
  async allocateToCostCodes(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AllocateToCostCodesDto,
  ): Promise<TimeEntryResponseDto> {
    const timeEntry = await this.timeAttendanceService.allocateToCostCodes(id, dto);
    return this.timeAttendanceService.mapToResponseDto(timeEntry);
  }

  // ==================== REPORTING ====================

  /**
   * Generate daily attendance report
   */
  @Get('v1/projects/:projectId/time-entries/reports/daily')
  @ApiOperation({
    summary: 'Generate daily attendance report',
    description: 'Get attendance summary for a specific date',
  })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Daily attendance report',
    type: DailyReportResponseDto,
  })
  async getDailyReport(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: DailyReportQueryDto,
  ): Promise<DailyReportResponseDto> {
    return await this.timeAttendanceService.generateDailyReport({ ...query, projectId });
  }

  /**
   * Generate weekly attendance report
   */
  @Get('v1/projects/:projectId/time-entries/reports/weekly')
  @ApiOperation({
    summary: 'Generate weekly attendance report',
    description: 'Get attendance summary for a week with daily breakdown',
  })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Weekly attendance report',
    type: WeeklyReportResponseDto,
  })
  async getWeeklyReport(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: WeeklyReportQueryDto,
  ): Promise<WeeklyReportResponseDto> {
    return await this.timeAttendanceService.generateWeeklyReport({ ...query, projectId });
  }

  // ==================== PAYROLL EXPORT ====================

  /**
   * Export payroll data
   */
  @Post('v1/projects/:projectId/time-entries/export/payroll')
  @ApiOperation({
    summary: 'Export payroll data',
    description: 'Export time entries for payroll processing in various formats (CSV, JSON, QuickBooks, ADP)',
  })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payroll data exported successfully',
    type: PayrollExportResponseDto,
  })
  async exportPayroll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: PayrollExportDto,
    @CurrentUser('id') userId: string,
  ): Promise<PayrollExportResponseDto> {
    return await this.timeAttendanceService.exportPayroll({ ...dto, projectId }, userId);
  }

  /**
   * Get time entry statistics
   */
  @Get('v1/projects/:projectId/time-entries/stats')
  @ApiOperation({
    summary: 'Get time entry statistics',
    description: 'Get aggregate statistics for time entries (total hours, status breakdown, etc.)',
  })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Time entry statistics',
  })
  async getStats(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    return await this.timeAttendanceService.getStats(projectId, startDate, endDate);
  }
}
