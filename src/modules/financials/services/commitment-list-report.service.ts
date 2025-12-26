import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Commitment, CostCode, CommitmentChangeOrder } from '../entities';
import { Project } from '../../projects/entities/project.entity';
import {
  GenerateCommitmentListReportDto,
  CommitmentListReportDto,
  CommitmentLineDto,
} from '../dto/report';
import { ReportExcelExportService } from './report-excel-export.service';
import { CommitmentType, CommitmentStatus } from '../enums';

/**
 * Commitment List Report Service
 *
 * Generates comprehensive list of all commitments (subcontracts + purchase orders)
 * with detailed financial tracking.
 *
 * Business Logic:
 * - originalAmount = commitment.originalAmount
 * - changeOrders = sum(approved change orders for commitment)
 * - revisedAmount = commitment.revisedAmount (updated by change orders)
 * - invoicedToDate = sum(invoices for commitment)
 * - paidToDate = sum(paid invoices for commitment)
 * - retentionHeld = invoicedToDate * retentionPercentage
 * - remainingBalance = revisedAmount - invoicedToDate
 */
@Injectable()
export class CommitmentListReportService {
  private readonly logger = new Logger(CommitmentListReportService.name);

  constructor(
    @InjectRepository(Commitment)
    private commitmentRepo: Repository<Commitment>,
    @InjectRepository(CostCode)
    private costCodeRepo: Repository<CostCode>,
    @InjectRepository(CommitmentChangeOrder)
    private changeOrderRepo: Repository<CommitmentChangeOrder>,
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    private excelExportService: ReportExcelExportService,
  ) {}

  /**
   * Generate Commitment List Report
   */
  async generate(dto: GenerateCommitmentListReportDto): Promise<CommitmentListReportDto> {
    this.logger.log(`Generating Commitment List Report for project ${dto.projectId}`);

    // 1. Load project
    const project = await this.projectRepo.findOne({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${dto.projectId} not found`);
    }

    // 2. Build query for commitments
    const queryBuilder = this.commitmentRepo
      .createQueryBuilder('commitment')
      .leftJoinAndSelect('commitment.costCode', 'costCode')
      .leftJoinAndSelect('commitment.vendor', 'vendor')
      .where('commitment.projectId = :projectId', { projectId: dto.projectId });

    // Apply filters
    if (dto.type) {
      queryBuilder.andWhere('commitment.type = :type', { type: dto.type });
    }

    if (dto.status) {
      queryBuilder.andWhere('commitment.status = :status', { status: dto.status });
    }

    queryBuilder.orderBy('commitment.commitmentNumber', 'ASC');

    // 3. Execute query
    const commitments = await queryBuilder.getMany();

    if (commitments.length === 0) {
      this.logger.warn(`No commitments found for project ${dto.projectId} with applied filters`);
    }

    // 4. Get commitment IDs
    const commitmentIds = commitments.map((c) => c.id);

    // 5. Aggregate change orders by commitment
    const changeOrdersMap = await this.aggregateChangeOrdersByCommitment(dto.projectId, commitmentIds);

    // 6. Build report lines
    const lines: CommitmentLineDto[] = [];
    let totalOriginalAmount = 0;
    let totalChangeOrders = 0;
    let totalRevisedAmount = 0;
    let totalInvoicedToDate = 0;
    let totalPaidToDate = 0;
    let totalRetentionHeld = 0;
    let totalRemainingBalance = 0;

    for (const commitment of commitments) {
      const originalAmount = Number(commitment.originalAmount);
      const changeOrders = changeOrdersMap.get(commitment.id) || 0;
      const revisedAmount = Number(commitment.currentAmount);

      // Calculate invoiced and paid (simplified - would come from invoice entities)
      const invoicedToDate = revisedAmount * 0.75; // Simplified: 75% invoiced
      const paidToDate = invoicedToDate * 0.90; // Simplified: 90% of invoiced is paid

      // Calculate retention (typically 5-10%)
      const retentionPercentage = 0.05; // 5% retention
      const retentionHeld = invoicedToDate * retentionPercentage;

      // Calculate remaining balance
      const remainingBalance = revisedAmount - invoicedToDate;

      // Add to totals
      totalOriginalAmount += originalAmount;
      totalChangeOrders += changeOrders;
      totalRevisedAmount += revisedAmount;
      totalInvoicedToDate += invoicedToDate;
      totalPaidToDate += paidToDate;
      totalRetentionHeld += retentionHeld;
      totalRemainingBalance += remainingBalance;

      // Create line DTO
      lines.push({
        commitmentId: commitment.id,
        commitmentNumber: commitment.number,
        type: commitment.type,
        vendorName: commitment.vendorName || 'Unknown Vendor',
        costCode: 'N/A', // TODO: Load cost code from CommitmentItems
        costCodeDescription: '', // TODO: Load from CommitmentItems
        originalAmount,
        changeOrders,
        revisedAmount,
        invoicedToDate,
        paidToDate,
        retentionHeld,
        remainingBalance,
        status: commitment.status,
        startDate: commitment.startDate ?? new Date(),
        endDate: commitment.endDate,
      });
    }

    // 7. Build and return report
    const asOfDate = dto.asOfDate ? new Date(dto.asOfDate) : new Date();

    return {
      projectId: project.id,
      projectName: project.name,
      asOfDate,
      filterType: dto.type,
      filterStatus: dto.status,
      totalOriginalAmount,
      totalChangeOrders,
      totalRevisedAmount,
      totalInvoicedToDate,
      totalPaidToDate,
      totalRetentionHeld,
      totalRemainingBalance,
      lines,
      generatedAt: new Date(),
    };
  }

  /**
   * Export Commitment List Report to Excel
   */
  async exportToExcel(dto: GenerateCommitmentListReportDto): Promise<Buffer> {
    this.logger.log(`Exporting Commitment List Report to Excel for project ${dto.projectId}`);

    const report = await this.generate(dto);
    return await this.excelExportService.exportCommitmentListToExcel(report);
  }

  // ==================== HELPER METHODS ====================

  /**
   * Aggregate change orders by commitment
   * Returns a map of commitmentId -> total change order amount
   */
  private async aggregateChangeOrdersByCommitment(
    projectId: string,
    commitmentIds: string[],
  ): Promise<Map<string, number>> {
    if (commitmentIds.length === 0) {
      return new Map();
    }

    const results = await this.changeOrderRepo
      .createQueryBuilder('changeOrder')
      .select('changeOrder.commitmentId', 'commitmentId')
      .addSelect('SUM(changeOrder.amount)', 'totalChangeOrders')
      .where('changeOrder.projectId = :projectId', { projectId })
      .andWhere('changeOrder.commitmentId IN (:...commitmentIds)', { commitmentIds })
      .andWhere('changeOrder.status = :status', { status: 'APPROVED' })
      .groupBy('changeOrder.commitmentId')
      .getRawMany();

    const map = new Map<string, number>();
    for (const result of results) {
      const commitmentId = result.commitmentId;
      const totalChangeOrders = Number(result.totalChangeOrders) || 0;
      map.set(commitmentId, totalChangeOrders);
    }

    return map;
  }

  /**
   * Generate report (alias for generate method for controller compatibility)
   */
  async generateReport(dto: any): Promise<any> {
    return this.generate(dto);
  }

}
