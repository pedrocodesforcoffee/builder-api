import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { PaymentApplication } from '../entities/payment-application.entity';
import { PaymentApplicationStatus } from '../enums/payment-application-status.enum';
import {
  InvoiceRegisterReportDto,
  InvoiceRegisterLineDto,
} from '../dto/report';
import { ReportExcelExportService } from './report-excel-export.service';
import { ReportPdfExportService } from './report-pdf-export.service';

/**
 * Invoice Register Report Service
 *
 * Generates comprehensive invoice tracking report with aging analysis.
 * Tracks both payable (to vendors) and receivable (from owner) invoices.
 *
 * Key Features:
 * - Invoice listing with aging buckets
 * - Payable vs Receivable tracking
 * - Aging summary (Current, 1-30, 31-60, 61-90, 90+ days)
 * - Status filtering (PENDING, APPROVED, PAID, REJECTED)
 *
 * Note: This is a placeholder implementation. Full invoice tracking will be
 * implemented when Invoice entity is added to the system.
 */
@Injectable()
export class InvoiceRegisterReportService {
  private readonly logger = new Logger(InvoiceRegisterReportService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(PaymentApplication)
    private readonly paymentApplicationRepository: Repository<PaymentApplication>,
    private readonly excelExportService: ReportExcelExportService,
    private readonly pdfExportService: ReportPdfExportService,
  ) {}

  /**
   * Generate Invoice Register Report
   *
   * Lists all invoices with aging analysis and status tracking.
   *
   * @param options Report generation options
   * @returns Invoice register report data
   * @throws NotFoundException if project not found
   */
  async generate(options: {
    projectId: string;
    type?: 'PAYABLE' | 'RECEIVABLE';
    status?: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';
    asOfDate?: Date;
  }): Promise<InvoiceRegisterReportDto> {
    const { projectId, type, status, asOfDate = new Date() } = options;

    this.logger.log(`Generating Invoice Register Report for project ${projectId}`);

    // Fetch project
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project not found: ${projectId}`);
    }

    // Fetch payment applications as receivables (invoices to owner)
    // Note: Full invoice register with vendor payables requires Invoice entity
    let invoices: InvoiceRegisterLineDto[] = [];

    // Check if filtering for PAYABLE only - return empty since no Invoice entity exists
    if (type !== 'PAYABLE') {
      const queryBuilder = this.paymentApplicationRepository
        .createQueryBuilder('app')
        .leftJoinAndSelect('app.commitment', 'commitment')
        .where('app.projectId = :projectId', { projectId })
        .andWhere('app.applicationDate <= :asOfDate', { asOfDate });

      // Apply status filter if specified
      if (status) {
        // Map invoice statuses to payment application statuses
        const statusMap: Record<string, PaymentApplicationStatus> = {
          'PENDING': PaymentApplicationStatus.DRAFT,
          'APPROVED': PaymentApplicationStatus.APPROVED,
          'PAID': PaymentApplicationStatus.PAID,
          'REJECTED': PaymentApplicationStatus.REJECTED,
        };
        const appStatus = statusMap[status];
        if (appStatus) {
          queryBuilder.andWhere('app.status = :status', { status: appStatus });
        }
      }

      const paymentApplications = await queryBuilder.getMany();

      // Transform payment applications into invoice register lines
      invoices = paymentApplications.map(app => {
      const daysOutstanding = this.calculateDaysOutstanding(app.applicationDate, asOfDate);
      const agingBucket = this.determineAgingBucket(daysOutstanding);
      const amountDue = Number(app.totalEarnedLessRetainage);
      const amountPaid = app.status === PaymentApplicationStatus.PAID
        ? Number(app.currentPaymentDue)
        : 0;

        return {
          invoiceId: app.id,
          invoiceNumber: `PAY-APP-${app.applicationNumber}`,
          invoiceType: 'RECEIVABLE' as const,
          invoiceDate: app.applicationDate,
          dueDate: app.periodEnd, // Use period end as due date
          vendorOrCustomerName: 'Owner', // Payment applications are from owner
          commitmentNumber: app.commitment?.number,
          description: `Payment Application #${app.applicationNumber}`,
          amount: Number(app.currentPaymentDue),
          retentionHeld: Number(app.retainageAmount),
          amountDue,
          amountPaid,
          status: app.status,
          daysOutstanding,
          agingBucket,
        };
      });
    }

    // Calculate summary metrics
    const totalInvoices = invoices.length;
    const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalPaidAmount = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
    const totalOutstandingAmount = invoices.reduce(
      (sum, inv) => sum + (inv.amountDue - inv.amountPaid),
      0,
    );
    const totalRetentionHeld = invoices.reduce((sum, inv) => sum + inv.retentionHeld, 0);

    // Calculate aging summary
    const agingCurrent = invoices
      .filter(inv => inv.agingBucket === 'Current')
      .reduce((sum, inv) => sum + (inv.amountDue - inv.amountPaid), 0);

    const aging31To60 = invoices
      .filter(inv => inv.agingBucket === '31-60')
      .reduce((sum, inv) => sum + (inv.amountDue - inv.amountPaid), 0);

    const aging61To90 = invoices
      .filter(inv => inv.agingBucket === '61-90')
      .reduce((sum, inv) => sum + (inv.amountDue - inv.amountPaid), 0);

    const aging90Plus = invoices
      .filter(inv => inv.agingBucket === '90+')
      .reduce((sum, inv) => sum + (inv.amountDue - inv.amountPaid), 0);

    const report: InvoiceRegisterReportDto = {
      projectId: project.id,
      projectName: project.name,
      asOfDate,
      filterType: type,
      filterStatus: status,
      totalInvoices,
      totalInvoiceAmount: Number(totalInvoiceAmount.toFixed(2)),
      totalPaidAmount: Number(totalPaidAmount.toFixed(2)),
      totalOutstandingAmount: Number(totalOutstandingAmount.toFixed(2)),
      totalRetentionHeld: Number(totalRetentionHeld.toFixed(2)),
      agingCurrent: Number(agingCurrent.toFixed(2)),
      aging31To60: Number(aging31To60.toFixed(2)),
      aging61To90: Number(aging61To90.toFixed(2)),
      aging90Plus: Number(aging90Plus.toFixed(2)),
      invoices,
      generatedAt: new Date(),
    };

    this.logger.log(
      `Invoice Register Report generated: ${totalInvoices} invoices, ` +
        `$${totalOutstandingAmount.toFixed(2)} outstanding`,
    );

    return report;
  }

  /**
   * Calculate days outstanding for an invoice
   *
   * @param invoiceDate Invoice date
   * @param asOfDate Report as-of date
   * @returns Days outstanding
   */
  private calculateDaysOutstanding(invoiceDate: Date, asOfDate: Date): number {
    const diffTime = asOfDate.getTime() - invoiceDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Determine aging bucket based on days outstanding
   *
   * @param daysOutstanding Days outstanding
   * @returns Aging bucket string
   */
  private determineAgingBucket(daysOutstanding: number): string {
    if (daysOutstanding <= 30) return 'Current';
    if (daysOutstanding <= 60) return '31-60';
    if (daysOutstanding <= 90) return '61-90';
    return '90+';
  }

  /**
   * Export Invoice Register Report to Excel
   *
   * Generates an Excel file with invoice register data including aging analysis.
   *
   * @param options Report generation options
   * @returns Excel file buffer
   */
  async exportToExcel(options: {
    projectId: string;
    type?: 'PAYABLE' | 'RECEIVABLE';
    status?: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';
    asOfDate?: Date;
  }): Promise<Buffer> {
    this.logger.log(`Exporting Invoice Register Report to Excel for project ${options.projectId}`);

    // Generate report data
    const reportData = await this.generate(options);

    // Use export service to create Excel file
    const buffer = await this.excelExportService.exportInvoiceRegisterToExcel(reportData);

    this.logger.log(`Invoice Register Report exported to Excel successfully`);
    return buffer;
  }

  /**
   * Export Invoice Register Report to PDF
   *
   * Generates a PDF file with invoice register data including aging analysis.
   *
   * @param options Report generation options
   * @returns PDF file buffer
   */
  async exportToPdf(options: {
    projectId: string;
    type?: 'PAYABLE' | 'RECEIVABLE';
    status?: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';
    asOfDate?: Date;
  }): Promise<Buffer> {
    this.logger.log(`Exporting Invoice Register Report to PDF for project ${options.projectId}`);

    // Generate report data
    const reportData = await this.generate(options);

    // Use export service to create PDF file
    const buffer = await this.pdfExportService.exportInvoiceRegisterToPdf(reportData);

    this.logger.log(`Invoice Register Report exported to PDF successfully`);
    return buffer;
  }
}
