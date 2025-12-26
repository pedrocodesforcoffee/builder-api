import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Budget } from '../entities/budget.entity';
import { BudgetLineItem } from '../entities/budget-line-item.entity';
import { BudgetSnapshot } from '../entities/budget-snapshot.entity';
import { BudgetAuditLog } from '../entities/budget-audit-log.entity';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { BudgetStatus } from '../enums/budget-status.enum';
import { BudgetAuditService } from './budget-audit.service';
import { BudgetCalculationService } from './budget-calculation.service';
import { BudgetExportService } from './budget-export.service';
import {
  CreateBudgetDto,
  UpdateBudgetDto,
  BudgetResponseDto,
  BudgetQueryDto,
  CloneBudgetDto,
  CreateSnapshotDto,
  SnapshotResponseDto,
  LockBudgetDto,
  UnlockBudgetDto,
  ActivateBudgetDto,
  BudgetSummaryDto,
  BudgetComparisonDto,
  VarianceAnalysisDto,
  ContingencyStatusDto,
  BudgetExportDto,
} from '../dto';
import { BudgetSnapshotComparisonDto } from '../dto/budget-snapshot-comparison.dto';

/**
 * Budget Service
 *
 * Handles business logic for budget management including:
 * - CRUD operations for budgets
 * - Status workflow management (draft → active → locked → archived)
 * - Total budget calculation from line items
 * - Project and user validation
 * - Multiple budgets per project support
 *
 * @service BudgetService
 */
@Injectable()
export class BudgetService {
  private readonly logger = new Logger(BudgetService.name);

  constructor(
    @InjectRepository(Budget)
    private readonly budgetRepo: Repository<Budget>,
    @InjectRepository(BudgetLineItem)
    private readonly lineItemRepo: Repository<BudgetLineItem>,
    @InjectRepository(BudgetSnapshot)
    private readonly snapshotRepo: Repository<BudgetSnapshot>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly budgetAuditService: BudgetAuditService,
    private readonly calculationService: BudgetCalculationService,
    private readonly exportService: BudgetExportService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new budget
   *
   * Validates project and user exist.
   * Initializes budget with totalBudget of 0 (line items added separately).
   *
   * @param createDto - Budget creation data
   * @param userId - ID of user creating the budget
   * @returns Created budget
   * @throws NotFoundException if project or user doesn't exist
   */
  async create(
    createDto: CreateBudgetDto,
    userId: string,
  ): Promise<BudgetResponseDto> {
    this.logger.log(
      `Creating budget "${createDto.name}" for project ${createDto.projectId}`,
    );

    // Validate project exists
    const project = await this.projectRepo.findOne({
      where: { id: createDto.projectId },
    });

    if (!project) {
      throw new NotFoundException(
        `Project with ID ${createDto.projectId} not found`,
      );
    }

    // Validate user exists
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Create budget
    const budget = this.budgetRepo.create({
      ...createDto,
      createdById: userId,
      totalBudget: 0, // Will be calculated when line items are added
    });

    const savedBudget = await this.budgetRepo.save(budget);

    // Log budget creation to audit trail
    await this.budgetAuditService.logBudgetChange({
      budgetId: savedBudget.id,
      userId,
      action: 'CREATE',
      after: {
        id: savedBudget.id,
        projectId: savedBudget.projectId,
        name: savedBudget.name,
        description: savedBudget.description,
        status: savedBudget.status,
        totalBudget: savedBudget.totalBudget,
      },
      metadata: {
        method: 'create',
      },
    });

    this.logger.log(`Budget created successfully: ${savedBudget.id}`);

    return this.toResponseDto(savedBudget);
  }

  /**
   * List all budgets
   *
   * Optionally filter by:
   * - Project
   * - Status
   *
   * @param projectId - Filter to specific project (optional)
   * @param status - Filter to specific status (optional)
   * @returns Array of budgets
   */
  async findAll(
    projectId?: string,
    status?: BudgetStatus,
  ): Promise<BudgetResponseDto[]> {
    this.logger.log(
      `Fetching budgets - projectId: ${projectId}, status: ${status}`,
    );

    const queryBuilder = this.budgetRepo
      .createQueryBuilder('budget')
      .leftJoinAndSelect('budget.lineItems', 'lineItems');

    // Filter by project
    if (projectId) {
      queryBuilder.andWhere('budget.project_id = :projectId', { projectId });
    }

    // Filter by status
    if (status) {
      queryBuilder.andWhere('budget.status = :status', { status });
    }

    // Order by most recently created
    queryBuilder.orderBy('budget.created_at', 'DESC');

    const budgets = await queryBuilder.getMany();

    this.logger.log(`Found ${budgets.length} budgets`);

    return budgets.map((budget) => this.toResponseDto(budget));
  }

  /**
   * Get budget by ID
   *
   * Includes line items in response.
   *
   * @param id - Budget ID
   * @param projectId - Project ID for validation
   * @param includeLineItems - Whether to include line items (default: true)
   * @returns Budget details
   * @throws NotFoundException if budget doesn't exist
   */
  async findOne(
    id: string,
    projectId?: string,
    includeLineItems = true,
  ): Promise<BudgetResponseDto> {
    this.logger.log(`Fetching budget by ID: ${id}`);

    const queryBuilder = this.budgetRepo
      .createQueryBuilder('budget')
      .where('budget.id = :id', { id });

    // Filter by project if specified
    if (projectId) {
      queryBuilder.andWhere('budget.project_id = :projectId', { projectId });
    }

    if (includeLineItems) {
      queryBuilder.leftJoinAndSelect('budget.lineItems', 'lineItems');
    }

    const budget = await queryBuilder.getOne();

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${id} not found`);
    }

    return this.toResponseDto(budget);
  }

  /**
   * Update budget
   *
   * Can update name, description, and status.
   * Cannot update totalBudget directly (calculated from line items).
   *
   * @param id - Budget ID
   * @param updateDto - Update data
   * @param userId - User ID performing the update
   * @param projectId - Project ID for validation
   * @returns Updated budget
   * @throws NotFoundException if budget doesn't exist
   * @throws BadRequestException if invalid status transition
   */
  async update(
    id: string,
    updateDto: UpdateBudgetDto,
    userId: string,
    projectId?: string,
  ): Promise<BudgetResponseDto> {
    this.logger.log(`Updating budget ${id}`);

    const queryBuilder = this.budgetRepo.createQueryBuilder('budget')
      .where('budget.id = :id', { id });

    if (projectId) {
      queryBuilder.andWhere('budget.project_id = :projectId', { projectId });
    }

    const budget = await queryBuilder.getOne();

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${id} not found`);
    }

    // Check for version conflict (optimistic locking)
    // If version is provided in the DTO, verify it matches the current version
    const dtoWithVersion = updateDto as any;
    if (dtoWithVersion.version !== undefined && dtoWithVersion.version !== budget.version) {
      throw new ConflictException(
        `Version conflict: Budget has been modified by another user. ` +
        `Expected version ${dtoWithVersion.version}, but current version is ${budget.version}. ` +
        `Please refresh and try again.`,
      );
    }

    // Capture before state for audit log
    const beforeState = {
      id: budget.id,
      projectId: budget.projectId,
      name: budget.name,
      description: budget.description,
      status: budget.status,
      totalBudget: budget.totalBudget,
      version: budget.version,
    };

    // Validate status transition if status is being updated
    if (updateDto.status && updateDto.status !== budget.status) {
      this.validateStatusTransition(budget.status, updateDto.status);
    }

    // Apply updates (excluding version from DTO as it's auto-incremented by TypeORM)
    const { version: _version, ...updates } = updateDto as any;
    Object.assign(budget, updates);

    // TypeORM will automatically increment the version during save
    const updatedBudget = await this.budgetRepo.save(budget);

    // Capture after state for audit log
    const afterState = {
      id: updatedBudget.id,
      projectId: updatedBudget.projectId,
      name: updatedBudget.name,
      description: updatedBudget.description,
      status: updatedBudget.status,
      totalBudget: updatedBudget.totalBudget,
    };

    // Log budget update to audit trail
    await this.budgetAuditService.logBudgetChange({
      budgetId: updatedBudget.id,
      userId,
      action: 'UPDATE',
      before: beforeState,
      after: afterState,
      metadata: {
        method: 'update',
        fieldsUpdated: Object.keys(updateDto),
      },
    });

    this.logger.log(`Budget ${id} updated successfully`);

    return this.toResponseDto(updatedBudget);
  }

  /**
   * Update budget status
   *
   * Convenience method for status transitions.
   *
   * @param id - Budget ID
   * @param status - New status
   * @returns Updated budget
   * @throws BadRequestException if invalid status transition
   */
  async updateStatus(
    id: string,
    status: BudgetStatus,
  ): Promise<BudgetResponseDto> {
    this.logger.log(`Updating budget ${id} status to ${status}`);
    return this.update(id, { status }, 'system'); // Using system as default user
  }

  /**
   * Recalculate budget total from line items
   *
   * Sums all line items and updates the budget's totalBudget field.
   * Should be called whenever line items are added/updated/removed.
   *
   * @param id - Budget ID
   * @returns Updated budget
   * @throws NotFoundException if budget doesn't exist
   */
  async recalculateTotal(id: string): Promise<BudgetResponseDto> {
    this.logger.log(`Recalculating total for budget ${id}`);

    const budget = await this.budgetRepo.findOne({
      where: { id },
      relations: ['lineItems'],
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${id} not found`);
    }

    // Calculate total from line items
    const total = budget.lineItems?.reduce((sum, item) => {
      return sum + (item.budgetedCost || 0);
    }, 0) || 0;

    budget.totalBudget = total;
    const updatedBudget = await this.budgetRepo.save(budget);

    this.logger.log(
      `Budget ${id} total recalculated: ${updatedBudget.totalBudget}`,
    );

    return this.toResponseDto(updatedBudget);
  }

  /**
   * Lock budget for editing
   *
   * Locks a budget to prevent concurrent modifications.
   * Only the user who locked the budget can modify it while locked.
   *
   * @param id - Budget ID
   * @param lockDto - Lock parameters (reason, etc.)
   * @param userId - ID of user requesting the lock
   * @param projectId - Project ID for validation
   * @returns Updated budget
   * @throws NotFoundException if budget doesn't exist
   * @throws ConflictException if budget is already locked by another user
   */
  async lock(id: string, lockDto: LockBudgetDto, userId: string, projectId?: string): Promise<BudgetResponseDto> {
    this.logger.log(`Locking budget ${id} for user ${userId}`);

    const budget = await this.budgetRepo.findOne({
      where: { id },
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${id} not found`);
    }

    // Check if already locked by another user
    if (budget.lockedById && budget.lockedById !== userId) {
      throw new ConflictException(
        `Budget is already locked by user ${budget.lockedById}`,
      );
    }

    // If already locked by this user, ensure status is LOCKED and return
    if (budget.lockedById === userId) {
      this.logger.log(`Budget ${id} already locked by user ${userId}`);
      // Ensure status is set correctly even if already locked
      if (budget.status !== BudgetStatus.LOCKED) {
        budget.status = BudgetStatus.LOCKED;
        await this.budgetRepo.save(budget);
        this.logger.log(`Updated status to LOCKED for already-locked budget ${id}`);
      }
      return this.toResponseDto(budget);
    }

    // Lock the budget
    budget.lockedById = userId;
    budget.lockedAt = new Date();
    budget.status = BudgetStatus.LOCKED;
    this.logger.log(`Setting budget ${id} status to LOCKED`);

    const updatedBudget = await this.budgetRepo.save(budget);

    // Log budget lock to audit trail
    await this.budgetAuditService.logBudgetChange({
      budgetId: updatedBudget.id,
      userId,
      action: 'LOCK',
      after: {
        lockedById: updatedBudget.lockedById,
        lockedAt: updatedBudget.lockedAt,
      },
      metadata: {
        method: 'lockBudget',
      },
    });

    this.logger.log(`Budget ${id} locked successfully by user ${userId}`);

    return this.toResponseDto(updatedBudget);
  }

  /**
   * Unlock budget
   *
   * Removes the lock from a budget, allowing other users to modify it.
   * Only the user who locked the budget (or an admin) can unlock it.
   *
   * @param id - Budget ID
   * @param unlockDto - Unlock parameters
   * @param userId - ID of user requesting the unlock
   * @param projectId - Project ID for validation
   * @returns Updated budget
   * @throws NotFoundException if budget doesn't exist
   * @throws BadRequestException if budget is not locked or locked by another user
   */
  async unlock(
    id: string,
    unlockDto: UnlockBudgetDto,
    userId: string,
    projectId?: string,
  ): Promise<BudgetResponseDto> {
    this.logger.log(`Unlocking budget ${id} by user ${userId}`);

    const budget = await this.budgetRepo.findOne({
      where: { id },
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${id} not found`);
    }

    // Check if budget is locked
    if (!budget.lockedById) {
      throw new BadRequestException(`Budget ${id} is not locked`);
    }

    // Check if user has permission to unlock (must be the one who locked it)
    // Note: In production, this should also check for admin role
    if (budget.lockedById !== userId) {
      throw new BadRequestException(
        `Budget is locked by user ${budget.lockedById}. Only that user can unlock it.`,
      );
    }

    // Capture before state for audit
    const beforeState = {
      lockedById: budget.lockedById,
      lockedAt: budget.lockedAt,
      status: budget.status,
    };

    // Unlock the budget
    budget.lockedById = undefined;
    budget.lockedAt = undefined;
    // Restore to ACTIVE status (budgets should typically be ACTIVE when unlocked)
    budget.status = BudgetStatus.ACTIVE;

    const updatedBudget = await this.budgetRepo.save(budget);

    // Log budget unlock to audit trail
    await this.budgetAuditService.logBudgetChange({
      budgetId: updatedBudget.id,
      userId,
      action: 'UNLOCK',
      before: beforeState,
      metadata: {
        method: 'unlockBudget',
      },
    });

    this.logger.log(`Budget ${id} unlocked successfully by user ${userId}`);

    return this.toResponseDto(updatedBudget);
  }

  /**
   * Activate budget
   *
   * Activates a budget and ensures only one budget is active per project.
   * Automatically deactivates any other active budgets for the same project.
   *
   * @param id - Budget ID
   * @param activateDto - Activation parameters
   * @param userId - ID of user activating the budget
   * @param projectId - Optional project ID for validation
   * @returns Activated budget
   * @throws NotFoundException if budget doesn't exist
   * @throws BadRequestException if invalid status transition
   */
  async activate(
    id: string,
    activateDto: ActivateBudgetDto,
    userId: string,
    projectId?: string,
  ): Promise<BudgetResponseDto> {
    this.logger.log(`Activating budget ${id}`);

    const queryBuilder = this.budgetRepo
      .createQueryBuilder('budget')
      .where('budget.id = :id', { id });

    if (projectId) {
      queryBuilder.andWhere('budget.project_id = :projectId', { projectId });
    }

    const budget = await queryBuilder.getOne();

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${id} not found`);
    }

    // Check if already active
    if (budget.status === BudgetStatus.ACTIVE) {
      this.logger.log(`Budget ${id} is already active`);
      return this.toResponseDto(budget);
    }

    // Validate transition to ACTIVE status
    this.validateStatusTransition(budget.status, BudgetStatus.ACTIVE);

    // Find any other active budgets for this project
    const activeBudgets = await this.budgetRepo.find({
      where: {
        projectId: budget.projectId,
        status: BudgetStatus.ACTIVE,
      },
    });

    // Deactivate other active budgets (archive them)
    if (activeBudgets.length > 0) {
      this.logger.log(
        `Deactivating ${activeBudgets.length} active budget(s) for project ${budget.projectId}`,
      );

      for (const activeBudget of activeBudgets) {
        activeBudget.status = BudgetStatus.ARCHIVED;
        await this.budgetRepo.save(activeBudget);

        // Log deactivation to audit trail
        await this.budgetAuditService.logBudgetChange({
          budgetId: activeBudget.id,
          userId,
          action: 'UPDATE',
          before: { status: BudgetStatus.ACTIVE },
          after: { status: BudgetStatus.ARCHIVED },
          metadata: {
            method: 'activate',
            reason: 'Automatically archived due to new budget activation',
            newActiveBudgetId: id,
          },
        });
      }
    }

    // Activate the budget
    const beforeStatus = budget.status;
    budget.status = BudgetStatus.ACTIVE;

    const updatedBudget = await this.budgetRepo.save(budget);

    // Log activation to audit trail
    await this.budgetAuditService.logBudgetChange({
      budgetId: updatedBudget.id,
      userId,
      action: 'ACTIVATE',
      before: { status: beforeStatus },
      after: { status: BudgetStatus.ACTIVE },
      metadata: {
        method: 'activate',
        deactivatedBudgets: activeBudgets.map((b) => b.id),
      },
    });

    this.logger.log(`Budget ${id} activated successfully`);

    return this.toResponseDto(updatedBudget);
  }

  /**
   * Create budget revision
   *
   * Creates a new budget based on an existing one, copying all line items.
   * Uses a transaction to ensure atomicity.
   * Original budget is typically archived, new revision becomes active.
   *
   * @param id - Original budget ID
   * @param userId - ID of user creating the revision
   * @param name - Name for the new revision
   * @param description - Optional description for the revision
   * @returns Newly created budget revision
   * @throws NotFoundException if original budget doesn't exist
   */
  async createRevision(
    id: string,
    userId: string,
    name: string,
    description?: string,
  ): Promise<BudgetResponseDto> {
    this.logger.log(`Creating revision of budget ${id}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find original budget with line items
      const originalBudget = await queryRunner.manager.findOne(Budget, {
        where: { id },
        relations: ['lineItems'],
      });

      if (!originalBudget) {
        throw new NotFoundException(`Budget with ID ${id} not found`);
      }

      // Create new budget
      const newBudget = queryRunner.manager.create(Budget, {
        projectId: originalBudget.projectId,
        name,
        description: description || `Revision of ${originalBudget.name}`,
        status: BudgetStatus.DRAFT,
        totalBudget: originalBudget.totalBudget,
        createdById: userId,
      });

      const savedBudget = await queryRunner.manager.save(Budget, newBudget);

      // Copy line items
      if (originalBudget.lineItems && originalBudget.lineItems.length > 0) {
        const newLineItems = originalBudget.lineItems.map((lineItem) =>
          queryRunner.manager.create(BudgetLineItem, {
            budgetId: savedBudget.id,
            costCodeId: lineItem.costCodeId,
            category: lineItem.category,
            description: lineItem.description,
            quantity: lineItem.quantity,
            unitCost: lineItem.unitCost,
            budgetedCost: lineItem.budgetedCost,
          }),
        );

        await queryRunner.manager.save(BudgetLineItem, newLineItems);

        this.logger.log(
          `Copied ${newLineItems.length} line items to new revision`,
        );
      }

      // Log revision creation to audit trail
      await this.budgetAuditService.logBudgetChange({
        budgetId: savedBudget.id,
        userId,
        action: 'CREATE',
        after: {
          id: savedBudget.id,
          projectId: savedBudget.projectId,
          name: savedBudget.name,
          description: savedBudget.description,
          status: savedBudget.status,
          totalBudget: savedBudget.totalBudget,
        },
        metadata: {
          method: 'createRevision',
          originalBudgetId: id,
          copiedLineItemCount: originalBudget.lineItems?.length || 0,
        },
      });

      await queryRunner.commitTransaction();

      this.logger.log(
        `Budget revision created successfully: ${savedBudget.id}`,
      );

      return this.toResponseDto(savedBudget);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create budget revision: ${(error as Error).message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get budget snapshot at a specific point in time
   *
   * Reconstructs the budget state at a specific date by replaying audit logs.
   * Useful for historical reporting and compliance audits.
   *
   * @param id - Budget ID
   * @param date - Date to reconstruct the budget state at
   * @returns Budget state at the specified date
   * @throws NotFoundException if budget doesn't exist
   */
  async getSnapshotAtDate(id: string, date: Date): Promise<any> {
    this.logger.log(`Getting snapshot of budget ${id} at ${date.toISOString()}`);

    // Verify budget exists
    const budget = await this.budgetRepo.findOne({
      where: { id },
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${id} not found`);
    }

    // Use the budget audit service to reconstruct the snapshot
    const snapshot = await this.budgetAuditService.reconstructBudgetSnapshot(
      id,
      date,
    );

    this.logger.log(
      `Successfully reconstructed budget ${id} snapshot at ${date.toISOString()}`,
    );

    return snapshot;
  }

  /**
   * Delete budget
   *
   * Permanently removes the budget and all associated line items.
   * Cannot delete a budget that is ACTIVE or LOCKED.
   *
   * @param id - Budget ID
   * @param projectId - Project ID for validation
   * @throws NotFoundException if budget doesn't exist
   * @throws BadRequestException if budget cannot be deleted
   */
  async remove(id: string, projectId?: string): Promise<void> {
    this.logger.log(`Removing budget ${id}`);

    const queryBuilder = this.budgetRepo.createQueryBuilder('budget')
      .where('budget.id = :id', { id })
      .leftJoinAndSelect('budget.lineItems', 'lineItems');

    if (projectId) {
      queryBuilder.andWhere('budget.project_id = :projectId', { projectId });
    }

    const budget = await queryBuilder.getOne();

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${id} not found`);
    }

    // Cannot delete active or locked budgets
    if (budget.status === BudgetStatus.ACTIVE) {
      throw new BadRequestException(
        'Cannot delete an active budget. Archive it first.',
      );
    }

    if (budget.status === BudgetStatus.LOCKED) {
      throw new BadRequestException(
        'Cannot delete a locked budget. Change status first.',
      );
    }

    // Capture budget state before deletion for audit log
    const beforeState = {
      id: budget.id,
      projectId: budget.projectId,
      name: budget.name,
      description: budget.description,
      status: budget.status,
      totalBudget: budget.totalBudget,
      lineItemCount: budget.lineItems?.length || 0,
    };

    // Delete associated line items first
    if (budget.lineItems && budget.lineItems.length > 0) {
      await this.lineItemRepo.remove(budget.lineItems);
      this.logger.log(`Deleted ${budget.lineItems.length} line items`);
    }

    await this.budgetRepo.remove(budget);

    // Log budget deletion to audit trail
    await this.budgetAuditService.logBudgetChange({
      budgetId: id,
      userId: budget.createdById,
      action: 'DELETE',
      before: beforeState,
      metadata: {
        method: 'remove',
        deletedLineItemCount: beforeState.lineItemCount,
      },
    });

    this.logger.log(`Budget ${id} deleted successfully`);
  }

  /**
   * Find all budgets by project with query parameters
   */
  async findAllByProject(projectId: string, query: BudgetQueryDto): Promise<BudgetResponseDto[]> {
    this.logger.log(`Fetching budgets for project ${projectId}`);

    const queryBuilder = this.budgetRepo
      .createQueryBuilder('budget')
      .where('budget.project_id = :projectId', { projectId });

    if (query.status) {
      queryBuilder.andWhere('budget.status = :status', { status: query.status });
    }

    if (query.search) {
      queryBuilder.andWhere(
        '(budget.name ILIKE :search OR budget.description ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'DESC';
    queryBuilder.orderBy(`budget.${sortBy}`, sortOrder);

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const budgets = await queryBuilder.getMany();
    return budgets.map((budget) => this.toResponseDto(budget));
  }

  /**
   * Clone a budget
   */
  async clone(id: string, cloneDto: CloneBudgetDto, userId: string, projectId: string): Promise<BudgetResponseDto> {
    this.logger.log(`Cloning budget ${id}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const originalBudget = await queryRunner.manager.findOne(Budget, {
        where: { id, projectId },
        relations: ['lineItems'],
      });

      if (!originalBudget) {
        throw new NotFoundException(`Budget with ID ${id} not found`);
      }

      const newBudget = queryRunner.manager.create(Budget, {
        projectId: originalBudget.projectId,
        name: cloneDto.name,
        description: cloneDto.description || `Clone of ${originalBudget.name}`,
        status: BudgetStatus.DRAFT,
        totalBudget: cloneDto.includeLineItems ? originalBudget.totalBudget : 0,
        createdById: userId,
      });

      const savedBudget = await queryRunner.manager.save(Budget, newBudget);

      if (cloneDto.includeLineItems && originalBudget.lineItems && originalBudget.lineItems.length > 0) {
        const newLineItems = originalBudget.lineItems.map((lineItem) =>
          queryRunner.manager.create(BudgetLineItem, {
            budgetId: savedBudget.id,
            costCodeId: lineItem.costCodeId,
            category: lineItem.category,
            description: lineItem.description,
            quantity: lineItem.quantity,
            unitCost: lineItem.unitCost,
            budgetedCost: lineItem.budgetedCost,
          }),
        );

        await queryRunner.manager.save(BudgetLineItem, newLineItems);
        this.logger.log(`Copied ${newLineItems.length} line items to cloned budget`);
      }

      // Create audit log within the same transaction
      const auditLog = queryRunner.manager.create(BudgetAuditLog, {
        budgetId: savedBudget.id,
        userId,
        action: 'CREATE',
        entityType: 'budget',
        after: {
          id: savedBudget.id,
          name: savedBudget.name,
          clonedFrom: id,
        },
        metadata: {
          method: 'clone',
          originalBudgetId: id,
        },
      });
      await queryRunner.manager.save(BudgetAuditLog, auditLog);

      await queryRunner.commitTransaction();
      return this.toResponseDto(savedBudget);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Archive a budget
   */
  async archive(id: string, userId: string, projectId: string): Promise<BudgetResponseDto> {
    this.logger.log(`Archiving budget ${id}`);

    const budget = await this.budgetRepo.findOne({
      where: { id, projectId },
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${id} not found`);
    }

    const beforeStatus = budget.status;
    budget.status = BudgetStatus.ARCHIVED;

    const updatedBudget = await this.budgetRepo.save(budget);

    await this.budgetAuditService.logBudgetChange({
      budgetId: updatedBudget.id,
      userId,
      action: 'ARCHIVE',
      before: { status: beforeStatus },
      after: { status: BudgetStatus.ARCHIVED },
      metadata: {
        method: 'archive',
      },
    });

    return this.toResponseDto(updatedBudget);
  }

  /**
   * Create a budget snapshot
   */
  async createSnapshot(budgetId: string, dto: CreateSnapshotDto, userId: string, projectId: string): Promise<SnapshotResponseDto> {
    this.logger.log(`Creating snapshot for budget ${budgetId}`);

    const budget = await this.budgetRepo.findOne({
      where: { id: budgetId, projectId },
      relations: ['lineItems', 'lineItems.costCode'],
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${budgetId} not found`);
    }

    const snapshot = this.snapshotRepo.create({
      budgetId: budget.id,
      name: dto.name,
      description: dto.description,
      snapshotData: {
        budget: {
          id: budget.id,
          name: budget.name,
          description: budget.description,
          status: budget.status,
          totalBudget: budget.totalBudget,
        },
        lineItems: budget.lineItems?.map((item) => ({
          id: item.id,
          costCodeId: item.costCodeId,
          costCode: item.costCode?.code,
          costCodeName: item.costCode?.name,
          category: item.category,
          description: item.description,
          quantity: item.quantity,
          unitCost: item.unitCost,
          budgetedCost: item.budgetedCost,
        })),
      },
      originalAmount: budget.totalBudget,
      revisedAmount: budget.totalBudget,
      committedCost: 0,
      actualCost: 0,
      createdById: userId,
    });

    const savedSnapshot = await this.snapshotRepo.save(snapshot);

    return {
      id: savedSnapshot.id,
      budgetId: savedSnapshot.budgetId,
      name: savedSnapshot.name,
      description: savedSnapshot.description,
      originalAmount: savedSnapshot.originalAmount,
      revisedAmount: savedSnapshot.revisedAmount,
      committedCost: savedSnapshot.committedCost,
      actualCost: savedSnapshot.actualCost,
      createdAt: savedSnapshot.createdAt,
      createdById: savedSnapshot.createdById,
    };
  }

  /**
   * Get all snapshots for a budget
   */
  async getSnapshots(budgetId: string, projectId: string): Promise<SnapshotResponseDto[]> {
    this.logger.log(`Getting snapshots for budget ${budgetId}`);

    const budget = await this.budgetRepo.findOne({
      where: { id: budgetId, projectId },
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${budgetId} not found`);
    }

    const snapshots = await this.snapshotRepo.find({
      where: { budgetId },
      order: { createdAt: 'DESC' },
    });

    return snapshots.map((snapshot) => ({
      id: snapshot.id,
      budgetId: snapshot.budgetId,
      name: snapshot.name,
      description: snapshot.description,
      originalAmount: snapshot.originalAmount,
      revisedAmount: snapshot.revisedAmount,
      committedCost: snapshot.committedCost,
      actualCost: snapshot.actualCost,
      createdAt: snapshot.createdAt,
      createdById: snapshot.createdById,
    }));
  }

  /**
   * Get a specific snapshot
   */
  async getSnapshot(budgetId: string, snapshotId: string, projectId: string): Promise<SnapshotResponseDto> {
    this.logger.log(`Getting snapshot ${snapshotId} for budget ${budgetId}`);

    const budget = await this.budgetRepo.findOne({
      where: { id: budgetId, projectId },
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${budgetId} not found`);
    }

    const snapshot = await this.snapshotRepo.findOne({
      where: { id: snapshotId, budgetId },
    });

    if (!snapshot) {
      throw new NotFoundException(`Snapshot with ID ${snapshotId} not found`);
    }

    return {
      id: snapshot.id,
      budgetId: snapshot.budgetId,
      name: snapshot.name,
      description: snapshot.description,
      originalAmount: snapshot.originalAmount,
      revisedAmount: snapshot.revisedAmount,
      committedCost: snapshot.committedCost,
      actualCost: snapshot.actualCost,
      createdAt: snapshot.createdAt,
      createdById: snapshot.createdById,
    };
  }

  /**
   * Get budget summary
   */
  async getSummary(budgetId: string, projectId: string): Promise<BudgetSummaryDto> {
    this.logger.log(`Getting summary for budget ${budgetId}`);

    const budget = await this.budgetRepo.findOne({
      where: { id: budgetId, projectId },
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${budgetId} not found`);
    }

    const summary = await this.calculationService.getBudgetSummary(budgetId);

    return {
      budgetId: summary.budgetId,
      totalBudget: summary.totalBudget,
      lineItemCount: summary.lineItemCount,
      categoryBreakdown: summary.categoryBreakdown,
      topCostCodes: summary.topCostCodes,
    };
  }

  /**
   * Compare two budgets
   */
  async compare(budget1Id: string, budget2Id: string, projectId: string): Promise<BudgetComparisonDto> {
    this.logger.log(`Comparing budgets ${budget1Id} and ${budget2Id}`);

    const budget1 = await this.budgetRepo.findOne({
      where: { id: budget1Id, projectId },
    });

    const budget2 = await this.budgetRepo.findOne({
      where: { id: budget2Id, projectId },
    });

    if (!budget1 || !budget2) {
      throw new NotFoundException('One or both budgets not found');
    }

    const comparison = await this.calculationService.compareBudgets(budget1Id, budget2Id);

    return {
      budget1Id: budget1Id,
      budget2Id: budget2Id,
      budget1Total: comparison.budget1Total,
      budget2Total: comparison.budget2Total,
      difference: comparison.difference,
      percentageChange: comparison.percentageChange,
      categoryComparison: comparison.categoryComparison,
    };
  }

  /**
   * Compare snapshot to current budget
   *
   * Compares a historical budget snapshot to the current budget state,
   * providing detailed line-item level variance analysis.
   *
   * @param budgetId - Current budget ID
   * @param snapshotId - Snapshot ID to compare against
   * @param projectId - Project ID for validation
   * @returns Comprehensive comparison with line item changes
   */
  async compareToSnapshot(
    budgetId: string,
    snapshotId: string,
    projectId: string,
  ): Promise<BudgetSnapshotComparisonDto> {
    this.logger.log(`Comparing budget ${budgetId} to snapshot ${snapshotId}`);

    // Validate budget exists and belongs to project
    const budget = await this.budgetRepo.findOne({
      where: { id: budgetId, projectId },
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${budgetId} not found`);
    }

    // Validate snapshot exists and belongs to this budget
    const snapshot = await this.snapshotRepo.findOne({
      where: { id: snapshotId, budgetId },
    });

    if (!snapshot) {
      throw new NotFoundException(
        `Snapshot with ID ${snapshotId} not found for budget ${budgetId}`,
      );
    }

    // Delegate to calculation service for detailed comparison
    return this.calculationService.compareSnapshotToBudget(
      snapshotId,
      budgetId,
    );
  }

  /**
   * Get variance analysis
   */
  async getVarianceAnalysis(budgetId: string, projectId: string): Promise<VarianceAnalysisDto> {
    this.logger.log(`Getting variance analysis for budget ${budgetId}`);

    const budget = await this.budgetRepo.findOne({
      where: { id: budgetId, projectId },
      relations: ['lineItems', 'lineItems.costCode'],
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${budgetId} not found`);
    }

    const lineItems = (budget.lineItems || []).map((item) => {
      const budgeted = item.budgetedCost;
      const actual = 0;
      const variance = budgeted - actual;
      const variancePercentage = budgeted > 0 ? (variance / budgeted) * 100 : 0;

      return {
        lineItemId: item.id,
        costCode: item.costCode?.code || '',
        costCodeName: item.costCode?.name || '',
        category: item.category,
        budgetedCost: budgeted,
        committedCost: 0, // TODO: Calculate from commitments
        actualCost: actual,
        variance,
        variancePercentage,
        eac: actual,
        forecastVariance: variance,
      };
    });

    const totalBudget = budget.totalBudget;
    const totalActual = lineItems.reduce((sum, item) => sum + item.actualCost, 0);
    const totalCommitted = 0; // TODO: Calculate from commitments
    const totalVariance = totalBudget - totalActual;
    const variancePercentage = totalBudget > 0 ? (totalVariance / totalBudget) * 100 : 0;
    const totalEac = totalActual;
    const forecastVariance = totalBudget - totalEac;

    return {
      budgetId: budget.id,
      totalBudget,
      totalCommitted,
      totalActual,
      totalVariance,
      variancePercentage,
      totalEac,
      forecastVariance,
      lineItems,
    };
  }

  /**
   * Get contingency status
   */
  async getContingencyStatus(budgetId: string, projectId: string): Promise<ContingencyStatusDto> {
    this.logger.log(`Getting contingency status for budget ${budgetId}`);

    const budget = await this.budgetRepo.findOne({
      where: { id: budgetId, projectId },
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${budgetId} not found`);
    }

    const contingencyAmount = budget.totalBudget * 0.1;
    const contingencyUsed = 0;
    const contingencyRemaining = contingencyAmount - contingencyUsed;
    const contingencyPercentage = (contingencyUsed / contingencyAmount) * 100;

    return {
      budgetId: budget.id,
      totalContingency: contingencyAmount,
      contingencyUsed,
      contingencyRemaining,
      contingencyPercentage,
      usagePercentage: (contingencyUsed / contingencyAmount) * 100,
      lineItemsUsingContingency: 0, // TODO: Calculate actual value
    };
  }

  /**
   * Export budget
   */
  async export(budgetId: string, exportDto: BudgetExportDto, projectId: string): Promise<Buffer> {
    this.logger.log(`Exporting budget ${budgetId} as ${exportDto.format}`);

    const budget = await this.budgetRepo.findOne({
      where: { id: budgetId, projectId },
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${budgetId} not found`);
    }

    if (exportDto.format === 'excel') {
      return this.exportService.exportToExcel(budgetId, exportDto.includeSummary);
    } else {
      return this.exportService.exportToCSV(budgetId);
    }
  }

  /**
   * Check if budget is locked by another user
   *
   * Helper method to validate budget lock status before modifications.
   * Throws appropriate exceptions if budget is locked by another user.
   *
   * @param budget - Budget entity to check
   * @param userId - ID of user attempting the operation
   * @throws ConflictException if budget is locked by another user
   */
  private checkLock(budget: Budget, userId: string): void {
    if (budget.lockedById && budget.lockedById !== userId) {
      throw new ConflictException(
        `Budget is locked by user ${budget.lockedById}. Cannot modify until unlocked.`,
      );
    }
  }

  /**
   * Validate status transition
   *
   * Enforces valid status workflow:
   * - DRAFT → ACTIVE
   * - ACTIVE → LOCKED or ARCHIVED
   * - LOCKED → ACTIVE or ARCHIVED
   * - ARCHIVED → (no transitions)
   *
   * @param currentStatus - Current status
   * @param newStatus - Proposed new status
   * @throws BadRequestException if transition is invalid
   */
  private validateStatusTransition(
    currentStatus: BudgetStatus,
    newStatus: BudgetStatus,
  ): void {
    const validTransitions: Record<BudgetStatus, BudgetStatus[]> = {
      [BudgetStatus.DRAFT]: [BudgetStatus.ACTIVE],
      [BudgetStatus.ACTIVE]: [BudgetStatus.LOCKED, BudgetStatus.ARCHIVED],
      [BudgetStatus.LOCKED]: [BudgetStatus.ACTIVE, BudgetStatus.ARCHIVED],
      [BudgetStatus.ARCHIVED]: [], // Cannot transition from archived
    };

    const allowedStatuses = validTransitions[currentStatus] || [];

    if (!allowedStatuses.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowedStatuses.join(', ') || 'none'}`,
      );
    }
  }

  /**
   * Convert entity to response DTO
   *
   * @param budget - Budget entity
   * @returns Response DTO
   */
  private toResponseDto(budget: Budget): BudgetResponseDto {
    return {
      id: budget.id,
      projectId: budget.projectId,
      name: budget.name,
      description: budget.description,
      status: budget.status,
      category: null as any, // TODO: Add category to Budget entity
      totalAmount: budget.totalBudget,
      isActive: budget.status === BudgetStatus.ACTIVE,
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt,
    };
  }
}
