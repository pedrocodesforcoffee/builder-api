import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Commitment,
  CommitmentChangeOrder,
  PaymentApplication,
} from '../entities';
import { Project } from '../../projects/entities/project.entity';
import {
  GenerateSubcontractorSummaryReportDto,
  SubcontractorSummaryReportDto,
  SubcontractorSummaryLineDto,
} from '../dto/report';
import { ReportExcelExportService } from './report-excel-export.service';

/**
 * Subcontractor Summary Report Service
 *
 * Generates vendor/subcontractor performance reports showing:
 * - Contract values (original vs revised)
 * - Invoiced and paid amounts
 * - Retention held
 * - Outstanding and remaining balances
 * - Payment application metrics
 * - Percent complete
 *
 * Business Logic:
 * - Groups commitments by vendor name
 * - originalContractValue = sum(commitment.originalAmount)
 * - changeOrders = sum(approved CCOs)
 * - revisedContractValue = sum(commitment.currentAmount)
 * - invoicedAmount = sum(commitment.invoicedAmount)
 * - paidAmount = sum(commitment.paidAmount)
 * - retentionHeld = invoicedAmount * (retentionPercent / 100)
 * - outstandingBalance = invoicedAmount - paidAmount
 * - remainingContractBalance = revisedContractValue - invoicedAmount
 * - percentComplete = (invoicedAmount / revisedContractValue) * 100
 */
@Injectable()
export class SubcontractorSummaryReportService {
  private readonly logger = new Logger(SubcontractorSummaryReportService.name);

  constructor(
    @InjectRepository(Commitment)
    private commitmentRepo: Repository<Commitment>,
    @InjectRepository(CommitmentChangeOrder)
    private ccoRepo: Repository<CommitmentChangeOrder>,
    @InjectRepository(PaymentApplication)
    private paymentApplicationRepo: Repository<PaymentApplication>,
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    private excelExportService: ReportExcelExportService,
  ) {}

  /**
   * Generate Subcontractor Summary Report
   */
  async generate(dto: GenerateSubcontractorSummaryReportDto): Promise<SubcontractorSummaryReportDto> {
    this.logger.log(`Generating Subcontractor Summary Report for project ${dto.projectId}`);

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
      .orderBy('commitment.vendorName', 'ASC');

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

    // 3. Group commitments by vendor name
    const vendorMap = new Map<string, Commitment[]>();
    for (const commitment of commitments) {
      const vendorName = commitment.vendorName;
      if (!vendorMap.has(vendorName)) {
        vendorMap.set(vendorName, []);
      }
      vendorMap.get(vendorName)!.push(commitment);
    }

    // 4. Get all commitment IDs
    const commitmentIds = commitments.map((c) => c.id);

    // 5. Aggregate change orders by commitment
    const changeOrdersMap = await this.aggregateChangeOrdersByCommitment(dto.projectId, commitmentIds);

    // 6. Aggregate payment applications by commitment
    const paymentAppsMap = await this.aggregatePaymentApplicationsByCommitment(dto.projectId, commitmentIds);

    // 7. Build report lines (one per vendor)
    const lines: SubcontractorSummaryLineDto[] = [];
    let totalOriginalContractValue = 0;
    let totalChangeOrders = 0;
    let totalRevisedContractValue = 0;
    let totalInvoicedAmount = 0;
    let totalPaidAmount = 0;
    let totalRetentionHeld = 0;
    let totalOutstandingBalance = 0;
    let totalRemainingContractBalance = 0;

    for (const [vendorName, vendorCommitments] of vendorMap.entries()) {
      // Aggregate metrics for this vendor
      let originalContractValue = 0;
      let changeOrders = 0;
      let revisedContractValue = 0;
      let invoicedAmount = 0;
      let paidAmount = 0;
      let retentionHeld = 0;
      let paymentApplicationCount = 0;
      let approvedPaymentCount = 0;
      let paidPaymentCount = 0;

      // Take contact info from first commitment
      const firstCommitment = vendorCommitments[0];
      const vendorContact = firstCommitment.vendorContact || '';
      const vendorEmail = firstCommitment.vendorEmail || '';

      for (const commitment of vendorCommitments) {
        const origAmount = Number(commitment.originalAmount);
        const ccoAmount = changeOrdersMap.get(commitment.id) || 0;
        const revAmount = Number(commitment.currentAmount);
        const invAmount = Number(commitment.invoicedAmount);
        const pAmount = Number(commitment.paidAmount);
        const retPercent = Number(commitment.retentionPercent || 0);
        const retHeld = invAmount * (retPercent / 100);

        originalContractValue += origAmount;
        changeOrders += ccoAmount;
        revisedContractValue += revAmount;
        invoicedAmount += invAmount;
        paidAmount += pAmount;
        retentionHeld += retHeld;

        // Payment application counts for this commitment
        const paStats = paymentAppsMap.get(commitment.id);
        if (paStats) {
          paymentApplicationCount += paStats.total;
          approvedPaymentCount += paStats.approved;
          paidPaymentCount += paStats.paid;
        }
      }

      const outstandingBalance = invoicedAmount - paidAmount;
      const remainingContractBalance = revisedContractValue - invoicedAmount;
      const percentComplete = revisedContractValue > 0
        ? (invoicedAmount / revisedContractValue) * 100
        : 0;

      // Add to totals
      totalOriginalContractValue += originalContractValue;
      totalChangeOrders += changeOrders;
      totalRevisedContractValue += revisedContractValue;
      totalInvoicedAmount += invoicedAmount;
      totalPaidAmount += paidAmount;
      totalRetentionHeld += retentionHeld;
      totalOutstandingBalance += outstandingBalance;
      totalRemainingContractBalance += remainingContractBalance;

      // Create line DTO
      lines.push({
        vendorName,
        vendorContact,
        vendorEmail,
        commitmentCount: vendorCommitments.length,
        originalContractValue: Number(originalContractValue.toFixed(2)),
        changeOrders: Number(changeOrders.toFixed(2)),
        revisedContractValue: Number(revisedContractValue.toFixed(2)),
        invoicedAmount: Number(invoicedAmount.toFixed(2)),
        paidAmount: Number(paidAmount.toFixed(2)),
        retentionHeld: Number(retentionHeld.toFixed(2)),
        outstandingBalance: Number(outstandingBalance.toFixed(2)),
        remainingContractBalance: Number(remainingContractBalance.toFixed(2)),
        percentComplete: Number(percentComplete.toFixed(2)),
        paymentApplicationCount,
        approvedPaymentCount,
        paidPaymentCount,
      });
    }

    // 8. Calculate overall percent complete
    const overallPercentComplete = totalRevisedContractValue > 0
      ? (totalInvoicedAmount / totalRevisedContractValue) * 100
      : 0;

    // 9. Build and return report
    const asOfDate = dto.asOfDate ? new Date(dto.asOfDate) : new Date();

    return {
      projectId: project.id,
      projectName: project.name,
      asOfDate,
      vendorCount: vendorMap.size,
      totalOriginalContractValue: Number(totalOriginalContractValue.toFixed(2)),
      totalChangeOrders: Number(totalChangeOrders.toFixed(2)),
      totalRevisedContractValue: Number(totalRevisedContractValue.toFixed(2)),
      totalInvoicedAmount: Number(totalInvoicedAmount.toFixed(2)),
      totalPaidAmount: Number(totalPaidAmount.toFixed(2)),
      totalRetentionHeld: Number(totalRetentionHeld.toFixed(2)),
      totalOutstandingBalance: Number(totalOutstandingBalance.toFixed(2)),
      totalRemainingContractBalance: Number(totalRemainingContractBalance.toFixed(2)),
      overallPercentComplete: Number(overallPercentComplete.toFixed(2)),
      lines,
      generatedAt: new Date(),
    };
  }

  /**
   * Export Subcontractor Summary Report to Excel
   */
  async exportToExcel(dto: GenerateSubcontractorSummaryReportDto): Promise<Buffer> {
    this.logger.log(`Exporting Subcontractor Summary Report to Excel for project ${dto.projectId}`);

    const report = await this.generate(dto);
    return await this.excelExportService.exportSubcontractorSummaryToExcel(report);
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
      .andWhere('cco.status = :status', { status: 'APPROVED' })
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
   * Aggregate payment applications by commitment
   * Returns a map of commitmentId -> { total, approved, paid }
   */
  private async aggregatePaymentApplicationsByCommitment(
    projectId: string,
    commitmentIds: string[],
  ): Promise<Map<string, { total: number; approved: number; paid: number }>> {
    if (commitmentIds.length === 0) {
      return new Map();
    }

    const paymentApplications = await this.paymentApplicationRepo
      .createQueryBuilder('pa')
      .where('pa.projectId = :projectId', { projectId })
      .andWhere('pa.commitmentId IN (:...commitmentIds)', { commitmentIds })
      .getMany();

    const map = new Map<string, { total: number; approved: number; paid: number }>();

    for (const pa of paymentApplications) {
      if (!map.has(pa.commitmentId)) {
        map.set(pa.commitmentId, { total: 0, approved: 0, paid: 0 });
      }

      const stats = map.get(pa.commitmentId)!;
      stats.total++;

      if (pa.status === 'APPROVED' || pa.status === 'PAID') {
        stats.approved++;
      }
      if (pa.status === 'PAID') {
        stats.paid++;
      }
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
