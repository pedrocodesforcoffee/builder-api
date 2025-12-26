import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PaymentApplication,
  Commitment,
} from '../entities';
import { Project } from '../../projects/entities/project.entity';
import {
  GenerateAgingReportDto,
  AgingReportDto,
  AgingReportLineDto,
  AgingReportType,
} from '../dto/report';
import { ReportExcelExportService } from './report-excel-export.service';

/**
 * Aging Report Service
 *
 * Generates AR/AP aging reports showing outstanding balances by aging buckets:
 * - Current (0-30 days)
 * - 31-60 days
 * - 61-90 days
 * - 90+ days
 *
 * Business Logic:
 * - AP (Accounts Payable): Uses approved but unpaid payment applications
 * - AR (Accounts Receivable): Would use owner invoices (not implemented in current schema)
 * - daysOutstanding = asOfDate - documentDate
 * - Bucket allocation based on days outstanding
 * - balanceDue = totalAmount - amountPaid
 */
@Injectable()
export class AgingReportService {
  private readonly logger = new Logger(AgingReportService.name);

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
   * Generate Aging Report
   */
  async generate(dto: GenerateAgingReportDto): Promise<AgingReportDto> {
    this.logger.log(`Generating ${dto.reportType} Aging Report for project ${dto.projectId}`);

    // 1. Load project
    const project = await this.projectRepo.findOne({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${dto.projectId} not found`);
    }

    // 2. Determine as-of date
    const asOfDate = dto.asOfDate ? new Date(dto.asOfDate) : new Date();

    // 3. Generate report based on type
    let lines: AgingReportLineDto[];
    if (dto.reportType === AgingReportType.AP) {
      lines = await this.generateAPLines(dto.projectId, asOfDate, dto.vendorName);
    } else {
      // AR not fully implemented (would require owner invoices entity)
      lines = [];
      this.logger.warn('AR aging report not yet implemented - requires owner invoices entity');
    }

    // 4. Calculate totals
    let totalAmount = 0;
    let totalAmountPaid = 0;
    let totalBalanceDue = 0;
    let totalCurrent = 0;
    let totalDays31to60 = 0;
    let totalDays61to90 = 0;
    let totalDays90Plus = 0;
    let overdueCount = 0;

    for (const line of lines) {
      totalAmount += line.totalAmount;
      totalAmountPaid += line.amountPaid;
      totalBalanceDue += line.balanceDue;
      totalCurrent += line.current;
      totalDays31to60 += line.days31to60;
      totalDays61to90 += line.days61to90;
      totalDays90Plus += line.days90Plus;

      if (line.daysOutstanding > 30) {
        overdueCount++;
      }
    }

    // 5. Build and return report
    return {
      projectId: project.id,
      projectName: project.name,
      reportType: dto.reportType,
      asOfDate,
      totalAmount: Number(totalAmount.toFixed(2)),
      totalAmountPaid: Number(totalAmountPaid.toFixed(2)),
      totalBalanceDue: Number(totalBalanceDue.toFixed(2)),
      totalCurrent: Number(totalCurrent.toFixed(2)),
      totalDays31to60: Number(totalDays31to60.toFixed(2)),
      totalDays61to90: Number(totalDays61to90.toFixed(2)),
      totalDays90Plus: Number(totalDays90Plus.toFixed(2)),
      itemCount: lines.length,
      overdueCount,
      lines,
      generatedAt: new Date(),
    };
  }

  /**
   * Export Aging Report to Excel
   */
  async exportToExcel(dto: GenerateAgingReportDto): Promise<Buffer> {
    this.logger.log(`Exporting ${dto.reportType} Aging Report to Excel for project ${dto.projectId}`);

    const report = await this.generate(dto);
    return await this.excelExportService.exportAgingToExcel(report);
  }

  // ==================== HELPER METHODS ====================

  /**
   * Generate AP (Accounts Payable) aging lines
   * Uses approved payment applications that have outstanding balances
   */
  private async generateAPLines(
    projectId: string,
    asOfDate: Date,
    vendorName?: string,
  ): Promise<AgingReportLineDto[]> {
    // Build query for approved payment applications with outstanding balances
    const queryBuilder = this.paymentApplicationRepo
      .createQueryBuilder('pa')
      .leftJoinAndSelect('pa.commitment', 'commitment')
      .where('pa.projectId = :projectId', { projectId })
      .andWhere('pa.status IN (:...statuses)', {
        statuses: ['APPROVED', 'PAID'],
      })
      .orderBy('pa.applicationDate', 'ASC')
      .addOrderBy('commitment.vendorName', 'ASC');

    // Apply vendor filter
    if (vendorName) {
      queryBuilder.andWhere('commitment.vendorName ILIKE :vendorName', {
        vendorName: `%${vendorName}%`,
      });
    }

    const paymentApplications = await queryBuilder.getMany();

    const lines: AgingReportLineDto[] = [];

    for (const pa of paymentApplications) {
      // Calculate aging
      const documentDate = new Date(pa.applicationDate);
      const daysOutstanding = Math.floor(
        (asOfDate.getTime() - documentDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      const totalAmount = Number(pa.currentPaymentDue);
      const amountPaid = pa.status === 'PAID' ? totalAmount : 0;
      const balanceDue = totalAmount - amountPaid;

      // Only include if there's a balance due
      if (balanceDue <= 0) {
        continue;
      }

      // Allocate to aging buckets
      let current = 0;
      let days31to60 = 0;
      let days61to90 = 0;
      let days90Plus = 0;

      if (daysOutstanding <= 30) {
        current = balanceDue;
      } else if (daysOutstanding <= 60) {
        days31to60 = balanceDue;
      } else if (daysOutstanding <= 90) {
        days61to90 = balanceDue;
      } else {
        days90Plus = balanceDue;
      }

      lines.push({
        paymentApplicationId: pa.id,
        referenceNumber: `${pa.commitment.number}-${pa.applicationNumber}`,
        description: pa.commitment.title,
        partyName: pa.commitment.vendorName,
        documentDate,
        dueDate: null, // Could calculate based on payment terms if available
        daysOutstanding,
        totalAmount: Number(totalAmount.toFixed(2)),
        amountPaid: Number(amountPaid.toFixed(2)),
        balanceDue: Number(balanceDue.toFixed(2)),
        current: Number(current.toFixed(2)),
        days31to60: Number(days31to60.toFixed(2)),
        days61to90: Number(days61to90.toFixed(2)),
        days90Plus: Number(days90Plus.toFixed(2)),
        status: pa.status,
      });
    }

    return lines;
  }

  /**
   * Generate report (alias for generate method for controller compatibility)
   */
  async generateReport(dto: any): Promise<any> {
    return this.generate(dto);
  }

}
