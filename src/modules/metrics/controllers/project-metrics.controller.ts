import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { MetricOrchestratorService } from '../services/metric-orchestrator.service';
import { GetProjectMetricsDto, ProjectMetricsResponseDto } from '../dto/project-metrics.dto';
import { BatchMetricsRequestDto, BatchMetricsResponseDto } from '../dto/batch-metrics.dto';
import { MetricGroup } from '../enums/metric-group.enum';
import { CalculationOptions } from '../interfaces/calculation-options.interface';

/**
 * ProjectMetricsController
 *
 * Handles all metric-related endpoints for projects
 */
@ApiTags('Project Metrics')
@Controller('api')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProjectMetricsController {
  private readonly logger = new Logger(ProjectMetricsController.name);

  constructor(
    private readonly orchestratorService: MetricOrchestratorService,
  ) {}

  /**
   * Get project metrics
   */
  @Get('projects/:projectId/metrics')
  @ApiOperation({ summary: 'Get project metrics' })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Project metrics retrieved successfully',
    type: ProjectMetricsResponseDto,
  })
  async getMetrics(
    @Param('projectId') projectId: string,
    @Query() query: GetProjectMetricsDto,
    @CurrentUser() user: User,
  ): Promise<ProjectMetricsResponseDto> {
    this.logger.debug(`Getting metrics for project ${projectId}, user: ${user.id}`);

    const options: CalculationOptions = {
      forceRefresh: query.refresh,
      includeHistory: query.includeHistory,
      includeComparison: query.includeComparison,
      comparisonType: query.comparisonType,
      includeAlerts: query.includeAlerts,
      metrics: query.groups?.map(g => g.toString()),
      dateRange: query.startDate && query.endDate ? {
        start: new Date(query.startDate),
        end: new Date(query.endDate),
      } : undefined,
      userContext: {
        userId: user.id,
        roles: [], // TODO: Get user roles
        permissions: [], // TODO: Get user permissions
      },
    };

    const metricsData = await this.orchestratorService.getMetrics(projectId, options);

    // Aggregate response
    const response: ProjectMetricsResponseDto = {
      projectId,
      calculatedAt: new Date(),
      metrics: {},
      kpis: {
        primary: undefined,
        secondary: [],
      },
      alerts: [],
      warnings: [],
      errors: [],
    };

    // Process each metric group
    for (const [group, result] of Object.entries(metricsData)) {
      response.metrics[group] = result.metrics;

      // Collect KPIs
      if (result.kpis?.primary && !response.kpis!.primary) {
        response.kpis!.primary = result.kpis.primary;
      }
      if (result.kpis?.secondary) {
        response.kpis!.secondary!.push(...result.kpis.secondary);
      }

      // Collect warnings and errors
      if (result.warnings) {
        response.warnings!.push(...result.warnings);
      }
      if (result.errors) {
        response.errors!.push(...result.errors);
      }

      // Track cache status
      if (result.fromCache) {
        response.fromCache = true;
        response.expiresAt = result.expiresAt;
      }
    }

    // TODO: Get alerts from alert service
    if (query.includeAlerts) {
      response.alerts = [];
    }

    // TODO: Get history from history service
    if (query.includeHistory) {
      response.history = [];
    }

    // TODO: Get comparison from comparison service
    if (query.includeComparison) {
      response.comparison = {};
    }

    // Generate summary
    response.summary = {
      groupsCalculated: Object.keys(response.metrics).length,
      hasErrors: response.errors!.length > 0,
      hasWarnings: response.warnings!.length > 0,
      hasAlerts: response.alerts!.length > 0,
    };

    return response;
  }

  /**
   * Batch get metrics for multiple projects
   */
  @Post('metrics/batch')
  @ApiOperation({ summary: 'Get metrics for multiple projects' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Batch metrics retrieved successfully',
    type: BatchMetricsResponseDto,
  })
  async getBatchMetrics(
    @Body() body: BatchMetricsRequestDto,
    @CurrentUser() user: User,
  ): Promise<BatchMetricsResponseDto> {
    const startTime = Date.now();
    this.logger.debug(`Getting batch metrics for ${body.projectIds.length} projects`);

    const response: BatchMetricsResponseDto = {
      projects: {},
      summary: {
        totalProjects: body.projectIds.length,
        successful: 0,
        failed: 0,
        fromCache: 0,
        calculationTime: 0,
      },
      errors: [],
    };

    // Process each project
    for (const projectId of body.projectIds) {
      try {
        const options: CalculationOptions = {
          metrics: body.groups?.map(g => g.toString()),
          includeKpis: body.includeKpis ?? true,
          includeAlerts: body.includeAlerts ?? false,
        };

        const metrics = await this.orchestratorService.getMetrics(projectId, options);

        // Aggregate metrics
        const projectMetrics: any = {
          projectId,
          metrics: {},
          fromCache: false,
          calculatedAt: new Date(),
          warnings: [],
        };

        for (const [group, result] of Object.entries(metrics)) {
          projectMetrics.metrics[group] = result.metrics;
          if (result.fromCache) projectMetrics.fromCache = true;
          if (result.warnings) projectMetrics.warnings.push(...result.warnings);
          if (result.kpis && body.includeKpis) {
            projectMetrics.kpis = result.kpis;
          }
        }

        response.projects[projectId] = projectMetrics;
        response.summary.successful++;
        if (projectMetrics.fromCache) response.summary.fromCache++;
      } catch (error: any) {
        response.summary.failed++;
        response.errors!.push({
          projectId,
          error: error.message || 'Unknown error',
        });
      }
    }

    response.summary.calculationTime = Date.now() - startTime;
    return response;
  }

  /**
   * Force refresh metrics
   */
  @Post('projects/:projectId/metrics/refresh')
  @ApiOperation({ summary: 'Force refresh project metrics' })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Metrics refreshed successfully',
  })
  async refreshMetrics(
    @Param('projectId') projectId: string,
    @Body() body: { groups?: MetricGroup[] },
    @CurrentUser() user: User,
  ): Promise<any> {
    this.logger.log(`Refreshing metrics for project ${projectId}, user: ${user.id}`);

    const metrics = await this.orchestratorService.forceRefresh(projectId, body.groups);

    return {
      projectId,
      refreshedAt: new Date(),
      groups: Object.keys(metrics),
      message: 'Metrics refreshed successfully',
    };
  }

  /**
   * Get metric history
   */
  @Get('projects/:projectId/metrics/history')
  @ApiOperation({ summary: 'Get metric history' })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Metric history retrieved',
  })
  async getHistory(
    @Param('projectId') projectId: string,
    @Query() query: {
      metric: string;
      startDate: string;
      endDate: string;
      interval?: string;
    },
    @CurrentUser() user: User,
  ): Promise<any> {
    this.logger.debug(`Getting metric history for project ${projectId}, metric: ${query.metric}`);

    // TODO: Implement history service
    return {
      projectId,
      metric: query.metric,
      startDate: query.startDate,
      endDate: query.endDate,
      interval: query.interval || 'daily',
      dataPoints: [],
      message: 'History service not yet implemented',
    };
  }

  /**
   * Get metric comparison
   */
  @Get('projects/:projectId/metrics/compare')
  @ApiOperation({ summary: 'Compare project metrics' })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Metric comparison retrieved',
  })
  async getComparison(
    @Param('projectId') projectId: string,
    @Query() query: {
      compareAgainst: string;
      metrics?: string[];
    },
    @CurrentUser() user: User,
  ): Promise<any> {
    this.logger.debug(`Getting metric comparison for project ${projectId}`);

    // TODO: Implement comparison service
    return {
      projectId,
      compareAgainst: query.compareAgainst,
      metrics: query.metrics || [],
      comparison: {},
      message: 'Comparison service not yet implemented',
    };
  }

  /**
   * Get metric alerts
   */
  @Get('projects/:projectId/metrics/alerts')
  @ApiOperation({ summary: 'Get metric alerts for project' })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Alerts retrieved',
  })
  async getAlerts(
    @Param('projectId') projectId: string,
    @Query() query: { status?: string; severity?: string },
    @CurrentUser() user: User,
  ): Promise<any> {
    this.logger.debug(`Getting alerts for project ${projectId}`);

    // TODO: Implement alert service
    return {
      projectId,
      alerts: [],
      total: 0,
      active: 0,
      acknowledged: 0,
      resolved: 0,
      message: 'Alert service not yet implemented',
    };
  }

  /**
   * Get metric thresholds
   */
  @Get('projects/:projectId/metrics/thresholds')
  @ApiOperation({ summary: 'Get metric thresholds for project' })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Thresholds retrieved',
  })
  async getThresholds(
    @Param('projectId') projectId: string,
    @CurrentUser() user: User,
  ): Promise<any> {
    this.logger.debug(`Getting thresholds for project ${projectId}`);

    // TODO: Implement threshold service
    return {
      projectId,
      thresholds: [],
      message: 'Threshold service not yet implemented',
    };
  }

  /**
   * Create metric threshold
   */
  @Post('projects/:projectId/metrics/thresholds')
  @ApiOperation({ summary: 'Create metric threshold' })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Threshold created',
  })
  async createThreshold(
    @Param('projectId') projectId: string,
    @Body() body: any,
    @CurrentUser() user: User,
  ): Promise<any> {
    this.logger.log(`Creating threshold for project ${projectId}`);

    // TODO: Implement threshold service
    return {
      id: 'threshold-id',
      projectId,
      ...body,
      createdBy: user.id,
      createdAt: new Date(),
      message: 'Threshold service not yet implemented',
    };
  }
}