import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import Decimal from 'decimal.js';
import { CommitmentChangeOrder } from '../entities/commitment-change-order.entity';
import { CcoLineItem } from '../entities/cco-line-item.entity';
import { CcoTmEntry } from '../entities/cco-tm-entry.entity';
import { Commitment } from '../entities/commitment.entity';
import { Project } from '../../projects/entities/project.entity';
import { Budget } from '../entities/budget.entity';
import { BudgetLineItem } from '../entities/budget-line-item.entity';
import { CcoStatus } from '../enums/cco-status.enum';
import { BudgetStatus } from '../enums/budget-status.enum';
import {
  CreateCommitmentChangeOrderDto,
  UpdateCommitmentChangeOrderDto,
  CommitmentChangeOrderResponseDto,
} from '../dto';

/**
 * Commitment Change Order Service
 *
 * Handles business logic for CCO management including:
 * - CRUD operations
 * - 5-state workflow: DRAFT → PENDING_APPROVAL → APPROVED/REJECTED → EXECUTED
 * - Commitment amount updates on approval
 * - Line item and T&M entry management
 */
@Injectable()
export class CommitmentChangeOrderService {
  private readonly logger = new Logger(CommitmentChangeOrderService.name);

  constructor(
    @InjectRepository(CommitmentChangeOrder)
    private readonly ccoRepo: Repository<CommitmentChangeOrder>,
    @InjectRepository(CcoLineItem)
    private readonly ccoLineItemRepo: Repository<CcoLineItem>,
    @InjectRepository(CcoTmEntry)
    private readonly ccoTmEntryRepo: Repository<CcoTmEntry>,
    @InjectRepository(Commitment)
    private readonly commitmentRepo: Repository<Commitment>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createDto: CreateCommitmentChangeOrderDto): Promise<CommitmentChangeOrderResponseDto> {
    this.logger.log(`Creating CCO "${createDto.ccoNumber}" for commitment ${createDto.commitmentId}`);

    const project = await this.projectRepo.findOne({
      where: { id: createDto.projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${createDto.projectId} not found`);
    }

    const commitment = await this.commitmentRepo.findOne({
      where: { id: createDto.commitmentId },
    });
    if (!commitment) {
      throw new NotFoundException(`Commitment with ID ${createDto.commitmentId} not found`);
    }

    const existing = await this.ccoRepo.findOne({
      where: { commitmentId: createDto.commitmentId, ccoNumber: createDto.ccoNumber },
    });
    if (existing) {
      throw new BadRequestException(`CCO number "${createDto.ccoNumber}" already exists for this commitment`);
    }

    const cco = this.ccoRepo.create({
      ...createDto,
      status: CcoStatus.DRAFT,
      isTimeAndMaterial: createDto.isTimeAndMaterial || false,
    });

    const saved = await this.ccoRepo.save(cco);
    this.logger.log(`CCO created successfully: ${saved.id}`);

    return this.toResponseDto(saved);
  }

  async findAll(projectId?: string, commitmentId?: string, status?: CcoStatus): Promise<CommitmentChangeOrderResponseDto[]> {
    this.logger.log(`Fetching CCOs - projectId: ${projectId}, commitmentId: ${commitmentId}, status: ${status}`);

    const query = this.ccoRepo.createQueryBuilder('cco');

    if (projectId) {
      query.andWhere('cco.project_id = :projectId', { projectId });
    }

    if (commitmentId) {
      query.andWhere('cco.commitment_id = :commitmentId', { commitmentId });
    }

    if (status) {
      query.andWhere('cco.status = :status', { status });
    }

    query.orderBy('cco.created_at', 'DESC');

    const ccos = await query.getMany();
    this.logger.log(`Found ${ccos.length} CCOs`);

    return ccos.map((cco) => this.toResponseDto(cco));
  }

  async findOne(id: string): Promise<CommitmentChangeOrderResponseDto> {
    this.logger.log(`Fetching CCO by ID: ${id}`);

    const cco = await this.ccoRepo.findOne({
      where: { id },
      relations: ['lineItems', 'tmEntries'],
    });

    if (!cco) {
      throw new NotFoundException(`CCO with ID ${id} not found`);
    }

    return this.toResponseDto(cco);
  }

  async update(id: string, updateDto: UpdateCommitmentChangeOrderDto): Promise<CommitmentChangeOrderResponseDto> {
    this.logger.log(`Updating CCO ${id}`);

    const cco = await this.ccoRepo.findOne({ where: { id } });
    if (!cco) {
      throw new NotFoundException(`CCO with ID ${id} not found`);
    }

    if (cco.status === CcoStatus.EXECUTED) {
      throw new BadRequestException('Cannot update an executed CCO');
    }

    if (updateDto.ccoNumber && updateDto.ccoNumber !== cco.ccoNumber) {
      const existing = await this.ccoRepo.findOne({
        where: { commitmentId: cco.commitmentId, ccoNumber: updateDto.ccoNumber },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException(`CCO number "${updateDto.ccoNumber}" already exists for this commitment`);
      }
    }

    Object.assign(cco, updateDto);
    const updated = await this.ccoRepo.save(cco);
    this.logger.log(`CCO ${id} updated successfully`);

    return this.toResponseDto(updated);
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Removing CCO ${id}`);

    const cco = await this.ccoRepo.findOne({ where: { id } });
    if (!cco) {
      throw new NotFoundException(`CCO with ID ${id} not found`);
    }

    if (cco.status === CcoStatus.APPROVED || cco.status === CcoStatus.EXECUTED) {
      throw new BadRequestException('Cannot delete an approved or executed CCO');
    }

    await this.ccoRepo.remove(cco);
    this.logger.log(`CCO ${id} deleted successfully`);
  }

  async submit(id: string, userId: string): Promise<CommitmentChangeOrderResponseDto> {
    this.logger.log(`Submitting CCO ${id} by user ${userId}`);

    const cco = await this.ccoRepo.findOne({ where: { id } });
    if (!cco) {
      throw new NotFoundException(`CCO with ID ${id} not found`);
    }

    if (cco.status !== CcoStatus.DRAFT && cco.status !== CcoStatus.REJECTED) {
      throw new BadRequestException(`Can only submit CCOs in DRAFT or REJECTED status. Current: ${cco.status}`);
    }

    cco.status = CcoStatus.PENDING_APPROVAL;
    cco.submittedAt = new Date();
    cco.submittedById = userId;

    const updated = await this.ccoRepo.save(cco);
    this.logger.log(`CCO ${id} submitted successfully`);

    return this.toResponseDto(updated);
  }

  async approve(id: string, userId: string, dto?: { approvedAmount?: number }): Promise<CommitmentChangeOrderResponseDto> {
    this.logger.log(`Approving CCO ${id} by user ${userId}`);

    const cco = await this.ccoRepo.findOne({
      where: { id },
      relations: ['commitment'],
    });

    if (!cco) {
      throw new NotFoundException(`CCO with ID ${id} not found`);
    }

    if (cco.status !== CcoStatus.PENDING_APPROVAL) {
      throw new BadRequestException(`Can only approve CCOs in PENDING_APPROVAL status. Current: ${cco.status}`);
    }

    // Use DataSource transaction for atomic updates
    return await this.dataSource.transaction(async (manager) => {
      // Set approved amount (use provided amount or default to CCO amount)
      cco.approvedAmount = dto?.approvedAmount ?? cco.amount;

      // Update CCO status to APPROVED
      cco.status = CcoStatus.APPROVED;
      cco.approvedAt = new Date();
      cco.approvedById = userId;
      cco.rejectedAt = undefined;
      cco.rejectedById = undefined;
      cco.rejectionReason = undefined;

      const updated = await manager.save(CommitmentChangeOrder, cco);

      // CRITICAL INTEGRATION #2: Update Commitment.currentAmount
      const commitment = await manager.findOne(Commitment, {
        where: { id: cco.commitmentId },
      });

      if (commitment) {
        const newAmount = new Decimal(commitment.currentAmount)
          .plus(cco.approvedAmount)
          .toNumber();
        commitment.currentAmount = newAmount;
        await manager.save(Commitment, commitment);

        this.logger.log(
          `Commitment ${commitment.id} currentAmount updated: ${commitment.currentAmount} (added ${cco.approvedAmount})`
        );
      }

      // CRITICAL INTEGRATION #3: Update budget committed costs
      if (cco.costCodeId) {
        await this.updateBudgetCommittedCosts(manager, cco);
      }

      this.logger.log(`CCO ${id} approved successfully with amount ${cco.approvedAmount}`);

      return this.toResponseDto(updated);
    });
  }

  /**
   * Update budget committed costs when CCO is approved
   * CRITICAL: This enables commitment changes to flow through to budget tracking
   */
  private async updateBudgetCommittedCosts(
    manager: any,
    cco: CommitmentChangeOrder,
  ): Promise<void> {
    if (!cco.costCodeId) {
      this.logger.warn(`CCO ${cco.id} has no cost code specified, cannot update budget`);
      return;
    }

    // Find active budget line item for this cost code
    const lineItem = await manager
      .createQueryBuilder(BudgetLineItem, 'bli')
      .innerJoin('bli.budget', 'budget')
      .where('bli.cost_code_id = :costCodeId', { costCodeId: cco.costCodeId })
      .andWhere('budget.project_id = :projectId', { projectId: cco.projectId })
      .andWhere('budget.status = :status', { status: BudgetStatus.ACTIVE })
      .getOne();

    if (lineItem) {
      const approvedAmount = cco.approvedAmount ?? cco.amount;
      const newCommittedCost = new Decimal(lineItem.committedCost || 0)
        .plus(approvedAmount)
        .toNumber();

      lineItem.committedCost = newCommittedCost;
      await manager.save(BudgetLineItem, lineItem);

      this.logger.log(
        `Budget line item ${lineItem.id} (cost code ${cco.costCodeId}): Increased committedCost by ${approvedAmount} to ${newCommittedCost}`
      );
    } else {
      this.logger.warn(
        `No active budget line item found for cost code ${cco.costCodeId} in project ${cco.projectId}`
      );
    }
  }

  async reject(id: string, userId: string, reason: string): Promise<CommitmentChangeOrderResponseDto> {
    this.logger.log(`Rejecting CCO ${id} by user ${userId}`);

    const cco = await this.ccoRepo.findOne({ where: { id } });
    if (!cco) {
      throw new NotFoundException(`CCO with ID ${id} not found`);
    }

    if (cco.status !== CcoStatus.PENDING_APPROVAL) {
      throw new BadRequestException(`Can only reject CCOs in PENDING_APPROVAL status. Current: ${cco.status}`);
    }

    cco.status = CcoStatus.REJECTED;
    cco.rejectedAt = new Date();
    cco.rejectedById = userId;
    cco.rejectionReason = reason;
    cco.approvedAt = undefined;
    cco.approvedById = undefined;

    const updated = await this.ccoRepo.save(cco);
    this.logger.log(`CCO ${id} rejected successfully`);

    return this.toResponseDto(updated);
  }

  async execute(id: string, userId: string): Promise<CommitmentChangeOrderResponseDto> {
    this.logger.log(`Executing CCO ${id} by user ${userId}`);

    const cco = await this.ccoRepo.findOne({ where: { id } });
    if (!cco) {
      throw new NotFoundException(`CCO with ID ${id} not found`);
    }

    if (cco.status !== CcoStatus.APPROVED) {
      throw new BadRequestException(`Can only execute APPROVED CCOs. Current status: ${cco.status}`);
    }

    cco.status = CcoStatus.EXECUTED;
    cco.executedAt = new Date();

    const updated = await this.ccoRepo.save(cco);
    this.logger.log(`CCO ${id} executed successfully`);

    return this.toResponseDto(updated);
  }

  async recalculateTotal(id: string): Promise<CommitmentChangeOrderResponseDto> {
    this.logger.log(`Recalculating total for CCO ${id}`);

    const cco = await this.ccoRepo.findOne({
      where: { id },
      relations: ['lineItems', 'tmEntries'],
    });

    if (!cco) {
      throw new NotFoundException(`CCO with ID ${id} not found`);
    }

    let total = 0;

    if (cco.isTimeAndMaterial && cco.tmEntries) {
      total = cco.tmEntries.reduce((sum, entry) => sum + Number(entry.totalCost), 0);
    } else if (cco.lineItems) {
      total = cco.lineItems.reduce((sum, item) => sum + Number(item.amount), 0);
    }

    cco.amount = total;
    const updated = await this.ccoRepo.save(cco);
    this.logger.log(`CCO ${id} total recalculated: ${total}`);

    return this.toResponseDto(updated);
  }

  private toResponseDto(cco: CommitmentChangeOrder): CommitmentChangeOrderResponseDto {
    return {
      id: cco.id,
      projectId: cco.projectId,
      commitmentId: cco.commitmentId,
      ocoId: cco.ocoId,
      ccoNumber: cco.ccoNumber,
      title: cco.title,
      description: cco.description,
      status: cco.status,
      changeType: cco.changeType,
      amount: Number(cco.amount),
      isTimeAndMaterial: cco.isTimeAndMaterial,
      submittedAt: cco.submittedAt,
      submittedById: cco.submittedById,
      approvedAt: cco.approvedAt,
      approvedById: cco.approvedById,
      rejectedAt: cco.rejectedAt,
      rejectedById: cco.rejectedById,
      rejectionReason: cco.rejectionReason,
      executedAt: cco.executedAt,
      createdAt: cco.createdAt,
      updatedAt: cco.updatedAt,
      createdById: cco.createdById,
    };
  }
}
