import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetricCalculator } from '../../interfaces/metric-calculator.interface';
import { MetricResult } from '../../interfaces/metric-result.interface';
import { CalculationOptions } from '../../interfaces/calculation-options.interface';
import { ValidationResult } from '../../interfaces/validation-result.interface';
import { MetricGroup } from '../../enums/metric-group.enum';
import { TrendDirection } from '../../enums/trend-direction.enum';
import { Project } from '../../../projects/entities/project.entity';
import { ProjectPhase } from '../../../projects/entities/project-phase.entity';

/**
 * BudgetCalculator Service
 *
 * Calculates budget and financial metrics including:
 * - Contract values and variances
 * - Cost tracking and forecasting
 * - Earned value metrics (CPI, EV)
 * - Burn rate analysis
 * - Cash flow projections
 */
@Injectable()
export class BudgetCalculatorService implements MetricCalculator {
  private readonly logger = new Logger(BudgetCalculatorService.name);

  readonly name = 'budget';
  readonly group = MetricGroup.BUDGET;
  readonly ttl = 900; // 15 minutes
  readonly isRealTime = false;
  readonly dependencies = ['schedule'];

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectPhase)
    private readonly phaseRepository: Repository<ProjectPhase>,
  ) {}

  async calculate(projectId: string, options?: CalculationOptions): Promise<MetricResult> {
    const startTime = Date.now();

    try {
      const project = await this.projectRepository.findOne({
        where: { id: projectId },
      });

      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      const phases = await this.phaseRepository.find({
        where: { projectId },
        order: { order: 'ASC' },
      });

      // Core financial metrics
      const originalContract = this.getOriginalContract(project);
      const currentContract = this.getCurrentContract(project);
      const contractVariance = this.calculateContractVariance(project);

      // Cost tracking (using phase data)
      const actualCostToDate = await this.calculateActualCostToDate(phases);
      const committedCosts = await this.calculateCommittedCosts(phases);
      const forecastAtCompletion = this.calculateForecastAtCompletion(
        actualCostToDate,
        committedCosts,
        currentContract,
        project.percentComplete || 0,
      );

      // Earned value metrics
      const earnedValue = this.calculateEarnedValue(currentContract, project.percentComplete || 0);
      const costPerformanceIndex = this.calculateCPI(earnedValue, actualCostToDate);
      const budgetVariance = currentContract - forecastAtCompletion;

      // Burn rate analysis
      const burnRates = this.calculateBurnRates(actualCostToDate, project);

      // Phase breakdown
      const phaseBreakdown = await this.calculatePhaseBreakdown(phases);

      // Cash flow projection
      const cashFlow = this.generateCashFlowProjection(
        project,
        actualCostToDate,
        currentContract,
        burnRates.monthly,
      );

      // Cost at completion estimates
      const estimateAtCompletion = this.calculateEAC(
        actualCostToDate,
        currentContract,
        earnedValue,
        costPerformanceIndex,
      );

      const metrics = {
        // Contract values
        originalContract,
        currentContract,
        contractVariance,
        contractVariancePercentage: this.calculatePercentage(contractVariance, originalContract),

        // Cost tracking
        actualCostToDate,
        committedCosts,
        forecastAtCompletion,
        remainingBudget: currentContract - actualCostToDate,

        // Earned value
        earnedValue,
        plannedValue: this.calculatePlannedValue(currentContract, project),
        costPerformanceIndex,
        budgetVariance,
        budgetVariancePercentage: this.calculatePercentage(budgetVariance, currentContract),

        // Performance indicators
        costVariance: earnedValue - actualCostToDate,
        scheduleVariance: earnedValue - this.calculatePlannedValue(currentContract, project),
        estimateAtCompletion,
        estimateToComplete: estimateAtCompletion - actualCostToDate,
        varianceAtCompletion: currentContract - estimateAtCompletion,

        // Burn rate
        burnRate: burnRates,

        // Breakdowns
        byPhase: phaseBreakdown,

        // Projections
        cashFlow: options?.includeTimeSeries ? cashFlow : undefined,

        // Status flags
        isOverBudget: actualCostToDate > earnedValue,
        isAtRisk: costPerformanceIndex < 0.95,
        projectedOverrun: forecastAtCompletion > currentContract,
      };

      return {
        group: this.group,
        calculatedAt: new Date(),
        calculationDuration: Date.now() - startTime,
        metrics,
        values: this.formatMetricValues(metrics),
        kpis: {
          primary: {
            key: 'costPerformanceIndex',
            value: costPerformanceIndex,
            label: 'Cost Performance',
            format: 'decimal',
            hasAlert: costPerformanceIndex < 0.9,
          },
          secondary: [
            {
              key: 'budgetVariance',
              value: budgetVariance,
              label: 'Budget Variance',
              format: 'currency',
              unit: 'USD',
            },
            {
              key: 'remainingBudget',
              value: metrics.remainingBudget,
              label: 'Remaining Budget',
              format: 'currency',
              unit: 'USD',
            },
          ],
        },
        summary: {
          totalBudget: currentContract,
          spent: actualCostToDate,
          committed: committedCosts,
          remaining: currentContract - actualCostToDate - committedCosts,
          percentSpent: this.calculatePercentage(actualCostToDate, currentContract),
        },
        breakdown: {
          dimension: 'phase',
          items: phaseBreakdown,
        },
        dataSourceVersion: await this.getDataSourceVersion(projectId),
      };
    } catch (error) {
      this.logger.error(`Failed to calculate budget metrics for project ${projectId}:`, error);
      throw error;
    }
  }

  async getDataSourceVersion(projectId: string): Promise<string> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    const latestPhase = await this.phaseRepository.findOne({
      where: { projectId },
      order: { updatedAt: 'DESC' },
    });

    const timestamps = [project?.updatedAt, latestPhase?.updatedAt].filter(Boolean);

    if (timestamps.length === 0) {
      return new Date().toISOString();
    }

    return Math.max(...timestamps.map((t) => t!.getTime())).toString();
  }

  async validate(projectId: string): Promise<ValidationResult> {
    const errors = [];
    const warnings = [];

    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      errors.push({
        code: 'PROJECT_NOT_FOUND',
        message: `Project ${projectId} not found`,
      });
    } else {
      if (!project.originalContract) {
        warnings.push({
          code: 'NO_ORIGINAL_CONTRACT',
          message: 'Project has no original contract value defined',
          suggestion: 'Set the original contract value for budget tracking',
        });
      }

      if (!project.currentContract) {
        warnings.push({
          code: 'NO_CURRENT_CONTRACT',
          message: 'Project has no current contract value defined',
          suggestion: 'Set the current contract value for budget tracking',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        checkedAt: new Date(),
        checksPerformed: ['project_exists', 'contract_values_defined'],
        dataAvailability: {
          project: !!project,
          originalContract: !!project?.originalContract,
          currentContract: !!project?.currentContract,
        },
      },
    };
  }

  private getOriginalContract(project: Project): number {
    return Number(project.originalContract || 0);
  }

  private getCurrentContract(project: Project): number {
    return Number(project.currentContract || project.originalContract || 0);
  }

  private calculateContractVariance(project: Project): number {
    const original = this.getOriginalContract(project);
    const current = this.getCurrentContract(project);
    return current - original;
  }

  private async calculateActualCostToDate(phases: ProjectPhase[]): Promise<number> {
    return phases.reduce((sum, phase) => sum + Number(phase.actualCost || 0), 0);
  }

  private async calculateCommittedCosts(phases: ProjectPhase[]): Promise<number> {
    // Calculate committed costs based on phase budgets and completion
    return phases.reduce((sum, phase) => {
      if (phase.budgetedCost) {
        const committed = Number(phase.budgetedCost) * (phase.percentComplete / 100);
        return sum + Math.max(committed - Number(phase.actualCost || 0), 0);
      }
      return sum;
    }, 0);
  }

  private calculateEarnedValue(contractValue: number, percentComplete: number): number {
    return (contractValue * percentComplete) / 100;
  }

  private calculatePlannedValue(contractValue: number, project: Project): number {
    if (!project.startDate || !project.endDate) {
      return 0;
    }

    const totalDuration = project.durationDays() || 1;
    const daysElapsed = Math.max(
      0,
      Math.ceil((new Date().getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24)),
    );

    const plannedProgress = Math.min(100, (daysElapsed / totalDuration) * 100);
    return (contractValue * plannedProgress) / 100;
  }

  private calculateCPI(earnedValue: number, actualCost: number): number {
    if (actualCost === 0) {
      return 1.0;
    }
    return Math.round((earnedValue / actualCost) * 100) / 100;
  }

  private calculateForecastAtCompletion(
    actualCost: number,
    committedCosts: number,
    contractValue: number,
    percentComplete: number,
  ): number {
    if (percentComplete === 0) {
      return contractValue;
    }

    if (percentComplete >= 100) {
      return actualCost;
    }

    // Estimate remaining work based on current burn rate
    const costPerPercent = actualCost / percentComplete;
    const remainingPercent = 100 - percentComplete;
    const estimatedRemainingCost = costPerPercent * remainingPercent;

    return actualCost + Math.max(estimatedRemainingCost, committedCosts);
  }

  private calculateEAC(
    actualCost: number,
    budgetAtCompletion: number,
    earnedValue: number,
    cpi: number,
  ): number {
    if (cpi === 0) {
      return budgetAtCompletion;
    }

    // EAC = AC + (BAC - EV) / CPI
    return actualCost + (budgetAtCompletion - earnedValue) / cpi;
  }

  private calculateBurnRates(actualCost: number, project: Project): any {
    const today = new Date();
    const startDate = project.startDate ? new Date(project.startDate) : today;

    const daysElapsed = Math.max(
      1,
      Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
    );

    const weeksElapsed = Math.max(1, daysElapsed / 7);
    const monthsElapsed = Math.max(1, daysElapsed / 30);

    return {
      daily: Math.round(actualCost / daysElapsed),
      weekly: Math.round(actualCost / weeksElapsed),
      monthly: Math.round(actualCost / monthsElapsed),
    };
  }

  private async calculatePhaseBreakdown(phases: ProjectPhase[]): Promise<any[]> {
    return phases.map((phase) => ({
      name: phase.name,
      value: Number(phase.actualCost || 0),
      budgeted: Number(phase.budgetedCost || 0),
      variance: Number(phase.budgetedCost || 0) - Number(phase.actualCost || 0),
      percentage: phase.percentComplete,
      metadata: {
        phaseId: phase.id,
        status: phase.status,
        earnedValue: phase.earnedValue,
      },
    }));
  }

  private generateCashFlowProjection(
    project: Project,
    actualCost: number,
    contractValue: number,
    monthlyBurnRate: number,
  ): any[] {
    const projection: any[] = [];
    const today = new Date();
    const endDate = project.endDate ? new Date(project.endDate) : null;

    if (!endDate || monthlyBurnRate === 0) {
      return projection;
    }

    let currentDate = new Date(today);
    let cumulativeCost = actualCost;

    while (currentDate <= endDate && cumulativeCost < contractValue) {
      cumulativeCost += monthlyBurnRate;
      projection.push({
        timestamp: new Date(currentDate),
        value: Math.min(cumulativeCost, contractValue),
        label: currentDate.toLocaleString('default', { month: 'short', year: 'numeric' }),
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return projection;
  }

  private calculatePercentage(value: number, total: number): number {
    if (total === 0) {
      return 0;
    }
    return Math.round((value / total) * 10000) / 100;
  }

  private formatMetricValues(metrics: any): any[] {
    const values = [];

    values.push({
      key: 'currentContract',
      value: metrics.currentContract,
      label: 'Current Budget',
      format: 'currency',
      unit: 'USD',
    });

    values.push({
      key: 'actualCostToDate',
      value: metrics.actualCostToDate,
      label: 'Actual Cost',
      format: 'currency',
      unit: 'USD',
      changePercentage: metrics.costPerformanceIndex > 1 ?
        (metrics.costPerformanceIndex - 1) * 100 :
        -(1 - metrics.costPerformanceIndex) * 100,
      trend: this.determineTrend(metrics.costPerformanceIndex),
    });

    values.push({
      key: 'costPerformanceIndex',
      value: metrics.costPerformanceIndex,
      label: 'CPI',
      format: 'decimal',
      hasAlert: metrics.costPerformanceIndex < 0.9,
      alertSeverity: metrics.costPerformanceIndex < 0.8 ? 'critical' : 'warning',
    });

    values.push({
      key: 'budgetVariance',
      value: metrics.budgetVariance,
      label: 'Budget Variance',
      format: 'currency',
      unit: 'USD',
      hasAlert: metrics.budgetVariance < 0,
      alertSeverity: metrics.budgetVariance < -metrics.currentContract * 0.1 ? 'critical' : 'warning',
    });

    values.push({
      key: 'forecastAtCompletion',
      value: metrics.forecastAtCompletion,
      label: 'Forecast at Completion',
      format: 'currency',
      unit: 'USD',
      hasAlert: metrics.forecastAtCompletion > metrics.currentContract,
    });

    return values;
  }

  private determineTrend(cpi: number): TrendDirection {
    if (cpi > 1.05) return TrendDirection.INCREASING;
    if (cpi < 0.95) return TrendDirection.DECREASING;
    return TrendDirection.STABLE;
  }
}