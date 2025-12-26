/**
 * Project Intelligence Controller
 * API endpoints for AI-powered project health and risk analysis
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
import { ProjectIntelligenceService } from '../services/project-intelligence.service';
import { AiOperationType } from '../constants/ai-config.constants';
import {
  ProjectHealthScoreRequestDto,
  RiskAssessmentRequestDto,
  PatternDetectionRequestDto,
  AnomalyDetectionRequestDto,
} from '../dto/ai-request.dto';

@Controller('ai/projects')
@UseGuards(JwtAuthGuard)
export class ProjectIntelligenceController {
  constructor(
    private projectIntelligence: ProjectIntelligenceService,
  ) {}

  /**
   * POST /ai/projects/health-score
   * Calculate project health score
   */
  @Post('health-score')
  async calculateHealthScore(
    @Body() dto: ProjectHealthScoreRequestDto,
    @Request() req,
  ) {
    return this.projectIntelligence.calculateHealthScore({
      ...dto,
      userId: req.user.userId,
      operationType: AiOperationType.PROJECT_HEALTH_SCORE,
    });
  }

  /**
   * POST /ai/projects/risk-assessment
   * Perform risk assessment
   */
  @Post('risk-assessment')
  async assessRisks(
    @Body() dto: RiskAssessmentRequestDto,
    @Request() req,
  ) {
    return this.projectIntelligence.assessRisks({
      ...dto,
      userId: req.user.userId,
      operationType: AiOperationType.RISK_ASSESSMENT,
    });
  }

  /**
   * POST /ai/projects/detect-patterns
   * Detect patterns in project data
   */
  @Post('detect-patterns')
  async detectPatterns(
    @Body() dto: PatternDetectionRequestDto,
    @Request() req,
  ) {
    return this.projectIntelligence.detectPatterns({
      ...dto,
      userId: req.user.userId,
      operationType: AiOperationType.PATTERN_DETECTION,
    });
  }

  /**
   * POST /ai/projects/detect-anomalies
   * Detect anomalies in project data
   */
  @Post('detect-anomalies')
  async detectAnomalies(
    @Body() dto: AnomalyDetectionRequestDto,
    @Request() req,
  ) {
    return this.projectIntelligence.detectAnomalies({
      ...dto,
      userId: req.user.userId,
      operationType: AiOperationType.ANOMALY_DETECTION,
    });
  }

  /**
   * GET /ai/projects/:projectId/daily-health-report
   * Generate daily health report
   */
  @Get(':projectId/daily-health-report')
  async getDailyHealthReport(
    @Param('projectId') projectId: string,
    @Request() req,
  ) {
    return this.projectIntelligence.generateDailyHealthReport(
      projectId,
      req.user.userId,
    );
  }

  /**
   * GET /ai/projects/:projectId/trends
   * Monitor project trends
   */
  @Get(':projectId/trends')
  async monitorTrends(
    @Param('projectId') projectId: string,
    @Query('daysToAnalyze') daysToAnalyze: string = '30',
    @Request() req,
  ) {
    return this.projectIntelligence.monitorTrends(
      projectId,
      req.user.userId,
      parseInt(daysToAnalyze, 10),
    );
  }

  /**
   * GET /ai/projects/:projectId/alerts
   * Get project alerts
   */
  @Get(':projectId/alerts')
  async getAlerts(
    @Param('projectId') projectId: string,
    @Request() req,
  ) {
    return this.projectIntelligence.getProjectAlerts(
      projectId,
      req.user.userId,
    );
  }
}
