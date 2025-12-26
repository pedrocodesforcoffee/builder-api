/**
 * Project Intelligence Service
 * AI-powered project health scoring, risk assessment, and analytics
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from './ai.service';
import { AiOperationType } from '../constants/ai-config.constants';
import {
  ProjectHealthScoreRequest,
  ProjectHealthScoreResponse,
  RiskAssessmentRequest,
  RiskAssessmentResponse,
  PatternDetectionRequest,
  PatternDetectionResponse,
  AnomalyDetectionRequest,
  AnomalyDetectionResponse,
} from '../interfaces/ai-operation.interface';
import { Project } from '../../projects/entities/project.entity';

@Injectable()
export class ProjectIntelligenceService {
  private readonly logger = new Logger(ProjectIntelligenceService.name);

  constructor(
    private aiService: AiService,
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
  ) {}

  /**
   * Calculate project health score
   */
  async calculateHealthScore(
    request: ProjectHealthScoreRequest,
  ): Promise<ProjectHealthScoreResponse> {
    this.logger.debug(`Calculating health score for project: ${request.projectId}`);

    const response = await this.aiService.executeOperation<ProjectHealthScoreResponse>(
      request,
      {
        budget: request.budget,
        schedule: request.schedule,
        quality: request.quality,
      },
    );

    this.logger.log(
      `Health score calculated: ${response.result.overallScore}/100 | Trend: ${response.result.trend}`,
    );

    return response.result;
  }

  /**
   * Perform risk assessment
   */
  async assessRisks(
    request: RiskAssessmentRequest,
  ): Promise<RiskAssessmentResponse> {
    this.logger.debug(`Assessing risks for project: ${request.projectId}`);

    const response = await this.aiService.executeOperation<RiskAssessmentResponse>(
      request,
      {
        recentIssues: request.recentIssues,
        metrics: request.metrics,
        weatherData: request.weatherData || 'No weather data available',
      },
    );

    this.logger.log(
      `Risk assessment completed: ${response.result.risks.length} risks identified, ${response.result.criticalRisks.length} critical`,
    );

    return response.result;
  }

  /**
   * Detect patterns in project data
   */
  async detectPatterns(
    request: PatternDetectionRequest,
  ): Promise<PatternDetectionResponse> {
    this.logger.debug(`Detecting patterns for project: ${request.projectId}`);

    const response = await this.aiService.executeOperation<PatternDetectionResponse>(
      request,
      {
        costData: request.costData,
        rfiData: request.rfiData,
        safetyData: request.safetyData,
        dailyReportIssues: request.dailyReportIssues,
      },
    );

    this.logger.log(
      `Pattern detection completed: ${response.result.patterns.length} patterns found`,
    );

    return response.result;
  }

  /**
   * Detect anomalies in project data
   */
  async detectAnomalies(
    request: AnomalyDetectionRequest,
  ): Promise<AnomalyDetectionResponse> {
    this.logger.debug(`Detecting anomalies for project: ${request.projectId}`);

    const response = await this.aiService.executeOperation<AnomalyDetectionResponse>(
      request,
      {
        costEntries: request.costEntries,
        timeData: request.timeData,
        deliveryData: request.deliveryData,
      },
    );

    const criticalAnomalies = response.result.anomalies.filter(
      (a) => a.severity === 'critical' || a.severity === 'high',
    );

    this.logger.log(
      `Anomaly detection completed: ${response.result.anomalies.length} anomalies found, ${criticalAnomalies.length} critical/high`,
    );

    return response.result;
  }

  /**
   * Helper: Get comprehensive project metrics
   */
  async getProjectMetrics(projectId: string): Promise<{
    budget: any;
    schedule: any;
    quality: any;
  }> {
    // This would typically query multiple tables to gather metrics
    // For now, return a placeholder structure
    // In a real implementation, this would aggregate data from:
    // - Budget tables
    // - Schedule/timeline data
    // - RFI statistics
    // - Safety incident logs
    // - Punch list items

    return {
      budget: {
        original: 0,
        committed: 0,
        actual: 0,
        variance: 0,
      },
      schedule: {
        originalDays: 0,
        daysElapsed: 0,
        progressPercent: 0,
        variance: 0,
      },
      quality: {
        openRfis: 0,
        overdueRfis: 0,
        openPunchItems: 0,
        safetyIncidents: 0,
      },
    };
  }

  /**
   * Helper: Generate daily health report
   */
  async generateDailyHealthReport(
    projectId: string,
    userId: string,
  ): Promise<{
    healthScore: ProjectHealthScoreResponse;
    risks: RiskAssessmentResponse;
    timestamp: Date;
  }> {
    const metrics = await this.getProjectMetrics(projectId);

    // Calculate health score
    const healthScore = await this.calculateHealthScore({
      projectId,
      userId,
      operationType: AiOperationType.PROJECT_HEALTH_SCORE,
      budget: metrics.budget,
      schedule: metrics.schedule,
      quality: metrics.quality,
    });

    // Assess risks
    const risks = await this.assessRisks({
      projectId,
      userId,
      operationType: AiOperationType.RISK_ASSESSMENT,
      recentIssues: [], // Would query from database
      metrics: {
        budgetVariance: metrics.budget.variance,
        scheduleVariance: metrics.schedule.variance,
        openRfis: metrics.quality.openRfis,
        criticalObservations: 0,
      },
    });

    this.logger.log(
      `Daily health report generated for project ${projectId}: Score ${healthScore.overallScore}/100`,
    );

    return {
      healthScore,
      risks,
      timestamp: new Date(),
    };
  }

  /**
   * Helper: Monitor project trends
   */
  async monitorTrends(
    projectId: string,
    userId: string,
    daysToAnalyze: number = 30,
  ): Promise<{
    patterns: PatternDetectionResponse;
    anomalies: AnomalyDetectionResponse;
  }> {
    // This would typically query historical data
    // For now, use placeholder data

    const patterns = await this.detectPatterns({
      projectId,
      userId,
      operationType: AiOperationType.PATTERN_DETECTION,
      costData: {},
      rfiData: {},
      safetyData: {},
      dailyReportIssues: {},
    });

    const anomalies = await this.detectAnomalies({
      projectId,
      userId,
      operationType: AiOperationType.ANOMALY_DETECTION,
      costEntries: [],
      timeData: [],
      deliveryData: [],
    });

    return { patterns, anomalies };
  }

  /**
   * Helper: Get project alerts
   * Returns critical issues that need immediate attention
   */
  async getProjectAlerts(
    projectId: string,
    userId: string,
  ): Promise<
    Array<{
      type: 'health' | 'risk' | 'anomaly' | 'pattern';
      severity: 'critical' | 'high' | 'medium' | 'low';
      title: string;
      description: string;
      recommendation: string;
    }>
  > {
    const alerts: Array<{
      type: 'health' | 'risk' | 'anomaly' | 'pattern';
      severity: 'critical' | 'high' | 'medium' | 'low';
      title: string;
      description: string;
      recommendation: string;
    }> = [];

    // Get health score
    const metrics = await this.getProjectMetrics(projectId);
    const healthScore = await this.calculateHealthScore({
      projectId,
      userId,
      operationType: AiOperationType.PROJECT_HEALTH_SCORE,
      budget: metrics.budget,
      schedule: metrics.schedule,
      quality: metrics.quality,
    });

    // Add health concerns as alerts
    for (const concern of healthScore.concerns) {
      alerts.push({
        type: 'health',
        severity: concern.severity,
        title: `Project Health: ${concern.category}`,
        description: concern.description,
        recommendation: concern.recommendedAction,
      });
    }

    // Get risks
    const risks = await this.assessRisks({
      projectId,
      userId,
      operationType: AiOperationType.RISK_ASSESSMENT,
      recentIssues: [],
      metrics: {
        budgetVariance: metrics.budget.variance,
        scheduleVariance: metrics.schedule.variance,
        openRfis: metrics.quality.openRfis,
        criticalObservations: 0,
      },
    });

    // Add high-probability, high-impact risks as alerts
    for (const risk of risks.risks) {
      if (risk.probability >= 70 && risk.impact === 'high') {
        alerts.push({
          type: 'risk',
          severity: 'high',
          title: 'High-Probability Risk',
          description: risk.description,
          recommendation: risk.mitigation,
        });
      }
    }

    // Get anomalies
    const anomalies = await this.detectAnomalies({
      projectId,
      userId,
      operationType: AiOperationType.ANOMALY_DETECTION,
      costEntries: [],
      timeData: [],
      deliveryData: [],
    });

    // Add critical/high anomalies as alerts
    for (const anomaly of anomalies.anomalies) {
      if (anomaly.severity === 'critical' || anomaly.severity === 'high') {
        alerts.push({
          type: 'anomaly',
          severity: anomaly.severity,
          title: `Anomaly Detected: ${anomaly.type}`,
          description: anomaly.description,
          recommendation: anomaly.recommendation,
        });
      }
    }

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    this.logger.log(
      `Project alerts generated: ${alerts.length} total, ${alerts.filter((a) => a.severity === 'critical').length} critical`,
    );

    return alerts;
  }
}
