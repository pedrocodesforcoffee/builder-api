import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Budget,
  BudgetLineItem,
  CostEntry,
  CostCode,
} from '../entities';
import { Project } from '../../projects/entities/project.entity';
import {
  GenerateBudgetVarianceReportDto,
  BudgetVarianceReportDto,
  BudgetVarianceLineDto,
} from '../dto/report';
import { ReportExcelExportService } from './report-excel-export.service';
import { BudgetStatus } from '../enums/budget-status.enum';
import { CostEntryStatus } from '../enums';

/**
 * Budget Variance Report Service
 *
 * Generates variance-focused reports highlighting items significantly over/under budget.
 *
 * Key Differences from Budget Detail Report:
 * - Focuses on variance metrics and thresholds
 * - Flags cost codes exceeding variance threshold
 * - Categorizes variance status (OVER, UNDER, ON_TARGET)
 * - Counts over/under/on-target items
 * - Simpler than Budget Detail (no commitments, no projections)
 *
 * Business Logic:
 * - budgetedCost = budgetLineItem.budgetedCost
 * - actualCost = sum(POSTED cost entries for cost code)
 * - variance = budgetedCost - actualCost
 * - variancePercent = (variance / budgetedCost) * 100
 * - percentSpent = (actualCost / budgetedCost) * 100
 * - remainingBudget = budgetedCost - actualCost
 * - varianceStatus = OVER if percentSpent > 100, UNDER if variance > threshold, ON_TARGET otherwise
 * - isFlagged = abs(variancePercent) > threshold
 */
@Injectable()
export class BudgetVarianceReportService {
  private readonly logger = new Logger(BudgetVarianceReportService.name);

  constructor(
    @InjectRepository(Budget)
    private budgetRepo: Repository<Budget>,
    @InjectRepository(BudgetLineItem)
    private budgetLineItemRepo: Repository<BudgetLineItem>,
    @InjectRepository(CostEntry)
    private costEntryRepo: Repository<CostEntry>,
    @InjectRepository(CostCode)
    private costCodeRepo: Repository<CostCode>,
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    private excelExportService: ReportExcelExportService,
  ) {}

  /**
   * Generate Budget Variance Report
   */
  async generate(dto: GenerateBudgetVarianceReportDto): Promise<BudgetVarianceReportDto> {
    this.logger.log(`Generating Budget Variance Report for project ${dto.projectId}`);

    // Default variance threshold to 10%
    const varianceThreshold = dto.varianceThreshold ?? 10;

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

    // 5. Aggregate actual costs by cost code (only POSTED entries)
    const actualCostsMap = await this.aggregateActualCostsByCostCode(
      budget.projectId,
      costCodeIds,
      dto.asOfDate ? new Date(dto.asOfDate) : undefined,
    );

    // 6. Build report lines with variance calculations
    const lines: BudgetVarianceLineDto[] = [];
    let totalBudgetedCost = 0;
    let totalActualCost = 0;
    let totalVariance = 0;
    let totalRemainingBudget = 0;
    let overBudgetCount = 0;
    let underBudgetCount = 0;
    let onTargetCount = 0;
    let flaggedCount = 0;

    for (const lineItem of lineItems) {
      const costCodeId = lineItem.costCodeId;
      const costCode = lineItem.costCode;

      // Business logic calculations
      const budgetedCost = Number(lineItem.budgetedCost);
      const actualCost = actualCostsMap.get(costCodeId) || 0;
      const variance = budgetedCost - actualCost;
      const variancePercent = budgetedCost > 0 ? (variance / budgetedCost) * 100 : 0;
      const percentSpent = budgetedCost > 0 ? (actualCost / budgetedCost) * 100 : 0;
      const remainingBudget = variance; // Same as variance

      // Determine variance status
      let varianceStatus: 'OVER' | 'UNDER' | 'ON_TARGET';
      if (percentSpent > 100) {
        varianceStatus = 'OVER';
        overBudgetCount++;
      } else if (Math.abs(variancePercent) > varianceThreshold) {
        // Significantly under budget (variance > threshold)
        varianceStatus = 'UNDER';
        underBudgetCount++;
      } else {
        varianceStatus = 'ON_TARGET';
        onTargetCount++;
      }

      // Flag if variance exceeds threshold
      const isFlagged = Math.abs(variancePercent) > varianceThreshold;
      if (isFlagged) {
        flaggedCount++;
      }

      // Add to totals
      totalBudgetedCost += budgetedCost;
      totalActualCost += actualCost;
      totalVariance += variance;
      totalRemainingBudget += remainingBudget;

      // Create line DTO
      lines.push({
        costCode: costCode.code,
        description: costCode.description || '',
        budgetedCost: Number(budgetedCost.toFixed(2)),
        actualCost: Number(actualCost.toFixed(2)),
        variance: Number(variance.toFixed(2)),
        variancePercent: Number(variancePercent.toFixed(2)),
        percentSpent: Number(percentSpent.toFixed(2)),
        remainingBudget: Number(remainingBudget.toFixed(2)),
        varianceStatus,
        isFlagged,
      });
    }

    // 7. Calculate total metrics
    const totalVariancePercent =
      totalBudgetedCost > 0 ? (totalVariance / totalBudgetedCost) * 100 : 0;
    const totalPercentSpent =
      totalBudgetedCost > 0 ? (totalActualCost / totalBudgetedCost) * 100 : 0;

    // 8. Build and return report
    const asOfDate = dto.asOfDate ? new Date(dto.asOfDate) : new Date();

    return {
      projectId: project.id,
      projectName: project.name,
      budgetId: budget.id,
      budgetName: budget.name,
      asOfDate,
      varianceThreshold,
      totalBudgetedCost: Number(totalBudgetedCost.toFixed(2)),
      totalActualCost: Number(totalActualCost.toFixed(2)),
      totalVariance: Number(totalVariance.toFixed(2)),
      totalVariancePercent: Number(totalVariancePercent.toFixed(2)),
      totalPercentSpent: Number(totalPercentSpent.toFixed(2)),
      totalRemainingBudget: Number(totalRemainingBudget.toFixed(2)),
      overBudgetCount,
      underBudgetCount,
      onTargetCount,
      flaggedCount,
      lines,
      generatedAt: new Date(),
    };
  }

  /**
   * Export Budget Variance Report to Excel
   */
  async exportToExcel(dto: GenerateBudgetVarianceReportDto): Promise<Buffer> {
    this.logger.log(`Exporting Budget Variance Report to Excel for project ${dto.projectId}`);

    const report = await this.generate(dto);
    return await this.excelExportService.exportBudgetVarianceToExcel(report);
  }

  // ==================== HELPER METHODS ====================

  /**
   * Aggregate actual costs by cost code
   * Returns a map of costCodeId -> total actual cost (POSTED entries only)
   */
  private async aggregateActualCostsByCostCode(
    projectId: string,
    costCodeIds: string[],
    asOfDate?: Date,
  ): Promise<Map<string, number>> {
    if (costCodeIds.length === 0) {
      return new Map();
    }

    const queryBuilder = this.costEntryRepo
      .createQueryBuilder('costEntry')
      .select('costEntry.costCodeId', 'costCodeId')
      .addSelect('SUM(costEntry.amount)', 'totalActualCost')
      .where('costEntry.projectId = :projectId', { projectId })
      .andWhere('costEntry.costCodeId IN (:...costCodeIds)', { costCodeIds })
      .andWhere('costEntry.status = :status', { status: CostEntryStatus.POSTED });

    // Apply as-of date filter if provided
    if (asOfDate) {
      queryBuilder.andWhere('costEntry.entryDate <= :asOfDate', { asOfDate });
    }

    const results = await queryBuilder
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
   * Generate report (alias for generate method for controller compatibility)
   */
  async generateReport(dto: any): Promise<any> {
    return this.generate(dto);
  }

}
