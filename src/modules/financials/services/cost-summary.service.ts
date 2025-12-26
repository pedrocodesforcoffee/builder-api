import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CostEntry } from '../entities/cost-entry.entity';
import { CostTransfer } from '../entities/cost-transfer.entity';
import { Accrual } from '../entities/accrual.entity';
import { Budget } from '../entities/budget.entity';
import { BudgetLineItem } from '../entities/budget-line-item.entity';
import { CostPeriod } from '../entities/cost-period.entity';
import { CostCode } from '../entities/cost-code.entity';
import { CommitmentItem } from '../entities/commitment-item.entity';
import { Project } from '../../projects/entities/project.entity';
import { CostPeriodService } from './cost-period.service';
import {
  ProjectCostSummaryDto,
  CostCodeSummaryDto,
  CostReportFilterDto,
  BudgetPerformanceDto,
  CostPeriodSummaryDto,
  CostSummaryDto,
} from '../dto';
import { CostEntryStatus } from '../enums/cost-entry-status.enum';
import { CostEntryType } from '../enums/cost-entry-type.enum';
import { AccrualStatus } from '../enums/accrual-status.enum';
import { CostTransferStatus } from '../enums/cost-transfer-status.enum';

/**
 * Cost Summary Service
 *
 * Comprehensive service for generating cost reports, aggregations, and financial summaries.
 * Provides various views of project costs including project-level summaries, cost code
 * breakdowns, period reports, and budget performance analysis.
 *
 * Core Features:
 * - Project-level cost summaries with full breakdown
 * - Cost code detailed analysis with trends
 * - Period-based cost reporting
 * - Budget performance metrics and KPIs
 * - Complex SQL aggregations for performance
 * - Flexible filtering and date ranges
 *
 * This service is read-only and does not modify any data.
 * It focuses on aggregating and reporting existing financial data.
 *
 * @service CostSummaryService
 */
@Injectable()
export class CostSummaryService {
  private readonly logger = new Logger(CostSummaryService.name);

  constructor(
    @InjectRepository(CostEntry)
    private readonly costEntryRepository: Repository<CostEntry>,
    @InjectRepository(CostTransfer)
    private readonly costTransferRepository: Repository<CostTransfer>,
    @InjectRepository(Accrual)
    private readonly accrualRepository: Repository<Accrual>,
    @InjectRepository(Budget)
    private readonly budgetRepository: Repository<Budget>,
    @InjectRepository(BudgetLineItem)
    private readonly budgetLineItemRepository: Repository<BudgetLineItem>,
    @InjectRepository(CostPeriod)
    private readonly costPeriodRepository: Repository<CostPeriod>,
    @InjectRepository(CostCode)
    private readonly costCodeRepository: Repository<CostCode>,
    @InjectRepository(CommitmentItem)
    private readonly commitmentItemRepository: Repository<CommitmentItem>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly costPeriodService: CostPeriodService,
  ) {}

  /**
   * Get comprehensive project cost summary
   *
   * Returns a complete financial picture of the project including:
   * - Total budget, committed, actual, forecast costs
   * - Overall variance and percent complete
   * - Breakdown by cost code (array of CostSummaryDto)
   * - Cost entry statistics by type and status
   * - Accruals and transfers summary
   *
   * @param projectId - Project UUID
   * @param filter - Optional filters (date range, cost codes, etc.)
   * @returns Comprehensive project cost summary
   * @throws NotFoundException if project doesn't exist
   */
  async getSummaryByProject(
    projectId: string,
    filter?: CostReportFilterDto,
  ): Promise<ProjectCostSummaryDto> {
    this.logger.log(`Generating cost summary for project ${projectId}`);

    // Validate project exists
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Get budget for the project (use filter.budgetId if provided, otherwise get active budget)
    const budgetQuery = this.budgetRepository
      .createQueryBuilder('budget')
      .where('budget.project_id = :projectId', { projectId });

    if (filter?.budgetId) {
      budgetQuery.andWhere('budget.id = :budgetId', { budgetId: filter.budgetId });
    } else {
      budgetQuery.andWhere('budget.status = :status', { status: 'ACTIVE' });
    }

    const budget = await budgetQuery.getOne();

    if (!budget) {
      throw new NotFoundException(
        `No active budget found for project ${projectId}`,
      );
    }

    // Get all budget line items with aggregations
    const budgetLineItems = await this.budgetLineItemRepository
      .createQueryBuilder('lineItem')
      .where('lineItem.budget_id = :budgetId', { budgetId: budget.id })
      .getMany();

    const totalBudget = budgetLineItems.reduce(
      (sum, item) => sum + Number(item.budgetedCost || 0),
      0,
    );

    // Get committed costs from commitment items
    const commitmentQuery = this.commitmentItemRepository
      .createQueryBuilder('item')
      .innerJoin('item.commitment', 'commitment')
      .select('SUM(item.amount)', 'totalCommitted')
      .where('commitment.project_id = :projectId', { projectId })
      .andWhere('commitment.status IN (:...statuses)', {
        statuses: ['APPROVED', 'ACTIVE'],
      });

    if (filter?.costCodeId && filter.costCodeId.length > 0) {
      commitmentQuery.andWhere('item.cost_code_id IN (:...costCodeIds)', {
        costCodeIds: filter.costCodeId,
      });
    }

    const commitmentResult = await commitmentQuery.getRawOne();
    const totalCommitted = Number(commitmentResult?.totalCommitted || 0);

    // Build cost entry query with filters
    const costEntryQuery = this.costEntryRepository
      .createQueryBuilder('entry')
      .where('entry.project_id = :projectId', { projectId })
      .andWhere('entry.budget_id = :budgetId', { budgetId: budget.id })
      .andWhere('entry.status = :status', { status: CostEntryStatus.POSTED });

    if (filter?.fromDate) {
      costEntryQuery.andWhere('entry.entry_date >= :fromDate', {
        fromDate: filter.fromDate,
      });
    }

    if (filter?.toDate) {
      costEntryQuery.andWhere('entry.entry_date <= :toDate', {
        toDate: filter.toDate,
      });
    }

    if (filter?.costCodeId && filter.costCodeId.length > 0) {
      costEntryQuery.andWhere('entry.cost_code_id IN (:...costCodeIds)', {
        costCodeIds: filter.costCodeId,
      });
    }

    if (filter?.includeTypes && filter.includeTypes.length > 0) {
      costEntryQuery.andWhere('entry.type IN (:...types)', {
        types: filter.includeTypes,
      });
    }

    if (filter?.includeStatuses && filter.includeStatuses.length > 0) {
      costEntryQuery.andWhere('entry.status IN (:...statuses)', {
        statuses: filter.includeStatuses,
      });
    }

    const costEntries = await costEntryQuery.getMany();

    const totalActual = costEntries.reduce(
      (sum, entry) => sum + Number(entry.totalCost || 0),
      0,
    );

    // Get active accruals
    const accrualQuery = this.accrualRepository
      .createQueryBuilder('accrual')
      .where('accrual.project_id = :projectId', { projectId })
      .andWhere('accrual.budget_id = :budgetId', { budgetId: budget.id })
      .andWhere('accrual.status = :status', { status: AccrualStatus.ACTIVE });

    if (filter?.costCodeId && filter.costCodeId.length > 0) {
      accrualQuery.andWhere('accrual.cost_code_id IN (:...costCodeIds)', {
        costCodeIds: filter.costCodeId,
      });
    }

    const accruals = await accrualQuery.getMany();

    // Calculate project-level metrics
    const totalForecast = totalCommitted + accruals.reduce(
      (sum, accrual) => sum + Number(accrual.estimatedCost || 0),
      0,
    );

    const totalVariance = totalBudget - totalForecast;
    const percentComplete = totalBudget > 0
      ? (totalActual / totalBudget) * 100
      : 0;

    // Get cost code summaries
    const costCodeSummaries = await this.buildCostCodeSummaries(
      budget.id,
      projectId,
      filter,
    );

    // Build entry type breakdown
    const entriesByType = this.buildEntryTypeBreakdown(costEntries);

    // Build entry status breakdown
    const entriesByStatus = this.buildEntryStatusBreakdown(costEntries);

    // Build accruals summary
    const accrualsSummary = await this.buildAccrualsSummary(projectId, budget.id, filter);

    // Build transfers summary
    const transfersSummary = await this.buildTransfersSummary(projectId, budget.id, filter);

    const summary: ProjectCostSummaryDto = {
      projectId: project.id,
      projectName: project.name,
      projectNumber: project.number || 'N/A',
      totalBudget,
      totalCommitted,
      totalActual,
      totalForecast,
      totalVariance,
      percentComplete,
      costCodeSummaries,
      entriesByType,
      entriesByStatus,
      accrualsSummary,
      transfersSummary,
    };

    this.logger.log(
      `Generated summary for project ${projectId}: ${costCodeSummaries.length} cost codes, ` +
      `$${totalBudget.toFixed(2)} budget, $${totalActual.toFixed(2)} actual`,
    );

    return summary;
  }

  /**
   * Get cost code summary with detailed breakdown
   *
   * Returns comprehensive financial information for a specific cost code:
   * - Budget allocation and line item count
   * - Commitment data (total, count)
   * - Cost entries (actual, count, breakdown by type)
   * - Accrual data (estimated unbilled costs)
   * - Forecast and variance calculations
   * - Period-over-period trends
   * - Recent activity tracking
   *
   * @param projectId - Project UUID
   * @param costCodeId - Cost code UUID
   * @param filter - Optional filters (date range, etc.)
   * @returns Detailed cost code summary
   * @throws NotFoundException if project or cost code doesn't exist
   */
  async getSummaryByCostCode(
    projectId: string,
    costCodeId: string,
    filter?: CostReportFilterDto,
  ): Promise<CostCodeSummaryDto> {
    this.logger.log(
      `Generating cost code summary for cost code ${costCodeId} in project ${projectId}`,
    );

    // Validate project exists
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Validate cost code exists
    const costCode = await this.costCodeRepository.findOne({
      where: { id: costCodeId },
    });

    if (!costCode) {
      throw new NotFoundException(`Cost code with ID ${costCodeId} not found`);
    }

    // Get budget for the project
    const budgetQuery = this.budgetRepository
      .createQueryBuilder('budget')
      .where('budget.project_id = :projectId', { projectId });

    if (filter?.budgetId) {
      budgetQuery.andWhere('budget.id = :budgetId', { budgetId: filter.budgetId });
    } else {
      budgetQuery.andWhere('budget.status = :status', { status: 'ACTIVE' });
    }

    const budget = await budgetQuery.getOne();

    if (!budget) {
      throw new NotFoundException(
        `No active budget found for project ${projectId}`,
      );
    }

    // Get budget line items for this cost code
    const budgetLineItems = await this.budgetLineItemRepository
      .createQueryBuilder('lineItem')
      .where('lineItem.budget_id = :budgetId', { budgetId: budget.id })
      .andWhere('lineItem.cost_code_id = :costCodeId', { costCodeId })
      .getMany();

    const budgetAmount = budgetLineItems.reduce(
      (sum, item) => sum + Number(item.budgetedCost || 0),
      0,
    );

    // Get committed amount from commitment items
    const commitmentQuery = this.commitmentItemRepository
      .createQueryBuilder('item')
      .innerJoin('item.commitment', 'commitment')
      .select('COUNT(DISTINCT commitment.id)', 'commitmentCount')
      .addSelect('SUM(item.amount)', 'committedAmount')
      .where('commitment.project_id = :projectId', { projectId })
      .andWhere('item.cost_code_id = :costCodeId', { costCodeId })
      .andWhere('commitment.status IN (:...statuses)', {
        statuses: ['APPROVED', 'ACTIVE'],
      });

    const commitmentResult = await commitmentQuery.getRawOne();
    const committedAmount = Number(commitmentResult?.committedAmount || 0);
    const commitmentCount = Number(commitmentResult?.commitmentCount || 0);

    // Build cost entry query with filters
    const costEntryQuery = this.costEntryRepository
      .createQueryBuilder('entry')
      .where('entry.project_id = :projectId', { projectId })
      .andWhere('entry.budget_id = :budgetId', { budgetId: budget.id })
      .andWhere('entry.cost_code_id = :costCodeId', { costCodeId })
      .andWhere('entry.status = :status', { status: CostEntryStatus.POSTED });

    if (filter?.fromDate) {
      costEntryQuery.andWhere('entry.entry_date >= :fromDate', {
        fromDate: filter.fromDate,
      });
    }

    if (filter?.toDate) {
      costEntryQuery.andWhere('entry.entry_date <= :toDate', {
        toDate: filter.toDate,
      });
    }

    if (filter?.includeTypes && filter.includeTypes.length > 0) {
      costEntryQuery.andWhere('entry.type IN (:...types)', {
        types: filter.includeTypes,
      });
    }

    costEntryQuery.orderBy('entry.entry_date', 'DESC');

    const costEntries = await costEntryQuery.getMany();

    const actualCost = costEntries.reduce(
      (sum, entry) => sum + Number(entry.totalCost || 0),
      0,
    );

    const entryCount = costEntries.length;

    // Build entry type breakdown
    const entryBreakdown = this.buildCostEntryTypeBreakdown(costEntries);

    // Get active accruals for this cost code
    const accrualQuery = this.accrualRepository
      .createQueryBuilder('accrual')
      .where('accrual.project_id = :projectId', { projectId })
      .andWhere('accrual.budget_id = :budgetId', { budgetId: budget.id })
      .andWhere('accrual.cost_code_id = :costCodeId', { costCodeId })
      .andWhere('accrual.status = :status', { status: AccrualStatus.ACTIVE });

    const accruals = await accrualQuery.getMany();

    const accrualAmount = accruals.reduce(
      (sum, accrual) => sum + Number(accrual.estimatedCost || 0),
      0,
    );
    const accrualCount = accruals.length;

    // Calculate metrics
    const forecastCost = committedAmount + accrualAmount;
    const variance = budgetAmount - forecastCost;
    const percentComplete = budgetAmount > 0
      ? (actualCost / budgetAmount) * 100
      : 0;

    // Get last entry details
    const lastEntry = costEntries.length > 0 ? costEntries[0] : null;

    const summary: CostCodeSummaryDto = {
      costCodeId: costCode.id,
      code: costCode.code,
      name: costCode.name,
      division: costCode.division ? costCode.division.toString() : '0',
      description: costCode.description,
      budgetAmount,
      budgetLineItemCount: budgetLineItems.length,
      committedAmount,
      commitmentCount,
      actualCost,
      entryCount,
      entryBreakdown,
      accrualAmount,
      accrualCount,
      forecastCost,
      variance,
      percentComplete,
      lastEntryDate: lastEntry?.entryDate,
      lastEntryAmount: lastEntry ? Number(lastEntry.totalCost) : undefined,
      lastEntryDescription: lastEntry?.description,
    };

    this.logger.log(
      `Generated summary for cost code ${costCode.code}: ` +
      `$${budgetAmount.toFixed(2)} budget, $${actualCost.toFixed(2)} actual`,
    );

    return summary;
  }

  /**
   * Get cost period summary
   *
   * Delegates to CostPeriodService.getSummary() which provides:
   * - Period identification (name, dates, status)
   * - Total cost entries and amount
   * - Breakdown by entry type
   * - Breakdown by entry status
   *
   * @param periodId - Cost period UUID
   * @returns Cost period summary
   * @throws NotFoundException if period doesn't exist
   */
  async getSummaryByPeriod(periodId: string): Promise<CostPeriodSummaryDto> {
    this.logger.log(`Getting period summary for period ${periodId}`);

    // Delegate to CostPeriodService which already has this implementation
    return this.costPeriodService.getSummary(periodId);
  }

  /**
   * Get budget performance metrics and KPIs
   *
   * Returns comprehensive budget performance analysis including:
   * - Cost Performance Index (CPI = budget / actual)
   * - Budget consumption rate (% spent)
   * - Estimate at Completion (EAC) forecasting
   * - Top cost overruns identification
   * - Budget health indicators
   *
   * Key Metrics:
   * - CPI > 1.0 = Under budget (good)
   * - CPI = 1.0 = On budget
   * - CPI < 1.0 = Over budget (poor)
   *
   * @param projectId - Project UUID
   * @param filter - Optional filters (date range, cost codes, etc.)
   * @returns Budget performance metrics
   * @throws NotFoundException if project doesn't exist
   */
  async getBudgetPerformance(
    projectId: string,
    filter?: CostReportFilterDto,
  ): Promise<BudgetPerformanceDto> {
    this.logger.log(`Generating budget performance for project ${projectId}`);

    // Validate project exists
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Get budget for the project
    const budgetQuery = this.budgetRepository
      .createQueryBuilder('budget')
      .where('budget.project_id = :projectId', { projectId });

    if (filter?.budgetId) {
      budgetQuery.andWhere('budget.id = :budgetId', { budgetId: filter.budgetId });
    } else {
      budgetQuery.andWhere('budget.status = :status', { status: 'ACTIVE' });
    }

    const budget = await budgetQuery.getOne();

    if (!budget) {
      throw new NotFoundException(
        `No active budget found for project ${projectId}`,
      );
    }

    // Get all budget line items with cost codes
    const budgetLineItems = await this.budgetLineItemRepository
      .createQueryBuilder('lineItem')
      .leftJoinAndSelect('lineItem.costCode', 'costCode')
      .where('lineItem.budget_id = :budgetId', { budgetId: budget.id })
      .getMany();

    const totalBudget = budgetLineItems.reduce(
      (sum, item) => sum + Number(item.budgetedCost || 0),
      0,
    );

    // Get committed costs from commitment items
    const commitmentQuery = this.commitmentItemRepository
      .createQueryBuilder('item')
      .innerJoin('item.commitment', 'commitment')
      .select('SUM(item.amount)', 'totalCommitted')
      .where('commitment.project_id = :projectId', { projectId })
      .andWhere('commitment.status IN (:...statuses)', {
        statuses: ['APPROVED', 'ACTIVE'],
      });

    if (filter?.costCodeId && filter.costCodeId.length > 0) {
      commitmentQuery.andWhere('item.cost_code_id IN (:...costCodeIds)', {
        costCodeIds: filter.costCodeId,
      });
    }

    const commitmentResult = await commitmentQuery.getRawOne();
    const totalCommitted = Number(commitmentResult?.totalCommitted || 0);

    // Build cost entry query with filters
    const costEntryQuery = this.costEntryRepository
      .createQueryBuilder('entry')
      .where('entry.project_id = :projectId', { projectId })
      .andWhere('entry.budget_id = :budgetId', { budgetId: budget.id })
      .andWhere('entry.status = :status', { status: CostEntryStatus.POSTED });

    if (filter?.fromDate) {
      costEntryQuery.andWhere('entry.entry_date >= :fromDate', {
        fromDate: filter.fromDate,
      });
    }

    if (filter?.toDate) {
      costEntryQuery.andWhere('entry.entry_date <= :toDate', {
        toDate: filter.toDate,
      });
    }

    if (filter?.costCodeId && filter.costCodeId.length > 0) {
      costEntryQuery.andWhere('entry.cost_code_id IN (:...costCodeIds)', {
        costCodeIds: filter.costCodeId,
      });
    }

    const costEntries = await costEntryQuery.getMany();

    const totalActual = costEntries.reduce(
      (sum, entry) => sum + Number(entry.totalCost || 0),
      0,
    );

    // Calculate budget performance metrics
    const budgetRemaining = totalBudget - totalActual;

    // Cost Performance Index (CPI)
    // CPI = Budgeted Cost / Actual Cost
    // CPI > 1.0 means under budget (good), CPI < 1.0 means over budget (poor)
    const costPerformanceIndex = totalActual > 0
      ? totalBudget / totalActual
      : 0;

    // Budget consumption rate
    const budgetConsumptionRate = totalBudget > 0
      ? (totalActual / totalBudget) * 100
      : 0;

    // Estimate at Completion (EAC)
    // EAC = Budget / CPI
    // Projects final cost based on current performance
    const estimateAtCompletion = costPerformanceIndex > 0
      ? totalBudget / costPerformanceIndex
      : totalActual;

    // Forecasted overrun (negative = under budget, positive = over budget)
    const forecastedOverrun = estimateAtCompletion - totalBudget;

    // Calculate cost code level variances for top overruns
    const costCodeVariances: Array<{
      costCodeId: string;
      code: string;
      name: string;
      budgetAmount: number;
      actualCost: number;
      variance: number;
      variancePercent: number;
    }> = [];

    // Group cost entries by cost code
    const costEntriesByCostCode = new Map<string, CostEntry[]>();
    for (const entry of costEntries) {
      if (!costEntriesByCostCode.has(entry.costCodeId)) {
        costEntriesByCostCode.set(entry.costCodeId, []);
      }
      costEntriesByCostCode.get(entry.costCodeId)!.push(entry);
    }

    // Calculate variance for each cost code
    for (const lineItem of budgetLineItems) {
      const costCodeEntries = costEntriesByCostCode.get(lineItem.costCodeId) || [];
      const actualCost = costCodeEntries.reduce(
        (sum, entry) => sum + Number(entry.totalCost || 0),
        0,
      );
      const budgetAmount = Number(lineItem.budgetedCost || 0);
      const variance = budgetAmount - actualCost;
      const variancePercent = budgetAmount > 0
        ? (variance / budgetAmount) * 100
        : 0;

      if (lineItem.costCode) {
        costCodeVariances.push({
          costCodeId: lineItem.costCode.id,
          code: lineItem.costCode.code,
          name: lineItem.costCode.name,
          budgetAmount,
          actualCost,
          variance,
          variancePercent,
        });
      }
    }

    // Sort by variance (worst first = most negative)
    costCodeVariances.sort((a, b) => a.variance - b.variance);

    // Get top 10 overruns (negative variances)
    const topCostOverruns = costCodeVariances
      .filter((item) => item.variance < 0)
      .slice(0, 10);

    // Count cost codes by budget status
    let overBudgetCostCodes = 0;
    let underBudgetCostCodes = 0;
    let onBudgetCostCodes = 0;

    for (const item of costCodeVariances) {
      const variancePercent = Math.abs(item.variancePercent);

      if (item.variance < 0 && variancePercent > 1) {
        overBudgetCostCodes++;
      } else if (item.variance > 0 && variancePercent > 1) {
        underBudgetCostCodes++;
      } else {
        onBudgetCostCodes++;
      }
    }

    const performance: BudgetPerformanceDto = {
      projectId: project.id,
      totalBudget,
      totalCommitted,
      totalActual,
      budgetRemaining,
      costPerformanceIndex,
      budgetConsumptionRate,
      estimateAtCompletion,
      forecastedOverrun,
      topCostOverruns,
      totalCostCodes: budgetLineItems.length,
      overBudgetCostCodes,
      underBudgetCostCodes,
      onBudgetCostCodes,
    };

    this.logger.log(
      `Generated budget performance for project ${projectId}: ` +
      `CPI = ${costPerformanceIndex.toFixed(2)}, ` +
      `${overBudgetCostCodes} cost codes over budget`,
    );

    return performance;
  }

  // ==================== HELPER METHODS ====================

  /**
   * Build cost code summaries for project summary
   *
   * Creates an array of CostSummaryDto objects, one for each cost code in the budget.
   * Aggregates budget, commitments, actual costs, and accruals for each code.
   *
   * @param budgetId - Budget UUID
   * @param projectId - Project UUID
   * @param filter - Optional filters
   * @returns Array of cost summaries
   * @private
   */
  private async buildCostCodeSummaries(
    budgetId: string,
    projectId: string,
    filter?: CostReportFilterDto,
  ): Promise<CostSummaryDto[]> {
    // Get all budget line items with cost codes
    const lineItemQuery = this.budgetLineItemRepository
      .createQueryBuilder('lineItem')
      .leftJoinAndSelect('lineItem.costCode', 'costCode')
      .where('lineItem.budget_id = :budgetId', { budgetId });

    if (filter?.costCodeId && filter.costCodeId.length > 0) {
      lineItemQuery.andWhere('lineItem.cost_code_id IN (:...costCodeIds)', {
        costCodeIds: filter.costCodeId,
      });
    }

    const budgetLineItems = await lineItemQuery.getMany();

    // Get all cost entries for this budget
    const costEntryQuery = this.costEntryRepository
      .createQueryBuilder('entry')
      .where('entry.project_id = :projectId', { projectId })
      .andWhere('entry.budget_id = :budgetId', { budgetId })
      .andWhere('entry.status = :status', { status: CostEntryStatus.POSTED });

    if (filter?.fromDate) {
      costEntryQuery.andWhere('entry.entry_date >= :fromDate', {
        fromDate: filter.fromDate,
      });
    }

    if (filter?.toDate) {
      costEntryQuery.andWhere('entry.entry_date <= :toDate', {
        toDate: filter.toDate,
      });
    }

    if (filter?.costCodeId && filter.costCodeId.length > 0) {
      costEntryQuery.andWhere('entry.cost_code_id IN (:...costCodeIds)', {
        costCodeIds: filter.costCodeId,
      });
    }

    const costEntries = await costEntryQuery.getMany();

    // Group entries by cost code
    const entriesByCostCode = new Map<string, CostEntry[]>();
    for (const entry of costEntries) {
      if (!entriesByCostCode.has(entry.costCodeId)) {
        entriesByCostCode.set(entry.costCodeId, []);
      }
      entriesByCostCode.get(entry.costCodeId)!.push(entry);
    }

    // Build summaries
    const summaries: CostSummaryDto[] = [];

    for (const lineItem of budgetLineItems) {
      if (!lineItem.costCode) continue;

      const costCodeEntries = entriesByCostCode.get(lineItem.costCodeId) || [];
      const actualCost = costCodeEntries.reduce(
        (sum, entry) => sum + Number(entry.totalCost || 0),
        0,
      );
      const budgetedCost = Number(lineItem.budgetedCost || 0);
      const committedCost = Number(lineItem.committedCost || 0);
      const variance = budgetedCost - actualCost;

      summaries.push({
        costCodeId: lineItem.costCode.id,
        costCode: lineItem.costCode.code,
        costCodeName: lineItem.costCode.name,
        budgetAmount: budgetedCost,
        committedCost,
        actualCost,
        forecastCost: committedCost,
        variance,
        percentComplete: budgetedCost > 0 ? (actualCost / budgetedCost) * 100 : 0,
        costEntryCount: costCodeEntries.length,
      });
    }

    // Sort by cost code
    summaries.sort((a, b) => a.costCode.localeCompare(b.costCode));

    return summaries;
  }

  /**
   * Build entry type breakdown
   *
   * Aggregates cost entries by type (LABOR, MATERIAL, etc.) with counts and amounts.
   *
   * @param entries - Array of cost entries
   * @returns Record of entry type to summary
   * @private
   */
  private buildEntryTypeBreakdown(
    entries: CostEntry[],
  ): Record<CostEntryType, { count: number; amount: number }> {
    const breakdown: Record<CostEntryType, { count: number; amount: number }> = {
      [CostEntryType.LABOR]: { count: 0, amount: 0 },
      [CostEntryType.MATERIAL]: { count: 0, amount: 0 },
      [CostEntryType.EQUIPMENT]: { count: 0, amount: 0 },
      [CostEntryType.SUBCONTRACT]: { count: 0, amount: 0 },
      [CostEntryType.OTHER_DIRECT]: { count: 0, amount: 0 },
      [CostEntryType.OVERHEAD]: { count: 0, amount: 0 },
      [CostEntryType.INVOICE]: { count: 0, amount: 0 },
      [CostEntryType.ACCRUAL]: { count: 0, amount: 0 },
    };

    for (const entry of entries) {
      if (entry.type in breakdown) {
        breakdown[entry.type].count++;
        breakdown[entry.type].amount += Number(entry.totalCost || 0);
      }
    }

    return breakdown;
  }

  /**
   * Build cost entry type breakdown (for cost code summary)
   *
   * Similar to buildEntryTypeBreakdown but returns the format expected by CostCodeSummaryDto.
   *
   * @param entries - Array of cost entries
   * @returns Record of entry type to breakdown
   * @private
   */
  private buildCostEntryTypeBreakdown(
    entries: CostEntry[],
  ): Record<CostEntryType, { count: number; amount: number }> {
    return this.buildEntryTypeBreakdown(entries);
  }

  /**
   * Build entry status breakdown
   *
   * Counts cost entries by status (DRAFT, POSTED, VOID, etc.).
   *
   * @param entries - Array of cost entries
   * @returns Record of entry status to count
   * @private
   */
  private buildEntryStatusBreakdown(
    entries: CostEntry[],
  ): Record<CostEntryStatus, number> {
    const breakdown: Record<CostEntryStatus, number> = {
      [CostEntryStatus.DRAFT]: 0,
      [CostEntryStatus.POSTED]: 0,
      [CostEntryStatus.VOID]: 0,
      [CostEntryStatus.PENDING_APPROVAL]: 0,
      [CostEntryStatus.APPROVED]: 0,
      [CostEntryStatus.REJECTED]: 0,
    };

    for (const entry of entries) {
      if (entry.status in breakdown) {
        breakdown[entry.status]++;
      }
    }

    return breakdown;
  }

  /**
   * Build accruals summary
   *
   * Aggregates accrual data including counts by status.
   *
   * @param projectId - Project UUID
   * @param budgetId - Budget UUID
   * @param filter - Optional filters
   * @returns Accruals summary object
   * @private
   */
  private async buildAccrualsSummary(
    projectId: string,
    budgetId: string,
    filter?: CostReportFilterDto,
  ): Promise<{
    count: number;
    estimatedAmount: number;
    activeCount: number;
    convertedCount: number;
    reversedCount: number;
  }> {
    const accrualQuery = this.accrualRepository
      .createQueryBuilder('accrual')
      .where('accrual.project_id = :projectId', { projectId })
      .andWhere('accrual.budget_id = :budgetId', { budgetId });

    if (filter?.costCodeId && filter.costCodeId.length > 0) {
      accrualQuery.andWhere('accrual.cost_code_id IN (:...costCodeIds)', {
        costCodeIds: filter.costCodeId,
      });
    }

    const accruals = await accrualQuery.getMany();

    const count = accruals.length;
    const estimatedAmount = accruals.reduce(
      (sum, accrual) => sum + Number(accrual.estimatedCost || 0),
      0,
    );
    const activeCount = accruals.filter(
      (a) => a.status === AccrualStatus.ACTIVE,
    ).length;
    const convertedCount = accruals.filter(
      (a) => a.status === AccrualStatus.CONVERTED,
    ).length;
    const reversedCount = accruals.filter(
      (a) => a.status === AccrualStatus.REVERSED,
    ).length;

    return {
      count,
      estimatedAmount,
      activeCount,
      convertedCount,
      reversedCount,
    };
  }

  /**
   * Build transfers summary
   *
   * Aggregates cost transfer data including counts by status.
   *
   * @param projectId - Project UUID
   * @param budgetId - Budget UUID
   * @param filter - Optional filters
   * @returns Transfers summary object
   * @private
   */
  private async buildTransfersSummary(
    projectId: string,
    budgetId: string,
    filter?: CostReportFilterDto,
  ): Promise<{
    count: number;
    totalAmount: number;
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
  }> {
    const transferQuery = this.costTransferRepository
      .createQueryBuilder('transfer')
      .where('transfer.project_id = :projectId', { projectId })
      .andWhere('transfer.budget_id = :budgetId', { budgetId });

    const transfers = await transferQuery.getMany();

    const count = transfers.length;
    const totalAmount = transfers.reduce(
      (sum, transfer) => sum + Number(transfer.amount || 0),
      0,
    );
    const pendingCount = transfers.filter(
      (t) => t.status === CostTransferStatus.PENDING_APPROVAL,
    ).length;
    const approvedCount = transfers.filter(
      (t) => t.status === CostTransferStatus.APPROVED,
    ).length;
    const rejectedCount = transfers.filter(
      (t) => t.status === CostTransferStatus.REJECTED,
    ).length;

    return {
      count,
      totalAmount,
      pendingCount,
      approvedCount,
      rejectedCount,
    };
  }
}
