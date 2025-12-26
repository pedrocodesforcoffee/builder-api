import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CostEntry } from '../entities/cost-entry.entity';
import { CostEntryHistory } from '../entities/cost-entry-history.entity';
import { Budget } from '../entities/budget.entity';
import { BudgetLineItem } from '../entities/budget-line-item.entity';
import { CostCode } from '../entities/cost-code.entity';
import { Project } from '../../projects/entities/project.entity';
import { Commitment } from '../entities/commitment.entity';
import { PaymentApplication } from '../entities/payment-application.entity';
import { CostPeriod } from '../entities/cost-period.entity';
import {
  CreateCostEntryDto,
  UpdateCostEntryDto,
  CostEntryFilterDto,
  VoidCostEntryDto,
  CostEntryResponseDto,
} from '../dto';
import { CostEntryStatus } from '../enums/cost-entry-status.enum';
import { CostEntryAction } from '../enums/cost-entry-action.enum';

/**
 * Cost Entry Service
 *
 * Comprehensive service for managing cost entries with full CRUD operations
 * and workflow management.
 *
 * Core Features:
 * - Create, read, update, delete cost entries
 * - Post/void workflow for budget impact
 * - Automatic budget actualCost updates
 * - Comprehensive validation and relation checking
 * - Complete audit trail via history records
 * - Advanced filtering and pagination
 *
 * Workflow:
 * DRAFT → POSTED → VOID
 *
 * Business Rules:
 * - Only DRAFT entries can be updated or deleted
 * - Only DRAFT entries can be posted
 * - Only POSTED entries can be voided
 * - Posting increments budget line item actualCost
 * - Voiding decrements budget line item actualCost
 *
 * @service CostEntryService
 */
@Injectable()
export class CostEntryService {
  private readonly logger = new Logger(CostEntryService.name);

  constructor(
    @InjectRepository(CostEntry)
    private readonly costEntryRepository: Repository<CostEntry>,
    @InjectRepository(CostEntryHistory)
    private readonly historyRepository: Repository<CostEntryHistory>,
    @InjectRepository(Budget)
    private readonly budgetRepository: Repository<Budget>,
    @InjectRepository(CostCode)
    private readonly costCodeRepository: Repository<CostCode>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Commitment)
    private readonly commitmentRepository: Repository<Commitment>,
    @InjectRepository(PaymentApplication)
    private readonly paymentApplicationRepository: Repository<PaymentApplication>,
    @InjectRepository(CostPeriod)
    private readonly costPeriodRepository: Repository<CostPeriod>,
    @InjectRepository(BudgetLineItem)
    private readonly budgetLineItemRepository: Repository<BudgetLineItem>,
    private readonly dataSource: DataSource,
  ) {}

  // ==================== CRUD METHODS ====================

  /**
   * Create a new cost entry
   *
   * Validates all required relations exist, creates the entry in DRAFT status,
   * and records the creation in history.
   *
   * @param dto - Cost entry creation data
   * @param userId - ID of user creating the entry
   * @returns Created cost entry with relations loaded
   * @throws NotFoundException if required relations don't exist
   * @throws BadRequestException if validation fails
   */
  async create(
    dto: CreateCostEntryDto,
    userId: string,
  ): Promise<CostEntryResponseDto> {
    this.logger.log(
      `Creating cost entry for project ${dto.projectId}, cost code ${dto.costCodeId}`,
    );

    // Validate all required relations
    await this.validateRelations(dto);

    // Calculate totalCost if quantity and unitCost provided
    let totalCost = dto.totalCost;
    if (dto.quantity && dto.unitCost) {
      const calculated = Number(dto.quantity) * Number(dto.unitCost);
      // If totalCost was provided, verify it matches
      if (dto.totalCost && Math.abs(calculated - dto.totalCost) > 0.01) {
        throw new BadRequestException(
          `Total cost ${dto.totalCost} does not match calculated value ${calculated} (quantity × unit cost)`,
        );
      }
      totalCost = calculated;
    }

    // Create the cost entry
    const costEntry = this.costEntryRepository.create({
      ...dto,
      totalCost,
      status: CostEntryStatus.DRAFT,
      createdById: userId,
    });

    // Save the entry
    const savedEntry = await this.costEntryRepository.save(costEntry);

    // Create history record
    await this.createHistory(
      savedEntry,
      CostEntryAction.CREATED,
      userId,
      { created: true },
    );

    this.logger.log(`Cost entry created successfully: ${savedEntry.id}`);

    // Load with relations and return
    return this.findOne(savedEntry.id);
  }

  /**
   * Find all cost entries with filtering, pagination, and sorting
   *
   * Supports comprehensive filtering by project, budget, cost code, type,
   * status, date ranges, vendor, invoice number, etc.
   *
   * @param filter - Filter, pagination, and sorting parameters
   * @returns Paginated cost entries with total count
   */
  async findAll(
    filter: CostEntryFilterDto,
  ): Promise<{ data: CostEntryResponseDto[]; total: number }> {
    this.logger.log(
      `Finding cost entries with filters: ${JSON.stringify(filter)}`,
    );

    // Build query with filters
    const query = this.buildFilterQuery(filter);

    // Load relations
    query
      .leftJoinAndSelect('costEntry.project', 'project')
      .leftJoinAndSelect('costEntry.budget', 'budget')
      .leftJoinAndSelect('costEntry.costCode', 'costCode')
      .leftJoinAndSelect('costEntry.commitment', 'commitment')
      .leftJoinAndSelect('costEntry.paymentApplication', 'paymentApplication')
      .leftJoinAndSelect('costEntry.costPeriod', 'costPeriod')
      .leftJoinAndSelect('costEntry.createdBy', 'createdBy')
      .leftJoinAndSelect('costEntry.postedBy', 'postedBy')
      .leftJoinAndSelect('costEntry.voidedBy', 'voidedBy');

    // Apply pagination
    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const skip = (page - 1) * limit;

    query.skip(skip).take(limit);

    // Apply sorting
    const sortBy = filter.sortBy || 'entryDate';
    const sortOrder = filter.sortOrder || 'DESC';
    query.orderBy(`costEntry.${sortBy}`, sortOrder);

    // Execute query
    const [entries, total] = await query.getManyAndCount();

    this.logger.log(
      `Found ${entries.length} cost entries (total: ${total}, page: ${page})`,
    );

    return {
      data: entries.map((entry) => this.toResponseDto(entry)),
      total,
    };
  }

  /**
   * Find a single cost entry by ID
   *
   * Loads the entry with all relations for comprehensive data access.
   *
   * @param id - Cost entry UUID
   * @returns Cost entry with all relations
   * @throws NotFoundException if entry doesn't exist
   */
  async findOne(id: string): Promise<CostEntryResponseDto> {
    this.logger.log(`Finding cost entry ${id}`);

    const entry = await this.costEntryRepository.findOne({
      where: { id },
      relations: [
        'project',
        'budget',
        'costCode',
        'commitment',
        'paymentApplication',
        'costPeriod',
        'createdBy',
        'postedBy',
        'voidedBy',
      ],
    });

    if (!entry) {
      throw new NotFoundException(`Cost entry with ID ${id} not found`);
    }

    return this.toResponseDto(entry);
  }

  /**
   * Update a cost entry
   *
   * Only cost entries in DRAFT status can be updated.
   * Validates any changed relations and recalculates totalCost if needed.
   * Records the changes in history.
   *
   * @param id - Cost entry UUID
   * @param dto - Update data
   * @param userId - ID of user performing update
   * @returns Updated cost entry
   * @throws NotFoundException if entry doesn't exist
   * @throws BadRequestException if entry is not in DRAFT status or validation fails
   */
  async update(
    id: string,
    dto: UpdateCostEntryDto,
    userId: string,
  ): Promise<CostEntryResponseDto> {
    this.logger.log(`Updating cost entry ${id}`);

    // Load existing entry
    const entry = await this.costEntryRepository.findOne({
      where: { id },
    });

    if (!entry) {
      throw new NotFoundException(`Cost entry with ID ${id} not found`);
    }

    // Validate status
    if (entry.status !== CostEntryStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot update cost entry with status ${entry.status}. Only DRAFT entries can be updated.`,
      );
    }

    // Validate changed relations if provided
    if (dto.costCodeId || dto.commitmentId || dto.paymentApplicationId || dto.costPeriodId) {
      await this.validateRelations({
        projectId: entry.projectId,
        budgetId: entry.budgetId,
        costCodeId: dto.costCodeId || entry.costCodeId,
        commitmentId: dto.commitmentId !== undefined ? dto.commitmentId : entry.commitmentId,
        paymentApplicationId: dto.paymentApplicationId !== undefined ? dto.paymentApplicationId : entry.paymentApplicationId,
        costPeriodId: dto.costPeriodId !== undefined ? dto.costPeriodId : entry.costPeriodId,
      } as any);
    }

    // Store before state for history
    const before = {
      costCodeId: entry.costCodeId,
      type: entry.type,
      entryDate: entry.entryDate,
      description: entry.description,
      totalCost: entry.totalCost,
      quantity: entry.quantity,
      unitCost: entry.unitCost,
      vendor: entry.vendor,
      invoiceNumber: entry.invoiceNumber,
      commitmentId: entry.commitmentId,
      paymentApplicationId: entry.paymentApplicationId,
      costPeriodId: entry.costPeriodId,
    };

    // Apply updates
    Object.assign(entry, dto);

    // Recalculate totalCost if quantity or unitCost changed
    if (dto.quantity !== undefined || dto.unitCost !== undefined) {
      const quantity = dto.quantity !== undefined ? dto.quantity : entry.quantity;
      const unitCost = dto.unitCost !== undefined ? dto.unitCost : entry.unitCost;

      if (quantity && unitCost) {
        const calculated = Number(quantity) * Number(unitCost);
        // If totalCost was also provided in update, verify it matches
        if (dto.totalCost && Math.abs(calculated - dto.totalCost) > 0.01) {
          throw new BadRequestException(
            `Total cost ${dto.totalCost} does not match calculated value ${calculated} (quantity × unit cost)`,
          );
        }
        entry.totalCost = calculated;
      }
    }

    // Save updated entry
    const updatedEntry = await this.costEntryRepository.save(entry);

    // Store after state
    const after = {
      costCodeId: updatedEntry.costCodeId,
      type: updatedEntry.type,
      entryDate: updatedEntry.entryDate,
      description: updatedEntry.description,
      totalCost: updatedEntry.totalCost,
      quantity: updatedEntry.quantity,
      unitCost: updatedEntry.unitCost,
      vendor: updatedEntry.vendor,
      invoiceNumber: updatedEntry.invoiceNumber,
      commitmentId: updatedEntry.commitmentId,
      paymentApplicationId: updatedEntry.paymentApplicationId,
      costPeriodId: updatedEntry.costPeriodId,
    };

    // Identify changed fields
    const beforeAny = before as any;
    const afterAny = after as any;
    const changedFields = Object.keys(before).filter(
      (key) => JSON.stringify(beforeAny[key]) !== JSON.stringify(afterAny[key]),
    );

    // Create history record
    await this.createHistory(
      updatedEntry,
      CostEntryAction.UPDATED,
      userId,
      {
        before,
        after,
        fieldsChanged: changedFields,
      },
    );

    this.logger.log(
      `Cost entry updated successfully: ${id} (${changedFields.length} fields changed)`,
    );

    // Load with relations and return
    return this.findOne(id);
  }

  /**
   * Delete a cost entry
   *
   * Only cost entries in DRAFT status can be deleted.
   * This is a hard delete - no history record is created as the entry is removed.
   *
   * @param id - Cost entry UUID
   * @param userId - ID of user performing deletion
   * @throws NotFoundException if entry doesn't exist
   * @throws BadRequestException if entry is not in DRAFT status
   */
  async remove(id: string, userId: string): Promise<void> {
    this.logger.log(`Deleting cost entry ${id}`);

    // Load existing entry
    const entry = await this.costEntryRepository.findOne({
      where: { id },
    });

    if (!entry) {
      throw new NotFoundException(`Cost entry with ID ${id} not found`);
    }

    // Validate status
    if (entry.status !== CostEntryStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot delete cost entry with status ${entry.status}. Only DRAFT entries can be deleted.`,
      );
    }

    // Delete the entry
    await this.costEntryRepository.remove(entry);

    this.logger.log(`Cost entry deleted successfully: ${id}`);
  }

  // ==================== WORKFLOW METHODS ====================

  /**
   * Post a cost entry to the budget
   *
   * Changes status from DRAFT to POSTED and increments the budget line item's
   * actualCost by the entry's totalCost.
   *
   * This operation is wrapped in a transaction to ensure atomicity.
   *
   * @param id - Cost entry UUID
   * @param userId - ID of user performing post
   * @returns Posted cost entry
   * @throws NotFoundException if entry doesn't exist
   * @throws BadRequestException if entry is not in DRAFT status
   */
  async post(id: string, userId: string): Promise<CostEntryResponseDto> {
    this.logger.log(`Posting cost entry ${id}`);

    // Use transaction for atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Load entry with relations
      const entry = await queryRunner.manager.findOne(CostEntry, {
        where: { id },
        relations: ['costCode', 'budget'],
      });

      if (!entry) {
        throw new NotFoundException(`Cost entry with ID ${id} not found`);
      }

      // Validate status
      if (entry.status !== CostEntryStatus.DRAFT) {
        throw new BadRequestException(
          `Cannot post cost entry with status ${entry.status}. Only DRAFT entries can be posted.`,
        );
      }

      // Update entry status
      entry.status = CostEntryStatus.POSTED;
      entry.postedAt = new Date();
      entry.postedById = userId;

      await queryRunner.manager.save(CostEntry, entry);

      // Update budget actualCost
      await this.updateBudgetActualCost(entry, false, queryRunner.manager);

      // Create history record
      const history = queryRunner.manager.create(CostEntryHistory, {
        costEntryId: entry.id,
        action: CostEntryAction.POSTED,
        performedById: userId,
        performedAt: new Date(),
        changes: {
          status: { before: CostEntryStatus.DRAFT, after: CostEntryStatus.POSTED },
          postedAt: new Date(),
          postedById: userId,
        },
      });

      await queryRunner.manager.save(CostEntryHistory, history);

      // Commit transaction
      await queryRunner.commitTransaction();

      this.logger.log(`Cost entry posted successfully: ${id}`);

      // Load with relations and return
      return this.findOne(id);
    } catch (error) {
      // Rollback on error
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to post cost entry ${id}: ${(error as Error).message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Void a posted cost entry
   *
   * Changes status from POSTED to VOID and decrements the budget line item's
   * actualCost by the entry's totalCost.
   *
   * This operation is wrapped in a transaction to ensure atomicity.
   *
   * @param id - Cost entry UUID
   * @param dto - Void reason
   * @param userId - ID of user performing void
   * @returns Voided cost entry
   * @throws NotFoundException if entry doesn't exist
   * @throws BadRequestException if entry is not in POSTED status
   */
  async void(
    id: string,
    dto: VoidCostEntryDto,
    userId: string,
  ): Promise<CostEntryResponseDto> {
    this.logger.log(`Voiding cost entry ${id}: ${dto.voidReason}`);

    // Use transaction for atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Load entry with relations
      const entry = await queryRunner.manager.findOne(CostEntry, {
        where: { id },
        relations: ['costCode', 'budget'],
      });

      if (!entry) {
        throw new NotFoundException(`Cost entry with ID ${id} not found`);
      }

      // Validate status
      if (entry.status !== CostEntryStatus.POSTED) {
        throw new BadRequestException(
          `Cannot void cost entry with status ${entry.status}. Only POSTED entries can be voided.`,
        );
      }

      // Update entry status
      entry.status = CostEntryStatus.VOID;
      entry.voidedAt = new Date();
      entry.voidedById = userId;
      entry.voidReason = dto.voidReason;

      await queryRunner.manager.save(CostEntry, entry);

      // Update budget actualCost (decrement)
      await this.updateBudgetActualCost(entry, true, queryRunner.manager);

      // Create history record
      const history = queryRunner.manager.create(CostEntryHistory, {
        costEntryId: entry.id,
        action: CostEntryAction.VOIDED,
        performedById: userId,
        performedAt: new Date(),
        changes: {
          status: { before: CostEntryStatus.POSTED, after: CostEntryStatus.VOID },
          voidedAt: new Date(),
          voidedById: userId,
          voidReason: dto.voidReason,
        },
      });

      await queryRunner.manager.save(CostEntryHistory, history);

      // Commit transaction
      await queryRunner.commitTransaction();

      this.logger.log(`Cost entry voided successfully: ${id}`);

      // Load with relations and return
      return this.findOne(id);
    } catch (error) {
      // Rollback on error
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to void cost entry ${id}: ${(error as Error).message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Update budget line item actualCost
   *
   * Increments or decrements the actualCost of the budget line item that
   * matches the cost entry's costCodeId.
   *
   * @param entry - Cost entry
   * @param isVoid - True to decrement (void), false to increment (post)
   * @param manager - Transaction manager (optional)
   * @private
   */
  private async updateBudgetActualCost(
    entry: CostEntry,
    isVoid: boolean = false,
    manager?: any,
  ): Promise<void> {
    const repo = manager
      ? manager.getRepository(BudgetLineItem)
      : this.budgetLineItemRepository;

    // Find budget line item matching this cost code
    const lineItem = await repo.findOne({
      where: {
        budgetId: entry.budgetId,
        costCodeId: entry.costCodeId,
      },
    });

    if (!lineItem) {
      this.logger.warn(
        `No budget line item found for budgetId ${entry.budgetId}, costCodeId ${entry.costCodeId}. Creating new line item.`,
      );

      // Create a new line item if one doesn't exist
      const costCode = await this.costCodeRepository.findOne({
        where: { id: entry.costCodeId },
      });

      if (!costCode) {
        throw new NotFoundException(
          `Cost code with ID ${entry.costCodeId} not found`,
        );
      }

      const newLineItem = repo.create({
        budgetId: entry.budgetId,
        costCodeId: entry.costCodeId,
        category: costCode.category || 'OTHER',
        budgetedCost: 0,
        committedCost: 0,
        actualCost: isVoid ? 0 : Number(entry.totalCost),
      });

      await repo.save(newLineItem);

      this.logger.log(
        `Created new budget line item with actualCost: ${newLineItem.actualCost}`,
      );

      return;
    }

    // Update actualCost
    const currentActual = Number(lineItem.actualCost) || 0;
    const entryTotal = Number(entry.totalCost) || 0;

    if (isVoid) {
      // Void: decrement actualCost
      lineItem.actualCost = Math.max(0, currentActual - entryTotal);
      this.logger.log(
        `Decrementing actualCost: ${currentActual} - ${entryTotal} = ${lineItem.actualCost}`,
      );
    } else {
      // Post: increment actualCost
      lineItem.actualCost = currentActual + entryTotal;
      this.logger.log(
        `Incrementing actualCost: ${currentActual} + ${entryTotal} = ${lineItem.actualCost}`,
      );
    }

    await repo.save(lineItem);
  }

  /**
   * Validate required and optional relations
   *
   * Checks that all referenced entities exist:
   * - Project (required)
   * - Budget (required) - must belong to project
   * - Cost Code (required)
   * - Commitment (optional)
   * - Payment Application (optional)
   * - Cost Period (optional)
   *
   * @param dto - DTO containing relation IDs
   * @throws NotFoundException if required relation doesn't exist
   * @throws BadRequestException if budget doesn't belong to project
   * @private
   */
  private async validateRelations(
    dto: CreateCostEntryDto | UpdateCostEntryDto,
  ): Promise<void> {
    // Validate project
    if ('projectId' in dto && dto.projectId) {
      const project = await this.projectRepository.findOne({
        where: { id: dto.projectId },
      });

      if (!project) {
        throw new NotFoundException(
          `Project with ID ${dto.projectId} not found`,
        );
      }
    }

    // Validate budget and check it belongs to project
    if ('budgetId' in dto && dto.budgetId) {
      const budget = await this.budgetRepository.findOne({
        where: { id: dto.budgetId },
      });

      if (!budget) {
        throw new NotFoundException(`Budget with ID ${dto.budgetId} not found`);
      }

      if ('projectId' in dto && dto.projectId && budget.projectId !== dto.projectId) {
        throw new BadRequestException(
          `Budget ${dto.budgetId} does not belong to project ${dto.projectId}`,
        );
      }
    }

    // Validate cost code
    if ('costCodeId' in dto && dto.costCodeId) {
      const costCode = await this.costCodeRepository.findOne({
        where: { id: dto.costCodeId },
      });

      if (!costCode) {
        throw new NotFoundException(
          `Cost code with ID ${dto.costCodeId} not found`,
        );
      }
    }

    // Validate optional commitment
    if (dto.commitmentId) {
      const commitment = await this.commitmentRepository.findOne({
        where: { id: dto.commitmentId },
      });

      if (!commitment) {
        throw new NotFoundException(
          `Commitment with ID ${dto.commitmentId} not found`,
        );
      }
    }

    // Validate optional payment application
    if (dto.paymentApplicationId) {
      const paymentApp = await this.paymentApplicationRepository.findOne({
        where: { id: dto.paymentApplicationId },
      });

      if (!paymentApp) {
        throw new NotFoundException(
          `Payment application with ID ${dto.paymentApplicationId} not found`,
        );
      }
    }

    // Validate optional cost period
    if (dto.costPeriodId) {
      const costPeriod = await this.costPeriodRepository.findOne({
        where: { id: dto.costPeriodId },
      });

      if (!costPeriod) {
        throw new NotFoundException(
          `Cost period with ID ${dto.costPeriodId} not found`,
        );
      }
    }
  }

  /**
   * Create a history record for cost entry action
   *
   * Records the action, performer, timestamp, and any changes made.
   *
   * @param entry - Cost entry
   * @param action - Action type
   * @param userId - ID of user performing action
   * @param changes - Changes data (optional)
   * @param ipAddress - User IP address (optional)
   * @param userAgent - User agent string (optional)
   * @private
   */
  private async createHistory(
    entry: CostEntry,
    action: CostEntryAction,
    userId: string,
    changes?: any,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const history = this.historyRepository.create({
      costEntryId: entry.id,
      action,
      performedById: userId,
      performedAt: new Date(),
      changes,
      ipAddress,
      userAgent,
    });

    await this.historyRepository.save(history);

    this.logger.debug(
      `Created history record for cost entry ${entry.id}: ${action}`,
    );
  }

  /**
   * Build query with filters
   *
   * Constructs a TypeORM query builder with all applicable filters
   * from the filter DTO.
   *
   * @param filter - Filter parameters
   * @returns Query builder with filters applied
   * @private
   */
  private buildFilterQuery(filter: CostEntryFilterDto) {
    const query = this.costEntryRepository.createQueryBuilder('costEntry');

    // Filter by project
    if (filter.projectId) {
      query.andWhere('costEntry.project_id = :projectId', {
        projectId: filter.projectId,
      });
    }

    // Filter by budget
    if (filter.budgetId) {
      query.andWhere('costEntry.budget_id = :budgetId', {
        budgetId: filter.budgetId,
      });
    }

    // Filter by cost code
    if (filter.costCodeId) {
      query.andWhere('costEntry.cost_code_id = :costCodeId', {
        costCodeId: filter.costCodeId,
      });
    }

    // Filter by type
    if (filter.type) {
      query.andWhere('costEntry.type = :type', { type: filter.type });
    }

    // Filter by status
    if (filter.status) {
      query.andWhere('costEntry.status = :status', { status: filter.status });
    }

    // Filter by date range
    if (filter.fromDate) {
      query.andWhere('costEntry.entry_date >= :fromDate', {
        fromDate: filter.fromDate,
      });
    }

    if (filter.toDate) {
      query.andWhere('costEntry.entry_date <= :toDate', {
        toDate: filter.toDate,
      });
    }

    // Filter by commitment
    if (filter.commitmentId) {
      query.andWhere('costEntry.commitment_id = :commitmentId', {
        commitmentId: filter.commitmentId,
      });
    }

    // Filter by cost period
    if (filter.costPeriodId) {
      query.andWhere('costEntry.cost_period_id = :costPeriodId', {
        costPeriodId: filter.costPeriodId,
      });
    }

    // Filter by vendor (partial match)
    if (filter.vendor) {
      query.andWhere('costEntry.vendor ILIKE :vendor', {
        vendor: `%${filter.vendor}%`,
      });
    }

    // Filter by invoice number (partial match)
    if (filter.invoiceNumber) {
      query.andWhere('costEntry.invoice_number ILIKE :invoiceNumber', {
        invoiceNumber: `%${filter.invoiceNumber}%`,
      });
    }

    return query;
  }

  /**
   * Convert entity to response DTO
   *
   * Maps the cost entry entity and its relations to a response DTO
   * for API consumption.
   *
   * @param entry - Cost entry entity
   * @returns Response DTO
   */
  toResponseDto(entry: CostEntry): CostEntryResponseDto {
    return {
      id: entry.id,
      entryNumber: entry.entryNumber,
      projectId: entry.projectId,
      budgetId: entry.budgetId,
      costCodeId: entry.costCodeId,
      commitmentId: entry.commitmentId,
      paymentApplicationId: entry.paymentApplicationId,
      costPeriodId: entry.costPeriodId,
      type: entry.type,
      status: entry.status,
      entryDate: entry.entryDate,
      description: entry.description,
      quantity: entry.quantity,
      unitCost: entry.unitCost,
      totalCost: entry.totalCost,
      vendor: entry.vendor,
      invoiceNumber: entry.invoiceNumber,
      postedAt: entry.postedAt,
      postedById: entry.postedById,
      voidedAt: entry.voidedAt,
      voidedById: entry.voidedById,
      voidReason: entry.voidReason,
      notes: entry.notes,
      createdById: entry.createdById,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      // Nested relations
      project: entry.project
        ? { name: entry.project.name }
        : undefined,
      budget: entry.budget
        ? { name: entry.budget.name }
        : undefined,
      costCode: entry.costCode
        ? { code: entry.costCode.code, name: entry.costCode.name }
        : undefined,
      commitment: entry.commitment
        ? { vendorName: entry.commitment.vendorName }
        : undefined,
      paymentApplication: entry.paymentApplication
        ? { applicationNumber: entry.paymentApplication.applicationNumber }
        : undefined,
      costPeriod: entry.costPeriod
        ? { periodName: entry.costPeriod.periodName }
        : undefined,
      createdBy: entry.createdBy
        ? {
            firstName: entry.createdBy.firstName,
            lastName: entry.createdBy.lastName,
          }
        : undefined,
      postedBy: entry.postedBy
        ? {
            firstName: entry.postedBy.firstName,
            lastName: entry.postedBy.lastName,
          }
        : undefined,
      voidedBy: entry.voidedBy
        ? {
            firstName: entry.voidedBy.firstName,
            lastName: entry.voidedBy.lastName,
          }
        : undefined,
    } as CostEntryResponseDto;
  }
}
