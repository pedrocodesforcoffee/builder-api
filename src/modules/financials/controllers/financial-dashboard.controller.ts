import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import {
  FinancialKPIDto,
  EarnedValueMetricsDto,
  WIPStatusDto,
  CashFlowDataDto,
  CostTrendDataDto,
  CommitmentStatusDto,
  BudgetByDivisionDto,
  CostCodeBreakdownDto,
  PendingActionsSummaryDto,
  FinancialAlertDto,
  DashboardParamsDto,
  DateRangeDto,
  CostCodeParamsDto,
} from '../dto/dashboard';
import { BudgetService } from '../services/budget.service';
import { CommitmentService } from '../services/commitment.service';
import { CostEntryService } from '../services/cost-entry.service';
import { CostSummaryService } from '../services/cost-summary.service';
import { PaymentApplicationService } from '../services/payment-application.service';
import { OwnerChangeOrderService } from '../services/owner-change-order.service';
import { PotentialChangeOrderService } from '../services/potential-change-order.service';
import { CommitmentChangeOrderService } from '../services/commitment-change-order.service';
import { OcoStatus } from '../enums/oco-status.enum';
import { CommitmentStatus } from '../enums/commitment-status.enum';

/**
 * Financial Dashboard Controller
 *
 * Provides comprehensive financial dashboard endpoints for project financial analysis.
 * Aggregates data from budgets, commitments, costs, and change orders.
 *
 * Base URL: /api/v1/projects/:projectId/financials/dashboard
 */
@ApiTags('Financial Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/financials/dashboard')
export class FinancialDashboardController {
  private readonly logger = new Logger(FinancialDashboardController.name);

  constructor(
    private readonly budgetService: BudgetService,
    private readonly commitmentService: CommitmentService,
    private readonly costEntryService: CostEntryService,
    private readonly costSummaryService: CostSummaryService,
    private readonly paymentApplicationService: PaymentApplicationService,
    private readonly ownerChangeOrderService: OwnerChangeOrderService,
    private readonly potentialChangeOrderService: PotentialChangeOrderService,
    private readonly commitmentChangeOrderService: CommitmentChangeOrderService,
  ) {}

  /**
   * Get complete dashboard data (all widgets in one call)
   * GET /api/v1/projects/:projectId/financials/dashboard
   */
  @Get()
  @ApiOperation({ summary: 'Get complete financial dashboard data' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
  })
  async getDashboard(
    @Param('projectId') projectId: string,
    @Query() params: DashboardParamsDto,
  ) {
    this.logger.log(`Getting complete dashboard for project ${projectId}`);

    // Fetch all dashboard data in parallel
    const [
      kpis,
      earnedValue,
      wip,
      commitmentStatus,
      budgetByDivision,
      pendingActions,
      alerts,
    ] = await Promise.all([
      this.getKPIs(projectId),
      this.getEarnedValue(projectId),
      this.getWIPStatus(projectId),
      this.getCommitmentStatus(projectId),
      this.getBudgetByDivision(projectId),
      this.getPendingActions(projectId),
      this.getAlerts(projectId),
    ]);

    return {
      kpis,
      earnedValue,
      wip,
      commitmentStatus,
      budgetByDivision,
      pendingActions,
      alerts,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get Financial KPIs
   * GET /api/v1/projects/:projectId/financials/dashboard/kpis
   */
  @Get('kpis')
  @ApiOperation({ summary: 'Get financial KPI metrics' })
  @ApiResponse({
    status: 200,
    description: 'KPIs retrieved successfully',
    type: FinancialKPIDto,
  })
  async getKPIs(@Param('projectId') projectId: string): Promise<FinancialKPIDto> {
    this.logger.log(`Getting KPIs for project ${projectId}`);

    // Fetch data from multiple sources in parallel
    const [budgets, costSummary, commitments, approvedOcos] = await Promise.all([
      this.budgetService.findAllByProject(projectId, {}),
      this.costSummaryService.getSummaryByProject(projectId),
      this.commitmentService.findAll(projectId),
      this.ownerChangeOrderService.findAll(projectId, OcoStatus.APPROVED),
    ]);

    // Get primary budget (first budget for the project)
    const primaryBudget = budgets?.[0];

    const originalBudget = primaryBudget?.totalAmount || 0;
    const currentBudget = primaryBudget?.totalAmount || 0; // Simple model: total = current
    const contingency = 0; // Not tracked in BudgetResponseDto

    // Calculate approved change orders total
    const approvedChangeOrders = approvedOcos.reduce((sum, oco) => sum + Number(oco.amount || 0), 0);

    // Calculate committed amount from all commitments
    const totalCommitted = commitments.reduce((sum, c) => sum + Number(c.originalAmount || 0), 0);

    // Get actual costs from cost summary
    const totalActualCost = costSummary?.totalActual || 0;

    // Calculate contract values
    const originalContractValue = originalBudget + contingency;
    const currentContractValue = originalContractValue + approvedChangeOrders;

    // Calculate percentages and variances
    const committedPercent = currentBudget > 0 ? (totalCommitted / currentBudget) * 100 : 0;
    const actualPercent = currentBudget > 0 ? (totalActualCost / currentBudget) * 100 : 0;
    const budgetVariance = currentBudget - totalActualCost;
    const budgetVariancePercent = currentBudget > 0 ? (budgetVariance / currentBudget) * 100 : 0;
    const contingencyPercent = currentBudget > 0 ? (contingency / currentBudget) * 100 : 0;

    // Estimate at completion (current budget if on track, or adjusted based on actual performance)
    const estimateAtCompletion = actualPercent > 0
      ? (totalActualCost / actualPercent) * 100
      : currentBudget;
    const forecastVariance = currentBudget - estimateAtCompletion;

    // Percent complete based on actual costs
    const percentComplete = actualPercent;

    return {
      originalContractValue: Number(originalContractValue.toFixed(2)),
      approvedChangeOrders: Number(approvedChangeOrders.toFixed(2)),
      currentContractValue: Number(currentContractValue.toFixed(2)),
      originalBudget: Number(originalBudget.toFixed(2)),
      currentBudget: Number(currentBudget.toFixed(2)),
      contingencyRemaining: Number(contingency.toFixed(2)),
      contingencyPercent: Number(contingencyPercent.toFixed(2)),
      totalCommitted: Number(totalCommitted.toFixed(2)),
      committedPercent: Number(committedPercent.toFixed(2)),
      totalActualCost: Number(totalActualCost.toFixed(2)),
      actualPercent: Number(actualPercent.toFixed(2)),
      budgetVariance: Number(budgetVariance.toFixed(2)),
      budgetVariancePercent: Number(budgetVariancePercent.toFixed(2)),
      estimateAtCompletion: Number(estimateAtCompletion.toFixed(2)),
      forecastVariance: Number(forecastVariance.toFixed(2)),
      percentComplete: Number(percentComplete.toFixed(2)),
    };
  }

  /**
   * Get Earned Value Metrics
   * GET /api/v1/projects/:projectId/financials/dashboard/earned-value
   */
  @Get('earned-value')
  @ApiOperation({ summary: 'Get Earned Value Management (EVM) metrics' })
  @ApiResponse({
    status: 200,
    description: 'EVM metrics retrieved successfully',
    type: EarnedValueMetricsDto,
  })
  async getEarnedValue(@Param('projectId') projectId: string): Promise<EarnedValueMetricsDto> {
    this.logger.log(`Getting EVM metrics for project ${projectId}`);

    // Fetch budget and cost data
    const [budgets, costSummary] = await Promise.all([
      this.budgetService.findAllByProject(projectId, {}),
      this.costSummaryService.getSummaryByProject(projectId),
    ]);

    const primaryBudget = budgets?.[0];
    const budgetAtCompletion = primaryBudget?.totalAmount || 0;
    const actualCost = costSummary?.totalActual || 0;

    // For EVM, we need planned value and earned value
    // Simplified calculation: assume 60% planned, actual progress based on costs
    const plannedValue = budgetAtCompletion * 0.6; // TODO: Calculate from schedule
    const earnedValue = actualCost; // Simplified: use actual costs as earned value

    // Calculate EVM metrics
    const scheduleVariance = earnedValue - plannedValue;
    const costVariance = earnedValue - actualCost;
    const schedulePerformanceIndex = plannedValue > 0 ? earnedValue / plannedValue : 1.0;
    const costPerformanceIndex = actualCost > 0 ? earnedValue / actualCost : 1.0;
    const estimateAtCompletion = costPerformanceIndex > 0 ? budgetAtCompletion / costPerformanceIndex : budgetAtCompletion;
    const estimateToComplete = estimateAtCompletion - actualCost;
    const varianceAtCompletion = budgetAtCompletion - estimateAtCompletion;

    // Determine health status
    const scheduleHealth = schedulePerformanceIndex >= 0.95 ? 'ON_TRACK' : schedulePerformanceIndex >= 0.85 ? 'AT_RISK' : 'BEHIND';
    const costHealth = costPerformanceIndex >= 0.95 ? 'ON_BUDGET' : costPerformanceIndex >= 0.85 ? 'UNDER_BUDGET' : 'OVER_BUDGET';

    return {
      budgetAtCompletion: Number(budgetAtCompletion.toFixed(2)),
      plannedValue: Number(plannedValue.toFixed(2)),
      earnedValue: Number(earnedValue.toFixed(2)),
      actualCost: Number(actualCost.toFixed(2)),
      scheduleVariance: Number(scheduleVariance.toFixed(2)),
      costVariance: Number(costVariance.toFixed(2)),
      schedulePerformanceIndex: Number(schedulePerformanceIndex.toFixed(3)),
      costPerformanceIndex: Number(costPerformanceIndex.toFixed(3)),
      estimateAtCompletion: Number(estimateAtCompletion.toFixed(2)),
      estimateToComplete: Number(estimateToComplete.toFixed(2)),
      varianceAtCompletion: Number(varianceAtCompletion.toFixed(2)),
      scheduleHealth,
      costHealth,
    };
  }

  /**
   * Get WIP Status
   * GET /api/v1/projects/:projectId/financials/dashboard/wip
   */
  @Get('wip')
  @ApiOperation({ summary: 'Get Work-in-Progress (WIP) status' })
  @ApiResponse({
    status: 200,
    description: 'WIP status retrieved successfully',
    type: WIPStatusDto,
  })
  async getWIPStatus(@Param('projectId') projectId: string): Promise<WIPStatusDto> {
    this.logger.log(`Getting WIP status for project ${projectId}`);

    // Fetch payment applications and cost data
    const [paymentApps, costSummary] = await Promise.all([
      this.paymentApplicationService.findAll(projectId, false),
      this.costSummaryService.getSummaryByProject(projectId),
    ]);

    // Calculate total billed from approved payment applications
    const totalBilled = paymentApps
      .filter(pa => pa.status === 'APPROVED' || pa.status === 'PAID')
      .reduce((sum, pa) => sum + Number(pa.currentPaymentDue || 0), 0);

    const totalCost = costSummary?.totalActual || 0;

    // Earned revenue = percentage complete * contract value (simplified: use billed amount)
    const earnedRevenue = totalBilled;

    // Under/over billed = billed - actual cost
    const underOverBilled = totalBilled - totalCost;

    // Billing percentage = (billed / cost) * 100
    const billingPercent = totalCost > 0 ? (totalBilled / totalCost) * 100 : 0;

    return {
      totalBilled: Number(totalBilled.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      earnedRevenue: Number(earnedRevenue.toFixed(2)),
      underOverBilled: Number(underOverBilled.toFixed(2)),
      billingPercent: Number(billingPercent.toFixed(2)),
    };
  }

  /**
   * Get Cash Flow Data
   * GET /api/v1/projects/:projectId/financials/dashboard/cash-flow
   */
  @Get('cash-flow')
  @ApiOperation({ summary: 'Get cash flow time series data' })
  @ApiResponse({
    status: 200,
    description: 'Cash flow data retrieved successfully',
    type: CashFlowDataDto,
  })
  async getCashFlow(
    @Param('projectId') projectId: string,
    @Query() dateRange: DateRangeDto,
  ): Promise<CashFlowDataDto> {
    this.logger.log(`Getting cash flow for project ${projectId}`);

    // TODO: Implement real cash flow aggregation
    return {
      periods: ['2024-01', '2024-02', '2024-03'],
      inflow: [800000, 850000, 900000],
      outflow: [750000, 800000, 850000],
      netCashFlow: [50000, 50000, 50000],
      cumulativeCashFlow: [50000, 100000, 150000],
    };
  }

  /**
   * Get Cost Trend Data
   * GET /api/v1/projects/:projectId/financials/dashboard/cost-trend
   */
  @Get('cost-trend')
  @ApiOperation({ summary: 'Get cost trend time series data' })
  @ApiResponse({
    status: 200,
    description: 'Cost trend data retrieved successfully',
    type: CostTrendDataDto,
  })
  async getCostTrend(
    @Param('projectId') projectId: string,
    @Query() dateRange: DateRangeDto,
  ): Promise<CostTrendDataDto> {
    this.logger.log(`Getting cost trend for project ${projectId}`);

    // TODO: Implement real cost trend aggregation
    return {
      periods: ['2024-01', '2024-02', '2024-03'],
      budget: [9750000, 9750000, 9750000],
      committed: [2000000, 4000000, 6000000],
      actual: [1800000, 3600000, 5850000],
      forecast: [9750000, 9750000, 9750000],
    };
  }

  /**
   * Get Commitment Status Summary
   * GET /api/v1/projects/:projectId/financials/dashboard/commitment-status
   */
  @Get('commitment-status')
  @ApiOperation({ summary: 'Get commitment status breakdown' })
  @ApiResponse({
    status: 200,
    description: 'Commitment status retrieved successfully',
    type: CommitmentStatusDto,
  })
  async getCommitmentStatus(@Param('projectId') projectId: string): Promise<CommitmentStatusDto> {
    this.logger.log(`Getting commitment status for project ${projectId}`);

    // Fetch all commitments for the project
    const commitments = await this.commitmentService.findAll(projectId);

    // Group by status
    const statusMap = new Map<string, { count: number; amount: number }>();

    commitments.forEach(commitment => {
      const status = commitment.status || 'DRAFT';
      const amount = Number(commitment.originalAmount || 0);

      if (!statusMap.has(status)) {
        statusMap.set(status, { count: 0, amount: 0 });
      }

      const current = statusMap.get(status)!;
      current.count += 1;
      current.amount += amount;
    });

    const totalCommitments = commitments.length;
    const totalAmount = commitments.reduce((sum, c) => sum + Number(c.originalAmount || 0), 0);

    const byStatus = Array.from(statusMap.entries()).map(([status, data]) => ({
      status,
      count: data.count,
      amount: Number(data.amount.toFixed(2)),
    }));

    return {
      totalCommitments,
      totalAmount: Number(totalAmount.toFixed(2)),
      byStatus,
    };
  }

  /**
   * Get Budget by Division
   * GET /api/v1/projects/:projectId/financials/dashboard/budget-by-division
   */
  @Get('budget-by-division')
  @ApiOperation({ summary: 'Get budget breakdown by CSI MasterFormat division' })
  @ApiResponse({
    status: 200,
    description: 'Budget by division retrieved successfully',
    type: BudgetByDivisionDto,
  })
  async getBudgetByDivision(@Param('projectId') projectId: string): Promise<BudgetByDivisionDto> {
    this.logger.log(`Getting budget by division for project ${projectId}`);

    // TODO: Implement real division breakdown
    return {
      divisions: [
        { divisionCode: '01', divisionName: 'General Requirements', originalBudget: 500000, revisedBudget: 520000, committed: 500000, actual: 450000, variance: 70000 },
        { divisionCode: '03', divisionName: 'Concrete', originalBudget: 1500000, revisedBudget: 1550000, committed: 1400000, actual: 950000, variance: 600000 },
        { divisionCode: '05', divisionName: 'Metals', originalBudget: 800000, revisedBudget: 820000, committed: 750000, actual: 600000, variance: 220000 },
        { divisionCode: '09', divisionName: 'Finishes', originalBudget: 600000, revisedBudget: 610000, committed: 550000, actual: 400000, variance: 210000 },
      ],
    };
  }

  /**
   * Get Cost Code Breakdown
   * GET /api/v1/projects/:projectId/financials/dashboard/cost-codes
   */
  @Get('cost-codes')
  @ApiOperation({ summary: 'Get detailed cost code breakdown' })
  @ApiResponse({
    status: 200,
    description: 'Cost code breakdown retrieved successfully',
    type: [CostCodeBreakdownDto],
  })
  async getCostCodeBreakdown(
    @Param('projectId') projectId: string,
    @Query() params: CostCodeParamsDto,
  ): Promise<CostCodeBreakdownDto[]> {
    this.logger.log(`Getting cost code breakdown for project ${projectId}`);

    // TODO: Implement real cost code breakdown
    return [
      {
        costCodeId: 'uuid-1',
        code: '03-30-00',
        description: 'Cast-in-Place Concrete',
        division: '03',
        budget: 500000,
        committed: 450000,
        actual: 320000,
        variance: 180000,
        percentComplete: 64.0,
      },
      {
        costCodeId: 'uuid-2',
        code: '05-12-00',
        description: 'Structural Steel',
        division: '05',
        budget: 400000,
        committed: 380000,
        actual: 300000,
        variance: 100000,
        percentComplete: 75.0,
      },
    ];
  }

  /**
   * Get Pending Actions Summary
   * GET /api/v1/projects/:projectId/financials/dashboard/pending-actions
   */
  @Get('pending-actions')
  @ApiOperation({ summary: 'Get items requiring attention' })
  @ApiResponse({
    status: 200,
    description: 'Pending actions retrieved successfully',
    type: PendingActionsSummaryDto,
  })
  async getPendingActions(@Param('projectId') projectId: string): Promise<PendingActionsSummaryDto> {
    this.logger.log(`Getting pending actions for project ${projectId}`);

    // Fetch pending items from multiple sources in parallel
    const [paymentApps, changeOrders, commitments] = await Promise.all([
      this.paymentApplicationService.findAll(projectId, false),
      this.ownerChangeOrderService.findAll(projectId, OcoStatus.PENDING_APPROVAL),
      this.commitmentService.findAll(projectId, undefined, CommitmentStatus.PENDING_APPROVAL),
    ]);

    const pendingPaymentApplications = paymentApps.length;
    const pendingChangeOrders = changeOrders.length;
    const pendingCommitments = commitments.length;
    const totalCount = pendingPaymentApplications + pendingChangeOrders + pendingCommitments;

    // Build items list (up to 10 most recent)
    const items: any[] = [];

    // Add payment applications
    paymentApps.slice(0, 5).forEach(pa => {
      items.push({
        id: pa.id,
        type: 'PAYMENT_APPLICATION',
        title: `Payment Application #${pa.applicationNumber}`,
        status: pa.status,
        amount: Number(pa.currentPaymentDue || 0),
        createdAt: pa.createdAt.toISOString(),
      });
    });

    // Add change orders
    changeOrders.slice(0, 5).forEach(co => {
      items.push({
        id: co.id,
        type: 'CHANGE_ORDER',
        title: `Change Order ${co.ocoNumber} - ${co.title}`,
        status: co.status,
        amount: Number(co.amount || 0),
        createdAt: co.createdAt.toISOString(),
      });
    });

    // Sort by created date and limit to 10
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const limitedItems = items.slice(0, 10);

    return {
      totalCount,
      pendingPaymentApplications,
      pendingChangeOrders,
      pendingCommitments,
      items: limitedItems,
    };
  }

  /**
   * Get Financial Alerts
   * GET /api/v1/projects/:projectId/financials/dashboard/alerts
   */
  @Get('alerts')
  @ApiOperation({ summary: 'Get financial alerts based on business rules' })
  @ApiResponse({
    status: 200,
    description: 'Alerts retrieved successfully',
    type: [FinancialAlertDto],
  })
  async getAlerts(@Param('projectId') projectId: string): Promise<FinancialAlertDto[]> {
    this.logger.log(`Getting alerts for project ${projectId}`);

    const alerts: FinancialAlertDto[] = [];

    // Fetch data needed for alert generation
    const [budgets, costSummary, commitments] = await Promise.all([
      this.budgetService.findAllByProject(projectId, {}),
      this.costSummaryService.getSummaryByProject(projectId),
      this.commitmentService.findAll(projectId),
    ]);

    const primaryBudget = budgets?.[0];
    if (!primaryBudget) {
      return alerts;
    }

    const currentBudget = primaryBudget.totalAmount || 0;
    const contingency = 0; // Not tracked in BudgetResponseDto
    const totalActualCost = costSummary?.totalActual || 0;
    const totalCommitted = commitments.reduce((sum, c) => sum + Number(c.originalAmount || 0), 0);

    // Alert 1: Budget overrun > 10%
    const budgetVariancePercent = currentBudget > 0 ? ((totalActualCost - currentBudget) / currentBudget) * 100 : 0;
    if (budgetVariancePercent > 10) {
      alerts.push({
        id: `alert-budget-overrun-${projectId}`,
        severity: 'CRITICAL',
        message: `Budget overrun of ${budgetVariancePercent.toFixed(1)}% detected (exceeds 10% threshold)`,
        entityType: 'BUDGET',
        entityId: primaryBudget.id,
        createdAt: new Date().toISOString(),
      });
    }

    // Alert 2: Contingency < 5%
    const contingencyPercent = currentBudget > 0 ? (contingency / currentBudget) * 100 : 0;
    if (contingencyPercent < 5 && contingencyPercent > 0) {
      alerts.push({
        id: `alert-contingency-low-${projectId}`,
        severity: 'HIGH',
        message: `Contingency at ${contingencyPercent.toFixed(1)}% - Below 5% threshold`,
        entityType: 'BUDGET',
        entityId: primaryBudget.id,
        createdAt: new Date().toISOString(),
      });
    }

    // Alert 3: Uncommitted budget > 20%
    const uncommittedAmount = currentBudget - totalCommitted;
    const uncommittedPercent = currentBudget > 0 ? (uncommittedAmount / currentBudget) * 100 : 0;
    if (uncommittedPercent > 20) {
      alerts.push({
        id: `alert-uncommitted-high-${projectId}`,
        severity: 'MEDIUM',
        message: `${uncommittedPercent.toFixed(1)}% of budget remains uncommitted (exceeds 20% threshold)`,
        entityType: 'BUDGET',
        entityId: primaryBudget.id,
        createdAt: new Date().toISOString(),
      });
    }

    // Alert 4: Cost trend increasing (actual > committed)
    if (totalActualCost > totalCommitted * 0.9) {
      alerts.push({
        id: `alert-cost-trend-${projectId}`,
        severity: 'LOW',
        message: 'Actual costs approaching committed amounts - Monitor cost trend closely',
        entityType: 'BUDGET',
        entityId: primaryBudget.id,
        createdAt: new Date().toISOString(),
      });
    }

    return alerts;
  }

  /**
   * Dismiss Alert
   * POST /api/v1/projects/:projectId/financials/dashboard/alerts/:alertId/dismiss
   */
  @Post('alerts/:alertId/dismiss')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Dismiss a financial alert' })
  @ApiResponse({
    status: 204,
    description: 'Alert dismissed successfully',
  })
  async dismissAlert(
    @Param('projectId') projectId: string,
    @Param('alertId') alertId: string,
    @CurrentUser() user: any,
  ): Promise<void> {
    this.logger.log(`Dismissing alert ${alertId} for project ${projectId} by user ${user.id}`);
    // TODO: Store dismissal in database
  }
}
