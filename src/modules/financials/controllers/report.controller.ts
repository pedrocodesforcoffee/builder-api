import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  StreamableFile,
  Header,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiProduces,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import {
  BudgetDetailReportService,
  WIPReportService,
  CostToCompleteReportService,
  CommitmentListReportService,
  EarnedValueAnalysisReportService,
  CashFlowProjectionReportService,
  InvoiceRegisterReportService,
  ExecutiveSummaryReportService,
  BudgetVarianceReportService,
  CommitmentStatusReportService,
  PaymentHistoryReportService,
  AgingReportService,
  ChangeOrderLogReportService,
  ChangeOrderSummaryReportService,
  SubcontractorSummaryReportService,
  VendorPaymentsReportService,
  ReportExcelExportService,
  ReportPdfExportService,
} from '../services';
import {
  GenerateBudgetDetailReportDto,
  GenerateWIPReportDto,
  GenerateCostToCompleteReportDto,
  GenerateCommitmentListReportDto,
} from '../dto/report';

/**
 * Report Controller
 *
 * Handles financial report generation and export for construction projects.
 * All reports support both Excel and PDF export formats.
 *
 * Phase 1 Reports:
 * - Budget Detail Report: Variance analysis with actual vs budgeted costs
 * - WIP Report: Work in Progress with over/under billing analysis
 * - Cost to Complete Report: EAC/ETC projections using Earned Value Management
 * - Commitment List Report: Comprehensive list of all commitments
 *
 * Phase 2 Reports:
 * - Earned Value Analysis Report: Complete EVM metrics with trend analysis
 * - Cash Flow Projection Report: Cash inflows/outflows with peak requirement analysis
 * - Invoice Register Report: Invoice tracking with aging analysis
 * - Executive Summary Report: High-level dashboard with KPIs and risk indicators
 *
 * Phase 3 Reports:
 * - Budget Variance Report: Variance-focused analysis highlighting over/under budget items
 * - Commitment Status Report: Comprehensive commitment status tracking by vendor
 * - Payment History Report: Chronological payment application tracking
 * - Aging Report: AR/AP aging analysis and standard aging buckets
 * - Change Order Log Report: Complete audit trail of all change orders
 * - Change Order Summary Report: Executive-level change order metrics and approval rates
 * - Subcontractor Summary Report: Vendor performance metrics and contract tracking
 * - Vendor Payments Report: Payment tracking and days-to-payment analysis
 *
 * All endpoints:
 * - Require JWT authentication
 * - Return Excel or PDF files as StreamableFile
 * - Set proper Content-Type and Content-Disposition headers
 * - Use project-scoped routes (api/v1/projects/:projectId/reports/...)
 */
@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/reports')
export class ReportController {
  private readonly logger = new Logger(ReportController.name);

  constructor(
    private readonly budgetDetailReportService: BudgetDetailReportService,
    private readonly wipReportService: WIPReportService,
    private readonly costToCompleteReportService: CostToCompleteReportService,
    private readonly commitmentListReportService: CommitmentListReportService,
    private readonly earnedValueAnalysisReportService: EarnedValueAnalysisReportService,
    private readonly cashFlowProjectionReportService: CashFlowProjectionReportService,
    private readonly invoiceRegisterReportService: InvoiceRegisterReportService,
    private readonly executiveSummaryReportService: ExecutiveSummaryReportService,
    private readonly budgetVarianceReportService: BudgetVarianceReportService,
    private readonly commitmentStatusReportService: CommitmentStatusReportService,
    private readonly paymentHistoryReportService: PaymentHistoryReportService,
    private readonly agingReportService: AgingReportService,
    private readonly changeOrderLogReportService: ChangeOrderLogReportService,
    private readonly changeOrderSummaryReportService: ChangeOrderSummaryReportService,
    private readonly subcontractorSummaryReportService: SubcontractorSummaryReportService,
    private readonly vendorPaymentsReportService: VendorPaymentsReportService,
    private readonly excelExportService: ReportExcelExportService,
    private readonly pdfExportService: ReportPdfExportService,
  ) {}

  /**
   * Generate Budget Detail Report
   *
   * Generates comprehensive budget variance analysis with:
   * - Original budget vs revised budget (with change orders)
   * - Actual costs vs budgeted costs
   * - Variance analysis
   * - Percent complete calculations
   * - Projected final costs and variances
   *
   * Business Logic:
   * - originalBudget = budgetLineItem.budgetedCost
   * - changeOrders = sum(approved change orders)
   * - revisedBudget = originalBudget + changeOrders
   * - variance = revisedBudget - actualCost
   * - percentComplete = (actualCost / revisedBudget) * 100
   * - projectedFinalCost = actualCost + costToComplete
   */
  @Post('budget-detail')
  @ApiOperation({
    summary: 'Generate Budget Detail Report',
    description: 'Generates Excel report with budget variance analysis',
  })
  @ApiResponse({
    status: 201,
    description: 'Budget Detail Report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project or Budget not found' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async generateBudgetDetail(
    @Param('projectId') projectId: string,
    @Body() dto: Omit<GenerateBudgetDetailReportDto, 'projectId'>,
    @CurrentUser() user: any,
  ): Promise<StreamableFile> {
    this.logger.log(
      `User ${user.id} generating Budget Detail Report for project ${projectId}`,
    );

    const fullDto: GenerateBudgetDetailReportDto = {
      ...dto,
      projectId,
    };

    const buffer = await this.budgetDetailReportService.exportToExcel(fullDto);
    const filename = `budget-detail-report-${projectId}-${Date.now()}.xlsx`;

    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Post('budget-detail/pdf')
  @ApiOperation({
    summary: 'Export Budget Detail Report as PDF',
    description: 'Generates PDF report with budget variance analysis',
  })
  @ApiResponse({
    status: 201,
    description: 'Budget Detail PDF Report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project or Budget not found' })
  @ApiProduces('application/pdf')
  @Header('Content-Type', 'application/pdf')
  async exportBudgetDetailToPdf(
    @Param('projectId') projectId: string,
    @Body() dto: Omit<GenerateBudgetDetailReportDto, 'projectId'>,
    @CurrentUser() user: any,
  ): Promise<StreamableFile> {
    this.logger.log(
      `User ${user.id} exporting Budget Detail Report as PDF for project ${projectId}`,
    );

    const fullDto: GenerateBudgetDetailReportDto = {
      ...dto,
      projectId,
    };

    const data = await this.budgetDetailReportService.generateReport(fullDto);
    const buffer = await this.pdfExportService.exportBudgetDetailToPdf(data);
    const filename = `budget-detail-report-${projectId}-${new Date().toISOString().split('T')[0]}.pdf`;

    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  /**
   * Generate WIP Report
   *
   * Generates Work in Progress report using Percentage of Completion method.
   * Shows over/under billing analysis for construction projects.
   *
   * Business Logic (Percentage of Completion Method):
   * - percentComplete = (actualCost / revisedBudget) * 100
   * - earnedRevenue = (percentComplete / 100) * contractValue
   * - billedToDate = sum of payment applications
   * - underOverBilling = earnedRevenue - billedToDate
   *   - Positive = Under billed (earned more than billed)
   *   - Negative = Over billed (billed more than earned)
   * - estimatedProfit = totalEarnedRevenue - totalActualCost
   */
  @Post('wip')
  @ApiOperation({
    summary: 'Generate WIP Report',
    description: 'Generates Excel report with Work in Progress analysis',
  })
  @ApiResponse({
    status: 201,
    description: 'WIP Report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project or Budget not found' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async generateWIP(
    @Param('projectId') projectId: string,
    @Body() dto: Omit<GenerateWIPReportDto, 'projectId'>,
    @CurrentUser() user: any,
  ): Promise<StreamableFile> {
    this.logger.log(
      `User ${user.id} generating WIP Report for project ${projectId}`,
    );

    const fullDto: GenerateWIPReportDto = {
      ...dto,
      projectId,
    };

    const buffer = await this.wipReportService.exportToExcel(fullDto);
    const filename = `wip-report-${projectId}-${Date.now()}.xlsx`;

    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Post('wip/pdf')
  @ApiOperation({
    summary: 'Export WIP Report as PDF',
    description: 'Generates PDF report with Work in Progress analysis',
  })
  @ApiResponse({
    status: 201,
    description: 'WIP PDF Report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project or Budget not found' })
  @ApiProduces('application/pdf')
  @Header('Content-Type', 'application/pdf')
  async exportWIPToPdf(
    @Param('projectId') projectId: string,
    @Body() dto: Omit<GenerateWIPReportDto, 'projectId'>,
    @CurrentUser() user: any,
  ): Promise<StreamableFile> {
    this.logger.log(
      `User ${user.id} exporting WIP Report as PDF for project ${projectId}`,
    );

    const fullDto: GenerateWIPReportDto = {
      ...dto,
      projectId,
    };

    const data = await this.wipReportService.generateReport(fullDto);
    const buffer = await this.pdfExportService.exportWIPToPdf(data);
    const filename = `wip-report-${projectId}-${new Date().toISOString().split('T')[0]}.pdf`;

    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  /**
   * Generate Cost to Complete Report
   *
   * Generates Estimate at Completion (EAC) and Estimate to Complete (ETC) projections.
   * Uses Earned Value Management (EVM) techniques.
   *
   * Business Logic:
   * - earnedValue = (percentComplete / 100) * revisedBudget
   * - CPI (Cost Performance Index) = earnedValue / actualCost
   * - ETC (Estimate to Complete) = (revisedBudget - earnedValue) / CPI
   * - EAC (Estimate at Completion) = actualCost + ETC
   * - VAC (Variance at Completion) = revisedBudget - EAC
   * - TCPI (To Complete Performance Index) = (revisedBudget - earnedValue) / (revisedBudget - actualCost)
   */
  @Post('cost-to-complete')
  @ApiOperation({
    summary: 'Generate Cost to Complete Report',
    description: 'Generates Excel report with EAC/ETC projections',
  })
  @ApiResponse({
    status: 201,
    description: 'Cost to Complete Report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project or Budget not found' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async generateCostToComplete(
    @Param('projectId') projectId: string,
    @Body() dto: Omit<GenerateCostToCompleteReportDto, 'projectId'>,
    @CurrentUser() user: any,
  ): Promise<StreamableFile> {
    this.logger.log(
      `User ${user.id} generating Cost to Complete Report for project ${projectId}`,
    );

    const fullDto: GenerateCostToCompleteReportDto = {
      ...dto,
      projectId,
    };

    const buffer = await this.costToCompleteReportService.exportToExcel(fullDto);
    const filename = `cost-to-complete-report-${projectId}-${Date.now()}.xlsx`;

    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Post('cost-to-complete/pdf')
  @ApiOperation({
    summary: 'Export Cost to Complete Report as PDF',
    description: 'Generates PDF report with EAC/ETC projections',
  })
  @ApiResponse({
    status: 201,
    description: 'Cost to Complete PDF Report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project or Budget not found' })
  @ApiProduces('application/pdf')
  @Header('Content-Type', 'application/pdf')
  async exportCostToCompleteToPdf(
    @Param('projectId') projectId: string,
    @Body() dto: Omit<GenerateCostToCompleteReportDto, 'projectId'>,
    @CurrentUser() user: any,
  ): Promise<StreamableFile> {
    this.logger.log(
      `User ${user.id} exporting Cost to Complete Report as PDF for project ${projectId}`,
    );

    const fullDto: GenerateCostToCompleteReportDto = {
      ...dto,
      projectId,
    };

    const data = await this.costToCompleteReportService.generateReport(fullDto);
    const buffer = await this.pdfExportService.exportCostToCompleteToPdf(data);
    const filename = `cost-to-complete-report-${projectId}-${new Date().toISOString().split('T')[0]}.pdf`;

    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  /**
   * Generate Commitment List Report
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
  @Post('commitment-list')
  @ApiOperation({
    summary: 'Generate Commitment List Report',
    description: 'Generates Excel report with all commitments',
  })
  @ApiResponse({
    status: 201,
    description: 'Commitment List Report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async generateCommitmentList(
    @Param('projectId') projectId: string,
    @Body() dto: Omit<GenerateCommitmentListReportDto, 'projectId'>,
    @CurrentUser() user: any,
  ): Promise<StreamableFile> {
    this.logger.log(
      `User ${user.id} generating Commitment List Report for project ${projectId}`,
    );

    const fullDto: GenerateCommitmentListReportDto = {
      ...dto,
      projectId,
    };

    const buffer = await this.commitmentListReportService.exportToExcel(fullDto);
    const filename = `commitment-list-report-${projectId}-${Date.now()}.xlsx`;

    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Post('commitment-list/pdf')
  @ApiOperation({
    summary: 'Export Commitment List Report as PDF',
    description: 'Generates PDF report with all commitments',
  })
  @ApiResponse({
    status: 201,
    description: 'Commitment List PDF Report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiProduces('application/pdf')
  @Header('Content-Type', 'application/pdf')
  async exportCommitmentListToPdf(
    @Param('projectId') projectId: string,
    @Body() dto: Omit<GenerateCommitmentListReportDto, 'projectId'>,
    @CurrentUser() user: any,
  ): Promise<StreamableFile> {
    this.logger.log(
      `User ${user.id} exporting Commitment List Report as PDF for project ${projectId}`,
    );

    const fullDto: GenerateCommitmentListReportDto = {
      ...dto,
      projectId,
    };

    const data = await this.commitmentListReportService.generateReport(fullDto);
    const buffer = await this.pdfExportService.exportCommitmentListToPdf(data);
    const filename = `commitment-list-report-${projectId}-${new Date().toISOString().split('T')[0]}.pdf`;

    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  // ==================== Phase 2 Reports ====================

  /**
   * Generate Earned Value Analysis Report
   *
   * Generates comprehensive EVM report with complete metrics, cost code breakdown,
   * and monthly trend analysis for tracking project performance over time.
   *
   * Includes 12 EVM metrics: BAC, PV, EV, AC, CV, SV, CPI, SPI, EAC, ETC, VAC, TCPI
   */
  @Post('earned-value-analysis')
  @ApiOperation({
    summary: 'Generate Earned Value Analysis Report',
    description: 'Generates Excel report with complete EVM metrics and trend analysis',
  })
  @ApiResponse({
    status: 201,
    description: 'Earned Value Analysis Report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project or Budget not found' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async generateEarnedValueAnalysis(
    @Param('projectId') projectId: string,
    @Body() dto: { budgetId?: string; asOfDate?: Date },
    @CurrentUser() user: any,
  ): Promise<StreamableFile> {
    this.logger.log(
      `User ${user.id} generating Earned Value Analysis Report for project ${projectId}`,
    );

    const reportData = await this.earnedValueAnalysisReportService.generate({
      projectId,
      ...dto,
    });

    const buffer = await this.excelExportService.exportEarnedValueAnalysisToExcel(reportData);
    const filename = `earned-value-analysis-${projectId}-${Date.now()}.xlsx`;

    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Post('earned-value-analysis/pdf')
  @ApiOperation({
    summary: 'Export Earned Value Analysis Report as PDF',
    description: 'Generates PDF report with complete EVM metrics and trend analysis',
  })
  @ApiResponse({
    status: 201,
    description: 'Earned Value Analysis PDF Report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project or Budget not found' })
  @ApiProduces('application/pdf')
  @Header('Content-Type', 'application/pdf')
  async exportEarnedValueAnalysisToPdf(
    @Param('projectId') projectId: string,
    @Body() dto: { budgetId?: string; asOfDate?: Date },
    @CurrentUser() user: any,
  ): Promise<StreamableFile> {
    this.logger.log(
      `User ${user.id} exporting Earned Value Analysis Report as PDF for project ${projectId}`,
    );

    const reportData = await this.earnedValueAnalysisReportService.generate({
      projectId,
      ...dto,
    });

    const buffer = await this.pdfExportService.exportEarnedValueAnalysisToPdf(reportData);
    const filename = `earned-value-analysis-${projectId}-${new Date().toISOString().split('T')[0]}.pdf`;

    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  /**
   * Generate Cash Flow Projection Report
   *
   * Projects future cash inflows and outflows with monthly breakdowns, peak cash
   * requirement analysis, and commitment-level payment schedules.
   */
  @Post('cash-flow-projection')
  @ApiOperation({
    summary: 'Generate Cash Flow Projection Report',
    description: 'Generates Excel report with cash flow projections and peak requirement analysis',
  })
  @ApiResponse({
    status: 201,
    description: 'Cash Flow Projection Report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async generateCashFlowProjection(
    @Param('projectId') projectId: string,
    @Body() dto: { startDate?: Date; endDate?: Date; asOfDate?: Date },
    @CurrentUser() user: any,
  ): Promise<StreamableFile> {
    this.logger.log(
      `User ${user.id} generating Cash Flow Projection Report for project ${projectId}`,
    );

    const reportData = await this.cashFlowProjectionReportService.generate({
      projectId,
      ...dto,
    });

    const buffer = await this.excelExportService.exportCashFlowProjectionToExcel(reportData);
    const filename = `cash-flow-projection-${projectId}-${Date.now()}.xlsx`;

    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Post('cash-flow-projection/pdf')
  @ApiOperation({
    summary: 'Export Cash Flow Projection Report as PDF',
    description: 'Generates PDF report with cash flow projections and peak requirement analysis',
  })
  @ApiResponse({
    status: 201,
    description: 'Cash Flow Projection PDF Report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiProduces('application/pdf')
  @Header('Content-Type', 'application/pdf')
  async exportCashFlowProjectionToPdf(
    @Param('projectId') projectId: string,
    @Body() dto: { startDate?: Date; endDate?: Date; asOfDate?: Date },
    @CurrentUser() user: any,
  ): Promise<StreamableFile> {
    this.logger.log(
      `User ${user.id} exporting Cash Flow Projection Report as PDF for project ${projectId}`,
    );

    const reportData = await this.cashFlowProjectionReportService.generate({
      projectId,
      ...dto,
    });

    const buffer = await this.pdfExportService.exportCashFlowProjectionToPdf(reportData);
    const filename = `cash-flow-projection-${projectId}-${new Date().toISOString().split('T')[0]}.pdf`;

    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  /**
   * Generate Invoice Register Report
   *
   * Comprehensive invoice tracking with aging analysis for both payable
   * (to vendors) and receivable (from owner) invoices.
   */
  @Post('invoice-register')
  @ApiOperation({
    summary: 'Generate Invoice Register Report',
    description: 'Generates Excel report with invoice tracking and aging analysis',
  })
  @ApiResponse({
    status: 201,
    description: 'Invoice Register Report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async generateInvoiceRegister(
    @Param('projectId') projectId: string,
    @Body() dto: { filterType?: 'PAYABLE' | 'RECEIVABLE'; filterStatus?: string; asOfDate?: Date },
    @CurrentUser() user: any,
  ): Promise<StreamableFile> {
    this.logger.log(
      `User ${user.id} generating Invoice Register Report for project ${projectId}`,
    );

    const reportData = await this.invoiceRegisterReportService.generate({
      projectId,
      ...dto,
    });

    const buffer = await this.excelExportService.exportInvoiceRegisterToExcel(reportData);
    const filename = `invoice-register-${projectId}-${Date.now()}.xlsx`;

    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Post('invoice-register/pdf')
  @ApiOperation({
    summary: 'Export Invoice Register Report as PDF',
    description: 'Generates PDF report with invoice tracking and aging analysis',
  })
  @ApiResponse({
    status: 201,
    description: 'Invoice Register PDF Report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiProduces('application/pdf')
  @Header('Content-Type', 'application/pdf')
  async exportInvoiceRegisterToPdf(
    @Param('projectId') projectId: string,
    @Body() dto: { filterType?: 'PAYABLE' | 'RECEIVABLE'; filterStatus?: string; asOfDate?: Date },
    @CurrentUser() user: any,
  ): Promise<StreamableFile> {
    this.logger.log(
      `User ${user.id} exporting Invoice Register Report as PDF for project ${projectId}`,
    );

    const reportData = await this.invoiceRegisterReportService.generate({
      projectId,
      ...dto,
    });

    const buffer = await this.pdfExportService.exportInvoiceRegisterToPdf(reportData);
    const filename = `invoice-register-${projectId}-${new Date().toISOString().split('T')[0]}.pdf`;

    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  /**
   * Generate Executive Summary Report
   *
   * High-level dashboard with KPIs, financial metrics, risk indicators,
   * and trend data for executive-level decision making.
   */
  @Post('executive-summary')
  @ApiOperation({
    summary: 'Generate Executive Summary Report',
    description: 'Generates Excel report with executive dashboard and KPIs',
  })
  @ApiResponse({
    status: 201,
    description: 'Executive Summary Report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async generateExecutiveSummary(
    @Param('projectId') projectId: string,
    @Body() dto: { asOfDate?: Date },
    @CurrentUser() user: any,
  ): Promise<StreamableFile> {
    this.logger.log(
      `User ${user.id} generating Executive Summary Report for project ${projectId}`,
    );

    const reportData = await this.executiveSummaryReportService.generate({
      projectId,
      ...dto,
    });

    const buffer = await this.excelExportService.exportExecutiveSummaryToExcel(reportData);
    const filename = `executive-summary-${projectId}-${Date.now()}.xlsx`;

    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Post('executive-summary/pdf')
  @ApiOperation({
    summary: 'Export Executive Summary Report as PDF',
    description: 'Generates PDF report with executive dashboard and KPIs',
  })
  @ApiResponse({
    status: 201,
    description: 'Executive Summary PDF Report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiProduces('application/pdf')
  @Header('Content-Type', 'application/pdf')
  async exportExecutiveSummaryToPdf(
    @Param('projectId') projectId: string,
    @Body() dto: { asOfDate?: Date },
    @CurrentUser() user: any,
  ): Promise<StreamableFile> {
    this.logger.log(
      `User ${user.id} exporting Executive Summary Report as PDF for project ${projectId}`,
    );

    const reportData = await this.executiveSummaryReportService.generate({
      projectId,
      ...dto,
    });

    const buffer = await this.pdfExportService.exportExecutiveSummaryToPdf(reportData);
    const filename = `executive-summary-${projectId}-${new Date().toISOString().split('T')[0]}.pdf`;

    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  // ==================== Phase 3 Reports ====================

  /**
   * Generate Budget Variance Report
   *
   * Generates variance-focused analysis highlighting items that are over or under budget,
   * with configurable variance thresholds for exception-based reporting.
   */
  @Post('budget-variance')
  @ApiOperation({
    summary: 'Generate Budget Variance Report',
    description: 'Generates Excel report with variance-focused analysis highlighting over/under budget items',
  })
  @ApiResponse({
    status: 201,
    description: 'Budget Variance Report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project or Budget not found' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async generateBudgetVariance(
    @Param('projectId') projectId: string,
    @Body() dto: { budgetId?: string; asOfDate?: string; varianceThreshold?: number },
    @CurrentUser() user: any,
  ): Promise<StreamableFile> {
    this.logger.log(
      `User ${user.id} generating Budget Variance Report for project ${projectId}`,
    );

    const fullDto = {
      ...dto,
      projectId,
    };

    const buffer = await this.budgetVarianceReportService.exportToExcel(fullDto);
    const filename = `budget-variance-${projectId}-${Date.now()}.xlsx`;

    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Post('budget-variance/pdf')
  @ApiOperation({
    summary: 'Export Budget Variance Report as PDF',
    description: 'Generates PDF report with variance-focused analysis highlighting over/under budget items',
  })
  @ApiResponse({
    status: 201,
    description: 'Budget Variance PDF Report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project or Budget not found' })
  @ApiProduces('application/pdf')
  @Header('Content-Type', 'application/pdf')
  async exportBudgetVarianceToPdf(
    @Param('projectId') projectId: string,
    @Body() dto: { budgetId?: string; asOfDate?: string; varianceThreshold?: number },
    @CurrentUser() user: any,
  ): Promise<StreamableFile> {
    this.logger.log(
      `User ${user.id} exporting Budget Variance Report as PDF for project ${projectId}`,
    );

    const fullDto = {
      ...dto,
      projectId,
    };

    const data = await this.budgetVarianceReportService.generateReport(fullDto);
    const buffer = await this.pdfExportService.exportBudgetVarianceToPdf(data);
    const filename = `budget-variance-${projectId}-${new Date().toISOString().split('T')[0]}.pdf`;

    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  /**
   * Generate Commitment Status Report
   *
   * Generates comprehensive commitment status tracking by vendor with detailed
   * breakdowns of all financial states and vendor-specific metrics.
   */
  @Post('commitment-status')
  @ApiOperation({
    summary: 'Generate Commitment Status Report',
    description: 'Generates Excel report with comprehensive commitment status tracking by vendor',
  })
  @ApiResponse({
    status: 201,
    description: 'Commitment Status Report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async generateCommitmentStatus(
    @Param('projectId') projectId: string,
    @Body() dto: { asOfDate?: string; vendorName?: string },
    @CurrentUser() user: any,
  ): Promise<StreamableFile> {
    this.logger.log(
      `User ${user.id} generating Commitment Status Report for project ${projectId}`,
    );

    const fullDto = {
      ...dto,
      projectId,
    };

    const buffer = await this.commitmentStatusReportService.exportToExcel(fullDto);
    const filename = `commitment-status-${projectId}-${Date.now()}.xlsx`;

    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Post('commitment-status/pdf')
  @ApiOperation({
    summary: 'Export Commitment Status Report as PDF',
    description: 'Generates PDF report with comprehensive commitment status tracking by vendor',
  })
  @ApiResponse({
    status: 201,
    description: 'Commitment Status PDF Report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiProduces('application/pdf')
  @Header('Content-Type', 'application/pdf')
  async exportCommitmentStatusToPdf(
    @Param('projectId') projectId: string,
    @Body() dto: { asOfDate?: string; vendorName?: string },
    @CurrentUser() user: any,
  ): Promise<StreamableFile> {
    this.logger.log(
      `User ${user.id} exporting Commitment Status Report as PDF for project ${projectId}`,
    );

    const fullDto = {
      ...dto,
      projectId,
    };

    const data = await this.commitmentStatusReportService.generateReport(fullDto);
    const buffer = await this.pdfExportService.exportCommitmentStatusToPdf(data);
    const filename = `commitment-status-${projectId}-${new Date().toISOString().split('T')[0]}.pdf`;

    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  /**
   * Generate Payment History Report
   *
   * Generates chronological payment application tracking showing the complete
   * history of all payment applications and their status.
   */
  @Post('payment-history')
  @ApiOperation({
    summary: 'Generate Payment History Report',
    description: 'Generates Excel report with chronological payment application tracking',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment History Report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async generatePaymentHistory(
    @Param('projectId') projectId: string,
    @Body() dto: { vendorName?: string; startDate?: string; endDate?: string },
    @CurrentUser() user: any,
  ): Promise<StreamableFile> {
    this.logger.log(
      `User ${user.id} generating Payment History Report for project ${projectId}`,
    );

    const fullDto = {
      ...dto,
      projectId,
    };

    const buffer = await this.paymentHistoryReportService.exportToExcel(fullDto);
    const filename = `payment-history-${projectId}-${Date.now()}.xlsx`;

    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Post('payment-history/pdf')
  @ApiOperation({
    summary: 'Export Payment History Report as PDF',
    description: 'Generates PDF report with chronological payment application tracking',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment History PDF Report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiProduces('application/pdf')
  @Header('Content-Type', 'application/pdf')
  async exportPaymentHistoryToPdf(
    @Param('projectId') projectId: string,
    @Body() dto: { vendorName?: string; startDate?: string; endDate?: string },
    @CurrentUser() user: any,
  ): Promise<StreamableFile> {
    this.logger.log(
      `User ${user.id} exporting Payment History Report as PDF for project ${projectId}`,
    );

    const fullDto = {
      ...dto,
      projectId,
    };

    const data = await this.paymentHistoryReportService.generateReport(fullDto);
    const buffer = await this.pdfExportService.exportPaymentHistoryToPdf(data);
    const filename = `payment-history-${projectId}-${new Date().toISOString().split('T')[0]}.pdf`;

    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  /**
   * Generate Aging Report
   *
   * Generates AR/AP aging analysis with standard aging buckets (current, 30, 60, 90+)
   * for tracking outstanding invoices and payment obligations.
   */
  @Post('aging')
  @ApiOperation({
    summary: 'Generate Aging Report',
    description: 'Generates Excel report with AR/AP aging analysis and standard aging buckets',
  })
  @ApiResponse({
    status: 201,
    description: 'Aging Report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async generateAging(
    @Param('projectId') projectId: string,
    @Body() dto: { asOfDate?: string; vendorName?: string },
    @CurrentUser() user: any,
  ): Promise<StreamableFile> {
    this.logger.log(
      `User ${user.id} generating Aging Report for project ${projectId}`,
    );

    const fullDto = {
      ...dto,
      projectId,
      reportType: 'AP' as any,
    };

    const buffer = await this.agingReportService.exportToExcel(fullDto);
    const filename = `aging-report-${projectId}-${Date.now()}.xlsx`;

    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Post('aging/pdf')
  @ApiOperation({
    summary: 'Export Aging Report as PDF',
    description: 'Generates PDF report with AR/AP aging analysis and standard aging buckets',
  })
  @ApiResponse({
    status: 201,
    description: 'Aging PDF Report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiProduces('application/pdf')
  @Header('Content-Type', 'application/pdf')
  async exportAgingToPdf(
    @Param('projectId') projectId: string,
    @Body() dto: { asOfDate?: string; vendorName?: string },
    @CurrentUser() user: any,
  ): Promise<StreamableFile> {
    this.logger.log(
      `User ${user.id} exporting Aging Report as PDF for project ${projectId}`,
    );

    const fullDto = {
      ...dto,
      projectId,
    };

    const data = await this.agingReportService.generateReport(fullDto);
    const buffer = await this.pdfExportService.exportAgingToPdf(data);
    const filename = `aging-report-${projectId}-${new Date().toISOString().split('T')[0]}.pdf`;

    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  /**
   * Generate Change Order Log Report
   *
   * Generates complete audit trail of all change orders with detailed tracking
   * of status, approvals, and financial impacts.
   */
  @Post('change-order-log')
  @ApiOperation({
    summary: 'Generate Change Order Log Report',
    description: 'Generates Excel report with complete audit trail of all change orders',
  })
  @ApiResponse({
    status: 201,
    description: 'Change Order Log Report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async generateChangeOrderLog(
    @Param('projectId') projectId: string,
    @Body() dto: { changeOrderType?: string; status?: string; startDate?: string; endDate?: string },
    @CurrentUser() user: any,
  ): Promise<StreamableFile> {
    this.logger.log(
      `User ${user.id} generating Change Order Log Report for project ${projectId}`,
    );

    const fullDto = {
      ...dto,
      projectId,
    };

    const buffer = await this.changeOrderLogReportService.exportToExcel(fullDto);
    const filename = `change-order-log-${projectId}-${Date.now()}.xlsx`;

    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Post('change-order-log/pdf')
  @ApiOperation({
    summary: 'Export Change Order Log Report as PDF',
    description: 'Generates PDF report with complete audit trail of all change orders',
  })
  @ApiResponse({
    status: 201,
    description: 'Change Order Log PDF Report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiProduces('application/pdf')
  @Header('Content-Type', 'application/pdf')
  async exportChangeOrderLogToPdf(
    @Param('projectId') projectId: string,
    @Body() dto: { changeOrderType?: string; status?: string; startDate?: string; endDate?: string },
    @CurrentUser() user: any,
  ): Promise<StreamableFile> {
    this.logger.log(
      `User ${user.id} exporting Change Order Log Report as PDF for project ${projectId}`,
    );

    const fullDto = {
      ...dto,
      projectId,
    };

    const data = await this.changeOrderLogReportService.generateReport(fullDto);
    const buffer = await this.pdfExportService.exportChangeOrderLogToPdf(data);
    const filename = `change-order-log-${projectId}-${new Date().toISOString().split('T')[0]}.pdf`;

    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  /**
   * Generate Change Order Summary Report
   *
   * Generates executive-level change order metrics with approval rates, impacts,
   * and aggregate statistics for management oversight.
   */
  @Post('change-order-summary')
  @ApiOperation({
    summary: 'Generate Change Order Summary Report',
    description: 'Generates Excel report with executive-level change order metrics and approval rates',
  })
  @ApiResponse({
    status: 201,
    description: 'Change Order Summary Report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async generateChangeOrderSummary(
    @Param('projectId') projectId: string,
    @Body() dto: { asOfDate?: string },
    @CurrentUser() user: any,
  ): Promise<StreamableFile> {
    this.logger.log(
      `User ${user.id} generating Change Order Summary Report for project ${projectId}`,
    );

    const fullDto = {
      ...dto,
      projectId,
    };

    const buffer = await this.changeOrderSummaryReportService.exportToExcel(fullDto);
    const filename = `change-order-summary-${projectId}-${Date.now()}.xlsx`;

    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Post('change-order-summary/pdf')
  @ApiOperation({
    summary: 'Export Change Order Summary Report as PDF',
    description: 'Generates PDF report with executive-level change order metrics and approval rates',
  })
  @ApiResponse({
    status: 201,
    description: 'Change Order Summary PDF Report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiProduces('application/pdf')
  @Header('Content-Type', 'application/pdf')
  async exportChangeOrderSummaryToPdf(
    @Param('projectId') projectId: string,
    @Body() dto: { asOfDate?: string },
    @CurrentUser() user: any,
  ): Promise<StreamableFile> {
    this.logger.log(
      `User ${user.id} exporting Change Order Summary Report as PDF for project ${projectId}`,
    );

    const fullDto = {
      ...dto,
      projectId,
    };

    const data = await this.changeOrderSummaryReportService.generateReport(fullDto);
    const buffer = await this.pdfExportService.exportChangeOrderSummaryToPdf(data);
    const filename = `change-order-summary-${projectId}-${new Date().toISOString().split('T')[0]}.pdf`;

    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  /**
   * Generate Subcontractor Summary Report
   *
   * Generates vendor performance metrics and contract tracking with detailed
   * financial summaries by subcontractor.
   */
  @Post('subcontractor-summary')
  @ApiOperation({
    summary: 'Generate Subcontractor Summary Report',
    description: 'Generates Excel report with vendor performance metrics and contract tracking',
  })
  @ApiResponse({
    status: 201,
    description: 'Subcontractor Summary Report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async generateSubcontractorSummary(
    @Param('projectId') projectId: string,
    @Body() dto: { asOfDate?: string; vendorName?: string },
    @CurrentUser() user: any,
  ): Promise<StreamableFile> {
    this.logger.log(
      `User ${user.id} generating Subcontractor Summary Report for project ${projectId}`,
    );

    const fullDto = {
      ...dto,
      projectId,
    };

    const buffer = await this.subcontractorSummaryReportService.exportToExcel(fullDto);
    const filename = `subcontractor-summary-${projectId}-${Date.now()}.xlsx`;

    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Post('subcontractor-summary/pdf')
  @ApiOperation({
    summary: 'Export Subcontractor Summary Report as PDF',
    description: 'Generates PDF report with vendor performance metrics and contract tracking',
  })
  @ApiResponse({
    status: 201,
    description: 'Subcontractor Summary PDF Report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiProduces('application/pdf')
  @Header('Content-Type', 'application/pdf')
  async exportSubcontractorSummaryToPdf(
    @Param('projectId') projectId: string,
    @Body() dto: { asOfDate?: string; vendorName?: string },
    @CurrentUser() user: any,
  ): Promise<StreamableFile> {
    this.logger.log(
      `User ${user.id} exporting Subcontractor Summary Report as PDF for project ${projectId}`,
    );

    const fullDto = {
      ...dto,
      projectId,
    };

    const data = await this.subcontractorSummaryReportService.generateReport(fullDto);
    const buffer = await this.pdfExportService.exportSubcontractorSummaryToPdf(data);
    const filename = `subcontractor-summary-${projectId}-${new Date().toISOString().split('T')[0]}.pdf`;

    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  /**
   * Generate Vendor Payments Report
   *
   * Generates payment tracking and days-to-payment analysis showing payment
   * performance metrics and vendor-specific payment patterns.
   */
  @Post('vendor-payments')
  @ApiOperation({
    summary: 'Generate Vendor Payments Report',
    description: 'Generates Excel report with payment tracking and days-to-payment analysis',
  })
  @ApiResponse({
    status: 201,
    description: 'Vendor Payments Report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async generateVendorPayments(
    @Param('projectId') projectId: string,
    @Body() dto: { vendorName?: string; startDate?: string; endDate?: string },
    @CurrentUser() user: any,
  ): Promise<StreamableFile> {
    this.logger.log(
      `User ${user.id} generating Vendor Payments Report for project ${projectId}`,
    );

    const fullDto = {
      ...dto,
      projectId,
    };

    const buffer = await this.vendorPaymentsReportService.exportToExcel(fullDto);
    const filename = `vendor-payments-${projectId}-${Date.now()}.xlsx`;

    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Post('vendor-payments/pdf')
  @ApiOperation({
    summary: 'Export Vendor Payments Report as PDF',
    description: 'Generates PDF report with payment tracking and days-to-payment analysis',
  })
  @ApiResponse({
    status: 201,
    description: 'Vendor Payments PDF Report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiProduces('application/pdf')
  @Header('Content-Type', 'application/pdf')
  async exportVendorPaymentsToPdf(
    @Param('projectId') projectId: string,
    @Body() dto: { vendorName?: string; startDate?: string; endDate?: string },
    @CurrentUser() user: any,
  ): Promise<StreamableFile> {
    this.logger.log(
      `User ${user.id} exporting Vendor Payments Report as PDF for project ${projectId}`,
    );

    const fullDto = {
      ...dto,
      projectId,
    };

    const data = await this.vendorPaymentsReportService.generateReport(fullDto);
    const buffer = await this.pdfExportService.exportVendorPaymentsToPdf(data);
    const filename = `vendor-payments-${projectId}-${new Date().toISOString().split('T')[0]}.pdf`;

    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  // ==================== Batch Export & Metadata ====================

  /**
   * Batch Export Reports
   *
   * Exports multiple reports simultaneously and packages them into a ZIP file.
   * Supports mixed format exports (both Excel and PDF in the same batch).
   *
   * Request Body Example:
   * {
   *   "reports": [
   *     { "type": "budget-detail", "format": "excel", "params": { "budgetId": "..." } },
   *     { "type": "wip", "format": "pdf", "params": { "budgetId": "..." } },
   *     { "type": "commitment-list", "format": "excel", "params": {} }
   *   ]
   * }
   */
  @Post('batch-export')
  @ApiOperation({
    summary: 'Batch Export Multiple Reports',
    description: 'Exports multiple reports simultaneously and packages them into a ZIP file',
  })
  @ApiResponse({
    status: 201,
    description: 'Batch export completed successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid report types or parameters' })
  @ApiProduces('application/zip')
  @Header('Content-Type', 'application/zip')
  async batchExportReports(
    @Param('projectId') projectId: string,
    @Body() dto: {
      reports: Array<{
        type: string;
        format: 'excel' | 'pdf';
        params?: Record<string, any>;
      }>;
    },
    @CurrentUser() user: any,
  ): Promise<StreamableFile> {
    this.logger.log(
      `User ${user.id} initiating batch export of ${dto.reports.length} reports for project ${projectId}`,
    );

    if (!dto.reports || dto.reports.length === 0) {
      throw new BadRequestException('At least one report must be specified');
    }

    if (dto.reports.length > 20) {
      throw new BadRequestException('Maximum 20 reports allowed per batch export');
    }

    const archiver = require('archiver');
    const { Readable } = require('stream');

    // Create ZIP archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    const buffers: Buffer[] = [];

    archive.on('data', (chunk: Buffer) => buffers.push(chunk));
    archive.on('error', (err: Error) => {
      this.logger.error(`Batch export failed: ${err.message}`, err.stack);
      throw new BadRequestException(`Batch export failed: ${err.message}`);
    });

    // Generate each report and add to archive
    for (let i = 0; i < dto.reports.length; i++) {
      const report = dto.reports[i];
      const { type, format, params = {} } = report;

      try {
        let buffer: Buffer;
        let filename: string;
        const timestamp = new Date().toISOString().split('T')[0];

        // Route to appropriate report service based on type
        switch (type) {
          case 'budget-detail': {
            const fullDto = { ...params, projectId };
            if (format === 'excel') {
              buffer = await this.budgetDetailReportService.exportToExcel(fullDto);
              filename = `budget-detail-${timestamp}.xlsx`;
            } else {
              const data = await this.budgetDetailReportService.generateReport(fullDto);
              buffer = await this.pdfExportService.exportBudgetDetailToPdf(data);
              filename = `budget-detail-${timestamp}.pdf`;
            }
            break;
          }
          case 'wip': {
            const fullDto = { ...params, projectId };
            if (format === 'excel') {
              buffer = await this.wipReportService.exportToExcel(fullDto);
              filename = `wip-${timestamp}.xlsx`;
            } else {
              const data = await this.wipReportService.generateReport(fullDto);
              buffer = await this.pdfExportService.exportWIPToPdf(data);
              filename = `wip-${timestamp}.pdf`;
            }
            break;
          }
          case 'cost-to-complete': {
            const fullDto = { ...params, projectId };
            if (format === 'excel') {
              buffer = await this.costToCompleteReportService.exportToExcel(fullDto);
              filename = `cost-to-complete-${timestamp}.xlsx`;
            } else {
              const data = await this.costToCompleteReportService.generateReport(fullDto);
              buffer = await this.pdfExportService.exportCostToCompleteToPdf(data);
              filename = `cost-to-complete-${timestamp}.pdf`;
            }
            break;
          }
          case 'commitment-list': {
            const fullDto = { ...params, projectId };
            if (format === 'excel') {
              buffer = await this.commitmentListReportService.exportToExcel(fullDto);
              filename = `commitment-list-${timestamp}.xlsx`;
            } else {
              const data = await this.commitmentListReportService.generateReport(fullDto);
              buffer = await this.pdfExportService.exportCommitmentListToPdf(data);
              filename = `commitment-list-${timestamp}.pdf`;
            }
            break;
          }
          case 'executive-summary': {
            const reportData = await this.executiveSummaryReportService.generate({ projectId, ...params });
            if (format === 'excel') {
              buffer = await this.excelExportService.exportExecutiveSummaryToExcel(reportData);
              filename = `executive-summary-${timestamp}.xlsx`;
            } else {
              buffer = await this.pdfExportService.exportExecutiveSummaryToPdf(reportData);
              filename = `executive-summary-${timestamp}.pdf`;
            }
            break;
          }
          default:
            this.logger.warn(`Unknown report type: ${type}, skipping`);
            continue;
        }

        // Add report to archive
        archive.append(buffer, { name: filename });
        this.logger.log(`Added ${filename} to batch export`);
      } catch (error) {
        this.logger.error(`Failed to generate report ${type}: ${(error as Error).message}`);
        // Continue with other reports even if one fails
      }
    }

    // Finalize archive
    await archive.finalize();

    const zipBuffer = Buffer.concat(buffers);
    const zipFilename = `reports-batch-${projectId}-${Date.now()}.zip`;

    this.logger.log(`Batch export completed: ${zipFilename} (${zipBuffer.length} bytes)`);

    return new StreamableFile(Readable.from(zipBuffer), {
      type: 'application/zip',
      disposition: `attachment; filename="${zipFilename}"`,
    });
  }

  /**
   * Get Available Report Types
   *
   * Returns metadata about all available report types including:
   * - Report type identifier
   * - Display name
   * - Description
   * - Category (Phase 1, 2, or 3)
   * - Supported formats (Excel, PDF)
   * - Required/optional parameters
   */
  @Get('metadata/types')
  @ApiOperation({
    summary: 'List Available Report Types',
    description: 'Returns metadata about all available report types with descriptions and parameters',
  })
  @ApiResponse({
    status: 200,
    description: 'Report types retrieved successfully',
  })
  async getReportTypes(): Promise<{
    reportTypes: Array<{
      type: string;
      name: string;
      description: string;
      category: string;
      formats: string[];
      parameters: {
        required: string[];
        optional: string[];
      };
    }>;
  }> {
    return {
      reportTypes: [
        // Phase 1 Reports
        {
          type: 'budget-detail',
          name: 'Budget Detail Report',
          description: 'Comprehensive budget variance analysis with actual vs budgeted costs',
          category: 'Phase 1 - Core Financial Reports',
          formats: ['excel', 'pdf'],
          parameters: {
            required: ['budgetId'],
            optional: ['asOfDate'],
          },
        },
        {
          type: 'wip',
          name: 'Work in Progress (WIP) Report',
          description: 'Work in Progress analysis using Percentage of Completion method',
          category: 'Phase 1 - Core Financial Reports',
          formats: ['excel', 'pdf'],
          parameters: {
            required: ['budgetId'],
            optional: ['asOfDate'],
          },
        },
        {
          type: 'cost-to-complete',
          name: 'Cost to Complete Report',
          description: 'EAC/ETC projections using Earned Value Management techniques',
          category: 'Phase 1 - Core Financial Reports',
          formats: ['excel', 'pdf'],
          parameters: {
            required: ['budgetId'],
            optional: ['asOfDate'],
          },
        },
        {
          type: 'commitment-list',
          name: 'Commitment List Report',
          description: 'Comprehensive list of all commitments with detailed financial tracking',
          category: 'Phase 1 - Core Financial Reports',
          formats: ['excel', 'pdf'],
          parameters: {
            required: [],
            optional: ['asOfDate'],
          },
        },
        // Phase 2 Reports
        {
          type: 'earned-value-analysis',
          name: 'Earned Value Analysis Report',
          description: 'Complete EVM metrics with trend analysis (BAC, PV, EV, AC, CV, SV, CPI, SPI, EAC, ETC, VAC, TCPI)',
          category: 'Phase 2 - Advanced Analytics',
          formats: ['excel', 'pdf'],
          parameters: {
            required: [],
            optional: ['budgetId', 'asOfDate'],
          },
        },
        {
          type: 'cash-flow-projection',
          name: 'Cash Flow Projection Report',
          description: 'Cash inflows/outflows with monthly breakdowns and peak requirement analysis',
          category: 'Phase 2 - Advanced Analytics',
          formats: ['excel', 'pdf'],
          parameters: {
            required: [],
            optional: ['startDate', 'endDate', 'asOfDate'],
          },
        },
        {
          type: 'invoice-register',
          name: 'Invoice Register Report',
          description: 'Invoice tracking with aging analysis for AP/AR',
          category: 'Phase 2 - Advanced Analytics',
          formats: ['excel', 'pdf'],
          parameters: {
            required: [],
            optional: ['filterType', 'filterStatus', 'asOfDate'],
          },
        },
        {
          type: 'executive-summary',
          name: 'Executive Summary Report',
          description: 'High-level dashboard with KPIs and risk indicators for executive decision making',
          category: 'Phase 2 - Advanced Analytics',
          formats: ['excel', 'pdf'],
          parameters: {
            required: [],
            optional: ['asOfDate'],
          },
        },
        // Phase 3 Reports
        {
          type: 'budget-variance',
          name: 'Budget Variance Report',
          description: 'Variance-focused analysis highlighting over/under budget items',
          category: 'Phase 3 - Specialized Reports',
          formats: ['excel', 'pdf'],
          parameters: {
            required: [],
            optional: ['budgetId', 'asOfDate', 'varianceThreshold'],
          },
        },
        {
          type: 'commitment-status',
          name: 'Commitment Status Report',
          description: 'Comprehensive commitment status tracking by vendor',
          category: 'Phase 3 - Specialized Reports',
          formats: ['excel', 'pdf'],
          parameters: {
            required: [],
            optional: ['asOfDate', 'vendorName'],
          },
        },
        {
          type: 'payment-history',
          name: 'Payment History Report',
          description: 'Chronological payment application tracking',
          category: 'Phase 3 - Specialized Reports',
          formats: ['excel', 'pdf'],
          parameters: {
            required: [],
            optional: ['vendorName', 'startDate', 'endDate'],
          },
        },
        {
          type: 'aging',
          name: 'Aging Report',
          description: 'AR/AP aging analysis with standard aging buckets (0-30, 31-60, 61-90, 90+)',
          category: 'Phase 3 - Specialized Reports',
          formats: ['excel', 'pdf'],
          parameters: {
            required: [],
            optional: ['asOfDate', 'vendorName'],
          },
        },
        {
          type: 'change-order-log',
          name: 'Change Order Log Report',
          description: 'Complete audit trail of all change orders',
          category: 'Phase 3 - Specialized Reports',
          formats: ['excel', 'pdf'],
          parameters: {
            required: [],
            optional: ['changeOrderType', 'status', 'startDate', 'endDate'],
          },
        },
        {
          type: 'change-order-summary',
          name: 'Change Order Summary Report',
          description: 'Executive-level change order metrics and approval rates',
          category: 'Phase 3 - Specialized Reports',
          formats: ['excel', 'pdf'],
          parameters: {
            required: [],
            optional: ['asOfDate'],
          },
        },
        {
          type: 'subcontractor-summary',
          name: 'Subcontractor Summary Report',
          description: 'Vendor performance metrics and contract tracking',
          category: 'Phase 3 - Specialized Reports',
          formats: ['excel', 'pdf'],
          parameters: {
            required: [],
            optional: ['asOfDate', 'vendorName'],
          },
        },
        {
          type: 'vendor-payments',
          name: 'Vendor Payments Report',
          description: 'Payment tracking and days-to-payment analysis',
          category: 'Phase 3 - Specialized Reports',
          formats: ['excel', 'pdf'],
          parameters: {
            required: [],
            optional: ['vendorName', 'startDate', 'endDate'],
          },
        },
      ],
    };
  }

  /**
   * Get Report Schema
   *
   * Returns the schema/configuration for a specific report type including:
   * - Parameter definitions with types and descriptions
   * - Default values
   * - Validation rules
   * - Example request payloads
   */
  @Get('metadata/:reportType/schema')
  @ApiOperation({
    summary: 'Get Report Schema',
    description: 'Returns detailed schema and configuration for a specific report type',
  })
  @ApiResponse({
    status: 200,
    description: 'Report schema retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Report type not found' })
  async getReportSchema(
    @Param('reportType') reportType: string,
  ): Promise<{
    reportType: string;
    schema: {
      parameters: Record<string, {
        type: string;
        required: boolean;
        description: string;
        default?: any;
        enum?: string[];
      }>;
      examplePayload: Record<string, any>;
    };
  }> {
    // Define schemas for each report type
    const schemas: Record<string, any> = {
      'budget-detail': {
        parameters: {
          budgetId: {
            type: 'string',
            required: true,
            description: 'Budget ID to generate report for',
          },
          asOfDate: {
            type: 'Date',
            required: false,
            description: 'Report as-of date (defaults to current date)',
            default: new Date().toISOString(),
          },
        },
        examplePayload: {
          budgetId: '123e4567-e89b-12d3-a456-426614174000',
          asOfDate: '2025-12-10',
        },
      },
      'executive-summary': {
        parameters: {
          asOfDate: {
            type: 'Date',
            required: false,
            description: 'Report as-of date (defaults to current date)',
            default: new Date().toISOString(),
          },
        },
        examplePayload: {
          asOfDate: '2025-12-10',
        },
      },
      'budget-variance': {
        parameters: {
          budgetId: {
            type: 'string',
            required: false,
            description: 'Budget ID (defaults to active budget)',
          },
          asOfDate: {
            type: 'string',
            required: false,
            description: 'Report as-of date',
          },
          varianceThreshold: {
            type: 'number',
            required: false,
            description: 'Variance threshold percentage for exception reporting (default: 10%)',
            default: 10,
          },
        },
        examplePayload: {
          varianceThreshold: 10,
          asOfDate: '2025-12-10',
        },
      },
      'cash-flow-projection': {
        parameters: {
          startDate: {
            type: 'Date',
            required: false,
            description: 'Projection start date (defaults to current date)',
          },
          endDate: {
            type: 'Date',
            required: false,
            description: 'Projection end date (defaults to 6 months from start)',
          },
          asOfDate: {
            type: 'Date',
            required: false,
            description: 'Report as-of date',
          },
        },
        examplePayload: {
          startDate: '2025-01-01',
          endDate: '2025-12-31',
        },
      },
      'invoice-register': {
        parameters: {
          filterType: {
            type: 'enum',
            required: false,
            description: 'Filter by invoice type',
            enum: ['PAYABLE', 'RECEIVABLE'],
          },
          filterStatus: {
            type: 'string',
            required: false,
            description: 'Filter by invoice status',
          },
          asOfDate: {
            type: 'Date',
            required: false,
            description: 'Report as-of date',
          },
        },
        examplePayload: {
          filterType: 'PAYABLE',
          filterStatus: 'PENDING',
        },
      },
    };

    const schema = schemas[reportType];
    if (!schema) {
      throw new BadRequestException(`Unknown report type: ${reportType}`);
    }

    return {
      reportType,
      schema,
    };
  }
}
