import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentApplication } from '../entities/payment-application.entity';
import { PaymentApplicationItem } from '../entities/payment-application-item.entity';
import { ScheduleOfValues } from '../entities/schedule-of-values.entity';
import { ScheduleOfValuesItem } from '../entities/schedule-of-values-item.entity';
import { Commitment } from '../entities/commitment.entity';
import { BudgetLineItem } from '../entities/budget-line-item.entity';
import { PaymentApplicationStatus } from '../enums/payment-application-status.enum';
import { BudgetStatus } from '../enums/budget-status.enum';
import {
  CreatePaymentApplicationDto,
  PaymentApplicationResponseDto,
  PaymentApplicationItemResponseDto,
  SubmitPaymentApplicationDto,
  ApprovePaymentApplicationDto,
  RejectPaymentApplicationDto,
  MarkPaymentApplicationPaidDto,
} from '../dto';
import { plainToInstance } from 'class-transformer';

/**
 * Service for managing Payment Applications (AIA G702/G703)
 *
 * Implements 7-state workflow:
 * DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED → PAID → VOID
 *
 * Handles cumulative calculations, retainage tracking, and integrations
 * with commitment invoicing and budget actual costs.
 */
@Injectable()
export class PaymentApplicationService {
  private readonly logger = new Logger(PaymentApplicationService.name);

  constructor(
    @InjectRepository(PaymentApplication)
    private readonly payAppRepository: Repository<PaymentApplication>,
    @InjectRepository(PaymentApplicationItem)
    private readonly payAppItemRepository: Repository<PaymentApplicationItem>,
    @InjectRepository(ScheduleOfValues)
    private readonly sovRepository: Repository<ScheduleOfValues>,
    @InjectRepository(ScheduleOfValuesItem)
    private readonly sovItemRepository: Repository<ScheduleOfValuesItem>,
    @InjectRepository(Commitment)
    private readonly commitmentRepository: Repository<Commitment>,
    @InjectRepository(BudgetLineItem)
    private readonly budgetLineItemRepository: Repository<BudgetLineItem>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a new Payment Application (DRAFT status)
   *
   * Calculates cumulative totals based on previous payment applications
   */
  async create(
    projectId: string,
    dto: CreatePaymentApplicationDto,
    userId: string,
  ): Promise<PaymentApplicationResponseDto> {
    this.logger.log(
      `Creating payment application for SOV ${dto.sovId} in project ${projectId}`,
    );

    // Validate SOV exists and belongs to project
    const sov = await this.sovRepository.findOne({
      where: { id: dto.sovId, projectId },
      relations: ['commitment', 'items'],
    });

    if (!sov) {
      throw new NotFoundException(
        `Schedule of Values ${dto.sovId} not found in project ${projectId}`,
      );
    }

    // Validate all items reference valid SOV items
    const sovItemIds = sov.items?.map((item) => item.id) || [];
    for (const itemDto of dto.items) {
      if (!sovItemIds.includes(itemDto.sovItemId)) {
        throw new BadRequestException(
          `SOV item ${itemDto.sovItemId} not found in SOV ${dto.sovId}`,
        );
      }
    }

    // Get previous payment applications for cumulative calculations
    const previousPayApps = await this.payAppRepository.find({
      where: {
        sovId: dto.sovId,
        status: PaymentApplicationStatus.APPROVED,
      },
      relations: ['items'],
      order: { applicationNumber: 'DESC' },
    });

    const nextApplicationNumber = previousPayApps.length + 1;

    // Calculate retainage percent (use provided value or default to 0)
    const retainagePercent = dto.retainagePercent ?? 0;

    return await this.dataSource.transaction(async (manager) => {
      // Create payment application
      const payApp = manager.create(PaymentApplication, {
        sovId: dto.sovId,
        commitmentId: sov.commitmentId,
        projectId,
        applicationNumber: nextApplicationNumber,
        applicationDate: new Date(dto.applicationDate),
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        status: PaymentApplicationStatus.DRAFT,
        retainagePercent,
        totalCompletedAndStored: 0, // Will calculate below
        retainageAmount: 0,
        totalEarnedLessRetainage: 0,
        previousPayments: 0,
        currentPaymentDue: 0,
        balanceToFinish: 0,
        hasConditionalWaiver: false,
        hasUnconditionalWaiver: false,
      });

      const savedPayApp = await manager.save(PaymentApplication, payApp);

      // Create payment application items with cumulative calculations
      const payAppItems = [];
      let totalCompletedAndStored = 0;

      for (const itemDto of dto.items) {
        const sovItem = sov.items?.find((i) => i.id === itemDto.sovItemId);

        if (!sovItem) {
          throw new BadRequestException(
            `SOV item ${itemDto.sovItemId} not found in schedule of values`,
          );
        }

        // Get previous totals for this SOV item from all approved pay apps
        const previousTotal = this.calculatePreviousTotals(
          previousPayApps,
          itemDto.sovItemId,
        );

        // Calculate cumulative work completed
        const totalWorkCompleted =
          previousTotal.workCompleted + itemDto.workCompletedThisPeriod;

        // Calculate cumulative materials stored
        const totalMaterialsStored =
          previousTotal.materialsStored + itemDto.materialsStoredThisPeriod;

        // Total completed and stored for this item
        const itemTotalCompletedAndStored =
          totalWorkCompleted + totalMaterialsStored;

        // Calculate percent complete
        const percentComplete =
          sovItem.scheduledValue > 0
            ? (itemTotalCompletedAndStored / sovItem.scheduledValue) * 100
            : 0;

        // Balance to finish
        const balanceToFinish =
          sovItem.scheduledValue - itemTotalCompletedAndStored;

        const payAppItem = manager.create(PaymentApplicationItem, {
          paymentApplicationId: savedPayApp.id,
          sovItemId: itemDto.sovItemId,
          lineNumber: sovItem.lineNumber,
          description: sovItem.description,
          scheduledValue: sovItem.scheduledValue,
          workCompletedThisPeriod: itemDto.workCompletedThisPeriod,
          materialsStoredThisPeriod: itemDto.materialsStoredThisPeriod,
          totalWorkCompleted,
          totalMaterialsStored,
          totalCompletedAndStored: itemTotalCompletedAndStored,
          percentComplete: Math.min(percentComplete, 100), // Cap at 100%
          balanceToFinish,
        });

        payAppItems.push(payAppItem);
        totalCompletedAndStored += itemTotalCompletedAndStored;
      }

      const savedItems = await manager.save(PaymentApplicationItem, payAppItems);

      // Calculate AIA G702 totals
      const retainageAmount = (totalCompletedAndStored * retainagePercent) / 100;
      const totalEarnedLessRetainage = totalCompletedAndStored - retainageAmount;

      // Sum of all previously approved current payment due amounts
      const previousPayments = previousPayApps.reduce(
        (sum, pa) => sum + pa.currentPaymentDue,
        0,
      );

      const currentPaymentDue = totalEarnedLessRetainage - previousPayments;

      // Calculate total scheduled value from SOV items
      const totalScheduledValue = sov.items?.reduce((sum, item) => sum + item.scheduledValue, 0) || 0;
      const balanceToFinish = totalScheduledValue - totalCompletedAndStored;

      // Update payment application with calculated totals
      savedPayApp.totalCompletedAndStored = totalCompletedAndStored;
      savedPayApp.retainageAmount = retainageAmount;
      savedPayApp.totalEarnedLessRetainage = totalEarnedLessRetainage;
      savedPayApp.previousPayments = previousPayments;
      savedPayApp.currentPaymentDue = currentPaymentDue;

      await manager.save(PaymentApplication, savedPayApp);

      this.logger.log(
        `Created payment application ${savedPayApp.id} #${nextApplicationNumber} with ${savedItems.length} items`,
      );

      return this.toResponseDto(savedPayApp, savedItems);
    });
  }

  /**
   * Submit payment application for review (DRAFT → SUBMITTED)
   */
  async submit(
    projectId: string,
    payAppId: string,
    dto: SubmitPaymentApplicationDto,
    userId: string,
  ): Promise<PaymentApplicationResponseDto> {
    const payApp = await this.findPayAppOrFail(projectId, payAppId);

    if (payApp.status !== PaymentApplicationStatus.DRAFT) {
      throw new BadRequestException(
        `Payment application must be in DRAFT status to submit (current: ${payApp.status})`,
      );
    }

    payApp.status = PaymentApplicationStatus.SUBMITTED;
    payApp.submittedById = userId;
    payApp.submittedAt = new Date();

    const updated = await this.payAppRepository.save(payApp);

    this.logger.log(`Submitted payment application ${payAppId}`);

    return this.toResponseDto(updated);
  }

  /**
   * Approve payment application (UNDER_REVIEW → APPROVED)
   *
   * Updates commitment.invoicedAmount and budget actualCost
   */
  async approve(
    projectId: string,
    payAppId: string,
    dto: ApprovePaymentApplicationDto,
    userId: string,
  ): Promise<PaymentApplicationResponseDto> {
    const payApp = await this.findPayAppOrFail(projectId, payAppId, [
      'items',
      'items.sovItem',
      'items.sovItem.costCode',
      'commitment',
      'commitment.project',
    ]);

    if (payApp.status !== PaymentApplicationStatus.UNDER_REVIEW) {
      throw new BadRequestException(
        `Payment application must be in UNDER_REVIEW status to approve (current: ${payApp.status})`,
      );
    }

    return await this.dataSource.transaction(async (manager) => {
      // Update payment application status
      payApp.status = PaymentApplicationStatus.APPROVED;
      payApp.approvedById = userId;
      payApp.approvedAt = new Date();

      const updated = await manager.save(PaymentApplication, payApp);

      // Update commitment invoiced amount
      const commitment = payApp.commitment;
      commitment.invoicedAmount += payApp.currentPaymentDue;
      await manager.save(Commitment, commitment);

      // Update budget actual costs via cost code mapping
      for (const item of payApp.items || []) {
        const costCodeId = item.sovItem.costCodeId;

        // Find budget line item for this cost code
        const budgetLineItem = await manager.findOne(BudgetLineItem, {
          where: {
            costCodeId,
            budget: { projectId, status: BudgetStatus.ACTIVE },
          },
          relations: ['budget'],
        });

        if (budgetLineItem) {
          // Add this period's work to actual cost
          const thisPeriodCost =
            item.workCompletedThisPeriod + item.materialsStoredThisPeriod;
          budgetLineItem.actualCost += thisPeriodCost;
          await manager.save(BudgetLineItem, budgetLineItem);

          this.logger.debug(
            `Updated budget line item ${budgetLineItem.id} actual cost by $${thisPeriodCost.toFixed(2)}`,
          );
        }
      }

      this.logger.log(
        `Approved payment application ${payAppId}, updated commitment and budget`,
      );

      // Emit event for QuickBooks sync
      this.eventEmitter.emit('payment-application.approved', {
        paymentApplicationId: updated.id,
        commitmentId: updated.commitmentId,
        organizationId: commitment.project?.organizationId,
        projectId: updated.projectId,
        approvedById: updated.approvedById,
        approvedAt: updated.approvedAt,
        totalEarnedLessRetainage: updated.totalEarnedLessRetainage,
        currentPaymentDue: updated.currentPaymentDue,
      });

      return this.toResponseDto(updated, payApp.items);
    });
  }

  /**
   * Reject payment application (UNDER_REVIEW → REJECTED)
   */
  async reject(
    projectId: string,
    payAppId: string,
    dto: RejectPaymentApplicationDto,
    userId: string,
  ): Promise<PaymentApplicationResponseDto> {
    const payApp = await this.findPayAppOrFail(projectId, payAppId);

    if (payApp.status !== PaymentApplicationStatus.UNDER_REVIEW) {
      throw new BadRequestException(
        `Payment application must be in UNDER_REVIEW status to reject (current: ${payApp.status})`,
      );
    }

    payApp.status = PaymentApplicationStatus.REJECTED;
    payApp.rejectedById = userId;
    payApp.rejectedAt = new Date();
    payApp.rejectionReason = dto.reason;

    const updated = await this.payAppRepository.save(payApp);

    this.logger.log(`Rejected payment application ${payAppId}`);

    return this.toResponseDto(updated);
  }

  /**
   * Mark payment application as paid (APPROVED → PAID)
   *
   * Updates commitment.paidAmount
   */
  async markPaid(
    projectId: string,
    payAppId: string,
    dto: MarkPaymentApplicationPaidDto,
    userId: string,
  ): Promise<PaymentApplicationResponseDto> {
    const payApp = await this.findPayAppOrFail(projectId, payAppId, [
      'commitment',
      'commitment.project',
    ]);

    if (payApp.status !== PaymentApplicationStatus.APPROVED) {
      throw new BadRequestException(
        `Payment application must be in APPROVED status to mark as paid (current: ${payApp.status})`,
      );
    }

    return await this.dataSource.transaction(async (manager) => {
      // Update payment application status
      payApp.status = PaymentApplicationStatus.PAID;
      payApp.paidById = userId;
      payApp.paidAt = new Date(dto.paidDate);

      const updated = await manager.save(PaymentApplication, payApp);

      // Update commitment paid amount
      const commitment = payApp.commitment;
      commitment.paidAmount += payApp.currentPaymentDue;
      await manager.save(Commitment, commitment);

      this.logger.log(`Marked payment application ${payAppId} as paid`);

      // Emit event for QuickBooks sync
      this.eventEmitter.emit('payment-application.paid', {
        paymentApplicationId: updated.id,
        commitmentId: updated.commitmentId,
        organizationId: commitment.project?.organizationId,
        projectId: updated.projectId,
        paidById: updated.paidById,
        paidAt: updated.paidAt,
        currentPaymentDue: updated.currentPaymentDue,
      });

      return this.toResponseDto(updated);
    });
  }

  /**
   * Find payment application by ID
   */
  async findOne(
    projectId: string,
    payAppId: string,
    includeItems = false,
  ): Promise<PaymentApplicationResponseDto> {
    const relations = includeItems ? ['items'] : [];
    const payApp = await this.findPayAppOrFail(projectId, payAppId, relations);
    return this.toResponseDto(payApp, payApp.items);
  }

  /**
   * Get all payment applications for a project
   */
  async findAll(
    projectId: string,
    includeItems = false,
  ): Promise<PaymentApplicationResponseDto[]> {
    const queryBuilder = this.payAppRepository
      .createQueryBuilder('pa')
      .where('pa.project_id = :projectId', { projectId })
      .orderBy('pa.application_number', 'DESC');

    if (includeItems) {
      queryBuilder.leftJoinAndSelect('pa.items', 'items');
    }

    const payApps = await queryBuilder.getMany();

    return payApps.map((pa) => this.toResponseDto(pa, pa.items));
  }

  /**
   * Get all payment applications for a commitment
   */
  async findByCommitment(
    projectId: string,
    commitmentId: string,
    includeItems = false,
  ): Promise<PaymentApplicationResponseDto[]> {
    const queryBuilder = this.payAppRepository
      .createQueryBuilder('pa')
      .where('pa.commitment_id = :commitmentId', { commitmentId })
      .andWhere('pa.project_id = :projectId', { projectId })
      .orderBy('pa.application_number', 'DESC');

    if (includeItems) {
      queryBuilder.leftJoinAndSelect('pa.items', 'items');
    }

    const payApps = await queryBuilder.getMany();

    return payApps.map((pa) => this.toResponseDto(pa, pa.items));
  }

  /**
   * Helper: Find payment application or throw NotFoundException
   */
  private async findPayAppOrFail(
    projectId: string,
    payAppId: string,
    relations: string[] = [],
  ): Promise<PaymentApplication> {
    const payApp = await this.payAppRepository.findOne({
      where: { id: payAppId, projectId },
      relations,
    });

    if (!payApp) {
      throw new NotFoundException(
        `Payment application ${payAppId} not found in project ${projectId}`,
      );
    }

    return payApp;
  }

  /**
   * Helper: Calculate previous cumulative totals for an SOV item
   */
  private calculatePreviousTotals(
    previousPayApps: PaymentApplication[],
    sovItemId: string,
  ): { workCompleted: number; materialsStored: number } {
    let workCompleted = 0;
    let materialsStored = 0;

    for (const payApp of previousPayApps) {
      const item = payApp.items?.find((i) => i.sovItemId === sovItemId);
      if (item) {
        workCompleted += item.workCompletedThisPeriod;
        materialsStored += item.materialsStoredThisPeriod;
      }
    }

    return { workCompleted, materialsStored };
  }

  /**
   * Convert entity to response DTO
   */
  private toResponseDto(
    payApp: PaymentApplication,
    items?: PaymentApplicationItem[],
  ): PaymentApplicationResponseDto {
    const dto = plainToInstance(PaymentApplicationResponseDto, payApp, {
      excludeExtraneousValues: true,
    });

    if (items) {
      dto.items = items.map((item) =>
        plainToInstance(PaymentApplicationItemResponseDto, item, {
          excludeExtraneousValues: true,
        }),
      );
    }

    return dto;
  }
}
