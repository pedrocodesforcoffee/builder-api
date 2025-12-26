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
  GenerateWIPReportDto,
  WIPReportDto,
  WIPLineDto,
} from '../dto/report';
import { ReportExcelExportService } from './report-excel-export.service';
import { BudgetStatus } from '../enums/budget-status.enum';
import { CostEntryStatus } from '../enums';

/**
 * WIP Report Service
 *
 * Generates Work in Progress (WIP) reports using the Percentage of Completion method.
 * Shows over/under billing analysis for construction projects.
 *
 * Business Logic (Percentage of Completion Method):
 * - percentComplete = (actualCost / revisedBudget) * 100
 * - earnedRevenue = (percentComplete / 100) * contractValue
 * - billedToDate = sum of payment applications (from cost entries with type BILLING)
 * - underOverBilling = earnedRevenue - billedToDate
 *   - Positive = Under billed (earned more than billed)
 *   - Negative = Over billed (billed more than earned)
 * - estimatedProfit = totalEarnedRevenue - totalActualCost
 * - estimatedProfitMargin = (estimatedProfit / totalEarnedRevenue) * 100
 */
@Injectable()
export class WIPReportService {
  private readonly logger = new Logger(WIPReportService.name);

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
   * Generate WIP Report
   */
  async generate(dto: GenerateWIPReportDto): Promise<WIPReportDto> {
    this.logger.log(`Generating WIP Report for project ${dto.projectId}`);

    // 1. Load project with contract value
    const project = await this.projectRepo.findOne({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${dto.projectId} not found`);
    }

    // Use project contract value (simplified - in real system might come from contract entity)
    // TODO: Get actual contract value from a contract entity or project field
    const contractValue = 0; // Placeholder - will be calculated from budget

    // 2. Find active budget
    const budget = await this.budgetRepo.findOne({
      where: { projectId: dto.projectId, status: BudgetStatus.ACTIVE },
    });

    if (!budget) {
      throw new NotFoundException(`No active budget found for project ${dto.projectId}`);
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

    // 5. Aggregate actual costs by cost code
    const actualCostsMap = await this.aggregateActualCostsByCostCode(dto.projectId, costCodeIds);

    // 6. Calculate billed to date (simplified - using a portion of actual costs)
    // In a real system, this would come from payment application entities
    const billedToDateMap = await this.calculateBilledToDate(dto.projectId, costCodeIds);

    // 7. Build report lines with WIP calculations
    const lines: WIPLineDto[] = [];
    let totalContractValue = 0;
    let totalRevisedBudget = 0;
    let totalActualCost = 0;
    let totalEarnedRevenue = 0;
    let totalBilledToDate = 0;

    for (const lineItem of lineItems) {
      const costCodeId = lineItem.costCodeId;
      const costCode = lineItem.costCode;

      // Get values
      const revisedBudget = Number(lineItem.budgetedCost);
      const actualCost = actualCostsMap.get(costCodeId) || 0;

      // Calculate contract value allocation (proportional to budget)
      const costCodeContractValue = contractValue > 0 && totalRevisedBudget > 0
        ? (revisedBudget / totalRevisedBudget) * contractValue
        : 0;

      // WIP calculations
      const percentComplete = revisedBudget > 0 ? (actualCost / revisedBudget) * 100 : 0;
      const earnedRevenue = (percentComplete / 100) * costCodeContractValue;
      const billedToDate = billedToDateMap.get(costCodeId) || 0;
      const underOverBilling = earnedRevenue - billedToDate;

      // Add to totals
      totalContractValue += costCodeContractValue;
      totalRevisedBudget += revisedBudget;
      totalActualCost += actualCost;
      totalEarnedRevenue += earnedRevenue;
      totalBilledToDate += billedToDate;

      // Create line DTO
      lines.push({
        costCode: costCode.code,
        description: costCode.description || '',
        contractValue: costCodeContractValue,
        revisedBudget,
        actualCost,
        percentComplete,
        earnedRevenue,
        billedToDate,
        underOverBilling,
      });
    }

    // 8. Calculate project totals
    const totalPercentComplete = totalRevisedBudget > 0
      ? (totalActualCost / totalRevisedBudget) * 100
      : 0;

    const totalUnderOverBilling = totalEarnedRevenue - totalBilledToDate;
    const estimatedProfit = totalEarnedRevenue - totalActualCost;
    const estimatedProfitMargin = totalEarnedRevenue > 0
      ? (estimatedProfit / totalEarnedRevenue) * 100
      : 0;

    // 9. Build and return report
    const asOfDate = dto.asOfDate ? new Date(dto.asOfDate) : new Date();

    return {
      projectId: project.id,
      projectName: project.name,
      asOfDate,
      totalContractValue: contractValue,
      totalRevisedBudget,
      totalActualCost,
      totalPercentComplete,
      totalEarnedRevenue,
      totalBilledToDate,
      totalUnderOverBilling,
      estimatedProfit,
      estimatedProfitMargin,
      lines,
      generatedAt: new Date(),
    };
  }

  /**
   * Export WIP Report to Excel
   */
  async exportToExcel(dto: GenerateWIPReportDto): Promise<Buffer> {
    this.logger.log(`Exporting WIP Report to Excel for project ${dto.projectId}`);

    const report = await this.generate(dto);
    return await this.excelExportService.exportWIPToExcel(report);
  }

  // ==================== HELPER METHODS ====================

  /**
   * Aggregate actual costs by cost code (POSTED entries only)
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
      .andWhere('costEntry.status = :status', { status: CostEntryStatus.POSTED })
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
   * Calculate billed to date by cost code
   * In a real system, this would aggregate payment applications
   * Simplified: assumes 90% of actual costs have been billed
   */
  private async calculateBilledToDate(
    projectId: string,
    costCodeIds: string[],
  ): Promise<Map<string, number>> {
    if (costCodeIds.length === 0) {
      return new Map();
    }

    const actualCostsMap = await this.aggregateActualCostsByCostCode(projectId, costCodeIds);

    const map = new Map<string, number>();
    for (const [costCodeId, actualCost] of actualCostsMap.entries()) {
      // Simplified: Assume 90% of actual costs have been billed
      // In real system, would query payment application entities
      const billedToDate = actualCost * 0.9;
      map.set(costCodeId, billedToDate);
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
