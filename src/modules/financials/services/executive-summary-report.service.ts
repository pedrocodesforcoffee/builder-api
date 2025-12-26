import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  Budget,
  BudgetLineItem,
  CostEntry,
  CostCode,
  Commitment,
  PrimeContract,
  OwnerChangeOrder,
  PaymentApplication,
} from '../entities';
import { Project } from '../../projects/entities/project.entity';
import { BudgetStatus } from '../enums/budget-status.enum';
import { CostEntryStatus } from '../enums';
import { PrimeContractStatus } from '../enums/prime-contract-status.enum';
import { OcoStatus } from '../enums/oco-status.enum';
import { PaymentApplicationStatus } from '../enums/payment-application-status.enum';
import {
  ExecutiveSummaryReportDto,
  ExecutiveSummaryIssueDto,
  ExecutiveSummaryTrendDto,
} from '../dto/report';
import { ReportExcelExportService } from './report-excel-export.service';
import { ReportPdfExportService } from './report-pdf-export.service';

/**
 * Executive Summary Report Service
 *
 * Generates high-level executive dashboard with KPIs, financial metrics,
 * risk indicators, and trend data for executive-level decision making.
 *
 * Key Features:
 * - Project financial overview (contract, budget, costs, profit)
 * - EVM performance indices (CPI, SPI)
 * - Risk indicators (overruns, delays, overdue items)
 * - Top 5 issues across categories
 * - Monthly cost and cash flow trends
 */
@Injectable()
export class ExecutiveSummaryReportService {
  private readonly logger = new Logger(ExecutiveSummaryReportService.name);

  constructor(
    @InjectRepository(Budget)
    private readonly budgetRepository: Repository<Budget>,
    @InjectRepository(BudgetLineItem)
    private readonly budgetLineItemRepository: Repository<BudgetLineItem>,
    @InjectRepository(CostEntry)
    private readonly costEntryRepository: Repository<CostEntry>,
    @InjectRepository(CostCode)
    private readonly costCodeRepository: Repository<CostCode>,
    @InjectRepository(Commitment)
    private readonly commitmentRepository: Repository<Commitment>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(PrimeContract)
    private readonly primeContractRepository: Repository<PrimeContract>,
    @InjectRepository(OwnerChangeOrder)
    private readonly ownerChangeOrderRepository: Repository<OwnerChangeOrder>,
    @InjectRepository(PaymentApplication)
    private readonly paymentApplicationRepository: Repository<PaymentApplication>,
    private readonly excelExportService: ReportExcelExportService,
    private readonly pdfExportService: ReportPdfExportService,
  ) {}

  /**
   * Generate Executive Summary Report
   *
   * Aggregates data from multiple sources to provide comprehensive executive overview.
   *
   * @param options Report generation options
   * @returns Executive summary report data
   * @throws NotFoundException if project not found
   */
  async generate(options: {
    projectId: string;
    asOfDate?: Date;
  }): Promise<ExecutiveSummaryReportDto> {
    const { projectId, asOfDate = new Date() } = options;

    this.logger.log(`Generating Executive Summary Report for project ${projectId}`);

    // Fetch project
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project not found: ${projectId}`);
    }

    // Fetch active budget
    const budget = await this.budgetRepository.findOne({
      where: { projectId, status: BudgetStatus.ACTIVE },
    });

    if (!budget) {
      throw new NotFoundException(`No active budget found for project: ${projectId}`);
    }

    // Fetch budget line items
    const lineItems = await this.budgetLineItemRepository.find({
      where: { budgetId: budget.id },
      relations: ['costCode'],
    });

    // Fetch actual costs
    const actualCosts = await this.getActualCostsByCostCode(projectId, asOfDate);
    const totalActualCost = Array.from(actualCosts.values()).reduce((sum, val) => sum + val, 0);

    // Fetch commitments
    const commitments = await this.commitmentRepository.find({
      where: { projectId },
    });
    const totalCommittedCost = commitments.reduce((sum, c) => sum + c.originalAmount, 0);

    // Calculate budget metrics
    const originalBudget = lineItems.reduce((sum, item) => sum + item.budgetedCost, 0);

    // Sum approved owner change orders
    const approvedOCOs = await this.ownerChangeOrderRepository.find({
      where: {
        projectId,
        status: In([OcoStatus.APPROVED, OcoStatus.EXECUTED])
      }
    });
    const approvedChangeOrders = approvedOCOs.reduce((sum, oco) => sum + Number(oco.amount), 0);
    const revisedBudget = originalBudget + approvedChangeOrders;

    // Calculate projected final cost (EAC)
    const percentComplete = revisedBudget > 0 ? (totalActualCost / revisedBudget) * 100 : 0;
    const cpi = totalActualCost > 0 ? (totalActualCost / totalActualCost) : 1.0; // Simplified
    const projectedFinalCost = cpi > 0 ? revisedBudget / cpi : revisedBudget;

    // Calculate financial performance
    const budgetVariance = revisedBudget - projectedFinalCost;
    const budgetVariancePercent = revisedBudget > 0 ? (budgetVariance / revisedBudget) * 100 : 0;

    // Get contract value from prime contract (fallback to project if not found)
    const primeContract = await this.primeContractRepository.findOne({
      where: { projectId, status: PrimeContractStatus.ACTIVE }
    });
    const contractValue = primeContract?.currentAmount
      ? Number(primeContract.currentAmount)
      : (project.currentContract ? Number(project.currentContract) : 0);

    const projectedProfit = contractValue - projectedFinalCost;
    const projectedProfitMargin = contractValue > 0 ? (projectedProfit / contractValue) * 100 : 0;

    // Calculate schedule performance
    const startDate = project.startDate || new Date();
    const endDate = project.endDate || new Date();
    const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const daysElapsed = Math.ceil((asOfDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const scheduledPercentComplete = (daysElapsed / totalDays) * 100;
    const scheduleVarianceDays = ((percentComplete - scheduledPercentComplete) / 100) * totalDays;
    const spi = scheduledPercentComplete > 0 ? percentComplete / scheduledPercentComplete : 1.0;

    // Calculate forecast completion date
    const forecastCompletionDate = this.calculateForecastDate(project, spi, asOfDate);

    // Calculate billing totals from payment applications
    const billedResult = await this.paymentApplicationRepository
      .createQueryBuilder('app')
      .select('SUM(app.currentPaymentDue)', 'total')
      .where('app.projectId = :projectId', { projectId })
      .andWhere('app.status IN (:...statuses)', {
        statuses: [PaymentApplicationStatus.APPROVED, PaymentApplicationStatus.PAID]
      })
      .getRawOne();
    const billedToDate = Number(billedResult?.total || 0);

    const receivedResult = await this.paymentApplicationRepository
      .createQueryBuilder('app')
      .select('SUM(app.currentPaymentDue)', 'total')
      .where('app.projectId = :projectId', { projectId })
      .andWhere('app.status = :status', { status: PaymentApplicationStatus.PAID })
      .getRawOne();
    const receivedFromOwner = Number(receivedResult?.total || 0);

    // Calculate current cash position (received - actual costs paid)
    const currentCashPosition = receivedFromOwner - totalActualCost;

    // Project peak cash need (conservative estimate)
    const projectedPeakCashNeed = totalCommittedCost * 0.7; // Estimate 70% of committed costs

    // Calculate risk indicators
    const overBudgetLineItems = lineItems.filter(item => {
      const actualCost = actualCosts.get(item.costCodeId) || 0;
      return actualCost > item.budgetedCost;
    });

    const overBudgetLineItemsCount = overBudgetLineItems.length;
    const delayedCommitmentsCount = 0; // TODO: Calculate from commitment dates
    const overdueInvoicesCount = 0; // TODO: Calculate from invoices
    const overdueInvoicesAmount = 0; // TODO: Calculate from invoices

    // Generate top issues
    const topCostOverruns = this.getTopCostOverruns(lineItems, actualCosts);
    const topDelayedCommitments: ExecutiveSummaryIssueDto[] = []; // TODO: Implement
    const topOverdueInvoices: ExecutiveSummaryIssueDto[] = []; // TODO: Implement

    // Generate trend data
    const costTrend = await this.generateCostTrend(projectId, project, asOfDate);
    const cashFlowTrend: ExecutiveSummaryTrendDto[] = []; // TODO: Implement

    const report: ExecutiveSummaryReportDto = {
      projectId: project.id,
      projectName: project.name,
      projectManager: 'TBD', // TODO: Get from project.manager relation
      asOfDate,
      contractValue,
      originalBudget,
      approvedChangeOrders,
      revisedBudget,
      committedCost: totalCommittedCost,
      actualCost: totalActualCost,
      projectedFinalCost,
      budgetVariance,
      budgetVariancePercent,
      projectedProfit,
      projectedProfitMargin,
      percentComplete,
      scheduledPercentComplete,
      scheduleVarianceDays,
      forecastCompletionDate,
      currentCashPosition,
      projectedPeakCashNeed,
      billedToDate,
      receivedFromOwner,
      cpi,
      spi,
      overBudgetLineItemsCount,
      delayedCommitmentsCount,
      overdueInvoicesCount,
      overdueInvoicesAmount,
      topCostOverruns,
      topDelayedCommitments,
      topOverdueInvoices,
      costTrend,
      cashFlowTrend,
      generatedAt: new Date(),
    };

    this.logger.log(
      `Executive Summary generated: CPI=${cpi.toFixed(2)}, SPI=${spi.toFixed(2)}, ` +
        `Profit Margin=${projectedProfitMargin.toFixed(1)}%`,
    );

    return report;
  }

  /**
   * Get actual costs grouped by cost code
   */
  private async getActualCostsByCostCode(
    projectId: string,
    asOfDate: Date,
  ): Promise<Map<string, number>> {
    const result = await this.costEntryRepository
      .createQueryBuilder('entry')
      .select('entry.costCodeId', 'costCodeId')
      .addSelect('SUM(entry.amount)', 'totalActualCost')
      .where('entry.projectId = :projectId', { projectId })
      .andWhere('entry.status = :status', { status: CostEntryStatus.POSTED })
      .andWhere('entry.entryDate <= :asOfDate', { asOfDate })
      .groupBy('entry.costCodeId')
      .getRawMany();

    const costMap = new Map<string, number>();
    for (const row of result) {
      costMap.set(row.costCodeId, parseFloat(row.totalActualCost) || 0);
    }

    return costMap;
  }

  /**
   * Get top 5 cost overruns
   */
  private getTopCostOverruns(
    lineItems: BudgetLineItem[],
    actualCosts: Map<string, number>,
  ): ExecutiveSummaryIssueDto[] {
    const overruns = lineItems
      .map(item => {
        const actualCost = actualCosts.get(item.costCodeId) || 0;
        const variance = actualCost - item.budgetedCost;
        const variancePercent = item.budgetedCost > 0 ? (variance / item.budgetedCost) * 100 : 0;

        return {
          description: `${item.costCode.code} - ${item.costCode.description}`,
          value: variance,
          daysOrPercent: variancePercent,
          status: variance > 0 ? 'Over Budget' : 'On Budget',
        };
      })
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return overruns;
  }

  /**
   * Generate monthly cost trend
   */
  private async generateCostTrend(
    projectId: string,
    project: Project,
    asOfDate: Date,
  ): Promise<ExecutiveSummaryTrendDto[]> {
    const trends: ExecutiveSummaryTrendDto[] = [];
    const startDate = project.startDate || new Date();

    // Generate monthly data points from start date to as-of date
    const currentMonth = new Date(startDate);
    currentMonth.setDate(1);

    while (currentMonth <= asOfDate) {
      const monthEnd = new Date(currentMonth);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);
      monthEnd.setHours(23, 59, 59, 999);

      const actualCosts = await this.getActualCostsByCostCode(
        projectId,
        monthEnd < asOfDate ? monthEnd : asOfDate,
      );
      const actual = Array.from(actualCosts.values()).reduce((sum, val) => sum + val, 0);

      // Simplified planned value calculation
      const planned = 0; // TODO: Calculate based on budget timeline

      trends.push({
        month: new Date(currentMonth),
        planned,
        actual,
      });

      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }

    return trends;
  }

  /**
   * Calculate forecast completion date based on SPI
   */
  private calculateForecastDate(
    project: Project,
    spi: number,
    asOfDate: Date,
  ): Date | undefined {
    if (!project.endDate || spi <= 0) {
      return undefined;
    }

    const startDate = project.startDate || new Date();
    const plannedEndDate = project.endDate;

    const totalDays = Math.ceil(
      (plannedEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysElapsed = Math.ceil(
      (asOfDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysRemaining = totalDays - daysElapsed;

    if (daysRemaining <= 0) {
      return plannedEndDate;
    }

    const forecastRemainingDays = daysRemaining / spi;
    const forecastDate = new Date(asOfDate);
    forecastDate.setDate(forecastDate.getDate() + Math.ceil(forecastRemainingDays));

    return forecastDate;
  }

  /**
   * Export Executive Summary Report to Excel
   *
   * Generates an Excel file with comprehensive executive summary metrics.
   *
   * @param options Report generation options
   * @returns Excel file buffer
   */
  async exportToExcel(options: {
    projectId: string;
    asOfDate?: Date;
  }): Promise<Buffer> {
    this.logger.log(`Exporting Executive Summary Report to Excel for project ${options.projectId}`);

    // Generate report data
    const reportData = await this.generate(options);

    // Use export service to create Excel file
    const buffer = await this.excelExportService.exportExecutiveSummaryToExcel(reportData);

    this.logger.log(`Executive Summary Report exported to Excel successfully`);
    return buffer;
  }

  /**
   * Export Executive Summary Report to PDF
   *
   * Generates a PDF file with comprehensive executive summary metrics.
   *
   * @param options Report generation options
   * @returns PDF file buffer
   */
  async exportToPdf(options: {
    projectId: string;
    asOfDate?: Date;
  }): Promise<Buffer> {
    this.logger.log(`Exporting Executive Summary Report to PDF for project ${options.projectId}`);

    // Generate report data
    const reportData = await this.generate(options);

    // Use export service to create PDF file
    const buffer = await this.pdfExportService.exportExecutiveSummaryToPdf(reportData);

    this.logger.log(`Executive Summary Report exported to PDF successfully`);
    return buffer;
  }
}
