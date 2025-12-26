import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Rfi } from '../../rfis/entities/rfi.entity';
import { Submittal } from '../../submittals/entities/submittal.entity';
import { ExportRequestDto, ExportDataType } from '../dto/export-request.dto';
import { ReportFormat } from '../entities/saved-report.entity';
import { RfiAnalyticsService } from './rfi-analytics.service';
import { SubmittalAnalyticsService } from './submittal-analytics.service';

export interface ExportResult {
  filename: string;
  contentType: string;
  buffer: Buffer;
}

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(Rfi)
    private readonly rfiRepository: Repository<Rfi>,
    @InjectRepository(Submittal)
    private readonly submittalRepository: Repository<Submittal>,
    private readonly rfiAnalyticsService: RfiAnalyticsService,
    private readonly submittalAnalyticsService: SubmittalAnalyticsService,
  ) {}

  async exportData(projectId: string, dto: ExportRequestDto): Promise<ExportResult> {
    switch (dto.dataType) {
      case ExportDataType.RFI_LIST:
        return this.exportRfiList(projectId, dto);
      case ExportDataType.RFI_ANALYTICS:
        return this.exportRfiAnalytics(projectId, dto);
      case ExportDataType.SUBMITTAL_LIST:
        return this.exportSubmittalList(projectId, dto);
      case ExportDataType.SUBMITTAL_REGISTER:
        return this.exportSubmittalRegister(projectId, dto);
      case ExportDataType.SUBMITTAL_ANALYTICS:
        return this.exportSubmittalAnalytics(projectId, dto);
      default:
        throw new Error(`Unsupported export type: ${dto.dataType}`);
    }
  }

  private async exportRfiList(projectId: string, dto: ExportRequestDto): Promise<ExportResult> {
    const rfis = await this.rfiRepository.find({
      where: { projectId },
      relations: ['assignedTo', 'createdBy', 'assignedToOrg'],
      order: { createdAt: 'DESC' },
    });

    const columns = dto.columns || [
      'number',
      'subject',
      'status',
      'priority',
      'discipline',
      'assignedTo',
      'dueDate',
      'responseDays',
      'hasCostImpact',
      'hasScheduleImpact',
      'createdAt',
    ];

    const data = rfis.map((rfi) => ({
      number: rfi.number,
      subject: rfi.subject,
      status: rfi.status,
      priority: rfi.priority,
      discipline: rfi.discipline,
      assignedTo: (rfi as any).assignedTo ? `${(rfi as any).assignedTo.firstName} ${(rfi as any).assignedTo.lastName}` : '',
      assignedToOrg: (rfi as any).assignedToOrg?.name || '',
      dueDate: rfi.dueDate?.toISOString().split('T')[0] || '',
      responseDays: rfi.responseDays,
      hasCostImpact: rfi.hasCostImpact ? 'Yes' : 'No',
      estimatedCostImpact: rfi.estimatedCostImpact,
      hasScheduleImpact: rfi.hasScheduleImpact ? 'Yes' : 'No',
      estimatedScheduleImpactDays: rfi.estimatedScheduleImpactDays,
      createdAt: rfi.createdAt.toISOString().split('T')[0],
      closedDate: rfi.closedDate?.toISOString().split('T')[0] || '',
    }));

    return this.formatExport(data, columns, 'RFI_List', dto.format);
  }

  private async exportSubmittalList(projectId: string, dto: ExportRequestDto): Promise<ExportResult> {
    const submittals = await this.submittalRepository.find({
      where: { projectId },
      relations: ['responsibleContractor', 'approver', 'approverOrg'],
      order: { specSection: 'ASC', number: 'ASC' },
    });

    const columns = dto.columns || [
      'number',
      'title',
      'specSection',
      'submittalType',
      'status',
      'responsibleContractor',
      'approverOrg',
      'currentRevision',
      'submittedDate',
      'approvedDate',
      'daysInReview',
    ];

    const data = submittals.map((sub) => ({
      number: sub.number,
      title: sub.title,
      specSection: sub.specSection,
      specSectionTitle: sub.specSectionTitle,
      submittalType: sub.submittalType,
      status: sub.status,
      priority: sub.priority,
      responsibleContractor: (sub as any).responsibleContractor?.name || '',
      approverOrg: (sub as any).approverOrg?.name || '',
      currentRevision: `Rev ${sub.currentRevision}`,
      dueDate: sub.dueDate?.toISOString().split('T')[0] || '',
      requiredOnSiteDate: sub.requiredOnSiteDate?.toISOString().split('T')[0] || '',
      submittedDate: sub.submittedDate?.toISOString().split('T')[0] || '',
      approvedDate: sub.approvedDate?.toISOString().split('T')[0] || '',
      daysInReview: sub.daysInReview,
      approvalStamp: sub.approvalStamp || '',
    }));

    return this.formatExport(data, columns, 'Submittal_List', dto.format);
  }

  private async exportSubmittalRegister(projectId: string, dto: ExportRequestDto): Promise<ExportResult> {
    // Submittal register is the formal log required by many contracts
    const submittals = await this.submittalRepository.find({
      where: { projectId },
      relations: ['responsibleContractor', 'approverOrg', 'revisions'],
      order: { specSection: 'ASC', sequenceNumber: 'ASC' },
    });

    const columns = [
      'number',
      'specSection',
      'title',
      'type',
      'contractor',
      'reviewer',
      'rev',
      'dateSubmitted',
      'dateReturned',
      'action',
      'remarks',
    ];

    const data = submittals.map((sub) => ({
      number: sub.number,
      specSection: `${sub.specSection} - ${sub.specSectionTitle || ''}`,
      title: sub.title,
      type: sub.submittalType,
      contractor: (sub as any).responsibleContractor?.name || '',
      reviewer: (sub as any).approverOrg?.name || '',
      rev: sub.currentRevision,
      dateSubmitted: sub.submittedDate?.toISOString().split('T')[0] || '',
      dateReturned: sub.approvedDate?.toISOString().split('T')[0] || '',
      action: sub.approvalStamp || sub.status,
      remarks: sub.approvalConditions || '',
    }));

    return this.formatExport(data, columns, 'Submittal_Register', dto.format);
  }

  private async exportRfiAnalytics(projectId: string, dto: ExportRequestDto): Promise<ExportResult> {
    const analytics = await this.rfiAnalyticsService.getAnalytics(projectId, {});

    if (dto.format === ReportFormat.JSON) {
      return {
        filename: 'RFI_Analytics.json',
        contentType: 'application/json',
        buffer: Buffer.from(JSON.stringify(analytics, null, 2)),
      };
    }

    // For Excel/CSV, flatten the data
    const summaryData = [
      { metric: 'Total RFIs', value: analytics.statusSummary.total },
      { metric: 'Open', value: analytics.statusSummary.open },
      { metric: 'Closed', value: analytics.statusSummary.closed },
      { metric: 'Overdue', value: analytics.statusSummary.overdue },
      { metric: 'Avg Response Time (days)', value: analytics.responseTimeMetrics.averageDays },
      { metric: 'On-Time %', value: analytics.responseTimeMetrics.onTimePercentage },
      { metric: 'Total Cost Impact', value: analytics.impactSummary.totalEstimatedCost },
      { metric: 'Total Schedule Impact (days)', value: analytics.impactSummary.totalScheduleImpactDays },
    ];

    return this.formatExport(summaryData, ['metric', 'value'], 'RFI_Analytics', dto.format);
  }

  private async exportSubmittalAnalytics(projectId: string, dto: ExportRequestDto): Promise<ExportResult> {
    const analytics = await this.submittalAnalyticsService.getAnalytics(projectId, {});

    if (dto.format === ReportFormat.JSON) {
      return {
        filename: 'Submittal_Analytics.json',
        contentType: 'application/json',
        buffer: Buffer.from(JSON.stringify(analytics, null, 2)),
      };
    }

    const summaryData = [
      { metric: 'Total Submittals', value: analytics.statusSummary.total },
      { metric: 'Approved', value: analytics.statusSummary.approved },
      { metric: 'Pending', value: analytics.statusSummary.submitted + analytics.statusSummary.underReview },
      { metric: 'Overdue', value: analytics.statusSummary.overdue },
      { metric: 'First-Time Approval Rate %', value: analytics.approvalMetrics.firstTimeApprovalRate },
      { metric: 'Avg Review Time (days)', value: analytics.reviewTimeMetrics.averageDays },
      { metric: 'Avg Revisions Per Submittal', value: analytics.approvalMetrics.averageRevisionsPerSubmittal },
    ];

    return this.formatExport(summaryData, ['metric', 'value'], 'Submittal_Analytics', dto.format);
  }

  private async formatExport(
    data: any[],
    columns: string[],
    baseName: string,
    format: ReportFormat,
  ): Promise<ExportResult> {
    switch (format) {
      case ReportFormat.CSV:
        return this.toCsv(data, columns, baseName);
      case ReportFormat.EXCEL:
        return this.toExcel(data, columns, baseName);
      case ReportFormat.JSON:
        return this.toJson(data, baseName);
      default:
        return this.toCsv(data, columns, baseName);
    }
  }

  private toCsv(data: any[], columns: string[], baseName: string): ExportResult {
    const header = columns.join(',');
    const rows = data.map((row) =>
      columns.map((col) => {
        const val = row[col];
        if (val === null || val === undefined) return '';
        if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(','),
    );

    const csv = [header, ...rows].join('\n');

    return {
      filename: `${baseName}_${new Date().toISOString().split('T')[0]}.csv`,
      contentType: 'text/csv',
      buffer: Buffer.from(csv, 'utf-8'),
    };
  }

  private async toExcel(data: any[], columns: string[], baseName: string): Promise<ExportResult> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data');

    // Add headers
    worksheet.columns = columns.map((col) => ({
      header: col.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
      key: col,
      width: 20,
    }));

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add data
    data.forEach((row) => worksheet.addRow(row));

    // Auto-fit columns (approximate)
    worksheet.columns.forEach((column) => {
      let maxLength = 10;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const cellLength = cell.value ? cell.value.toString().length : 0;
        if (cellLength > maxLength) maxLength = cellLength;
      });
      column.width = Math.min(maxLength + 2, 50);
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      filename: `${baseName}_${new Date().toISOString().split('T')[0]}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from(buffer),
    };
  }

  private toJson(data: any[], baseName: string): ExportResult {
    return {
      filename: `${baseName}_${new Date().toISOString().split('T')[0]}.json`,
      contentType: 'application/json',
      buffer: Buffer.from(JSON.stringify(data, null, 2)),
    };
  }
}
