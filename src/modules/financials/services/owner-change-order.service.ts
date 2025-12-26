import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import Decimal from 'decimal.js';
import { OwnerChangeOrder } from '../entities/owner-change-order.entity';
import { OcoCostBreakdown } from '../entities/oco-cost-breakdown.entity';
import { PrimeContract } from '../entities/prime-contract.entity';
import { Project } from '../../projects/entities/project.entity';
import { Budget } from '../entities/budget.entity';
import { BudgetLineItem } from '../entities/budget-line-item.entity';
import { OcoStatus } from '../enums/oco-status.enum';
import { BudgetStatus } from '../enums/budget-status.enum';
import { BudgetImpactType } from '../enums/budget-impact-type.enum';
import {
  CreateOwnerChangeOrderDto,
  UpdateOwnerChangeOrderDto,
  OwnerChangeOrderResponseDto,
  OcoCostBreakdownResponseDto,
  UpdateCostBreakdownDto,
} from '../dto';

/**
 * Owner Change Order Service
 *
 * Handles business logic for OCO management including:
 * - CRUD operations
 * - 5-state workflow: DRAFT → PENDING_APPROVAL → APPROVED/REJECTED → EXECUTED
 * - Prime contract amount updates on approval
 * - Cost breakdown management for budget integration
 */
@Injectable()
export class OwnerChangeOrderService {
  private readonly logger = new Logger(OwnerChangeOrderService.name);

  constructor(
    @InjectRepository(OwnerChangeOrder)
    private readonly ocoRepo: Repository<OwnerChangeOrder>,
    @InjectRepository(OcoCostBreakdown)
    private readonly ocoCostBreakdownRepo: Repository<OcoCostBreakdown>,
    @InjectRepository(PrimeContract)
    private readonly primeContractRepo: Repository<PrimeContract>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createDto: CreateOwnerChangeOrderDto): Promise<OwnerChangeOrderResponseDto> {
    this.logger.log(`Creating OCO "${createDto.ocoNumber}" for project ${createDto.projectId}`);

    const project = await this.projectRepo.findOne({
      where: { id: createDto.projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${createDto.projectId} not found`);
    }

    const primeContract = await this.primeContractRepo.findOne({
      where: { id: createDto.primeContractId },
    });
    if (!primeContract) {
      throw new NotFoundException(`Prime contract with ID ${createDto.primeContractId} not found`);
    }

    const existing = await this.ocoRepo.findOne({
      where: { projectId: createDto.projectId, ocoNumber: createDto.ocoNumber },
    });
    if (existing) {
      throw new BadRequestException(`OCO number "${createDto.ocoNumber}" already exists in this project`);
    }

    const oco = this.ocoRepo.create({
      ...createDto,
      status: OcoStatus.DRAFT,
    });

    const saved = await this.ocoRepo.save(oco);
    this.logger.log(`OCO created successfully: ${saved.id}`);

    return this.toResponseDto(saved);
  }

  async findAll(projectId?: string, status?: OcoStatus): Promise<OwnerChangeOrderResponseDto[]> {
    this.logger.log(`Fetching OCOs - projectId: ${projectId}, status: ${status}`);

    const query = this.ocoRepo.createQueryBuilder('oco');

    if (projectId) {
      query.andWhere('oco.project_id = :projectId', { projectId });
    }

    if (status) {
      query.andWhere('oco.status = :status', { status });
    }

    query.orderBy('oco.created_at', 'DESC');

    const ocos = await query.getMany();
    this.logger.log(`Found ${ocos.length} OCOs`);

    return ocos.map((oco) => this.toResponseDto(oco));
  }

  async findOne(id: string): Promise<OwnerChangeOrderResponseDto> {
    this.logger.log(`Fetching OCO by ID: ${id}`);

    const oco = await this.ocoRepo.findOne({
      where: { id },
      relations: ['costBreakdowns'],
    });

    if (!oco) {
      throw new NotFoundException(`OCO with ID ${id} not found`);
    }

    return this.toResponseDto(oco);
  }

  async update(id: string, updateDto: UpdateOwnerChangeOrderDto): Promise<OwnerChangeOrderResponseDto> {
    this.logger.log(`Updating OCO ${id}`);

    const oco = await this.ocoRepo.findOne({ where: { id } });
    if (!oco) {
      throw new NotFoundException(`OCO with ID ${id} not found`);
    }

    if (oco.status === OcoStatus.EXECUTED) {
      throw new BadRequestException('Cannot update an executed OCO');
    }

    if (updateDto.ocoNumber && updateDto.ocoNumber !== oco.ocoNumber) {
      const existing = await this.ocoRepo.findOne({
        where: { projectId: oco.projectId, ocoNumber: updateDto.ocoNumber },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException(`OCO number "${updateDto.ocoNumber}" already exists in this project`);
      }
    }

    Object.assign(oco, updateDto);
    const updated = await this.ocoRepo.save(oco);
    this.logger.log(`OCO ${id} updated successfully`);

    return this.toResponseDto(updated);
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Removing OCO ${id}`);

    const oco = await this.ocoRepo.findOne({ where: { id } });
    if (!oco) {
      throw new NotFoundException(`OCO with ID ${id} not found`);
    }

    if (oco.status === OcoStatus.APPROVED || oco.status === OcoStatus.EXECUTED) {
      throw new BadRequestException('Cannot delete an approved or executed OCO');
    }

    await this.ocoRepo.remove(oco);
    this.logger.log(`OCO ${id} deleted successfully`);
  }

  async submit(id: string, userId: string): Promise<OwnerChangeOrderResponseDto> {
    this.logger.log(`Submitting OCO ${id} by user ${userId}`);

    const oco = await this.ocoRepo.findOne({ where: { id } });
    if (!oco) {
      throw new NotFoundException(`OCO with ID ${id} not found`);
    }

    if (oco.status !== OcoStatus.DRAFT && oco.status !== OcoStatus.REJECTED) {
      throw new BadRequestException(`Can only submit OCOs in DRAFT or REJECTED status. Current: ${oco.status}`);
    }

    oco.status = OcoStatus.PENDING_APPROVAL;
    oco.submittedAt = new Date();
    oco.submittedById = userId;

    const updated = await this.ocoRepo.save(oco);
    this.logger.log(`OCO ${id} submitted successfully`);

    return this.toResponseDto(updated);
  }

  async approve(id: string, userId: string, dto?: { approvedAmount?: number }): Promise<OwnerChangeOrderResponseDto> {
    this.logger.log(`Approving OCO ${id} by user ${userId}`);

    const oco = await this.ocoRepo.findOne({
      where: { id },
      relations: ['primeContract'],
    });

    if (!oco) {
      throw new NotFoundException(`OCO with ID ${id} not found`);
    }

    if (oco.status !== OcoStatus.PENDING_APPROVAL) {
      throw new BadRequestException(`Can only approve OCOs in PENDING_APPROVAL status. Current: ${oco.status}`);
    }

    // Use DataSource transaction for atomic updates
    return await this.dataSource.transaction(async (manager) => {
      // Set approved amount (use provided amount or default to OCO amount)
      oco.approvedAmount = dto?.approvedAmount ?? oco.amount;

      // Update OCO status to APPROVED
      oco.status = OcoStatus.APPROVED;
      oco.approvedAt = new Date();
      oco.approvedById = userId;
      oco.rejectedAt = undefined;
      oco.rejectedById = undefined;
      oco.rejectionReason = undefined;

      const updated = await manager.save(OwnerChangeOrder, oco);

      // CRITICAL INTEGRATION #1: Update PrimeContract.currentAmount
      const primeContract = await manager.findOne(PrimeContract, {
        where: { id: oco.primeContractId },
      });

      if (primeContract) {
        const newAmount = new Decimal(primeContract.currentAmount)
          .plus(oco.approvedAmount)
          .toNumber();
        primeContract.currentAmount = newAmount;
        await manager.save(PrimeContract, primeContract);

        this.logger.log(
          `Prime contract ${primeContract.id} currentAmount updated: ${primeContract.currentAmount} (added ${oco.approvedAmount})`
        );
      }

      // CRITICAL INTEGRATION #3: Update budget impact
      if (oco.budgetImpactType) {
        await this.updateBudgetImpact(manager, oco);
      }

      this.logger.log(`OCO ${id} approved successfully with amount ${oco.approvedAmount}`);

      return this.toResponseDto(updated);
    });
  }

  /**
   * Update budget based on OCO approval and budget impact type
   * CRITICAL: This enables change order impacts to flow through to budget
   */
  private async updateBudgetImpact(
    manager: any,
    oco: OwnerChangeOrder,
  ): Promise<void> {
    // Find active budget for the project
    const budget = await manager.findOne(Budget, {
      where: { projectId: oco.projectId, status: BudgetStatus.ACTIVE },
    });

    if (!budget) {
      this.logger.warn(`No active budget found for project ${oco.projectId}`);
      return;
    }

    const approvedAmount = oco.approvedAmount ?? oco.amount;

    switch (oco.budgetImpactType) {
      case BudgetImpactType.CONTINGENCY:
        // Reduce contingency by OCO approved amount
        const newContingency = new Decimal(budget.contingency)
          .minus(approvedAmount)
          .toNumber();

        if (newContingency < 0) {
          this.logger.warn(
            `OCO ${oco.id} will make contingency negative. Current: ${budget.contingency}, Amount: ${approvedAmount}`
          );
        }

        budget.contingency = newContingency;
        await manager.save(Budget, budget);

        this.logger.log(
          `Budget ${budget.id}: Reduced contingency by ${approvedAmount} (from ${new Decimal(budget.contingency).plus(approvedAmount).toNumber()} to ${budget.contingency})`
        );
        break;

      case BudgetImpactType.LINE_ITEM:
        // Update specific budget line item
        if (oco.budgetLineItemId) {
          const lineItem = await manager.findOne(BudgetLineItem, {
            where: { id: oco.budgetLineItemId },
          });

          if (lineItem) {
            const newBudgetedCost = new Decimal(lineItem.budgetedCost)
              .plus(approvedAmount)
              .toNumber();
            lineItem.budgetedCost = newBudgetedCost;
            await manager.save(BudgetLineItem, lineItem);

            this.logger.log(
              `Budget line item ${lineItem.id}: Increased budgetedCost by ${approvedAmount} to ${newBudgetedCost}`
            );
          } else {
            this.logger.warn(
              `Budget line item ${oco.budgetLineItemId} not found for OCO ${oco.id}`
            );
          }
        } else {
          this.logger.warn(
            `OCO ${oco.id} has LINE_ITEM impact type but no budgetLineItemId specified`
          );
        }
        break;

      case BudgetImpactType.NEW_LINE:
        // Create new budget line item - requires cost code info from cost breakdown
        this.logger.log(
          `OCO ${oco.id}: NEW_LINE budget impact requires cost breakdown to create line items (not yet implemented)`
        );
        break;

      default:
        this.logger.warn(`Unknown budget impact type: ${oco.budgetImpactType}`);
    }
  }

  async reject(id: string, userId: string, reason: string): Promise<OwnerChangeOrderResponseDto> {
    this.logger.log(`Rejecting OCO ${id} by user ${userId}`);

    const oco = await this.ocoRepo.findOne({ where: { id } });
    if (!oco) {
      throw new NotFoundException(`OCO with ID ${id} not found`);
    }

    if (oco.status !== OcoStatus.PENDING_APPROVAL) {
      throw new BadRequestException(`Can only reject OCOs in PENDING_APPROVAL status. Current: ${oco.status}`);
    }

    oco.status = OcoStatus.REJECTED;
    oco.rejectedAt = new Date();
    oco.rejectedById = userId;
    oco.rejectionReason = reason;
    oco.approvedAt = undefined;
    oco.approvedById = undefined;

    const updated = await this.ocoRepo.save(oco);
    this.logger.log(`OCO ${id} rejected successfully`);

    return this.toResponseDto(updated);
  }

  async execute(id: string, userId: string): Promise<OwnerChangeOrderResponseDto> {
    this.logger.log(`Executing OCO ${id} by user ${userId}`);

    const oco = await this.ocoRepo.findOne({ where: { id } });
    if (!oco) {
      throw new NotFoundException(`OCO with ID ${id} not found`);
    }

    if (oco.status !== OcoStatus.APPROVED) {
      throw new BadRequestException(`Can only execute APPROVED OCOs. Current status: ${oco.status}`);
    }

    oco.status = OcoStatus.EXECUTED;
    oco.executedAt = new Date();

    const updated = await this.ocoRepo.save(oco);
    this.logger.log(`OCO ${id} executed successfully`);

    return this.toResponseDto(updated);
  }

  async getCostBreakdown(id: string): Promise<OcoCostBreakdownResponseDto[]> {
    this.logger.log(`Fetching cost breakdown for OCO ${id}`);

    const oco = await this.ocoRepo.findOne({ where: { id } });
    if (!oco) {
      throw new NotFoundException(`OCO with ID ${id} not found`);
    }

    const breakdowns = await this.ocoCostBreakdownRepo.find({
      where: { ocoId: id },
      order: { order: 'ASC' },
    });

    this.logger.log(`Found ${breakdowns.length} cost breakdown items`);

    return breakdowns.map(breakdown => ({
      id: breakdown.id,
      ocoId: breakdown.ocoId,
      costCodeId: breakdown.costCodeId,
      description: breakdown.description,
      amount: Number(breakdown.amount),
      order: breakdown.order,
      createdAt: breakdown.createdAt,
      updatedAt: breakdown.updatedAt,
    }));
  }

  async updateCostBreakdown(
    id: string,
    dto: UpdateCostBreakdownDto,
    userId: string,
  ): Promise<OcoCostBreakdownResponseDto[]> {
    this.logger.log(`Updating cost breakdown for OCO ${id} by user ${userId}`);

    const oco = await this.ocoRepo.findOne({ where: { id } });
    if (!oco) {
      throw new NotFoundException(`OCO with ID ${id} not found`);
    }

    // Only allow updates in DRAFT status
    if (oco.status !== OcoStatus.DRAFT) {
      throw new BadRequestException(
        `Can only update cost breakdown for OCOs in DRAFT status. Current: ${oco.status}`,
      );
    }

    // Delete existing cost breakdown items
    await this.ocoCostBreakdownRepo.delete({ ocoId: id });

    // Create new cost breakdown items
    const newBreakdowns = dto.items.map((item, index) =>
      this.ocoCostBreakdownRepo.create({
        ocoId: id,
        costCodeId: item.costCodeId,
        description: item.description,
        amount: item.amount,
        order: item.order !== undefined ? item.order : index,
      }),
    );

    const saved = await this.ocoCostBreakdownRepo.save(newBreakdowns);

    // Calculate and update OCO total amount
    const totalAmount = saved.reduce(
      (sum, breakdown) => sum + Number(breakdown.amount),
      0,
    );
    oco.amount = totalAmount;
    await this.ocoRepo.save(oco);

    this.logger.log(`Cost breakdown updated successfully: ${saved.length} items, total ${totalAmount}`);

    return saved.map(breakdown => ({
      id: breakdown.id,
      ocoId: breakdown.ocoId,
      costCodeId: breakdown.costCodeId,
      description: breakdown.description,
      amount: Number(breakdown.amount),
      order: breakdown.order,
      createdAt: breakdown.createdAt,
      updatedAt: breakdown.updatedAt,
    }));
  }

  private toResponseDto(oco: OwnerChangeOrder): OwnerChangeOrderResponseDto {
    return {
      id: oco.id,
      projectId: oco.projectId,
      primeContractId: oco.primeContractId,
      pcoId: oco.pcoId,
      ocoNumber: oco.ocoNumber,
      title: oco.title,
      description: oco.description,
      status: oco.status,
      changeType: oco.changeType,
      priority: oco.priority,
      amount: Number(oco.amount),
      reason: oco.reason,
      scheduleImpactDays: oco.scheduleImpactDays,
      submittedAt: oco.submittedAt,
      submittedById: oco.submittedById,
      approvedAt: oco.approvedAt,
      approvedById: oco.approvedById,
      rejectedAt: oco.rejectedAt,
      rejectedById: oco.rejectedById,
      rejectionReason: oco.rejectionReason,
      executedAt: oco.executedAt,
      createdAt: oco.createdAt,
      updatedAt: oco.updatedAt,
      createdById: oco.createdById,
    };
  }
}
