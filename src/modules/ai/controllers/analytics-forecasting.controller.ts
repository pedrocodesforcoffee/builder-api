/**
 * Analytics & Forecasting Controller
 * API endpoints for AI-powered predictive analytics
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AnalyticsForecastingService } from '../services/analytics-forecasting.service';
import { AiOperationType } from '../constants/ai-config.constants';
import {
  BudgetFacForecastRequestDto,
  ScheduleImpactPredictionRequestDto,
  SubcontractorScoringRequestDto,
  CostTrendForecastRequestDto,
  RfiVelocityPredictionRequestDto,
} from '../dto/ai-request.dto';

@Controller('ai/analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsForecastingController {
  constructor(
    private analyticsForecasting: AnalyticsForecastingService,
  ) {}

  /**
   * POST /ai/analytics/forecast-budget-fac
   * Forecast budget at completion
   */
  @Post('forecast-budget-fac')
  async forecastBudgetFAC(
    @Body() dto: BudgetFacForecastRequestDto,
    @Request() req,
  ) {
    return this.analyticsForecasting.forecastBudgetFAC({
      ...dto,
      userId: req.user.userId,
      operationType: AiOperationType.BUDGET_FAC_FORECAST,
    });
  }

  /**
   * POST /ai/analytics/predict-schedule-impact
   * Predict schedule impact of an issue
   */
  @Post('predict-schedule-impact')
  async predictScheduleImpact(
    @Body() dto: ScheduleImpactPredictionRequestDto,
    @Request() req,
  ) {
    return this.analyticsForecasting.predictScheduleImpact({
      ...dto,
      userId: req.user.userId,
      operationType: AiOperationType.SCHEDULE_IMPACT_PREDICTION,
    });
  }

  /**
   * POST /ai/analytics/score-subcontractor
   * Score subcontractor performance
   */
  @Post('score-subcontractor')
  async scoreSubcontractor(
    @Body() dto: SubcontractorScoringRequestDto,
    @Request() req,
  ) {
    return this.analyticsForecasting.scoreSubcontractor({
      ...dto,
      userId: req.user.userId,
      operationType: AiOperationType.SUBCONTRACTOR_SCORING,
    });
  }

  /**
   * POST /ai/analytics/forecast-cost-trends
   * Forecast cost trends
   */
  @Post('forecast-cost-trends')
  async forecastCostTrends(
    @Body() dto: CostTrendForecastRequestDto,
    @Request() req,
  ) {
    return this.analyticsForecasting.forecastCostTrends({
      ...dto,
      userId: req.user.userId,
      operationType: AiOperationType.COST_TREND_FORECAST,
    });
  }

  /**
   * POST /ai/analytics/predict-rfi-velocity
   * Predict RFI velocity
   */
  @Post('predict-rfi-velocity')
  async predictRfiVelocity(
    @Body() dto: RfiVelocityPredictionRequestDto,
    @Request() req,
  ) {
    return this.analyticsForecasting.predictRfiVelocity({
      ...dto,
      userId: req.user.userId,
      operationType: AiOperationType.RFI_VELOCITY_PREDICTION,
    });
  }

  /**
   * GET /ai/analytics/projects/:projectId/budgets/:budgetId/financial-forecast
   * Generate comprehensive financial forecast
   */
  @Get('projects/:projectId/budgets/:budgetId/financial-forecast')
  async getFinancialForecast(
    @Param('projectId') projectId: string,
    @Param('budgetId') budgetId: string,
    @Request() req,
  ) {
    return this.analyticsForecasting.generateFinancialForecast(
      projectId,
      req.user.userId,
      budgetId,
    );
  }

  /**
   * POST /ai/analytics/projects/:projectId/analyze-schedule-risk
   * Analyze schedule risks for multiple issues
   */
  @Post('projects/:projectId/analyze-schedule-risk')
  async analyzeScheduleRisk(
    @Param('projectId') projectId: string,
    @Body() body: {
      issues: Array<{
        description: string;
        reportedDate: Date;
      }>;
      projectInfo: {
        currentPhase: string;
        percentComplete: number;
        daysRemaining: number;
        criticalPathActivities: string[];
      };
    },
    @Request() req,
  ) {
    return this.analyticsForecasting.analyzeScheduleRisk(
      projectId,
      req.user.userId,
      body.issues,
      body.projectInfo,
    );
  }

  /**
   * POST /ai/analytics/projects/:projectId/batch-score-subcontractors
   * Batch score all subcontractors
   */
  @Post('projects/:projectId/batch-score-subcontractors')
  async batchScoreSubcontractors(
    @Param('projectId') projectId: string,
    @Body() body: {
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
      }>;
    },
    @Request() req,
  ) {
    return this.analyticsForecasting.batchScoreSubcontractors(
      projectId,
      req.user.userId,
      body.subcontractors,
    );
  }

  /**
   * GET /ai/analytics/projects/:projectId/insights-dashboard
   * Get comprehensive insights dashboard
   */
  @Get('projects/:projectId/insights-dashboard')
  async getInsightsDashboard(
    @Param('projectId') projectId: string,
    @Request() req,
  ) {
    return this.analyticsForecasting.generateInsightsDashboard(
      projectId,
      req.user.userId,
    );
  }
}
