import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import {
  BudgetDetailReportDto,
  BudgetDetailLineDto,
  WIPReportDto,
  WIPLineDto,
  CostToCompleteReportDto,
  CostToCompleteLineDto,
  CommitmentListReportDto,
  CommitmentLineDto,
  EarnedValueAnalysisReportDto,
  EarnedValueAnalysisLineDto,
  CashFlowProjectionReportDto,
  CashFlowMonthlyProjectionDto,
  InvoiceRegisterReportDto,
  InvoiceRegisterLineDto,
  ExecutiveSummaryReportDto,
  BudgetVarianceReportDto,
  BudgetVarianceLineDto,
  CommitmentStatusReportDto,
  CommitmentStatusLineDto,
  PaymentHistoryReportDto,
  PaymentHistoryLineDto,
  AgingReportDto,
  AgingReportLineDto,
  ChangeOrderLogReportDto,
  ChangeOrderLogLineDto,
  ChangeOrderSummaryReportDto,
  ChangeOrderTypeSummaryDto,
  ChangeOrderStatusSummaryDto,
  SubcontractorSummaryReportDto,
  SubcontractorSummaryLineDto,
  VendorPaymentsReportDto,
  VendorPaymentsLineDto,
  VendorPaymentsSummaryDto,
} from '../dto/report';
import { CustomReportResultDto } from '../dto/custom-report';

/**
 * Report Excel Export Service
 *
 * Handles Excel export for all financial reports using exceljs.
 * Provides professional formatting with currency, percentage, and date formatting.
 */
@Injectable()
export class ReportExcelExportService {
  private readonly logger = new Logger(ReportExcelExportService.name);

  /**
   * Export Budget Detail Report to Excel
   */
  async exportBudgetDetailToExcel(data: BudgetDetailReportDto): Promise<Buffer> {
    this.logger.log(`Generating Budget Detail Report Excel for project ${data.projectId}`);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Budget Detail');

    // Add header section
    this.addReportHeader(worksheet, [
      ['Budget Detail Report', ''],
      ['Project:', data.projectName],
      ['Budget:', data.budgetName],
      ['As Of Date:', this.formatDate(data.asOfDate)],
      ['Generated:', this.formatDate(data.generatedAt)],
      ['', ''], // Blank row
    ]);

    // Define column headers
    const headers = [
      'Cost Code',
      'Description',
      'Original Budget',
      'Change Orders',
      'Revised Budget',
      'Committed Cost',
      'Actual Cost',
      'Variance',
      '% Complete',
      'Cost to Complete',
      'Projected Final',
      'Projected Variance',
    ];

    // Add column headers
    const headerRow = worksheet.addRow(headers);
    this.styleHeaderRow(headerRow);

    // Add data rows
    data.lines.forEach((line: BudgetDetailLineDto, index: number) => {
      const row = worksheet.addRow([
        line.costCode,
        line.description,
        line.originalBudget,
        line.changeOrders,
        line.revisedBudget,
        line.committedCost,
        line.actualCost,
        line.variance,
        line.percentComplete / 100, // Convert to decimal for percentage formatting
        line.costToComplete,
        line.projectedFinalCost,
        line.projectedVariance,
      ]);

      // Apply formatting
      this.formatCurrency(row, [3, 4, 5, 6, 7, 8, 10, 11, 12]); // Currency columns
      this.formatPercent(row, [9]); // Percentage columns
      this.styleDataRow(row, index);
    });

    // Add total row
    const totalRow = worksheet.addRow([
      '',
      'TOTAL',
      data.totalOriginalBudget,
      data.totalChangeOrders,
      data.totalRevisedBudget,
      data.totalCommittedCost,
      data.totalActualCost,
      data.totalVariance,
      data.totalPercentComplete / 100,
      data.totalCostToComplete,
      data.totalProjectedFinalCost,
      data.totalProjectedVariance,
    ]);

    this.formatCurrency(totalRow, [3, 4, 5, 6, 7, 8, 10, 11, 12]);
    this.formatPercent(totalRow, [9]);
    this.styleTotalRow(totalRow);

    // Auto-size columns
    this.autoSizeColumns(worksheet);

    // Generate buffer
    return await workbook.xlsx.writeBuffer() as unknown as Buffer;
  }

  /**
   * Export WIP Report to Excel
   */
  async exportWIPToExcel(data: WIPReportDto): Promise<Buffer> {
    this.logger.log(`Generating WIP Report Excel for project ${data.projectId}`);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('WIP Report');

    // Add header section
    this.addReportHeader(worksheet, [
      ['Work In Progress (WIP) Report', ''],
      ['Project:', data.projectName],
      ['As Of Date:', this.formatDate(data.asOfDate)],
      ['Generated:', this.formatDate(data.generatedAt)],
      ['', ''], // Blank row
    ]);

    // Define column headers
    const headers = [
      'Cost Code',
      'Description',
      'Contract Value',
      'Revised Budget',
      'Actual Cost',
      '% Complete',
      'Earned Revenue',
      'Billed to Date',
      'Under/(Over) Billing',
    ];

    // Add column headers
    const headerRow = worksheet.addRow(headers);
    this.styleHeaderRow(headerRow);

    // Add data rows
    data.lines.forEach((line: WIPLineDto, index: number) => {
      const row = worksheet.addRow([
        line.costCode,
        line.description,
        line.contractValue,
        line.revisedBudget,
        line.actualCost,
        line.percentComplete / 100,
        line.earnedRevenue,
        line.billedToDate,
        line.underOverBilling,
      ]);

      this.formatCurrency(row, [3, 4, 5, 7, 8, 9]);
      this.formatPercent(row, [6]);
      this.styleDataRow(row, index);
    });

    // Add total row
    const totalRow = worksheet.addRow([
      '',
      'TOTAL',
      data.totalContractValue,
      data.totalRevisedBudget,
      data.totalActualCost,
      data.totalPercentComplete / 100,
      data.totalEarnedRevenue,
      data.totalBilledToDate,
      data.totalUnderOverBilling,
    ]);

    this.formatCurrency(totalRow, [3, 4, 5, 7, 8, 9]);
    this.formatPercent(totalRow, [6]);
    this.styleTotalRow(totalRow);

    // Add summary section
    worksheet.addRow([]);
    const summaryLabel = worksheet.addRow(['', 'Summary']);
    summaryLabel.font = { bold: true, size: 12 };

    const profitRow = worksheet.addRow(['', 'Estimated Profit:', data.estimatedProfit]);
    this.formatCurrency(profitRow, [3]);

    const marginRow = worksheet.addRow(['', 'Estimated Profit Margin:', data.estimatedProfitMargin / 100]);
    this.formatPercent(marginRow, [3]);

    // Auto-size columns
    this.autoSizeColumns(worksheet);

    return await workbook.xlsx.writeBuffer() as unknown as Buffer;
  }

  /**
   * Export Cost to Complete Report to Excel
   */
  async exportCostToCompleteToExcel(data: CostToCompleteReportDto): Promise<Buffer> {
    this.logger.log(`Generating Cost to Complete Report Excel for project ${data.projectId}`);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Cost to Complete');

    // Add header section
    this.addReportHeader(worksheet, [
      ['Cost to Complete Report', ''],
      ['Project:', data.projectName],
      ['Budget:', data.budgetName],
      ['As Of Date:', this.formatDate(data.asOfDate)],
      ['Generated:', this.formatDate(data.generatedAt)],
      ['', ''], // Blank row
    ]);

    // Define column headers
    const headers = [
      'Cost Code',
      'Description',
      'Revised Budget',
      'Actual Cost',
      '% Complete',
      'Earned Value',
      'CPI',
      'ETC',
      'EAC',
      'VAC',
      'TCPI',
    ];

    // Add column headers
    const headerRow = worksheet.addRow(headers);
    this.styleHeaderRow(headerRow);

    // Add data rows
    data.lines.forEach((line: CostToCompleteLineDto, index: number) => {
      const row = worksheet.addRow([
        line.costCode,
        line.description,
        line.revisedBudget,
        line.actualCost,
        line.percentComplete / 100,
        line.earnedValue,
        line.cpi,
        line.etc,
        line.eac,
        line.vac,
        line.tcpi,
      ]);

      this.formatCurrency(row, [3, 4, 6, 8, 9, 10]);
      this.formatPercent(row, [5]);
      this.formatDecimal(row, [7, 11]); // CPI and TCPI as decimals
      this.styleDataRow(row, index);
    });

    // Add total row
    const totalRow = worksheet.addRow([
      '',
      'TOTAL',
      data.totalRevisedBudget,
      data.totalActualCost,
      data.totalPercentComplete / 100,
      data.totalEarnedValue,
      data.overallCPI,
      data.totalETC,
      data.totalEAC,
      data.totalVAC,
      data.overallTCPI,
    ]);

    this.formatCurrency(totalRow, [3, 4, 6, 8, 9, 10]);
    this.formatPercent(totalRow, [5]);
    this.formatDecimal(totalRow, [7, 11]);
    this.styleTotalRow(totalRow);

    // Auto-size columns
    this.autoSizeColumns(worksheet);

    return await workbook.xlsx.writeBuffer() as unknown as Buffer;
  }

  /**
   * Export Commitment List Report to Excel
   */
  async exportCommitmentListToExcel(data: CommitmentListReportDto): Promise<Buffer> {
    this.logger.log(`Generating Commitment List Report Excel for project ${data.projectId}`);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Commitment List');

    // Add header section
    const headerData: any[][] = [
      ['Commitment List Report', ''],
      ['Project:', data.projectName],
      ['As Of Date:', this.formatDate(data.asOfDate)],
    ];

    if (data.filterType) {
      headerData.push(['Filter - Type:', data.filterType]);
    }
    if (data.filterStatus) {
      headerData.push(['Filter - Status:', data.filterStatus]);
    }

    headerData.push(['Generated:', this.formatDate(data.generatedAt)]);
    headerData.push(['', '']); // Blank row

    this.addReportHeader(worksheet, headerData);

    // Define column headers
    const headers = [
      'Commitment #',
      'Type',
      'Vendor',
      'Cost Code',
      'Description',
      'Original Amount',
      'Change Orders',
      'Revised Amount',
      'Invoiced',
      'Paid',
      'Retention',
      'Remaining',
      'Status',
      'Start Date',
      'End Date',
    ];

    // Add column headers
    const headerRow = worksheet.addRow(headers);
    this.styleHeaderRow(headerRow);

    // Add data rows
    data.lines.forEach((line: CommitmentLineDto, index: number) => {
      const row = worksheet.addRow([
        line.commitmentNumber,
        line.type,
        line.vendorName,
        line.costCode,
        line.costCodeDescription,
        line.originalAmount,
        line.changeOrders,
        line.revisedAmount,
        line.invoicedToDate,
        line.paidToDate,
        line.retentionHeld,
        line.remainingBalance,
        line.status,
        line.startDate,
        line.endDate || '',
      ]);

      this.formatCurrency(row, [6, 7, 8, 9, 10, 11, 12]);
      this.formatDateCell(row, [14, 15]);
      this.styleDataRow(row, index);
    });

    // Add total row
    const totalRow = worksheet.addRow([
      '',
      '',
      '',
      '',
      'TOTAL',
      data.totalOriginalAmount,
      data.totalChangeOrders,
      data.totalRevisedAmount,
      data.totalInvoicedToDate,
      data.totalPaidToDate,
      data.totalRetentionHeld,
      data.totalRemainingBalance,
      '',
      '',
      '',
    ]);

    this.formatCurrency(totalRow, [6, 7, 8, 9, 10, 11, 12]);
    this.styleTotalRow(totalRow);

    // Auto-size columns
    this.autoSizeColumns(worksheet);

    return await workbook.xlsx.writeBuffer() as unknown as Buffer;
  }

  /**
   * Export Earned Value Analysis Report to Excel
   */
  async exportEarnedValueAnalysisToExcel(data: EarnedValueAnalysisReportDto): Promise<Buffer> {
    this.logger.log(`Generating Earned Value Analysis Report Excel for project ${data.projectId}`);

    const workbook = new ExcelJS.Workbook();
    const worksheetDetails = workbook.addWorksheet('EVM Details');
    const worksheetTrends = workbook.addWorksheet('Monthly Trends');

    // ========== Details Sheet ==========

    // Add header section
    this.addReportHeader(worksheetDetails, [
      ['Earned Value Analysis Report', ''],
      ['Project:', data.projectName],
      ['Budget:', data.budgetName],
      ['As Of Date:', this.formatDate(data.asOfDate)],
      ['Generated:', this.formatDate(data.generatedAt)],
      ['', ''],
    ]);

    // Add summary metrics
    const summaryLabel = worksheetDetails.addRow(['', 'PROJECT SUMMARY']);
    summaryLabel.font = { bold: true, size: 12 };

    worksheetDetails.addRow(['', 'BAC (Budget at Completion):', data.bac]);
    worksheetDetails.addRow(['', 'PV (Planned Value):', data.pv]);
    worksheetDetails.addRow(['', 'EV (Earned Value):', data.ev]);
    worksheetDetails.addRow(['', 'AC (Actual Cost):', data.ac]);
    worksheetDetails.addRow(['', 'CV (Cost Variance):', data.cv]);
    worksheetDetails.addRow(['', 'SV (Schedule Variance):', data.sv]);
    worksheetDetails.addRow(['', 'CPI (Cost Performance Index):', data.cpi]);
    worksheetDetails.addRow(['', 'SPI (Schedule Performance Index):', data.spi]);
    worksheetDetails.addRow(['', 'EAC (Estimate at Completion):', data.eac]);
    worksheetDetails.addRow(['', 'ETC (Estimate to Complete):', data.etc]);
    worksheetDetails.addRow(['', 'VAC (Variance at Completion):', data.vac]);
    worksheetDetails.addRow(['', 'TCPI (To Complete Performance Index):', data.tcpi]);
    if (data.forecastCompletionDate) {
      worksheetDetails.addRow(['', 'Forecast Completion Date:', this.formatDate(data.forecastCompletionDate)]);
    }
    worksheetDetails.addRow(['', '']);

    // Format summary rows
    for (let i = 8; i <= 20; i++) {
      const row = worksheetDetails.getRow(i);
      row.getCell(2).font = { bold: true };
      if (i >= 8 && i <= 19) {
        this.formatCurrency(row, [3]);
      }
      if (i === 14 || i === 15 || i === 19) {
        this.formatDecimal(row, [3]);
      }
    }

    // Define column headers for details
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
      'EAC',
      'ETC',
      'VAC',
    ];

    const headerRow = worksheetDetails.addRow(headers);
    this.styleHeaderRow(headerRow);

    // Add data rows
    data.lines.forEach((line: EarnedValueAnalysisLineDto, index: number) => {
      const row = worksheetDetails.addRow([
        line.costCode,
        line.description,
        line.bac,
        line.pv,
        line.ev,
        line.ac,
        line.cv,
        line.sv,
        line.cpi,
        line.spi,
        line.eac,
        line.etc,
        line.vac,
      ]);

      this.formatCurrency(row, [3, 4, 5, 6, 7, 8, 11, 12, 13]);
      this.formatDecimal(row, [9, 10]);
      this.styleDataRow(row, index);
    });

    // Auto-size columns
    this.autoSizeColumns(worksheetDetails);

    // ========== Trends Sheet ==========

    this.addReportHeader(worksheetTrends, [
      ['Monthly EVM Trends', ''],
      ['Project:', data.projectName],
      ['', ''],
    ]);

    const trendHeaders = ['Month', 'PV', 'EV', 'AC', 'CPI', 'SPI'];
    const trendHeaderRow = worksheetTrends.addRow(trendHeaders);
    this.styleHeaderRow(trendHeaderRow);

    data.monthlyTrends.forEach((trend, index) => {
      const row = worksheetTrends.addRow([
        this.formatDate(trend.month),
        trend.plannedValue,
        trend.earnedValue,
        trend.actualCost,
        trend.cpi,
        trend.spi,
      ]);

      this.formatCurrency(row, [2, 3, 4]);
      this.formatDecimal(row, [5, 6]);
      this.styleDataRow(row, index);
    });

    this.autoSizeColumns(worksheetTrends);

    return await workbook.xlsx.writeBuffer() as unknown as Buffer;
  }

  /**
   * Export Cash Flow Projection Report to Excel
   */
  async exportCashFlowProjectionToExcel(data: CashFlowProjectionReportDto): Promise<Buffer> {
    this.logger.log(`Generating Cash Flow Projection Report Excel for project ${data.projectId}`);

    const workbook = new ExcelJS.Workbook();
    const worksheetSummary = workbook.addWorksheet('Summary');
    const worksheetMonthly = workbook.addWorksheet('Monthly Projections');
    const worksheetCommitments = workbook.addWorksheet('Commitments');

    // ========== Summary Sheet ==========

    this.addReportHeader(worksheetSummary, [
      ['Cash Flow Projection Report', ''],
      ['Project:', data.projectName],
      ['Projection Period:', `${this.formatDate(data.startDate)} - ${this.formatDate(data.endDate)}`],
      ['As Of Date:', this.formatDate(data.asOfDate)],
      ['Generated:', this.formatDate(data.generatedAt)],
      ['', ''],
    ]);

    const summaryLabel = worksheetSummary.addRow(['', 'CASH FLOW SUMMARY']);
    summaryLabel.font = { bold: true, size: 12 };

    worksheetSummary.addRow(['', 'Total Projected Inflows:', data.totalProjectedInflows]);
    worksheetSummary.addRow(['', 'Total Projected Outflows:', data.totalProjectedOutflows]);
    worksheetSummary.addRow(['', 'Net Cash Flow:', data.netCashFlow]);
    worksheetSummary.addRow(['', 'Peak Cash Requirement:', data.peakCashRequirement]);
    worksheetSummary.addRow(['', 'Current Cash Position:', data.currentCashPosition]);
    worksheetSummary.addRow(['', 'Total Retention Held:', data.totalRetentionHeld]);
    worksheetSummary.addRow(['', 'Total Retention Owed:', data.totalRetentionOwed]);

    for (let i = 8; i <= 14; i++) {
      const row = worksheetSummary.getRow(i);
      row.getCell(2).font = { bold: true };
      this.formatCurrency(row, [3]);
    }

    this.autoSizeColumns(worksheetSummary);

    // ========== Monthly Projections Sheet ==========

    this.addReportHeader(worksheetMonthly, [
      ['Monthly Cash Flow Projections', ''],
      ['', ''],
    ]);

    const monthlyHeaders = [
      'Month',
      'Projected Inflows',
      'Projected Outflows',
      'Net Cash Flow',
      'Cumulative Cash',
    ];
    const monthlyHeaderRow = worksheetMonthly.addRow(monthlyHeaders);
    this.styleHeaderRow(monthlyHeaderRow);

    data.monthlyProjections.forEach((projection: CashFlowMonthlyProjectionDto, index: number) => {
      const row = worksheetMonthly.addRow([
        this.formatDate(projection.month),
        projection.projectedInflows,
        projection.projectedOutflows,
        projection.netCashFlow,
        projection.cumulativeCash,
      ]);

      this.formatCurrency(row, [2, 3, 4, 5]);
      this.styleDataRow(row, index);
    });

    this.autoSizeColumns(worksheetMonthly);

    // ========== Commitments Sheet ==========

    this.addReportHeader(worksheetCommitments, [
      ['Commitment Payment Details', ''],
      ['', ''],
    ]);

    const commitmentHeaders = [
      'Commitment #',
      'Vendor',
      'Revised Amount',
      'Paid to Date',
      'Retention Held',
      'Remaining Balance',
    ];
    const commitmentHeaderRow = worksheetCommitments.addRow(commitmentHeaders);
    this.styleHeaderRow(commitmentHeaderRow);

    data.commitmentDetails.forEach((commitment, index) => {
      const row = worksheetCommitments.addRow([
        commitment.commitmentNumber,
        commitment.vendorName,
        commitment.revisedAmount,
        commitment.paidToDate,
        commitment.retentionHeld,
        commitment.remainingBalance,
      ]);

      this.formatCurrency(row, [3, 4, 5, 6]);
      this.styleDataRow(row, index);
    });

    this.autoSizeColumns(worksheetCommitments);

    return await workbook.xlsx.writeBuffer() as unknown as Buffer;
  }

  /**
   * Export Invoice Register Report to Excel
   */
  async exportInvoiceRegisterToExcel(data: InvoiceRegisterReportDto): Promise<Buffer> {
    this.logger.log(`Generating Invoice Register Report Excel for project ${data.projectId}`);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Invoice Register');

    // Add header section
    const headerData: any[][] = [
      ['Invoice Register Report', ''],
      ['Project:', data.projectName],
      ['As Of Date:', this.formatDate(data.asOfDate)],
    ];

    if (data.filterType) {
      headerData.push(['Filter - Type:', data.filterType]);
    }
    if (data.filterStatus) {
      headerData.push(['Filter - Status:', data.filterStatus]);
    }

    headerData.push(['Generated:', this.formatDate(data.generatedAt)]);
    headerData.push(['', '']);

    this.addReportHeader(worksheet, headerData);

    // Add summary section
    const summaryLabel = worksheet.addRow(['', 'AGING SUMMARY']);
    summaryLabel.font = { bold: true, size: 12 };

    worksheet.addRow(['', 'Current (0-30 days):', data.agingCurrent]);
    worksheet.addRow(['', '31-60 days:', data.aging31To60]);
    worksheet.addRow(['', '61-90 days:', data.aging61To90]);
    worksheet.addRow(['', '90+ days:', data.aging90Plus]);
    worksheet.addRow(['', 'Total Amount:', data.totalInvoiceAmount]);
    worksheet.addRow(['', '']);

    // Format summary rows
    const summaryStartRow = headerData.length + 2;
    for (let i = summaryStartRow; i < summaryStartRow + 5; i++) {
      const row = worksheet.getRow(i);
      row.getCell(2).font = { bold: true };
      this.formatCurrency(row, [3]);
    }

    // Define column headers
    const headers = [
      'Invoice #',
      'Type',
      'Vendor/Customer',
      'Invoice Date',
      'Due Date',
      'Amount',
      'Status',
      'Days Outstanding',
      'Aging Bucket',
    ];

    const headerRow = worksheet.addRow(headers);
    this.styleHeaderRow(headerRow);

    // Add data rows
    data.invoices.forEach((line: InvoiceRegisterLineDto, index: number) => {
      const row = worksheet.addRow([
        line.invoiceNumber,
        line.invoiceType,
        line.vendorOrCustomerName,
        line.invoiceDate,
        line.dueDate,
        line.amount,
        line.status,
        line.daysOutstanding,
        line.agingBucket,
      ]);

      this.formatCurrency(row, [6]);
      this.formatDateCell(row, [4, 5]);
      this.styleDataRow(row, index);
    });

    // Add total row
    const totalRow = worksheet.addRow([
      '',
      '',
      '',
      '',
      'TOTAL',
      data.totalInvoiceAmount,
      '',
      '',
      '',
    ]);

    this.formatCurrency(totalRow, [6]);
    this.styleTotalRow(totalRow);

    this.autoSizeColumns(worksheet);

    return await workbook.xlsx.writeBuffer() as unknown as Buffer;
  }

  /**
   * Export Executive Summary Report to Excel
   */
  async exportExecutiveSummaryToExcel(data: ExecutiveSummaryReportDto): Promise<Buffer> {
    this.logger.log(`Generating Executive Summary Report Excel for project ${data.projectId}`);

    const workbook = new ExcelJS.Workbook();
    const worksheetSummary = workbook.addWorksheet('Executive Summary');
    const worksheetDetails = workbook.addWorksheet('Performance Details');

    // ========== Summary Sheet ==========

    this.addReportHeader(worksheetSummary, [
      ['Executive Summary Report', ''],
      ['Project:', data.projectName],
      ['Project Manager:', data.projectManager],
      ['As Of Date:', this.formatDate(data.asOfDate)],
      ['Generated:', this.formatDate(data.generatedAt)],
      ['', ''],
    ]);

    // Financial Summary
    let financialLabel = worksheetSummary.addRow(['', 'FINANCIAL SUMMARY']);
    financialLabel.font = { bold: true, size: 12, color: { argb: 'FF366092' } };
    worksheetSummary.addRow(['', 'Contract Value:', data.contractValue]);
    worksheetSummary.addRow(['', 'Original Budget:', data.originalBudget]);
    worksheetSummary.addRow(['', 'Approved Change Orders:', data.approvedChangeOrders]);
    worksheetSummary.addRow(['', 'Revised Budget:', data.revisedBudget]);
    worksheetSummary.addRow(['', 'Committed Cost:', data.committedCost]);
    worksheetSummary.addRow(['', 'Actual Cost:', data.actualCost]);
    worksheetSummary.addRow(['', 'Projected Final Cost:', data.projectedFinalCost]);
    worksheetSummary.addRow(['', 'Budget Variance:', data.budgetVariance]);
    worksheetSummary.addRow(['', 'Budget Variance %:', data.budgetVariancePercent / 100]);
    worksheetSummary.addRow(['', 'Projected Profit:', data.projectedProfit]);
    worksheetSummary.addRow(['', 'Projected Profit Margin:', data.projectedProfitMargin / 100]);
    worksheetSummary.addRow(['', '']);

    // Format financial rows
    for (let i = 8; i <= 17; i++) {
      const row = worksheetSummary.getRow(i);
      row.getCell(2).font = { bold: true };
      if (i !== 16 && i !== 18) {
        this.formatCurrency(row, [3]);
      }
      if (i === 16 || i === 18) {
        this.formatPercent(row, [3]);
      }
    }

    // Schedule Performance
    let scheduleLabel = worksheetSummary.addRow(['', 'SCHEDULE PERFORMANCE']);
    scheduleLabel.font = { bold: true, size: 12, color: { argb: 'FF366092' } };
    worksheetSummary.addRow(['', '% Complete (Physical):', data.percentComplete / 100]);
    worksheetSummary.addRow(['', '% Complete (Scheduled):', data.scheduledPercentComplete / 100]);
    worksheetSummary.addRow(['', 'Schedule Variance (Days):', data.scheduleVarianceDays]);
    if (data.forecastCompletionDate) {
      worksheetSummary.addRow(['', 'Forecast Completion Date:', this.formatDate(data.forecastCompletionDate)]);
    }
    worksheetSummary.addRow(['', '']);

    // Format schedule rows
    const scheduleStart = 20;
    this.formatPercent(worksheetSummary.getRow(scheduleStart), [3]);
    this.formatPercent(worksheetSummary.getRow(scheduleStart + 1), [3]);
    worksheetSummary.getRow(scheduleStart).getCell(2).font = { bold: true };
    worksheetSummary.getRow(scheduleStart + 1).getCell(2).font = { bold: true };
    worksheetSummary.getRow(scheduleStart + 2).getCell(2).font = { bold: true };

    // Performance Indices
    let performanceLabel = worksheetSummary.addRow(['', 'PERFORMANCE INDICES']);
    performanceLabel.font = { bold: true, size: 12, color: { argb: 'FF366092' } };
    worksheetSummary.addRow(['', 'CPI (Cost Performance Index):', data.cpi]);
    worksheetSummary.addRow(['', 'SPI (Schedule Performance Index):', data.spi]);
    worksheetSummary.addRow(['', '']);

    const perfStart = scheduleStart + 5;
    this.formatDecimal(worksheetSummary.getRow(perfStart), [3]);
    this.formatDecimal(worksheetSummary.getRow(perfStart + 1), [3]);
    worksheetSummary.getRow(perfStart).getCell(2).font = { bold: true };
    worksheetSummary.getRow(perfStart + 1).getCell(2).font = { bold: true };

    // Risk Indicators
    let riskLabel = worksheetSummary.addRow(['', 'RISK INDICATORS']);
    riskLabel.font = { bold: true, size: 12, color: { argb: 'FFFF0000' } };
    worksheetSummary.addRow(['', 'Over Budget Line Items:', data.overBudgetLineItemsCount]);
    worksheetSummary.addRow(['', 'Delayed Commitments:', data.delayedCommitmentsCount]);
    worksheetSummary.addRow(['', 'Overdue Invoices (Count):', data.overdueInvoicesCount]);
    worksheetSummary.addRow(['', 'Overdue Invoices (Amount):', data.overdueInvoicesAmount]);

    const riskStart = perfStart + 3;
    this.formatCurrency(worksheetSummary.getRow(riskStart + 3), [3]);
    for (let i = riskStart; i < riskStart + 4; i++) {
      worksheetSummary.getRow(i).getCell(2).font = { bold: true };
    }

    this.autoSizeColumns(worksheetSummary);

    // ========== Details Sheet ==========

    this.addReportHeader(worksheetDetails, [
      ['Performance Details', ''],
      ['', ''],
    ]);

    // Top Cost Overruns
    if (data.topCostOverruns.length > 0) {
      const overrunLabel = worksheetDetails.addRow(['', 'TOP COST OVERRUNS']);
      overrunLabel.font = { bold: true, size: 11 };

      const overrunHeaders = ['Description', 'Variance', 'Variance %', 'Status'];
      const overrunHeaderRow = worksheetDetails.addRow(overrunHeaders);
      this.styleHeaderRow(overrunHeaderRow);

      data.topCostOverruns.forEach((issue, index) => {
        const row = worksheetDetails.addRow([
          issue.description,
          issue.value,
          issue.daysOrPercent / 100,
          issue.status,
        ]);
        this.formatCurrency(row, [2]);
        this.formatPercent(row, [3]);
        this.styleDataRow(row, index);
      });

      worksheetDetails.addRow(['', '']);
    }

    // Cost Trend
    if (data.costTrend.length > 0) {
      const trendLabel = worksheetDetails.addRow(['', 'COST TREND']);
      trendLabel.font = { bold: true, size: 11 };

      const trendHeaders = ['Month', 'Planned', 'Actual'];
      const trendHeaderRow = worksheetDetails.addRow(trendHeaders);
      this.styleHeaderRow(trendHeaderRow);

      data.costTrend.forEach((trend, index) => {
        const row = worksheetDetails.addRow([
          this.formatDate(trend.month),
          trend.planned,
          trend.actual,
        ]);
        this.formatCurrency(row, [2, 3]);
        this.styleDataRow(row, index);
      });
    }

    this.autoSizeColumns(worksheetDetails);

    return await workbook.xlsx.writeBuffer() as unknown as Buffer;
  }

  /**
   * Export Budget Variance Report to Excel
   */
  async exportBudgetVarianceToExcel(data: BudgetVarianceReportDto): Promise<Buffer> {
    this.logger.log(`Generating Budget Variance Report Excel for project ${data.projectId}`);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Budget Variance');

    // Add header section
    this.addReportHeader(worksheet, [
      ['Budget Variance Report', ''],
      ['Project:', data.projectName],
      ['Budget:', data.budgetName],
      ['As Of Date:', this.formatDate(data.asOfDate)],
      ['Variance Threshold:', `${data.varianceThreshold}%`],
      ['Generated:', this.formatDate(data.generatedAt)],
      ['', ''],
    ]);

    // Add summary section
    const summaryLabel = worksheet.addRow(['', 'SUMMARY']);
    summaryLabel.font = { bold: true, size: 12 };

    worksheet.addRow(['', 'Total Budgeted Cost:', data.totalBudgetedCost]);
    worksheet.addRow(['', 'Total Actual Cost:', data.totalActualCost]);
    worksheet.addRow(['', 'Total Variance:', data.totalVariance]);
    worksheet.addRow(['', 'Total Variance %:', data.totalVariancePercent / 100]);
    worksheet.addRow(['', 'Total Percent Spent:', data.totalPercentSpent / 100]);
    worksheet.addRow(['', 'Over Budget Count:', data.overBudgetCount]);
    worksheet.addRow(['', 'Under Budget Count:', data.underBudgetCount]);
    worksheet.addRow(['', 'On Target Count:', data.onTargetCount]);
    worksheet.addRow(['', 'Flagged Count:', data.flaggedCount]);
    worksheet.addRow(['', '']);

    // Format summary rows
    for (let i = 9; i <= 13; i++) {
      const row = worksheet.getRow(i);
      row.getCell(2).font = { bold: true };
      this.formatCurrency(row, [3]);
    }
    this.formatPercent(worksheet.getRow(12), [3]);
    this.formatPercent(worksheet.getRow(13), [3]);

    // Define column headers
    const headers = [
      'Cost Code',
      'Description',
      'Budgeted Cost',
      'Actual Cost',
      'Variance',
      'Variance %',
      'Percent Spent',
      'Remaining Budget',
      'Status',
    ];

    const headerRow = worksheet.addRow(headers);
    this.styleHeaderRow(headerRow);

    // Add data rows
    data.lines.forEach((line: BudgetVarianceLineDto, index: number) => {
      const row = worksheet.addRow([
        line.costCode,
        line.description,
        line.budgetedCost,
        line.actualCost,
        line.variance,
        line.variancePercent / 100,
        line.percentSpent / 100,
        line.remainingBudget,
        line.varianceStatus,
      ]);

      this.formatCurrency(row, [3, 4, 5, 8]);
      this.formatPercent(row, [6, 7]);
      this.styleDataRow(row, index);

      // Highlight flagged rows
      if (line.isFlagged) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFEBCD' }, // Light orange
        };
      }
    });

    // Add total row
    const totalRow = worksheet.addRow([
      '',
      'TOTAL',
      data.totalBudgetedCost,
      data.totalActualCost,
      data.totalVariance,
      data.totalVariancePercent / 100,
      data.totalPercentSpent / 100,
      data.totalRemainingBudget,
      '',
    ]);

    this.formatCurrency(totalRow, [3, 4, 5, 8]);
    this.formatPercent(totalRow, [6, 7]);
    this.styleTotalRow(totalRow);

    this.autoSizeColumns(worksheet);

    return await workbook.xlsx.writeBuffer() as unknown as Buffer;
  }

  /**
   * Export Commitment Status Report to Excel
   */
  async exportCommitmentStatusToExcel(data: CommitmentStatusReportDto): Promise<Buffer> {
    this.logger.log(`Generating Commitment Status Report Excel for project ${data.projectId}`);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Commitment Status');

    // Add header section
    this.addReportHeader(worksheet, [
      ['Commitment Status Report', ''],
      ['Project:', data.projectName],
      ['As Of Date:', this.formatDate(data.asOfDate)],
      ['Generated:', this.formatDate(data.generatedAt)],
      ['', ''],
    ]);

    // Add summary section
    const summaryLabel = worksheet.addRow(['', 'SUMMARY']);
    summaryLabel.font = { bold: true, size: 12 };

    worksheet.addRow(['', 'Total Commitment Count:', data.commitmentCount]);
    worksheet.addRow(['', 'Total Original Amount:', data.totalOriginalAmount]);
    worksheet.addRow(['', 'Total Change Orders:', data.totalChangeOrders]);
    worksheet.addRow(['', 'Total Revised Amount:', data.totalRevisedAmount]);
    worksheet.addRow(['', 'Total Invoiced Amount:', data.totalInvoicedAmount]);
    worksheet.addRow(['', 'Total Paid Amount:', data.totalPaidAmount]);
    worksheet.addRow(['', 'Total Retention Held:', data.totalRetentionHeld]);
    worksheet.addRow(['', 'Total Remaining Balance:', data.totalRemainingBalance]);
    worksheet.addRow(['', 'Overall Percent Complete:', data.overallPercentComplete / 100]);
    worksheet.addRow(['', '']);

    // Format summary rows
    for (let i = 8; i <= 15; i++) {
      const row = worksheet.getRow(i);
      row.getCell(2).font = { bold: true };
      if (i !== 7 && i !== 16) {
        this.formatCurrency(row, [3]);
      }
    }
    this.formatPercent(worksheet.getRow(16), [3]);

    // Define column headers
    const headers = [
      'Commitment #',
      'Type',
      'Title',
      'Vendor',
      'Contact',
      'Status',
      'Original Amount',
      'Change Orders',
      'Revised Amount',
      'Invoiced',
      'Paid',
      'Retention %',
      'Retention Held',
      'Remaining',
      '% Complete',
      'Start Date',
      'End Date',
    ];

    const headerRow = worksheet.addRow(headers);
    this.styleHeaderRow(headerRow);

    // Add data rows
    data.lines.forEach((line: CommitmentStatusLineDto, index: number) => {
      const row = worksheet.addRow([
        line.commitmentNumber,
        line.type,
        line.title,
        line.vendorName,
        line.vendorContact,
        line.status,
        line.originalAmount,
        line.changeOrders,
        line.revisedAmount,
        line.invoicedAmount,
        line.paidAmount,
        line.retentionPercent / 100,
        line.retentionHeld,
        line.remainingBalance,
        line.percentComplete / 100,
        line.startDate || '',
        line.endDate || '',
      ]);

      this.formatCurrency(row, [7, 8, 9, 10, 11, 13, 14]);
      this.formatPercent(row, [12, 15]);
      this.formatDateCell(row, [16, 17]);
      this.styleDataRow(row, index);
    });

    // Add total row
    const totalRow = worksheet.addRow([
      '',
      '',
      '',
      '',
      '',
      'TOTAL',
      data.totalOriginalAmount,
      data.totalChangeOrders,
      data.totalRevisedAmount,
      data.totalInvoicedAmount,
      data.totalPaidAmount,
      '',
      data.totalRetentionHeld,
      data.totalRemainingBalance,
      data.overallPercentComplete / 100,
      '',
      '',
    ]);

    this.formatCurrency(totalRow, [7, 8, 9, 10, 11, 13, 14]);
    this.formatPercent(totalRow, [15]);
    this.styleTotalRow(totalRow);

    this.autoSizeColumns(worksheet);

    return await workbook.xlsx.writeBuffer() as unknown as Buffer;
  }

  /**
   * Export Payment History Report to Excel
   */
  async exportPaymentHistoryToExcel(data: PaymentHistoryReportDto): Promise<Buffer> {
    this.logger.log(`Generating Payment History Report Excel for project ${data.projectId}`);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Payment History');

    // Add header section
    const headerData: any[][] = [
      ['Payment History Report', ''],
      ['Project:', data.projectName],
      ['As Of Date:', this.formatDate(data.generatedAt)],
    ];

    if (data.startDate) {
      headerData.push(['Start Date:', this.formatDate(data.startDate)]);
    }
    if (data.endDate) {
      headerData.push(['End Date:', this.formatDate(data.endDate)]);
    }

    headerData.push(['Generated:', this.formatDate(data.generatedAt)]);
    headerData.push(['', '']);

    this.addReportHeader(worksheet, headerData);

    // Add summary section
    const summaryLabel = worksheet.addRow(['', 'SUMMARY']);
    summaryLabel.font = { bold: true, size: 12 };

    worksheet.addRow(['', 'Payment Application Count:', data.paymentApplicationCount]);
    worksheet.addRow(['', 'Approved Count:', data.approvedCount]);
    worksheet.addRow(['', 'Paid Count:', data.paidCount]);
    worksheet.addRow(['', 'Total Completed & Stored:', data.totalCompletedAndStored]);
    worksheet.addRow(['', 'Total Retainage:', data.totalRetainageAmount]);
    worksheet.addRow(['', 'Total Earned Less Retainage:', data.totalEarnedLessRetainage]);
    worksheet.addRow(['', 'Total Previous Payments:', data.totalPreviousPayments]);
    worksheet.addRow(['', 'Total Current Payment Due:', data.totalCurrentPaymentDue]);
    worksheet.addRow(['', '']);

    // Format summary rows
    const summaryStartRow = headerData.length + 2;
    for (let i = summaryStartRow; i < summaryStartRow + 8; i++) {
      const row = worksheet.getRow(i);
      row.getCell(2).font = { bold: true };
      if (i >= summaryStartRow + 3) {
        this.formatCurrency(row, [3]);
      }
    }

    // Define column headers
    const headers = [
      'App #',
      'App Date',
      'Period Start',
      'Period End',
      'Commitment #',
      'Title',
      'Vendor',
      'Status',
      'Completed & Stored',
      'Retainage %',
      'Retainage',
      'Earned Less Ret.',
      'Previous Payments',
      'Current Due',
      'Approved At',
      'Approved By',
      'Paid At',
      'Paid By',
    ];

    const headerRow = worksheet.addRow(headers);
    this.styleHeaderRow(headerRow);

    // Add data rows
    data.lines.forEach((line: PaymentHistoryLineDto, index: number) => {
      const row = worksheet.addRow([
        line.applicationNumber,
        line.applicationDate,
        line.periodStart,
        line.periodEnd,
        line.commitmentNumber,
        line.commitmentTitle,
        line.vendorName,
        line.status,
        line.totalCompletedAndStored,
        line.retainagePercent / 100,
        line.retainageAmount,
        line.totalEarnedLessRetainage,
        line.previousPayments,
        line.currentPaymentDue,
        line.approvedAt || '',
        line.approvedByName || '',
        line.paidAt || '',
        line.paidByName || '',
      ]);

      this.formatCurrency(row, [9, 11, 12, 13, 14]);
      this.formatPercent(row, [10]);
      this.formatDateCell(row, [2, 3, 4, 15, 17]);
      this.styleDataRow(row, index);
    });

    // Add total row
    const totalRow = worksheet.addRow([
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'TOTAL',
      data.totalCompletedAndStored,
      '',
      data.totalRetainageAmount,
      data.totalEarnedLessRetainage,
      data.totalPreviousPayments,
      data.totalCurrentPaymentDue,
      '',
      '',
      '',
      '',
    ]);

    this.formatCurrency(totalRow, [9, 11, 12, 13, 14]);
    this.styleTotalRow(totalRow);

    this.autoSizeColumns(worksheet);

    return await workbook.xlsx.writeBuffer() as unknown as Buffer;
  }

  /**
   * Export Aging Report to Excel
   */
  async exportAgingToExcel(data: AgingReportDto): Promise<Buffer> {
    this.logger.log(`Generating Aging Report Excel for project ${data.projectId}`);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Aging ${data.reportType}`);

    // Add header section
    this.addReportHeader(worksheet, [
      [`Aging Report - ${data.reportType}`, ''],
      ['Project:', data.projectName],
      ['Report Type:', data.reportType === 'AR' ? 'Accounts Receivable' : 'Accounts Payable'],
      ['As Of Date:', this.formatDate(data.asOfDate)],
      ['Generated:', this.formatDate(data.generatedAt)],
      ['', ''],
    ]);

    // Add summary section
    const summaryLabel = worksheet.addRow(['', 'AGING SUMMARY']);
    summaryLabel.font = { bold: true, size: 12 };

    worksheet.addRow(['', 'Total Amount:', data.totalAmount]);
    worksheet.addRow(['', 'Total Paid:', data.totalAmountPaid]);
    worksheet.addRow(['', 'Total Balance Due:', data.totalBalanceDue]);
    worksheet.addRow(['', 'Current (0-30 days):', data.totalCurrent]);
    worksheet.addRow(['', '31-60 days:', data.totalDays31to60]);
    worksheet.addRow(['', '61-90 days:', data.totalDays61to90]);
    worksheet.addRow(['', '90+ days:', data.totalDays90Plus]);
    worksheet.addRow(['', 'Item Count:', data.itemCount]);
    worksheet.addRow(['', 'Overdue Count (31+ days):', data.overdueCount]);
    worksheet.addRow(['', '']);

    // Format summary rows
    for (let i = 8; i <= 16; i++) {
      const row = worksheet.getRow(i);
      row.getCell(2).font = { bold: true };
      if (i <= 14) {
        this.formatCurrency(row, [3]);
      }
    }

    // Define column headers
    const headers = [
      'Reference #',
      'Description',
      'Party',
      'Document Date',
      'Due Date',
      'Days Outstanding',
      'Total Amount',
      'Amount Paid',
      'Balance Due',
      'Current',
      '31-60',
      '61-90',
      '90+',
      'Status',
    ];

    const headerRow = worksheet.addRow(headers);
    this.styleHeaderRow(headerRow);

    // Add data rows
    data.lines.forEach((line: AgingReportLineDto, index: number) => {
      const row = worksheet.addRow([
        line.referenceNumber,
        line.description,
        line.partyName,
        line.documentDate,
        line.dueDate || '',
        line.daysOutstanding,
        line.totalAmount,
        line.amountPaid,
        line.balanceDue,
        line.current,
        line.days31to60,
        line.days61to90,
        line.days90Plus,
        line.status,
      ]);

      this.formatCurrency(row, [7, 8, 9, 10, 11, 12, 13]);
      this.formatDateCell(row, [4, 5]);
      this.styleDataRow(row, index);

      // Highlight overdue items
      if (line.daysOutstanding > 30) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFEBCD' }, // Light orange
        };
      }
    });

    // Add total row
    const totalRow = worksheet.addRow([
      '',
      '',
      '',
      '',
      '',
      'TOTAL',
      data.totalAmount,
      data.totalAmountPaid,
      data.totalBalanceDue,
      data.totalCurrent,
      data.totalDays31to60,
      data.totalDays61to90,
      data.totalDays90Plus,
      '',
    ]);

    this.formatCurrency(totalRow, [7, 8, 9, 10, 11, 12, 13]);
    this.styleTotalRow(totalRow);

    this.autoSizeColumns(worksheet);

    return await workbook.xlsx.writeBuffer() as unknown as Buffer;
  }

  /**
   * Export Change Order Log Report to Excel
   */
  async exportChangeOrderLogToExcel(data: ChangeOrderLogReportDto): Promise<Buffer> {
    this.logger.log(`Generating Change Order Log Report Excel for project ${data.projectId}`);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Change Order Log');

    // Add header section
    const headerData: any[][] = [
      ['Change Order Log Report', ''],
      ['Project:', data.projectName],
      ['Type Filter:', data.typeFilter],
    ];

    if (data.startDate) {
      headerData.push(['Start Date:', this.formatDate(data.startDate)]);
    }
    if (data.endDate) {
      headerData.push(['End Date:', this.formatDate(data.endDate)]);
    }

    headerData.push(['Generated:', this.formatDate(data.generatedAt)]);
    headerData.push(['', '']);

    this.addReportHeader(worksheet, headerData);

    // Add summary section
    const summaryLabel = worksheet.addRow(['', 'SUMMARY']);
    summaryLabel.font = { bold: true, size: 12 };

    worksheet.addRow(['', 'Total Count:', data.totalCount]);
    worksheet.addRow(['', 'PCO Count:', data.pcoCount]);
    worksheet.addRow(['', 'OCO Count:', data.ocoCount]);
    worksheet.addRow(['', 'CCO Count:', data.ccoCount]);
    worksheet.addRow(['', 'Pending Count:', data.pendingCount]);
    worksheet.addRow(['', 'Approved Count:', data.approvedCount]);
    worksheet.addRow(['', 'Rejected Count:', data.rejectedCount]);
    worksheet.addRow(['', 'Total Amount:', data.totalAmount]);
    worksheet.addRow(['', 'Total Approved Amount:', data.totalApprovedAmount]);
    worksheet.addRow(['', '']);

    // Format summary rows
    const summaryStartRow = headerData.length + 2;
    for (let i = summaryStartRow; i < summaryStartRow + 9; i++) {
      const row = worksheet.getRow(i);
      row.getCell(2).font = { bold: true };
      if (i >= summaryStartRow + 7) {
        this.formatCurrency(row, [3]);
      }
    }

    // Define column headers
    const headers = [
      'Type',
      'Number',
      'Title',
      'Description',
      'Status',
      'Change Type',
      'Priority',
      'Amount',
      'Approved Amount',
      'Related Entity',
      'Created At',
      'Created By',
      'Submitted At',
      'Approved At',
      'Approved By',
      'Rejected At',
      'Rejected By',
      'Rejection Reason',
    ];

    const headerRow = worksheet.addRow(headers);
    this.styleHeaderRow(headerRow);

    // Add data rows
    data.lines.forEach((line: ChangeOrderLogLineDto, index: number) => {
      const row = worksheet.addRow([
        line.type,
        line.number,
        line.title,
        line.description,
        line.status,
        line.changeType || '',
        line.priority || '',
        line.amount,
        line.approvedAmount || '',
        line.relatedEntity || '',
        line.createdAt,
        line.createdByName,
        line.submittedAt || '',
        line.approvedAt || '',
        line.approvedByName || '',
        line.rejectedAt || '',
        line.rejectedByName || '',
        line.rejectionReason || '',
      ]);

      this.formatCurrency(row, [8, 9]);
      this.formatDateCell(row, [11, 13, 14, 16]);
      this.styleDataRow(row, index);
    });

    // Add total row
    const totalRow = worksheet.addRow([
      '',
      '',
      '',
      '',
      '',
      '',
      'TOTAL',
      data.totalAmount,
      data.totalApprovedAmount,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ]);

    this.formatCurrency(totalRow, [8, 9]);
    this.styleTotalRow(totalRow);

    this.autoSizeColumns(worksheet);

    return await workbook.xlsx.writeBuffer() as unknown as Buffer;
  }

  /**
   * Export Change Order Summary Report to Excel
   */
  async exportChangeOrderSummaryToExcel(data: ChangeOrderSummaryReportDto): Promise<Buffer> {
    this.logger.log(`Generating Change Order Summary Report Excel for project ${data.projectId}`);

    const workbook = new ExcelJS.Workbook();
    const worksheetSummary = workbook.addWorksheet('Summary');
    const worksheetByType = workbook.addWorksheet('By Type');
    const worksheetByStatus = workbook.addWorksheet('By Status');

    // ========== Summary Sheet ==========

    this.addReportHeader(worksheetSummary, [
      ['Change Order Summary Report', ''],
      ['Project:', data.projectName],
      ['As Of Date:', this.formatDate(data.asOfDate)],
      ['Generated:', this.formatDate(data.generatedAt)],
      ['', ''],
    ]);

    const summaryLabel = worksheetSummary.addRow(['', 'OVERALL SUMMARY']);
    summaryLabel.font = { bold: true, size: 12 };

    worksheetSummary.addRow(['', 'Total Change Order Count:', data.totalChangeOrderCount]);
    worksheetSummary.addRow(['', 'Total Amount:', data.totalAmount]);
    worksheetSummary.addRow(['', 'Total Approved Amount:', data.totalApprovedAmount]);
    worksheetSummary.addRow(['', 'Total Pending Amount:', data.totalPendingAmount]);
    worksheetSummary.addRow(['', 'Total Rejected Amount:', data.totalRejectedAmount]);
    worksheetSummary.addRow(['', 'Overall Approval Rate:', data.overallApprovalRate / 100]);
    worksheetSummary.addRow(['', '']);

    for (let i = 7; i <= 12; i++) {
      const row = worksheetSummary.getRow(i);
      row.getCell(2).font = { bold: true };
      if (i >= 8 && i <= 11) {
        this.formatCurrency(row, [3]);
      }
      if (i === 12) {
        this.formatPercent(row, [3]);
      }
    }

    this.autoSizeColumns(worksheetSummary);

    // ========== By Type Sheet ==========

    this.addReportHeader(worksheetByType, [
      ['Change Orders by Type', ''],
      ['', ''],
    ]);

    const typeHeaders = [
      'Type',
      'Total Count',
      'Draft',
      'Pending',
      'Approved',
      'Rejected',
      'Total Amount',
      'Draft Amount',
      'Pending Amount',
      'Approved Amount',
      'Rejected Amount',
      'Approval Rate',
    ];

    const typeHeaderRow = worksheetByType.addRow(typeHeaders);
    this.styleHeaderRow(typeHeaderRow);

    data.byType.forEach((typeSummary: ChangeOrderTypeSummaryDto, index: number) => {
      const row = worksheetByType.addRow([
        typeSummary.type,
        typeSummary.totalCount,
        typeSummary.draftCount,
        typeSummary.pendingCount,
        typeSummary.approvedCount,
        typeSummary.rejectedCount,
        typeSummary.totalAmount,
        typeSummary.draftAmount,
        typeSummary.pendingAmount,
        typeSummary.approvedAmount,
        typeSummary.rejectedAmount,
        typeSummary.approvalRate / 100,
      ]);

      this.formatCurrency(row, [7, 8, 9, 10, 11]);
      this.formatPercent(row, [12]);
      this.styleDataRow(row, index);
    });

    this.autoSizeColumns(worksheetByType);

    // ========== By Status Sheet ==========

    this.addReportHeader(worksheetByStatus, [
      ['Change Orders by Status', ''],
      ['', ''],
    ]);

    const statusHeaders = ['Status', 'Count', 'Amount'];

    const statusHeaderRow = worksheetByStatus.addRow(statusHeaders);
    this.styleHeaderRow(statusHeaderRow);

    data.byStatus.forEach((statusSummary: ChangeOrderStatusSummaryDto, index: number) => {
      const row = worksheetByStatus.addRow([
        statusSummary.status,
        statusSummary.count,
        statusSummary.amount,
      ]);

      this.formatCurrency(row, [3]);
      this.styleDataRow(row, index);
    });

    this.autoSizeColumns(worksheetByStatus);

    return await workbook.xlsx.writeBuffer() as unknown as Buffer;
  }

  /**
   * Export Subcontractor Summary Report to Excel
   */
  async exportSubcontractorSummaryToExcel(data: SubcontractorSummaryReportDto): Promise<Buffer> {
    this.logger.log(`Generating Subcontractor Summary Report Excel for project ${data.projectId}`);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Subcontractor Summary');

    // Add header section
    this.addReportHeader(worksheet, [
      ['Subcontractor Summary Report', ''],
      ['Project:', data.projectName],
      ['As Of Date:', this.formatDate(data.asOfDate)],
      ['Generated:', this.formatDate(data.generatedAt)],
      ['', ''],
    ]);

    // Add summary section
    const summaryLabel = worksheet.addRow(['', 'SUMMARY']);
    summaryLabel.font = { bold: true, size: 12 };

    worksheet.addRow(['', 'Vendor Count:', data.vendorCount]);
    worksheet.addRow(['', 'Total Original Contract Value:', data.totalOriginalContractValue]);
    worksheet.addRow(['', 'Total Change Orders:', data.totalChangeOrders]);
    worksheet.addRow(['', 'Total Revised Contract Value:', data.totalRevisedContractValue]);
    worksheet.addRow(['', 'Total Invoiced Amount:', data.totalInvoicedAmount]);
    worksheet.addRow(['', 'Total Paid Amount:', data.totalPaidAmount]);
    worksheet.addRow(['', 'Total Retention Held:', data.totalRetentionHeld]);
    worksheet.addRow(['', 'Total Outstanding Balance:', data.totalOutstandingBalance]);
    worksheet.addRow(['', 'Total Remaining Contract Balance:', data.totalRemainingContractBalance]);
    worksheet.addRow(['', 'Overall Percent Complete:', data.overallPercentComplete / 100]);
    worksheet.addRow(['', '']);

    // Format summary rows
    for (let i = 7; i <= 16; i++) {
      const row = worksheet.getRow(i);
      row.getCell(2).font = { bold: true };
      if (i !== 7 && i !== 16) {
        this.formatCurrency(row, [3]);
      }
    }
    this.formatPercent(worksheet.getRow(16), [3]);

    // Define column headers
    const headers = [
      'Vendor Name',
      'Contact',
      'Email',
      'Commitments',
      'Original Value',
      'Change Orders',
      'Revised Value',
      'Invoiced',
      'Paid',
      'Retention Held',
      'Outstanding',
      'Remaining',
      '% Complete',
      'Payment Apps',
      'Approved',
      'Paid',
    ];

    const headerRow = worksheet.addRow(headers);
    this.styleHeaderRow(headerRow);

    // Add data rows
    data.lines.forEach((line: SubcontractorSummaryLineDto, index: number) => {
      const row = worksheet.addRow([
        line.vendorName,
        line.vendorContact,
        line.vendorEmail,
        line.commitmentCount,
        line.originalContractValue,
        line.changeOrders,
        line.revisedContractValue,
        line.invoicedAmount,
        line.paidAmount,
        line.retentionHeld,
        line.outstandingBalance,
        line.remainingContractBalance,
        line.percentComplete / 100,
        line.paymentApplicationCount,
        line.approvedPaymentCount,
        line.paidPaymentCount,
      ]);

      this.formatCurrency(row, [5, 6, 7, 8, 9, 10, 11, 12]);
      this.formatPercent(row, [13]);
      this.styleDataRow(row, index);
    });

    // Add total row
    const totalRow = worksheet.addRow([
      'TOTAL',
      '',
      '',
      '',
      data.totalOriginalContractValue,
      data.totalChangeOrders,
      data.totalRevisedContractValue,
      data.totalInvoicedAmount,
      data.totalPaidAmount,
      data.totalRetentionHeld,
      data.totalOutstandingBalance,
      data.totalRemainingContractBalance,
      data.overallPercentComplete / 100,
      '',
      '',
      '',
    ]);

    this.formatCurrency(totalRow, [5, 6, 7, 8, 9, 10, 11, 12]);
    this.formatPercent(totalRow, [13]);
    this.styleTotalRow(totalRow);

    this.autoSizeColumns(worksheet);

    return await workbook.xlsx.writeBuffer() as unknown as Buffer;
  }

  /**
   * Export Vendor Payments Report to Excel
   */
  async exportVendorPaymentsToExcel(data: VendorPaymentsReportDto): Promise<Buffer> {
    this.logger.log(`Generating Vendor Payments Report Excel for project ${data.projectId}`);

    const workbook = new ExcelJS.Workbook();
    const worksheetSummary = workbook.addWorksheet('Summary');
    const worksheetDetails = workbook.addWorksheet('Payment Details');

    // ========== Summary Sheet ==========

    const headerData: any[][] = [
      ['Vendor Payments Report', ''],
      ['Project:', data.projectName],
    ];

    if (data.startDate) {
      headerData.push(['Start Date:', this.formatDate(data.startDate)]);
    }
    if (data.endDate) {
      headerData.push(['End Date:', this.formatDate(data.endDate)]);
    }

    headerData.push(['Generated:', this.formatDate(data.generatedAt)]);
    headerData.push(['', '']);

    this.addReportHeader(worksheetSummary, headerData);

    // Overall summary
    const overallLabel = worksheetSummary.addRow(['', 'OVERALL SUMMARY']);
    overallLabel.font = { bold: true, size: 12 };

    worksheetSummary.addRow(['', 'Vendor Count:', data.vendorCount]);
    worksheetSummary.addRow(['', 'Payment Application Count:', data.paymentApplicationCount]);
    worksheetSummary.addRow(['', 'Total Amount Requested:', data.totalAmountRequested]);
    worksheetSummary.addRow(['', 'Total Amount Paid:', data.totalAmountPaid]);
    worksheetSummary.addRow(['', 'Total Retainage Held:', data.totalRetainageHeld]);
    worksheetSummary.addRow(['', 'Total Outstanding:', data.totalOutstanding]);
    worksheetSummary.addRow(['', 'Average Days to Payment:', data.averageDaysToPayment]);
    worksheetSummary.addRow(['', '']);

    const summaryStartRow = headerData.length + 2;
    for (let i = summaryStartRow; i < summaryStartRow + 7; i++) {
      const row = worksheetSummary.getRow(i);
      row.getCell(2).font = { bold: true };
      if (i >= summaryStartRow + 2 && i <= summaryStartRow + 5) {
        this.formatCurrency(row, [3]);
      }
    }

    // Vendor-level summary
    worksheetSummary.addRow(['', '']);
    const vendorLabel = worksheetSummary.addRow(['', 'SUMMARY BY VENDOR']);
    vendorLabel.font = { bold: true, size: 12 };

    const vendorHeaders = [
      'Vendor Name',
      'Payment Count',
      'Amount Requested',
      'Amount Paid',
      'Retainage Held',
      'Outstanding',
      'Avg Days to Payment',
    ];

    const vendorHeaderRow = worksheetSummary.addRow(vendorHeaders);
    this.styleHeaderRow(vendorHeaderRow);

    data.summaryByVendor.forEach((vendorSummary: VendorPaymentsSummaryDto, index: number) => {
      const row = worksheetSummary.addRow([
        vendorSummary.vendorName,
        vendorSummary.paymentCount,
        vendorSummary.totalAmountRequested,
        vendorSummary.totalAmountPaid,
        vendorSummary.totalRetainageHeld,
        vendorSummary.totalOutstanding,
        vendorSummary.averageDaysToPayment,
      ]);

      this.formatCurrency(row, [3, 4, 5, 6]);
      this.formatDecimal(row, [7]);
      this.styleDataRow(row, index);
    });

    this.autoSizeColumns(worksheetSummary);

    // ========== Details Sheet ==========

    this.addReportHeader(worksheetDetails, [
      ['Payment Details', ''],
      ['', ''],
    ]);

    const detailHeaders = [
      'Vendor',
      'Commitment #',
      'Title',
      'App #',
      'App Date',
      'Status',
      'Payment Due',
      'Retainage',
      'Approved At',
      'Paid At',
      'Paid By',
      'Days to Payment',
    ];

    const detailHeaderRow = worksheetDetails.addRow(detailHeaders);
    this.styleHeaderRow(detailHeaderRow);

    data.lines.forEach((line: VendorPaymentsLineDto, index: number) => {
      const row = worksheetDetails.addRow([
        line.vendorName,
        line.commitmentNumber,
        line.commitmentTitle,
        line.applicationNumber,
        line.applicationDate,
        line.status,
        line.currentPaymentDue,
        line.retainageAmount,
        line.approvedAt || '',
        line.paidAt || '',
        line.paidByName || '',
        line.daysToPayment || '',
      ]);

      this.formatCurrency(row, [7, 8]);
      this.formatDateCell(row, [5, 9, 10]);
      this.styleDataRow(row, index);
    });

    this.autoSizeColumns(worksheetDetails);

    return await workbook.xlsx.writeBuffer() as unknown as Buffer;
  }

  // ==================== Helper Methods ====================

  /**
   * Add report header section
   */
  private addReportHeader(worksheet: ExcelJS.Worksheet, headerData: any[][]): void {
    headerData.forEach((row, index) => {
      const excelRow = worksheet.addRow(row);
      if (index === 0) {
        // Main title
        excelRow.font = { bold: true, size: 14 };
      } else if (row[0] !== '') {
        // Labels
        excelRow.getCell(1).font = { bold: true };
      }
    });
  }

  /**
   * Style header row
   */
  private styleHeaderRow(row: ExcelJS.Row): void {
    row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF366092' }, // Dark blue
    };
    row.alignment = { vertical: 'middle', horizontal: 'center' };
    row.height = 20;
  }

  /**
   * Style data row with alternating colors
   */
  private styleDataRow(row: ExcelJS.Row, index: number): void {
    if (index % 2 === 1) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F0F0' }, // Light gray
      };
    }
  }

  /**
   * Style total row
   */
  private styleTotalRow(row: ExcelJS.Row): void {
    row.font = { bold: true };
    row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFD966' }, // Light yellow
    };
    row.border = {
      top: { style: 'thick' },
    };
  }

  /**
   * Format currency columns
   */
  private formatCurrency(row: ExcelJS.Row, columnIndices: number[]): void {
    columnIndices.forEach((colIndex) => {
      const cell = row.getCell(colIndex);
      cell.numFmt = '$#,##0.00';
    });
  }

  /**
   * Format percentage columns
   */
  private formatPercent(row: ExcelJS.Row, columnIndices: number[]): void {
    columnIndices.forEach((colIndex) => {
      const cell = row.getCell(colIndex);
      cell.numFmt = '0.00%';
    });
  }

  /**
   * Format decimal columns
   */
  private formatDecimal(row: ExcelJS.Row, columnIndices: number[]): void {
    columnIndices.forEach((colIndex) => {
      const cell = row.getCell(colIndex);
      cell.numFmt = '0.00';
    });
  }

  /**
   * Format date cells
   */
  private formatDateCell(row: ExcelJS.Row, columnIndices: number[]): void {
    columnIndices.forEach((colIndex) => {
      const cell = row.getCell(colIndex);
      if (cell.value) {
        cell.numFmt = 'mm/dd/yyyy';
      }
    });
  }

  /**
   * Format date to string
   */
  private formatDate(date: Date): string {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  }

  /**
   * Export Custom Report to Excel
   *
   * Exports a custom report result to Excel format with dynamic columns
   * based on the report configuration.
   */
  async exportCustomReportToExcel(result: CustomReportResultDto): Promise<Buffer> {
    this.logger.log(`Exporting custom report '${result.reportInfo.reportName}' to Excel`);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report Data');

    // Add report header
    this.addReportHeader(worksheet, [
      [result.reportInfo.reportName, ''],
      ['Generated:', new Date(result.reportInfo.generatedAt).toLocaleString()],
      ['Rows:', result.reportInfo.rowCount.toString()],
      ['Execution Time:', `${result.reportInfo.executionTimeMs}ms`],
      ['', ''],
    ]);

    // Add column headers
    const headers = result.columns.map((col) => col.label);
    const headerRow = worksheet.addRow(headers);
    this.styleHeaderRow(headerRow);

    // Add data rows
    result.data.forEach((row, index) => {
      const rowData = result.columns.map((col) => {
        const fieldKey = col.field.replace('.', '_');
        const value = row[fieldKey];

        // Format based on data type
        switch (col.dataType) {
          case 'CURRENCY':
            return typeof value === 'number' ? value : parseFloat(value) || 0;
          case 'NUMBER':
            return typeof value === 'number' ? value : parseFloat(value) || 0;
          case 'PERCENT':
            return typeof value === 'number' ? value / 100 : parseFloat(value) / 100 || 0;
          case 'DATE':
            return value ? new Date(value) : null;
          default:
            return value;
        }
      });

      const dataRow = worksheet.addRow(rowData);

      // Apply formatting based on column data types
      result.columns.forEach((col, colIndex) => {
        const cell = dataRow.getCell(colIndex + 1);
        switch (col.dataType) {
          case 'CURRENCY':
            cell.numFmt = '$#,##0.00';
            break;
          case 'NUMBER':
            cell.numFmt = '#,##0.00';
            break;
          case 'PERCENT':
            cell.numFmt = '0.00%';
            break;
          case 'DATE':
            cell.numFmt = 'mm/dd/yyyy';
            break;
        }
      });

      this.styleDataRow(dataRow, index);
    });

    // Add totals row if present
    if (result.totals) {
      const totalsRow = worksheet.addRow(
        result.columns.map((col) => {
          const fieldKey = col.field.replace('.', '_');
          const alias = `sum_${fieldKey}`;
          return result.totals?.[alias] !== undefined ? result.totals[alias] : '';
        }),
      );

      // Style totals row
      totalsRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' },
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      // Apply number formatting to totals
      result.columns.forEach((col, colIndex) => {
        const cell = totalsRow.getCell(colIndex + 1);
        switch (col.dataType) {
          case 'CURRENCY':
            cell.numFmt = '$#,##0.00';
            break;
          case 'NUMBER':
            cell.numFmt = '#,##0.00';
            break;
          case 'PERCENT':
            cell.numFmt = '0.00%';
            break;
        }
      });
    }

    // Add subtotals sheet if present
    if (result.subtotals && result.subtotals.length > 0) {
      const subtotalsSheet = workbook.addWorksheet('Subtotals');

      this.addReportHeader(subtotalsSheet, [
        ['Subtotals', ''],
        ['', ''],
      ]);

      // Create headers for subtotals
      const subtotalHeaders = ['Group', ...Object.keys(result.subtotals[0].totals)];
      const subtotalHeaderRow = subtotalsSheet.addRow(subtotalHeaders);
      this.styleHeaderRow(subtotalHeaderRow);

      // Add subtotal rows
      result.subtotals.forEach((subtotal, index) => {
        const groupValueStr = Object.values(subtotal.groupValue).join(' - ');
        const rowData = [groupValueStr, ...Object.values(subtotal.totals)];
        const row = subtotalsSheet.addRow(rowData);
        this.styleDataRow(row, index);
      });

      this.autoSizeColumns(subtotalsSheet);
    }

    // Auto-size columns
    this.autoSizeColumns(worksheet);

    // Generate buffer
    return await workbook.xlsx.writeBuffer() as unknown as Buffer;
  }

  /**
   * Auto-size columns based on content
   */
  private autoSizeColumns(worksheet: ExcelJS.Worksheet): void {
    worksheet.columns.forEach((column) => {
      if (!column) return;
      let maxLength = 0;
      column.eachCell?.({ includeEmpty: false }, (cell) => {
        const cellValue = cell.value ? cell.value.toString() : '';
        maxLength = Math.max(maxLength, cellValue.length);
      });
      column.width = Math.min(Math.max(maxLength + 2, 12), 50); // Min 12, max 50
    });
  }
}
