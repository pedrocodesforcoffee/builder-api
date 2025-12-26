/**
 * Analytics & Forecasting Service
 * AI-powered predictive analytics and forecasting
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from './ai.service';
import { AiOperationType } from '../constants/ai-config.constants';
import {
  BudgetFacForecastRequest,
  BudgetFacForecastResponse,
  ScheduleImpactPredictionRequest,
  ScheduleImpactPredictionResponse,
  SubcontractorScoringRequest,
  SubcontractorScoringResponse,
  CostTrendForecastRequest,
  CostTrendForecastResponse,
  RfiVelocityPredictionRequest,
  RfiVelocityPredictionResponse,
} from '../interfaces/ai-operation.interface';
import { BudgetLineItem } from '../../financials/entities/budget-line-item.entity';

@Injectable()
export class AnalyticsForecastingService {
  private readonly logger = new Logger(AnalyticsForecastingService.name);

  constructor(
    private aiService: AiService,
    @InjectRepository(BudgetLineItem)
    private budgetLineItemRepo: Repository<BudgetLineItem>,
  ) {}

  /**
   * Forecast budget at completion (FAC)
   */
  async forecastBudgetFAC(
    request: BudgetFacForecastRequest,
  ): Promise<BudgetFacForecastResponse> {
    this.logger.debug(
      `Forecasting FAC for ${request.lineItems.length} budget line items`,
    );

    const response = await this.aiService.executeOperation<BudgetFacForecastResponse>(
      request,
      {
        lineItems: request.lineItems,
        spendingPattern: request.spendingPattern,
        pendingChangeOrders: request.pendingChangeOrders,
      },
    );

    this.logger.log(
      `FAC forecast completed: Total forecasted FAC = $${response.result.totalForecastedFac.toLocaleString()}, Variance = $${response.result.totalVariance.toLocaleString()}`,
    );

    return response.result;
  }

  /**
   * Predict schedule impact
   */
  async predictScheduleImpact(
    request: ScheduleImpactPredictionRequest,
  ): Promise<ScheduleImpactPredictionResponse> {
    this.logger.debug(
      `Predicting schedule impact for: ${request.issueDescription.substring(0, 100)}...`,
    );

    const response = await this.aiService.executeOperation<ScheduleImpactPredictionResponse>(
      request,
      {
        issueDescription: request.issueDescription,
        currentPhase: request.currentPhase,
        percentComplete: request.percentComplete,
        daysRemaining: request.daysRemaining,
        criticalPathActivities: request.criticalPathActivities,
        historicalDelays: request.historicalDelays,
      },
    );

    this.logger.log(
      `Schedule impact predicted: ${response.result.estimatedDelayDays} days delay, Critical path: ${response.result.impactsCriticalPath ? 'YES' : 'NO'}, Cost impact: $${response.result.costImpact.toLocaleString()}`,
    );

    return response.result;
  }

  /**
   * Score subcontractor performance
   */
  async scoreSubcontractor(
    request: SubcontractorScoringRequest,
  ): Promise<SubcontractorScoringResponse> {
    this.logger.debug(`Scoring subcontractor: ${request.subName} (${request.trade})`);

    const response = await this.aiService.executeOperation<SubcontractorScoringResponse>(
      request,
      {
        subcontractorId: request.subcontractorId,
        subName: request.subName,
        trade: request.trade,
        metrics: request.metrics,
        projectHistory: request.projectHistory,
      },
    );

    this.logger.log(
      `Subcontractor scored: ${response.result.overallScore}/100 (${response.result.recommendation})`,
    );

    return response.result;
  }

  /**
   * Forecast cost trends
   */
  async forecastCostTrends(
    request: CostTrendForecastRequest,
  ): Promise<CostTrendForecastResponse> {
    this.logger.debug(`Forecasting cost trends for project: ${request.projectId}`);

    const response = await this.aiService.executeOperation<CostTrendForecastResponse>(
      request,
      {
        monthlyCosts: request.monthlyCosts,
        budget: request.budget,
        pendingChanges: request.pendingChanges,
      },
    );

    this.logger.log(
      `Cost trend forecast completed: Projected final cost = $${response.result.projectedFinalCost.toLocaleString()}, Variance = $${response.result.projectedVariance.toLocaleString()}, Burn rate: ${response.result.burnRateTrend}`,
    );

    return response.result;
  }

  /**
   * Predict RFI velocity
   */
  async predictRfiVelocity(
    request: RfiVelocityPredictionRequest,
  ): Promise<RfiVelocityPredictionResponse> {
    this.logger.debug(`Predicting RFI velocity for project: ${request.projectId}`);

    const response = await this.aiService.executeOperation<RfiVelocityPredictionResponse>(
      request,
      {
        stats: request.stats,
        historicalRfiData: request.historicalRfiData,
        currentPhase: request.currentPhase,
        percentComplete: request.percentComplete,
      },
    );

    this.logger.log(
      `RFI velocity predicted: ${response.result.expectedRfisNextMonth} RFIs next month, Avg response time: ${response.result.expectedAvgResponseTime} days, Risk: ${response.result.scheduleImpactRisk}`,
    );

    return response.result;
  }

  /**
   * Helper: Generate comprehensive financial forecast
   */
  async generateFinancialForecast(
    projectId: string,
    userId: string,
    budgetId: string,
  ): Promise<{
    facForecast: BudgetFacForecastResponse;
    costTrends: CostTrendForecastResponse;
  }> {
    // Load budget line items with cost code relation to get the code
    const lineItems = await this.budgetLineItemRepo.find({
      where: { budgetId },
      relations: ['costCode'],
      select: [
        'id',
        'description',
        'budgetedCost',
        'committedCost',
        'actualCost',
      ],
    });

    // Calculate percent complete (simplified)
    const lineItemsWithProgress = lineItems.map((item) => ({
      id: item.id,
      code: item.costCode?.code || '',
      description: item.description,
      budgetedCost: Number(item.budgetedCost),
      committedCost: Number(item.committedCost),
      actualCost: Number(item.actualCost),
      percentComplete:
        item.budgetedCost > 0
          ? Math.round((Number(item.actualCost) / Number(item.budgetedCost)) * 100)
          : 0,
    }));

    const totalBudgeted = lineItems.reduce(
      (sum, item) => sum + Number(item.budgetedCost),
      0,
    );
    const totalCommitted = lineItems.reduce(
      (sum, item) => sum + Number(item.committedCost),
      0,
    );
    const totalActual = lineItems.reduce(
      (sum, item) => sum + Number(item.actualCost),
      0,
    );

    // Forecast FAC
    const facForecast = await this.forecastBudgetFAC({
      projectId,
      userId,
      operationType: AiOperationType.BUDGET_FAC_FORECAST,
      lineItems: lineItemsWithProgress,
      spendingPattern: {}, // Would load historical spending data
      pendingChangeOrders: {}, // Would load pending change orders
    });

    // Forecast cost trends
    const costTrends = await this.forecastCostTrends({
      projectId,
      userId,
      operationType: AiOperationType.COST_TREND_FORECAST,
      monthlyCosts: [], // Would load monthly cost history
      budget: {
        original: totalBudgeted,
        current: totalBudgeted,
        committed: totalCommitted,
        actual: totalActual,
        remaining: totalBudgeted - totalActual,
      },
      pendingChanges: [], // Would load pending change orders
    });

    return {
      facForecast,
      costTrends,
    };
  }

  /**
   * Helper: Analyze schedule risk
   */
  async analyzeScheduleRisk(
    projectId: string,
    userId: string,
    issues: Array<{
      description: string;
      reportedDate: Date;
    }>,
    projectInfo: {
      currentPhase: string;
      percentComplete: number;
      daysRemaining: number;
      criticalPathActivities: string[];
    },
  ): Promise<
    Array<{
      issue: string;
      prediction: ScheduleImpactPredictionResponse;
    }>
  > {
    const predictions: Array<{
      issue: string;
      prediction: ScheduleImpactPredictionResponse;
    }> = [];

    for (const issue of issues) {
      try {
        const prediction = await this.predictScheduleImpact({
          projectId,
          userId,
          operationType: AiOperationType.SCHEDULE_IMPACT_PREDICTION,
          issueDescription: issue.description,
          currentPhase: projectInfo.currentPhase,
          percentComplete: projectInfo.percentComplete,
          daysRemaining: projectInfo.daysRemaining,
          criticalPathActivities: projectInfo.criticalPathActivities,
          historicalDelays: {}, // Would load historical delay data
        });

        predictions.push({
          issue: issue.description,
          prediction,
        });
      } catch (error: any) {
        this.logger.error(
          `Failed to predict schedule impact for issue: ${error.message}`,
        );
      }
    }

    return predictions;
  }

  /**
   * Helper: Batch score subcontractors
   */
  async batchScoreSubcontractors(
    projectId: string,
    userId: string,
    subcontractors: Array<{
      id: string;
      name: string;
      trade: string;
      metrics: {
        onTimePercent: number;
        qualityScore: number;
        safetyIncidents: number;
        avgRfiResponseDays: number;
        disputes: number;
      };
    }>,
  ): Promise<
    Array<{
      subcontractorId: string;
      score: SubcontractorScoringResponse;
    }>
  > {
    const scores: Array<{
      subcontractorId: string;
      score: SubcontractorScoringResponse;
    }> = [];

    for (const sub of subcontractors) {
      try {
        const score = await this.scoreSubcontractor({
          projectId,
          userId,
          operationType: AiOperationType.SUBCONTRACTOR_SCORING,
          subcontractorId: sub.id,
          subName: sub.name,
          trade: sub.trade,
          metrics: sub.metrics,
          projectHistory: {}, // Would load project history
        });

        scores.push({
          subcontractorId: sub.id,
          score,
        });
      } catch (error: any) {
        this.logger.error(
          `Failed to score subcontractor ${sub.id}: ${error.message}`,
        );
      }
    }

    return scores;
  }

  /**
   * Helper: Generate project insights dashboard
   */
  async generateInsightsDashboard(
    projectId: string,
    userId: string,
  ): Promise<{
    budgetForecast: BudgetFacForecastResponse | null;
    costTrends: CostTrendForecastResponse | null;
    rfiVelocity: RfiVelocityPredictionResponse | null;
    scheduleRisks: Array<{
      issue: string;
      prediction: ScheduleImpactPredictionResponse;
    }>;
  }> {
    // This would typically gather all necessary data
    // For now, return structure with placeholders

    return {
      budgetForecast: null,
      costTrends: null,
      rfiVelocity: null,
      scheduleRisks: [],
    };
  }
}
