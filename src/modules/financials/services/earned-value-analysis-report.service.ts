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
import { BudgetStatus } from '../enums/budget-status.enum';
import { CostEntryStatus } from '../enums';
import {
  EarnedValueAnalysisReportDto,
  EarnedValueAnalysisLineDto,
  EarnedValueMonthlyTrendDto,
} from '../dto/report';
import { ReportExcelExportService } from './report-excel-export.service';
import { ReportPdfExportService } from './report-pdf-export.service';

/**
 * Earned Value Analysis Report Service
 *
 * Generates advanced EVM reports with historical tracking, trend analysis, and forecasting.
 * Goes beyond Cost-to-Complete report by adding time-based schedule variance analysis.
 *
 * Key Features:
 * - Complete EVM metrics (BAC, PV, EV, AC, CV, SV, CPI, SPI, EAC, ETC, VAC, TCPI)
 * - Cost code level breakdown
 * - Monthly trend analysis for charting
 * - Forecast completion date based on current SPI
 */
@Injectable()
export class EarnedValueAnalysisReportService {
  private readonly logger = new Logger(EarnedValueAnalysisReportService.name);

  constructor(
    @InjectRepository(Budget)
    private readonly budgetRepository: Repository<Budget>,
    @InjectRepository(BudgetLineItem)
    private readonly budgetLineItemRepository: Repository<BudgetLineItem>,
    @InjectRepository(CostEntry)
    private readonly costEntryRepository: Repository<CostEntry>,
    @InjectRepository(CostCode)
    private readonly costCodeRepository: Repository<CostCode>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly excelExportService: ReportExcelExportService,
    private readonly pdfExportService: ReportPdfExportService,
  ) {}

  /**
   * Generate Earned Value Analysis Report
   *
   * Calculates comprehensive EVM metrics with monthly trend analysis.
   *
   * @param options Report generation options
   * @returns Earned Value Analysis report data
   * @throws NotFoundException if project or budget not found
   */
  async generate(options: {
    projectId: string;
    budgetId?: string;
    asOfDate?: Date;
  }): Promise<EarnedValueAnalysisReportDto> {
    const { projectId, budgetId, asOfDate = new Date() } = options;

    this.logger.log(`Generating Earned Value Analysis Report for project ${projectId}`);

    // Fetch project
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project not found: ${projectId}`);
    }

    // Fetch budget (specified or active)
    const budget = budgetId
      ? await this.budgetRepository.findOne({
          where: { id: budgetId, projectId },
        })
      : await this.budgetRepository.findOne({
          where: { projectId, status: BudgetStatus.ACTIVE },
        });

    if (!budget) {
      throw new NotFoundException(
        budgetId
          ? `Budget not found: ${budgetId}`
          : `No active budget found for project: ${projectId}`,
      );
    }

    // Fetch budget line items with cost codes
    const lineItems = await this.budgetLineItemRepository.find({
      where: { budgetId: budget.id },
      relations: ['costCode'],
    });

    // Fetch actual costs by cost code
    const actualCostsByCode = await this.getActualCostsByCostCode(
      projectId,
      asOfDate,
    );

    // Calculate planned value based on project timeline
    const plannedValueData = await this.calculatePlannedValue(
      project,
      lineItems,
      asOfDate,
    );

    // Generate cost code level EVM metrics
    const lines: EarnedValueAnalysisLineDto[] = [];
    let totalBAC = 0;
    let totalPV = 0;
    let totalEV = 0;
    let totalAC = 0;

    for (const lineItem of lineItems) {
      const bac = lineItem.budgetedCost;
      const ac = actualCostsByCode.get(lineItem.costCodeId) || 0;

      // Calculate percent complete based on actual cost vs budgeted cost
      const percentComplete = bac > 0 ? Math.min((ac / bac) * 100, 100) : 0;

      // Earned Value = % Complete * BAC
      const ev = (percentComplete / 100) * bac;

      // Planned Value for this cost code (proportional to overall PV)
      const pv = plannedValueData.costCodePV.get(lineItem.costCodeId) || 0;

      // Calculate variances
      const cv = ev - ac;
      const sv = ev - pv;

      // Calculate indices (avoid division by zero)
      const cpi = ac > 0 ? ev / ac : 1.0;
      const spi = pv > 0 ? ev / pv : 1.0;

      // Calculate EAC and ETC
      const eac = cpi > 0 ? bac / cpi : bac;
      const etc = eac - ac;
      const vac = bac - eac;

      lines.push({
        costCode: lineItem.costCode.code,
        description: lineItem.costCode.description || '',
        bac,
        pv,
        ev,
        ac,
        cv,
        sv,
        cpi: Number(cpi.toFixed(4)),
        spi: Number(spi.toFixed(4)),
        eac: Number(eac.toFixed(2)),
        etc: Number(etc.toFixed(2)),
        vac: Number(vac.toFixed(2)),
      });

      totalBAC += bac;
      totalPV += pv;
      totalEV += ev;
      totalAC += ac;
    }

    // Calculate project-level metrics
    const cv = totalEV - totalAC;
    const sv = totalEV - totalPV;
    const cpi = totalAC > 0 ? totalEV / totalAC : 1.0;
    const spi = totalPV > 0 ? totalEV / totalPV : 1.0;
    const eac = cpi > 0 ? totalBAC / cpi : totalBAC;
    const etc = eac - totalAC;
    const vac = totalBAC - eac;
    const workRemaining = totalBAC - totalEV;
    const fundsRemaining = totalBAC - totalAC;
    const tcpi = fundsRemaining > 0 ? workRemaining / fundsRemaining : 1.0;

    // Calculate forecast completion date based on SPI
    const forecastCompletionDate = this.calculateForecastCompletionDate(
      project,
      spi,
      asOfDate,
    );

    // Generate monthly trend data
    const monthlyTrends = await this.generateMonthlyTrends(
      projectId,
      project,
      lineItems,
      asOfDate,
    );

    const report: EarnedValueAnalysisReportDto = {
      projectId: project.id,
      projectName: project.name,
      budgetId: budget.id,
      budgetName: budget.name,
      asOfDate,
      bac: Number(totalBAC.toFixed(2)),
      pv: Number(totalPV.toFixed(2)),
      ev: Number(totalEV.toFixed(2)),
      ac: Number(totalAC.toFixed(2)),
      cv: Number(cv.toFixed(2)),
      sv: Number(sv.toFixed(2)),
      cpi: Number(cpi.toFixed(4)),
      spi: Number(spi.toFixed(4)),
      eac: Number(eac.toFixed(2)),
      etc: Number(etc.toFixed(2)),
      vac: Number(vac.toFixed(2)),
      tcpi: Number(tcpi.toFixed(4)),
      forecastCompletionDate,
      lines,
      monthlyTrends,
      generatedAt: new Date(),
    };

    this.logger.log(`Earned Value Analysis Report generated: CPI=${cpi.toFixed(4)}, SPI=${spi.toFixed(4)}`);

    return report;
  }

  /**
   * Get actual costs grouped by cost code
   *
   * @param projectId Project identifier
   * @param asOfDate Report as-of date
   * @returns Map of cost code ID to total actual cost
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
   * Calculate Planned Value (PV) based on project timeline
   *
   * PV = (daysElapsed / totalProjectDays) * BAC
   *
   * @param project Project entity
   * @param lineItems Budget line items
   * @param asOfDate Report as-of date
   * @returns Planned value data
   */
  private async calculatePlannedValue(
    project: Project,
    lineItems: BudgetLineItem[],
    asOfDate: Date,
  ): Promise<{ totalPV: number; costCodePV: Map<string, number> }> {
    const startDate = project.startDate || new Date();
    const endDate = project.endDate || new Date();

    // Calculate days elapsed and total project days
    const totalDays = Math.max(
      1,
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
    );
    const daysElapsed = Math.min(
      totalDays,
      Math.ceil((asOfDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
    );

    // Calculate percentage of time elapsed
    const percentTimeElapsed = (daysElapsed / totalDays) * 100;

    // Calculate PV for each cost code
    const costCodePV = new Map<string, number>();
    let totalPV = 0;

    for (const lineItem of lineItems) {
      const pv = (percentTimeElapsed / 100) * lineItem.budgetedCost;
      costCodePV.set(lineItem.costCodeId, pv);
      totalPV += pv;
    }

    return { totalPV, costCodePV };
  }

  /**
   * Calculate forecast completion date based on SPI
   *
   * If SPI < 1.0 (behind schedule), extend the completion date
   * If SPI > 1.0 (ahead of schedule), bring forward the completion date
   *
   * @param project Project entity
   * @param spi Schedule Performance Index
   * @param asOfDate Report as-of date
   * @returns Forecast completion date
   */
  private calculateForecastCompletionDate(
    project: Project,
    spi: number,
    asOfDate: Date,
  ): Date | undefined {
    if (!project.endDate || spi <= 0) {
      return undefined;
    }

    const startDate = project.startDate || new Date();
    const plannedEndDate = project.endDate;

    // Calculate days elapsed and remaining
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

    // Forecast remaining days based on SPI
    // If SPI = 0.8 (behind), remaining work will take longer: daysRemaining / 0.8
    // If SPI = 1.2 (ahead), remaining work will finish sooner: daysRemaining / 1.2
    const forecastRemainingDays = daysRemaining / spi;

    // Calculate forecast completion date
    const forecastDate = new Date(asOfDate);
    forecastDate.setDate(forecastDate.getDate() + Math.ceil(forecastRemainingDays));

    return forecastDate;
  }

  /**
   * Generate monthly trend data for charting
   *
   * Calculates PV, EV, AC, CPI, and SPI for each month from project start to as-of date.
   *
   * @param projectId Project identifier
   * @param project Project entity
   * @param lineItems Budget line items
   * @param asOfDate Report as-of date
   * @returns Array of monthly trend data points
   */
  private async generateMonthlyTrends(
    projectId: string,
    project: Project,
    lineItems: BudgetLineItem[],
    asOfDate: Date,
  ): Promise<EarnedValueMonthlyTrendDto[]> {
    const startDate = project.startDate || new Date();
    const trends: EarnedValueMonthlyTrendDto[] = [];

    // Calculate total BAC
    const totalBAC = lineItems.reduce((sum, item) => sum + item.budgetedCost, 0);

    // Generate monthly data points from start date to as-of date
    const currentMonth = new Date(startDate);
    currentMonth.setDate(1); // First day of month

    while (currentMonth <= asOfDate) {
      const monthEnd = new Date(currentMonth);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0); // Last day of month
      monthEnd.setHours(23, 59, 59, 999);

      // Calculate PV for this month
      const pvData = await this.calculatePlannedValue(
        project,
        lineItems,
        monthEnd < asOfDate ? monthEnd : asOfDate,
      );
      const pv = pvData.totalPV;

      // Calculate AC for this month
      const acMap = await this.getActualCostsByCostCode(
        projectId,
        monthEnd < asOfDate ? monthEnd : asOfDate,
      );
      const ac = Array.from(acMap.values()).reduce((sum, val) => sum + val, 0);

      // Calculate EV based on AC (simplified: % complete = AC / BAC)
      const percentComplete = totalBAC > 0 ? Math.min((ac / totalBAC) * 100, 100) : 0;
      const ev = (percentComplete / 100) * totalBAC;

      // Calculate indices
      const cpi = ac > 0 ? ev / ac : 1.0;
      const spi = pv > 0 ? ev / pv : 1.0;

      trends.push({
        month: new Date(currentMonth),
        plannedValue: Number(pv.toFixed(2)),
        earnedValue: Number(ev.toFixed(2)),
        actualCost: Number(ac.toFixed(2)),
        cpi: Number(cpi.toFixed(4)),
        spi: Number(spi.toFixed(4)),
      });

      // Move to next month
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }

    return trends;
  }

  /**
   * Export Earned Value Analysis Report to Excel
   *
   * Generates an Excel file with comprehensive EVM metrics and trend analysis.
   *
   * @param options Report generation options
   * @returns Excel file buffer
   */
  async exportToExcel(options: {
    projectId: string;
    budgetId?: string;
    asOfDate?: Date;
  }): Promise<Buffer> {
    this.logger.log(`Exporting Earned Value Analysis Report to Excel for project ${options.projectId}`);

    // Generate report data
    const reportData = await this.generate(options);

    // Use export service to create Excel file
    const buffer = await this.excelExportService.exportEarnedValueAnalysisToExcel(reportData);

    this.logger.log(`Earned Value Analysis Report exported to Excel successfully`);
    return buffer;
  }

  /**
   * Export Earned Value Analysis Report to PDF
   *
   * Generates a PDF file with comprehensive EVM metrics and trend analysis.
   *
   * @param options Report generation options
   * @returns PDF file buffer
   */
  async exportToPdf(options: {
    projectId: string;
    budgetId?: string;
    asOfDate?: Date;
  }): Promise<Buffer> {
    this.logger.log(`Exporting Earned Value Analysis Report to PDF for project ${options.projectId}`);

    // Generate report data
    const reportData = await this.generate(options);

    // Use export service to create PDF file
    const buffer = await this.pdfExportService.exportEarnedValueAnalysisToPdf(reportData);

    this.logger.log(`Earned Value Analysis Report exported to PDF successfully`);
    return buffer;
  }
}
