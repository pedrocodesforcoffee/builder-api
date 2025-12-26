import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PotentialChangeOrder,
  OwnerChangeOrder,
  CommitmentChangeOrder,
} from '../entities';
import { Project } from '../../projects/entities/project.entity';
import {
  GenerateChangeOrderSummaryReportDto,
  ChangeOrderSummaryReportDto,
  ChangeOrderTypeSummaryDto,
  ChangeOrderStatusSummaryDto,
} from '../dto/report';
import { ReportExcelExportService } from './report-excel-export.service';

/**
 * Change Order Summary Report Service
 *
 * Generates aggregated summaries of change orders by:
 * - Type (PCO, OCO, CCO)
 * - Status (Draft, Pending, Approved, Rejected)
 *
 * Shows high-level metrics including:
 * - Counts by type and status
 * - Amounts by type and status
 * - Approval rates
 *
 * Business Logic:
 * - Aggregates counts and amounts by type and status
 * - approvalRate = (approved / (approved + rejected)) * 100
 * - Provides executive-level summary view
 */
@Injectable()
export class ChangeOrderSummaryReportService {
  private readonly logger = new Logger(ChangeOrderSummaryReportService.name);

  constructor(
    @InjectRepository(PotentialChangeOrder)
    private pcoRepo: Repository<PotentialChangeOrder>,
    @InjectRepository(OwnerChangeOrder)
    private ocoRepo: Repository<OwnerChangeOrder>,
    @InjectRepository(CommitmentChangeOrder)
    private ccoRepo: Repository<CommitmentChangeOrder>,
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    private excelExportService: ReportExcelExportService,
  ) {}

  /**
   * Generate Change Order Summary Report
   */
  async generate(dto: GenerateChangeOrderSummaryReportDto): Promise<ChangeOrderSummaryReportDto> {
    this.logger.log(`Generating Change Order Summary Report for project ${dto.projectId}`);

    // 1. Load project
    const project = await this.projectRepo.findOne({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${dto.projectId} not found`);
    }

    // 2. Aggregate by type
    const pcoSummary = await this.aggregatePCOSummary(dto.projectId);
    const ocoSummary = await this.aggregateOCOSummary(dto.projectId);
    const ccoSummary = await this.aggregateCCOSummary(dto.projectId);

    const byType = [pcoSummary, ocoSummary, ccoSummary];

    // 3. Aggregate by status (cross-type)
    const byStatus = this.aggregateByStatus(byType);

    // 4. Calculate totals
    let totalChangeOrderCount = 0;
    let totalAmount = 0;
    let totalApprovedAmount = 0;
    let totalPendingAmount = 0;
    let totalRejectedAmount = 0;
    let totalApprovedCount = 0;
    let totalRejectedCount = 0;

    for (const typeSummary of byType) {
      totalChangeOrderCount += typeSummary.totalCount;
      totalAmount += typeSummary.totalAmount;
      totalApprovedAmount += typeSummary.approvedAmount;
      totalPendingAmount += typeSummary.pendingAmount;
      totalRejectedAmount += typeSummary.rejectedAmount;
      totalApprovedCount += typeSummary.approvedCount;
      totalRejectedCount += typeSummary.rejectedCount;
    }

    // 5. Calculate overall approval rate
    const overallApprovalRate =
      totalApprovedCount + totalRejectedCount > 0
        ? (totalApprovedCount / (totalApprovedCount + totalRejectedCount)) * 100
        : 0;

    // 6. Build and return report
    const asOfDate = dto.asOfDate ? new Date(dto.asOfDate) : new Date();

    return {
      projectId: project.id,
      projectName: project.name,
      asOfDate,
      totalChangeOrderCount,
      totalAmount: Number(totalAmount.toFixed(2)),
      totalApprovedAmount: Number(totalApprovedAmount.toFixed(2)),
      totalPendingAmount: Number(totalPendingAmount.toFixed(2)),
      totalRejectedAmount: Number(totalRejectedAmount.toFixed(2)),
      overallApprovalRate: Number(overallApprovalRate.toFixed(2)),
      byType,
      byStatus,
      generatedAt: new Date(),
    };
  }

  /**
   * Export Change Order Summary Report to Excel
   */
  async exportToExcel(dto: GenerateChangeOrderSummaryReportDto): Promise<Buffer> {
    this.logger.log(`Exporting Change Order Summary Report to Excel for project ${dto.projectId}`);

    const report = await this.generate(dto);
    return await this.excelExportService.exportChangeOrderSummaryToExcel(report);
  }

  // ==================== HELPER METHODS ====================

  /**
   * Aggregate PCO summary
   */
  private async aggregatePCOSummary(projectId: string): Promise<ChangeOrderTypeSummaryDto> {
    const pcos = await this.pcoRepo.find({
      where: { projectId },
    });

    return this.buildTypeSummary('PCO', pcos);
  }

  /**
   * Aggregate OCO summary
   */
  private async aggregateOCOSummary(projectId: string): Promise<ChangeOrderTypeSummaryDto> {
    const ocos = await this.ocoRepo.find({
      where: { projectId },
    });

    return this.buildTypeSummary('OCO', ocos);
  }

  /**
   * Aggregate CCO summary
   */
  private async aggregateCCOSummary(projectId: string): Promise<ChangeOrderTypeSummaryDto> {
    const ccos = await this.ccoRepo.find({
      where: { projectId },
    });

    return this.buildTypeSummary('CCO', ccos);
  }

  /**
   * Build type summary from change order array
   */
  private buildTypeSummary(
    type: string,
    changeOrders: Array<{ status: string; amount?: number; totalAmount?: number }>,
  ): ChangeOrderTypeSummaryDto {
    let draftCount = 0;
    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;
    let draftAmount = 0;
    let pendingAmount = 0;
    let approvedAmount = 0;
    let rejectedAmount = 0;

    for (const co of changeOrders) {
      const status = co.status.toLowerCase();
      const amount = Number(co.amount || co.totalAmount || 0);

      if (status.includes('draft')) {
        draftCount++;
        draftAmount += amount;
      } else if (status.includes('pending') || status.includes('submitted') || status.includes('review')) {
        pendingCount++;
        pendingAmount += amount;
      } else if (status.includes('approved') || status.includes('executed')) {
        approvedCount++;
        approvedAmount += amount;
      } else if (status.includes('rejected')) {
        rejectedCount++;
        rejectedAmount += amount;
      }
    }

    const totalCount = changeOrders.length;
    const totalAmount = draftAmount + pendingAmount + approvedAmount + rejectedAmount;
    const approvalRate =
      approvedCount + rejectedCount > 0
        ? (approvedCount / (approvedCount + rejectedCount)) * 100
        : 0;

    return {
      type,
      totalCount,
      draftCount,
      pendingCount,
      approvedCount,
      rejectedCount,
      totalAmount: Number(totalAmount.toFixed(2)),
      draftAmount: Number(draftAmount.toFixed(2)),
      pendingAmount: Number(pendingAmount.toFixed(2)),
      approvedAmount: Number(approvedAmount.toFixed(2)),
      rejectedAmount: Number(rejectedAmount.toFixed(2)),
      approvalRate: Number(approvalRate.toFixed(2)),
    };
  }

  /**
   * Aggregate by status (cross-type)
   */
  private aggregateByStatus(
    byType: ChangeOrderTypeSummaryDto[],
  ): ChangeOrderStatusSummaryDto[] {
    const statusMap = new Map<string, { count: number; amount: number }>();

    const statuses = ['Draft', 'Pending', 'Approved', 'Rejected'];

    for (const status of statuses) {
      statusMap.set(status, { count: 0, amount: 0 });
    }

    for (const typeSummary of byType) {
      statusMap.get('Draft')!.count += typeSummary.draftCount;
      statusMap.get('Draft')!.amount += typeSummary.draftAmount;

      statusMap.get('Pending')!.count += typeSummary.pendingCount;
      statusMap.get('Pending')!.amount += typeSummary.pendingAmount;

      statusMap.get('Approved')!.count += typeSummary.approvedCount;
      statusMap.get('Approved')!.amount += typeSummary.approvedAmount;

      statusMap.get('Rejected')!.count += typeSummary.rejectedCount;
      statusMap.get('Rejected')!.amount += typeSummary.rejectedAmount;
    }

    const byStatus: ChangeOrderStatusSummaryDto[] = [];
    for (const [status, data] of statusMap.entries()) {
      byStatus.push({
        status,
        count: data.count,
        amount: Number(data.amount.toFixed(2)),
      });
    }

    return byStatus;
  }

  /**
   * Generate report (alias for generate method for controller compatibility)
   */
  async generateReport(dto: any): Promise<any> {
    return this.generate(dto);
  }

}
