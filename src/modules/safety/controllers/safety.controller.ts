import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SafetyService } from '../services/safety.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

// DTOs
import {
  CreateToolboxTalkDto,
  UpdateToolboxTalkDto,
  StartToolboxTalkDto,
  CompleteToolboxTalkDto,
  AddAttendeeDto,
  BulkAddAttendeesDto,
  UpdateAttendeeDto,
  QueryToolboxTalksDto,
  ToolboxTalkResponseDto,
} from '../dto/toolbox-talk.dto';

import {
  CreateSafetyObservationDto,
  UpdateSafetyObservationDto,
  ResolveObservationDto,
  VerifyObservationDto,
  CloseObservationDto,
  CreateObservationActionDto,
  UpdateObservationActionDto,
  CompleteActionDto,
  VerifyActionDto,
  QueryObservationsDto,
  SafetyObservationResponseDto,
} from '../dto/safety-observation.dto';

import {
  CreateSafetyIncidentDto,
  UpdateSafetyIncidentDto,
  CreateInvestigationDto,
  UpdateInvestigationDto,
  QueryIncidentsDto,
  SafetyIncidentResponseDto,
} from '../dto/safety-incident.dto';

import {
  CreateSafetyCertificationDto,
  UpdateSafetyCertificationDto,
  AssignCertificationDto,
  UpdateWorkerCertificationDto,
  QueryCertificationsDto,
  QueryWorkerCertificationsDto,
  SafetyCertificationResponseDto,
  WorkerCertificationResponseDto,
} from '../dto/safety-certification.dto';

@ApiTags('Safety & Toolbox Talks')
@Controller('v1/safety')
@UseGuards(JwtAuthGuard)
export class SafetyController {
  constructor(private readonly safetyService: SafetyService) {}

  // ==================== SAFETY TOPICS ====================

  @Post('topics')
  @ApiOperation({ summary: 'Create a safety topic' })
  @ApiResponse({ status: 201, description: 'Safety topic created' })
  async createSafetyTopic(
    @Body() dto: any,
    @CurrentUser('id') userId: string
  ) {
    return await this.safetyService.createSafetyTopic(dto, userId);
  }

  @Get('topics')
  @ApiOperation({ summary: 'Get all safety topics' })
  @ApiResponse({ status: 200, description: 'Safety topics retrieved' })
  async findAllSafetyTopics(@Query() query: any) {
    return await this.safetyService.findAllSafetyTopics(query);
  }

  @Get('topics/:id')
  @ApiOperation({ summary: 'Get a safety topic by ID' })
  @ApiResponse({ status: 200, description: 'Safety topic retrieved' })
  async findOneSafetyTopic(@Param('id', ParseUUIDPipe) id: string) {
    return await this.safetyService.findOneSafetyTopic(id);
  }

  @Put('topics/:id')
  @ApiOperation({ summary: 'Update a safety topic' })
  @ApiResponse({ status: 200, description: 'Safety topic updated' })
  async updateSafetyTopic(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: any,
    @CurrentUser('id') userId: string
  ) {
    return await this.safetyService.updateSafetyTopic(id, dto, userId);
  }

  // ==================== TOOLBOX TALKS ====================

  @Post('toolbox-talks')
  @ApiOperation({ summary: 'Create a toolbox talk' })
  @ApiResponse({ status: 201, description: 'Toolbox talk created', type: ToolboxTalkResponseDto })
  async createToolboxTalk(
    @Body() dto: CreateToolboxTalkDto,
    @CurrentUser('id') userId: string
  ) {
    return await this.safetyService.createToolboxTalk(dto, userId);
  }

  @Get('toolbox-talks')
  @ApiOperation({ summary: 'Get all toolbox talks' })
  @ApiResponse({ status: 200, description: 'Toolbox talks retrieved' })
  async findAllToolboxTalks(@Query() query: QueryToolboxTalksDto) {
    return await this.safetyService.findAllToolboxTalks(query);
  }

  @Get('toolbox-talks/:id')
  @ApiOperation({ summary: 'Get a toolbox talk by ID' })
  @ApiResponse({ status: 200, description: 'Toolbox talk retrieved', type: ToolboxTalkResponseDto })
  async findOneToolboxTalk(@Param('id', ParseUUIDPipe) id: string) {
    return await this.safetyService.findOneToolboxTalk(id);
  }

  @Put('toolbox-talks/:id')
  @ApiOperation({ summary: 'Update a toolbox talk' })
  @ApiResponse({ status: 200, description: 'Toolbox talk updated', type: ToolboxTalkResponseDto })
  async updateToolboxTalk(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateToolboxTalkDto,
    @CurrentUser('id') userId: string
  ) {
    return await this.safetyService.updateToolboxTalk(id, dto, userId);
  }

  @Post('toolbox-talks/:id/start')
  @ApiOperation({ summary: 'Start a toolbox talk' })
  @ApiResponse({ status: 200, description: 'Toolbox talk started', type: ToolboxTalkResponseDto })
  async startToolboxTalk(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StartToolboxTalkDto,
    @CurrentUser('id') userId: string
  ) {
    return await this.safetyService.startToolboxTalk(id, dto, userId);
  }

  @Post('toolbox-talks/:id/complete')
  @ApiOperation({ summary: 'Complete a toolbox talk' })
  @ApiResponse({ status: 200, description: 'Toolbox talk completed', type: ToolboxTalkResponseDto })
  async completeToolboxTalk(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteToolboxTalkDto,
    @CurrentUser('id') userId: string
  ) {
    return await this.safetyService.completeToolboxTalk(id, dto, userId);
  }

  @Post('toolbox-talks/:id/attendees')
  @ApiOperation({ summary: 'Add an attendee to a toolbox talk' })
  @ApiResponse({ status: 201, description: 'Attendee added' })
  async addAttendee(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddAttendeeDto,
    @CurrentUser('id') userId: string
  ) {
    return await this.safetyService.addAttendee(id, dto, userId);
  }

  @Post('toolbox-talks/:id/attendees/bulk')
  @ApiOperation({ summary: 'Bulk add attendees to a toolbox talk' })
  @ApiResponse({ status: 201, description: 'Attendees added' })
  async bulkAddAttendees(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BulkAddAttendeesDto,
    @CurrentUser('id') userId: string
  ) {
    return await this.safetyService.bulkAddAttendees(id, dto, userId);
  }

  @Patch('toolbox-talks/attendees/:id')
  @ApiOperation({ summary: 'Update an attendee' })
  @ApiResponse({ status: 200, description: 'Attendee updated' })
  async updateAttendee(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAttendeeDto,
    @CurrentUser('id') userId: string
  ) {
    return await this.safetyService.updateAttendee(id, dto, userId);
  }

  // ==================== SAFETY OBSERVATIONS ====================

  @Post('observations')
  @ApiOperation({ summary: 'Create a safety observation' })
  @ApiResponse({ status: 201, description: 'Safety observation created', type: SafetyObservationResponseDto })
  async createObservation(
    @Body() dto: CreateSafetyObservationDto,
    @CurrentUser('id') userId: string
  ) {
    return await this.safetyService.createObservation(dto, userId);
  }

  @Get('observations')
  @ApiOperation({ summary: 'Get all safety observations' })
  @ApiResponse({ status: 200, description: 'Safety observations retrieved' })
  async findAllObservations(@Query() query: QueryObservationsDto) {
    return await this.safetyService.findAllObservations(query);
  }

  @Get('observations/:id')
  @ApiOperation({ summary: 'Get a safety observation by ID' })
  @ApiResponse({ status: 200, description: 'Safety observation retrieved', type: SafetyObservationResponseDto })
  async findOneObservation(@Param('id', ParseUUIDPipe) id: string) {
    return await this.safetyService.findOneObservation(id);
  }

  @Put('observations/:id')
  @ApiOperation({ summary: 'Update a safety observation' })
  @ApiResponse({ status: 200, description: 'Safety observation updated', type: SafetyObservationResponseDto })
  async updateObservation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSafetyObservationDto,
    @CurrentUser('id') userId: string
  ) {
    return await this.safetyService.updateObservation(id, dto, userId);
  }

  @Post('observations/:id/resolve')
  @ApiOperation({ summary: 'Resolve a safety observation' })
  @ApiResponse({ status: 200, description: 'Safety observation resolved', type: SafetyObservationResponseDto })
  async resolveObservation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveObservationDto,
    @CurrentUser('id') userId: string
  ) {
    return await this.safetyService.resolveObservation(id, dto, userId);
  }

  @Post('observations/:id/verify')
  @ApiOperation({ summary: 'Verify a safety observation' })
  @ApiResponse({ status: 200, description: 'Safety observation verified', type: SafetyObservationResponseDto })
  async verifyObservation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string
  ) {
    return await this.safetyService.verifyObservation(id, userId);
  }

  @Post('observations/:id/close')
  @ApiOperation({ summary: 'Close a safety observation' })
  @ApiResponse({ status: 200, description: 'Safety observation closed', type: SafetyObservationResponseDto })
  async closeObservation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string
  ) {
    return await this.safetyService.closeObservation(id, userId);
  }

  // ==================== OBSERVATION ACTIONS ====================

  @Post('observations/actions')
  @ApiOperation({ summary: 'Create an observation corrective action' })
  @ApiResponse({ status: 201, description: 'Corrective action created' })
  async createObservationAction(
    @Body() dto: CreateObservationActionDto,
    @CurrentUser('id') userId: string
  ) {
    return await this.safetyService.createObservationAction(dto, userId);
  }

  @Put('observations/actions/:id')
  @ApiOperation({ summary: 'Update an observation action' })
  @ApiResponse({ status: 200, description: 'Corrective action updated' })
  async updateObservationAction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateObservationActionDto,
    @CurrentUser('id') userId: string
  ) {
    return await this.safetyService.updateObservationAction(id, dto, userId);
  }

  @Post('observations/actions/:id/complete')
  @ApiOperation({ summary: 'Complete an observation action' })
  @ApiResponse({ status: 200, description: 'Corrective action completed' })
  async completeObservationAction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteActionDto,
    @CurrentUser('id') userId: string
  ) {
    return await this.safetyService.completeObservationAction(id, dto, userId);
  }

  @Post('observations/actions/:id/verify')
  @ApiOperation({ summary: 'Verify an observation action' })
  @ApiResponse({ status: 200, description: 'Corrective action verified' })
  async verifyObservationAction(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string
  ) {
    return await this.safetyService.verifyObservationAction(id, userId);
  }

  // ==================== SAFETY INCIDENTS ====================

  @Post('incidents')
  @ApiOperation({ summary: 'Create a safety incident report' })
  @ApiResponse({ status: 201, description: 'Safety incident created', type: SafetyIncidentResponseDto })
  async createIncident(
    @Body() dto: CreateSafetyIncidentDto,
    @CurrentUser('id') userId: string
  ) {
    return await this.safetyService.createIncident(dto, userId);
  }

  @Get('incidents')
  @ApiOperation({ summary: 'Get all safety incidents' })
  @ApiResponse({ status: 200, description: 'Safety incidents retrieved' })
  async findAllIncidents(@Query() query: QueryIncidentsDto) {
    return await this.safetyService.findAllIncidents(query);
  }

  @Get('incidents/:id')
  @ApiOperation({ summary: 'Get a safety incident by ID' })
  @ApiResponse({ status: 200, description: 'Safety incident retrieved', type: SafetyIncidentResponseDto })
  async findOneIncident(@Param('id', ParseUUIDPipe) id: string) {
    return await this.safetyService.findOneIncident(id);
  }

  @Put('incidents/:id')
  @ApiOperation({ summary: 'Update a safety incident' })
  @ApiResponse({ status: 200, description: 'Safety incident updated', type: SafetyIncidentResponseDto })
  async updateIncident(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSafetyIncidentDto,
    @CurrentUser('id') userId: string
  ) {
    return await this.safetyService.updateIncident(id, dto, userId);
  }

  // ==================== INCIDENT INVESTIGATIONS ====================

  @Post('incidents/investigations')
  @ApiOperation({ summary: 'Create an incident investigation' })
  @ApiResponse({ status: 201, description: 'Investigation created' })
  async createInvestigation(
    @Body() dto: CreateInvestigationDto,
    @CurrentUser('id') userId: string
  ) {
    return await this.safetyService.createInvestigation(dto, userId);
  }

  @Put('incidents/investigations/:id')
  @ApiOperation({ summary: 'Update an incident investigation' })
  @ApiResponse({ status: 200, description: 'Investigation updated' })
  async updateInvestigation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvestigationDto,
    @CurrentUser('id') userId: string
  ) {
    return await this.safetyService.updateInvestigation(id, dto, userId);
  }

  @Post('incidents/investigations/:id/start')
  @ApiOperation({ summary: 'Start an incident investigation' })
  @ApiResponse({ status: 200, description: 'Investigation started' })
  async startInvestigation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string
  ) {
    return await this.safetyService.startInvestigation(id, userId);
  }

  @Post('incidents/investigations/:id/complete')
  @ApiOperation({ summary: 'Complete an incident investigation' })
  @ApiResponse({ status: 200, description: 'Investigation completed' })
  async completeInvestigation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string
  ) {
    return await this.safetyService.completeInvestigation(id, userId);
  }

  // ==================== SAFETY CERTIFICATIONS ====================

  @Post('certifications')
  @ApiOperation({ summary: 'Create a safety certification template' })
  @ApiResponse({ status: 201, description: 'Certification created', type: SafetyCertificationResponseDto })
  async createCertification(
    @Body() dto: CreateSafetyCertificationDto,
    @CurrentUser('id') userId: string
  ) {
    return await this.safetyService.createCertification(dto, userId);
  }

  @Get('certifications')
  @ApiOperation({ summary: 'Get all safety certifications' })
  @ApiResponse({ status: 200, description: 'Certifications retrieved' })
  async findAllCertifications(@Query() query: QueryCertificationsDto) {
    return await this.safetyService.findAllCertifications(query);
  }

  @Get('certifications/:id')
  @ApiOperation({ summary: 'Get a safety certification by ID' })
  @ApiResponse({ status: 200, description: 'Certification retrieved', type: SafetyCertificationResponseDto })
  async findOneCertification(@Param('id', ParseUUIDPipe) id: string) {
    return await this.safetyService.findOneCertification(id);
  }

  // ==================== WORKER CERTIFICATIONS ====================

  @Post('workers/certifications')
  @ApiOperation({ summary: 'Assign a certification to a worker' })
  @ApiResponse({ status: 201, description: 'Certification assigned', type: WorkerCertificationResponseDto })
  async assignCertificationToWorker(
    @Body() dto: AssignCertificationDto,
    @CurrentUser('id') userId: string
  ) {
    return await this.safetyService.assignCertificationToWorker(dto, userId);
  }

  @Get('workers/certifications')
  @ApiOperation({ summary: 'Get all worker certifications' })
  @ApiResponse({ status: 200, description: 'Worker certifications retrieved' })
  async findAllWorkerCertifications(@Query() query: QueryWorkerCertificationsDto) {
    return await this.safetyService.findAllWorkerCertifications(query);
  }

  // ==================== OSHA METRICS ====================

  @Get('projects/:projectId/metrics/osha')
  @ApiOperation({ summary: 'Calculate OSHA metrics (TRIR, DART) for a project' })
  @ApiResponse({ status: 200, description: 'OSHA metrics calculated' })
  async calculateOshaMetrics(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('year') year: number
  ) {
    return await this.safetyService.calculateOshaMetrics(projectId, year || new Date().getFullYear());
  }
}
