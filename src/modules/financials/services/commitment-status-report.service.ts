import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Commitment,
  CommitmentChangeOrder,
} from '../entities';
import { Project } from '../../projects/entities/project.entity';
import {
  GenerateCommitmentStatusReportDto,
  CommitmentStatusReportDto,
  CommitmentStatusLineDto,
} from '../dto/report';
import { ReportExcelExportService } from './report-excel-export.service';

/**
 * Commitment Status Report Service
 *
 * Generates comprehensive commitment status reports showing:
 * - Original vs revised commitment amounts
 * - Invoiced and paid amounts
 * - Retention calculations
 * - Remaining balances
 * - Percent complete by vendor
 *
 * Business Logic:
 * - originalAmount = commitment.originalAmount
 * - changeOrders = sum(approved commitment change orders)
 * - revisedAmount = commitment.currentAmount (updated by change orders)
 * - invoicedAmount = commitment.invoicedAmount (from approved payment apps)
 * - paidAmount = commitment.paidAmount (from paid payment apps)
 * - retentionHeld = invoicedAmount * (retentionPercent / 100)
 * - remainingBalance = revisedAmount - invoicedAmount
 * - percentComplete = (invoicedAmount / revisedAmount) * 100
 */
@Injectable()
export class CommitmentStatusReportService {
  private readonly logger = new Logger(CommitmentStatusReportService.name);

  constructor(
    @InjectRepository(Commitment)
    private commitmentRepo: Repository<Commitment>,
    @InjectRepository(CommitmentChangeOrder)
    private ccoRepo: Repository<CommitmentChangeOrder>,
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    private excelExportService: ReportExcelExportService,
  ) {}

  /**
   * Generate Commitment Status Report
   */
  async generate(dto: GenerateCommitmentStatusReportDto): Promise<CommitmentStatusReportDto> {
    this.logger.log(`Generating Commitment Status Report for project ${dto.projectId}`);

    // 1. Load project
    const project = await this.projectRepo.findOne({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${dto.projectId} not found`);
    }

    // 2. Load commitments
    const queryBuilder = this.commitmentRepo
      .createQueryBuilder('commitment')
      .where('commitment.projectId = :projectId', { projectId: dto.projectId })
      .orderBy('commitment.vendorName', 'ASC')
      .addOrderBy('commitment.number', 'ASC');

    // Apply vendor filter if provided
    if (dto.vendorName) {
      queryBuilder.andWhere('commitment.vendorName ILIKE :vendorName', {
        vendorName: `%${dto.vendorName}%`,
      });
    }

    const commitments = await queryBuilder.getMany();

    if (commitments.length === 0) {
      this.logger.warn(`No commitments found for project ${dto.projectId}`);
    }

    // 3. Get commitment IDs
    const commitmentIds = commitments.map((c) => c.id);

    // 4. Aggregate change orders by commitment
    const changeOrdersMap = await this.aggregateChangeOrdersByCommitment(dto.projectId, commitmentIds);

    // 5. Build report lines
    const lines: CommitmentStatusLineDto[] = [];
    let totalOriginalAmount = 0;
    let totalChangeOrders = 0;
    let totalRevisedAmount = 0;
    let totalInvoicedAmount = 0;
    let totalPaidAmount = 0;
    let totalRetentionHeld = 0;
    let totalRemainingBalance = 0;

    for (const commitment of commitments) {
      // Business logic calculations
      const originalAmount = Number(commitment.originalAmount);
      const changeOrders = changeOrdersMap.get(commitment.id) || 0;
      const revisedAmount = Number(commitment.currentAmount);
      const invoicedAmount = Number(commitment.invoicedAmount);
      const paidAmount = Number(commitment.paidAmount);
      const retentionPercent = Number(commitment.retentionPercent || 0);
      const retentionHeld = invoicedAmount * (retentionPercent / 100);
      const remainingBalance = revisedAmount - invoicedAmount;
      const percentComplete = revisedAmount > 0 ? (invoicedAmount / revisedAmount) * 100 : 0;

      // Add to totals
      totalOriginalAmount += originalAmount;
      totalChangeOrders += changeOrders;
      totalRevisedAmount += revisedAmount;
      totalInvoicedAmount += invoicedAmount;
      totalPaidAmount += paidAmount;
      totalRetentionHeld += retentionHeld;
      totalRemainingBalance += remainingBalance;

      // Create line DTO
      lines.push({
        commitmentId: commitment.id,
        commitmentNumber: commitment.number,
        title: commitment.title,
        type: commitment.type,
        vendorName: commitment.vendorName,
        vendorContact: commitment.vendorContact || '',
        status: commitment.status,
        originalAmount: Number(originalAmount.toFixed(2)),
        changeOrders: Number(changeOrders.toFixed(2)),
        revisedAmount: Number(revisedAmount.toFixed(2)),
        invoicedAmount: Number(invoicedAmount.toFixed(2)),
        paidAmount: Number(paidAmount.toFixed(2)),
        retentionPercent: Number(retentionPercent.toFixed(2)),
        retentionHeld: Number(retentionHeld.toFixed(2)),
        remainingBalance: Number(remainingBalance.toFixed(2)),
        percentComplete: Number(percentComplete.toFixed(2)),
        startDate: commitment.startDate || null,
        endDate: commitment.endDate || null,
      });
    }

    // 6. Calculate overall percent complete
    const overallPercentComplete = totalRevisedAmount > 0
      ? (totalInvoicedAmount / totalRevisedAmount) * 100
      : 0;

    // 7. Build and return report
    const asOfDate = dto.asOfDate ? new Date(dto.asOfDate) : new Date();

    return {
      projectId: project.id,
      projectName: project.name,
      asOfDate,
      totalOriginalAmount: Number(totalOriginalAmount.toFixed(2)),
      totalChangeOrders: Number(totalChangeOrders.toFixed(2)),
      totalRevisedAmount: Number(totalRevisedAmount.toFixed(2)),
      totalInvoicedAmount: Number(totalInvoicedAmount.toFixed(2)),
      totalPaidAmount: Number(totalPaidAmount.toFixed(2)),
      totalRetentionHeld: Number(totalRetentionHeld.toFixed(2)),
      totalRemainingBalance: Number(totalRemainingBalance.toFixed(2)),
      overallPercentComplete: Number(overallPercentComplete.toFixed(2)),
      commitmentCount: commitments.length,
      lines,
      generatedAt: new Date(),
    };
  }

  /**
   * Export Commitment Status Report to Excel
   */
  async exportToExcel(dto: GenerateCommitmentStatusReportDto): Promise<Buffer> {
    this.logger.log(`Exporting Commitment Status Report to Excel for project ${dto.projectId}`);

    const report = await this.generate(dto);
    return await this.excelExportService.exportCommitmentStatusToExcel(report);
  }

  // ==================== HELPER METHODS ====================

  /**
   * Aggregate change orders by commitment
   * Returns a map of commitmentId -> total change order amount (approved only)
   */
  private async aggregateChangeOrdersByCommitment(
    projectId: string,
    commitmentIds: string[],
  ): Promise<Map<string, number>> {
    if (commitmentIds.length === 0) {
      return new Map();
    }

    const results = await this.ccoRepo
      .createQueryBuilder('cco')
      .select('cco.commitmentId', 'commitmentId')
      .addSelect('SUM(cco.amount)', 'totalChangeOrders')
      .where('cco.projectId = :projectId', { projectId })
      .andWhere('cco.commitmentId IN (:...commitmentIds)', { commitmentIds })
      .andWhere('cco.status = :status', { status: 'APPROVED' }) // Only approved change orders
      .groupBy('cco.commitmentId')
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
