import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PaymentApplication,
  Commitment,
} from '../entities';
import { Project } from '../../projects/entities/project.entity';
import {
  GeneratePaymentHistoryReportDto,
  PaymentHistoryReportDto,
  PaymentHistoryLineDto,
} from '../dto/report';
import { ReportExcelExportService } from './report-excel-export.service';

/**
 * Payment History Report Service
 *
 * Generates chronological reports of payment applications tracking:
 * - Payment application details (AIA G702/G703)
 * - Billing period tracking
 * - Financial totals with retention
 * - Approval and payment workflow
 * - Historical payment trends
 *
 * Business Logic:
 * - Reports all payment applications chronologically
 * - Shows AIA G702 fields: completed & stored, retainage, payments
 * - Tracks approval and payment workflow
 * - Supports filtering by date range, commitment, vendor
 */
@Injectable()
export class PaymentHistoryReportService {
  private readonly logger = new Logger(PaymentHistoryReportService.name);

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
   * Generate Payment History Report
   */
  async generate(dto: GeneratePaymentHistoryReportDto): Promise<PaymentHistoryReportDto> {
    this.logger.log(`Generating Payment History Report for project ${dto.projectId}`);

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
      .leftJoinAndSelect('pa.approvedBy', 'approvedBy')
      .leftJoinAndSelect('pa.paidBy', 'paidBy')
      .where('pa.projectId = :projectId', { projectId: dto.projectId })
      .orderBy('pa.applicationDate', 'ASC')
      .addOrderBy('commitment.vendorName', 'ASC')
      .addOrderBy('pa.applicationNumber', 'ASC');

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

    // Apply commitment filter
    if (dto.commitmentId) {
      queryBuilder.andWhere('pa.commitmentId = :commitmentId', {
        commitmentId: dto.commitmentId,
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

    // 3. Build report lines
    const lines: PaymentHistoryLineDto[] = [];
    let totalCompletedAndStored = 0;
    let totalRetainageAmount = 0;
    let totalEarnedLessRetainage = 0;
    let totalPreviousPayments = 0;
    let totalCurrentPaymentDue = 0;
    let approvedCount = 0;
    let paidCount = 0;

    for (const pa of paymentApplications) {
      // Extract values
      const completedAndStored = Number(pa.totalCompletedAndStored);
      const retainageAmount = Number(pa.retainageAmount);
      const earnedLessRetainage = Number(pa.totalEarnedLessRetainage);
      const previousPayments = Number(pa.previousPayments);
      const currentPaymentDue = Number(pa.currentPaymentDue);

      // Count statuses
      if (pa.status === 'APPROVED' || pa.status === 'PAID') {
        approvedCount++;
      }
      if (pa.status === 'PAID') {
        paidCount++;
      }

      // Add to totals
      totalCompletedAndStored += completedAndStored;
      totalRetainageAmount += retainageAmount;
      totalEarnedLessRetainage += earnedLessRetainage;
      totalPreviousPayments += previousPayments;
      totalCurrentPaymentDue += currentPaymentDue;

      // Create line DTO
      lines.push({
        paymentApplicationId: pa.id,
        applicationNumber: pa.applicationNumber,
        applicationDate: pa.applicationDate,
        periodStart: pa.periodStart,
        periodEnd: pa.periodEnd,
        commitmentNumber: pa.commitment.number,
        commitmentTitle: pa.commitment.title,
        vendorName: pa.commitment.vendorName,
        status: pa.status,
        totalCompletedAndStored: Number(completedAndStored.toFixed(2)),
        retainagePercent: Number(pa.retainagePercent),
        retainageAmount: Number(retainageAmount.toFixed(2)),
        totalEarnedLessRetainage: Number(earnedLessRetainage.toFixed(2)),
        previousPayments: Number(previousPayments.toFixed(2)),
        currentPaymentDue: Number(currentPaymentDue.toFixed(2)),
        approvedAt: pa.approvedAt || null,
        approvedByName: pa.approvedBy?.name || null,
        paidAt: pa.paidAt || null,
        paidByName: pa.paidBy?.name || null,
      });
    }

    // 4. Build and return report
    const startDate = dto.startDate ? new Date(dto.startDate) : null;
    const endDate = dto.endDate ? new Date(dto.endDate) : null;

    return {
      projectId: project.id,
      projectName: project.name,
      startDate,
      endDate,
      totalCompletedAndStored: Number(totalCompletedAndStored.toFixed(2)),
      totalRetainageAmount: Number(totalRetainageAmount.toFixed(2)),
      totalEarnedLessRetainage: Number(totalEarnedLessRetainage.toFixed(2)),
      totalPreviousPayments: Number(totalPreviousPayments.toFixed(2)),
      totalCurrentPaymentDue: Number(totalCurrentPaymentDue.toFixed(2)),
      paymentApplicationCount: paymentApplications.length,
      approvedCount,
      paidCount,
      lines,
      generatedAt: new Date(),
    };
  }

  /**
   * Export Payment History Report to Excel
   */
  async exportToExcel(dto: GeneratePaymentHistoryReportDto): Promise<Buffer> {
    this.logger.log(`Exporting Payment History Report to Excel for project ${dto.projectId}`);

    const report = await this.generate(dto);
    return await this.excelExportService.exportPaymentHistoryToExcel(report);
  }

  /**
   * Generate report (alias for generate method for controller compatibility)
   */
  async generateReport(dto: any): Promise<any> {
    return this.generate(dto);
  }

}
