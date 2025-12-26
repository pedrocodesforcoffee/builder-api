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
  GenerateCostToCompleteReportDto,
  CostToCompleteReportDto,
  CostToCompleteLineDto,
} from '../dto/report';
import { ReportExcelExportService } from './report-excel-export.service';
import { BudgetStatus } from '../enums/budget-status.enum';
import { CostEntryStatus } from '../enums';

/**
 * Cost to Complete Report Service
 *
 * Generates Estimate at Completion (EAC) and Estimate to Complete (ETC) projections.
 * Uses Earned Value Management (EVM) techniques.
 *
 * Business Logic:
 * - earnedValue = (percentComplete / 100) * revisedBudget
 * - CPI (Cost Performance Index) = earnedValue / actualCost
 * - ETC (Estimate to Complete) = (revisedBudget - earnedValue) / CPI
 * - EAC (Estimate at Completion) = actualCost + ETC
 * - VAC (Variance at Completion) = revisedBudget - EAC
 * - TCPI (To Complete Performance Index) = (revisedBudget - earnedValue) / (revisedBudget - actualCost)
 */
@Injectable()
export class CostToCompleteReportService {
  private readonly logger = new Logger(CostToCompleteReportService.name);

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
   * Generate Cost to Complete Report
   */
  async generate(dto: GenerateCostToCompleteReportDto): Promise<CostToCompleteReportDto> {
    this.logger.log(`Generating Cost to Complete Report for project ${dto.projectId}`);

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

    // 5. Aggregate actual costs by cost code
    const actualCostsMap = await this.aggregateActualCostsByCostCode(dto.projectId, costCodeIds);

    // 6. Build report lines with EAC/ETC calculations
    const lines: CostToCompleteLineDto[] = [];
    let totalRevisedBudget = 0;
    let totalActualCost = 0;
    let totalEarnedValue = 0;
    let totalETC = 0;
    let totalEAC = 0;
    let totalVAC = 0;

    for (const lineItem of lineItems) {
      const costCodeId = lineItem.costCodeId;
      const costCode = lineItem.costCode;

      // Get values
      const revisedBudget = Number(lineItem.budgetedCost);
      const actualCost = actualCostsMap.get(costCodeId) || 0;

      // Calculate percent complete
      const percentComplete = revisedBudget > 0 ? (actualCost / revisedBudget) * 100 : 0;

      // EVM calculations
      const earnedValue = (percentComplete / 100) * revisedBudget;
      const cpi = actualCost > 0 ? earnedValue / actualCost : 1.0;

      // ETC calculation using CPI
      const etc = cpi > 0 ? (revisedBudget - earnedValue) / cpi : (revisedBudget - actualCost);

      // EAC calculation
      const eac = actualCost + etc;

      // VAC calculation
      const vac = revisedBudget - eac;

      // TCPI calculation
      const workRemaining = revisedBudget - earnedValue;
      const fundsRemaining = revisedBudget - actualCost;
      const tcpi = fundsRemaining > 0 ? workRemaining / fundsRemaining : 1.0;

      // Add to totals
      totalRevisedBudget += revisedBudget;
      totalActualCost += actualCost;
      totalEarnedValue += earnedValue;
      totalETC += etc;
      totalEAC += eac;
      totalVAC += vac;

      // Create line DTO
      lines.push({
        costCode: costCode.code,
        description: costCode.description || '',
        revisedBudget,
        actualCost,
        percentComplete,
        earnedValue,
        cpi,
        etc,
        eac,
        vac,
        tcpi,
      });
    }

    // 7. Calculate project totals
    const totalPercentComplete = totalRevisedBudget > 0
      ? (totalActualCost / totalRevisedBudget) * 100
      : 0;

    const overallCPI = totalActualCost > 0 ? totalEarnedValue / totalActualCost : 1.0;

    const totalWorkRemaining = totalRevisedBudget - totalEarnedValue;
    const totalFundsRemaining = totalRevisedBudget - totalActualCost;
    const overallTCPI = totalFundsRemaining > 0 ? totalWorkRemaining / totalFundsRemaining : 1.0;

    // 8. Build and return report
    const asOfDate = dto.asOfDate ? new Date(dto.asOfDate) : new Date();

    return {
      projectId: project.id,
      projectName: project.name,
      budgetId: budget.id,
      budgetName: budget.name,
      asOfDate,
      totalRevisedBudget,
      totalActualCost,
      totalPercentComplete,
      totalEarnedValue,
      overallCPI,
      totalETC,
      totalEAC,
      totalVAC,
      overallTCPI,
      lines,
      generatedAt: new Date(),
    };
  }

  /**
   * Export Cost to Complete Report to Excel
   */
  async exportToExcel(dto: GenerateCostToCompleteReportDto): Promise<Buffer> {
    this.logger.log(`Exporting Cost to Complete Report to Excel for project ${dto.projectId}`);

    const report = await this.generate(dto);
    return await this.excelExportService.exportCostToCompleteToExcel(report);
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
   * Generate report (alias for generate method for controller compatibility)
   */
  async generateReport(dto: any): Promise<any> {
    return this.generate(dto);
  }

}
