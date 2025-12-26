/**
 * Organization AI Budget Service
 * Manages organization-level AI budgets and multi-tenancy controls
 */

import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationAiBudget } from '../entities/organization-ai-budget.entity';
import { AI_CONFIG, AiOperationType } from '../constants/ai-config.constants';

@Injectable()
export class OrganizationAiBudgetService {
  private readonly logger = new Logger(OrganizationAiBudgetService.name);

  constructor(
    @InjectRepository(OrganizationAiBudget)
    private orgBudgetRepo: Repository<OrganizationAiBudget>,
  ) {}

  /**
   * Get or create organization AI budget
   */
  async getOrCreateBudget(organizationId: string): Promise<OrganizationAiBudget> {
    let budget = await this.orgBudgetRepo.findOne({
      where: { organizationId },
    });

    if (!budget) {
      // Create default budget
      budget = this.orgBudgetRepo.create({
        organizationId,
        monthlyTokenLimit: AI_CONFIG.BUDGET.MONTHLY_LIMIT,
        dailyTokenLimit: AI_CONFIG.BUDGET.DAILY_LIMIT,
        monthlyCostLimit: AI_CONFIG.BUDGET.COST_ALERT_THRESHOLD,
        tokensUsedThisMonth: 0,
        tokensUsedToday: 0,
        costThisMonth: 0,
      });

      budget = await this.orgBudgetRepo.save(budget);

      this.logger.log(
        `Created default AI budget for organization ${organizationId}`,
      );
    }

    return budget;
  }

  /**
   * Check if organization can perform AI operation
   */
  async canPerformOperation(
    organizationId: string,
    operationType: AiOperationType,
  ): Promise<{
    allowed: boolean;
    reason?: string;
    budget: OrganizationAiBudget;
  }> {
    const budget = await this.getOrCreateBudget(organizationId);

    // Check if feature is enabled
    const featureEnabled = this.isFeatureEnabled(budget, operationType);
    if (!featureEnabled) {
      return {
        allowed: false,
        reason: `AI feature ${operationType} is disabled for this organization`,
        budget,
      };
    }

    // Check if hard stop is active
    if (budget.hardStopActive) {
      return {
        allowed: false,
        reason: 'Organization has exceeded AI budget limits',
        budget,
      };
    }

    // Check daily token limit
    if (budget.tokensUsedToday >= budget.dailyTokenLimit) {
      return {
        allowed: false,
        reason: 'Daily token limit exceeded',
        budget,
      };
    }

    // Check monthly token limit
    if (budget.tokensUsedThisMonth >= budget.monthlyTokenLimit) {
      return {
        allowed: false,
        reason: 'Monthly token limit exceeded',
        budget,
      };
    }

    // Check if approaching hard stop threshold
    const monthlyTokenUsagePercent =
      (budget.tokensUsedThisMonth / budget.monthlyTokenLimit) * 100;

    if (monthlyTokenUsagePercent >= budget.hardStopThresholdPercent) {
      // Activate hard stop
      await this.orgBudgetRepo.update(
        { id: budget.id },
        { hardStopActive: true },
      );

      return {
        allowed: false,
        reason: `Budget hard stop activated (${budget.hardStopThresholdPercent}% threshold reached)`,
        budget,
      };
    }

    return {
      allowed: true,
      budget,
    };
  }

  /**
   * Record AI operation usage
   */
  async recordUsage(
    organizationId: string,
    tokensUsed: number,
    cost: number,
  ): Promise<void> {
    const budget = await this.getOrCreateBudget(organizationId);

    await this.orgBudgetRepo.update(
      { id: budget.id },
      {
        tokensUsedThisMonth: () => `tokensUsedThisMonth + ${tokensUsed}`,
        tokensUsedToday: () => `tokensUsedToday + ${tokensUsed}`,
        costThisMonth: () => `costThisMonth + ${cost}`,
        totalOperationsThisMonth: () => 'totalOperationsThisMonth + 1',
        lastOperationAt: new Date(),
      },
    );

    // Check if alert threshold reached
    const updatedBudget = await this.getOrCreateBudget(organizationId);
    await this.checkAndSendAlerts(updatedBudget);
  }

  /**
   * Check and send budget alerts
   */
  private async checkAndSendAlerts(budget: OrganizationAiBudget): Promise<void> {
    const monthlyTokenUsagePercent =
      (budget.tokensUsedThisMonth / budget.monthlyTokenLimit) * 100;

    const costUsagePercent =
      (Number(budget.costThisMonth) / Number(budget.monthlyCostLimit)) * 100;

    // Check if alert threshold reached and alert not yet sent
    if (
      !budget.alertSent &&
      (monthlyTokenUsagePercent >= budget.alertThresholdPercent ||
        costUsagePercent >= budget.alertThresholdPercent)
    ) {
      this.logger.warn(
        `Organization ${budget.organizationId} reached ${budget.alertThresholdPercent}% of AI budget`,
      );

      // Mark alert as sent
      await this.orgBudgetRepo.update(
        { id: budget.id },
        { alertSent: true },
      );

      // Here you could:
      // 1. Send email alerts to organization admins
      // 2. Send Slack/Teams notifications
      // 3. Create in-app notifications
      // 4. Log to external monitoring system
    }
  }

  /**
   * Reset daily usage counters (called by scheduler)
   */
  async resetDailyUsage(): Promise<void> {
    await this.orgBudgetRepo
      .createQueryBuilder()
      .update()
      .set({ tokensUsedToday: 0 })
      .execute();

    this.logger.log('Daily AI usage counters reset for all organizations');
  }

  /**
   * Reset monthly usage counters (called by scheduler)
   */
  async resetMonthlyUsage(): Promise<void> {
    await this.orgBudgetRepo
      .createQueryBuilder()
      .update()
      .set({
        tokensUsedThisMonth: 0,
        costThisMonth: 0,
        totalOperationsThisMonth: 0,
        alertSent: false,
        hardStopActive: false,
        lastBudgetResetAt: new Date(),
      })
      .execute();

    this.logger.log('Monthly AI usage counters reset for all organizations');
  }

  /**
   * Update organization budget settings
   */
  async updateBudget(
    organizationId: string,
    updates: Partial<OrganizationAiBudget>,
  ): Promise<OrganizationAiBudget> {
    const budget = await this.getOrCreateBudget(organizationId);

    await this.orgBudgetRepo.update({ id: budget.id }, updates);

    return this.getOrCreateBudget(organizationId);
  }

  /**
   * Check if feature is enabled for organization
   */
  private isFeatureEnabled(
    budget: OrganizationAiBudget,
    operationType: AiOperationType,
  ): boolean {
    // Map operation types to feature flags
    const documentOps = [
      AiOperationType.DOCUMENT_SUMMARY,
      AiOperationType.DOCUMENT_QA,
      AiOperationType.DOCUMENT_COMPARISON,
      AiOperationType.KEY_INFO_EXTRACTION,
      AiOperationType.CONFLICT_DETECTION,
      AiOperationType.SUGGEST_RELATED_DOCS,
    ];

    const projectOps = [
      AiOperationType.PROJECT_HEALTH_SCORE,
      AiOperationType.RISK_ASSESSMENT,
      AiOperationType.PATTERN_DETECTION,
      AiOperationType.ANOMALY_DETECTION,
    ];

    const autoActionOps = [
      AiOperationType.SUGGEST_RFI,
      AiOperationType.DRAFT_RFI_QUESTION,
      AiOperationType.GENERATE_SAFETY_OBSERVATION,
      AiOperationType.SUGGEST_COST_CODE,
      AiOperationType.AUTO_CATEGORIZE_DOCUMENT,
    ];

    const analyticsOps = [
      AiOperationType.BUDGET_FAC_FORECAST,
      AiOperationType.SCHEDULE_IMPACT_PREDICTION,
      AiOperationType.SUBCONTRACTOR_SCORING,
      AiOperationType.COST_TREND_FORECAST,
      AiOperationType.RFI_VELOCITY_PREDICTION,
    ];

    if (documentOps.includes(operationType)) {
      return budget.documentIntelligenceEnabled;
    }

    if (projectOps.includes(operationType)) {
      return budget.projectIntelligenceEnabled;
    }

    if (autoActionOps.includes(operationType)) {
      return budget.autoActionsEnabled;
    }

    if (analyticsOps.includes(operationType)) {
      return budget.analyticsForecastingEnabled;
    }

    return true; // Default to enabled
  }

  /**
   * Get usage statistics for organization
   */
  async getUsageStats(organizationId: string): Promise<{
    budget: OrganizationAiBudget;
    monthlyTokenUsagePercent: number;
    dailyTokenUsagePercent: number;
    costUsagePercent: number;
    daysUntilReset: number;
  }> {
    const budget = await this.getOrCreateBudget(organizationId);

    const monthlyTokenUsagePercent =
      budget.monthlyTokenLimit > 0
        ? (budget.tokensUsedThisMonth / budget.monthlyTokenLimit) * 100
        : 0;

    const dailyTokenUsagePercent =
      budget.dailyTokenLimit > 0
        ? (budget.tokensUsedToday / budget.dailyTokenLimit) * 100
        : 0;

    const costUsagePercent =
      Number(budget.monthlyCostLimit) > 0
        ? (Number(budget.costThisMonth) / Number(budget.monthlyCostLimit)) * 100
        : 0;

    // Calculate days until monthly reset
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const daysUntilReset = Math.ceil(
      (nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      budget,
      monthlyTokenUsagePercent,
      dailyTokenUsagePercent,
      costUsagePercent,
      daysUntilReset,
    };
  }

  /**
   * Get all organizations with budget alerts
   */
  async getOrganizationsWithAlerts(): Promise<OrganizationAiBudget[]> {
    return this.orgBudgetRepo.find({
      where: [{ hardStopActive: true }, { alertSent: true }],
    });
  }
}
