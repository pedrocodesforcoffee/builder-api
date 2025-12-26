import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { CostTransfer } from '../entities/cost-transfer.entity';
import { CostEntry } from '../entities/cost-entry.entity';
import { Budget } from '../entities/budget.entity';
import { BudgetLineItem } from '../entities/budget-line-item.entity';
import { CostCode } from '../entities/cost-code.entity';
import { Project } from '../../projects/entities/project.entity';
import { CostEntryService } from './cost-entry.service';
import {
  CreateCostTransferDto,
  UpdateCostTransferDto,
  CostTransferFilterDto,
  RejectCostTransferDto,
  VoidCostTransferDto,
  CostTransferResponseDto,
} from '../dto';
import { CostTransferStatus } from '../enums/cost-transfer-status.enum';
import { CostEntryType } from '../enums/cost-entry-type.enum';
import { CostEntryStatus } from '../enums/cost-entry-status.enum';

/**
 * Cost Transfer Service
 *
 * Comprehensive service for managing cost transfers with full CRUD operations
 * and workflow management.
 *
 * Core Features:
 * - Create, read, update, delete cost transfers (DRAFT only)
 * - Submit/approve/reject/void workflow
 * - Automatic CostEntry creation on approval (debit FROM, credit TO)
 * - Comprehensive validation and relation checking
 * - Complete audit trail
 * - Advanced filtering and pagination
 *
 * Workflow:
 * DRAFT → PENDING_APPROVAL → APPROVED/REJECTED
 * APPROVED → VOID (optional)
 *
 * Business Rules:
 * - Only DRAFT transfers can be updated or deleted
 * - Only DRAFT transfers can be submitted
 * - Only PENDING_APPROVAL transfers can be approved or rejected
 * - Only APPROVED transfers can be voided
 * - Approval creates two cost entries (debit from source, credit to target)
 * - Voiding creates offsetting entries to reverse the transfer
 * - Validates sufficient funds in source cost code before approval
 *
 * @service CostTransferService
 */
@Injectable()
export class CostTransferService {
  private readonly logger = new Logger(CostTransferService.name);

  constructor(
    @InjectRepository(CostTransfer)
    private readonly costTransferRepository: Repository<CostTransfer>,
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
    private readonly costEntryService: CostEntryService,
    private readonly dataSource: DataSource,
  ) {}

  // ==================== CRUD METHODS ====================

  /**
   * Create a new cost transfer
   *
   * Validates all required relations exist, creates the transfer in DRAFT status.
   *
   * @param dto - Cost transfer creation data
   * @param userId - ID of user creating the transfer
   * @returns Created cost transfer with relations loaded
   * @throws NotFoundException if required relations don't exist
   * @throws BadRequestException if validation fails
   */
  async create(
    dto: CreateCostTransferDto,
    userId: string,
  ): Promise<CostTransferResponseDto> {
    this.logger.log(
      `Creating cost transfer for project ${dto.projectId}, from ${dto.fromCostCodeId} to ${dto.toCostCodeId}`,
    );

    // Validate all required relations
    await this.validateRelations(dto);

    // Validate that from and to cost codes are different
    if (dto.fromCostCodeId === dto.toCostCodeId) {
      throw new BadRequestException(
        'From and to cost codes must be different',
      );
    }

    // Create the cost transfer
    const costTransfer = this.costTransferRepository.create({
      ...dto,
      status: CostTransferStatus.DRAFT,
      requestedById: userId,
      requestedAt: new Date(),
    });

    // Save the transfer
    const savedTransfer = await this.costTransferRepository.save(costTransfer);

    this.logger.log(`Cost transfer created successfully: ${savedTransfer.id}`);

    // Load with relations and return
    return this.findOne(savedTransfer.id);
  }

  /**
   * Find all cost transfers with filtering, pagination, and sorting
   *
   * Supports comprehensive filtering by project, budget, cost codes, status, date ranges.
   *
   * @param filter - Filter, pagination, and sorting parameters
   * @returns Paginated cost transfers with total count
   */
  async findAll(
    filter: CostTransferFilterDto,
  ): Promise<{ data: CostTransferResponseDto[]; total: number }> {
    this.logger.log(
      `Finding cost transfers with filters: ${JSON.stringify(filter)}`,
    );

    // Build query with filters
    const query = this.buildFilterQuery(filter);

    // Load relations
    query
      .leftJoinAndSelect('costTransfer.project', 'project')
      .leftJoinAndSelect('costTransfer.budget', 'budget')
      .leftJoinAndSelect('costTransfer.fromCostCode', 'fromCostCode')
      .leftJoinAndSelect('costTransfer.toCostCode', 'toCostCode')
      .leftJoinAndSelect('costTransfer.requestedBy', 'requestedBy')
      .leftJoinAndSelect('costTransfer.approvedBy', 'approvedBy')
      .leftJoinAndSelect('costTransfer.rejectedBy', 'rejectedBy')
      .leftJoinAndSelect('costTransfer.voidedBy', 'voidedBy')
      .leftJoinAndSelect('costTransfer.fromEntry', 'fromEntry')
      .leftJoinAndSelect('costTransfer.toEntry', 'toEntry');

    // Apply pagination
    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const skip = (page - 1) * limit;

    query.skip(skip).take(limit);

    // Apply sorting
    const sortBy = filter.sortBy || 'requestedAt';
    const sortOrder = filter.sortOrder || 'DESC';
    query.orderBy(`costTransfer.${sortBy}`, sortOrder);

    // Execute query
    const [transfers, total] = await query.getManyAndCount();

    this.logger.log(
      `Found ${transfers.length} cost transfers (total: ${total}, page: ${page})`,
    );

    return {
      data: transfers.map((transfer) => this.toResponseDto(transfer)),
      total,
    };
  }

  /**
   * Find a single cost transfer by ID
   *
   * Loads the transfer with all relations for comprehensive data access.
   *
   * @param id - Cost transfer UUID
   * @returns Cost transfer with all relations
   * @throws NotFoundException if transfer doesn't exist
   */
  async findOne(id: string): Promise<CostTransferResponseDto> {
    this.logger.log(`Finding cost transfer ${id}`);

    const transfer = await this.costTransferRepository.findOne({
      where: { id },
      relations: [
        'project',
        'budget',
        'fromCostCode',
        'toCostCode',
        'requestedBy',
        'approvedBy',
        'rejectedBy',
        'voidedBy',
        'fromEntry',
        'toEntry',
      ],
    });

    if (!transfer) {
      throw new NotFoundException(`Cost transfer with ID ${id} not found`);
    }

    return this.toResponseDto(transfer);
  }

  /**
   * Update a cost transfer
   *
   * Only cost transfers in DRAFT status can be updated.
   * Validates any changed relations.
   *
   * @param id - Cost transfer UUID
   * @param dto - Update data
   * @param userId - ID of user performing update
   * @returns Updated cost transfer
   * @throws NotFoundException if transfer doesn't exist
   * @throws BadRequestException if transfer is not in DRAFT status or validation fails
   */
  async update(
    id: string,
    dto: UpdateCostTransferDto,
    userId: string,
  ): Promise<CostTransferResponseDto> {
    this.logger.log(`Updating cost transfer ${id}`);

    // Load existing transfer
    const transfer = await this.costTransferRepository.findOne({
      where: { id },
    });

    if (!transfer) {
      throw new NotFoundException(`Cost transfer with ID ${id} not found`);
    }

    // Validate status
    if (transfer.status !== CostTransferStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot update cost transfer with status ${transfer.status}. Only DRAFT transfers can be updated.`,
      );
    }

    // Validate changed relations if provided
    if (dto.fromCostCodeId || dto.toCostCodeId) {
      await this.validateRelations({
        projectId: transfer.projectId,
        budgetId: transfer.budgetId,
        fromCostCodeId: dto.fromCostCodeId || transfer.fromCostCodeId,
        toCostCodeId: dto.toCostCodeId || transfer.toCostCodeId,
        amount: dto.amount || transfer.amount,
        reason: dto.reason || transfer.reason,
      });

      // Validate that from and to cost codes are different
      const fromId = dto.fromCostCodeId || transfer.fromCostCodeId;
      const toId = dto.toCostCodeId || transfer.toCostCodeId;
      if (fromId === toId) {
        throw new BadRequestException(
          'From and to cost codes must be different',
        );
      }
    }

    // Apply updates
    Object.assign(transfer, dto);

    // Save updated transfer
    const updatedTransfer = await this.costTransferRepository.save(transfer);

    this.logger.log(`Cost transfer updated successfully: ${id}`);

    // Load with relations and return
    return this.findOne(id);
  }

  /**
   * Delete a cost transfer
   *
   * Only cost transfers in DRAFT status can be deleted.
   * This is a hard delete.
   *
   * @param id - Cost transfer UUID
   * @param userId - ID of user performing deletion
   * @throws NotFoundException if transfer doesn't exist
   * @throws BadRequestException if transfer is not in DRAFT status
   */
  async remove(id: string, userId: string): Promise<void> {
    this.logger.log(`Deleting cost transfer ${id}`);

    // Load existing transfer
    const transfer = await this.costTransferRepository.findOne({
      where: { id },
    });

    if (!transfer) {
      throw new NotFoundException(`Cost transfer with ID ${id} not found`);
    }

    // Validate status
    if (transfer.status !== CostTransferStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot delete cost transfer with status ${transfer.status}. Only DRAFT transfers can be deleted.`,
      );
    }

    // Delete the transfer
    await this.costTransferRepository.remove(transfer);

    this.logger.log(`Cost transfer deleted successfully: ${id}`);
  }

  // ==================== WORKFLOW METHODS ====================

  /**
   * Submit a cost transfer for approval
   *
   * Changes status from DRAFT to PENDING_APPROVAL.
   *
   * @param id - Cost transfer UUID
   * @param userId - ID of user performing submission
   * @returns Submitted cost transfer
   * @throws NotFoundException if transfer doesn't exist
   * @throws BadRequestException if transfer is not in DRAFT status
   */
  async submit(id: string, userId: string): Promise<CostTransferResponseDto> {
    this.logger.log(`Submitting cost transfer ${id} for approval`);

    // Load transfer
    const transfer = await this.costTransferRepository.findOne({
      where: { id },
    });

    if (!transfer) {
      throw new NotFoundException(`Cost transfer with ID ${id} not found`);
    }

    // Validate status
    if (transfer.status !== CostTransferStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot submit cost transfer with status ${transfer.status}. Only DRAFT transfers can be submitted.`,
      );
    }

    // Update status
    transfer.status = CostTransferStatus.PENDING_APPROVAL;
    await this.costTransferRepository.save(transfer);

    this.logger.log(`Cost transfer submitted successfully: ${id}`);

    // Load with relations and return
    return this.findOne(id);
  }

  /**
   * Approve a cost transfer
   *
   * Changes status from PENDING_APPROVAL to APPROVED and creates two CostEntry records:
   * - One negative entry (debit) for the FROM cost code
   * - One positive entry (credit) for the TO cost code
   *
   * This operation is wrapped in a transaction to ensure atomicity.
   *
   * @param id - Cost transfer UUID
   * @param userId - ID of user performing approval
   * @returns Approved cost transfer
   * @throws NotFoundException if transfer doesn't exist
   * @throws BadRequestException if transfer is not in PENDING_APPROVAL status or validation fails
   */
  async approve(id: string, userId: string): Promise<CostTransferResponseDto> {
    this.logger.log(`Approving cost transfer ${id}`);

    // Use transaction for atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Load transfer with relations
      const transfer = await queryRunner.manager.findOne(CostTransfer, {
        where: { id },
        relations: ['fromCostCode', 'toCostCode', 'budget'],
      });

      if (!transfer) {
        throw new NotFoundException(`Cost transfer with ID ${id} not found`);
      }

      // Validate status
      if (transfer.status !== CostTransferStatus.PENDING_APPROVAL) {
        throw new BadRequestException(
          `Cannot approve cost transfer with status ${transfer.status}. Only PENDING_APPROVAL transfers can be approved.`,
        );
      }

      // Validate sufficient funds in source cost code
      await this.validateAmount(
        transfer.amount,
        transfer.budget,
        transfer.fromCostCode,
      );

      // Create offsetting cost entries
      const { fromEntry, toEntry } = await this.createOffsetEntries(
        transfer,
        userId,
        queryRunner.manager,
      );

      // Update transfer status
      transfer.status = CostTransferStatus.APPROVED;
      transfer.approvedAt = new Date();
      transfer.approvedById = userId;
      transfer.fromEntryId = fromEntry.id;
      transfer.toEntryId = toEntry.id;

      await queryRunner.manager.save(CostTransfer, transfer);

      // Commit transaction
      await queryRunner.commitTransaction();

      this.logger.log(`Cost transfer approved successfully: ${id}`);

      // Load with relations and return
      return this.findOne(id);
    } catch (error) {
      // Rollback on error
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to approve cost transfer ${id}: ${(error as Error).message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Reject a cost transfer
   *
   * Changes status from PENDING_APPROVAL to REJECTED with rejection reason.
   *
   * @param id - Cost transfer UUID
   * @param dto - Rejection reason
   * @param userId - ID of user performing rejection
   * @returns Rejected cost transfer
   * @throws NotFoundException if transfer doesn't exist
   * @throws BadRequestException if transfer is not in PENDING_APPROVAL status
   */
  async reject(
    id: string,
    dto: RejectCostTransferDto,
    userId: string,
  ): Promise<CostTransferResponseDto> {
    this.logger.log(`Rejecting cost transfer ${id}: ${dto.rejectionReason}`);

    // Load transfer
    const transfer = await this.costTransferRepository.findOne({
      where: { id },
    });

    if (!transfer) {
      throw new NotFoundException(`Cost transfer with ID ${id} not found`);
    }

    // Validate status
    if (transfer.status !== CostTransferStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `Cannot reject cost transfer with status ${transfer.status}. Only PENDING_APPROVAL transfers can be rejected.`,
      );
    }

    // Update transfer status
    transfer.status = CostTransferStatus.REJECTED;
    transfer.rejectedAt = new Date();
    transfer.rejectedById = userId;
    transfer.rejectionReason = dto.rejectionReason;

    await this.costTransferRepository.save(transfer);

    this.logger.log(`Cost transfer rejected successfully: ${id}`);

    // Load with relations and return
    return this.findOne(id);
  }

  /**
   * Void a cost transfer
   *
   * Changes status from APPROVED to VOID and creates offsetting cost entries
   * to reverse the original transfer.
   *
   * This operation is wrapped in a transaction to ensure atomicity.
   *
   * @param id - Cost transfer UUID
   * @param dto - Void reason
   * @param userId - ID of user performing void
   * @returns Voided cost transfer
   * @throws NotFoundException if transfer doesn't exist
   * @throws BadRequestException if transfer is not in APPROVED status
   */
  async void(
    id: string,
    dto: VoidCostTransferDto,
    userId: string,
  ): Promise<CostTransferResponseDto> {
    this.logger.log(`Voiding cost transfer ${id}: ${dto.voidReason}`);

    // Use transaction for atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Load transfer with relations
      const transfer = await queryRunner.manager.findOne(CostTransfer, {
        where: { id },
        relations: ['fromCostCode', 'toCostCode', 'budget', 'fromEntry', 'toEntry'],
      });

      if (!transfer) {
        throw new NotFoundException(`Cost transfer with ID ${id} not found`);
      }

      // Validate status
      if (transfer.status !== CostTransferStatus.APPROVED) {
        throw new BadRequestException(
          `Cannot void cost transfer with status ${transfer.status}. Only APPROVED transfers can be voided.`,
        );
      }

      // Create reversing entries (opposite of original)
      // Original: FROM is negative, TO is positive
      // Void: FROM is positive, TO is negative
      const reversalFromEntry = queryRunner.manager.create(CostEntry, {
        projectId: transfer.projectId,
        budgetId: transfer.budgetId,
        costCodeId: transfer.fromCostCodeId,
        type: CostEntryType.OTHER_DIRECT,
        status: CostEntryStatus.DRAFT,
        entryDate: new Date(),
        description: `VOID: Cost transfer reversal (${transfer.transferNumber}) - ${dto.voidReason}`,
        totalCost: transfer.amount, // Positive to restore
        createdById: userId,
      });

      const reversalToEntry = queryRunner.manager.create(CostEntry, {
        projectId: transfer.projectId,
        budgetId: transfer.budgetId,
        costCodeId: transfer.toCostCodeId,
        type: CostEntryType.OTHER_DIRECT,
        status: CostEntryStatus.DRAFT,
        entryDate: new Date(),
        description: `VOID: Cost transfer reversal (${transfer.transferNumber}) - ${dto.voidReason}`,
        totalCost: -transfer.amount, // Negative to remove
        createdById: userId,
      });

      // Save reversal entries
      await queryRunner.manager.save(CostEntry, reversalFromEntry);
      await queryRunner.manager.save(CostEntry, reversalToEntry);

      // Post the reversal entries to update budget
      reversalFromEntry.status = CostEntryStatus.POSTED;
      reversalFromEntry.postedAt = new Date();
      reversalFromEntry.postedById = userId;

      reversalToEntry.status = CostEntryStatus.POSTED;
      reversalToEntry.postedAt = new Date();
      reversalToEntry.postedById = userId;

      await queryRunner.manager.save(CostEntry, reversalFromEntry);
      await queryRunner.manager.save(CostEntry, reversalToEntry);

      // Update budget line items
      await this.updateBudgetLineItem(
        transfer.budgetId,
        transfer.fromCostCodeId,
        transfer.amount,
        queryRunner.manager,
      );

      await this.updateBudgetLineItem(
        transfer.budgetId,
        transfer.toCostCodeId,
        -transfer.amount,
        queryRunner.manager,
      );

      // Update transfer status
      transfer.status = CostTransferStatus.VOID;
      transfer.voidedAt = new Date();
      transfer.voidedById = userId;
      transfer.voidReason = dto.voidReason;

      await queryRunner.manager.save(CostTransfer, transfer);

      // Commit transaction
      await queryRunner.commitTransaction();

      this.logger.log(`Cost transfer voided successfully: ${id}`);

      // Load with relations and return
      return this.findOne(id);
    } catch (error) {
      // Rollback on error
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to void cost transfer ${id}: ${(error as Error).message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Validate required relations
   *
   * Checks that all referenced entities exist:
   * - Project (required)
   * - Budget (required) - must belong to project
   * - From Cost Code (required)
   * - To Cost Code (required)
   *
   * @param dto - DTO containing relation IDs
   * @throws NotFoundException if required relation doesn't exist
   * @throws BadRequestException if budget doesn't belong to project
   * @private
   */
  private async validateRelations(
    dto: CreateCostTransferDto,
  ): Promise<void> {
    // Validate project
    const project = await this.projectRepository.findOne({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new NotFoundException(
        `Project with ID ${dto.projectId} not found`,
      );
    }

    // Validate budget and check it belongs to project
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

    // Validate from cost code
    const fromCostCode = await this.costCodeRepository.findOne({
      where: { id: dto.fromCostCodeId },
    });

    if (!fromCostCode) {
      throw new NotFoundException(
        `From cost code with ID ${dto.fromCostCodeId} not found`,
      );
    }

    // Validate to cost code
    const toCostCode = await this.costCodeRepository.findOne({
      where: { id: dto.toCostCodeId },
    });

    if (!toCostCode) {
      throw new NotFoundException(
        `To cost code with ID ${dto.toCostCodeId} not found`,
      );
    }
  }

  /**
   * Validate sufficient funds in source cost code
   *
   * Checks that the budget line item has sufficient available funds
   * (budgetedCost - actualCost) for the transfer.
   *
   * @param amount - Transfer amount
   * @param budget - Budget entity
   * @param costCode - Source cost code
   * @throws BadRequestException if insufficient funds
   * @private
   */
  private async validateAmount(
    amount: number,
    budget: Budget,
    costCode: CostCode,
  ): Promise<void> {
    const lineItem = await this.budgetLineItemRepository.findOne({
      where: {
        budgetId: budget.id,
        costCodeId: costCode.id,
      },
    });

    if (!lineItem) {
      throw new BadRequestException(
        `No budget line item found for cost code ${costCode.code}`,
      );
    }

    const availableFunds = Number(lineItem.budgetedCost) - Number(lineItem.actualCost);

    if (availableFunds < amount) {
      throw new BadRequestException(
        `Insufficient funds in cost code ${costCode.code}. Available: ${availableFunds}, Requested: ${amount}`,
      );
    }
  }

  /**
   * Create offsetting cost entries for transfer
   *
   * Creates two cost entries:
   * - One negative entry (debit) for the FROM cost code
   * - One positive entry (credit) for the TO cost code
   *
   * Both entries are created in POSTED status and update the budget.
   *
   * @param transfer - Cost transfer entity
   * @param userId - ID of user performing action
   * @param manager - Transaction manager
   * @returns Object containing both created entries
   * @private
   */
  private async createOffsetEntries(
    transfer: CostTransfer,
    userId: string,
    manager: EntityManager,
  ): Promise<{ fromEntry: CostEntry; toEntry: CostEntry }> {
    this.logger.log(
      `Creating offset entries for transfer ${transfer.id}: FROM ${transfer.fromCostCodeId} TO ${transfer.toCostCodeId}, amount ${transfer.amount}`,
    );

    // Create FROM entry (negative - debit)
    const fromEntry = manager.create(CostEntry, {
      projectId: transfer.projectId,
      budgetId: transfer.budgetId,
      costCodeId: transfer.fromCostCodeId,
      type: CostEntryType.OTHER_DIRECT,
      status: CostEntryStatus.DRAFT,
      entryDate: new Date(),
      description: `Cost transfer (${transfer.transferNumber}): ${transfer.reason}`,
      totalCost: -transfer.amount, // Negative to debit
      createdById: userId,
    });

    // Create TO entry (positive - credit)
    const toEntry = manager.create(CostEntry, {
      projectId: transfer.projectId,
      budgetId: transfer.budgetId,
      costCodeId: transfer.toCostCodeId,
      type: CostEntryType.OTHER_DIRECT,
      status: CostEntryStatus.DRAFT,
      entryDate: new Date(),
      description: `Cost transfer (${transfer.transferNumber}): ${transfer.reason}`,
      totalCost: transfer.amount, // Positive to credit
      createdById: userId,
    });

    // Save both entries
    await manager.save(CostEntry, fromEntry);
    await manager.save(CostEntry, toEntry);

    // Post both entries to update budget
    fromEntry.status = CostEntryStatus.POSTED;
    fromEntry.postedAt = new Date();
    fromEntry.postedById = userId;

    toEntry.status = CostEntryStatus.POSTED;
    toEntry.postedAt = new Date();
    toEntry.postedById = userId;

    await manager.save(CostEntry, fromEntry);
    await manager.save(CostEntry, toEntry);

    // Update budget line items
    await this.updateBudgetLineItem(
      transfer.budgetId,
      transfer.fromCostCodeId,
      -transfer.amount,
      manager,
    );

    await this.updateBudgetLineItem(
      transfer.budgetId,
      transfer.toCostCodeId,
      transfer.amount,
      manager,
    );

    this.logger.log(
      `Offset entries created: FROM entry ${fromEntry.id}, TO entry ${toEntry.id}`,
    );

    return { fromEntry, toEntry };
  }

  /**
   * Update budget line item actualCost
   *
   * Updates the actualCost of a budget line item by the specified amount.
   *
   * @param budgetId - Budget UUID
   * @param costCodeId - Cost code UUID
   * @param amount - Amount to add (can be negative)
   * @param manager - Transaction manager
   * @private
   */
  private async updateBudgetLineItem(
    budgetId: string,
    costCodeId: string,
    amount: number,
    manager: EntityManager,
  ): Promise<void> {
    const lineItem = await manager.findOne(BudgetLineItem, {
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
      const costCode = await manager.findOne(CostCode, {
        where: { id: costCodeId },
      });

      if (!costCode) {
        throw new NotFoundException(
          `Cost code with ID ${costCodeId} not found`,
        );
      }

      const newLineItem = manager.create(BudgetLineItem, {
        budgetId,
        costCodeId,
        category: (costCode.category || 'OTHER') as any,
        budgetedCost: 0,
        committedCost: 0,
        actualCost: amount,
      });

      await manager.save(BudgetLineItem, newLineItem);

      this.logger.log(
        `Created new budget line item with actualCost: ${newLineItem.actualCost}`,
      );

      return;
    }

    // Update actualCost
    const currentActual = Number(lineItem.actualCost) || 0;
    lineItem.actualCost = currentActual + Number(amount);

    await manager.save(BudgetLineItem, lineItem);

    this.logger.log(
      `Updated budget line item actualCost: ${currentActual} + ${amount} = ${lineItem.actualCost}`,
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
  private buildFilterQuery(filter: CostTransferFilterDto) {
    const query = this.costTransferRepository.createQueryBuilder('costTransfer');

    // Filter by project
    if (filter.projectId) {
      query.andWhere('costTransfer.project_id = :projectId', {
        projectId: filter.projectId,
      });
    }

    // Filter by budget
    if (filter.budgetId) {
      query.andWhere('costTransfer.budget_id = :budgetId', {
        budgetId: filter.budgetId,
      });
    }

    // Filter by from cost code
    if (filter.fromCostCodeId) {
      query.andWhere('costTransfer.from_cost_code_id = :fromCostCodeId', {
        fromCostCodeId: filter.fromCostCodeId,
      });
    }

    // Filter by to cost code
    if (filter.toCostCodeId) {
      query.andWhere('costTransfer.to_cost_code_id = :toCostCodeId', {
        toCostCodeId: filter.toCostCodeId,
      });
    }

    // Filter by status
    if (filter.status) {
      query.andWhere('costTransfer.status = :status', { status: filter.status });
    }

    // Filter by date range
    if (filter.fromDate) {
      query.andWhere('costTransfer.requested_at >= :fromDate', {
        fromDate: filter.fromDate,
      });
    }

    if (filter.toDate) {
      query.andWhere('costTransfer.requested_at <= :toDate', {
        toDate: filter.toDate,
      });
    }

    return query;
  }

  /**
   * Convert entity to response DTO
   *
   * Maps the cost transfer entity and its relations to a response DTO
   * for API consumption.
   *
   * @param transfer - Cost transfer entity
   * @returns Response DTO
   */
  toResponseDto(transfer: CostTransfer): CostTransferResponseDto {
    return {
      id: transfer.id,
      transferNumber: transfer.transferNumber,
      projectId: transfer.projectId,
      budgetId: transfer.budgetId,
      fromCostCodeId: transfer.fromCostCodeId,
      toCostCodeId: transfer.toCostCodeId,
      amount: transfer.amount,
      reason: transfer.reason,
      status: transfer.status,
      requestedById: transfer.requestedById,
      requestedAt: transfer.requestedAt,
      approvedById: transfer.approvedById,
      approvedAt: transfer.approvedAt,
      rejectedById: transfer.rejectedById,
      rejectedAt: transfer.rejectedAt,
      rejectionReason: transfer.rejectionReason,
      voidedById: transfer.voidedById,
      voidedAt: transfer.voidedAt,
      voidReason: transfer.voidReason,
      fromEntryId: transfer.fromEntryId,
      toEntryId: transfer.toEntryId,
      createdAt: transfer.createdAt,
      updatedAt: transfer.updatedAt,
      // Nested relations
      project: transfer.project
        ? { name: transfer.project.name }
        : undefined,
      budget: transfer.budget
        ? { name: transfer.budget.name }
        : undefined,
      fromCostCode: transfer.fromCostCode
        ? { code: transfer.fromCostCode.code, name: transfer.fromCostCode.name }
        : undefined,
      toCostCode: transfer.toCostCode
        ? { code: transfer.toCostCode.code, name: transfer.toCostCode.name }
        : undefined,
      requestedBy: transfer.requestedBy
        ? {
            firstName: transfer.requestedBy.firstName,
            lastName: transfer.requestedBy.lastName,
          }
        : undefined,
      approvedBy: transfer.approvedBy
        ? {
            firstName: transfer.approvedBy.firstName,
            lastName: transfer.approvedBy.lastName,
          }
        : undefined,
      rejectedBy: transfer.rejectedBy
        ? {
            firstName: transfer.rejectedBy.firstName,
            lastName: transfer.rejectedBy.lastName,
          }
        : undefined,
      voidedBy: transfer.voidedBy
        ? {
            firstName: transfer.voidedBy.firstName,
            lastName: transfer.voidedBy.lastName,
          }
        : undefined,
      fromEntry: transfer.fromEntry
        ? { id: transfer.fromEntry.id, entryNumber: transfer.fromEntry.entryNumber }
        : undefined,
      toEntry: transfer.toEntry
        ? { id: transfer.toEntry.id, entryNumber: transfer.toEntry.entryNumber }
        : undefined,
    } as unknown as CostTransferResponseDto;
  }
}
