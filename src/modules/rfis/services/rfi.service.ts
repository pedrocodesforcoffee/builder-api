import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Brackets } from 'typeorm';
import { Rfi, RfiStatus, BallInCourt } from '../entities/rfi.entity';
import { RfiResponse, RfiResponseType } from '../entities/rfi-response.entity';
import { RfiHistory, RfiHistoryAction } from '../entities/rfi-history.entity';
import { RfiReference } from '../entities/rfi-reference.entity';
import { CreateRfiDto } from '../dto/create-rfi.dto';
import { UpdateRfiDto } from '../dto/update-rfi.dto';
import { RfiQueryDto } from '../dto/rfi-query.dto';
import { CreateRfiResponseDto } from '../dto/create-rfi-response.dto';
import { AddReferenceDto } from '../dto/add-reference.dto';
import { RfiNumberingService } from './rfi-numbering.service';
import { Project } from '../../projects/entities/project.entity';

@Injectable()
export class RfiService {
  constructor(
    @InjectRepository(Rfi)
    private readonly rfiRepository: Repository<Rfi>,
    @InjectRepository(RfiResponse)
    private readonly responseRepository: Repository<RfiResponse>,
    @InjectRepository(RfiHistory)
    private readonly historyRepository: Repository<RfiHistory>,
    @InjectRepository(RfiReference)
    private readonly referenceRepository: Repository<RfiReference>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly numberingService: RfiNumberingService,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    projectId: string,
    userId: string,
    dto: CreateRfiDto,
  ): Promise<Rfi> {
    // Validate project exists and get organizationId
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Generate RFI number
      const { number, sequenceNumber } = await this.numberingService.generateNumber(
        projectId,
        queryRunner.manager,
      );

      // Create RFI
      const rfi = this.rfiRepository.create({
        projectId,
        organizationId: project.organizationId,
        number,
        sequenceNumber,
        subject: dto.subject,
        question: dto.question,
        questionHtml: dto.questionHtml,
        priority: dto.priority,
        discipline: dto.discipline,
        location: dto.location,
        locationData: dto.locationData,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : this.calculateDefaultDueDate(dto.slaResponseDays),
        assignedToId: dto.assignedToId,
        assignedToOrgId: dto.assignedToOrgId,
        managerId: dto.managerId,
        distributionList: dto.distributionList || [],
        specSection: dto.specSection,
        drawingReferences: dto.drawingReferences || [],
        hasCostImpact: dto.hasCostImpact,
        estimatedCostImpact: dto.estimatedCostImpact,
        hasScheduleImpact: dto.hasScheduleImpact,
        estimatedScheduleImpactDays: dto.estimatedScheduleImpactDays,
        impactDescription: dto.impactDescription,
        slaResponseDays: dto.slaResponseDays || 7,
        isPrivate: dto.isPrivate,
        createdById: userId,
        status: dto.sendImmediately ? RfiStatus.OPEN : RfiStatus.DRAFT,
        sentDate: dto.sendImmediately ? new Date() : null,
        ballInCourt: dto.assignedToId ? BallInCourt.ASSIGNEE : BallInCourt.CREATOR,
        ballInCourtUserId: dto.assignedToId || userId,
      });

      const savedRfi = await queryRunner.manager.save(rfi);

      // Create history entry
      await this.createHistoryEntry(
        savedRfi.id,
        userId,
        RfiHistoryAction.CREATED,
        `RFI ${number} created`,
        null,
        { status: savedRfi.status, subject: savedRfi.subject },
        queryRunner.manager,
      );

      if (dto.sendImmediately) {
        await this.createHistoryEntry(
          savedRfi.id,
          userId,
          RfiHistoryAction.OPENED,
          `RFI ${number} opened and sent`,
          null,
          { sentDate: savedRfi.sentDate },
          queryRunner.manager,
        );
      }

      await queryRunner.commitTransaction();

      return this.findOne(savedRfi.id, projectId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(
    projectId: string,
    query: RfiQueryDto,
  ): Promise<{ data: Rfi[]; total: number; page: number; limit: number }> {
    const qb = this.rfiRepository
      .createQueryBuilder('rfi')
      .leftJoinAndSelect('rfi.assignedTo', 'assignedTo')
      .leftJoinAndSelect('rfi.createdBy', 'createdBy')
      .leftJoinAndSelect('rfi.ballInCourtUser', 'ballInCourtUser')
      .where('rfi.projectId = :projectId', { projectId });

    // Apply filters
    if (query.status) {
      qb.andWhere('rfi.status = :status', { status: query.status });
    }

    if (query.statuses && query.statuses.length > 0) {
      qb.andWhere('rfi.status IN (:...statuses)', { statuses: query.statuses });
    }

    if (query.priority) {
      qb.andWhere('rfi.priority = :priority', { priority: query.priority });
    }

    if (query.discipline) {
      qb.andWhere('rfi.discipline = :discipline', { discipline: query.discipline });
    }

    if (query.assignedToId) {
      qb.andWhere('rfi.assignedToId = :assignedToId', { assignedToId: query.assignedToId });
    }

    if (query.createdById) {
      qb.andWhere('rfi.createdById = :createdById', { createdById: query.createdById });
    }

    if (query.ballInCourt) {
      qb.andWhere('rfi.ballInCourt = :ballInCourt', { ballInCourt: query.ballInCourt });
    }

    if (query.ballInCourtUserId) {
      qb.andWhere('rfi.ballInCourtUserId = :ballInCourtUserId', {
        ballInCourtUserId: query.ballInCourtUserId,
      });
    }

    if (query.isOverdue !== undefined) {
      qb.andWhere('rfi.isOverdue = :isOverdue', { isOverdue: query.isOverdue });
    }

    if (query.dueDateFrom) {
      qb.andWhere('rfi.dueDate >= :dueDateFrom', { dueDateFrom: query.dueDateFrom });
    }

    if (query.dueDateTo) {
      qb.andWhere('rfi.dueDate <= :dueDateTo', { dueDateTo: query.dueDateTo });
    }

    if (query.search) {
      qb.andWhere(
        new Brackets((sqb) => {
          sqb
            .where('rfi.subject ILIKE :search', { search: `%${query.search}%` })
            .orWhere('rfi.question ILIKE :search', { search: `%${query.search}%` })
            .orWhere('rfi.number ILIKE :search', { search: `%${query.search}%` });
        }),
      );
    }

    // Sorting
    const sortField = `rfi.${query.sortBy || 'createdAt'}`;
    qb.orderBy(sortField, query.sortOrder || 'DESC');

    // Pagination
    const page = query.page || 1;
    const limit = query.limit || 20;
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: string, projectId: string): Promise<Rfi> {
    const rfi = await this.rfiRepository.findOne({
      where: { id, projectId },
      relations: [
        'project',
        'assignedTo',
        'assignedToOrg',
        'createdBy',
        'manager',
        'ballInCourtUser',
        'responses',
        'responses.responder',
        'history',
        'history.performedBy',
        'references',
      ],
      order: {
        responses: { createdAt: 'ASC' },
        history: { createdAt: 'DESC' },
      },
    });

    if (!rfi) {
      throw new NotFoundException(`RFI not found`);
    }

    return rfi;
  }

  async update(
    id: string,
    projectId: string,
    userId: string,
    dto: UpdateRfiDto,
  ): Promise<Rfi> {
    const rfi = await this.findOne(id, projectId);

    if (rfi.status === RfiStatus.CLOSED || rfi.status === RfiStatus.VOID) {
      throw new BadRequestException('Cannot update a closed or voided RFI');
    }

    const previousValue: Record<string, any> = {};
    const newValue: Record<string, any> = {};

    // Track changes for history
    const fieldsToTrack = [
      'subject', 'question', 'priority', 'discipline', 'location',
      'dueDate', 'assignedToId', 'hasCostImpact', 'hasScheduleImpact',
    ];

    for (const field of fieldsToTrack) {
      if (dto[field] !== undefined && dto[field] !== rfi[field]) {
        previousValue[field] = rfi[field];
        newValue[field] = dto[field];
      }
    }

    // Update fields
    Object.assign(rfi, dto);

    // Handle assignment change
    if (dto.assignedToId && dto.assignedToId !== rfi.assignedToId) {
      rfi.ballInCourt = BallInCourt.ASSIGNEE;
      rfi.ballInCourtUserId = dto.assignedToId;
    }

    const updatedRfi = await this.rfiRepository.save(rfi);

    // Create history entry if changes were made
    if (Object.keys(newValue).length > 0) {
      await this.createHistoryEntry(
        id,
        userId,
        RfiHistoryAction.EDITED,
        `RFI updated`,
        previousValue,
        newValue,
      );
    }

    return this.findOne(id, projectId);
  }

  async open(id: string, projectId: string, userId: string): Promise<Rfi> {
    const rfi = await this.findOne(id, projectId);

    if (rfi.status !== RfiStatus.DRAFT) {
      throw new BadRequestException('Can only open RFIs in DRAFT status');
    }

    if (!rfi.assignedToId) {
      throw new BadRequestException('RFI must be assigned before opening');
    }

    rfi.status = RfiStatus.OPEN;
    rfi.sentDate = new Date();
    rfi.ballInCourt = BallInCourt.ASSIGNEE;
    rfi.ballInCourtUserId = rfi.assignedToId;

    // Calculate due date if not set
    if (!rfi.dueDate) {
      rfi.dueDate = this.calculateDefaultDueDate(rfi.slaResponseDays);
    }

    await this.rfiRepository.save(rfi);

    await this.createHistoryEntry(
      id,
      userId,
      RfiHistoryAction.OPENED,
      `RFI opened and sent to ${rfi.assignedTo?.email || 'assignee'}`,
      { status: RfiStatus.DRAFT },
      { status: RfiStatus.OPEN, sentDate: rfi.sentDate },
    );

    return this.findOne(id, projectId);
  }

  async addResponse(
    rfiId: string,
    projectId: string,
    userId: string,
    dto: CreateRfiResponseDto,
  ): Promise<RfiResponse> {
    const rfi = await this.findOne(rfiId, projectId);

    if (rfi.status === RfiStatus.CLOSED || rfi.status === RfiStatus.VOID) {
      throw new BadRequestException('Cannot respond to a closed or voided RFI');
    }

    // Create response entity - rfiId will be automatically set from the rfi relation via @RelationId
    const responseEntity = this.responseRepository.create({
      rfi: rfi,  // Only set the relation, rfiId is auto-populated via @RelationId
      responderId: userId,
      response: dto.response,
      responseType: dto.responseType || RfiResponseType.RESPONSE,
      attachmentIds: dto.attachmentIds || [],
      isOfficial: dto.isOfficial || false,
      isInternal: dto.isInternal || false,
      responseHtml: dto.responseHtml,
      forwardedToId: dto.forwardedToId,
      forwardNote: dto.forwardNote,
    });

    const savedResponse = await this.responseRepository.save(responseEntity);

    // Update RFI status and ball-in-court
    if (dto.isOfficial) {
      rfi.status = RfiStatus.ANSWERED;
      rfi.officialResponse = dto.response;
      rfi.officialResponseHtml = dto.responseHtml;
      rfi.responseDate = new Date();
      rfi.responseDays = this.calculateResponseDays(rfi.sentDate, rfi.responseDate);
      rfi.ballInCourt = BallInCourt.CREATOR;
      rfi.ballInCourtUserId = rfi.createdById;

      await this.rfiRepository.save(rfi);

      await this.createHistoryEntry(
        rfiId,
        userId,
        RfiHistoryAction.ANSWERED,
        'Official response provided',
        { status: RfiStatus.OPEN },
        { status: RfiStatus.ANSWERED, responseDate: rfi.responseDate },
        undefined,
        savedResponse.id,
        'RfiResponse',
      );
    } else {
      await this.createHistoryEntry(
        rfiId,
        userId,
        RfiHistoryAction.RESPONDED,
        'Response added',
        null,
        null,
        undefined,
        savedResponse.id,
        'RfiResponse',
      );
    }

    // Handle forwarding
    if (dto.forwardedToId) {
      rfi.ballInCourtUserId = dto.forwardedToId;
      await this.rfiRepository.save(rfi);

      await this.createHistoryEntry(
        rfiId,
        userId,
        RfiHistoryAction.FORWARDED,
        `Forwarded to another user`,
        { ballInCourtUserId: rfi.ballInCourtUserId },
        { ballInCourtUserId: dto.forwardedToId },
      );
    }

    return this.responseRepository.findOne({
      where: { id: savedResponse.id },
      relations: ['responder'],
    });
  }

  async close(
    id: string,
    projectId: string,
    userId: string,
  ): Promise<Rfi> {
    const rfi = await this.findOne(id, projectId);

    if (rfi.status !== RfiStatus.ANSWERED) {
      throw new BadRequestException('Can only close RFIs in ANSWERED status');
    }

    // Check if user has permission to close (creator or manager)
    if (rfi.createdById !== userId && rfi.managerId !== userId) {
      throw new ForbiddenException('Only the creator or manager can close this RFI');
    }

    rfi.status = RfiStatus.CLOSED;
    rfi.closedDate = new Date();

    await this.rfiRepository.save(rfi);

    await this.createHistoryEntry(
      id,
      userId,
      RfiHistoryAction.CLOSED,
      'RFI closed',
      { status: RfiStatus.ANSWERED },
      { status: RfiStatus.CLOSED, closedDate: rfi.closedDate },
    );

    return this.findOne(id, projectId);
  }

  async void(
    id: string,
    projectId: string,
    userId: string,
    reason: string,
  ): Promise<Rfi> {
    const rfi = await this.findOne(id, projectId);

    if (rfi.status === RfiStatus.VOID) {
      throw new BadRequestException('RFI is already voided');
    }

    const previousStatus = rfi.status;
    rfi.status = RfiStatus.VOID;
    rfi.voidReason = reason;

    await this.rfiRepository.save(rfi);

    await this.createHistoryEntry(
      id,
      userId,
      RfiHistoryAction.VOIDED,
      `RFI voided: ${reason}`,
      { status: previousStatus },
      { status: RfiStatus.VOID, voidReason: reason },
    );

    return this.findOne(id, projectId);
  }

  async addReference(
    rfiId: string,
    projectId: string,
    userId: string,
    dto: AddReferenceDto,
  ): Promise<RfiReference> {
    const rfi = await this.findOne(rfiId, projectId);

    const reference = this.referenceRepository.create({
      rfiId,
      ...dto,
      createdById: userId,
    });

    const saved = await this.referenceRepository.save(reference);

    await this.createHistoryEntry(
      rfiId,
      userId,
      RfiHistoryAction.ATTACHMENT_ADDED,
      `Reference added: ${dto.referenceType} - ${dto.referenceNumber}`,
      null,
      { referenceType: dto.referenceType, referenceNumber: dto.referenceNumber },
      undefined,
      saved.id,
      'RfiReference',
    );

    return saved;
  }

  async removeReference(
    rfiId: string,
    referenceId: string,
    projectId: string,
    userId: string,
  ): Promise<void> {
    const rfi = await this.findOne(rfiId, projectId);

    const reference = await this.referenceRepository.findOne({
      where: { id: referenceId, rfiId },
    });

    if (!reference) {
      throw new NotFoundException('Reference not found');
    }

    await this.referenceRepository.remove(reference);

    await this.createHistoryEntry(
      rfiId,
      userId,
      RfiHistoryAction.ATTACHMENT_REMOVED,
      `Reference removed: ${reference.referenceType} - ${reference.referenceNumber}`,
      { referenceType: reference.referenceType, referenceNumber: reference.referenceNumber },
      null,
    );
  }

  async updateOverdueStatus(): Promise<number> {
    const now = new Date();

    const result = await this.rfiRepository
      .createQueryBuilder()
      .update(Rfi)
      .set({
        isOverdue: true,
        daysOverdue: () => `EXTRACT(DAY FROM NOW() - "dueDate")::int`,
      })
      .where('status IN (:...statuses)', { statuses: [RfiStatus.OPEN, RfiStatus.DRAFT] })
      .andWhere('dueDate < :now', { now })
      .andWhere('isOverdue = false')
      .execute();

    return result.affected || 0;
  }

  private calculateDefaultDueDate(slaResponseDays: number = 7): Date {
    const date = new Date();
    date.setDate(date.getDate() + slaResponseDays);
    return date;
  }

  private calculateResponseDays(sentDate: Date, responseDate: Date): number {
    if (!sentDate || !responseDate) return null;
    const diff = responseDate.getTime() - sentDate.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  private async createHistoryEntry(
    rfiId: string,
    userId: string,
    action: RfiHistoryAction,
    description: string,
    previousValue: Record<string, any> | null,
    newValue: Record<string, any> | null,
    manager?: any,
    relatedEntityId?: string,
    relatedEntityType?: string,
  ): Promise<RfiHistory> {
    const history = this.historyRepository.create({
      rfiId,
      performedById: userId,
      action,
      description,
      previousValue,
      newValue,
      relatedEntityId,
      relatedEntityType,
    });

    if (manager) {
      return manager.save(history);
    }
    return this.historyRepository.save(history);
  }
}
