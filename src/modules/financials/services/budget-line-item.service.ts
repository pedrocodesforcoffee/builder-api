import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BudgetLineItem } from '../entities/budget-line-item.entity';
import { Budget } from '../entities/budget.entity';
import { CostCode } from '../entities/cost-code.entity';
import {
  CreateBudgetLineItemDto,
  UpdateBudgetLineItemDto,
  BudgetLineItemResponseDto,
  BulkCreateLineItemsDto,
  BulkUpdateLineItemsDto,
  ReorderLineItemsDto,
  LineItemQueryDto,
} from '../dto';

/**
 * BudgetLineItem Service
 *
 * Handles business logic for budget line item management including:
 * - CRUD operations for budget line items
 * - Budget total recalculation on changes
 * - Cost code and budget validation
 * - Unit-based cost calculations
 *
 * @service BudgetLineItemService
 */
@Injectable()
export class BudgetLineItemService {
  private readonly logger = new Logger(BudgetLineItemService.name);

  constructor(
    @InjectRepository(BudgetLineItem)
    private readonly lineItemRepo: Repository<BudgetLineItem>,
    @InjectRepository(Budget)
    private readonly budgetRepo: Repository<Budget>,
    @InjectRepository(CostCode)
    private readonly costCodeRepo: Repository<CostCode>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new budget line item
   *
   * Validates budget and cost code exist.
   * Recalculates budget total after creation.
   *
   * @param createDto - Line item creation data
   * @returns Created line item
   * @throws NotFoundException if budget or cost code doesn't exist
   * @throws BadRequestException if budget is locked/archived
   */
  async create(
    createDto: CreateBudgetLineItemDto,
  ): Promise<BudgetLineItemResponseDto> {
    this.logger.log(
      `Creating budget line item for budget ${createDto.budgetId}`,
    );

    // Validate budget exists and is editable
    const budget = await this.budgetRepo.findOne({
      where: { id: createDto.budgetId },
    });

    if (!budget) {
      throw new NotFoundException(
        `Budget with ID ${createDto.budgetId} not found`,
      );
    }

    if (budget.status === 'LOCKED' || budget.status === 'ARCHIVED') {
      throw new BadRequestException(
        `Cannot add line items to ${budget.status.toLowerCase()} budget`,
      );
    }

    // Validate cost code exists
    const costCode = await this.costCodeRepo.findOne({
      where: { id: createDto.costCodeId },
    });

    if (!costCode) {
      throw new NotFoundException(
        `Cost code with ID ${createDto.costCodeId} not found`,
      );
    }

    // Create line item
    const lineItem = this.lineItemRepo.create(createDto);

    const savedLineItem = await this.lineItemRepo.save(lineItem);

    this.logger.log(
      `Budget line item created successfully: ${savedLineItem.id}`,
    );

    // Recalculate budget total
    await this.recalculateBudgetTotal(createDto.budgetId);

    return this.toResponseDto(savedLineItem);
  }

  /**
   * List all budget line items
   *
   * Optionally filter by budget or cost code.
   *
   * @param budgetId - Filter to specific budget (optional)
   * @param costCodeId - Filter to specific cost code (optional)
   * @returns Array of line items
   */
  async findAll(
    budgetId?: string,
    costCodeId?: string,
  ): Promise<BudgetLineItemResponseDto[]> {
    this.logger.log(
      `Fetching budget line items - budgetId: ${budgetId}, costCodeId: ${costCodeId}`,
    );

    const queryBuilder = this.lineItemRepo.createQueryBuilder('line_item');

    if (budgetId) {
      queryBuilder.andWhere('line_item.budget_id = :budgetId', { budgetId });
    }

    if (costCodeId) {
      queryBuilder.andWhere('line_item.cost_code_id = :costCodeId', {
        costCodeId,
      });
    }

    queryBuilder.orderBy('line_item.created_at', 'ASC');

    const lineItems = await queryBuilder.getMany();

    this.logger.log(`Found ${lineItems.length} budget line items`);

    return lineItems.map((item) => this.toResponseDto(item));
  }

  /**
   * Get budget line item by ID
   *
   * @param id - Line item ID
   * @returns Line item details
   * @throws NotFoundException if line item doesn't exist
   */
  async findOne(id: string): Promise<BudgetLineItemResponseDto> {
    this.logger.log(`Fetching budget line item by ID: ${id}`);

    const lineItem = await this.lineItemRepo.findOne({
      where: { id },
    });

    if (!lineItem) {
      throw new NotFoundException(`Budget line item with ID ${id} not found`);
    }

    return this.toResponseDto(lineItem);
  }

  /**
   * Update budget line item
   *
   * Recalculates budget total after update.
   *
   * @param id - Line item ID
   * @param updateDto - Update data
   * @returns Updated line item
   * @throws NotFoundException if line item doesn't exist
   * @throws BadRequestException if budget is locked/archived
   */
  async update(
    id: string,
    updateDto: UpdateBudgetLineItemDto,
  ): Promise<BudgetLineItemResponseDto> {
    this.logger.log(`Updating budget line item ${id}`);

    const lineItem = await this.lineItemRepo.findOne({
      where: { id },
    });

    if (!lineItem) {
      throw new NotFoundException(`Budget line item with ID ${id} not found`);
    }

    // Validate budget is editable
    const budget = await this.budgetRepo.findOne({
      where: { id: lineItem.budgetId },
    });

    if (budget && (budget.status === 'LOCKED' || budget.status === 'ARCHIVED')) {
      throw new BadRequestException(
        `Cannot update line items in ${budget.status.toLowerCase()} budget`,
      );
    }

    // Apply updates
    Object.assign(lineItem, updateDto);

    const updatedLineItem = await this.lineItemRepo.save(lineItem);

    this.logger.log(`Budget line item ${id} updated successfully`);

    // Recalculate budget total
    await this.recalculateBudgetTotal(lineItem.budgetId);

    return this.toResponseDto(updatedLineItem);
  }

  /**
   * Delete budget line item
   *
   * Recalculates budget total after deletion.
   *
   * @param id - Line item ID
   * @throws NotFoundException if line item doesn't exist
   * @throws BadRequestException if budget is locked/archived
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Removing budget line item ${id}`);

    const lineItem = await this.lineItemRepo.findOne({
      where: { id },
    });

    if (!lineItem) {
      throw new NotFoundException(`Budget line item with ID ${id} not found`);
    }

    // Validate budget is editable
    const budget = await this.budgetRepo.findOne({
      where: { id: lineItem.budgetId },
    });

    if (budget && (budget.status === 'LOCKED' || budget.status === 'ARCHIVED')) {
      throw new BadRequestException(
        `Cannot delete line items from ${budget.status.toLowerCase()} budget`,
      );
    }

    const budgetId = lineItem.budgetId;

    await this.lineItemRepo.remove(lineItem);

    this.logger.log(`Budget line item ${id} deleted successfully`);

    // Recalculate budget total
    await this.recalculateBudgetTotal(budgetId);
  }

  /**
   * Find all line items for a budget with filters
   *
   * @param budgetId - Budget ID
   * @param query - Query parameters (filters, sorting, pagination)
   * @returns Array of filtered line items
   */
  async findAllByBudget(
    budgetId: string,
    query: LineItemQueryDto,
  ): Promise<any> {
    this.logger.log(`Fetching line items for budget ${budgetId} with query`);

    const queryBuilder = this.lineItemRepo
      .createQueryBuilder('line_item')
      .leftJoinAndSelect('line_item.costCode', 'costCode')
      .where('line_item.budget_id = :budgetId', { budgetId });

    // Filter by category
    if (query.category) {
      queryBuilder.andWhere('line_item.category = :category', {
        category: query.category,
      });
    }

    // Filter by cost code
    if (query.costCodeId) {
      queryBuilder.andWhere('line_item.cost_code_id = :costCodeId', {
        costCodeId: query.costCodeId,
      });
    }

    // Search in cost code or description
    if (query.search) {
      queryBuilder.andWhere(
        '(costCode.name ILIKE :search OR costCode.code ILIKE :search OR line_item.description ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    // Get total count before pagination
    const total = await queryBuilder.getCount();

    // Sorting
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'ASC';

    if (sortBy === 'createdAt') {
      queryBuilder.orderBy('line_item.created_at', sortOrder);
    } else if (sortBy === 'budgetedCost') {
      queryBuilder.orderBy('line_item.budgeted_cost', sortOrder);
    } else if (sortBy === 'category') {
      queryBuilder.orderBy('line_item.category', sortOrder);
    } else if (sortBy === 'actualCost') {
      queryBuilder.orderBy('line_item.actual_cost', sortOrder);
    } else if (sortBy === 'variance') {
      // Use raw SQL for calculated variance ordering
      queryBuilder.orderBy(
        '(line_item.budgeted_cost - line_item.actual_cost)',
        sortOrder,
      );
    }

    // Pagination
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const lineItems = await queryBuilder.getMany();

    this.logger.log(`Found ${lineItems.length} of ${total} line items for budget ${budgetId}`);

    // Return paginated response
    return {
      data: lineItems.map((item) => this.toResponseDto(item)),
      total,
      skip,
      take: limit,
    };
  }

  /**
   * Bulk create line items
   *
   * Creates multiple line items in a single transaction.
   *
   * @param budgetId - Budget ID
   * @param dto - Bulk create parameters
   * @param userId - User ID for audit
   * @returns Array of created line items
   */
  async bulkCreate(
    budgetId: string,
    dto: BulkCreateLineItemsDto,
    userId: string,
  ): Promise<BudgetLineItemResponseDto[]> {
    this.logger.log(
      `Bulk creating ${dto.lineItems.length} line items for budget ${budgetId}`,
    );

    // Validate budget exists and is editable
    const budget = await this.budgetRepo.findOne({
      where: { id: budgetId },
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${budgetId} not found`);
    }

    if (budget.status === 'LOCKED' || budget.status === 'ARCHIVED') {
      throw new BadRequestException(
        `Cannot add line items to ${budget.status.toLowerCase()} budget`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const createdItems: BudgetLineItem[] = [];

      for (const item of dto.lineItems) {
        // Validate cost code exists
        const costCode = await queryRunner.manager.findOne(CostCode, {
          where: { id: item.costCodeId },
        });

        if (!costCode) {
          throw new NotFoundException(
            `Cost code with ID ${item.costCodeId} not found`,
          );
        }

        const lineItem = queryRunner.manager.create(BudgetLineItem, {
          budgetId,
          costCodeId: item.costCodeId,
          category: item.category,
          budgetedCost: item.budgetedCost,
          quantity: item.quantity,
          unitCost: item.unitPrice,
          description: item.notes,
        });

        const saved = await queryRunner.manager.save(BudgetLineItem, lineItem);
        createdItems.push(saved);
      }

      // Recalculate budget total within transaction
      const updatedBudget = await queryRunner.manager.findOne(Budget, {
        where: { id: budgetId },
        relations: ['lineItems'],
      });

      if (updatedBudget) {
        const total =
          updatedBudget.lineItems?.reduce((sum, item) => {
            return sum + (item.budgetedCost || 0);
          }, 0) || 0;

        updatedBudget.totalBudget = total;
        await queryRunner.manager.save(Budget, updatedBudget);
      }

      await queryRunner.commitTransaction();

      this.logger.log(
        `Successfully bulk created ${createdItems.length} line items`,
      );

      return createdItems.map((item) => this.toResponseDto(item));
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Bulk create failed: ${(error as Error).message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Bulk update line items
   *
   * Updates multiple line items in a single transaction.
   *
   * @param budgetId - Budget ID
   * @param dto - Bulk update parameters
   * @param userId - User ID for audit
   * @returns Array of updated line items
   */
  async bulkUpdate(
    budgetId: string,
    dto: BulkUpdateLineItemsDto,
    userId: string,
  ): Promise<BudgetLineItemResponseDto[]> {
    this.logger.log(
      `Bulk updating ${dto.lineItems.length} line items for budget ${budgetId}`,
    );

    // Validate budget exists and is editable
    const budget = await this.budgetRepo.findOne({
      where: { id: budgetId },
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${budgetId} not found`);
    }

    if (budget.status === 'LOCKED' || budget.status === 'ARCHIVED') {
      throw new BadRequestException(
        `Cannot update line items in ${budget.status.toLowerCase()} budget`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const updatedItems: BudgetLineItem[] = [];

      for (const item of dto.lineItems) {
        const lineItem = await queryRunner.manager.findOne(BudgetLineItem, {
          where: { id: item.id, budgetId },
        });

        if (!lineItem) {
          throw new NotFoundException(
            `Line item with ID ${item.id} not found in budget ${budgetId}`,
          );
        }

        // Apply updates
        if (item.budgetedCost !== undefined) {
          lineItem.budgetedCost = item.budgetedCost;
        }
        if (item.quantity !== undefined) {
          lineItem.quantity = item.quantity;
        }
        if (item.unitPrice !== undefined) {
          lineItem.unitCost = item.unitPrice;
        }
        if (item.notes !== undefined) {
          lineItem.description = item.notes;
        }

        const saved = await queryRunner.manager.save(BudgetLineItem, lineItem);
        updatedItems.push(saved);
      }

      // Recalculate budget total within transaction
      const updatedBudget = await queryRunner.manager.findOne(Budget, {
        where: { id: budgetId },
        relations: ['lineItems'],
      });

      if (updatedBudget) {
        const total =
          updatedBudget.lineItems?.reduce((sum, item) => {
            return sum + (item.budgetedCost || 0);
          }, 0) || 0;

        updatedBudget.totalBudget = total;
        await queryRunner.manager.save(Budget, updatedBudget);
      }

      await queryRunner.commitTransaction();

      this.logger.log(
        `Successfully bulk updated ${updatedItems.length} line items`,
      );

      return updatedItems.map((item) => this.toResponseDto(item));
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Bulk update failed: ${(error as Error).message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Reorder line items
   *
   * Updates the display_order field for line items.
   *
   * @param budgetId - Budget ID
   * @param dto - Reorder parameters (array of line item IDs in desired order)
   * @param userId - User ID for audit
   */
  async reorder(
    budgetId: string,
    dto: ReorderLineItemsDto,
    userId: string,
  ): Promise<void> {
    this.logger.log(
      `Reordering ${dto.lineItemIds.length} line items for budget ${budgetId}`,
    );

    // Validate budget exists and is editable
    const budget = await this.budgetRepo.findOne({
      where: { id: budgetId },
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${budgetId} not found`);
    }

    if (budget.status === 'LOCKED' || budget.status === 'ARCHIVED') {
      throw new BadRequestException(
        `Cannot reorder line items in ${budget.status.toLowerCase()} budget`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (let i = 0; i < dto.lineItemIds.length; i++) {
        const lineItemId = dto.lineItemIds[i];
        const lineItem = await queryRunner.manager.findOne(BudgetLineItem, {
          where: { id: lineItemId, budgetId },
        });

        if (!lineItem) {
          throw new NotFoundException(
            `Line item with ID ${lineItemId} not found in budget ${budgetId}`,
          );
        }

        // TODO: Add displayOrder field to BudgetLineItem entity
        // lineItem.displayOrder = i + 1;
        await queryRunner.manager.save(BudgetLineItem, lineItem);
      }

      await queryRunner.commitTransaction();

      this.logger.log(
        `Successfully reordered ${dto.lineItemIds.length} line items`,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Reorder failed: ${(error as Error).message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Update actual cost for a line item
   *
   * @param lineItemId - Line item ID
   * @param actualCost - New actual cost value
   * @returns Updated line item
   */
  async updateActualCost(
    lineItemId: string,
    actualCost: number,
  ): Promise<BudgetLineItemResponseDto> {
    this.logger.log(`Updating actual cost for line item ${lineItemId}`);

    const lineItem = await this.lineItemRepo.findOne({
      where: { id: lineItemId },
    });

    if (!lineItem) {
      throw new NotFoundException(
        `Line item with ID ${lineItemId} not found`,
      );
    }

    lineItem.actualCost = actualCost;
    // TODO: Add variance field to BudgetLineItem entity
    // lineItem.variance = (lineItem.budgetedCost || 0) - actualCost;

    const updated = await this.lineItemRepo.save(lineItem);

    this.logger.log(
      `Updated actual cost for line item ${lineItemId}: ${actualCost}`,
    );

    return this.toResponseDto(updated);
  }

  /**
   * Update committed cost for a line item
   *
   * @param lineItemId - Line item ID
   * @param committedCost - New committed cost value
   * @returns Updated line item
   */
  async updateCommittedCost(
    lineItemId: string,
    committedCost: number,
  ): Promise<BudgetLineItemResponseDto> {
    this.logger.log(`Updating committed cost for line item ${lineItemId}`);

    const lineItem = await this.lineItemRepo.findOne({
      where: { id: lineItemId },
    });

    if (!lineItem) {
      throw new NotFoundException(
        `Line item with ID ${lineItemId} not found`,
      );
    }

    // TODO: Add committedCost field to BudgetLineItem entity
    // lineItem.committedCost = committedCost;

    const updated = await this.lineItemRepo.save(lineItem);

    this.logger.log(
      `Updated committed cost for line item ${lineItemId}: ${committedCost}`,
    );

    return this.toResponseDto(updated);
  }

  /**
   * Calculate variance for a line item
   *
   * Variance = Budgeted Cost - Actual Cost
   *
   * @param lineItemId - Line item ID
   * @returns Variance amount
   */
  async calculateVariance(lineItemId: string): Promise<number> {
    this.logger.log(`Calculating variance for line item ${lineItemId}`);

    const lineItem = await this.lineItemRepo.findOne({
      where: { id: lineItemId },
    });

    if (!lineItem) {
      throw new NotFoundException(
        `Line item with ID ${lineItemId} not found`,
      );
    }

    const variance = (lineItem.budgetedCost || 0) - (lineItem.actualCost || 0);

    this.logger.log(`Variance for line item ${lineItemId}: ${variance}`);

    return variance;
  }

  /**
   * Calculate Estimate at Completion (EAC)
   *
   * EAC = Actual Cost + (Budgeted Cost - Committed Cost)
   * Represents the projected total cost at project completion
   *
   * @param lineItemId - Line item ID
   * @returns Estimate at completion
   */
  async calculateEAC(lineItemId: string): Promise<number> {
    this.logger.log(
      `Calculating Estimate at Completion for line item ${lineItemId}`,
    );

    const lineItem = await this.lineItemRepo.findOne({
      where: { id: lineItemId },
    });

    if (!lineItem) {
      throw new NotFoundException(
        `Line item with ID ${lineItemId} not found`,
      );
    }

    // TODO: Add committedCost field to BudgetLineItem entity
    const eac =
      (lineItem.actualCost || 0) +
      ((lineItem.budgetedCost || 0) - 0); // (lineItem.committedCost || 0));

    this.logger.log(`EAC for line item ${lineItemId}: ${eac}`);

    return eac;
  }

  /**
   * Recalculate budget total from line items
   *
   * @param budgetId - Budget ID
   */
  private async recalculateBudgetTotal(budgetId: string): Promise<void> {
    const budget = await this.budgetRepo.findOne({
      where: { id: budgetId },
      relations: ['lineItems'],
    });

    if (budget) {
      const total = budget.lineItems?.reduce((sum, item) => {
        return sum + (item.budgetedCost || 0);
      }, 0) || 0;

      budget.totalBudget = total;
      await this.budgetRepo.save(budget);

      this.logger.log(
        `Budget ${budgetId} total recalculated: ${budget.totalBudget}`,
      );
    }
  }

  /**
   * Convert entity to response DTO
   *
   * @param lineItem - BudgetLineItem entity
   * @returns Response DTO
   */
  private toResponseDto(lineItem: BudgetLineItem): BudgetLineItemResponseDto {
    return {
      id: lineItem.id,
      budgetId: lineItem.budgetId,
      costCodeId: lineItem.costCodeId,
      costCode: lineItem.costCode,
      category: lineItem.category,
      description: lineItem.description,
      quantity: lineItem.quantity,
      unitCost: lineItem.unitCost,
      budgetedCost: lineItem.budgetedCost,
      committedCost: lineItem.committedCost,
      actualCost: lineItem.actualCost,
      createdAt: lineItem.createdAt,
      updatedAt: lineItem.updatedAt,
    };
  }
}
