import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { CostPeriod } from '../entities/cost-period.entity';
import { CostEntry } from '../entities/cost-entry.entity';
import { Accrual } from '../entities/accrual.entity';
import { Budget } from '../entities/budget.entity';
import { BudgetLineItem } from '../entities/budget-line-item.entity';
import { Project } from '../../projects/entities/project.entity';
import {
  CreateCostPeriodDto,
  UpdateCostPeriodDto,
  CostPeriodFilterDto,
  CostPeriodSummaryDto,
} from '../dto';
import { CostPeriodStatus } from '../enums/cost-period-status.enum';
import { CostEntryStatus } from '../enums/cost-entry-status.enum';
import { CostEntryType } from '../enums/cost-entry-type.enum';

/**
 * Cost Period Service
 *
 * Comprehensive service for managing cost periods with full CRUD operations,
 * workflow management, and period closing/locking functionality.
 *
 * Core Features:
 * - Create, read, update, delete cost periods
 * - Close/lock workflow for period management
 * - Budget snapshot creation on period close
 * - Validation of period overlaps and data integrity
 * - Period summary with aggregated cost data
 *
 * Workflow:
 * OPEN → CLOSED → LOCKED
 *
 * Business Rules:
 * - Only OPEN periods can be updated or deleted
 * - No overlapping periods allowed for same project
 * - Period end must be after period start
 * - Can only close period if all entries are POSTED
 * - Cannot delete period with cost entries or accruals
 * - Closing creates immutable budget snapshot
 * - Locking makes period permanently read-only
 *
 * @service CostPeriodService
 */
@Injectable()
export class CostPeriodService {
  private readonly logger = new Logger(CostPeriodService.name);

  constructor(
    @InjectRepository(CostPeriod)
    private readonly costPeriodRepository: Repository<CostPeriod>,
    @InjectRepository(CostEntry)
    private readonly costEntryRepository: Repository<CostEntry>,
    @InjectRepository(Accrual)
    private readonly accrualRepository: Repository<Accrual>,
    @InjectRepository(Budget)
    private readonly budgetRepository: Repository<Budget>,
    @InjectRepository(BudgetLineItem)
    private readonly budgetLineItemRepository: Repository<BudgetLineItem>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly dataSource: DataSource,
  ) {}

  // ==================== CRUD METHODS ====================

  /**
   * Create a new cost period
   *
   * Creates a cost period in OPEN status with validation to ensure:
   * - Project and budget exist
   * - Period end is after period start
   * - No overlapping periods exist for the same project
   *
   * @param dto - Cost period creation data
   * @param userId - ID of user creating the period
   * @returns Created cost period with relations loaded
   * @throws NotFoundException if project or budget doesn't exist
   * @throws BadRequestException if validation fails
   */
  async create(
    dto: CreateCostPeriodDto,
    userId: string,
  ): Promise<CostPeriod> {
    this.logger.log(
      `Creating cost period "${dto.periodName}" for project ${dto.projectId}`,
    );

    // Validate project exists
    const project = await this.projectRepository.findOne({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new NotFoundException(
        `Project with ID ${dto.projectId} not found`,
      );
    }

    // Validate budget exists and belongs to project
    const budget = await this.budgetRepository.findOne({
      where: { id: dto.budgetId },
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${dto.budgetId} not found`);
    }

    if (budget.projectId !== dto.projectId) {
      throw new BadRequestException(
        `Budget ${dto.budgetId} does not belong to project ${dto.projectId}`,
      );
    }

    // Validate period dates
    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    if (periodEnd <= periodStart) {
      throw new BadRequestException(
        'Period end date must be after period start date',
      );
    }

    // Validate no overlapping periods
    await this.validateNoOverlap(
      dto.projectId,
      periodStart,
      periodEnd,
    );

    // Create the cost period
    const costPeriod = this.costPeriodRepository.create({
      projectId: dto.projectId,
      budgetId: dto.budgetId,
      periodName: dto.periodName,
      periodStart: periodStart,
      periodEnd: periodEnd,
      status: CostPeriodStatus.OPEN,
    });

    // Save the period
    const savedPeriod = await this.costPeriodRepository.save(costPeriod);

    this.logger.log(`Cost period created successfully: ${savedPeriod.id}`);

    // Load with relations and return
    return this.findOne(savedPeriod.id);
  }

  /**
   * Find all cost periods with filtering, pagination, and sorting
   *
   * Supports comprehensive filtering by project, budget, status, and date ranges.
   * Includes pagination and sorting for efficient data retrieval.
   *
   * @param filter - Filter, pagination, and sorting parameters
   * @returns Paginated cost periods with total count
   */
  async findAll(
    filter: CostPeriodFilterDto,
  ): Promise<{ data: CostPeriod[]; total: number }> {
    this.logger.log(
      `Finding cost periods with filters: ${JSON.stringify(filter)}`,
    );

    // Build query with filters
    const query = this.buildFilterQuery(filter);

    // Load relations
    query
      .leftJoinAndSelect('costPeriod.project', 'project')
      .leftJoinAndSelect('costPeriod.budget', 'budget')
      .leftJoinAndSelect('costPeriod.closedBy', 'closedBy')
      .leftJoinAndSelect('costPeriod.lockedBy', 'lockedBy');

    // Apply pagination
    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const skip = (page - 1) * limit;

    query.skip(skip).take(limit);

    // Apply sorting
    const sortBy = filter.sortBy || 'periodStart';
    const sortOrder = filter.sortOrder || 'DESC';

    // Map camelCase to snake_case for database columns
    const sortByMap: Record<string, string> = {
      periodStart: 'period_start',
      periodEnd: 'period_end',
      periodName: 'period_name',
      status: 'status',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    };

    const dbColumn = sortByMap[sortBy] || 'period_start';
    query.orderBy(`costPeriod.${dbColumn}`, sortOrder);

    // Execute query
    const [periods, total] = await query.getManyAndCount();

    this.logger.log(
      `Found ${periods.length} cost periods (total: ${total}, page: ${page})`,
    );

    return {
      data: periods,
      total,
    };
  }

  /**
   * Find a single cost period by ID
   *
   * Loads the period with all relations for comprehensive data access.
   *
   * @param id - Cost period UUID
   * @returns Cost period with all relations
   * @throws NotFoundException if period doesn't exist
   */
  async findOne(id: string): Promise<CostPeriod> {
    this.logger.log(`Finding cost period ${id}`);

    const period = await this.costPeriodRepository.findOne({
      where: { id },
      relations: [
        'project',
        'budget',
        'closedBy',
        'lockedBy',
      ],
    });

    if (!period) {
      throw new NotFoundException(`Cost period with ID ${id} not found`);
    }

    return period;
  }

  /**
   * Update a cost period
   *
   * Only cost periods in OPEN status can be updated.
   * Validates period dates and checks for overlaps if dates are changed.
   *
   * @param id - Cost period UUID
   * @param dto - Update data
   * @param userId - ID of user performing update
   * @returns Updated cost period
   * @throws NotFoundException if period doesn't exist
   * @throws BadRequestException if period is not in OPEN status or validation fails
   */
  async update(
    id: string,
    dto: UpdateCostPeriodDto,
    userId: string,
  ): Promise<CostPeriod> {
    this.logger.log(`Updating cost period ${id}`);

    // Load existing period
    const period = await this.costPeriodRepository.findOne({
      where: { id },
    });

    if (!period) {
      throw new NotFoundException(`Cost period with ID ${id} not found`);
    }

    // Validate status
    if (period.status !== CostPeriodStatus.OPEN) {
      throw new BadRequestException(
        `Cannot update cost period with status ${period.status}. Only OPEN periods can be updated.`,
      );
    }

    // Determine new dates (use existing if not provided)
    const newPeriodStart = dto.periodStart
      ? new Date(dto.periodStart)
      : period.periodStart;
    const newPeriodEnd = dto.periodEnd
      ? new Date(dto.periodEnd)
      : period.periodEnd;

    // Validate period dates
    if (newPeriodEnd <= newPeriodStart) {
      throw new BadRequestException(
        'Period end date must be after period start date',
      );
    }

    // Validate no overlapping periods if dates changed
    if (dto.periodStart || dto.periodEnd) {
      await this.validateNoOverlap(
        period.projectId,
        newPeriodStart,
        newPeriodEnd,
        id, // Exclude current period from overlap check
      );
    }

    // Apply updates
    if (dto.periodName !== undefined) {
      period.periodName = dto.periodName;
    }
    if (dto.periodStart !== undefined) {
      period.periodStart = newPeriodStart;
    }
    if (dto.periodEnd !== undefined) {
      period.periodEnd = newPeriodEnd;
    }

    // Save updated period
    const updatedPeriod = await this.costPeriodRepository.save(period);

    this.logger.log(`Cost period updated successfully: ${id}`);

    // Load with relations and return
    return this.findOne(id);
  }

  /**
   * Delete a cost period
   *
   * Only cost periods in OPEN status can be deleted.
   * Cannot delete periods that have associated cost entries or accruals.
   *
   * @param id - Cost period UUID
   * @param userId - ID of user performing deletion
   * @throws NotFoundException if period doesn't exist
   * @throws BadRequestException if period is not in OPEN status or has entries/accruals
   */
  async remove(id: string, userId: string): Promise<void> {
    this.logger.log(`Deleting cost period ${id}`);

    // Load existing period
    const period = await this.costPeriodRepository.findOne({
      where: { id },
    });

    if (!period) {
      throw new NotFoundException(`Cost period with ID ${id} not found`);
    }

    // Validate status
    if (period.status !== CostPeriodStatus.OPEN) {
      throw new BadRequestException(
        `Cannot delete cost period with status ${period.status}. Only OPEN periods can be deleted.`,
      );
    }

    // Check for cost entries
    const entryCount = await this.costEntryRepository.count({
      where: { costPeriodId: id },
    });

    if (entryCount > 0) {
      throw new BadRequestException(
        `Cannot delete cost period with ${entryCount} associated cost entries. Remove entries first.`,
      );
    }

    // Check for accruals
    const accrualCount = await this.accrualRepository.count({
      where: { costPeriodId: id },
    });

    if (accrualCount > 0) {
      throw new BadRequestException(
        `Cannot delete cost period with ${accrualCount} associated accruals. Remove accruals first.`,
      );
    }

    // Delete the period
    await this.costPeriodRepository.remove(period);

    this.logger.log(`Cost period deleted successfully: ${id}`);
  }

  // ==================== WORKFLOW METHODS ====================

  /**
   * Close a cost period
   *
   * Changes status from OPEN to CLOSED. Creates a budget snapshot in snapshotData
   * capturing the state of the budget at close time. Validates that all cost entries
   * in the period are POSTED (no DRAFT entries allowed).
   *
   * This operation is wrapped in a transaction to ensure atomicity.
   *
   * @param id - Cost period UUID
   * @param userId - ID of user performing close
   * @returns Closed cost period
   * @throws NotFoundException if period doesn't exist
   * @throws BadRequestException if period is not in OPEN status or has DRAFT entries
   */
  async close(id: string, userId: string): Promise<CostPeriod> {
    this.logger.log(`Closing cost period ${id}`);

    // Use transaction for atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Load period with relations
      const period = await queryRunner.manager.findOne(CostPeriod, {
        where: { id },
        relations: ['budget'],
      });

      if (!period) {
        throw new NotFoundException(`Cost period with ID ${id} not found`);
      }

      // Validate status
      if (period.status !== CostPeriodStatus.OPEN) {
        throw new BadRequestException(
          `Cannot close cost period with status ${period.status}. Only OPEN periods can be closed.`,
        );
      }

      // Validate all entries are posted
      await this.validatePeriodCanBeClosed(id, queryRunner.manager);

      // Create budget snapshot
      const snapshot = await this.createBudgetSnapshot(
        id,
        period.budgetId,
        queryRunner.manager,
      );

      // Update period status
      period.status = CostPeriodStatus.CLOSED;
      period.closedAt = new Date();
      period.closedById = userId;
      period.snapshotData = snapshot;

      await queryRunner.manager.save(CostPeriod, period);

      // Commit transaction
      await queryRunner.commitTransaction();

      this.logger.log(`Cost period closed successfully: ${id}`);

      // Load with relations and return
      return this.findOne(id);
    } catch (error) {
      // Rollback on error
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to close cost period ${id}: ${(error as Error).message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Lock a cost period
   *
   * Changes status from CLOSED to LOCKED. Locked periods are permanently
   * immutable and cannot be reopened. This is typically done for audit
   * compliance or after final financial reporting.
   *
   * @param id - Cost period UUID
   * @param userId - ID of user performing lock
   * @returns Locked cost period
   * @throws NotFoundException if period doesn't exist
   * @throws BadRequestException if period is not in CLOSED status
   */
  async lock(id: string, userId: string): Promise<CostPeriod> {
    this.logger.log(`Locking cost period ${id}`);

    // Load existing period
    const period = await this.costPeriodRepository.findOne({
      where: { id },
    });

    if (!period) {
      throw new NotFoundException(`Cost period with ID ${id} not found`);
    }

    // Validate status
    if (period.status !== CostPeriodStatus.CLOSED) {
      throw new BadRequestException(
        `Cannot lock cost period with status ${period.status}. Only CLOSED periods can be locked.`,
      );
    }

    // Update period status
    period.status = CostPeriodStatus.LOCKED;
    period.lockedAt = new Date();
    period.lockedById = userId;

    await this.costPeriodRepository.save(period);

    this.logger.log(`Cost period locked successfully: ${id}`);

    // Load with relations and return
    return this.findOne(id);
  }

  /**
   * Get cost period summary
   *
   * Returns comprehensive summary with aggregated cost entry data including:
   * - Total number of entries
   * - Total cost amount
   * - Breakdown by cost entry type
   * - Breakdown by cost entry status
   *
   * @param id - Cost period UUID
   * @returns Cost period summary with aggregations
   * @throws NotFoundException if period doesn't exist
   */
  async getSummary(id: string): Promise<CostPeriodSummaryDto> {
    this.logger.log(`Getting summary for cost period ${id}`);

    // Load period
    const period = await this.findOne(id);

    // Get all cost entries for this period
    const entries = await this.costEntryRepository.find({
      where: { costPeriodId: id },
    });

    // Calculate total entries and amount
    const totalCostEntries = entries.length;
    const totalAmount = entries.reduce(
      (sum, entry) => sum + Number(entry.totalCost),
      0,
    );

    // Initialize type breakdown with all types set to 0
    const entryCountByType: Record<CostEntryType, number> = {
      [CostEntryType.LABOR]: 0,
      [CostEntryType.MATERIAL]: 0,
      [CostEntryType.EQUIPMENT]: 0,
      [CostEntryType.SUBCONTRACT]: 0,
      [CostEntryType.OTHER_DIRECT]: 0,
      [CostEntryType.OVERHEAD]: 0,
      [CostEntryType.INVOICE]: 0,
      [CostEntryType.ACCRUAL]: 0,
    };

    // Count entries by type
    entries.forEach((entry) => {
      if (entry.type in entryCountByType) {
        entryCountByType[entry.type]++;
      }
    });

    // Initialize status breakdown with all statuses set to 0
    const entryCountByStatus: Record<CostEntryStatus, number> = {
      [CostEntryStatus.DRAFT]: 0,
      [CostEntryStatus.POSTED]: 0,
      [CostEntryStatus.VOID]: 0,
      [CostEntryStatus.PENDING_APPROVAL]: 0,
      [CostEntryStatus.APPROVED]: 0,
      [CostEntryStatus.REJECTED]: 0,
    };

    // Count entries by status
    entries.forEach((entry) => {
      if (entry.status in entryCountByStatus) {
        entryCountByStatus[entry.status]++;
      }
    });

    // Build summary DTO
    const summary: CostPeriodSummaryDto = {
      periodId: period.id,
      periodName: period.periodName,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      status: period.status,
      totalCostEntries,
      totalAmount,
      entryCountByType,
      entryCountByStatus,
    };

    this.logger.log(
      `Summary generated for period ${id}: ${totalCostEntries} entries, $${totalAmount}`,
    );

    return summary;
  }

  // ==================== HELPER METHODS ====================

  /**
   * Validate no overlapping periods exist
   *
   * Checks that no existing cost periods for the same project overlap
   * with the given date range. Two periods overlap if:
   * - New period starts before existing period ends, AND
   * - New period ends after existing period starts
   *
   * @param projectId - Project UUID
   * @param periodStart - Period start date
   * @param periodEnd - Period end date
   * @param excludeId - Period ID to exclude from check (for updates)
   * @throws BadRequestException if overlapping period found
   * @private
   */
  private async validateNoOverlap(
    projectId: string,
    periodStart: Date,
    periodEnd: Date,
    excludeId?: string,
  ): Promise<void> {
    const query = this.costPeriodRepository
      .createQueryBuilder('period')
      .where('period.project_id = :projectId', { projectId })
      .andWhere(
        '(period.period_start < :periodEnd AND period.period_end > :periodStart)',
        { periodStart, periodEnd },
      );

    // Exclude current period if updating
    if (excludeId) {
      query.andWhere('period.id != :excludeId', { excludeId });
    }

    const overlappingPeriod = await query.getOne();

    if (overlappingPeriod) {
      throw new BadRequestException(
        `Period dates overlap with existing period "${overlappingPeriod.periodName}" ` +
        `(${overlappingPeriod.periodStart.toISOString().split('T')[0]} to ` +
        `${overlappingPeriod.periodEnd.toISOString().split('T')[0]})`,
      );
    }
  }

  /**
   * Create budget snapshot
   *
   * Queries the current state of the budget and its line items to create
   * a JSONB snapshot for historical reporting. The snapshot includes:
   * - Budget totals (budgeted, committed, actual)
   * - Line item details with cost code information
   * - Variance calculations
   *
   * @param periodId - Cost period UUID
   * @param budgetId - Budget UUID
   * @param manager - Transaction manager (optional)
   * @returns JSONB snapshot object
   * @private
   */
  private async createBudgetSnapshot(
    periodId: string,
    budgetId: string,
    manager?: EntityManager,
  ): Promise<Record<string, any>> {
    const budgetRepo = manager
      ? manager.getRepository(Budget)
      : this.budgetRepository;

    const lineItemRepo = manager
      ? manager.getRepository(BudgetLineItem)
      : this.budgetLineItemRepository;

    // Load budget
    const budget = await budgetRepo.findOne({
      where: { id: budgetId },
      relations: ['project'],
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${budgetId} not found`);
    }

    // Load all line items with cost codes
    const lineItems = await lineItemRepo.find({
      where: { budgetId },
      relations: ['costCode'],
      order: { costCode: { code: 'ASC' } },
    });

    // Calculate totals
    const totalBudgeted = lineItems.reduce(
      (sum, item) => sum + Number(item.budgetedCost),
      0,
    );
    const totalCommitted = lineItems.reduce(
      (sum, item) => sum + Number(item.committedCost),
      0,
    );
    const totalActual = lineItems.reduce(
      (sum, item) => sum + Number(item.actualCost),
      0,
    );
    const variance = totalBudgeted - totalActual;
    const variancePercent = totalBudgeted > 0
      ? ((variance / totalBudgeted) * 100)
      : 0;

    // Build line item details
    const lineItemDetails = lineItems.map((item) => {
      const itemVariance = Number(item.budgetedCost) - Number(item.actualCost);
      const itemVariancePercent = Number(item.budgetedCost) > 0
        ? ((itemVariance / Number(item.budgetedCost)) * 100)
        : 0;

      return {
        costCodeId: item.costCodeId,
        costCode: item.costCode?.code || 'N/A',
        costCodeName: item.costCode?.name || 'N/A',
        category: item.category,
        budgetedCost: Number(item.budgetedCost),
        committedCost: Number(item.committedCost),
        actualCost: Number(item.actualCost),
        variance: itemVariance,
        variancePercent: itemVariancePercent,
      };
    });

    // Build snapshot
    const snapshot = {
      periodId,
      budgetId,
      budgetName: budget.name,
      projectId: budget.projectId,
      projectName: budget.project?.name || 'N/A',
      snapshotDate: new Date().toISOString(),
      totals: {
        budgeted: totalBudgeted,
        committed: totalCommitted,
        actual: totalActual,
        variance,
        variancePercent,
      },
      lineItems: lineItemDetails,
      lineItemCount: lineItems.length,
    };

    this.logger.debug(
      `Created budget snapshot for period ${periodId}: ` +
      `${lineItems.length} line items, $${totalBudgeted} budgeted, $${totalActual} actual`,
    );

    return snapshot;
  }

  /**
   * Validate period can be closed
   *
   * Checks that all cost entries in the period are POSTED.
   * DRAFT entries must be posted or deleted before closing.
   *
   * @param periodId - Cost period UUID
   * @param manager - Transaction manager (optional)
   * @throws BadRequestException if period has DRAFT entries
   * @private
   */
  private async validatePeriodCanBeClosed(
    periodId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const entryRepo = manager
      ? manager.getRepository(CostEntry)
      : this.costEntryRepository;

    // Count DRAFT entries in period
    const draftCount = await entryRepo.count({
      where: {
        costPeriodId: periodId,
        status: CostEntryStatus.DRAFT,
      },
    });

    if (draftCount > 0) {
      throw new BadRequestException(
        `Cannot close period with ${draftCount} DRAFT cost entries. ` +
        `All entries must be POSTED before closing.`,
      );
    }

    this.logger.debug(`Period ${periodId} validation passed: no DRAFT entries`);
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
  private buildFilterQuery(filter: CostPeriodFilterDto) {
    const query = this.costPeriodRepository.createQueryBuilder('costPeriod');

    // Filter by project
    if (filter.projectId) {
      query.andWhere('costPeriod.project_id = :projectId', {
        projectId: filter.projectId,
      });
    }

    // Filter by budget
    if (filter.budgetId) {
      query.andWhere('costPeriod.budget_id = :budgetId', {
        budgetId: filter.budgetId,
      });
    }

    // Filter by status
    if (filter.status) {
      query.andWhere('costPeriod.status = :status', {
        status: filter.status,
      });
    }

    // Filter by date range (periods starting on or after fromDate)
    if (filter.fromDate) {
      query.andWhere('costPeriod.period_start >= :fromDate', {
        fromDate: filter.fromDate,
      });
    }

    // Filter by date range (periods ending on or before toDate)
    if (filter.toDate) {
      query.andWhere('costPeriod.period_end <= :toDate', {
        toDate: filter.toDate,
      });
    }

    return query;
  }
}
