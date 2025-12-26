import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Brackets } from 'typeorm';
import { Submittal, SubmittalStatus } from '../entities/submittal.entity';
import { SubmittalItem } from '../entities/submittal-item.entity';
import { SubmittalRevision } from '../entities/submittal-revision.entity';
import { SubmittalResponse, ApprovalStamp } from '../entities/submittal-response.entity';
import { SubmittalHistory, SubmittalHistoryAction } from '../entities/submittal-history.entity';
import { CreateSubmittalDto } from '../dto/create-submittal.dto';
import { UpdateSubmittalDto } from '../dto/update-submittal.dto';
import { SubmittalQueryDto } from '../dto/submittal-query.dto';
import { SubmitSubmittalDto } from '../dto/submit-submittal.dto';
import { RespondSubmittalDto } from '../dto/respond-submittal.dto';
import { CreateRevisionDto } from '../dto/create-revision.dto';
import { SubmittalNumberingService } from './submittal-numbering.service';

@Injectable()
export class SubmittalService {
  constructor(
    @InjectRepository(Submittal)
    private readonly submittalRepository: Repository<Submittal>,
    @InjectRepository(SubmittalItem)
    private readonly itemRepository: Repository<SubmittalItem>,
    @InjectRepository(SubmittalRevision)
    private readonly revisionRepository: Repository<SubmittalRevision>,
    @InjectRepository(SubmittalResponse)
    private readonly responseRepository: Repository<SubmittalResponse>,
    @InjectRepository(SubmittalHistory)
    private readonly historyRepository: Repository<SubmittalHistory>,
    private readonly numberingService: SubmittalNumberingService,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    projectId: string,
    organizationId: string,
    userId: string,
    dto: CreateSubmittalDto,
  ): Promise<Submittal> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Generate submittal number
      const { number, sequenceNumber } = await this.numberingService.generateNumber(
        projectId,
        queryRunner.manager,
      );

      // Create submittal
      const submittal = this.submittalRepository.create({
        projectId,
        organizationId,
        number,
        sequenceNumber,
        title: dto.title,
        description: dto.description,
        specSection: dto.specSection,
        specSectionTitle: dto.specSectionTitle,
        specParagraph: dto.specParagraph,
        submittalType: dto.submittalType,
        priority: dto.priority,
        responsibleContractorId: dto.responsibleContractorId,
        preparedById: dto.preparedById,
        submittalManagerId: dto.submittalManagerId,
        approverId: dto.approverId,
        approverOrgId: dto.approverOrgId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        requiredOnSiteDate: dto.requiredOnSiteDate ? new Date(dto.requiredOnSiteDate) : null,
        leadTimeDays: dto.leadTimeDays,
        reviewTimeDays: dto.reviewTimeDays || 14,
        location: dto.location,
        drawingReferences: dto.drawingReferences || [],
        distributionList: dto.distributionList || [],
        isPrivate: dto.isPrivate,
        createdById: userId,
        status: SubmittalStatus.NOT_STARTED,
        currentRevision: 0,
      });

      const savedSubmittal = await queryRunner.manager.save(submittal);

      // Create items if provided
      if (dto.items && dto.items.length > 0) {
        const items = dto.items.map((itemDto, index) =>
          this.itemRepository.create({
            submittalId: savedSubmittal.id,
            itemNumber: index + 1,
            ...itemDto,
            revisionNumber: 0,
            sortOrder: index,
          }),
        );
        await queryRunner.manager.save(items);
      }

      // Create history entry
      await this.createHistoryEntry(
        savedSubmittal.id,
        userId,
        SubmittalHistoryAction.CREATED,
        `Submittal ${number} created`,
        null,
        null,
        { status: savedSubmittal.status, title: savedSubmittal.title },
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();

      return this.findOne(savedSubmittal.id, projectId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(
    projectId: string,
    query: SubmittalQueryDto,
  ): Promise<{ data: Submittal[]; total: number; page: number; limit: number }> {
    const qb = this.submittalRepository
      .createQueryBuilder('submittal')
      .leftJoinAndSelect('submittal.responsibleContractor', 'responsibleContractor')
      .leftJoinAndSelect('submittal.approver', 'approver')
      .leftJoinAndSelect('submittal.approverOrg', 'approverOrg')
      .leftJoinAndSelect('submittal.createdBy', 'createdBy')
      .where('submittal.projectId = :projectId', { projectId });

    // Apply filters
    if (query.status) {
      qb.andWhere('submittal.status = :status', { status: query.status });
    }

    if (query.statuses && query.statuses.length > 0) {
      qb.andWhere('submittal.status IN (:...statuses)', { statuses: query.statuses });
    }

    if (query.submittalType) {
      qb.andWhere('submittal.submittalType = :submittalType', { submittalType: query.submittalType });
    }

    if (query.priority) {
      qb.andWhere('submittal.priority = :priority', { priority: query.priority });
    }

    if (query.specSection) {
      qb.andWhere('submittal.specSection = :specSection', { specSection: query.specSection });
    }

    if (query.division) {
      qb.andWhere('submittal.specSection LIKE :division', { division: `${query.division}%` });
    }

    if (query.responsibleContractorId) {
      qb.andWhere('submittal.responsibleContractorId = :responsibleContractorId', {
        responsibleContractorId: query.responsibleContractorId,
      });
    }

    if (query.approverId) {
      qb.andWhere('submittal.approverId = :approverId', { approverId: query.approverId });
    }

    if (query.isOverdue !== undefined) {
      qb.andWhere('submittal.isOverdue = :isOverdue', { isOverdue: query.isOverdue });
    }

    if (query.dueDateFrom) {
      qb.andWhere('submittal.dueDate >= :dueDateFrom', { dueDateFrom: query.dueDateFrom });
    }

    if (query.dueDateTo) {
      qb.andWhere('submittal.dueDate <= :dueDateTo', { dueDateTo: query.dueDateTo });
    }

    if (query.requiredOnSiteFrom) {
      qb.andWhere('submittal.requiredOnSiteDate >= :requiredOnSiteFrom', {
        requiredOnSiteFrom: query.requiredOnSiteFrom,
      });
    }

    if (query.requiredOnSiteTo) {
      qb.andWhere('submittal.requiredOnSiteDate <= :requiredOnSiteTo', {
        requiredOnSiteTo: query.requiredOnSiteTo,
      });
    }

    if (query.search) {
      qb.andWhere(
        new Brackets((sqb) => {
          sqb
            .where('submittal.title ILIKE :search', { search: `%${query.search}%` })
            .orWhere('submittal.number ILIKE :search', { search: `%${query.search}%` })
            .orWhere('submittal.specSection ILIKE :search', { search: `%${query.search}%` });
        }),
      );
    }

    // Sorting
    const sortField = `submittal.${query.sortBy || 'createdAt'}`;
    qb.orderBy(sortField, query.sortOrder || 'DESC');

    // Pagination
    const page = query.page || 1;
    const limit = query.limit || 20;
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: string, projectId: string): Promise<Submittal> {
    const submittal = await this.submittalRepository.findOne({
      where: { id, projectId },
      relations: [
        'project',
        'responsibleContractor',
        'preparedBy',
        'submittalManager',
        'approver',
        'approverOrg',
        'createdBy',
        'items',
        'revisions',
        'revisions.submittedBy',
        'revisions.reviewedBy',
        'history',
        'history.performedBy',
      ],
      order: {
        items: { itemNumber: 'ASC' },
        revisions: { revisionNumber: 'DESC' },
        history: { createdAt: 'DESC' },
      },
    });

    if (!submittal) {
      throw new NotFoundException('Submittal not found');
    }

    return submittal;
  }

  async update(
    id: string,
    projectId: string,
    userId: string,
    dto: UpdateSubmittalDto,
  ): Promise<Submittal> {
    const submittal = await this.findOne(id, projectId);

    // Only allow updates when NOT_STARTED or DRAFT
    if (submittal.status !== SubmittalStatus.NOT_STARTED && submittal.status !== SubmittalStatus.DRAFT) {
      throw new BadRequestException('Can only update submittals in NOT_STARTED or DRAFT status');
    }

    const previousValue = { ...submittal };

    Object.assign(submittal, dto);

    await this.submittalRepository.save(submittal);

    await this.createHistoryEntry(
      id,
      userId,
      SubmittalHistoryAction.UPDATED,
      'Submittal updated',
      submittal.currentRevision,
      previousValue,
      dto,
    );

    return this.findOne(id, projectId);
  }

  async submit(
    id: string,
    projectId: string,
    userId: string,
    dto: SubmitSubmittalDto,
  ): Promise<Submittal> {
    const submittal = await this.findOne(id, projectId);

    const allowedStatuses = [
      SubmittalStatus.NOT_STARTED,
      SubmittalStatus.DRAFT,
      SubmittalStatus.REVISE_RESUBMIT,
    ];

    if (!allowedStatuses.includes(submittal.status)) {
      throw new BadRequestException(
        `Cannot submit from status ${submittal.status}. Allowed: ${allowedStatuses.join(', ')}`,
      );
    }

    // Validate has items
    if (!submittal.items || submittal.items.length === 0) {
      throw new BadRequestException('Submittal must have at least one item before submitting');
    }

    // Create revision record
    const revision = this.revisionRepository.create({
      submittalId: id,
      revisionNumber: submittal.currentRevision,
      revisionLabel: `Rev ${submittal.currentRevision}`,
      status: SubmittalStatus.SUBMITTED,
      itemsSnapshot: submittal.items.map((item) => ({
        itemNumber: item.itemNumber,
        description: item.description,
        manufacturer: item.manufacturer,
        modelNumber: item.modelNumber,
        attachmentIds: item.attachmentIds,
      })),
      attachmentIds: dto.attachmentIds || [],
      submittedDate: new Date(),
      submittedById: userId,
    });

    await this.revisionRepository.save(revision);

    // Update submittal status
    const previousStatus = submittal.status;
    submittal.status = SubmittalStatus.SUBMITTED;
    submittal.submittedDate = new Date();

    await this.submittalRepository.save(submittal);

    // Update item statuses
    await this.itemRepository.update(
      { submittalId: id },
      { status: SubmittalStatus.SUBMITTED },
    );

    // Create history
    await this.createHistoryEntry(
      id,
      userId,
      SubmittalHistoryAction.SUBMITTED,
      `Submittal submitted (Rev ${submittal.currentRevision})`,
      submittal.currentRevision,
      { status: previousStatus },
      { status: SubmittalStatus.SUBMITTED, submittedDate: submittal.submittedDate },
    );

    return this.findOne(id, projectId);
  }

  async respond(
    id: string,
    projectId: string,
    userId: string,
    userOrgId: string,
    dto: RespondSubmittalDto,
  ): Promise<SubmittalResponse> {
    const submittal = await this.findOne(id, projectId);

    if (submittal.status !== SubmittalStatus.SUBMITTED &&
        submittal.status !== SubmittalStatus.UNDER_REVIEW) {
      throw new BadRequestException('Submittal must be SUBMITTED or UNDER_REVIEW to respond');
    }

    // Determine resulting status based on stamp
    const resultingStatus = this.getResultingStatus(dto.stamp);

    // Calculate review duration
    const reviewStartDate = submittal.reviewStartDate || submittal.submittedDate;
    const reviewDurationDays = reviewStartDate
      ? Math.ceil((Date.now() - new Date(reviewStartDate).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Get current revision
    const currentRevision = await this.revisionRepository.findOne({
      where: { submittalId: id, revisionNumber: submittal.currentRevision },
    });

    // Create response
    const response = this.responseRepository.create({
      submittalId: id,
      revisionId: currentRevision?.id,
      revisionNumber: submittal.currentRevision,
      stamp: dto.stamp,
      resultingStatus,
      comments: dto.comments,
      commentsHtml: dto.commentsHtml,
      conditions: dto.conditions,
      markupAttachmentIds: dto.markupAttachmentIds || [],
      reviewerId: userId,
      reviewerOrgId: userOrgId,
      reviewerTitle: dto.reviewerTitle,
      signatureData: dto.signatureData
        ? {
            signedAt: new Date(),
            signatureImage: dto.signatureData.signatureImage,
          }
        : null,
      isOfficial: dto.isOfficial,
      reviewDurationDays,
    });

    const savedResponse = await this.responseRepository.save(response);

    // Update revision if exists
    if (currentRevision) {
      currentRevision.status = resultingStatus;
      currentRevision.reviewerResponse = dto.comments;
      currentRevision.reviewerStamp = dto.stamp;
      currentRevision.reviewedDate = new Date();
      currentRevision.reviewedById = userId;
      await this.revisionRepository.save(currentRevision);
    }

    // Update submittal
    const previousStatus = submittal.status;
    submittal.status = resultingStatus;
    submittal.approvalStamp = dto.stamp;
    submittal.daysInReview = reviewDurationDays;

    if (resultingStatus === SubmittalStatus.APPROVED ||
        resultingStatus === SubmittalStatus.APPROVED_AS_NOTED) {
      submittal.approvedDate = new Date();
      submittal.approvalConditions = dto.conditions;
    } else if (resultingStatus === SubmittalStatus.REJECTED) {
      submittal.rejectionReason = dto.comments;
    }

    await this.submittalRepository.save(submittal);

    // Create history
    const historyAction = this.getHistoryAction(dto.stamp);
    await this.createHistoryEntry(
      id,
      userId,
      historyAction,
      `Response: ${dto.stamp}${dto.comments ? ` - ${dto.comments.substring(0, 100)}` : ''}`,
      submittal.currentRevision,
      { status: previousStatus },
      { status: resultingStatus, stamp: dto.stamp },
      undefined,
      savedResponse.id,
      'SubmittalResponse',
    );

    return this.responseRepository.findOne({
      where: { id: savedResponse.id },
      relations: ['reviewer', 'reviewerOrg'],
    });
  }

  async createRevision(
    id: string,
    projectId: string,
    userId: string,
    dto: CreateRevisionDto,
  ): Promise<Submittal> {
    const submittal = await this.findOne(id, projectId);

    if (submittal.status !== SubmittalStatus.REVISE_RESUBMIT) {
      throw new BadRequestException('Can only create revision when status is REVISE_RESUBMIT');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Increment revision number
      const newRevisionNumber = submittal.currentRevision + 1;

      // Update submittal
      submittal.currentRevision = newRevisionNumber;
      submittal.status = SubmittalStatus.DRAFT;
      await queryRunner.manager.save(submittal);

      // Update or replace items
      if (dto.items && dto.items.length > 0) {
        // Archive current items by updating revision number
        await queryRunner.manager.update(
          SubmittalItem,
          { submittalId: id, revisionNumber: submittal.currentRevision - 1 },
          { status: SubmittalStatus.REVISE_RESUBMIT },
        );

        // Create new items for new revision
        const newItems = dto.items.map((itemDto, index) =>
          this.itemRepository.create({
            submittalId: id,
            itemNumber: index + 1,
            ...itemDto,
            revisionNumber: newRevisionNumber,
            sortOrder: index,
            status: SubmittalStatus.DRAFT,
          }),
        );
        await queryRunner.manager.save(newItems);
      } else {
        // Clone existing items to new revision
        const existingItems = submittal.items.filter(
          (item) => item.revisionNumber === submittal.currentRevision - 1,
        );
        const clonedItems = existingItems.map((item) =>
          this.itemRepository.create({
            ...item,
            id: undefined,
            revisionNumber: newRevisionNumber,
            status: SubmittalStatus.DRAFT,
          }),
        );
        await queryRunner.manager.save(clonedItems);
      }

      // Create history
      await this.createHistoryEntry(
        id,
        userId,
        SubmittalHistoryAction.REVISION_CREATED,
        `Revision ${newRevisionNumber} created: ${dto.revisionReason}`,
        newRevisionNumber,
        { revision: submittal.currentRevision - 1 },
        { revision: newRevisionNumber, reason: dto.revisionReason },
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();

      return this.findOne(id, projectId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async close(id: string, projectId: string, userId: string): Promise<Submittal> {
    const submittal = await this.findOne(id, projectId);

    const closableStatuses = [
      SubmittalStatus.APPROVED,
      SubmittalStatus.APPROVED_AS_NOTED,
    ];

    if (!closableStatuses.includes(submittal.status)) {
      throw new BadRequestException(
        `Cannot close submittal with status ${submittal.status}. Must be APPROVED or APPROVED_AS_NOTED`,
      );
    }

    submittal.status = SubmittalStatus.CLOSED;
    submittal.closedDate = new Date();

    await this.submittalRepository.save(submittal);

    await this.createHistoryEntry(
      id,
      userId,
      SubmittalHistoryAction.CLOSED,
      'Submittal closed',
      submittal.currentRevision,
      { status: SubmittalStatus.APPROVED },
      { status: SubmittalStatus.CLOSED, closedDate: submittal.closedDate },
    );

    return this.findOne(id, projectId);
  }

  async void(
    id: string,
    projectId: string,
    userId: string,
    reason: string,
  ): Promise<Submittal> {
    const submittal = await this.findOne(id, projectId);

    if (submittal.status === SubmittalStatus.VOID) {
      throw new BadRequestException('Submittal is already voided');
    }

    const previousStatus = submittal.status;
    submittal.status = SubmittalStatus.VOID;
    submittal.voidReason = reason;

    await this.submittalRepository.save(submittal);

    await this.createHistoryEntry(
      id,
      userId,
      SubmittalHistoryAction.VOIDED,
      `Submittal voided: ${reason}`,
      submittal.currentRevision,
      { status: previousStatus },
      { status: SubmittalStatus.VOID, voidReason: reason },
    );

    return this.findOne(id, projectId);
  }

  async addItem(
    submittalId: string,
    projectId: string,
    userId: string,
    dto: any,
  ): Promise<SubmittalItem> {
    const submittal = await this.findOne(submittalId, projectId);

    if (submittal.status !== SubmittalStatus.NOT_STARTED &&
        submittal.status !== SubmittalStatus.DRAFT) {
      throw new BadRequestException('Can only add items when submittal is NOT_STARTED or DRAFT');
    }

    // Get next item number
    const maxItem = await this.itemRepository
      .createQueryBuilder('item')
      .select('MAX(item.itemNumber)', 'max')
      .where('item.submittalId = :submittalId', { submittalId })
      .getRawOne();

    const itemNumber = (maxItem?.max || 0) + 1;

    const item = this.itemRepository.create({
      submittalId,
      itemNumber,
      ...dto,
      revisionNumber: submittal.currentRevision,
      sortOrder: itemNumber - 1,
    });

    const savedItem = (await this.itemRepository.save(item)) as unknown as SubmittalItem;

    await this.createHistoryEntry(
      submittalId,
      userId,
      SubmittalHistoryAction.ITEM_ADDED,
      `Item ${itemNumber} added: ${dto.description}`,
      submittal.currentRevision,
      null,
      { itemNumber, description: dto.description },
      undefined,
      savedItem.id,
      'SubmittalItem',
    );

    return savedItem;
  }

  async getSubmittalRegister(projectId: string): Promise<any> {
    const rawResults = await this.submittalRepository
      .createQueryBuilder('s')
      .select([
        's.id',
        's.number',
        's.title',
        's.specSection',
        's.specSectionTitle',
        's.submittalType',
        's.status',
        's.currentRevision',
        's.dueDate',
        's.requiredOnSiteDate',
        's.submittedDate',
        's.approvedDate',
        's.isOverdue',
      ])
      .addSelect('rc.name', 'responsibleContractorName')
      .addSelect('ao.name', 'approverOrgName')
      .leftJoin('s.responsibleContractor', 'rc')
      .leftJoin('s.approverOrg', 'ao')
      .where('s.projectId = :projectId', { projectId })
      .orderBy('s.specSection', 'ASC')
      .addOrderBy('s.number', 'ASC')
      .getRawMany();

    // Map raw results to proper camelCase field names
    const submittals = rawResults.map((raw) => ({
      id: raw.s_id,
      number: raw.s_number,
      title: raw.s_title,
      specSection: raw.s_specSection,
      specSectionTitle: raw.s_specSectionTitle,
      submittalType: raw.s_submittalType,
      status: raw.s_status,
      currentRevision: raw.s_currentRevision,
      dueDate: raw.s_dueDate,
      requiredOnSiteDate: raw.s_requiredOnSiteDate,
      submittedDate: raw.s_submittedDate,
      approvedDate: raw.s_approvedDate,
      isOverdue: raw.s_isOverdue,
      responsibleContractorName: raw.responsibleContractorName,
      approverOrgName: raw.approverOrgName,
    }));

    // Group submittals by CSI Division
    const groupedByDivision = new Map<string, any[]>();

    submittals.forEach((submittal) => {
      const specSection = submittal.specSection || '';
      const division = specSection.split(' ')[0]; // Extract division (e.g., "03" from "03 30 00")
      const divisionKey = division ? `Division ${division}` : 'Uncategorized';

      if (!groupedByDivision.has(divisionKey)) {
        groupedByDivision.set(divisionKey, []);
      }
      groupedByDivision.get(divisionKey).push(submittal);
    });

    // Convert to the expected format
    const groups = Array.from(groupedByDivision.entries()).map(([divisionKey, items]) => {
      // Calculate status summary for this group
      const statusSummary = items.reduce((acc, item) => {
        const status = item.status || 'UNKNOWN';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        groupKey: divisionKey,
        groupName: divisionKey,
        submittals: items,
        count: items.length,
        statusSummary,
      };
    });

    return {
      totalSubmittals: submittals.length,
      groups: groups,
    };
  }

  async getRevisions(id: string, projectId: string): Promise<SubmittalRevision[]> {
    const submittal = await this.findOne(id, projectId);
    return this.revisionRepository.find({
      where: { submittalId: id },
      relations: ['submittedBy', 'reviewedBy'],
      order: { revisionNumber: 'DESC' },
    });
  }

  async getResponses(id: string, projectId: string): Promise<SubmittalResponse[]> {
    const submittal = await this.findOne(id, projectId);
    return this.responseRepository.find({
      where: { submittalId: id },
      relations: ['reviewer', 'reviewerOrg', 'revision'],
      order: { createdAt: 'DESC' },
    });
  }

  private getResultingStatus(stamp: ApprovalStamp): SubmittalStatus {
    switch (stamp) {
      case ApprovalStamp.APPROVED:
        return SubmittalStatus.APPROVED;
      case ApprovalStamp.APPROVED_AS_NOTED:
      case ApprovalStamp.APPROVED_AS_NOTED_RESUBMIT:
        return SubmittalStatus.APPROVED_AS_NOTED;
      case ApprovalStamp.REVISE_AND_RESUBMIT:
        return SubmittalStatus.REVISE_RESUBMIT;
      case ApprovalStamp.REJECTED:
        return SubmittalStatus.REJECTED;
      case ApprovalStamp.FOR_RECORD_ONLY:
      case ApprovalStamp.SEE_COMMENTS:
        return SubmittalStatus.UNDER_REVIEW;
      default:
        return SubmittalStatus.UNDER_REVIEW;
    }
  }

  private getHistoryAction(stamp: ApprovalStamp): SubmittalHistoryAction {
    switch (stamp) {
      case ApprovalStamp.APPROVED:
        return SubmittalHistoryAction.APPROVED;
      case ApprovalStamp.APPROVED_AS_NOTED:
      case ApprovalStamp.APPROVED_AS_NOTED_RESUBMIT:
        return SubmittalHistoryAction.APPROVED_AS_NOTED;
      case ApprovalStamp.REVISE_AND_RESUBMIT:
        return SubmittalHistoryAction.REVISE_RESUBMIT;
      case ApprovalStamp.REJECTED:
        return SubmittalHistoryAction.REJECTED;
      default:
        return SubmittalHistoryAction.RESPONSE_ADDED;
    }
  }

  private async createHistoryEntry(
    submittalId: string,
    userId: string,
    action: SubmittalHistoryAction,
    description: string,
    revisionNumber: number | null,
    previousValue: Record<string, any> | null,
    newValue: Record<string, any> | null,
    manager?: any,
    relatedEntityId?: string,
    relatedEntityType?: string,
  ): Promise<SubmittalHistory> {
    const history = this.historyRepository.create({
      submittalId,
      performedById: userId,
      action,
      description,
      revisionNumber,
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
