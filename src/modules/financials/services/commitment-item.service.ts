import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommitmentItem } from '../entities/commitment-item.entity';
import { Commitment } from '../entities/commitment.entity';
import { CostCode } from '../entities/cost-code.entity';
import {
  CreateCommitmentItemDto,
  UpdateCommitmentItemDto,
  CommitmentItemResponseDto,
} from '../dto';

/**
 * CommitmentItem Service
 *
 * Handles business logic for commitment line item management including:
 * - CRUD operations for commitment line items
 * - Commitment total recalculation on changes
 * - Cost code and commitment validation
 * - Unit-based cost calculations
 * - Recalculation of parent commitment amounts
 *
 * @service CommitmentItemService
 */
@Injectable()
export class CommitmentItemService {
  private readonly logger = new Logger(CommitmentItemService.name);

  constructor(
    @InjectRepository(CommitmentItem)
    private readonly commitmentItemRepo: Repository<CommitmentItem>,
    @InjectRepository(Commitment)
    private readonly commitmentRepo: Repository<Commitment>,
    @InjectRepository(CostCode)
    private readonly costCodeRepo: Repository<CostCode>,
  ) {}

  /**
   * Create a new commitment line item
   *
   * Validates commitment and cost code exist.
   * Validates commitment is not CLOSED or VOID.
   * Recalculates commitment total after creation.
   *
   * @param createDto - Line item creation data
   * @returns Created line item
   * @throws NotFoundException if commitment or cost code doesn't exist
   * @throws BadRequestException if commitment is locked or cost code is invalid
   */
  async create(
    createDto: CreateCommitmentItemDto,
  ): Promise<CommitmentItemResponseDto> {
    this.logger.log(
      `Creating commitment line item for commitment ${createDto.commitmentId}`,
    );

    // Validate commitment exists and is editable
    const commitment = await this.commitmentRepo.findOne({
      where: { id: createDto.commitmentId },
    });

    if (!commitment) {
      throw new NotFoundException(
        `Commitment with ID ${createDto.commitmentId} not found`,
      );
    }

    if (
      commitment.status === 'CLOSED' ||
      commitment.status === 'VOID'
    ) {
      throw new BadRequestException(
        `Cannot add line items to a ${commitment.status.toLowerCase()} commitment`,
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
    const commitmentItem = this.commitmentItemRepo.create(createDto);

    const savedCommitmentItem = await this.commitmentItemRepo.save(
      commitmentItem,
    );

    this.logger.log(
      `Commitment line item created successfully: ${savedCommitmentItem.id}`,
    );

    // Recalculate commitment total
    await this.recalculateCommitmentTotal(createDto.commitmentId);

    return this.toResponseDto(savedCommitmentItem);
  }

  /**
   * List all commitment line items
   *
   * Optionally filter by:
   * - Commitment
   * - Cost code
   *
   * @param commitmentId - Filter to specific commitment (optional)
   * @param costCodeId - Filter to specific cost code (optional)
   * @returns Array of line items
   */
  async findAll(
    commitmentId?: string,
    costCodeId?: string,
  ): Promise<CommitmentItemResponseDto[]> {
    this.logger.log(
      `Fetching commitment line items - commitmentId: ${commitmentId}, costCodeId: ${costCodeId}`,
    );

    const queryBuilder = this.commitmentItemRepo.createQueryBuilder(
      'commitment_item',
    );

    if (commitmentId) {
      queryBuilder.andWhere(
        'commitment_item.commitment_id = :commitmentId',
        { commitmentId },
      );
    }

    if (costCodeId) {
      queryBuilder.andWhere('commitment_item.cost_code_id = :costCodeId', {
        costCodeId,
      });
    }

    queryBuilder.orderBy('commitment_item.created_at', 'ASC');

    const commitmentItems = await queryBuilder.getMany();

    this.logger.log(`Found ${commitmentItems.length} commitment line items`);

    return commitmentItems.map((item) => this.toResponseDto(item));
  }

  /**
   * Get commitment line item by ID
   *
   * @param id - Line item ID
   * @returns Line item details
   * @throws NotFoundException if line item doesn't exist
   */
  async findOne(id: string): Promise<CommitmentItemResponseDto> {
    this.logger.log(`Fetching commitment line item by ID: ${id}`);

    const commitmentItem = await this.commitmentItemRepo.findOne({
      where: { id },
    });

    if (!commitmentItem) {
      throw new NotFoundException(
        `Commitment line item with ID ${id} not found`,
      );
    }

    return this.toResponseDto(commitmentItem);
  }

  /**
   * Update commitment line item
   *
   * Validates commitment is not CLOSED or VOID.
   * Recalculates commitment total after update.
   *
   * @param id - Line item ID
   * @param updateDto - Update data
   * @returns Updated line item
   * @throws NotFoundException if line item doesn't exist
   * @throws BadRequestException if commitment is locked
   */
  async update(
    id: string,
    updateDto: UpdateCommitmentItemDto,
  ): Promise<CommitmentItemResponseDto> {
    this.logger.log(`Updating commitment line item ${id}`);

    const commitmentItem = await this.commitmentItemRepo.findOne({
      where: { id },
    });

    if (!commitmentItem) {
      throw new NotFoundException(
        `Commitment line item with ID ${id} not found`,
      );
    }

    // Validate commitment is editable
    const commitment = await this.commitmentRepo.findOne({
      where: { id: commitmentItem.commitmentId },
    });

    if (
      commitment &&
      (commitment.status === 'CLOSED' || commitment.status === 'VOID')
    ) {
      throw new BadRequestException(
        `Cannot update line items in a ${commitment.status.toLowerCase()} commitment`,
      );
    }

    // Validate cost code if being updated
    if (updateDto.costCodeId) {
      const costCode = await this.costCodeRepo.findOne({
        where: { id: updateDto.costCodeId },
      });

      if (!costCode) {
        throw new NotFoundException(
          `Cost code with ID ${updateDto.costCodeId} not found`,
        );
      }
    }

    // Apply updates
    Object.assign(commitmentItem, updateDto);

    const updatedCommitmentItem = await this.commitmentItemRepo.save(
      commitmentItem,
    );

    this.logger.log(`Commitment line item ${id} updated successfully`);

    // Recalculate commitment total
    await this.recalculateCommitmentTotal(commitmentItem.commitmentId);

    return this.toResponseDto(updatedCommitmentItem);
  }

  /**
   * Delete commitment line item
   *
   * Validates commitment is not CLOSED or VOID.
   * Recalculates commitment total after deletion.
   *
   * @param id - Line item ID
   * @throws NotFoundException if line item doesn't exist
   * @throws BadRequestException if commitment is locked
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Removing commitment line item ${id}`);

    const commitmentItem = await this.commitmentItemRepo.findOne({
      where: { id },
    });

    if (!commitmentItem) {
      throw new NotFoundException(
        `Commitment line item with ID ${id} not found`,
      );
    }

    // Validate commitment is editable
    const commitment = await this.commitmentRepo.findOne({
      where: { id: commitmentItem.commitmentId },
    });

    if (
      commitment &&
      (commitment.status === 'CLOSED' || commitment.status === 'VOID')
    ) {
      throw new BadRequestException(
        `Cannot delete line items from a ${commitment.status.toLowerCase()} commitment`,
      );
    }

    const commitmentId = commitmentItem.commitmentId;

    await this.commitmentItemRepo.remove(commitmentItem);

    this.logger.log(`Commitment line item ${id} deleted successfully`);

    // Recalculate commitment total
    await this.recalculateCommitmentTotal(commitmentId);
  }

  /**
   * Recalculate commitment total from line items
   *
   * Sums all line item amounts and updates the commitment's currentAmount.
   *
   * @param commitmentId - Commitment ID
   */
  private async recalculateCommitmentTotal(commitmentId: string): Promise<void> {
    const commitment = await this.commitmentRepo.findOne({
      where: { id: commitmentId },
      relations: ['items'],
    });

    if (commitment) {
      const total = commitment.items?.reduce((sum, item) => {
        return sum + (item.amount || 0);
      }, 0) || 0;

      commitment.currentAmount = total;
      await this.commitmentRepo.save(commitment);

      this.logger.log(
        `Commitment ${commitmentId} total recalculated: ${commitment.currentAmount}`,
      );
    }
  }

  /**
   * Convert entity to response DTO
   *
   * @param commitmentItem - CommitmentItem entity
   * @returns Response DTO
   */
  private toResponseDto(
    commitmentItem: CommitmentItem,
  ): CommitmentItemResponseDto {
    return {
      id: commitmentItem.id,
      commitmentId: commitmentItem.commitmentId,
      costCodeId: commitmentItem.costCodeId,
      category: commitmentItem.category,
      description: commitmentItem.description,
      quantity: commitmentItem.quantity,
      unitCost: commitmentItem.unitCost,
      amount: commitmentItem.amount,
      createdAt: commitmentItem.createdAt,
      updatedAt: commitmentItem.updatedAt,
    };
  }
}
