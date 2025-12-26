import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import {
  BudgetDetailReportDto,
  WIPReportDto,
  CostToCompleteReportDto,
  CommitmentListReportDto,
  EarnedValueAnalysisReportDto,
  CashFlowProjectionReportDto,
  InvoiceRegisterReportDto,
  ExecutiveSummaryReportDto,
  BudgetVarianceReportDto,
  CommitmentStatusReportDto,
  PaymentHistoryReportDto,
  AgingReportDto,
  ChangeOrderLogReportDto,
  ChangeOrderSummaryReportDto,
  SubcontractorSummaryReportDto,
  VendorPaymentsReportDto,
} from '../dto/report';
import { CustomReportResultDto } from '../dto/custom-report';

/**
 * Report PDF Export Service
 *
 * Generates professional PDF reports for all financial reports.
 * Uses PDFKit for PDF generation with consistent styling and formatting.
 *
 * Report Categories:
 * - Phase 1: Budget Detail, WIP, Cost to Complete, Commitment List
 * - Phase 2: Earned Value Analysis, Cash Flow, Invoice Register, Executive Summary
 * - Phase 3: Budget Variance, Commitment Status, Payment History, Aging, CO Log/Summary, Subcontractor/Vendor
 */
@Injectable()
export class ReportPdfExportService {
  private readonly logger = new Logger(ReportPdfExportService.name);

  // Styling constants
  private readonly COLORS = {
    primary: '#366092',      // Dark blue for headers
    secondary: '#4472C4',    // Medium blue for subheaders
    accent: '#FFD966',       // Yellow for totals
    light: '#F0F0F0',        // Light gray for alternating rows
    border: '#D0D0D0',       // Border color
    text: '#000000',         // Black text
    textLight: '#666666',    // Gray text
  };

  private readonly FONTS = {
    regular: 'Helvetica',
    bold: 'Helvetica-Bold',
    italic: 'Helvetica-Oblique',
  };

  // =============================================================================
  // PHASE 1 REPORTS
  // =============================================================================

  /**
   * Export Budget Detail Report to PDF
   */
  async exportBudgetDetailToPdf(data: BudgetDetailReportDto): Promise<Buffer> {
    this.logger.log(`Generating Budget Detail Report PDF for project ${data.projectId}`);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Title
      this.addReportTitle(doc, 'Budget Detail Report');

      // Header section
      this.addKeyValueSection(doc, [
        ['Project:', data.projectName],
        ['Budget:', data.budgetName],
        ['As Of:', this.formatDate(data.asOfDate)],
        ['Generated:', this.formatDateTime(data.generatedAt)],
      ]);

      // Summary section
      doc.moveDown(0.5);
      this.addSectionTitle(doc, 'Budget Summary');
      this.addKeyValueSection(doc, [
        ['Total Original Budget:', this.formatCurrency(data.totalOriginalBudget)],
        ['Total Change Orders:', this.formatCurrency(data.totalChangeOrders)],
        ['Total Revised Budget:', this.formatCurrency(data.totalRevisedBudget)],
        ['Total Actual Cost:', this.formatCurrency(data.totalActualCost)],
        ['Total Committed Cost:', this.formatCurrency(data.totalCommittedCost)],
        ['Total Projected Final Cost:', this.formatCurrency(data.totalProjectedFinalCost)],
        ['Total Projected Variance:', this.formatCurrency(data.totalProjectedVariance)],
        ['Total Percent Complete:', this.formatPercent(data.totalPercentComplete)],
      ], true);

      // Line items table
      doc.addPage();
      this.addSectionTitle(doc, 'Budget Detail by Cost Code');
      doc.moveDown(0.5);

      const headers = [
        'Cost Code',
        'Description',
        'Original',
        'Revisions',
        'Current',
        'Actual',
        'Committed',
        'Projected',
        'Variance',
        '% Var',
      ];

      const columnWidths = [70, 120, 60, 60, 60, 60, 60, 60, 60, 45];

      this.addTableHeader(doc, headers, columnWidths);

      let currentY = doc.y;
      data.lines.forEach((line, index) => {
        // Check for page break
        if (currentY > 700) {
          doc.addPage();
          this.addTableHeader(doc, headers, columnWidths);
          currentY = doc.y;
        }

        const rowData = [
          line.costCode,
          line.description,
          this.formatCurrency(line.originalBudget),
          this.formatCurrency(line.changeOrders),
          this.formatCurrency(line.revisedBudget),
          this.formatCurrency(line.actualCost),
          this.formatCurrency(line.committedCost),
          this.formatCurrency(line.projectedFinalCost),
          this.formatCurrency(line.projectedVariance),
          this.formatPercent(line.percentComplete),
        ];

        this.addTableRow(doc, rowData, columnWidths, index);
        currentY = doc.y;
      });

      // Totals row
      this.addTotalsRow(doc, [
        'TOTAL',
        '',
        this.formatCurrency(data.totalOriginalBudget),
        this.formatCurrency(data.totalChangeOrders),
        this.formatCurrency(data.totalRevisedBudget),
        this.formatCurrency(data.totalActualCost),
        this.formatCurrency(data.totalCommittedCost),
        this.formatCurrency(data.totalProjectedFinalCost),
        this.formatCurrency(data.totalProjectedVariance),
        this.formatPercent(data.totalPercentComplete),
      ], columnWidths);

      this.addFooter(doc);
      doc.end();
    });
  }

  /**
   * Export WIP Report to PDF
   */
  async exportWIPToPdf(data: WIPReportDto): Promise<Buffer> {
    this.logger.log(`Generating WIP Report PDF for project ${data.projectId}`);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Title
      this.addReportTitle(doc, 'Work-In-Progress (WIP) Report');

      // Header section
      this.addKeyValueSection(doc, [
        ['Project:', data.projectName],
        ['As Of:', this.formatDate(data.asOfDate)],
        ['Generated:', this.formatDateTime(data.generatedAt)],
      ]);

      // Summary section
      doc.moveDown(0.5);
      this.addSectionTitle(doc, 'WIP Summary');
      this.addKeyValueSection(doc, [
        ['Total Contract Value:', this.formatCurrency(data.totalContractValue)],
        ['Total Earned Revenue:', this.formatCurrency(data.totalEarnedRevenue)],
        ['Total Actual Cost:', this.formatCurrency(data.totalActualCost)],
        ['Total Under/Over Billing:', this.formatCurrency(data.totalUnderOverBilling)],
        ['Total % Complete:', this.formatPercent(data.totalPercentComplete)],
        ['Estimated Profit:', this.formatCurrency(data.estimatedProfit)],
        ['Estimated Profit Margin:', this.formatPercent(data.estimatedProfitMargin)],
      ], true);

      // Line items table
      doc.addPage();
      this.addSectionTitle(doc, 'WIP Detail by Cost Code');
      doc.moveDown(0.5);

      const headers = [
        'Cost Code',
        'Description',
        'Budget',
        'Contract',
        'Actual',
        'Earned',
        'Billed',
        'Under/Over',
        '% Done',
      ];

      const columnWidths = [60, 100, 60, 60, 60, 60, 60, 60, 50];

      this.addTableHeader(doc, headers, columnWidths);

      let currentY = doc.y;
      data.lines.forEach((line, index) => {
        if (currentY > 700) {
          doc.addPage();
          this.addTableHeader(doc, headers, columnWidths);
          currentY = doc.y;
        }

        const rowData = [
          line.costCode,
          line.description,
          this.formatCurrency(line.revisedBudget),
          this.formatCurrency(line.contractValue),
          this.formatCurrency(line.actualCost),
          this.formatCurrency(line.earnedRevenue),
          this.formatCurrency(line.billedToDate),
          this.formatCurrency(line.underOverBilling),
          this.formatPercent(line.percentComplete),
        ];

        this.addTableRow(doc, rowData, columnWidths, index);
        currentY = doc.y;
      });

      // Totals row
      this.addTotalsRow(doc, [
        'TOTAL',
        '',
        this.formatCurrency(data.totalRevisedBudget),
        this.formatCurrency(data.totalContractValue),
        this.formatCurrency(data.totalActualCost),
        this.formatCurrency(data.totalEarnedRevenue),
        this.formatCurrency(data.totalBilledToDate),
        this.formatCurrency(data.totalUnderOverBilling),
        this.formatPercent(data.totalPercentComplete),
      ], columnWidths);

      this.addFooter(doc);
      doc.end();
    });
  }

  /**
   * Export Cost to Complete Report to PDF
   */
  async exportCostToCompleteToPdf(data: CostToCompleteReportDto): Promise<Buffer> {
    this.logger.log(`Generating Cost to Complete Report PDF for project ${data.projectId}`);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Title
      this.addReportTitle(doc, 'Cost to Complete Report');

      // Header section
      this.addKeyValueSection(doc, [
        ['Project:', data.projectName],
        ['Budget:', data.budgetName],
        ['As Of:', this.formatDate(data.asOfDate)],
        ['Generated:', this.formatDateTime(data.generatedAt)],
      ]);

      // Summary section
      doc.moveDown(0.5);
      this.addSectionTitle(doc, 'Project Summary');
      this.addKeyValueSection(doc, [
        ['Total Revised Budget:', this.formatCurrency(data.totalRevisedBudget)],
        ['Total Actual Cost to Date:', this.formatCurrency(data.totalActualCost)],
        ['Total Earned Value:', this.formatCurrency(data.totalEarnedValue)],
        ['Overall CPI:', data.overallCPI.toFixed(3)],
        ['Total Estimate to Complete:', this.formatCurrency(data.totalETC)],
        ['Total Estimate at Completion:', this.formatCurrency(data.totalEAC)],
        ['Total Variance at Completion:', this.formatCurrency(data.totalVAC)],
        ['Overall TCPI:', data.overallTCPI.toFixed(3)],
        ['Total % Complete:', this.formatPercent(data.totalPercentComplete)],
      ], true);

      // Line items table
      doc.addPage();
      this.addSectionTitle(doc, 'Cost to Complete by Cost Code');
      doc.moveDown(0.5);

      const headers = [
        'Cost Code',
        'Description',
        'Budget',
        'Actual',
        'Earned',
        'CPI',
        'ETC',
        'EAC',
        'VAC',
        'TCPI',
        '% Done',
      ];

      const columnWidths = [50, 90, 50, 50, 50, 40, 50, 50, 50, 40, 40];

      this.addTableHeader(doc, headers, columnWidths);

      let currentY = doc.y;
      data.lines.forEach((line, index) => {
        if (currentY > 700) {
          doc.addPage();
          this.addTableHeader(doc, headers, columnWidths);
          currentY = doc.y;
        }

        const rowData = [
          line.costCode,
          line.description,
          this.formatCurrency(line.revisedBudget),
          this.formatCurrency(line.actualCost),
          this.formatCurrency(line.earnedValue),
          line.cpi.toFixed(2),
          this.formatCurrency(line.etc),
          this.formatCurrency(line.eac),
          this.formatCurrency(line.vac),
          line.tcpi.toFixed(2),
          this.formatPercent(line.percentComplete),
        ];

        this.addTableRow(doc, rowData, columnWidths, index);
        currentY = doc.y;
      });

      // Totals row
      this.addTotalsRow(doc, [
        'TOTAL',
        '',
        this.formatCurrency(data.totalRevisedBudget),
        this.formatCurrency(data.totalActualCost),
        this.formatCurrency(data.totalEarnedValue),
        data.overallCPI.toFixed(2),
        this.formatCurrency(data.totalETC),
        this.formatCurrency(data.totalEAC),
        this.formatCurrency(data.totalVAC),
        data.overallTCPI.toFixed(2),
        this.formatPercent(data.totalPercentComplete),
      ], columnWidths);

      this.addFooter(doc);
      doc.end();
    });
  }

  /**
   * Export Commitment List Report to PDF
   */
  async exportCommitmentListToPdf(data: CommitmentListReportDto): Promise<Buffer> {
    this.logger.log(`Generating Commitment List Report PDF for project ${data.projectId}`);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50, layout: 'landscape' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Title
      this.addReportTitle(doc, 'Commitment List Report');

      // Header section
      this.addKeyValueSection(doc, [
        ['Project:', data.projectName],
        ['As Of:', this.formatDate(data.asOfDate)],
        ['Generated:', this.formatDateTime(data.generatedAt)],
      ]);

      // Summary section
      doc.moveDown(0.5);
      this.addSectionTitle(doc, 'Summary');
      this.addKeyValueSection(doc, [
        ['Total Commitments:', data.lines.length.toString()],
        ['Total Original Amount:', this.formatCurrency(data.totalOriginalAmount)],
        ['Total Change Orders:', this.formatCurrency(data.totalChangeOrders)],
        ['Total Revised Amount:', this.formatCurrency(data.totalRevisedAmount)],
        ['Total Invoiced to Date:', this.formatCurrency(data.totalInvoicedToDate)],
        ['Total Paid to Date:', this.formatCurrency(data.totalPaidToDate)],
        ['Total Retention Held:', this.formatCurrency(data.totalRetentionHeld)],
        ['Total Remaining Balance:', this.formatCurrency(data.totalRemainingBalance)],
      ], true);

      // Commitments table
      doc.addPage({ layout: 'landscape' });
      this.addSectionTitle(doc, 'Commitment Detail');
      doc.moveDown(0.5);

      const headers = [
        'Number',
        'Vendor',
        'Type',
        'Status',
        'Original',
        'Change Orders',
        'Revised',
        'Invoiced',
        'Paid',
        'Retention',
        'Outstanding',
      ];

      const columnWidths = [60, 100, 60, 60, 65, 70, 65, 65, 65, 60, 70];

      this.addTableHeader(doc, headers, columnWidths);

      let currentY = doc.y;
      data.lines.forEach((line, index) => {
        if (currentY > 520) {
          doc.addPage({ layout: 'landscape' });
          this.addTableHeader(doc, headers, columnWidths);
          currentY = doc.y;
        }

        const rowData = [
          line.commitmentNumber,
          line.vendorName,
          line.type,
          line.status,
          this.formatCurrency(line.originalAmount),
          this.formatCurrency(line.changeOrders),
          this.formatCurrency(line.revisedAmount),
          this.formatCurrency(line.invoicedToDate),
          this.formatCurrency(line.paidToDate),
          this.formatCurrency(line.retentionHeld),
          this.formatCurrency(line.remainingBalance),
        ];

        this.addTableRow(doc, rowData, columnWidths, index);
        currentY = doc.y;
      });

      // Totals row
      this.addTotalsRow(doc, [
        'TOTAL',
        '',
        '',
        '',
        this.formatCurrency(data.totalOriginalAmount),
        this.formatCurrency(data.totalChangeOrders),
        this.formatCurrency(data.totalRevisedAmount),
        this.formatCurrency(data.totalInvoicedToDate),
        this.formatCurrency(data.totalPaidToDate),
        this.formatCurrency(data.totalRetentionHeld),
        this.formatCurrency(data.totalRemainingBalance),
      ], columnWidths);

      this.addFooter(doc);
      doc.end();
    });
  }

  // =============================================================================
  // PHASE 2 REPORTS
  // =============================================================================

  /**
   * Export Earned Value Analysis Report to PDF
   */
  async exportEarnedValueAnalysisToPdf(data: EarnedValueAnalysisReportDto): Promise<Buffer> {
    this.logger.log(`Generating Earned Value Analysis Report PDF for project ${data.projectId}`);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Title
      this.addReportTitle(doc, 'Earned Value Analysis Report');

      // Header section
      this.addKeyValueSection(doc, [
        ['Project:', data.projectName],
        ['Budget:', data.budgetName],
        ['As Of:', this.formatDate(data.asOfDate)],
        ['Generated:', this.formatDateTime(data.generatedAt)],
      ]);

      // Summary section
      doc.moveDown(0.5);
      this.addSectionTitle(doc, 'EVM Summary');
      this.addKeyValueSection(doc, [
        ['Budget at Completion (BAC):', this.formatCurrency(data.bac)],
        ['Planned Value (PV):', this.formatCurrency(data.pv)],
        ['Earned Value (EV):', this.formatCurrency(data.ev)],
        ['Actual Cost (AC):', this.formatCurrency(data.ac)],
        ['Cost Variance (CV):', this.formatCurrency(data.cv)],
        ['Schedule Variance (SV):', this.formatCurrency(data.sv)],
        ['Cost Performance Index (CPI):', data.cpi.toFixed(3)],
        ['Schedule Performance Index (SPI):', data.spi.toFixed(3)],
        ['Estimate at Completion (EAC):', this.formatCurrency(data.eac)],
        ['Estimate to Complete (ETC):', this.formatCurrency(data.etc)],
        ['Variance at Completion (VAC):', this.formatCurrency(data.vac)],
        ['To Complete Performance Index (TCPI):', data.tcpi.toFixed(3)],
      ], true);

      // Line items table
      doc.addPage();
      this.addSectionTitle(doc, 'EVM Detail by Cost Code');
      doc.moveDown(0.5);

      const headers = [
        'Cost Code',
        'Description',
        'BAC',
        'PV',
        'EV',
        'AC',
        'CV',
        'SV',
        'CPI',
        'SPI',
      ];

      const columnWidths = [60, 100, 50, 50, 50, 50, 45, 45, 40, 40];

      this.addTableHeader(doc, headers, columnWidths);

      let currentY = doc.y;
      data.lines.forEach((line, index) => {
        if (currentY > 700) {
          doc.addPage();
          this.addTableHeader(doc, headers, columnWidths);
          currentY = doc.y;
        }

        const rowData = [
          line.costCode,
          line.description,
          this.formatCurrency(line.bac),
          this.formatCurrency(line.pv),
          this.formatCurrency(line.ev),
          this.formatCurrency(line.ac),
          this.formatCurrency(line.cv),
          this.formatCurrency(line.sv),
          line.cpi.toFixed(2),
          line.spi.toFixed(2),
        ];

        this.addTableRow(doc, rowData, columnWidths, index);
        currentY = doc.y;
      });

      this.addFooter(doc);
      doc.end();
    });
  }

  /**
   * Export Cash Flow Projection Report to PDF
   */
  async exportCashFlowProjectionToPdf(data: CashFlowProjectionReportDto): Promise<Buffer> {
    this.logger.log(`Generating Cash Flow Projection Report PDF for project ${data.projectId}`);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Title
      this.addReportTitle(doc, 'Cash Flow Projection Report');

      // Header section
      this.addKeyValueSection(doc, [
        ['Project:', data.projectName],
        ['Projection Period:', `${this.formatDate(data.startDate)} to ${this.formatDate(data.endDate)}`],
        ['As Of:', this.formatDate(data.asOfDate)],
        ['Generated:', this.formatDateTime(data.generatedAt)],
      ]);

      // Summary section
      doc.moveDown(0.5);
      this.addSectionTitle(doc, 'Cash Flow Summary');
      this.addKeyValueSection(doc, [
        ['Total Projected Inflows:', this.formatCurrency(data.totalProjectedInflows)],
        ['Total Projected Outflows:', this.formatCurrency(data.totalProjectedOutflows)],
        ['Net Cash Flow:', this.formatCurrency(data.netCashFlow)],
        ['Peak Cash Requirement:', this.formatCurrency(data.peakCashRequirement)],
        ['Current Cash Position:', this.formatCurrency(data.currentCashPosition)],
        ['Total Retention Held:', this.formatCurrency(data.totalRetentionHeld)],
        ['Total Retention Owed:', this.formatCurrency(data.totalRetentionOwed)],
      ], true);

      // Monthly projections table
      doc.addPage();
      this.addSectionTitle(doc, 'Monthly Cash Flow Projections');
      doc.moveDown(0.5);

      const headers = ['Month', 'Inflows', 'Outflows', 'Net Flow', 'Cumulative'];
      const columnWidths = [100, 100, 100, 100, 100];

      this.addTableHeader(doc, headers, columnWidths);

      let currentY = doc.y;
      data.monthlyProjections.forEach((proj, index) => {
        if (currentY > 700) {
          doc.addPage();
          this.addTableHeader(doc, headers, columnWidths);
          currentY = doc.y;
        }

        const rowData = [
          this.formatDate(proj.month),
          this.formatCurrency(proj.projectedInflows),
          this.formatCurrency(proj.projectedOutflows),
          this.formatCurrency(proj.netCashFlow),
          this.formatCurrency(proj.cumulativeCash),
        ];

        this.addTableRow(doc, rowData, columnWidths, index);
        currentY = doc.y;
      });

      this.addFooter(doc);
      doc.end();
    });
  }

  /**
   * Export Invoice Register Report to PDF
   */
  async exportInvoiceRegisterToPdf(data: InvoiceRegisterReportDto): Promise<Buffer> {
    this.logger.log(`Generating Invoice Register Report PDF for project ${data.projectId}`);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50, layout: 'landscape' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Title
      this.addReportTitle(doc, 'Invoice Register Report');

      // Header section
      this.addKeyValueSection(doc, [
        ['Project:', data.projectName],
        ['As Of:', this.formatDate(data.asOfDate)],
        ['Generated:', this.formatDateTime(data.generatedAt)],
      ]);

      // Summary section
      doc.moveDown(0.5);
      this.addSectionTitle(doc, 'Summary');
      this.addKeyValueSection(doc, [
        ['Total Invoices:', data.totalInvoices.toString()],
        ['Total Invoice Amount:', this.formatCurrency(data.totalInvoiceAmount)],
        ['Total Paid Amount:', this.formatCurrency(data.totalPaidAmount)],
        ['Total Outstanding:', this.formatCurrency(data.totalOutstandingAmount)],
        ['Total Retention Held:', this.formatCurrency(data.totalRetentionHeld)],
        ['Aging - Current (0-30):', this.formatCurrency(data.agingCurrent)],
        ['Aging - 31-60 Days:', this.formatCurrency(data.aging31To60)],
        ['Aging - 61-90 Days:', this.formatCurrency(data.aging61To90)],
        ['Aging - 90+ Days:', this.formatCurrency(data.aging90Plus)],
      ], true);

      // Invoices table
      doc.addPage({ layout: 'landscape' });
      this.addSectionTitle(doc, 'Invoice Detail');
      doc.moveDown(0.5);

      const headers = [
        'Invoice #',
        'Type',
        'Date',
        'Due Date',
        'Vendor/Customer',
        'Amount',
        'Retention',
        'Paid',
        'Status',
        'Days',
        'Aging',
      ];

      const columnWidths = [60, 45, 60, 60, 90, 60, 55, 60, 60, 35, 50];

      this.addTableHeader(doc, headers, columnWidths);

      let currentY = doc.y;
      data.invoices.forEach((invoice, index) => {
        if (currentY > 520) {
          doc.addPage({ layout: 'landscape' });
          this.addTableHeader(doc, headers, columnWidths);
          currentY = doc.y;
        }

        const rowData = [
          invoice.invoiceNumber,
          invoice.invoiceType,
          this.formatDate(invoice.invoiceDate),
          this.formatDate(invoice.dueDate),
          invoice.vendorOrCustomerName,
          this.formatCurrency(invoice.amount),
          this.formatCurrency(invoice.retentionHeld),
          this.formatCurrency(invoice.amountPaid),
          invoice.status,
          invoice.daysOutstanding.toString(),
          invoice.agingBucket,
        ];

        this.addTableRow(doc, rowData, columnWidths, index);
        currentY = doc.y;
      });

      this.addFooter(doc);
      doc.end();
    });
  }

  /**
   * Export Executive Summary Report to PDF
   */
  async exportExecutiveSummaryToPdf(data: ExecutiveSummaryReportDto): Promise<Buffer> {
    this.logger.log(`Generating Executive Summary Report PDF for project ${data.projectId}`);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Title
      this.addReportTitle(doc, 'Executive Summary Report');

      // Header section
      this.addKeyValueSection(doc, [
        ['Project:', data.projectName],
        ['Project Manager:', data.projectManager],
        ['As Of:', this.formatDate(data.asOfDate)],
        ['Generated:', this.formatDateTime(data.generatedAt)],
      ]);

      // Contract & Budget
      doc.moveDown(0.5);
      this.addSectionTitle(doc, 'Contract & Budget');
      this.addKeyValueSection(doc, [
        ['Contract Value:', this.formatCurrency(data.contractValue)],
        ['Original Budget:', this.formatCurrency(data.originalBudget)],
        ['Approved Change Orders:', this.formatCurrency(data.approvedChangeOrders)],
        ['Revised Budget:', this.formatCurrency(data.revisedBudget)],
      ], true);

      // Financial Performance
      doc.moveDown(0.5);
      this.addSectionTitle(doc, 'Financial Performance');
      this.addKeyValueSection(doc, [
        ['Committed Cost:', this.formatCurrency(data.committedCost)],
        ['Actual Cost:', this.formatCurrency(data.actualCost)],
        ['Projected Final Cost:', this.formatCurrency(data.projectedFinalCost)],
        ['Budget Variance:', this.formatCurrency(data.budgetVariance)],
        ['Budget Variance %:', this.formatPercent(data.budgetVariancePercent)],
        ['Projected Profit:', this.formatCurrency(data.projectedProfit)],
        ['Projected Profit Margin:', this.formatPercent(data.projectedProfitMargin)],
      ], true);

      // Schedule & EVM
      doc.moveDown(0.5);
      this.addSectionTitle(doc, 'Schedule & Performance Indices');
      this.addKeyValueSection(doc, [
        ['Percent Complete:', this.formatPercent(data.percentComplete)],
        ['Scheduled % Complete:', this.formatPercent(data.scheduledPercentComplete)],
        ['Schedule Variance (Days):', data.scheduleVarianceDays.toString()],
        ['Cost Performance Index:', data.cpi.toFixed(3)],
        ['Schedule Performance Index:', data.spi.toFixed(3)],
      ], true);

      // Risk Indicators
      doc.moveDown(0.5);
      this.addSectionTitle(doc, 'Risk Indicators');
      this.addKeyValueSection(doc, [
        ['Cost Codes Over Budget:', data.overBudgetLineItemsCount.toString()],
        ['Delayed Commitments:', data.delayedCommitmentsCount.toString()],
        ['Overdue Invoices:', data.overdueInvoicesCount.toString()],
        ['Overdue Amount:', this.formatCurrency(data.overdueInvoicesAmount)],
      ], true);

      // Top Issues
      if (data.topCostOverruns.length > 0) {
        doc.addPage();
        this.addSectionTitle(doc, 'Top Cost Overruns');
        doc.moveDown(0.5);

        const overrunHeaders = ['Description', 'Variance', 'Percent', 'Status'];
        const overrunWidths = [250, 80, 80, 80];

        this.addTableHeader(doc, overrunHeaders, overrunWidths);

        let currentY = doc.y;
        data.topCostOverruns.forEach((issue, index) => {
          const rowData = [
            issue.description,
            this.formatCurrency(issue.value),
            this.formatPercent(issue.daysOrPercent),
            issue.status,
          ];
          this.addTableRow(doc, rowData, overrunWidths, index);
          currentY = doc.y;
        });
      }

      this.addFooter(doc);
      doc.end();
    });
  }

  // =============================================================================
  // PHASE 3 REPORTS
  // =============================================================================

  /**
   * Export Budget Variance Report to PDF
   */
  async exportBudgetVarianceToPdf(data: BudgetVarianceReportDto): Promise<Buffer> {
    this.logger.log(`Generating Budget Variance Report PDF for project ${data.projectId}`);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Title
      this.addReportTitle(doc, 'Budget Variance Report');

      // Header section
      this.addKeyValueSection(doc, [
        ['Project:', data.projectName],
        ['Budget:', data.budgetName],
        ['As Of:', this.formatDate(data.asOfDate)],
        ['Variance Threshold:', `${data.varianceThreshold}%`],
        ['Generated:', this.formatDateTime(data.generatedAt)],
      ]);

      // Summary section
      doc.moveDown(0.5);
      this.addSectionTitle(doc, 'Variance Summary');
      this.addKeyValueSection(doc, [
        ['Total Budgeted Cost:', this.formatCurrency(data.totalBudgetedCost)],
        ['Total Actual Cost:', this.formatCurrency(data.totalActualCost)],
        ['Total Variance:', this.formatCurrency(data.totalVariance)],
        ['Total Variance %:', this.formatPercent(data.totalVariancePercent)],
        ['Total % Spent:', this.formatPercent(data.totalPercentSpent)],
        ['Total Remaining:', this.formatCurrency(data.totalRemainingBudget)],
        ['Over Budget Count:', data.overBudgetCount.toString()],
        ['Under Budget Count:', data.underBudgetCount.toString()],
        ['On Target Count:', data.onTargetCount.toString()],
        ['Flagged Count:', data.flaggedCount.toString()],
      ], true);

      // Line items table
      doc.addPage();
      this.addSectionTitle(doc, 'Variance Detail by Cost Code');
      doc.moveDown(0.5);

      const headers = [
        'Cost Code',
        'Description',
        'Budgeted',
        'Actual',
        'Variance',
        'Var %',
        '% Spent',
        'Remaining',
        'Status',
      ];

      const columnWidths = [60, 110, 55, 55, 55, 45, 45, 55, 50];

      this.addTableHeader(doc, headers, columnWidths);

      let currentY = doc.y;
      data.lines.forEach((line, index) => {
        if (currentY > 700) {
          doc.addPage();
          this.addTableHeader(doc, headers, columnWidths);
          currentY = doc.y;
        }

        const rowData = [
          line.costCode,
          line.description,
          this.formatCurrency(line.budgetedCost),
          this.formatCurrency(line.actualCost),
          this.formatCurrency(line.variance),
          this.formatPercent(line.variancePercent),
          this.formatPercent(line.percentSpent),
          this.formatCurrency(line.remainingBudget),
          line.varianceStatus,
        ];

        this.addTableRow(doc, rowData, columnWidths, index);
        currentY = doc.y;
      });

      // Totals row
      this.addTotalsRow(doc, [
        'TOTAL',
        '',
        this.formatCurrency(data.totalBudgetedCost),
        this.formatCurrency(data.totalActualCost),
        this.formatCurrency(data.totalVariance),
        this.formatPercent(data.totalVariancePercent),
        this.formatPercent(data.totalPercentSpent),
        this.formatCurrency(data.totalRemainingBudget),
        '',
      ], columnWidths);

      this.addFooter(doc);
      doc.end();
    });
  }

  /**
   * Export Commitment Status Report to PDF
   */
  async exportCommitmentStatusToPdf(data: CommitmentStatusReportDto): Promise<Buffer> {
    this.logger.log(`Generating Commitment Status Report PDF for project ${data.projectId}`);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50, layout: 'landscape' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Title
      this.addReportTitle(doc, 'Commitment Status Report');

      // Header section
      this.addKeyValueSection(doc, [
        ['Project:', data.projectName],
        ['As Of:', this.formatDate(data.asOfDate)],
        ['Generated:', this.formatDateTime(data.generatedAt)],
      ]);

      // Summary section
      doc.moveDown(0.5);
      this.addSectionTitle(doc, 'Summary');
      this.addKeyValueSection(doc, [
        ['Total Commitments:', data.commitmentCount.toString()],
        ['Total Original Amount:', this.formatCurrency(data.totalOriginalAmount)],
        ['Total Change Orders:', this.formatCurrency(data.totalChangeOrders)],
        ['Total Revised Amount:', this.formatCurrency(data.totalRevisedAmount)],
        ['Total Invoiced:', this.formatCurrency(data.totalInvoicedAmount)],
        ['Total Paid:', this.formatCurrency(data.totalPaidAmount)],
        ['Total Retention Held:', this.formatCurrency(data.totalRetentionHeld)],
        ['Total Remaining Balance:', this.formatCurrency(data.totalRemainingBalance)],
        ['Overall % Complete:', this.formatPercent(data.overallPercentComplete)],
      ], true);

      // Commitments table
      doc.addPage({ layout: 'landscape' });
      this.addSectionTitle(doc, 'Commitment Detail');
      doc.moveDown(0.5);

      const headers = [
        'Number',
        'Type',
        'Vendor',
        'Status',
        'Original',
        'COs',
        'Revised',
        'Invoiced',
        'Paid',
        'Retention',
        'Remaining',
        '% Done',
      ];

      const columnWidths = [55, 50, 90, 55, 55, 50, 55, 55, 55, 55, 55, 45];

      this.addTableHeader(doc, headers, columnWidths);

      let currentY = doc.y;
      data.lines.forEach((line, index) => {
        if (currentY > 520) {
          doc.addPage({ layout: 'landscape' });
          this.addTableHeader(doc, headers, columnWidths);
          currentY = doc.y;
        }

        const rowData = [
          line.commitmentNumber,
          line.type,
          line.vendorName,
          line.status,
          this.formatCurrency(line.originalAmount),
          this.formatCurrency(line.changeOrders),
          this.formatCurrency(line.revisedAmount),
          this.formatCurrency(line.invoicedAmount),
          this.formatCurrency(line.paidAmount),
          this.formatCurrency(line.retentionHeld),
          this.formatCurrency(line.remainingBalance),
          this.formatPercent(line.percentComplete),
        ];

        this.addTableRow(doc, rowData, columnWidths, index);
        currentY = doc.y;
      });

      // Totals row
      this.addTotalsRow(doc, [
        'TOTAL',
        '',
        '',
        '',
        this.formatCurrency(data.totalOriginalAmount),
        this.formatCurrency(data.totalChangeOrders),
        this.formatCurrency(data.totalRevisedAmount),
        this.formatCurrency(data.totalInvoicedAmount),
        this.formatCurrency(data.totalPaidAmount),
        this.formatCurrency(data.totalRetentionHeld),
        this.formatCurrency(data.totalRemainingBalance),
        this.formatPercent(data.overallPercentComplete),
      ], columnWidths);

      this.addFooter(doc);
      doc.end();
    });
  }

  /**
   * Export Payment History Report to PDF
   */
  async exportPaymentHistoryToPdf(data: PaymentHistoryReportDto): Promise<Buffer> {
    this.logger.log(`Generating Payment History Report PDF for project ${data.projectId}`);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50, layout: 'landscape' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Title
      this.addReportTitle(doc, 'Payment History Report');

      // Header section
      this.addKeyValueSection(doc, [
        ['Project:', data.projectName],
        ['Generated:', this.formatDateTime(data.generatedAt)],
      ]);

      // Summary section
      doc.moveDown(0.5);
      this.addSectionTitle(doc, 'Summary');
      this.addKeyValueSection(doc, [
        ['Total Payment Applications:', data.paymentApplicationCount.toString()],
        ['Approved Count:', data.approvedCount.toString()],
        ['Paid Count:', data.paidCount.toString()],
        ['Total Completed & Stored:', this.formatCurrency(data.totalCompletedAndStored)],
        ['Total Retainage:', this.formatCurrency(data.totalRetainageAmount)],
        ['Total Earned Less Retainage:', this.formatCurrency(data.totalEarnedLessRetainage)],
        ['Total Previous Payments:', this.formatCurrency(data.totalPreviousPayments)],
        ['Total Current Payment Due:', this.formatCurrency(data.totalCurrentPaymentDue)],
      ], true);

      // Payment applications table
      doc.addPage({ layout: 'landscape' });
      this.addSectionTitle(doc, 'Payment Application Detail');
      doc.moveDown(0.5);

      const headers = [
        'App #',
        'Date',
        'Vendor',
        'Commitment',
        'Completed',
        'Retainage',
        'Earned',
        'Previous',
        'Current Due',
        'Status',
      ];

      const columnWidths = [35, 60, 90, 70, 60, 55, 60, 60, 60, 55];

      this.addTableHeader(doc, headers, columnWidths);

      let currentY = doc.y;
      data.lines.forEach((line, index) => {
        if (currentY > 520) {
          doc.addPage({ layout: 'landscape' });
          this.addTableHeader(doc, headers, columnWidths);
          currentY = doc.y;
        }

        const rowData = [
          line.applicationNumber.toString(),
          this.formatDate(line.applicationDate),
          line.vendorName,
          line.commitmentNumber,
          this.formatCurrency(line.totalCompletedAndStored),
          this.formatCurrency(line.retainageAmount),
          this.formatCurrency(line.totalEarnedLessRetainage),
          this.formatCurrency(line.previousPayments),
          this.formatCurrency(line.currentPaymentDue),
          line.status,
        ];

        this.addTableRow(doc, rowData, columnWidths, index);
        currentY = doc.y;
      });

      // Totals row
      this.addTotalsRow(doc, [
        'TOTAL',
        '',
        '',
        '',
        this.formatCurrency(data.totalCompletedAndStored),
        this.formatCurrency(data.totalRetainageAmount),
        this.formatCurrency(data.totalEarnedLessRetainage),
        this.formatCurrency(data.totalPreviousPayments),
        this.formatCurrency(data.totalCurrentPaymentDue),
        '',
      ], columnWidths);

      this.addFooter(doc);
      doc.end();
    });
  }

  /**
   * Export Aging Report to PDF
   */
  async exportAgingToPdf(data: AgingReportDto): Promise<Buffer> {
    this.logger.log(`Generating Aging Report (${data.reportType}) PDF for project ${data.projectId}`);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50, layout: 'landscape' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Title
      const reportTypeName = data.reportType === 'AR' ? 'Accounts Receivable' : 'Accounts Payable';
      this.addReportTitle(doc, `Aging Report - ${reportTypeName}`);

      // Header section
      this.addKeyValueSection(doc, [
        ['Project:', data.projectName],
        ['Report Type:', reportTypeName],
        ['As Of:', this.formatDate(data.asOfDate)],
        ['Generated:', this.formatDateTime(data.generatedAt)],
      ]);

      // Summary section
      doc.moveDown(0.5);
      this.addSectionTitle(doc, 'Aging Summary');
      this.addKeyValueSection(doc, [
        ['Total Items:', data.itemCount.toString()],
        ['Overdue Items (31+):', data.overdueCount.toString()],
        ['Total Amount:', this.formatCurrency(data.totalAmount)],
        ['Total Paid:', this.formatCurrency(data.totalAmountPaid)],
        ['Total Balance Due:', this.formatCurrency(data.totalBalanceDue)],
        ['Current (0-30 days):', this.formatCurrency(data.totalCurrent)],
        ['31-60 Days:', this.formatCurrency(data.totalDays31to60)],
        ['61-90 Days:', this.formatCurrency(data.totalDays61to90)],
        ['90+ Days:', this.formatCurrency(data.totalDays90Plus)],
      ], true);

      // Aging detail table
      doc.addPage({ layout: 'landscape' });
      this.addSectionTitle(doc, 'Aging Detail');
      doc.moveDown(0.5);

      const headers = [
        'Ref #',
        'Party',
        'Date',
        'Days',
        'Total',
        'Paid',
        'Balance',
        '0-30',
        '31-60',
        '61-90',
        '90+',
        'Status',
      ];

      const columnWidths = [60, 85, 55, 35, 55, 50, 55, 50, 50, 50, 50, 50];

      this.addTableHeader(doc, headers, columnWidths);

      let currentY = doc.y;
      data.lines.forEach((line, index) => {
        if (currentY > 520) {
          doc.addPage({ layout: 'landscape' });
          this.addTableHeader(doc, headers, columnWidths);
          currentY = doc.y;
        }

        const rowData = [
          line.referenceNumber,
          line.partyName,
          this.formatDate(line.documentDate),
          line.daysOutstanding.toString(),
          this.formatCurrency(line.totalAmount),
          this.formatCurrency(line.amountPaid),
          this.formatCurrency(line.balanceDue),
          this.formatCurrency(line.current),
          this.formatCurrency(line.days31to60),
          this.formatCurrency(line.days61to90),
          this.formatCurrency(line.days90Plus),
          line.status,
        ];

        this.addTableRow(doc, rowData, columnWidths, index);
        currentY = doc.y;
      });

      // Totals row
      this.addTotalsRow(doc, [
        'TOTAL',
        '',
        '',
        '',
        this.formatCurrency(data.totalAmount),
        this.formatCurrency(data.totalAmountPaid),
        this.formatCurrency(data.totalBalanceDue),
        this.formatCurrency(data.totalCurrent),
        this.formatCurrency(data.totalDays31to60),
        this.formatCurrency(data.totalDays61to90),
        this.formatCurrency(data.totalDays90Plus),
        '',
      ], columnWidths);

      this.addFooter(doc);
      doc.end();
    });
  }

  /**
   * Export Change Order Log Report to PDF
   */
  async exportChangeOrderLogToPdf(data: ChangeOrderLogReportDto): Promise<Buffer> {
    this.logger.log(`Generating Change Order Log Report PDF for project ${data.projectId}`);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50, layout: 'landscape' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Title
      this.addReportTitle(doc, 'Change Order Log Report');

      // Header section
      this.addKeyValueSection(doc, [
        ['Project:', data.projectName],
        ['Type Filter:', data.typeFilter],
        ['Generated:', this.formatDateTime(data.generatedAt)],
      ]);

      // Summary section
      doc.moveDown(0.5);
      this.addSectionTitle(doc, 'Summary');
      this.addKeyValueSection(doc, [
        ['Total Count:', data.totalCount.toString()],
        ['PCO Count:', data.pcoCount.toString()],
        ['OCO Count:', data.ocoCount.toString()],
        ['CCO Count:', data.ccoCount.toString()],
        ['Total Amount:', this.formatCurrency(data.totalAmount)],
        ['Total Approved Amount:', this.formatCurrency(data.totalApprovedAmount)],
        ['Pending Count:', data.pendingCount.toString()],
        ['Approved Count:', data.approvedCount.toString()],
        ['Rejected Count:', data.rejectedCount.toString()],
      ], true);

      // Change order log table
      doc.addPage({ layout: 'landscape' });
      this.addSectionTitle(doc, 'Change Order Detail');
      doc.moveDown(0.5);

      const headers = [
        'Type',
        'Number',
        'Title',
        'Status',
        'Amount',
        'Approved Amt',
        'Created',
        'Submitted',
        'Approved/Rejected',
      ];

      const columnWidths = [40, 60, 120, 60, 65, 65, 60, 60, 75];

      this.addTableHeader(doc, headers, columnWidths);

      let currentY = doc.y;
      data.lines.forEach((line, index) => {
        if (currentY > 520) {
          doc.addPage({ layout: 'landscape' });
          this.addTableHeader(doc, headers, columnWidths);
          currentY = doc.y;
        }

        const finalDate = line.approvedAt || line.rejectedAt;

        const rowData = [
          line.type,
          line.number,
          line.title,
          line.status,
          this.formatCurrency(line.amount),
          line.approvedAmount ? this.formatCurrency(line.approvedAmount) : '-',
          this.formatDate(line.createdAt),
          line.submittedAt ? this.formatDate(line.submittedAt) : '-',
          finalDate ? this.formatDate(finalDate) : '-',
        ];

        this.addTableRow(doc, rowData, columnWidths, index);
        currentY = doc.y;
      });

      this.addFooter(doc);
      doc.end();
    });
  }

  /**
   * Export Change Order Summary Report to PDF
   */
  async exportChangeOrderSummaryToPdf(data: ChangeOrderSummaryReportDto): Promise<Buffer> {
    this.logger.log(`Generating Change Order Summary Report PDF for project ${data.projectId}`);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Title
      this.addReportTitle(doc, 'Change Order Summary Report');

      // Header section
      this.addKeyValueSection(doc, [
        ['Project:', data.projectName],
        ['As Of:', this.formatDate(data.asOfDate)],
        ['Generated:', this.formatDateTime(data.generatedAt)],
      ]);

      // Summary section
      doc.moveDown(0.5);
      this.addSectionTitle(doc, 'Overall Summary');
      this.addKeyValueSection(doc, [
        ['Total Change Orders:', data.totalChangeOrderCount.toString()],
        ['Total Amount:', this.formatCurrency(data.totalAmount)],
        ['Total Approved Amount:', this.formatCurrency(data.totalApprovedAmount)],
        ['Total Pending Amount:', this.formatCurrency(data.totalPendingAmount)],
        ['Total Rejected Amount:', this.formatCurrency(data.totalRejectedAmount)],
        ['Overall Approval Rate:', this.formatPercent(data.overallApprovalRate)],
      ], true);

      // Summary by Type table
      doc.addPage();
      this.addSectionTitle(doc, 'Summary by Type');
      doc.moveDown(0.5);

      const typeHeaders = [
        'Type',
        'Total',
        'Draft',
        'Pending',
        'Approved',
        'Rejected',
        'Amount',
        'Approved Amt',
        'Rate %',
      ];

      const typeWidths = [50, 50, 50, 50, 60, 55, 65, 65, 50];

      this.addTableHeader(doc, typeHeaders, typeWidths);

      let currentY = doc.y;
      data.byType.forEach((type, index) => {
        const rowData = [
          type.type,
          type.totalCount.toString(),
          type.draftCount.toString(),
          type.pendingCount.toString(),
          type.approvedCount.toString(),
          type.rejectedCount.toString(),
          this.formatCurrency(type.totalAmount),
          this.formatCurrency(type.approvedAmount),
          this.formatPercent(type.approvalRate),
        ];

        this.addTableRow(doc, rowData, typeWidths, index);
        currentY = doc.y;
      });

      // Summary by Status table
      doc.moveDown(1);
      this.addSectionTitle(doc, 'Summary by Status');
      doc.moveDown(0.5);

      const statusHeaders = ['Status', 'Count', 'Amount'];
      const statusWidths = [200, 100, 150];

      this.addTableHeader(doc, statusHeaders, statusWidths);

      currentY = doc.y;
      data.byStatus.forEach((status, index) => {
        const rowData = [
          status.status,
          status.count.toString(),
          this.formatCurrency(status.amount),
        ];

        this.addTableRow(doc, rowData, statusWidths, index);
        currentY = doc.y;
      });

      this.addFooter(doc);
      doc.end();
    });
  }

  /**
   * Export Subcontractor Summary Report to PDF
   */
  async exportSubcontractorSummaryToPdf(data: SubcontractorSummaryReportDto): Promise<Buffer> {
    this.logger.log(`Generating Subcontractor Summary Report PDF for project ${data.projectId}`);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50, layout: 'landscape' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Title
      this.addReportTitle(doc, 'Subcontractor Summary Report');

      // Header section
      this.addKeyValueSection(doc, [
        ['Project:', data.projectName],
        ['As Of:', this.formatDate(data.asOfDate)],
        ['Generated:', this.formatDateTime(data.generatedAt)],
      ]);

      // Summary section
      doc.moveDown(0.5);
      this.addSectionTitle(doc, 'Summary');
      this.addKeyValueSection(doc, [
        ['Total Vendors:', data.vendorCount.toString()],
        ['Total Original Contract Value:', this.formatCurrency(data.totalOriginalContractValue)],
        ['Total Change Orders:', this.formatCurrency(data.totalChangeOrders)],
        ['Total Revised Contract Value:', this.formatCurrency(data.totalRevisedContractValue)],
        ['Total Invoiced:', this.formatCurrency(data.totalInvoicedAmount)],
        ['Total Paid:', this.formatCurrency(data.totalPaidAmount)],
        ['Total Retention Held:', this.formatCurrency(data.totalRetentionHeld)],
        ['Total Outstanding Balance:', this.formatCurrency(data.totalOutstandingBalance)],
        ['Overall % Complete:', this.formatPercent(data.overallPercentComplete)],
      ], true);

      // Subcontractor detail table
      doc.addPage({ layout: 'landscape' });
      this.addSectionTitle(doc, 'Subcontractor Detail');
      doc.moveDown(0.5);

      const headers = [
        'Vendor',
        'Commits',
        'Original',
        'COs',
        'Revised',
        'Invoiced',
        'Paid',
        'Retention',
        'Outstanding',
        'Remaining',
        '% Done',
      ];

      const columnWidths = [100, 50, 55, 50, 55, 55, 55, 55, 60, 60, 50];

      this.addTableHeader(doc, headers, columnWidths);

      let currentY = doc.y;
      data.lines.forEach((line, index) => {
        if (currentY > 520) {
          doc.addPage({ layout: 'landscape' });
          this.addTableHeader(doc, headers, columnWidths);
          currentY = doc.y;
        }

        const rowData = [
          line.vendorName,
          line.commitmentCount.toString(),
          this.formatCurrency(line.originalContractValue),
          this.formatCurrency(line.changeOrders),
          this.formatCurrency(line.revisedContractValue),
          this.formatCurrency(line.invoicedAmount),
          this.formatCurrency(line.paidAmount),
          this.formatCurrency(line.retentionHeld),
          this.formatCurrency(line.outstandingBalance),
          this.formatCurrency(line.remainingContractBalance),
          this.formatPercent(line.percentComplete),
        ];

        this.addTableRow(doc, rowData, columnWidths, index);
        currentY = doc.y;
      });

      // Totals row
      this.addTotalsRow(doc, [
        'TOTAL',
        '',
        this.formatCurrency(data.totalOriginalContractValue),
        this.formatCurrency(data.totalChangeOrders),
        this.formatCurrency(data.totalRevisedContractValue),
        this.formatCurrency(data.totalInvoicedAmount),
        this.formatCurrency(data.totalPaidAmount),
        this.formatCurrency(data.totalRetentionHeld),
        this.formatCurrency(data.totalOutstandingBalance),
        this.formatCurrency(data.totalRemainingContractBalance),
        this.formatPercent(data.overallPercentComplete),
      ], columnWidths);

      this.addFooter(doc);
      doc.end();
    });
  }

  /**
   * Export Vendor Payments Report to PDF
   */
  async exportVendorPaymentsToPdf(data: VendorPaymentsReportDto): Promise<Buffer> {
    this.logger.log(`Generating Vendor Payments Report PDF for project ${data.projectId}`);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50, layout: 'landscape' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Title
      this.addReportTitle(doc, 'Vendor Payments Report');

      // Header section
      this.addKeyValueSection(doc, [
        ['Project:', data.projectName],
        ['Generated:', this.formatDateTime(data.generatedAt)],
      ]);

      // Summary section
      doc.moveDown(0.5);
      this.addSectionTitle(doc, 'Summary');
      this.addKeyValueSection(doc, [
        ['Total Vendors:', data.vendorCount.toString()],
        ['Total Payment Applications:', data.paymentApplicationCount.toString()],
        ['Total Amount Requested:', this.formatCurrency(data.totalAmountRequested)],
        ['Total Amount Paid:', this.formatCurrency(data.totalAmountPaid)],
        ['Total Retainage Held:', this.formatCurrency(data.totalRetainageHeld)],
        ['Total Outstanding:', this.formatCurrency(data.totalOutstanding)],
        ['Average Days to Payment:', data.averageDaysToPayment.toFixed(1)],
      ], true);

      // Vendor summary table
      doc.addPage({ layout: 'landscape' });
      this.addSectionTitle(doc, 'Summary by Vendor');
      doc.moveDown(0.5);

      const summaryHeaders = [
        'Vendor',
        'Payments',
        'Requested',
        'Paid',
        'Retainage',
        'Outstanding',
        'Avg Days',
      ];

      const summaryWidths = [150, 70, 90, 90, 80, 90, 70];

      this.addTableHeader(doc, summaryHeaders, summaryWidths);

      let currentY = doc.y;
      data.summaryByVendor.forEach((summary, index) => {
        if (currentY > 520) {
          doc.addPage({ layout: 'landscape' });
          this.addTableHeader(doc, summaryHeaders, summaryWidths);
          currentY = doc.y;
        }

        const rowData = [
          summary.vendorName,
          summary.paymentCount.toString(),
          this.formatCurrency(summary.totalAmountRequested),
          this.formatCurrency(summary.totalAmountPaid),
          this.formatCurrency(summary.totalRetainageHeld),
          this.formatCurrency(summary.totalOutstanding),
          summary.averageDaysToPayment.toFixed(1),
        ];

        this.addTableRow(doc, rowData, summaryWidths, index);
        currentY = doc.y;
      });

      // Detailed payments table
      doc.addPage({ layout: 'landscape' });
      this.addSectionTitle(doc, 'Payment Detail');
      doc.moveDown(0.5);

      const detailHeaders = [
        'Vendor',
        'Commitment',
        'App #',
        'App Date',
        'Amount',
        'Retainage',
        'Status',
        'Paid Date',
        'Days',
      ];

      const detailWidths = [90, 70, 40, 60, 65, 60, 60, 60, 40];

      this.addTableHeader(doc, detailHeaders, detailWidths);

      currentY = doc.y;
      data.lines.forEach((line, index) => {
        if (currentY > 520) {
          doc.addPage({ layout: 'landscape' });
          this.addTableHeader(doc, detailHeaders, detailWidths);
          currentY = doc.y;
        }

        const rowData = [
          line.vendorName,
          line.commitmentNumber,
          line.applicationNumber.toString(),
          this.formatDate(line.applicationDate),
          this.formatCurrency(line.currentPaymentDue),
          this.formatCurrency(line.retainageAmount),
          line.status,
          line.paidAt ? this.formatDate(line.paidAt) : '-',
          line.daysToPayment ? line.daysToPayment.toString() : '-',
        ];

        this.addTableRow(doc, rowData, detailWidths, index);
        currentY = doc.y;
      });

      this.addFooter(doc);
      doc.end();
    });
  }

  // =============================================================================
  // CUSTOM REPORTS
  // =============================================================================

  /**
   * Export Custom Report to PDF
   *
   * Dynamically generates a PDF based on the custom report configuration.
   * Supports variable columns, data types, totals, and subtotals.
   */
  async exportCustomReportToPdf(result: CustomReportResultDto): Promise<Buffer> {
    this.logger.log(`Exporting custom report '${result.reportInfo.reportName}' to PDF`);

    return new Promise((resolve, reject) => {
      // Determine page layout based on number of columns
      const isLandscape = result.columns.length > 5;
      const doc = new PDFDocument({
        size: 'LETTER',
        margin: 50,
        layout: isLandscape ? 'landscape' : 'portrait'
      });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Title
      this.addReportTitle(doc, result.reportInfo.reportName);

      // Header section
      const headerInfo: [string, string][] = [
        ['Generated:', new Date(result.reportInfo.generatedAt).toLocaleString()],
        ['Rows:', result.reportInfo.rowCount.toString()],
        ['Execution Time:', `${result.reportInfo.executionTimeMs}ms`],
      ];

      // Add filter summary if present
      const reportInfoWithFilters = result.reportInfo as any;
      if (reportInfoWithFilters.filters && Object.keys(reportInfoWithFilters.filters).length > 0) {
        headerInfo.push(['Filters:', JSON.stringify(reportInfoWithFilters.filters)]);
      }

      this.addKeyValueSection(doc, headerInfo);

      // Data table
      doc.moveDown(1);
      this.addSectionTitle(doc, 'Report Data');
      doc.moveDown(0.5);

      // Calculate column widths dynamically
      const pageWidth = isLandscape ? 792 - 100 : 612 - 100; // US Letter dimensions minus margins
      const columnCount = result.columns.length;
      const baseWidth = pageWidth / columnCount;
      const columnWidths = result.columns.map(() => Math.floor(baseWidth));

      // Build table headers
      const headers = result.columns.map((col) => col.label);
      this.addTableHeader(doc, headers, columnWidths);

      // Add data rows
      let currentY = doc.y;
      const pageBreakY = isLandscape ? 520 : 700;

      result.data.forEach((row, index) => {
        // Check for page break
        if (currentY > pageBreakY) {
          doc.addPage({ layout: isLandscape ? 'landscape' : 'portrait' });
          this.addTableHeader(doc, headers, columnWidths);
          currentY = doc.y;
        }

        // Format row data based on column data types
        const rowData = result.columns.map((col) => {
          const fieldKey = col.field.replace('.', '_');
          const value = row[fieldKey];

          if (value === null || value === undefined) {
            return '-';
          }

          switch (col.dataType) {
            case 'CURRENCY':
              return this.formatCurrency(typeof value === 'number' ? value : parseFloat(value) || 0);
            case 'NUMBER':
              const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;
              return numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            case 'PERCENT':
              const pctValue = typeof value === 'number' ? value : parseFloat(value) || 0;
              return this.formatPercent(pctValue);
            case 'DATE':
              return this.formatDate(value);
            default:
              return String(value);
          }
        });

        this.addTableRow(doc, rowData, columnWidths, index);
        currentY = doc.y;
      });

      // Add totals row if present
      if (result.totals && Object.keys(result.totals).length > 0) {
        const totalsRow = result.columns.map((col) => {
          const fieldKey = col.field.replace('.', '_');
          const alias = `sum_${fieldKey}`;

          if (result.totals?.[alias] !== undefined) {
            const value = result.totals[alias];

            switch (col.dataType) {
              case 'CURRENCY':
                return this.formatCurrency(value);
              case 'NUMBER':
                return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              case 'PERCENT':
                return this.formatPercent(value);
              default:
                return String(value);
            }
          }

          return '';
        });

        this.addTotalsRow(doc, totalsRow, columnWidths);
      }

      // Add subtotals on a new page if present
      if (result.subtotals && result.subtotals.length > 0) {
        doc.addPage({ layout: isLandscape ? 'landscape' : 'portrait' });
        this.addSectionTitle(doc, 'Subtotals by Group');
        doc.moveDown(0.5);

        // Build subtotals table headers
        const subtotalHeaders = ['Group', ...Object.keys(result.subtotals[0].totals)];
        const subtotalColumnCount = subtotalHeaders.length;
        const subtotalBaseWidth = pageWidth / subtotalColumnCount;
        const subtotalWidths = subtotalHeaders.map(() => Math.floor(subtotalBaseWidth));

        this.addTableHeader(doc, subtotalHeaders, subtotalWidths);

        currentY = doc.y;
        result.subtotals.forEach((subtotal, index) => {
          // Check for page break
          if (currentY > pageBreakY) {
            doc.addPage({ layout: isLandscape ? 'landscape' : 'portrait' });
            this.addTableHeader(doc, subtotalHeaders, subtotalWidths);
            currentY = doc.y;
          }

          // Format group value as string
          const groupValueStr = Object.values(subtotal.groupValue).join(' - ');

          // Format subtotal values
          const subtotalValues = Object.values(subtotal.totals).map((value) => {
            if (typeof value === 'number') {
              // Determine if it's currency based on magnitude (simple heuristic)
              if (value > 100 || value < -100) {
                return this.formatCurrency(value);
              }
              return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }
            return String(value);
          });

          const rowData = [groupValueStr, ...subtotalValues];
          this.addTableRow(doc, rowData, subtotalWidths, index);
          currentY = doc.y;
        });
      }

      this.addFooter(doc);
      doc.end();
    });
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  /**
   * Add report title
   */
  private addReportTitle(doc: PDFKit.PDFDocument, title: string): void {
    doc
      .fontSize(20)
      .font(this.FONTS.bold)
      .fillColor(this.COLORS.primary)
      .text(title, { align: 'center' });
    doc.moveDown(1.5);
    doc.fillColor(this.COLORS.text); // Reset color
  }

  /**
   * Add section title
   */
  private addSectionTitle(doc: PDFKit.PDFDocument, title: string): void {
    doc
      .fontSize(14)
      .font(this.FONTS.bold)
      .fillColor(this.COLORS.secondary)
      .text(title);
    doc.moveDown(0.5);
    doc.fillColor(this.COLORS.text); // Reset color
  }

  /**
   * Add key-value section
   */
  private addKeyValueSection(
    doc: PDFKit.PDFDocument,
    items: [string, string][],
    highlighted: boolean = false,
  ): void {
    const startY = doc.y;
    const leftX = 50;
    const rightX = 300;

    doc.fontSize(10).font(this.FONTS.regular);

    items.forEach(([key, value], index) => {
      const y = startY + (index * 18);

      // Draw background for highlighted section
      if (highlighted) {
        doc
          .rect(leftX - 5, y - 2, 500, 16)
          .fill(this.COLORS.light);
        doc.fillColor(this.COLORS.text); // Reset
      }

      // Key
      doc.font(this.FONTS.bold).text(key, leftX, y, { continued: false });

      // Value
      doc.font(this.FONTS.regular).text(value, rightX, y);
    });

    doc.y = startY + (items.length * 18);
    doc.moveDown(0.5);
  }

  /**
   * Add table header
   */
  private addTableHeader(
    doc: PDFKit.PDFDocument,
    headers: string[],
    columnWidths: number[],
  ): void {
    const startX = 50;
    const startY = doc.y;
    let currentX = startX;

    // Background
    const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0);
    doc
      .rect(startX, startY, totalWidth, 20)
      .fill(this.COLORS.primary);

    // Headers
    doc.fontSize(9).font(this.FONTS.bold).fillColor('#FFFFFF');
    headers.forEach((header, index) => {
      doc.text(
        header,
        currentX + 2,
        startY + 5,
        {
          width: columnWidths[index] - 4,
          align: index === 0 || index === 1 ? 'left' : 'right',
        }
      );
      currentX += columnWidths[index];
    });

    doc.fillColor(this.COLORS.text); // Reset
    doc.y = startY + 22;
  }

  /**
   * Add table row
   */
  private addTableRow(
    doc: PDFKit.PDFDocument,
    rowData: string[],
    columnWidths: number[],
    rowIndex: number,
  ): void {
    const startX = 50;
    const startY = doc.y;
    let currentX = startX;
    const rowHeight = 16;

    // Alternating background
    if (rowIndex % 2 === 0) {
      const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0);
      doc
        .rect(startX, startY, totalWidth, rowHeight)
        .fill(this.COLORS.light);
      doc.fillColor(this.COLORS.text);
    }

    // Row data
    doc.fontSize(8).font(this.FONTS.regular);
    rowData.forEach((cell, index) => {
      doc.text(
        cell,
        currentX + 2,
        startY + 3,
        {
          width: columnWidths[index] - 4,
          align: index === 0 || index === 1 ? 'left' : 'right',
          lineBreak: false,
        }
      );
      currentX += columnWidths[index];
    });

    doc.y = startY + rowHeight;
  }

  /**
   * Add totals row
   */
  private addTotalsRow(
    doc: PDFKit.PDFDocument,
    rowData: string[],
    columnWidths: number[],
  ): void {
    const startX = 50;
    const startY = doc.y + 5;
    let currentX = startX;
    const rowHeight = 20;

    // Background
    const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0);
    doc
      .rect(startX, startY, totalWidth, rowHeight)
      .fill(this.COLORS.accent);

    // Top border
    doc
      .moveTo(startX, startY)
      .lineTo(startX + totalWidth, startY)
      .stroke(this.COLORS.text);

    // Totals data
    doc.fontSize(9).font(this.FONTS.bold).fillColor(this.COLORS.text);
    rowData.forEach((cell, index) => {
      doc.text(
        cell,
        currentX + 2,
        startY + 5,
        {
          width: columnWidths[index] - 4,
          align: index === 0 || index === 1 ? 'left' : 'right',
        }
      );
      currentX += columnWidths[index];
    });

    doc.y = startY + rowHeight + 5;
  }

  /**
   * Add footer to page
   */
  private addFooter(doc: PDFKit.PDFDocument): void {
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc
        .fontSize(8)
        .font(this.FONTS.italic)
        .fillColor(this.COLORS.textLight)
        .text(
          `Page ${i + 1} of ${pages.count} | Generated: ${new Date().toLocaleString()}`,
          50,
          doc.page.height - 30,
          { align: 'center' }
        );
    }
  }

  /**
   * Format number as currency
   */
  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  /**
   * Format number as percentage
   */
  private formatPercent(value: number): string {
    return (value / 100).toLocaleString('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  /**
   * Format date
   */
  private formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Format date and time
   */
  private formatDateTime(date: Date | string): string {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
