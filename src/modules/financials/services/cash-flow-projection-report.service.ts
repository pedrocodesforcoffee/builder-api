import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Commitment, CommitmentChangeOrder, PaymentApplication, PrimeContract } from '../entities';
import { Project } from '../../projects/entities/project.entity';
import { PaymentApplicationStatus } from '../enums/payment-application-status.enum';
import { PrimeContractStatus } from '../enums/prime-contract-status.enum';
import {
  CashFlowProjectionReportDto,
  CashFlowMonthlyProjectionDto,
  CashFlowCommitmentDetailDto,
  CashFlowCommitmentPaymentDto,
} from '../dto/report';
import { ReportExcelExportService } from './report-excel-export.service';
import { ReportPdfExportService } from './report-pdf-export.service';

/**
 * Cash Flow Projection Report Service
 *
 * Generates cash flow projections to help manage project liquidity and peak cash requirements.
 * Projects cash inflows (from owner) and outflows (to vendors/subcontractors).
 *
 * Key Features:
 * - Monthly cash flow projections
 * - Peak cash requirement analysis
 * - Commitment-level payment schedules
 * - Retention tracking (held and owed)
 */
@Injectable()
export class CashFlowProjectionReportService {
  private readonly logger = new Logger(CashFlowProjectionReportService.name);

  constructor(
    @InjectRepository(Commitment)
    private readonly commitmentRepository: Repository<Commitment>,
    @InjectRepository(CommitmentChangeOrder)
    private readonly changeOrderRepository: Repository<CommitmentChangeOrder>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(PaymentApplication)
    private readonly paymentApplicationRepository: Repository<PaymentApplication>,
    @InjectRepository(PrimeContract)
    private readonly primeContractRepository: Repository<PrimeContract>,
    private readonly excelExportService: ReportExcelExportService,
    private readonly pdfExportService: ReportPdfExportService,
  ) {}

  /**
   * Generate Cash Flow Projection Report
   *
   * Projects monthly cash inflows and outflows with peak cash requirement analysis.
   *
   * @param options Report generation options
   * @returns Cash flow projection report data
   * @throws NotFoundException if project not found
   */
  async generate(options: {
    projectId: string;
    startDate?: Date;
    endDate?: Date;
    asOfDate?: Date;
  }): Promise<CashFlowProjectionReportDto> {
    const { projectId, asOfDate = new Date() } = options;

    this.logger.log(`Generating Cash Flow Projection Report for project ${projectId}`);

    // Fetch project
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project not found: ${projectId}`);
    }

    // Determine projection date range
    const startDate = options.startDate || asOfDate;
    const endDate = options.endDate || project.endDate || new Date(asOfDate.getTime() + 365 * 24 * 60 * 60 * 1000);

    // Fetch all commitments for the project
    const commitments = await this.commitmentRepository.find({
      where: { projectId },
      relations: ['vendor'],
    });

    // Fetch change orders for commitments
    const changeOrders = await this.getChangeOrdersBulk(commitments.map(c => c.id));

    // Calculate commitment details with payment schedules
    const commitmentDetails: CashFlowCommitmentDetailDto[] = [];
    let totalProjectedOutflows = 0;
    let totalRetentionHeld = 0;

    for (const commitment of commitments) {
      const changeOrderTotal = changeOrders.get(commitment.id) || 0;
      const revisedAmount = commitment.originalAmount + changeOrderTotal;

      // Calculate paid to date from payment applications
      const paymentApps = await this.paymentApplicationRepository.find({
        where: {
          commitmentId: commitment.id,
          status: PaymentApplicationStatus.PAID
        }
      });
      const paidToDate = paymentApps.reduce((sum, app) => sum + Number(app.currentPaymentDue), 0);

      const retentionPercent = 0.05; // 5% retention (could be configurable)
      const retentionHeld = revisedAmount * retentionPercent;
      const remainingBalance = revisedAmount - paidToDate - retentionHeld;

      // Project monthly payments based on commitment schedule
      const projectedPayments = this.projectCommitmentPayments(
        commitment,
        remainingBalance,
        startDate,
        endDate,
      );

      commitmentDetails.push({
        commitmentId: commitment.id,
        commitmentNumber: commitment.number,
        vendorName: commitment.vendorName || 'Unknown Vendor',
        revisedAmount,
        paidToDate,
        retentionHeld,
        remainingBalance,
        projectedPayments,
      });

      totalProjectedOutflows += remainingBalance;
      totalRetentionHeld += retentionHeld;
    }

    // Calculate monthly projections
    const monthlyProjections = await this.calculateMonthlyProjections(
      project.id,
      commitmentDetails,
      startDate,
      endDate,
    );

    // Calculate summary metrics
    const totalProjectedInflows = await this.calculateProjectedInflows(project, startDate, endDate);
    const netCashFlow = totalProjectedInflows - totalProjectedOutflows;
    const peakCashRequirement = this.calculatePeakCashRequirement(monthlyProjections);

    // Calculate current cash position from payment applications
    const receivedResult = await this.paymentApplicationRepository
      .createQueryBuilder('app')
      .select('SUM(app.currentPaymentDue)', 'total')
      .where('app.projectId = :projectId', { projectId: project.id })
      .andWhere('app.status = :status', { status: PaymentApplicationStatus.PAID })
      .getRawOne();
    const receivedFromOwner = Number(receivedResult?.total || 0);

    // Estimate current cash position (received - projected outflows to date)
    const currentCashPosition = receivedFromOwner - (totalProjectedOutflows - totalRetentionHeld);

    // Calculate total retention owed from prime contract
    const primeContract = await this.primeContractRepository.findOne({
      where: { projectId: project.id, status: PrimeContractStatus.ACTIVE }
    });
    const contractRetentionPercent = primeContract?.retentionPercentage || 5.0;
    const contractValue = primeContract?.currentAmount || 0;
    const totalRetentionOwed = Number(contractValue) * (contractRetentionPercent / 100);

    const report: CashFlowProjectionReportDto = {
      projectId: project.id,
      projectName: project.name,
      startDate,
      endDate,
      asOfDate,
      totalProjectedInflows,
      totalProjectedOutflows,
      netCashFlow: Number(netCashFlow.toFixed(2)),
      peakCashRequirement: Number(peakCashRequirement.toFixed(2)),
      currentCashPosition,
      totalRetentionHeld: Number(totalRetentionHeld.toFixed(2)),
      totalRetentionOwed: Number(totalRetentionOwed.toFixed(2)),
      monthlyProjections,
      commitmentDetails,
      generatedAt: new Date(),
    };

    this.logger.log(
      `Cash Flow Projection Report generated: Peak Requirement=$${peakCashRequirement.toFixed(2)}`,
    );

    return report;
  }

  /**
   * Get change orders totals for multiple commitments in bulk
   *
   * @param commitmentIds Array of commitment IDs
   * @returns Map of commitment ID to total change orders
   */
  private async getChangeOrdersBulk(commitmentIds: string[]): Promise<Map<string, number>> {
    if (commitmentIds.length === 0) {
      return new Map();
    }

    const result = await this.changeOrderRepository
      .createQueryBuilder('changeOrder')
      .select('changeOrder.commitmentId', 'commitmentId')
      .addSelect('SUM(changeOrder.amount)', 'totalChangeOrders')
      .where('changeOrder.commitmentId IN (:...commitmentIds)', { commitmentIds })
      .andWhere('changeOrder.status = :status', { status: 'APPROVED' })
      .groupBy('changeOrder.commitmentId')
      .getRawMany();

    const map = new Map<string, number>();
    for (const row of result) {
      map.set(row.commitmentId, parseFloat(row.totalChangeOrders) || 0);
    }

    return map;
  }

  /**
   * Project monthly payments for a commitment
   *
   * Distributes remaining balance evenly across months between start and end dates.
   *
   * @param commitment Commitment entity
   * @param remainingBalance Remaining balance to be paid
   * @param startDate Projection start date
   * @param endDate Projection end date
   * @returns Array of monthly payment projections
   */
  private projectCommitmentPayments(
    commitment: Commitment,
    remainingBalance: number,
    startDate: Date,
    endDate: Date,
  ): CashFlowCommitmentPaymentDto[] {
    const payments: CashFlowCommitmentPaymentDto[] = [];

    if (remainingBalance <= 0) {
      return payments;
    }

    // Calculate number of months in projection period
    const months = this.getMonthsBetween(startDate, endDate);
    if (months.length === 0) {
      return payments;
    }

    // Distribute balance evenly across months (simplified approach)
    const monthlyPayment = remainingBalance / months.length;

    for (const month of months) {
      payments.push({
        month,
        projectedAmount: Number(monthlyPayment.toFixed(2)),
      });
    }

    return payments;
  }

  /**
   * Calculate monthly cash flow projections
   *
   * Aggregates projected payments by month and calculates cumulative cash.
   *
   * @param projectId Project identifier
   * @param commitmentDetails Commitment payment details
   * @param startDate Projection start date
   * @param endDate Projection end date
   * @returns Array of monthly projection data
   */
  private async calculateMonthlyProjections(
    projectId: string,
    commitmentDetails: CashFlowCommitmentDetailDto[],
    startDate: Date,
    endDate: Date,
  ): Promise<CashFlowMonthlyProjectionDto[]> {
    const months = this.getMonthsBetween(startDate, endDate);
    const projections: CashFlowMonthlyProjectionDto[] = [];
    let cumulativeCash = 0;

    for (const month of months) {
      // Aggregate outflows for this month
      let projectedOutflows = 0;
      for (const commitment of commitmentDetails) {
        const payment = commitment.projectedPayments.find(
          p => p.month.getTime() === month.getTime(),
        );
        if (payment) {
          projectedOutflows += payment.projectedAmount;
        }
      }

      // Calculate inflows for this month from payment applications
      const monthStart = new Date(month);
      const monthEnd = new Date(month);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0); // Last day of month

      const inflowsResult = await this.paymentApplicationRepository
        .createQueryBuilder('app')
        .select('SUM(app.currentPaymentDue)', 'total')
        .where('app.projectId = :projectId', { projectId })
        .andWhere('app.status IN (:...statuses)', {
          statuses: [PaymentApplicationStatus.SUBMITTED, PaymentApplicationStatus.APPROVED]
        })
        .andWhere('app.applicationDate >= :monthStart', { monthStart })
        .andWhere('app.applicationDate <= :monthEnd', { monthEnd })
        .getRawOne();

      const projectedInflows = Number(inflowsResult?.total || 0);

      const netCashFlow = projectedInflows - projectedOutflows;
      cumulativeCash += netCashFlow;

      projections.push({
        month,
        projectedInflows: Number(projectedInflows.toFixed(2)),
        projectedOutflows: Number(projectedOutflows.toFixed(2)),
        netCashFlow: Number(netCashFlow.toFixed(2)),
        cumulativeCash: Number(cumulativeCash.toFixed(2)),
      });
    }

    return projections;
  }

  /**
   * Calculate projected inflows from owner
   *
   * Based on scheduled and approved payment applications within date range.
   *
   * @param project Project entity
   * @param startDate Projection start date
   * @param endDate Projection end date
   * @returns Total projected inflows
   */
  private async calculateProjectedInflows(project: Project, startDate: Date, endDate: Date): Promise<number> {
    // Sum scheduled and approved payment applications in projection period
    const scheduledPaymentsResult = await this.paymentApplicationRepository
      .createQueryBuilder('app')
      .select('SUM(app.currentPaymentDue)', 'total')
      .where('app.projectId = :projectId', { projectId: project.id })
      .andWhere('app.status IN (:...statuses)', {
        statuses: [PaymentApplicationStatus.SUBMITTED, PaymentApplicationStatus.APPROVED]
      })
      .andWhere('app.applicationDate >= :startDate', { startDate })
      .andWhere('app.applicationDate <= :endDate', { endDate })
      .getRawOne();

    return Number(scheduledPaymentsResult?.total || 0);
  }

  /**
   * Calculate peak cash requirement
   *
   * Finds the lowest (most negative) cumulative cash position.
   *
   * @param projections Monthly projections
   * @returns Peak cash requirement (most negative value)
   */
  private calculatePeakCashRequirement(projections: CashFlowMonthlyProjectionDto[]): number {
    if (projections.length === 0) {
      return 0;
    }

    return Math.min(...projections.map(p => p.cumulativeCash));
  }

  /**
   * Get array of first-of-month dates between start and end
   *
   * @param startDate Start date
   * @param endDate End date
   * @returns Array of Date objects (first day of each month)
   */
  private getMonthsBetween(startDate: Date, endDate: Date): Date[] {
    const months: Date[] = [];
    const current = new Date(startDate);
    current.setDate(1); // First day of month
    current.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setDate(1);
    end.setHours(0, 0, 0, 0);

    while (current <= end) {
      months.push(new Date(current));
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  }

  /**
   * Export Cash Flow Projection Report to Excel
   *
   * Generates an Excel file with monthly cash flow projections.
   *
   * @param options Report generation options
   * @returns Excel file buffer
   */
  async exportToExcel(options: {
    projectId: string;
    startDate?: Date;
    endDate?: Date;
    asOfDate?: Date;
  }): Promise<Buffer> {
    this.logger.log(`Exporting Cash Flow Projection Report to Excel for project ${options.projectId}`);

    // Generate report data
    const reportData = await this.generate(options);

    // Use export service to create Excel file
    const buffer = await this.excelExportService.exportCashFlowProjectionToExcel(reportData);

    this.logger.log(`Cash Flow Projection Report exported to Excel successfully`);
    return buffer;
  }

  /**
   * Export Cash Flow Projection Report to PDF
   *
   * Generates a PDF file with monthly cash flow projections.
   *
   * @param options Report generation options
   * @returns PDF file buffer
   */
  async exportToPdf(options: {
    projectId: string;
    startDate?: Date;
    endDate?: Date;
    asOfDate?: Date;
  }): Promise<Buffer> {
    this.logger.log(`Exporting Cash Flow Projection Report to PDF for project ${options.projectId}`);

    // Generate report data
    const reportData = await this.generate(options);

    // Use export service to create PDF file
    const buffer = await this.pdfExportService.exportCashFlowProjectionToPdf(reportData);

    this.logger.log(`Cash Flow Projection Report exported to PDF successfully`);
    return buffer;
  }
}
