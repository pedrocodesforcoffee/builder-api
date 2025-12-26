import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiProduces,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RfiAnalyticsService } from '../services/rfi-analytics.service';
import { SubmittalAnalyticsService } from '../services/submittal-analytics.service';
import { ExportService } from '../services/export.service';
import { ReportService } from '../services/report.service';
import { AnalyticsSnapshotService } from '../services/analytics-snapshot.service';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import { ExportRequestDto } from '../dto/export-request.dto';
import { CreateReportDto, UpdateReportDto } from '../dto/create-report.dto';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/analytics')
export class AnalyticsController {
  constructor(
    private readonly rfiAnalyticsService: RfiAnalyticsService,
    private readonly submittalAnalyticsService: SubmittalAnalyticsService,
    private readonly exportService: ExportService,
    private readonly reportService: ReportService,
    private readonly snapshotService: AnalyticsSnapshotService,
  ) {}

  // ============ RFI Analytics ============

  @Get('rfis')
  @ApiOperation({ summary: 'Get RFI analytics for project' })
  @ApiParam({ name: 'projectId', type: 'string' })
  async getRfiAnalytics(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.rfiAnalyticsService.getAnalytics(projectId, query);
  }

  @Get('rfis/summary')
  @ApiOperation({ summary: 'Get RFI status summary' })
  async getRfiSummary(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.rfiAnalyticsService.getStatusSummary(projectId, query);
  }

  @Get('rfis/response-time')
  @ApiOperation({ summary: 'Get RFI response time metrics' })
  async getRfiResponseTime(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    const { startDate, endDate } = this.resolveDates(query);
    return this.rfiAnalyticsService.getResponseTimeMetrics(projectId, startDate, endDate);
  }

  @Get('rfis/aging')
  @ApiOperation({ summary: 'Get RFI aging analysis' })
  async getRfiAging(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.rfiAnalyticsService.getAgingAnalysis(projectId);
  }

  @Get('rfis/bottlenecks')
  @ApiOperation({ summary: 'Get RFI bottleneck analysis' })
  async getRfiBottlenecks(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.rfiAnalyticsService.getBottlenecks(projectId);
  }

  // ============ Submittal Analytics ============

  @Get('submittals')
  @ApiOperation({ summary: 'Get submittal analytics for project' })
  async getSubmittalAnalytics(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.submittalAnalyticsService.getAnalytics(projectId, query);
  }

  @Get('submittals/summary')
  @ApiOperation({ summary: 'Get submittal status summary' })
  async getSubmittalSummary(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.submittalAnalyticsService.getStatusSummary(projectId, query);
  }

  @Get('submittals/approval-metrics')
  @ApiOperation({ summary: 'Get submittal approval metrics' })
  async getSubmittalApprovalMetrics(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    const { startDate, endDate } = this.resolveDates(query);
    return this.submittalAnalyticsService.getApprovalMetrics(projectId, startDate, endDate);
  }

  @Get('submittals/lead-time')
  @ApiOperation({ summary: 'Get submittal lead time analysis' })
  async getSubmittalLeadTime(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.submittalAnalyticsService.getLeadTimeAnalysis(projectId);
  }

  @Get('submittals/by-division')
  @ApiOperation({ summary: 'Get submittals by spec division' })
  async getSubmittalsByDivision(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.submittalAnalyticsService.getBySpecDivision(projectId, query);
  }

  @Get('submittals/contractor-performance')
  @ApiOperation({ summary: 'Get contractor submittal performance' })
  async getContractorPerformance(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    const { startDate, endDate } = this.resolveDates(query);
    return this.submittalAnalyticsService.getContractorPerformance(projectId, startDate, endDate);
  }

  // ============ Combined Dashboard ============

  @Get('dashboard')
  @ApiOperation({ summary: 'Get combined RFI/Submittal dashboard' })
  async getDashboard(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    const [rfiAnalytics, submittalAnalytics] = await Promise.all([
      this.rfiAnalyticsService.getAnalytics(projectId, query),
      this.submittalAnalyticsService.getAnalytics(projectId, query),
    ]);

    return {
      projectId,
      period: rfiAnalytics.period,
      rfi: {
        summary: rfiAnalytics.statusSummary,
        responseTime: rfiAnalytics.responseTimeMetrics,
        impact: rfiAnalytics.impactSummary,
        bottlenecks: rfiAnalytics.bottlenecks.slice(0, 3),
      },
      submittal: {
        summary: submittalAnalytics.statusSummary,
        approvalMetrics: submittalAnalytics.approvalMetrics,
        reviewTime: submittalAnalytics.reviewTimeMetrics,
        leadTime: submittalAnalytics.leadTimeAnalysis,
      },
      combined: {
        totalOpenItems: rfiAnalytics.statusSummary.open + submittalAnalytics.statusSummary.submitted + submittalAnalytics.statusSummary.underReview,
        totalOverdueItems: rfiAnalytics.statusSummary.overdue + submittalAnalytics.statusSummary.overdue,
        healthScore: this.calculateHealthScore(rfiAnalytics, submittalAnalytics),
      },
    };
  }

  // ============ Export ============

  @Post('export')
  @ApiOperation({ summary: 'Export analytics data' })
  @ApiProduces('application/octet-stream')
  async exportData(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: ExportRequestDto,
    @Res() res: Response,
  ) {
    const result = await this.exportService.exportData(projectId, dto);

    res.set({
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Content-Length': result.buffer.length,
    });

    res.send(result.buffer);
  }

  // ============ Saved Reports ============

  @Get('reports')
  @ApiOperation({ summary: 'Get saved reports for project' })
  async getSavedReports(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: any,
  ) {
    return this.reportService.getReports(projectId, user.sub, user.organizationId);
  }

  @Post('reports')
  @ApiOperation({ summary: 'Create a saved report' })
  async createReport(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateReportDto,
  ) {
    return this.reportService.createReport(projectId, user.organizationId, user.sub, dto);
  }

  @Get('reports/:reportId')
  @ApiOperation({ summary: 'Get a specific saved report' })
  async getReport(@Param('reportId', ParseUUIDPipe) reportId: string) {
    return this.reportService.getReport(reportId);
  }

  @Put('reports/:reportId')
  @ApiOperation({ summary: 'Update a saved report' })
  async updateReport(
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: UpdateReportDto,
  ) {
    return this.reportService.updateReport(reportId, dto);
  }

  @Post('reports/:reportId/run')
  @ApiOperation({ summary: 'Run a saved report' })
  async runReport(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
  ) {
    return this.reportService.runReport(reportId, projectId);
  }

  @Post('reports/:reportId/clone')
  @ApiOperation({ summary: 'Clone a saved report' })
  async cloneReport(
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @CurrentUser() user: any,
    @Body() body: { name: string },
  ) {
    return this.reportService.cloneReport(reportId, user.sub, body.name);
  }

  @Delete('reports/:reportId')
  @ApiOperation({ summary: 'Delete a saved report' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async deleteReport(@Param('reportId', ParseUUIDPipe) reportId: string) {
    await this.reportService.deleteReport(reportId);
    return;
  }

  @Get('reports/templates')
  @ApiOperation({ summary: 'Get report templates' })
  async getReportTemplates(@CurrentUser() user: any) {
    return this.reportService.getTemplates(user.organizationId);
  }

  // ============ Snapshots ============

  @Get('snapshots/historical')
  @ApiOperation({ summary: 'Get historical snapshots' })
  async getHistoricalSnapshots(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('type') type: string,
    @Query('limit') limit?: number,
  ) {
    return this.snapshotService.getHistoricalSnapshots(projectId, type as any, limit);
  }

  @Get('snapshots/trends')
  @ApiOperation({ summary: 'Get snapshot trends over time' })
  async getSnapshotTrends(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: { type: string; startDate: string; endDate: string },
  ) {
    return this.snapshotService.getSnapshotTrends(
      projectId,
      query.type as any,
      new Date(query.startDate),
      new Date(query.endDate),
    );
  }

  @Post('snapshots/compare')
  @ApiOperation({ summary: 'Compare two snapshots' })
  async compareSnapshots(@Body() body: { snapshotId1: string; snapshotId2: string }) {
    return this.snapshotService.compareSnapshots(body.snapshotId1, body.snapshotId2);
  }

  @Post('snapshots/create')
  @ApiOperation({ summary: 'Manually create a snapshot' })
  async createSnapshot(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: any,
    @Body() body: { type: string },
  ) {
    return this.snapshotService.createSnapshot(projectId, user.organizationId, body.type as any);
  }

  // ============ Helpers ============

  private resolveDates(query: AnalyticsQueryDto): { startDate: Date; endDate: Date } {
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { startDate, endDate };
  }

  private calculateHealthScore(rfiAnalytics: any, submittalAnalytics: any): number {
    // Calculate health score 0-100 based on various factors
    let score = 100;

    // RFI factors
    const rfiOverdueRate = rfiAnalytics.statusSummary.overdue / Math.max(rfiAnalytics.statusSummary.open, 1);
    score -= rfiOverdueRate * 20;

    if (rfiAnalytics.responseTimeMetrics.onTimePercentage < 80) {
      score -= (80 - rfiAnalytics.responseTimeMetrics.onTimePercentage) * 0.3;
    }

    // Submittal factors
    const submittalOverdueRate = submittalAnalytics.statusSummary.overdue /
      Math.max(submittalAnalytics.statusSummary.submitted + submittalAnalytics.statusSummary.underReview, 1);
    score -= submittalOverdueRate * 20;

    if (submittalAnalytics.approvalMetrics.firstTimeApprovalRate < 70) {
      score -= (70 - submittalAnalytics.approvalMetrics.firstTimeApprovalRate) * 0.2;
    }

    // Lead time risk
    const leadTimeRisk = submittalAnalytics.leadTimeAnalysis.atRisk + submittalAnalytics.leadTimeAnalysis.late;
    score -= leadTimeRisk * 2;

    return Math.max(0, Math.min(100, Math.round(score)));
  }
}
