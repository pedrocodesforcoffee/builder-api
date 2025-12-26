import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Budget,
  BudgetLineItem,
  CostEntry,
  CostCode,
  Commitment,
  CommitmentChangeOrder,
} from '../entities';
import { Project } from '../../projects/entities/project.entity';
import {
  GenerateBudgetDetailReportDto,
  BudgetDetailReportDto,
  BudgetDetailLineDto,
} from '../dto/report';
import { ReportExcelExportService } from './report-excel-export.service';
import { BudgetStatus } from '../enums/budget-status.enum';
import { CostEntryStatus } from '../enums';

/**
 * Budget Detail Report Service
 *
 * Generates comprehensive budget variance analysis reports with:
 * - Original budget vs revised budget (with change orders)
 * - Actual costs vs budgeted costs
 * - Variance analysis
 * - Percent complete calculations
 * - Projected final costs and variances
 *
 * Business Logic:
 * - originalBudget = budgetLineItem.budgetedCost (initial)
 * - changeOrders = sum(approved change orders for cost code)
 * - revisedBudget = originalBudget + changeOrders
 * - committedCost = sum(commitments for cost code)
 * - actualCost = sum(POSTED cost entries for cost code)
 * - variance = revisedBudget - actualCost
 * - percentComplete = (actualCost / revisedBudget) * 100
 * - costToComplete = committedCost - actualCost
 * - projectedFinalCost = actualCost + costToComplete
 * - projectedVariance = revisedBudget - projectedFinalCost
 */
@Injectable()
export class BudgetDetailReportService {
  private readonly logger = new Logger(BudgetDetailReportService.name);

  constructor(
    @InjectRepository(Budget)
    private budgetRepo: Repository<Budget>,
    @InjectRepository(BudgetLineItem)
    private budgetLineItemRepo: Repository<BudgetLineItem>,
    @InjectRepository(CostEntry)
    private costEntryRepo: Repository<CostEntry>,
    @InjectRepository(CostCode)
    private costCodeRepo: Repository<CostCode>,
    @InjectRepository(Commitment)
    private commitmentRepo: Repository<Commitment>,
    @InjectRepository(CommitmentChangeOrder)
    private changeOrderRepo: Repository<CommitmentChangeOrder>,
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    private excelExportService: ReportExcelExportService,
  ) {}

  /**
   * Generate Budget Detail Report
   */
  async generate(dto: GenerateBudgetDetailReportDto): Promise<BudgetDetailReportDto> {
    this.logger.log(`Generating Budget Detail Report for project ${dto.projectId}`);

    // 1. Load project
    const project = await this.projectRepo.findOne({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${dto.projectId} not found`);
    }

    // 2. Load budget (use specified budget or find active budget)
    let budget: Budget | null;
    if (dto.budgetId) {
      budget = await this.budgetRepo.findOne({
        where: { id: dto.budgetId, projectId: dto.projectId },
      });

      if (!budget) {
        throw new NotFoundException(`Budget ${dto.budgetId} not found`);
      }
    } else {
      // Find active budget
      budget = await this.budgetRepo.findOne({
        where: { projectId: dto.projectId, status: BudgetStatus.ACTIVE },
      });

      if (!budget) {
        throw new NotFoundException(`No active budget found for project ${dto.projectId}`);
      }
    }

    // 3. Load budget line items with cost codes
    const lineItems = await this.budgetLineItemRepo.find({
      where: { budgetId: budget.id },
      relations: ['costCode'],
      order: { costCode: { code: 'ASC' } },
    });

    if (lineItems.length === 0) {
      this.logger.warn(`Budget ${budget.id} has no line items`);
    }

    // 4. Get cost code IDs
    const costCodeIds = lineItems.map((item) => item.costCodeId);

    // 5. Aggregate change orders by cost code
    const changeOrdersMap = await this.aggregateChangeOrdersByCostCode(budget.projectId, costCodeIds);

    // 6. Aggregate cost entries by cost code (only POSTED entries)
    const actualCostsMap = await this.aggregateActualCostsByCostCode(budget.projectId, costCodeIds);

    // 7. Aggregate commitments by cost code
    const committedCostsMap = await this.aggregateCommittedCostsByCostCode(budget.projectId, costCodeIds);

    // 8. Build report lines with calculations
    const lines: BudgetDetailLineDto[] = [];
    let totalOriginalBudget = 0;
    let totalChangeOrders = 0;
    let totalRevisedBudget = 0;
    let totalCommittedCost = 0;
    let totalActualCost = 0;
    let totalVariance = 0;
    let totalCostToComplete = 0;
    let totalProjectedFinalCost = 0;
    let totalProjectedVariance = 0;

    for (const lineItem of lineItems) {
      const costCodeId = lineItem.costCodeId;
      const costCode = lineItem.costCode;

      // Business logic calculations
      const originalBudget = Number(lineItem.budgetedCost);
      const changeOrders = changeOrdersMap.get(costCodeId) || 0;
      const revisedBudget = originalBudget + changeOrders;
      const committedCost = committedCostsMap.get(costCodeId) || 0;
      const actualCost = actualCostsMap.get(costCodeId) || 0;
      const variance = revisedBudget - actualCost;
      const percentComplete = revisedBudget > 0 ? (actualCost / revisedBudget) * 100 : 0;
      const costToComplete = committedCost - actualCost;
      const projectedFinalCost = actualCost + costToComplete;
      const projectedVariance = revisedBudget - projectedFinalCost;

      // Add to totals
      totalOriginalBudget += originalBudget;
      totalChangeOrders += changeOrders;
      totalRevisedBudget += revisedBudget;
      totalCommittedCost += committedCost;
      totalActualCost += actualCost;
      totalVariance += variance;
      totalCostToComplete += costToComplete;
      totalProjectedFinalCost += projectedFinalCost;
      totalProjectedVariance += projectedVariance;

      // Create line DTO
      lines.push({
        costCode: costCode.code,
        description: costCode.description || '',
        originalBudget,
        changeOrders,
        revisedBudget,
        committedCost,
        actualCost,
        variance,
        percentComplete,
        costToComplete,
        projectedFinalCost,
        projectedVariance,
      });
    }

    // 9. Calculate total percent complete
    const totalPercentComplete = totalRevisedBudget > 0 ? (totalActualCost / totalRevisedBudget) * 100 : 0;

    // 10. Build and return report
    const asOfDate = dto.asOfDate ? new Date(dto.asOfDate) : new Date();

    return {
      projectId: project.id,
      projectName: project.name,
      budgetId: budget.id,
      budgetName: budget.name,
      asOfDate,
      totalOriginalBudget,
      totalChangeOrders,
      totalRevisedBudget,
      totalCommittedCost,
      totalActualCost,
      totalVariance,
      totalPercentComplete,
      totalCostToComplete,
      totalProjectedFinalCost,
      totalProjectedVariance,
      lines,
      generatedAt: new Date(),
    };
  }

  /**
   * Export Budget Detail Report to Excel
   */
  async exportToExcel(dto: GenerateBudgetDetailReportDto): Promise<Buffer> {
    this.logger.log(`Exporting Budget Detail Report to Excel for project ${dto.projectId}`);

    const report = await this.generate(dto);
    return await this.excelExportService.exportBudgetDetailToExcel(report);
  }

  // ==================== HELPER METHODS ====================

  /**
   * Aggregate change orders by cost code
   * Returns a map of costCodeId -> total change order amount
   */
  private async aggregateChangeOrdersByCostCode(
    projectId: string,
    costCodeIds: string[],
  ): Promise<Map<string, number>> {
    if (costCodeIds.length === 0) {
      return new Map();
    }

    const results = await this.changeOrderRepo
      .createQueryBuilder('changeOrder')
      .select('changeOrder.costCodeId', 'costCodeId')
      .addSelect('SUM(changeOrder.amount)', 'totalChangeOrders')
      .where('changeOrder.projectId = :projectId', { projectId })
      .andWhere('changeOrder.costCodeId IN (:...costCodeIds)', { costCodeIds })
      .andWhere('changeOrder.status = :status', { status: 'APPROVED' }) // Only approved change orders
      .groupBy('changeOrder.costCodeId')
      .getRawMany();

    const map = new Map<string, number>();
    for (const result of results) {
      const costCodeId = result.costCodeId;
      const totalChangeOrders = Number(result.totalChangeOrders) || 0;
      map.set(costCodeId, totalChangeOrders);
    }

    return map;
  }

  /**
   * Aggregate actual costs by cost code
   * Returns a map of costCodeId -> total actual cost (POSTED entries only)
   */
  private async aggregateActualCostsByCostCode(
    projectId: string,
    costCodeIds: string[],
  ): Promise<Map<string, number>> {
    if (costCodeIds.length === 0) {
      return new Map();
    }

    const results = await this.costEntryRepo
      .createQueryBuilder('costEntry')
      .select('costEntry.costCodeId', 'costCodeId')
      .addSelect('SUM(costEntry.amount)', 'totalActualCost')
      .where('costEntry.projectId = :projectId', { projectId })
      .andWhere('costEntry.costCodeId IN (:...costCodeIds)', { costCodeIds })
      .andWhere('costEntry.status = :status', { status: CostEntryStatus.POSTED }) // Only POSTED entries
      .groupBy('costEntry.costCodeId')
      .getRawMany();

    const map = new Map<string, number>();
    for (const result of results) {
      const costCodeId = result.costCodeId;
      const totalActualCost = Number(result.totalActualCost) || 0;
      map.set(costCodeId, totalActualCost);
    }

    return map;
  }

  /**
   * Aggregate committed costs by cost code
   * Returns a map of costCodeId -> total committed cost
   */
  private async aggregateCommittedCostsByCostCode(
    projectId: string,
    costCodeIds: string[],
  ): Promise<Map<string, number>> {
    if (costCodeIds.length === 0) {
      return new Map();
    }

    const results = await this.commitmentRepo
      .createQueryBuilder('commitment')
      .select('commitment.costCodeId', 'costCodeId')
      .addSelect('SUM(commitment.revisedAmount)', 'totalCommittedCost')
      .where('commitment.projectId = :projectId', { projectId })
      .andWhere('commitment.costCodeId IN (:...costCodeIds)', { costCodeIds })
      .andWhere('commitment.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: ['CANCELLED', 'REJECTED'],
      })
      .groupBy('commitment.costCodeId')
      .getRawMany();

    const map = new Map<string, number>();
    for (const result of results) {
      const costCodeId = result.costCodeId;
      const totalCommittedCost = Number(result.totalCommittedCost) || 0;
      map.set(costCodeId, totalCommittedCost);
    }

    return map;
  }

  /**
   * Generate report (alias for generate method for controller compatibility)
   */
  async generateReport(dto: any): Promise<any> {
    return this.generate(dto);
  }

}
