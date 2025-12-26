import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, Not, IsNull, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';

// Entities
import { SafetyTopic } from '../entities/safety-topic.entity';
import { ToolboxTalk } from '../entities/toolbox-talk.entity';
import { ToolboxTalkAttendee } from '../entities/toolbox-talk-attendee.entity';
import { SafetyObservation } from '../entities/safety-observation.entity';
import { SafetyObservationAction } from '../entities/safety-observation-action.entity';
import { SafetyIncident } from '../entities/safety-incident.entity';
import { IncidentInvestigation } from '../entities/incident-investigation.entity';
import { SafetyCertification } from '../entities/safety-certification.entity';
import { WorkerSafetyCertification } from '../entities/worker-safety-certification.entity';

// Enums
import {
  ToolboxTalkStatus,
  AttendanceStatus,
  ObservationStatus,
  ActionStatus,
  InvestigationStatus,
  CertificationStatus,
  IncidentSeverity,
} from '../enums/safety.enum';

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
} from '../dto/toolbox-talk.dto';

import {
  CreateSafetyObservationDto,
  UpdateSafetyObservationDto,
  ResolveObservationDto,
  CreateObservationActionDto,
  UpdateObservationActionDto,
  CompleteActionDto,
  QueryObservationsDto,
} from '../dto/safety-observation.dto';

import {
  CreateSafetyIncidentDto,
  UpdateSafetyIncidentDto,
  CreateInvestigationDto,
  UpdateInvestigationDto,
  QueryIncidentsDto,
} from '../dto/safety-incident.dto';

import {
  CreateSafetyCertificationDto,
  UpdateSafetyCertificationDto,
  AssignCertificationDto,
  UpdateWorkerCertificationDto,
  QueryCertificationsDto,
  QueryWorkerCertificationsDto,
} from '../dto/safety-certification.dto';

@Injectable()
export class SafetyService {
  constructor(
    @InjectRepository(SafetyTopic)
    private readonly safetyTopicRepository: Repository<SafetyTopic>,

    @InjectRepository(ToolboxTalk)
    private readonly toolboxTalkRepository: Repository<ToolboxTalk>,

    @InjectRepository(ToolboxTalkAttendee)
    private readonly attendeeRepository: Repository<ToolboxTalkAttendee>,

    @InjectRepository(SafetyObservation)
    private readonly observationRepository: Repository<SafetyObservation>,

    @InjectRepository(SafetyObservationAction)
    private readonly observationActionRepository: Repository<SafetyObservationAction>,

    @InjectRepository(SafetyIncident)
    private readonly incidentRepository: Repository<SafetyIncident>,

    @InjectRepository(IncidentInvestigation)
    private readonly investigationRepository: Repository<IncidentInvestigation>,

    @InjectRepository(SafetyCertification)
    private readonly certificationRepository: Repository<SafetyCertification>,

    @InjectRepository(WorkerSafetyCertification)
    private readonly workerCertificationRepository: Repository<WorkerSafetyCertification>,
  ) {}

  // ==================== SAFETY TOPICS ====================

  async createSafetyTopic(dto: any, userId: string): Promise<SafetyTopic> {
    const topic = this.safetyTopicRepository.create({
      ...dto,
      createdById: userId,
    });

    const saved = await this.safetyTopicRepository.save(topic);
    return saved as any;
  }

  async findAllSafetyTopics(query: any): Promise<any> {
    const {
      category,
      isActive,
      page = 1,
      limit = 20,
    } = query;

    const qb = this.safetyTopicRepository
      .createQueryBuilder('topic')
      .leftJoinAndSelect('topic.createdBy', 'createdBy');

    if (category) {
      qb.andWhere('topic.category = :category', { category });
    }

    if (isActive !== undefined) {
      qb.andWhere('topic.isActive = :isActive', { isActive });
    }

    qb.orderBy('topic.title', 'ASC');
    qb.skip((page - 1) * limit).take(limit);

    const [topics, total] = await qb.getManyAndCount();

    return {
      data: topics,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOneSafetyTopic(id: string): Promise<SafetyTopic> {
    const topic = await this.safetyTopicRepository.findOne({
      where: { id },
      relations: ['createdBy', 'updatedBy'],
    });

    if (!topic) {
      throw new NotFoundException(`Safety topic with ID ${id} not found`);
    }

    return topic;
  }

  async updateSafetyTopic(id: string, dto: any, userId: string): Promise<SafetyTopic> {
    const topic = await this.findOneSafetyTopic(id);

    Object.assign(topic, dto);
    topic.updatedById = userId;

    return await this.safetyTopicRepository.save(topic);
  }

  // ==================== TOOLBOX TALKS ====================

  async createToolboxTalk(dto: CreateToolboxTalkDto, userId: string): Promise<ToolboxTalk> {
    const talk = this.toolboxTalkRepository.create({
      ...dto,
      createdById: userId,
      status: ToolboxTalkStatus.SCHEDULED,
    });

    const savedTalk = await this.toolboxTalkRepository.save(talk);

    // Add initial attendees if provided
    if (dto.workerIds && dto.workerIds.length > 0) {
      await this.bulkAddAttendees(savedTalk.id, { workerIds: dto.workerIds }, userId);
    }

    return await this.findOneToolboxTalk(savedTalk.id);
  }

  async findAllToolboxTalks(query: QueryToolboxTalksDto): Promise<any> {
    const {
      projectId,
      status,
      startDate,
      endDate,
      conductedById,
      page = 1,
      limit = 20,
    } = query;

    const qb = this.toolboxTalkRepository
      .createQueryBuilder('talk')
      .leftJoinAndSelect('talk.project', 'project')
      .leftJoinAndSelect('talk.safetyTopic', 'topic')
      .leftJoinAndSelect('talk.conductedBy', 'conductedBy')
      .leftJoinAndSelect('talk.createdBy', 'createdBy')
      .leftJoinAndSelect('talk.attendees', 'attendees')
      .leftJoinAndSelect('attendees.worker', 'worker')
      .leftJoinAndSelect('worker.user', 'workerUser');

    if (projectId) {
      qb.andWhere('talk.projectId = :projectId', { projectId });
    }

    if (status) {
      qb.andWhere('talk.status = :status', { status });
    }

    if (startDate && endDate) {
      qb.andWhere('talk.scheduledDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    if (conductedById) {
      qb.andWhere('talk.conductedById = :conductedById', { conductedById });
    }

    qb.orderBy('talk.scheduledDate', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [talks, total] = await qb.getManyAndCount();

    return {
      data: talks,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOneToolboxTalk(id: string): Promise<ToolboxTalk> {
    const talk = await this.toolboxTalkRepository.findOne({
      where: { id },
      relations: [
        'project',
        'safetyTopic',
        'conductedBy',
        'createdBy',
        'attendees',
        'attendees.worker',
        'attendees.worker.user',
      ],
    });

    if (!talk) {
      throw new NotFoundException(`Toolbox talk with ID ${id} not found`);
    }

    return talk;
  }

  async updateToolboxTalk(id: string, dto: UpdateToolboxTalkDto, userId: string): Promise<ToolboxTalk> {
    const talk = await this.findOneToolboxTalk(id);

    if (!talk.canEdit()) {
      throw new BadRequestException('Toolbox talk cannot be edited in current status');
    }

    Object.assign(talk, dto);

    return await this.toolboxTalkRepository.save(talk);
  }

  async startToolboxTalk(id: string, dto: StartToolboxTalkDto, userId: string): Promise<ToolboxTalk> {
    const talk = await this.findOneToolboxTalk(id);

    if (talk.status !== ToolboxTalkStatus.SCHEDULED) {
      throw new BadRequestException('Can only start a scheduled toolbox talk');
    }

    talk.status = ToolboxTalkStatus.IN_PROGRESS;
    talk.actualStartTime = dto.actualStartTime ? new Date(dto.actualStartTime) : new Date();
    talk.conductedById = userId;

    if (dto.location) {
      talk.location = dto.location;
    }

    if (dto.notes) {
      talk.notes = dto.notes;
    }

    return await this.toolboxTalkRepository.save(talk);
  }

  async completeToolboxTalk(id: string, dto: CompleteToolboxTalkDto, userId: string): Promise<ToolboxTalk> {
    const talk = await this.findOneToolboxTalk(id);

    if (!talk.canComplete()) {
      throw new BadRequestException('Can only complete an in-progress toolbox talk');
    }

    talk.status = ToolboxTalkStatus.COMPLETED;
    talk.actualEndTime = dto.actualEndTime ? new Date(dto.actualEndTime) : new Date();
    talk.topicsDiscussed = dto.topicsDiscussed;
    talk.keyPoints = dto.keyPoints;
    talk.questionsAsked = dto.questionsAsked;
    talk.concernsRaised = dto.concernsRaised;
    talk.actionItems = dto.actionItems;
    talk.notes = dto.notes;
    talk.signatureUrl = dto.signatureUrl;

    // Calculate duration
    if (talk.actualStartTime && talk.actualEndTime) {
      const duration = Math.floor(
        (talk.actualEndTime.getTime() - talk.actualStartTime.getTime()) / (1000 * 60)
      );
      talk.durationMinutes = duration;
    }

    return await this.toolboxTalkRepository.save(talk);
  }

  async addAttendee(talkId: string, dto: AddAttendeeDto, userId: string): Promise<ToolboxTalkAttendee> {
    const talk = await this.findOneToolboxTalk(talkId);

    // Check if attendee already exists
    const existing = await this.attendeeRepository.findOne({
      where: {
        toolboxTalkId: talkId,
        workerId: dto.workerId,
      },
    });

    if (existing) {
      throw new BadRequestException('Worker is already added as an attendee');
    }

    const attendee = this.attendeeRepository.create({
      toolboxTalkId: talkId,
      workerId: dto.workerId,
      status: dto.status || AttendanceStatus.PRESENT,
      notes: dto.notes,
      createdById: userId,
    });

    const saved = await this.attendeeRepository.save(attendee);

    // Update counts
    await this.updateAttendeeCounts(talkId);

    return saved;
  }

  async bulkAddAttendees(talkId: string, dto: BulkAddAttendeesDto, userId: string): Promise<ToolboxTalkAttendee[]> {
    const talk = await this.findOneToolboxTalk(talkId);

    const attendees: ToolboxTalkAttendee[] = [];

    for (const workerId of dto.workerIds) {
      // Check if already exists
      const existing = await this.attendeeRepository.findOne({
        where: {
          toolboxTalkId: talkId,
          workerId,
        },
      });

      if (!existing) {
        const attendee = this.attendeeRepository.create({
          toolboxTalkId: talkId,
          workerId,
          status: AttendanceStatus.PRESENT,
          createdById: userId,
        });
        attendees.push(attendee);
      }
    }

    if (attendees.length > 0) {
      await this.attendeeRepository.save(attendees);
      await this.updateAttendeeCounts(talkId);
    }

    return attendees;
  }

  async updateAttendee(id: string, dto: UpdateAttendeeDto, userId: string): Promise<ToolboxTalkAttendee> {
    const attendee = await this.attendeeRepository.findOne({
      where: { id },
      relations: ['toolboxTalk'],
    });

    if (!attendee) {
      throw new NotFoundException(`Attendee with ID ${id} not found`);
    }

    Object.assign(attendee, dto);

    if (dto.acknowledged) {
      attendee.acknowledgedAt = new Date();
    }

    const saved = await this.attendeeRepository.save(attendee);

    // Update counts
    await this.updateAttendeeCounts(attendee.toolboxTalkId);

    return saved;
  }

  private async updateAttendeeCounts(talkId: string): Promise<void> {
    const talk = await this.toolboxTalkRepository.findOne({
      where: { id: talkId },
      relations: ['attendees'],
    });

    if (talk) {
      talk.attendeeCount = talk.attendees.length;
      talk.presentCount = talk.attendees.filter((a) => a.status === AttendanceStatus.PRESENT).length;
      talk.absentCount = talk.attendees.filter((a) => a.status === AttendanceStatus.ABSENT).length;

      await this.toolboxTalkRepository.save(talk);
    }
  }

  // ==================== SAFETY OBSERVATIONS ====================

  async createObservation(dto: CreateSafetyObservationDto, userId: string): Promise<SafetyObservation> {
    const observation = this.observationRepository.create({
      ...dto,
      observedById: userId,
      createdById: userId,
      status: ObservationStatus.OPEN,
    });

    return await this.observationRepository.save(observation);
  }

  async findAllObservations(query: QueryObservationsDto): Promise<any> {
    const {
      projectId,
      severity,
      status,
      category,
      startDate,
      endDate,
      observedById,
      assignedToId,
      overdueOnly,
      page = 1,
      limit = 20,
    } = query;

    const qb = this.observationRepository
      .createQueryBuilder('observation')
      .leftJoinAndSelect('observation.project', 'project')
      .leftJoinAndSelect('observation.observedBy', 'observedBy')
      .leftJoinAndSelect('observation.assignedTo', 'assignedTo')
      .leftJoinAndSelect('observation.verifiedBy', 'verifiedBy')
      .leftJoinAndSelect('observation.closedBy', 'closedBy')
      .leftJoinAndSelect('observation.createdBy', 'createdBy')
      .leftJoinAndSelect('observation.actions', 'actions');

    if (projectId) {
      qb.andWhere('observation.projectId = :projectId', { projectId });
    }

    if (severity) {
      qb.andWhere('observation.severity = :severity', { severity });
    }

    if (status) {
      qb.andWhere('observation.status = :status', { status });
    }

    if (category) {
      qb.andWhere('observation.category = :category', { category });
    }

    if (startDate && endDate) {
      qb.andWhere('observation.observationDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    if (observedById) {
      qb.andWhere('observation.observedById = :observedById', { observedById });
    }

    if (assignedToId) {
      qb.andWhere('observation.assignedToId = :assignedToId', { assignedToId });
    }

    if (overdueOnly) {
      qb.andWhere('observation.targetResolutionDate < :now', { now: new Date() });
      qb.andWhere('observation.status NOT IN (:...closedStatuses)', {
        closedStatuses: [ObservationStatus.CLOSED, ObservationStatus.CANCELLED],
      });
    }

    qb.orderBy('observation.observationDate', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [observations, total] = await qb.getManyAndCount();

    return {
      data: observations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOneObservation(id: string): Promise<SafetyObservation> {
    const observation = await this.observationRepository.findOne({
      where: { id },
      relations: [
        'project',
        'observedBy',
        'assignedTo',
        'verifiedBy',
        'closedBy',
        'createdBy',
        'actions',
        'actions.assignedTo',
        'actions.completedBy',
        'actions.verifiedBy',
      ],
    });

    if (!observation) {
      throw new NotFoundException(`Observation with ID ${id} not found`);
    }

    return observation;
  }

  async updateObservation(id: string, dto: UpdateSafetyObservationDto, userId: string): Promise<SafetyObservation> {
    const observation = await this.findOneObservation(id);

    if (!observation.canEdit()) {
      throw new BadRequestException('Observation cannot be edited in current status');
    }

    Object.assign(observation, dto);

    return await this.observationRepository.save(observation);
  }

  async resolveObservation(id: string, dto: ResolveObservationDto, userId: string): Promise<SafetyObservation> {
    const observation = await this.findOneObservation(id);

    if (!observation.canResolve()) {
      throw new BadRequestException('Observation must be in progress to resolve');
    }

    observation.status = ObservationStatus.RESOLVED;
    observation.rootCause = dto.rootCause;
    observation.resolutionNotes = dto.resolutionNotes;
    observation.actualResolutionDate = dto.actualResolutionDate
      ? new Date(dto.actualResolutionDate)
      : new Date();

    return await this.observationRepository.save(observation);
  }

  async verifyObservation(id: string, userId: string): Promise<SafetyObservation> {
    const observation = await this.findOneObservation(id);

    if (!observation.canVerify()) {
      throw new BadRequestException('Observation must be resolved to verify');
    }

    observation.status = ObservationStatus.VERIFIED;
    observation.verifiedById = userId;
    observation.verifiedAt = new Date();

    return await this.observationRepository.save(observation);
  }

  async closeObservation(id: string, userId: string): Promise<SafetyObservation> {
    const observation = await this.findOneObservation(id);

    if (!observation.canClose()) {
      throw new BadRequestException('Observation must be verified to close');
    }

    observation.status = ObservationStatus.CLOSED;
    observation.closedById = userId;
    observation.closedAt = new Date();

    return await this.observationRepository.save(observation);
  }

  // ==================== OBSERVATION ACTIONS ====================

  async createObservationAction(dto: CreateObservationActionDto, userId: string): Promise<SafetyObservationAction> {
    const observation = await this.findOneObservation(dto.observationId);

    const action = this.observationActionRepository.create({
      ...dto,
      createdById: userId,
      status: ActionStatus.PENDING,
    });

    return await this.observationActionRepository.save(action);
  }

  async updateObservationAction(id: string, dto: UpdateObservationActionDto, userId: string): Promise<SafetyObservationAction> {
    const action = await this.observationActionRepository.findOne({
      where: { id },
      relations: ['observation'],
    });

    if (!action) {
      throw new NotFoundException(`Observation action with ID ${id} not found`);
    }

    Object.assign(action, dto);

    return await this.observationActionRepository.save(action);
  }

  async completeObservationAction(id: string, dto: CompleteActionDto, userId: string): Promise<SafetyObservationAction> {
    const action = await this.observationActionRepository.findOne({
      where: { id },
      relations: ['observation'],
    });

    if (!action) {
      throw new NotFoundException(`Observation action with ID ${id} not found`);
    }

    if (!action.canComplete()) {
      throw new BadRequestException('Action cannot be completed in current status');
    }

    action.status = ActionStatus.COMPLETED;
    action.completionNotes = dto.completionNotes;
    action.completedDate = dto.completedDate ? new Date(dto.completedDate) : new Date();
    action.completedById = userId;

    return await this.observationActionRepository.save(action);
  }

  async verifyObservationAction(id: string, userId: string): Promise<SafetyObservationAction> {
    const action = await this.observationActionRepository.findOne({
      where: { id },
      relations: ['observation'],
    });

    if (!action) {
      throw new NotFoundException(`Observation action with ID ${id} not found`);
    }

    if (!action.canVerify()) {
      throw new BadRequestException('Action must be completed to verify');
    }

    action.status = ActionStatus.VERIFIED;
    action.verifiedById = userId;
    action.verifiedAt = new Date();

    return await this.observationActionRepository.save(action);
  }

  // ==================== SAFETY INCIDENTS ====================

  async createIncident(dto: CreateSafetyIncidentDto, userId: string): Promise<SafetyIncident> {
    // Generate incident number
    const year = new Date().getFullYear();
    const count = await this.incidentRepository.count();
    const incidentNumber = `INC-${year}-${String(count + 1).padStart(4, '0')}`;

    const incident = this.incidentRepository.create({
      ...dto,
      incidentNumber,
      reportedById: userId,
      reportedAt: new Date(),
      createdById: userId,
    });

    const savedIncident = await this.incidentRepository.save(incident);

    // Auto-create investigation if required
    if (savedIncident.requiresInvestigation()) {
      await this.createInvestigation({
        incidentId: savedIncident.id,
      }, userId);
    }

    return await this.findOneIncident(savedIncident.id);
  }

  async findAllIncidents(query: QueryIncidentsDto): Promise<any> {
    const {
      projectId,
      severity,
      incidentType,
      startDate,
      endDate,
      oshaRecordableOnly,
      oshaReportableOnly,
      page = 1,
      limit = 20,
    } = query;

    const qb = this.incidentRepository
      .createQueryBuilder('incident')
      .leftJoinAndSelect('incident.project', 'project')
      .leftJoinAndSelect('incident.injuredWorker', 'worker')
      .leftJoinAndSelect('worker.user', 'workerUser')
      .leftJoinAndSelect('incident.reportedBy', 'reportedBy')
      .leftJoinAndSelect('incident.supervisorNotified', 'supervisorNotified')
      .leftJoinAndSelect('incident.createdBy', 'createdBy')
      .leftJoinAndSelect('incident.investigation', 'investigation');

    if (projectId) {
      qb.andWhere('incident.projectId = :projectId', { projectId });
    }

    if (severity) {
      qb.andWhere('incident.severity = :severity', { severity });
    }

    if (incidentType) {
      qb.andWhere('incident.incidentType = :incidentType', { incidentType });
    }

    if (startDate && endDate) {
      qb.andWhere('incident.incidentDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    if (oshaRecordableOnly) {
      qb.andWhere('incident.isOshaRecordable = true');
    }

    if (oshaReportableOnly) {
      qb.andWhere('incident.isOshaReportable = true');
    }

    qb.orderBy('incident.incidentDate', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [incidents, total] = await qb.getManyAndCount();

    return {
      data: incidents,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOneIncident(id: string): Promise<SafetyIncident> {
    const incident = await this.incidentRepository.findOne({
      where: { id },
      relations: [
        'project',
        'injuredWorker',
        'injuredWorker.user',
        'reportedBy',
        'supervisorNotified',
        'createdBy',
        'investigation',
        'investigation.investigator',
        'investigation.reviewedBy',
        'investigation.approvedBy',
      ],
    });

    if (!incident) {
      throw new NotFoundException(`Incident with ID ${id} not found`);
    }

    return incident;
  }

  async updateIncident(id: string, dto: UpdateSafetyIncidentDto, userId: string): Promise<SafetyIncident> {
    const incident = await this.findOneIncident(id);

    Object.assign(incident, dto);

    return await this.incidentRepository.save(incident);
  }

  // ==================== INCIDENT INVESTIGATIONS ====================

  async createInvestigation(dto: CreateInvestigationDto, userId: string): Promise<IncidentInvestigation> {
    const incident = await this.findOneIncident(dto.incidentId);

    // Check if investigation already exists
    const existing = await this.investigationRepository.findOne({
      where: { incidentId: dto.incidentId },
    });

    if (existing) {
      throw new BadRequestException('Investigation already exists for this incident');
    }

    const investigation = this.investigationRepository.create({
      ...dto,
      createdById: userId,
      status: InvestigationStatus.NOT_STARTED,
    });

    return await this.investigationRepository.save(investigation);
  }

  async updateInvestigation(id: string, dto: UpdateInvestigationDto, userId: string): Promise<IncidentInvestigation> {
    const investigation = await this.investigationRepository.findOne({
      where: { id },
      relations: ['incident'],
    });

    if (!investigation) {
      throw new NotFoundException(`Investigation with ID ${id} not found`);
    }

    Object.assign(investigation, dto);

    return await this.investigationRepository.save(investigation);
  }

  async startInvestigation(id: string, userId: string): Promise<IncidentInvestigation> {
    const investigation = await this.investigationRepository.findOne({
      where: { id },
      relations: ['incident'],
    });

    if (!investigation) {
      throw new NotFoundException(`Investigation with ID ${id} not found`);
    }

    if (investigation.status !== InvestigationStatus.NOT_STARTED) {
      throw new BadRequestException('Investigation already started');
    }

    investigation.status = InvestigationStatus.IN_PROGRESS;
    investigation.investigationStartDate = new Date();
    investigation.investigatorId = userId;

    return await this.investigationRepository.save(investigation);
  }

  async completeInvestigation(id: string, userId: string): Promise<IncidentInvestigation> {
    const investigation = await this.investigationRepository.findOne({
      where: { id },
      relations: ['incident'],
    });

    if (!investigation) {
      throw new NotFoundException(`Investigation with ID ${id} not found`);
    }

    if (!investigation.canComplete()) {
      throw new BadRequestException('Investigation must be in progress to complete');
    }

    investigation.status = InvestigationStatus.COMPLETED;
    investigation.investigationCompletedDate = new Date();

    return await this.investigationRepository.save(investigation);
  }

  // ==================== SAFETY CERTIFICATIONS ====================

  async createCertification(dto: CreateSafetyCertificationDto, userId: string): Promise<SafetyCertification> {
    const certification = this.certificationRepository.create({
      ...dto,
      createdById: userId,
    });

    return await this.certificationRepository.save(certification);
  }

  async findAllCertifications(query: QueryCertificationsDto): Promise<any> {
    const {
      certificationType,
      activeOnly,
      page = 1,
      limit = 20,
    } = query;

    const qb = this.certificationRepository
      .createQueryBuilder('cert')
      .leftJoinAndSelect('cert.createdBy', 'createdBy');

    if (certificationType) {
      qb.andWhere('cert.certificationType = :certificationType', { certificationType });
    }

    if (activeOnly) {
      qb.andWhere('cert.isActive = true');
    }

    qb.orderBy('cert.name', 'ASC');
    qb.skip((page - 1) * limit).take(limit);

    const [certifications, total] = await qb.getManyAndCount();

    return {
      data: certifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOneCertification(id: string): Promise<SafetyCertification> {
    const certification = await this.certificationRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!certification) {
      throw new NotFoundException(`Certification with ID ${id} not found`);
    }

    return certification;
  }

  async assignCertificationToWorker(dto: AssignCertificationDto, userId: string): Promise<WorkerSafetyCertification> {
    const certification = await this.findOneCertification(dto.certificationId);

    // Check if already assigned
    const existing = await this.workerCertificationRepository.findOne({
      where: {
        workerId: dto.workerId,
        certificationId: dto.certificationId,
      },
    });

    if (existing) {
      throw new BadRequestException('Certification already assigned to this worker');
    }

    const workerCert = this.workerCertificationRepository.create({
      ...dto,
      createdById: userId,
      status: CertificationStatus.ACTIVE,
    });

    // Update status based on expiration
    workerCert.updateStatus();

    return await this.workerCertificationRepository.save(workerCert);
  }

  async findAllWorkerCertifications(query: QueryWorkerCertificationsDto): Promise<any> {
    const {
      workerId,
      certificationId,
      certificationType,
      status,
      expiringSoonOnly,
      expiredOnly,
      page = 1,
      limit = 20,
    } = query;

    const qb = this.workerCertificationRepository
      .createQueryBuilder('wc')
      .leftJoinAndSelect('wc.worker', 'worker')
      .leftJoinAndSelect('worker.user', 'workerUser')
      .leftJoinAndSelect('wc.certification', 'certification')
      .leftJoinAndSelect('wc.verifiedBy', 'verifiedBy')
      .leftJoinAndSelect('wc.createdBy', 'createdBy');

    if (workerId) {
      qb.andWhere('wc.workerId = :workerId', { workerId });
    }

    if (certificationId) {
      qb.andWhere('wc.certificationId = :certificationId', { certificationId });
    }

    if (certificationType) {
      qb.andWhere('certification.certificationType = :certificationType', { certificationType });
    }

    if (status) {
      qb.andWhere('wc.status = :status', { status });
    }

    if (expiringSoonOnly) {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      qb.andWhere('wc.expirationDate <= :thirtyDays', { thirtyDays: thirtyDaysFromNow });
      qb.andWhere('wc.expirationDate > :now', { now: new Date() });
    }

    if (expiredOnly) {
      qb.andWhere('wc.expirationDate < :now', { now: new Date() });
    }

    qb.orderBy('wc.expirationDate', 'ASC');
    qb.skip((page - 1) * limit).take(limit);

    const [workerCerts, total] = await qb.getManyAndCount();

    return {
      data: workerCerts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==================== OSHA METRICS ====================

  async calculateOshaMetrics(projectId: string, year: number): Promise<any> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    // Get all OSHA recordable incidents for the year
    const incidents = await this.incidentRepository.find({
      where: {
        projectId,
        isOshaRecordable: true,
        incidentDate: Between(startDate, endDate),
      },
    });

    // Total recordable incidents
    const totalRecordable = incidents.length;

    // Days away from work cases (DART)
    const daysAwayCases = incidents.filter((i) => i.daysAwayFromWork > 0).length;

    // Restricted work cases
    const restrictedCases = incidents.filter(
      (i) => i.daysRestrictedWork > 0 && i.daysAwayFromWork === 0
    ).length;

    // Fatalities
    const fatalities = incidents.filter(
      (i) => i.severity === IncidentSeverity.FATALITY
    ).length;

    // Calculate total hours worked (this would need to come from time attendance)
    // For now, estimate based on 2080 hours per worker per year
    const totalHoursWorked = 200000; // Placeholder

    // TRIR = (Total Recordable Cases * 200,000) / Total Hours Worked
    const trir = totalHoursWorked > 0 ? (totalRecordable * 200000) / totalHoursWorked : 0;

    // DART = (Days Away + Restricted Cases * 200,000) / Total Hours Worked
    const dart =
      totalHoursWorked > 0 ? ((daysAwayCases + restrictedCases) * 200000) / totalHoursWorked : 0;

    return {
      year,
      projectId,
      totalRecordable,
      daysAwayCases,
      restrictedCases,
      fatalities,
      totalHoursWorked,
      trir: Math.round(trir * 100) / 100,
      dart: Math.round(dart * 100) / 100,
      incidentsByMonth: await this.getIncidentsByMonth(projectId, year),
      incidentsBySeverity: await this.getIncidentsBySeverity(projectId, year),
      incidentsByType: await this.getIncidentsByType(projectId, year),
    };
  }

  private async getIncidentsByMonth(projectId: string, year: number): Promise<any[]> {
    const months = [];
    for (let month = 0; month < 12; month++) {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      const count = await this.incidentRepository.count({
        where: {
          projectId,
          incidentDate: Between(startDate, endDate),
        },
      });

      months.push({
        month: month + 1,
        count,
      });
    }

    return months;
  }

  private async getIncidentsBySeverity(projectId: string, year: number): Promise<any> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const incidents = await this.incidentRepository.find({
      where: {
        projectId,
        incidentDate: Between(startDate, endDate),
      },
    });

    const bySeverity: Record<string, number> = {};

    incidents.forEach((incident) => {
      if (!bySeverity[incident.severity]) {
        bySeverity[incident.severity] = 0;
      }
      bySeverity[incident.severity]++;
    });

    return bySeverity;
  }

  private async getIncidentsByType(projectId: string, year: number): Promise<any> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const incidents = await this.incidentRepository.find({
      where: {
        projectId,
        incidentDate: Between(startDate, endDate),
      },
    });

    const byType: Record<string, number> = {};

    incidents.forEach((incident) => {
      if (!byType[incident.incidentType]) {
        byType[incident.incidentType] = 0;
      }
      byType[incident.incidentType]++;
    });

    return byType;
  }
}
