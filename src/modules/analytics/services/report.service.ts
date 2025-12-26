import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedReport, ReportType } from '../entities/saved-report.entity';
import { CreateReportDto, UpdateReportDto } from '../dto/create-report.dto';
import { RfiAnalyticsService } from './rfi-analytics.service';
import { SubmittalAnalyticsService } from './submittal-analytics.service';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(SavedReport)
    private readonly reportRepository: Repository<SavedReport>,
    private readonly rfiAnalyticsService: RfiAnalyticsService,
    private readonly submittalAnalyticsService: SubmittalAnalyticsService,
  ) {}

  async createReport(
    projectId: string,
    organizationId: string,
    userId: string,
    dto: CreateReportDto,
  ): Promise<SavedReport> {
    const report = this.reportRepository.create({
      projectId,
      organizationId,
      createdById: userId,
      name: dto.name,
      description: dto.description,
      reportType: dto.reportType,
      configuration: dto.configuration as any,
      isTemplate: dto.isTemplate || false,
      isShared: dto.isShared || false,
      isScheduled: dto.isScheduled || false,
      scheduleConfig: dto.scheduleConfig,
    });

    return (await this.reportRepository.save(report)) as SavedReport;
  }

  async getReports(
    projectId: string,
    userId: string,
    organizationId: string,
  ): Promise<SavedReport[]> {
    // Get reports that are:
    // 1. Created by this user
    // 2. OR shared with the team
    // 3. OR organization templates
    return this.reportRepository
      .createQueryBuilder('report')
      .where('report.projectId = :projectId', { projectId })
      .andWhere('report.organizationId = :organizationId', { organizationId })
      .andWhere('(report.createdById = :userId OR report.isShared = true OR report.isTemplate = true)', {
        userId,
      })
      .orderBy('report.createdAt', 'DESC')
      .getMany();
  }

  async getReport(reportId: string): Promise<SavedReport> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
      relations: ['createdBy', 'project'],
    });

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    return report;
  }

  async updateReport(reportId: string, dto: UpdateReportDto): Promise<SavedReport> {
    const report = await this.getReport(reportId);

    Object.assign(report, dto);

    return this.reportRepository.save(report);
  }

  async deleteReport(reportId: string): Promise<void> {
    const result = await this.reportRepository.delete(reportId);

    if (result.affected === 0) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }
  }

  async runReport(reportId: string, projectId: string): Promise<any> {
    const report = await this.getReport(reportId);

    // Execute the report based on its type
    switch (report.reportType) {
      case ReportType.RFI_STATUS:
      case ReportType.RFI_AGING:
      case ReportType.RFI_RESPONSE_TIME:
      case ReportType.RFI_BY_DISCIPLINE:
      case ReportType.RFI_IMPACT:
        return this.runRfiReport(projectId, report);

      case ReportType.SUBMITTAL_STATUS:
      case ReportType.SUBMITTAL_LOG:
      case ReportType.SUBMITTAL_AGING:
      case ReportType.SUBMITTAL_BY_SPEC:
      case ReportType.SUBMITTAL_APPROVAL_RATE:
        return this.runSubmittalReport(projectId, report);

      case ReportType.COMBINED_DASHBOARD:
        return this.runCombinedReport(projectId, report);

      case ReportType.USER_PERFORMANCE:
        return this.runUserPerformanceReport(projectId, report);

      default:
        throw new Error(`Unsupported report type: ${report.reportType}`);
    }
  }

  private async runRfiReport(projectId: string, report: SavedReport): Promise<any> {
    // Convert report configuration to query params
    const queryParams: any = {};

    if (report.configuration.dateRange) {
      if (report.configuration.dateRange.startDate) {
        queryParams.startDate = report.configuration.dateRange.startDate;
      }
      if (report.configuration.dateRange.endDate) {
        queryParams.endDate = report.configuration.dateRange.endDate;
      }
      if (report.configuration.dateRange.relativePeriod) {
        queryParams.period = report.configuration.dateRange.relativePeriod;
      }
    }

    if (report.configuration.filters) {
      queryParams.statuses = report.configuration.filters.statuses;
      queryParams.priorities = report.configuration.filters.priorities;
      queryParams.disciplines = report.configuration.filters.disciplines;
      queryParams.assigneeIds = report.configuration.filters.assignees;
    }

    // Get full analytics
    const analytics = await this.rfiAnalyticsService.getAnalytics(projectId, queryParams);

    // Filter based on report type
    switch (report.reportType) {
      case ReportType.RFI_STATUS:
        return {
          reportName: report.name,
          reportType: report.reportType,
          generatedAt: new Date(),
          data: {
            summary: analytics.statusSummary,
            byPriority: analytics.byPriority,
            ballInCourt: analytics.ballInCourt,
          },
        };

      case ReportType.RFI_AGING:
        return {
          reportName: report.name,
          reportType: report.reportType,
          generatedAt: new Date(),
          data: {
            agingAnalysis: analytics.agingAnalysis,
          },
        };

      case ReportType.RFI_RESPONSE_TIME:
        return {
          reportName: report.name,
          reportType: report.reportType,
          generatedAt: new Date(),
          data: {
            responseTimeMetrics: analytics.responseTimeMetrics,
            topAssignees: analytics.topAssignees,
          },
        };

      case ReportType.RFI_BY_DISCIPLINE:
        return {
          reportName: report.name,
          reportType: report.reportType,
          generatedAt: new Date(),
          data: {
            byDiscipline: analytics.byDiscipline,
          },
        };

      case ReportType.RFI_IMPACT:
        return {
          reportName: report.name,
          reportType: report.reportType,
          generatedAt: new Date(),
          data: {
            impactSummary: analytics.impactSummary,
          },
        };

      default:
        return analytics;
    }
  }

  private async runSubmittalReport(projectId: string, report: SavedReport): Promise<any> {
    const queryParams: any = {};

    if (report.configuration.dateRange) {
      if (report.configuration.dateRange.startDate) {
        queryParams.startDate = report.configuration.dateRange.startDate;
      }
      if (report.configuration.dateRange.endDate) {
        queryParams.endDate = report.configuration.dateRange.endDate;
      }
      if (report.configuration.dateRange.relativePeriod) {
        queryParams.period = report.configuration.dateRange.relativePeriod;
      }
    }

    if (report.configuration.filters) {
      queryParams.statuses = report.configuration.filters.statuses;
      queryParams.specDivisions = report.configuration.filters.specSections;
      queryParams.companyIds = report.configuration.filters.companies;
    }

    const analytics = await this.submittalAnalyticsService.getAnalytics(projectId, queryParams);

    switch (report.reportType) {
      case ReportType.SUBMITTAL_STATUS:
        return {
          reportName: report.name,
          reportType: report.reportType,
          generatedAt: new Date(),
          data: {
            summary: analytics.statusSummary,
            byType: analytics.byType,
          },
        };

      case ReportType.SUBMITTAL_LOG:
      case ReportType.SUBMITTAL_AGING:
        return {
          reportName: report.name,
          reportType: report.reportType,
          generatedAt: new Date(),
          data: {
            summary: analytics.statusSummary,
            reviewTimeMetrics: analytics.reviewTimeMetrics,
          },
        };

      case ReportType.SUBMITTAL_BY_SPEC:
        return {
          reportName: report.name,
          reportType: report.reportType,
          generatedAt: new Date(),
          data: {
            bySpecDivision: analytics.bySpecDivision,
          },
        };

      case ReportType.SUBMITTAL_APPROVAL_RATE:
        return {
          reportName: report.name,
          reportType: report.reportType,
          generatedAt: new Date(),
          data: {
            approvalMetrics: analytics.approvalMetrics,
            contractorPerformance: analytics.contractorPerformance,
          },
        };

      default:
        return analytics;
    }
  }

  private async runCombinedReport(projectId: string, report: SavedReport): Promise<any> {
    const [rfiAnalytics, submittalAnalytics] = await Promise.all([
      this.rfiAnalyticsService.getAnalytics(projectId, {}),
      this.submittalAnalyticsService.getAnalytics(projectId, {}),
    ]);

    return {
      reportName: report.name,
      reportType: report.reportType,
      generatedAt: new Date(),
      data: {
        rfi: {
          summary: rfiAnalytics.statusSummary,
          responseTime: rfiAnalytics.responseTimeMetrics,
          impact: rfiAnalytics.impactSummary,
        },
        submittal: {
          summary: submittalAnalytics.statusSummary,
          approvalMetrics: submittalAnalytics.approvalMetrics,
          reviewTime: submittalAnalytics.reviewTimeMetrics,
        },
        combined: {
          totalOpenItems: rfiAnalytics.statusSummary.open +
            submittalAnalytics.statusSummary.submitted +
            submittalAnalytics.statusSummary.underReview,
          totalOverdueItems: rfiAnalytics.statusSummary.overdue + submittalAnalytics.statusSummary.overdue,
        },
      },
    };
  }

  private async runUserPerformanceReport(projectId: string, report: SavedReport): Promise<any> {
    const [rfiAnalytics, submittalAnalytics] = await Promise.all([
      this.rfiAnalyticsService.getAnalytics(projectId, {}),
      this.submittalAnalyticsService.getAnalytics(projectId, {}),
    ]);

    return {
      reportName: report.name,
      reportType: report.reportType,
      generatedAt: new Date(),
      data: {
        rfiAssignees: rfiAnalytics.topAssignees,
        submittalReviewers: submittalAnalytics.topReviewers,
        contractorPerformance: submittalAnalytics.contractorPerformance,
      },
    };
  }

  async getTemplates(organizationId: string): Promise<SavedReport[]> {
    return this.reportRepository.find({
      where: {
        organizationId,
        isTemplate: true,
      },
      order: { name: 'ASC' },
    });
  }

  async cloneReport(reportId: string, userId: string, newName: string): Promise<SavedReport> {
    const original = await this.getReport(reportId);

    const clone = this.reportRepository.create({
      projectId: original.projectId,
      organizationId: original.organizationId,
      createdById: userId,
      name: newName || `${original.name} (Copy)`,
      description: original.description,
      reportType: original.reportType,
      configuration: original.configuration,
      isTemplate: false,
      isShared: false,
      isScheduled: false,
    });

    return this.reportRepository.save(clone);
  }
}
