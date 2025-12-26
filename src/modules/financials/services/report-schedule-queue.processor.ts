import { Processor, Process } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bull';
import { ReportSchedule, ReportType, ReportFormat } from '../entities/report-schedule.entity';
import { Project } from '../../projects/entities/project.entity';

// Import all 16 report generation services
import { BudgetDetailReportService } from './budget-detail-report.service';
import { WIPReportService } from './wip-report.service';
import { CostToCompleteReportService } from './cost-to-complete-report.service';
import { CommitmentListReportService } from './commitment-list-report.service';
import { EarnedValueAnalysisReportService } from './earned-value-analysis-report.service';
import { CashFlowProjectionReportService } from './cash-flow-projection-report.service';
import { InvoiceRegisterReportService } from './invoice-register-report.service';
import { ExecutiveSummaryReportService } from './executive-summary-report.service';
import { BudgetVarianceReportService } from './budget-variance-report.service';
import { CommitmentStatusReportService } from './commitment-status-report.service';
import { PaymentHistoryReportService } from './payment-history-report.service';
import { AgingReportService } from './aging-report.service';
import { ChangeOrderLogReportService } from './change-order-log-report.service';
import { ChangeOrderSummaryReportService } from './change-order-summary-report.service';
import { SubcontractorSummaryReportService } from './subcontractor-summary-report.service';
import { VendorPaymentsReportService } from './vendor-payments-report.service';

// Import export services
import { ReportExcelExportService } from './report-excel-export.service';
import { ReportPdfExportService } from './report-pdf-export.service';
import { ReportEmailService } from './report-email.service';

/**
 * Report Schedule Queue Processor
 *
 * Processes scheduled report generation jobs from Bull queue.
 * Handles all 16 financial report types with PDF and Excel export support.
 *
 * Job Processing Flow:
 * 1. Fetch schedule by ID from database
 * 2. Validate schedule is active
 * 3. Fetch project details
 * 4. Generate report data using appropriate service based on reportType
 * 5. Export report to PDF or Excel format
 * 6. Send email with attachment to recipients
 * 7. Update schedule: lastRunAt, runCount, failureCount=0, nextRunAt
 * 8. On error: Update schedule with failure details
 *
 * Error Handling:
 * - All errors are caught and logged
 * - Schedule failure counters are incremented
 * - Jobs don't throw errors (failures are recorded in DB)
 */
@Processor('report-schedule')
@Injectable()
export class ReportScheduleQueueProcessor {
  private readonly logger = new Logger(ReportScheduleQueueProcessor.name);

  constructor(
    @InjectRepository(ReportSchedule)
    private readonly reportScheduleRepo: Repository<ReportSchedule>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,

    // Inject all 16 report generation services
    private readonly budgetDetailService: BudgetDetailReportService,
    private readonly wipService: WIPReportService,
    private readonly costToCompleteService: CostToCompleteReportService,
    private readonly commitmentListService: CommitmentListReportService,
    private readonly earnedValueAnalysisService: EarnedValueAnalysisReportService,
    private readonly cashFlowProjectionService: CashFlowProjectionReportService,
    private readonly invoiceRegisterService: InvoiceRegisterReportService,
    private readonly executiveSummaryService: ExecutiveSummaryReportService,
    private readonly budgetVarianceService: BudgetVarianceReportService,
    private readonly commitmentStatusService: CommitmentStatusReportService,
    private readonly paymentHistoryService: PaymentHistoryReportService,
    private readonly agingService: AgingReportService,
    private readonly changeOrderLogService: ChangeOrderLogReportService,
    private readonly changeOrderSummaryService: ChangeOrderSummaryReportService,
    private readonly subcontractorSummaryService: SubcontractorSummaryReportService,
    private readonly vendorPaymentsService: VendorPaymentsReportService,

    // Inject export services
    private readonly excelExportService: ReportExcelExportService,
    private readonly pdfExportService: ReportPdfExportService,
    private readonly emailService: ReportEmailService,
  ) {}

  /**
   * Process report generation job
   *
   * @param job - Bull job containing scheduleId and optional overrides
   */
  @Process('generate-report')
  async processReportGeneration(
    job: Job<{ scheduleId: string; overrides?: any }>,
  ): Promise<void> {
    const { scheduleId, overrides } = job.data;

    this.logger.log(`Processing report generation job for schedule ${scheduleId}`);

    try {
      // 1. Fetch schedule
      const schedule = await this.reportScheduleRepo.findOne({
        where: { id: scheduleId },
        relations: ['project'],
      });

      if (!schedule) {
        this.logger.warn(`Schedule ${scheduleId} not found, skipping job`);
        return;
      }

      // 2. Validate schedule is active
      if (!schedule.isActive) {
        this.logger.warn(`Schedule ${scheduleId} is inactive, skipping job`);
        return;
      }

      // 3. Fetch project details
      const project = await this.projectRepo.findOne({
        where: { id: schedule.projectId },
      });

      if (!project) {
        throw new Error(`Project ${schedule.projectId} not found`);
      }

      this.logger.log(
        `Generating ${schedule.reportType} report for project ${project.name}`,
      );

      // 4. Generate report data based on reportType
      const reportData = await this.generateReportData(schedule, overrides);

      // 5. Export to format
      const { buffer, mimeType, fileExtension } = await this.exportReport(
        schedule,
        reportData,
      );

      // 6. Send email
      const filename = this.generateFilename(schedule, project, fileExtension);
      const recipients = (overrides?.emailRecipients || schedule.emailRecipients)
        .split(',')
        .map((e: string) => e.trim());

      const subject = this.replacePlaceholders(schedule.emailSubject, {
        reportName: schedule.reportName,
        date: new Date().toISOString().split('T')[0],
        projectName: project.name,
      });

      const body = this.replacePlaceholders(schedule.emailBody, {
        reportName: schedule.reportName,
        date: new Date().toISOString().split('T')[0],
        projectName: project.name,
      });

      await this.emailService.sendReportEmail(
        recipients,
        subject,
        body,
        buffer,
        filename,
        mimeType,
      );

      // 7. Update success
      schedule.lastRunAt = new Date();
      schedule.runCount++;
      schedule.failureCount = 0;
      schedule.nextRunAt = this.calculateNextRun(schedule);
      await this.reportScheduleRepo.save(schedule);

      this.logger.log(
        `Successfully processed report schedule ${scheduleId}. Next run: ${schedule.nextRunAt?.toISOString()}`,
      );
    } catch (error) {
      // Handle errors - update failure status
      this.logger.error(
        `Failed to process report schedule ${scheduleId}:`,
        (error as Error).stack,
      );

      try {
        const schedule = await this.reportScheduleRepo.findOne({
          where: { id: scheduleId },
        });

        if (schedule) {
          schedule.lastFailureAt = new Date();
          schedule.lastFailureReason = (error as Error).message || 'Unknown error';
          schedule.failureCount++;
          await this.reportScheduleRepo.save(schedule);

          this.logger.log(
            `Updated failure status for schedule ${scheduleId} (failure count: ${schedule.failureCount})`,
          );
        }
      } catch (updateError: any) {
        this.logger.error(
          `Failed to update failure status for schedule ${scheduleId}:`,
          updateError.stack,
        );
      }
    }
  }

  /**
   * Generate report data using appropriate service based on report type
   *
   * @param schedule - Report schedule entity
   * @param overrides - Optional parameter overrides
   * @returns Report data DTO
   */
  private async generateReportData(
    schedule: ReportSchedule,
    overrides?: any,
  ): Promise<any> {
    const parameters = {
      projectId: schedule.projectId,
      ...(schedule.parameters || {}),
      ...(overrides?.parameters || {}),
    };

    switch (schedule.reportType) {
      case ReportType.BUDGET_DETAIL:
        return await this.budgetDetailService.generate(parameters);

      case ReportType.WIP:
        return await this.wipService.generate(parameters);

      case ReportType.COST_TO_COMPLETE:
        return await this.costToCompleteService.generate(parameters);

      case ReportType.COMMITMENT_LIST:
        return await this.commitmentListService.generate(parameters);

      case ReportType.EARNED_VALUE_ANALYSIS:
        return await this.earnedValueAnalysisService.generate(parameters);

      case ReportType.CASH_FLOW_PROJECTION:
        return await this.cashFlowProjectionService.generate(parameters);

      case ReportType.INVOICE_REGISTER:
        return await this.invoiceRegisterService.generate(parameters);

      case ReportType.EXECUTIVE_SUMMARY:
        return await this.executiveSummaryService.generate(parameters);

      case ReportType.BUDGET_VARIANCE:
        return await this.budgetVarianceService.generate(parameters);

      case ReportType.COMMITMENT_STATUS:
        return await this.commitmentStatusService.generate(parameters);

      case ReportType.PAYMENT_HISTORY:
        return await this.paymentHistoryService.generate(parameters);

      case ReportType.AGING:
        return await this.agingService.generate(parameters);

      case ReportType.CHANGE_ORDER_LOG:
        return await this.changeOrderLogService.generate(parameters);

      case ReportType.CHANGE_ORDER_SUMMARY:
        return await this.changeOrderSummaryService.generate(parameters);

      case ReportType.SUBCONTRACTOR_SUMMARY:
        return await this.subcontractorSummaryService.generate(parameters);

      case ReportType.VENDOR_PAYMENTS:
        return await this.vendorPaymentsService.generate(parameters);

      default:
        throw new Error(`Unsupported report type: ${schedule.reportType}`);
    }
  }

  /**
   * Export report to PDF or Excel format
   *
   * @param schedule - Report schedule entity
   * @param reportData - Generated report data
   * @returns Object containing buffer, mimeType, and fileExtension
   */
  private async exportReport(
    schedule: ReportSchedule,
    reportData: any,
  ): Promise<{ buffer: Buffer; mimeType: string; fileExtension: string }> {
    let buffer: Buffer;
    let mimeType: string;
    let fileExtension: string;

    if (schedule.format === ReportFormat.PDF) {
      buffer = await this.exportToPdf(schedule.reportType, reportData);
      mimeType = 'application/pdf';
      fileExtension = 'pdf';
    } else {
      buffer = await this.exportToExcel(schedule.reportType, reportData);
      mimeType =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      fileExtension = 'xlsx';
    }

    return { buffer, mimeType, fileExtension };
  }

  /**
   * Export report data to PDF using appropriate export method
   *
   * @param reportType - Type of report
   * @param reportData - Report data to export
   * @returns PDF file as Buffer
   */
  private async exportToPdf(reportType: ReportType, reportData: any): Promise<Buffer> {
    switch (reportType) {
      case ReportType.BUDGET_DETAIL:
        return await this.pdfExportService.exportBudgetDetailToPdf(reportData);

      case ReportType.WIP:
        return await this.pdfExportService.exportWIPToPdf(reportData);

      case ReportType.COST_TO_COMPLETE:
        return await this.pdfExportService.exportCostToCompleteToPdf(reportData);

      case ReportType.COMMITMENT_LIST:
        return await this.pdfExportService.exportCommitmentListToPdf(reportData);

      case ReportType.EARNED_VALUE_ANALYSIS:
        return await this.pdfExportService.exportEarnedValueAnalysisToPdf(reportData);

      case ReportType.CASH_FLOW_PROJECTION:
        return await this.pdfExportService.exportCashFlowProjectionToPdf(reportData);

      case ReportType.INVOICE_REGISTER:
        return await this.pdfExportService.exportInvoiceRegisterToPdf(reportData);

      case ReportType.EXECUTIVE_SUMMARY:
        return await this.pdfExportService.exportExecutiveSummaryToPdf(reportData);

      case ReportType.BUDGET_VARIANCE:
        return await this.pdfExportService.exportBudgetVarianceToPdf(reportData);

      case ReportType.COMMITMENT_STATUS:
        return await this.pdfExportService.exportCommitmentStatusToPdf(reportData);

      case ReportType.PAYMENT_HISTORY:
        return await this.pdfExportService.exportPaymentHistoryToPdf(reportData);

      case ReportType.AGING:
        return await this.pdfExportService.exportAgingToPdf(reportData);

      case ReportType.CHANGE_ORDER_LOG:
        return await this.pdfExportService.exportChangeOrderLogToPdf(reportData);

      case ReportType.CHANGE_ORDER_SUMMARY:
        return await this.pdfExportService.exportChangeOrderSummaryToPdf(reportData);

      case ReportType.SUBCONTRACTOR_SUMMARY:
        return await this.pdfExportService.exportSubcontractorSummaryToPdf(reportData);

      case ReportType.VENDOR_PAYMENTS:
        return await this.pdfExportService.exportVendorPaymentsToPdf(reportData);

      default:
        throw new Error(`Unsupported PDF export for report type: ${reportType}`);
    }
  }

  /**
   * Export report data to Excel using appropriate export method
   *
   * @param reportType - Type of report
   * @param reportData - Report data to export
   * @returns Excel file as Buffer
   */
  private async exportToExcel(reportType: ReportType, reportData: any): Promise<Buffer> {
    switch (reportType) {
      case ReportType.BUDGET_DETAIL:
        return await this.excelExportService.exportBudgetDetailToExcel(reportData);

      case ReportType.WIP:
        return await this.excelExportService.exportWIPToExcel(reportData);

      case ReportType.COST_TO_COMPLETE:
        return await this.excelExportService.exportCostToCompleteToExcel(reportData);

      case ReportType.COMMITMENT_LIST:
        return await this.excelExportService.exportCommitmentListToExcel(reportData);

      case ReportType.EARNED_VALUE_ANALYSIS:
        return await this.excelExportService.exportEarnedValueAnalysisToExcel(reportData);

      case ReportType.CASH_FLOW_PROJECTION:
        return await this.excelExportService.exportCashFlowProjectionToExcel(reportData);

      case ReportType.INVOICE_REGISTER:
        return await this.excelExportService.exportInvoiceRegisterToExcel(reportData);

      case ReportType.EXECUTIVE_SUMMARY:
        return await this.excelExportService.exportExecutiveSummaryToExcel(reportData);

      case ReportType.BUDGET_VARIANCE:
        return await this.excelExportService.exportBudgetVarianceToExcel(reportData);

      case ReportType.COMMITMENT_STATUS:
        return await this.excelExportService.exportCommitmentStatusToExcel(reportData);

      case ReportType.PAYMENT_HISTORY:
        return await this.excelExportService.exportPaymentHistoryToExcel(reportData);

      case ReportType.AGING:
        return await this.excelExportService.exportAgingToExcel(reportData);

      case ReportType.CHANGE_ORDER_LOG:
        return await this.excelExportService.exportChangeOrderLogToExcel(reportData);

      case ReportType.CHANGE_ORDER_SUMMARY:
        return await this.excelExportService.exportChangeOrderSummaryToExcel(reportData);

      case ReportType.SUBCONTRACTOR_SUMMARY:
        return await this.excelExportService.exportSubcontractorSummaryToExcel(reportData);

      case ReportType.VENDOR_PAYMENTS:
        return await this.excelExportService.exportVendorPaymentsToExcel(reportData);

      default:
        throw new Error(`Unsupported Excel export for report type: ${reportType}`);
    }
  }

  /**
   * Generate filename for report attachment
   *
   * @param schedule - Report schedule entity
   * @param project - Project entity
   * @param extension - File extension (pdf or xlsx)
   * @returns Formatted filename
   */
  private generateFilename(
    schedule: ReportSchedule,
    project: Project,
    extension: string,
  ): string {
    const date = new Date().toISOString().split('T')[0];
    const sanitizedReportName = schedule.reportName
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/-+/g, '-');
    const sanitizedProjectName = project.name
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/-+/g, '-');

    return `${sanitizedReportName}-${sanitizedProjectName}-${date}.${extension}`;
  }

  /**
   * Replace template placeholders in text
   *
   * @param text - Text containing placeholders
   * @param placeholders - Key-value pairs for replacement
   * @returns Text with placeholders replaced
   */
  private replacePlaceholders(
    text: string,
    placeholders: Record<string, string>,
  ): string {
    let result = text;

    for (const [key, value] of Object.entries(placeholders)) {
      const pattern = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(pattern, value);
    }

    return result;
  }

  /**
   * Calculate next run time based on schedule frequency and cron expression
   *
   * @param schedule - Report schedule entity
   * @returns Next run date/time
   */
  private calculateNextRun(schedule: ReportSchedule): Date {
    const now = new Date();

    // For DAILY: add 1 day
    if (schedule.frequency === 'DAILY') {
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }

    // For WEEKLY: add 7 days
    if (schedule.frequency === 'WEEKLY') {
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    // For MONTHLY: add 1 month
    if (schedule.frequency === 'MONTHLY') {
      const next = new Date(now);
      next.setMonth(next.getMonth() + 1);
      return next;
    }

    // For CUSTOM: use cron expression
    // TODO: Implement proper cron parsing with a library like 'cron-parser'
    // For now, default to 1 day
    if (schedule.frequency === 'CUSTOM') {
      // Simple implementation - in production, use cron-parser library
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }

    // Default fallback: 1 day
    return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
}
