import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Accrual } from '../entities/accrual.entity';
import { CostEntry } from '../entities/cost-entry.entity';
import { Budget } from '../entities/budget.entity';
import { BudgetLineItem } from '../entities/budget-line-item.entity';
import { CostCode } from '../entities/cost-code.entity';
import { Project } from '../../projects/entities/project.entity';
import { Commitment } from '../entities/commitment.entity';
import { CostPeriod } from '../entities/cost-period.entity';
import {
  CreateAccrualDto,
  UpdateAccrualDto,
  AccrualFilterDto,
  ReverseAccrualDto,
  ConvertAccrualDto,
  AccrualResponseDto,
} from '../dto';
import { AccrualStatus } from '../enums/accrual-status.enum';
import { CostEntryType } from '../enums/cost-entry-type.enum';
import { CostEntryStatus } from '../enums/cost-entry-status.enum';
import { CostEntryService } from './cost-entry.service';

/**
 * Accrual Service
 *
 * Comprehensive service for managing accrued costs with full CRUD operations
 * and workflow management including reversal and conversion to cost entries.
 *
 * Core Features:
 * - Create, read, update, delete accruals
 * - Reverse accruals when estimates are corrected or invoices received
 * - Convert accruals to actual cost entries when invoices arrive
 * - Automatic budget actualCost updates
 * - Comprehensive validation and relation checking
 * - Advanced filtering and pagination
 *
 * Workflow:
 * ACTIVE → REVERSED (with offsetting entry)
 * ACTIVE → CONVERTED (creates actual cost entry)
 *
 * Business Rules:
 * - Only ACTIVE accruals can be updated, reversed, or converted
 * - Reversing creates offsetting cost entry to neutralize budget impact
 * - Converting creates actual cost entry and adjusts budget by difference
 * - All operations maintain complete audit trail
 *
 * @service AccrualService
 */
@Injectable()
export class AccrualService {
  private readonly logger = new Logger(AccrualService.name);

  constructor(
    @InjectRepository(Accrual)
    private readonly accrualRepository: Repository<Accrual>,
    @InjectRepository(CostEntry)
    private readonly costEntryRepository: Repository<CostEntry>,
    @InjectRepository(Budget)
    private readonly budgetRepository: Repository<Budget>,
    @InjectRepository(BudgetLineItem)
    private readonly budgetLineItemRepository: Repository<BudgetLineItem>,
    @InjectRepository(CostCode)
    private readonly costCodeRepository: Repository<CostCode>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Commitment)
    private readonly commitmentRepository: Repository<Commitment>,
    @InjectRepository(CostPeriod)
    private readonly costPeriodRepository: Repository<CostPeriod>,
    private readonly costEntryService: CostEntryService,
    private readonly dataSource: DataSource,
  ) {}

  // ==================== CRUD METHODS ====================

  /**
   * Create a new accrual
   *
   * Validates all required relations exist, creates the accrual in ACTIVE status,
   * and automatically updates the budget actualCost.
   *
   * @param dto - Accrual creation data
   * @param userId - ID of user creating the accrual
   * @returns Created accrual with relations loaded
   * @throws NotFoundException if required relations don't exist
   * @throws BadRequestException if validation fails
   */
  async create(
    dto: CreateAccrualDto,
    userId: string,
  ): Promise<AccrualResponseDto> {
    this.logger.log(
      `Creating accrual for project ${dto.projectId}, cost code ${dto.costCodeId}`,
    );

    // Validate all required relations
    await this.validateRelations(dto);

    // Create the accrual
    const accrual = this.accrualRepository.create({
      ...dto,
      status: AccrualStatus.ACTIVE,
      createdById: userId,
    });

    // Save the accrual
    const savedAccrual = await this.accrualRepository.save(accrual);

    this.logger.log(`Accrual created successfully: ${savedAccrual.id} - ${savedAccrual.accrualNumber}`);

    // Load with relations and return
    return this.findOne(savedAccrual.id);
  }

  /**
   * Find all accruals with filtering, pagination, and sorting
   *
   * Supports comprehensive filtering by project, budget, cost code, status,
   * date ranges, commitment, and cost period.
   *
   * @param filter - Filter, pagination, and sorting parameters
   * @returns Paginated accruals with total count
   */
  async findAll(
    filter: AccrualFilterDto,
  ): Promise<{ data: AccrualResponseDto[]; total: number }> {
    this.logger.log(
      `Finding accruals with filters: ${JSON.stringify(filter)}`,
    );

    // Build query with filters
    const query = this.buildFilterQuery(filter);

    // Load relations
    query
      .leftJoinAndSelect('accrual.project', 'project')
      .leftJoinAndSelect('accrual.budget', 'budget')
      .leftJoinAndSelect('accrual.costCode', 'costCode')
      .leftJoinAndSelect('accrual.commitment', 'commitment')
      .leftJoinAndSelect('accrual.costPeriod', 'costPeriod')
      .leftJoinAndSelect('accrual.createdBy', 'createdBy')
      .leftJoinAndSelect('accrual.reversedBy', 'reversedBy')
      .leftJoinAndSelect('accrual.convertedEntry', 'convertedEntry');

    // Apply pagination
    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const skip = (page - 1) * limit;

    query.skip(skip).take(limit);

    // Apply sorting
    const sortBy = filter.sortBy || 'accrualDate';
    const sortOrder = filter.sortOrder || 'DESC';
    query.orderBy(`accrual.${sortBy}`, sortOrder);

    // Execute query
    const [accruals, total] = await query.getManyAndCount();

    this.logger.log(
      `Found ${accruals.length} accruals (total: ${total}, page: ${page})`,
    );

    return {
      data: accruals.map((accrual) => this.toResponseDto(accrual)),
      total,
    };
  }

  /**
   * Find a single accrual by ID
   *
   * Loads the accrual with all relations for comprehensive data access.
   *
   * @param id - Accrual UUID
   * @returns Accrual with all relations
   * @throws NotFoundException if accrual doesn't exist
   */
  async findOne(id: string): Promise<AccrualResponseDto> {
    this.logger.log(`Finding accrual ${id}`);

    const accrual = await this.accrualRepository.findOne({
      where: { id },
      relations: [
        'project',
        'budget',
        'costCode',
        'commitment',
        'costPeriod',
        'createdBy',
        'reversedBy',
        'convertedEntry',
      ],
    });

    if (!accrual) {
      throw new NotFoundException(`Accrual with ID ${id} not found`);
    }

    return this.toResponseDto(accrual);
  }

  /**
   * Update an accrual
   *
   * Only accruals in ACTIVE status can be updated.
   * Validates any changed relations and records the changes.
   *
   * @param id - Accrual UUID
   * @param dto - Update data
   * @param userId - ID of user performing update
   * @returns Updated accrual
   * @throws NotFoundException if accrual doesn't exist
   * @throws BadRequestException if accrual is not in ACTIVE status or validation fails
   */
  async update(
    id: string,
    dto: UpdateAccrualDto,
    userId: string,
  ): Promise<AccrualResponseDto> {
    this.logger.log(`Updating accrual ${id}`);

    // Load existing accrual
    const accrual = await this.accrualRepository.findOne({
      where: { id },
    });

    if (!accrual) {
      throw new NotFoundException(`Accrual with ID ${id} not found`);
    }

    // Validate status
    if (accrual.status !== AccrualStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot update accrual with status ${accrual.status}. Only ACTIVE accruals can be updated.`,
      );
    }

    // Validate changed relations if provided
    if (dto.commitmentId !== undefined || dto.costPeriodId !== undefined) {
      await this.validateRelations({
        projectId: accrual.projectId,
        budgetId: accrual.budgetId,
        costCodeId: accrual.costCodeId,
        commitmentId: dto.commitmentId !== undefined ? dto.commitmentId : accrual.commitmentId,
        costPeriodId: dto.costPeriodId !== undefined ? dto.costPeriodId : accrual.costPeriodId,
      } as any);
    }

    // Apply updates
    Object.assign(accrual, dto);

    // Save updated accrual
    const updatedAccrual = await this.accrualRepository.save(accrual);

    this.logger.log(`Accrual updated successfully: ${id}`);

    // Load with relations and return
    return this.findOne(id);
  }

  /**
   * Delete an accrual
   *
   * Only accruals in ACTIVE status can be deleted.
   * This is a hard delete - the accrual is removed from the database.
   *
   * @param id - Accrual UUID
   * @param userId - ID of user performing deletion
   * @throws NotFoundException if accrual doesn't exist
   * @throws BadRequestException if accrual is not in ACTIVE status
   */
  async remove(id: string, userId: string): Promise<void> {
    this.logger.log(`Deleting accrual ${id}`);

    // Load existing accrual
    const accrual = await this.accrualRepository.findOne({
      where: { id },
    });

    if (!accrual) {
      throw new NotFoundException(`Accrual with ID ${id} not found`);
    }

    // Validate status
    if (accrual.status !== AccrualStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot delete accrual with status ${accrual.status}. Only ACTIVE accruals can be deleted.`,
      );
    }

    // Delete the accrual
    await this.accrualRepository.remove(accrual);

    this.logger.log(`Accrual deleted successfully: ${id}`);
  }

  // ==================== WORKFLOW METHODS ====================

  /**
   * Reverse an accrual
   *
   * Changes status from ACTIVE to REVERSED and creates an offsetting cost entry
   * to neutralize the accrual's impact on budget actualCost.
   *
   * Use cases:
   * - Invoice received with different amount than estimated
   * - Original estimate was incorrect
   * - Work not completed and accrual no longer valid
   *
   * This operation is wrapped in a transaction to ensure atomicity.
   *
   * @param id - Accrual UUID
   * @param dto - Reversal reason
   * @param userId - ID of user performing reversal
   * @returns Reversed accrual
   * @throws NotFoundException if accrual doesn't exist
   * @throws BadRequestException if accrual is not in ACTIVE status
   */
  async reverse(
    id: string,
    dto: ReverseAccrualDto,
    userId: string,
  ): Promise<AccrualResponseDto> {
    this.logger.log(`Reversing accrual ${id}: ${dto.reversalReason}`);

    // Use transaction for atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Load accrual
      const accrual = await queryRunner.manager.findOne(Accrual, {
        where: { id },
        relations: ['project', 'budget', 'costCode'],
      });

      if (!accrual) {
        throw new NotFoundException(`Accrual with ID ${id} not found`);
      }

      // Validate status
      if (accrual.status !== AccrualStatus.ACTIVE) {
        throw new BadRequestException(
          `Cannot reverse accrual with status ${accrual.status}. Only ACTIVE accruals can be reversed.`,
        );
      }

      // Create offsetting cost entry to reverse the accrual's budget impact
      await this.createReversalEntry(accrual, userId, queryRunner.manager);

      // Update accrual status
      accrual.status = AccrualStatus.REVERSED;
      accrual.reversedAt = new Date();
      accrual.reversedById = userId;
      accrual.reversalReason = dto.reversalReason;

      await queryRunner.manager.save(Accrual, accrual);

      // Commit transaction
      await queryRunner.commitTransaction();

      this.logger.log(`Accrual reversed successfully: ${id}`);

      // Load with relations and return
      return this.findOne(id);
    } catch (error) {
      // Rollback on error
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to reverse accrual ${id}: ${(error as Error).message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Convert an accrual to an actual cost entry
   *
   * Changes status from ACTIVE to CONVERTED and creates a cost entry with the
   * actual cost (defaults to estimatedCost if not provided).
   * Adjusts budget actualCost by the difference between actual and estimated.
   *
   * Use cases:
   * - Invoice received for accrued work
   * - Final cost confirmed
   * - Moving from estimated to actual cost tracking
   *
   * This operation is wrapped in a transaction to ensure atomicity.
   *
   * @param id - Accrual UUID
   * @param dto - Conversion data (optional actualCost, invoiceNumber, vendor, notes)
   * @param userId - ID of user performing conversion
   * @returns Converted accrual
   * @throws NotFoundException if accrual doesn't exist
   * @throws BadRequestException if accrual is not in ACTIVE status
   */
  async convert(
    id: string,
    dto: ConvertAccrualDto,
    userId: string,
  ): Promise<AccrualResponseDto> {
    this.logger.log(`Converting accrual ${id} to cost entry`);

    // Use transaction for atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Load accrual
      const accrual = await queryRunner.manager.findOne(Accrual, {
        where: { id },
        relations: ['project', 'budget', 'costCode'],
      });

      if (!accrual) {
        throw new NotFoundException(`Accrual with ID ${id} not found`);
      }

      // Validate status
      if (accrual.status !== AccrualStatus.ACTIVE) {
        throw new BadRequestException(
          `Cannot convert accrual with status ${accrual.status}. Only ACTIVE accruals can be converted.`,
        );
      }

      // Default actualCost to estimatedCost if not provided
      const actualCost = dto.actualCost || Number(accrual.estimatedCost);

      // Create actual cost entry
      const costEntry = await this.createConversionEntry(
        accrual,
        actualCost,
        dto,
        userId,
        queryRunner.manager,
      );

      // Update accrual status
      accrual.status = AccrualStatus.CONVERTED;
      accrual.convertedEntryId = costEntry.id;

      await queryRunner.manager.save(Accrual, accrual);

      // Commit transaction
      await queryRunner.commitTransaction();

      this.logger.log(
        `Accrual converted successfully: ${id} → Cost Entry: ${costEntry.id}`,
      );

      // Load with relations and return
      return this.findOne(id);
    } catch (error) {
      // Rollback on error
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to convert accrual ${id}: ${(error as Error).message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Validate required and optional relations
   *
   * Checks that all referenced entities exist:
   * - Project (required)
   * - Budget (required) - must belong to project
   * - Cost Code (required)
   * - Commitment (optional)
   * - Cost Period (optional)
   *
   * @param dto - DTO containing relation IDs
   * @throws NotFoundException if required relation doesn't exist
   * @throws BadRequestException if budget doesn't belong to project
   * @private
   */
  private async validateRelations(
    dto: CreateAccrualDto | UpdateAccrualDto,
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
   * Create reversal cost entry
   *
   * Creates an offsetting cost entry with negative amount to reverse
   * the accrual's impact on budget actualCost.
   *
   * The entry is created with:
   * - Type: ACCRUAL
   * - Status: POSTED (to immediately affect budget)
   * - Total cost: negative of accrual's estimatedCost
   * - Description: references original accrual
   *
   * @param accrual - Original accrual being reversed
   * @param userId - ID of user performing reversal
   * @param manager - Transaction manager
   * @returns Created reversal cost entry
   * @private
   */
  private async createReversalEntry(
    accrual: Accrual,
    userId: string,
    manager: EntityManager,
  ): Promise<CostEntry> {
    this.logger.log(
      `Creating reversal entry for accrual ${accrual.accrualNumber}`,
    );

    // Create cost entry with negative amount
    const costEntry = manager.create(CostEntry, {
      projectId: accrual.projectId,
      budgetId: accrual.budgetId,
      costCodeId: accrual.costCodeId,
      commitmentId: accrual.commitmentId,
      costPeriodId: accrual.costPeriodId,
      type: CostEntryType.ACCRUAL,
      status: CostEntryStatus.POSTED,
      entryDate: new Date(),
      description: `Reversal of accrual ${accrual.accrualNumber}: ${accrual.description}`,
      totalCost: -Math.abs(Number(accrual.estimatedCost)), // Negative to reverse
      notes: accrual.reversalReason,
      createdById: userId,
      postedById: userId,
      postedAt: new Date(),
    });

    const savedEntry = await manager.save(CostEntry, costEntry);

    // Update budget actualCost (decrement by original accrual amount)
    await this.updateBudgetActualCost(
      accrual.budgetId,
      accrual.costCodeId,
      -Number(accrual.estimatedCost),
      manager,
    );

    this.logger.log(
      `Reversal entry created: ${savedEntry.id} - ${savedEntry.entryNumber}`,
    );

    return savedEntry;
  }

  /**
   * Create conversion cost entry
   *
   * Creates a cost entry with actual cost when converting an accrual.
   * Adjusts budget actualCost by the difference between actual and estimated.
   *
   * The entry is created with:
   * - Type: ACCRUAL (to track it came from accrual conversion)
   * - Status: POSTED (to immediately affect budget)
   * - Total cost: actualCost provided (or estimatedCost if not provided)
   * - Description: references original accrual
   * - Links to original accrual via notes
   *
   * @param accrual - Original accrual being converted
   * @param actualCost - Actual cost amount
   * @param dto - Conversion DTO with optional invoice/vendor info
   * @param userId - ID of user performing conversion
   * @param manager - Transaction manager
   * @returns Created conversion cost entry
   * @private
   */
  private async createConversionEntry(
    accrual: Accrual,
    actualCost: number,
    dto: ConvertAccrualDto,
    userId: string,
    manager: EntityManager,
  ): Promise<CostEntry> {
    this.logger.log(
      `Creating conversion entry for accrual ${accrual.accrualNumber} with actual cost ${actualCost}`,
    );

    // Build description
    let description = `Conversion of accrual ${accrual.accrualNumber}: ${accrual.description}`;
    if (dto.notes) {
      description += ` | ${dto.notes}`;
    }

    // Create cost entry
    const costEntry = manager.create(CostEntry, {
      projectId: accrual.projectId,
      budgetId: accrual.budgetId,
      costCodeId: accrual.costCodeId,
      commitmentId: accrual.commitmentId,
      costPeriodId: accrual.costPeriodId,
      type: CostEntryType.ACCRUAL,
      status: CostEntryStatus.POSTED,
      entryDate: new Date(),
      description,
      totalCost: actualCost,
      invoiceNumber: dto.invoiceNumber,
      vendor: dto.vendor,
      notes: `Converted from accrual ${accrual.accrualNumber}. Original estimate: ${accrual.estimatedCost}`,
      createdById: userId,
      postedById: userId,
      postedAt: new Date(),
    });

    const savedEntry = await manager.save(CostEntry, costEntry);

    // Calculate the difference to adjust budget
    // We need to reverse the original accrual and add the actual cost
    const estimatedCost = Number(accrual.estimatedCost);
    const adjustment = actualCost - estimatedCost;

    // Update budget actualCost by the difference
    await this.updateBudgetActualCost(
      accrual.budgetId,
      accrual.costCodeId,
      adjustment,
      manager,
    );

    this.logger.log(
      `Conversion entry created: ${savedEntry.id} - ${savedEntry.entryNumber} (adjustment: ${adjustment})`,
    );

    return savedEntry;
  }

  /**
   * Update budget line item actualCost
   *
   * Increments or decrements the actualCost of the budget line item that
   * matches the cost code.
   *
   * @param budgetId - Budget UUID
   * @param costCodeId - Cost Code UUID
   * @param amount - Amount to add (positive) or subtract (negative)
   * @param manager - Transaction manager (optional)
   * @private
   */
  private async updateBudgetActualCost(
    budgetId: string,
    costCodeId: string,
    amount: number,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager
      ? manager.getRepository(BudgetLineItem)
      : this.budgetLineItemRepository;

    // Find budget line item matching this cost code
    const lineItem = await repo.findOne({
      where: {
        budgetId,
        costCodeId,
      },
    });

    if (!lineItem) {
      this.logger.warn(
        `No budget line item found for budgetId ${budgetId}, costCodeId ${costCodeId}. Creating new line item.`,
      );

      // Create a new line item if one doesn't exist
      const costCode = await this.costCodeRepository.findOne({
        where: { id: costCodeId },
      });

      if (!costCode) {
        throw new NotFoundException(
          `Cost code with ID ${costCodeId} not found`,
        );
      }

      const newLineItem = repo.create({
        budgetId,
        costCodeId,
        category: (costCode.category || 'OTHER') as any,
        budgetedCost: 0,
        committedCost: 0,
        actualCost: Math.max(0, amount),
      });

      await repo.save(newLineItem);

      this.logger.log(
        `Created new budget line item with actualCost: ${newLineItem.actualCost}`,
      );

      return;
    }

    // Update actualCost
    const currentActual = Number(lineItem.actualCost) || 0;
    lineItem.actualCost = Math.max(0, currentActual + amount);

    this.logger.log(
      `Updating actualCost: ${currentActual} + ${amount} = ${lineItem.actualCost}`,
    );

    await repo.save(lineItem);
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
  private buildFilterQuery(filter: AccrualFilterDto) {
    const query = this.accrualRepository.createQueryBuilder('accrual');

    // Filter by project
    if (filter.projectId) {
      query.andWhere('accrual.project_id = :projectId', {
        projectId: filter.projectId,
      });
    }

    // Filter by budget
    if (filter.budgetId) {
      query.andWhere('accrual.budget_id = :budgetId', {
        budgetId: filter.budgetId,
      });
    }

    // Filter by cost code
    if (filter.costCodeId) {
      query.andWhere('accrual.cost_code_id = :costCodeId', {
        costCodeId: filter.costCodeId,
      });
    }

    // Filter by status
    if (filter.status) {
      query.andWhere('accrual.status = :status', { status: filter.status });
    }

    // Filter by date range
    if (filter.fromDate) {
      query.andWhere('accrual.accrual_date >= :fromDate', {
        fromDate: filter.fromDate,
      });
    }

    if (filter.toDate) {
      query.andWhere('accrual.accrual_date <= :toDate', {
        toDate: filter.toDate,
      });
    }

    // Filter by commitment
    if (filter.commitmentId) {
      query.andWhere('accrual.commitment_id = :commitmentId', {
        commitmentId: filter.commitmentId,
      });
    }

    // Filter by cost period
    if (filter.costPeriodId) {
      query.andWhere('accrual.cost_period_id = :costPeriodId', {
        costPeriodId: filter.costPeriodId,
      });
    }

    return query;
  }

  /**
   * Convert entity to response DTO
   *
   * Maps the accrual entity and its relations to a response DTO
   * for API consumption.
   *
   * @param accrual - Accrual entity
   * @returns Response DTO
   */
  toResponseDto(accrual: Accrual): AccrualResponseDto {
    return {
      id: accrual.id,
      accrualNumber: accrual.accrualNumber,
      projectId: accrual.projectId,
      budgetId: accrual.budgetId,
      costCodeId: accrual.costCodeId,
      commitmentId: accrual.commitmentId,
      costPeriodId: accrual.costPeriodId,
      description: accrual.description,
      estimatedCost: accrual.estimatedCost,
      status: accrual.status,
      accrualDate: accrual.accrualDate,
      reversedAt: accrual.reversedAt,
      reversedById: accrual.reversedById,
      reversalReason: accrual.reversalReason,
      convertedEntryId: accrual.convertedEntryId,
      notes: accrual.notes,
      createdById: accrual.createdById,
      createdAt: accrual.createdAt,
      updatedAt: accrual.updatedAt,
      // Nested relations
      project: accrual.project
        ? { name: accrual.project.name }
        : undefined,
      budget: accrual.budget
        ? { name: accrual.budget.name }
        : undefined,
      costCode: accrual.costCode
        ? { code: accrual.costCode.code, name: accrual.costCode.name }
        : undefined,
      commitment: accrual.commitment
        ? { vendorName: accrual.commitment.vendorName }
        : undefined,
      costPeriod: accrual.costPeriod
        ? { periodName: accrual.costPeriod.periodName }
        : undefined,
      createdBy: accrual.createdBy
        ? {
            firstName: accrual.createdBy.firstName,
            lastName: accrual.createdBy.lastName,
          }
        : undefined,
      reversedBy: accrual.reversedBy
        ? {
            firstName: accrual.reversedBy.firstName,
            lastName: accrual.reversedBy.lastName,
          }
        : undefined,
      convertedEntry: accrual.convertedEntry
        ? {
            entryNumber: accrual.convertedEntry.entryNumber,
            totalCost: accrual.convertedEntry.totalCost,
          }
        : undefined,
    } as unknown as AccrualResponseDto;
  }
}
