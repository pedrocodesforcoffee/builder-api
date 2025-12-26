import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PaymentApplication,
  Commitment,
} from '../entities';
import { Project } from '../../projects/entities/project.entity';
import {
  GenerateVendorPaymentsReportDto,
  VendorPaymentsReportDto,
  VendorPaymentsLineDto,
  VendorPaymentsSummaryDto,
} from '../dto/report';
import { ReportExcelExportService } from './report-excel-export.service';

/**
 * Vendor Payments Report Service
 *
 * Generates detailed payment tracking reports by vendor showing:
 * - Individual payment applications
 * - Amounts requested and paid
 * - Retainage held
 * - Payment timing metrics
 * - Vendor-level payment summaries
 *
 * Business Logic:
 * - Groups payment applications by vendor
 * - Tracks payment workflow (approved → paid)
 * - Calculates days to payment
 * - totalAmountRequested = sum(currentPaymentDue)
 * - totalAmountPaid = sum(currentPaymentDue) where status = PAID
 * - totalOutstanding = totalAmountRequested - totalAmountPaid
 * - daysToPayment = paidAt - applicationDate
 * - averageDaysToPayment = average of all paid payment daysToPayment
 */
@Injectable()
export class VendorPaymentsReportService {
  private readonly logger = new Logger(VendorPaymentsReportService.name);

  constructor(
    @InjectRepository(PaymentApplication)
    private paymentApplicationRepo: Repository<PaymentApplication>,
    @InjectRepository(Commitment)
    private commitmentRepo: Repository<Commitment>,
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    private excelExportService: ReportExcelExportService,
  ) {}

  /**
   * Generate Vendor Payments Report
   */
  async generate(dto: GenerateVendorPaymentsReportDto): Promise<VendorPaymentsReportDto> {
    this.logger.log(`Generating Vendor Payments Report for project ${dto.projectId}`);

    // 1. Load project
    const project = await this.projectRepo.findOne({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${dto.projectId} not found`);
    }

    // 2. Build query for payment applications
    const queryBuilder = this.paymentApplicationRepo
      .createQueryBuilder('pa')
      .leftJoinAndSelect('pa.commitment', 'commitment')
      .leftJoinAndSelect('pa.paidBy', 'paidBy')
      .where('pa.projectId = :projectId', { projectId: dto.projectId })
      .orderBy('commitment.vendorName', 'ASC')
      .addOrderBy('pa.applicationDate', 'ASC');

    // Apply date range filters
    if (dto.startDate) {
      queryBuilder.andWhere('pa.applicationDate >= :startDate', {
        startDate: new Date(dto.startDate),
      });
    }

    if (dto.endDate) {
      queryBuilder.andWhere('pa.applicationDate <= :endDate', {
        endDate: new Date(dto.endDate),
      });
    }

    // Apply vendor filter
    if (dto.vendorName) {
      queryBuilder.andWhere('commitment.vendorName ILIKE :vendorName', {
        vendorName: `%${dto.vendorName}%`,
      });
    }

    const paymentApplications = await queryBuilder.getMany();

    if (paymentApplications.length === 0) {
      this.logger.warn(`No payment applications found for project ${dto.projectId}`);
    }

    // 3. Build detailed lines
    const lines: VendorPaymentsLineDto[] = [];
    const vendorStatsMap = new Map<string, {
      paymentCount: number;
      totalAmountRequested: number;
      totalAmountPaid: number;
      totalRetainageHeld: number;
      totalOutstanding: number;
      daysToPaymentSum: number;
      paidPaymentCount: number;
    }>();

    let totalAmountRequested = 0;
    let totalAmountPaid = 0;
    let totalRetainageHeld = 0;
    let totalOutstanding = 0;
    let totalDaysToPaymentSum = 0;
    let totalPaidCount = 0;

    for (const pa of paymentApplications) {
      const vendorName = pa.commitment.vendorName;
      const currentPaymentDue = Number(pa.currentPaymentDue);
      const retainageAmount = Number(pa.retainageAmount);
      const isPaid = pa.status === 'PAID';
      const amountPaid = isPaid ? currentPaymentDue : 0;
      const outstanding = currentPaymentDue - amountPaid;

      // Calculate days to payment
      let daysToPayment: number | null = null;
      if (isPaid && pa.paidAt) {
        const applicationDate = new Date(pa.applicationDate);
        const paidDate = new Date(pa.paidAt);
        daysToPayment = Math.floor(
          (paidDate.getTime() - applicationDate.getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      // Update vendor stats
      if (!vendorStatsMap.has(vendorName)) {
        vendorStatsMap.set(vendorName, {
          paymentCount: 0,
          totalAmountRequested: 0,
          totalAmountPaid: 0,
          totalRetainageHeld: 0,
          totalOutstanding: 0,
          daysToPaymentSum: 0,
          paidPaymentCount: 0,
        });
      }

      const vendorStats = vendorStatsMap.get(vendorName)!;
      vendorStats.paymentCount++;
      vendorStats.totalAmountRequested += currentPaymentDue;
      vendorStats.totalAmountPaid += amountPaid;
      vendorStats.totalRetainageHeld += retainageAmount;
      vendorStats.totalOutstanding += outstanding;

      if (daysToPayment !== null) {
        vendorStats.daysToPaymentSum += daysToPayment;
        vendorStats.paidPaymentCount++;
      }

      // Update global totals
      totalAmountRequested += currentPaymentDue;
      totalAmountPaid += amountPaid;
      totalRetainageHeld += retainageAmount;
      totalOutstanding += outstanding;

      if (daysToPayment !== null) {
        totalDaysToPaymentSum += daysToPayment;
        totalPaidCount++;
      }

      // Create line DTO
      lines.push({
        vendorName,
        commitmentNumber: pa.commitment.number,
        commitmentTitle: pa.commitment.title,
        paymentApplicationId: pa.id,
        applicationNumber: pa.applicationNumber,
        applicationDate: pa.applicationDate,
        status: pa.status,
        currentPaymentDue: Number(currentPaymentDue.toFixed(2)),
        retainageAmount: Number(retainageAmount.toFixed(2)),
        approvedAt: pa.approvedAt || null,
        paidAt: pa.paidAt || null,
        paidByName: pa.paidBy?.name || null,
        daysToPayment,
      });
    }

    // 4. Build summary by vendor
    const summaryByVendor: VendorPaymentsSummaryDto[] = [];
    for (const [vendorName, stats] of vendorStatsMap.entries()) {
      const averageDaysToPayment = stats.paidPaymentCount > 0
        ? stats.daysToPaymentSum / stats.paidPaymentCount
        : 0;

      summaryByVendor.push({
        vendorName,
        paymentCount: stats.paymentCount,
        totalAmountRequested: Number(stats.totalAmountRequested.toFixed(2)),
        totalAmountPaid: Number(stats.totalAmountPaid.toFixed(2)),
        totalRetainageHeld: Number(stats.totalRetainageHeld.toFixed(2)),
        totalOutstanding: Number(stats.totalOutstanding.toFixed(2)),
        averageDaysToPayment: Number(averageDaysToPayment.toFixed(1)),
      });
    }

    // Sort summary by vendor name
    summaryByVendor.sort((a, b) => a.vendorName.localeCompare(b.vendorName));

    // 5. Calculate global average days to payment
    const averageDaysToPayment = totalPaidCount > 0
      ? totalDaysToPaymentSum / totalPaidCount
      : 0;

    // 6. Build and return report
    const startDate = dto.startDate ? new Date(dto.startDate) : null;
    const endDate = dto.endDate ? new Date(dto.endDate) : null;

    return {
      projectId: project.id,
      projectName: project.name,
      startDate,
      endDate,
      totalAmountRequested: Number(totalAmountRequested.toFixed(2)),
      totalAmountPaid: Number(totalAmountPaid.toFixed(2)),
      totalRetainageHeld: Number(totalRetainageHeld.toFixed(2)),
      totalOutstanding: Number(totalOutstanding.toFixed(2)),
      vendorCount: vendorStatsMap.size,
      paymentApplicationCount: paymentApplications.length,
      averageDaysToPayment: Number(averageDaysToPayment.toFixed(1)),
      summaryByVendor,
      lines,
      generatedAt: new Date(),
    };
  }

  /**
   * Export Vendor Payments Report to Excel
   */
  async exportToExcel(dto: GenerateVendorPaymentsReportDto): Promise<Buffer> {
    this.logger.log(`Exporting Vendor Payments Report to Excel for project ${dto.projectId}`);

    const report = await this.generate(dto);
    return await this.excelExportService.exportVendorPaymentsToExcel(report);
  }

  /**
   * Generate report (alias for generate method for controller compatibility)
   */
  async generateReport(dto: any): Promise<any> {
    return this.generate(dto);
  }

}
