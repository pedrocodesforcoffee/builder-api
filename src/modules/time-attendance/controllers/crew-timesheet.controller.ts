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
import { CrewTimesheetService } from '../services/crew-timesheet.service';
import {
  CreateCrewTimesheetDto,
  UpdateCrewTimesheetDto,
  QueryCrewTimesheetsDto,
  SubmitCrewTimesheetDto,
  ApproveCrewTimesheetDto,
  CrewTimesheetResponseDto,
} from '../dto/crew-timesheet.dto';
import { CrewTimesheet } from '../entities/crew-timesheet.entity';
import { TimeEntry } from '../entities/time-entry.entity';

/**
 * CrewTimesheetController
 *
 * Manages bulk time entry for crews:
 * - Foremen create crew timesheets with default times
 * - System generates individual time entries for each worker
 * - Foremen submit crew timesheets for approval
 * - Superintendents approve crew timesheets (auto-approves all time entries)
 */
@ApiTags('Crew Timesheets')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
export class CrewTimesheetController {
  constructor(private readonly crewTimesheetService: CrewTimesheetService) {}

  /**
   * Create a new crew timesheet
   */
  @Post('v1/projects/:projectId/crew-timesheets')
  @ApiOperation({
    summary: 'Create a new crew timesheet',
    description:
      'Creates a crew timesheet with default times and generates individual time entries for each worker',
  })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Crew timesheet created successfully',
    type: CrewTimesheet,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid crew timesheet data' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateCrewTimesheetDto,
    @CurrentUser('id') userId: string,
  ): Promise<CrewTimesheetResponseDto> {
    const crewTimesheet = await this.crewTimesheetService.create({ ...dto, projectId }, userId);
    return this.crewTimesheetService.mapToResponseDto(crewTimesheet);
  }

  /**
   * Get all crew timesheets with filters
   */
  @Get('v1/projects/:projectId/crew-timesheets')
  @ApiOperation({
    summary: 'Get all crew timesheets for a project',
    description: 'Query crew timesheets with filters for foreman, status, date range, etc.',
  })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of crew timesheets',
  })
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: QueryCrewTimesheetsDto,
  ): Promise<{
    data: CrewTimesheetResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const result = await this.crewTimesheetService.findAll({ ...query, projectId });
    return {
      ...result,
      data: result.data.map((ct) => this.crewTimesheetService.mapToResponseDto(ct)),
    };
  }

  /**
   * Get a specific crew timesheet by ID
   */
  @Get('v1/crew-timesheets/:id')
  @ApiOperation({ summary: 'Get a specific crew timesheet by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Crew timesheet details',
    type: CrewTimesheet,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Crew timesheet not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<CrewTimesheetResponseDto> {
    const crewTimesheet = await this.crewTimesheetService.findOne(id);
    return this.crewTimesheetService.mapToResponseDto(crewTimesheet);
  }

  /**
   * Update a crew timesheet
   */
  @Put('v1/crew-timesheets/:id')
  @ApiOperation({
    summary: 'Update a crew timesheet',
    description: 'Update crew timesheet details (only allowed in DRAFT status)',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Crew timesheet updated successfully',
    type: CrewTimesheet,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Crew timesheet not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Can only update crew timesheets in DRAFT status' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCrewTimesheetDto,
    @CurrentUser('id') userId: string,
  ): Promise<CrewTimesheetResponseDto> {
    const crewTimesheet = await this.crewTimesheetService.update(id, dto, userId);
    return this.crewTimesheetService.mapToResponseDto(crewTimesheet);
  }

  /**
   * Delete a crew timesheet
   */
  @Delete('v1/crew-timesheets/:id')
  @ApiOperation({
    summary: 'Delete a crew timesheet',
    description: 'Delete a crew timesheet and its related time entries (only allowed in DRAFT status)',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Crew timesheet deleted successfully',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Crew timesheet not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Can only delete crew timesheets in DRAFT status' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    await this.crewTimesheetService.remove(id);
    return { message: 'Crew timesheet deleted successfully' };
  }

  /**
   * Submit crew timesheet for approval
   */
  @Post('v1/crew-timesheets/:id/submit')
  @ApiOperation({
    summary: 'Submit crew timesheet for approval',
    description: 'Change status from DRAFT to SUBMITTED and submit all related time entries',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Crew timesheet submitted successfully',
    type: CrewTimesheet,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Can only submit crew timesheets in DRAFT status' })
  async submitForApproval(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitCrewTimesheetDto,
    @CurrentUser('id') userId: string,
  ): Promise<CrewTimesheetResponseDto> {
    const crewTimesheet = await this.crewTimesheetService.submitForApproval(id, dto, userId);
    return this.crewTimesheetService.mapToResponseDto(crewTimesheet);
  }

  /**
   * Approve crew timesheet
   */
  @Post('v1/crew-timesheets/:id/approve')
  @ApiOperation({
    summary: 'Approve crew timesheet',
    description: 'Change status from SUBMITTED to APPROVED and auto-approve all related time entries',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Crew timesheet approved successfully',
    type: CrewTimesheet,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Can only approve crew timesheets in SUBMITTED status' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveCrewTimesheetDto,
    @CurrentUser('id') userId: string,
  ): Promise<CrewTimesheetResponseDto> {
    const crewTimesheet = await this.crewTimesheetService.approve(id, dto, userId);
    return this.crewTimesheetService.mapToResponseDto(crewTimesheet);
  }

  /**
   * Reject crew timesheet
   */
  @Post('v1/crew-timesheets/:id/reject')
  @ApiOperation({
    summary: 'Reject crew timesheet',
    description: 'Change status from SUBMITTED to REJECTED and revert all related time entries to DRAFT',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Crew timesheet rejected successfully',
    type: CrewTimesheet,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Can only reject crew timesheets in SUBMITTED status' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser('id') userId: string,
  ): Promise<CrewTimesheetResponseDto> {
    const crewTimesheet = await this.crewTimesheetService.reject(id, reason, userId);
    return this.crewTimesheetService.mapToResponseDto(crewTimesheet);
  }

  /**
   * Get time entries for a crew timesheet
   */
  @Get('v1/crew-timesheets/:id/time-entries')
  @ApiOperation({
    summary: 'Get time entries for a crew timesheet',
    description: 'Returns all individual time entries generated from this crew timesheet',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of time entries',
    type: [TimeEntry],
  })
  async getTimeEntries(@Param('id', ParseUUIDPipe) id: string): Promise<TimeEntry[]> {
    return await this.crewTimesheetService.getTimeEntries(id);
  }

  /**
   * Regenerate time entries for a crew timesheet
   */
  @Post('v1/crew-timesheets/:id/regenerate')
  @ApiOperation({
    summary: 'Regenerate time entries for a crew timesheet',
    description: 'Regenerates individual time entries with updated default values (only allowed in DRAFT status)',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Time entries regenerated successfully',
    type: [TimeEntry],
  })
  async regenerateTimeEntries(@Param('id', ParseUUIDPipe) id: string): Promise<TimeEntry[]> {
    return await this.crewTimesheetService.generateTimeEntries(id);
  }
}
