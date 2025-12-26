import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ProjectsModule } from '../projects/projects.module';
import { DocumentsModule } from '../documents/documents.module';
import {
  CostCode,
  Budget,
  BudgetLineItem,
  BudgetSnapshot,
  BudgetAuditLog,
  PrimeContract,
  Commitment,
  CommitmentItem,
  ScheduleOfValues,
  ScheduleOfValuesItem,
  PaymentApplication,
  PaymentApplicationItem,
  LienWaiver,
  PotentialChangeOrder,
  PcoCostTier,
  OwnerChangeOrder,
  OcoCostBreakdown,
  CommitmentChangeOrder,
  CcoLineItem,
  CcoTmEntry,
  ChangeOrderPackage,
  ChangeOrderPackageItem,
  ApprovalThreshold,
  ChangeOrderHistory,
  ChangeOrderDocument,
  CostEntry,
  CostTransfer,
  Accrual,
  CostPeriod,
  CostEntryHistory,
  ReportSchedule,
  CustomReport,
  ReportExecution,
} from './entities';
import { Project } from '../projects/entities/project.entity';
import { User } from '../users/entities/user.entity';
import { CostCodeService } from './services/cost-code.service';
import { BudgetService } from './services/budget.service';
import { BudgetLineItemService } from './services/budget-line-item.service';
import { BudgetAuditService } from './services/budget-audit.service';
import { BudgetCalculationService } from './services/budget-calculation.service';
import { BudgetExportService } from './services/budget-export.service';
import { BudgetImportService } from './services/budget-import.service';
import { PrimeContractService } from './services/prime-contract.service';
import { CommitmentService } from './services/commitment.service';
import { CommitmentItemService } from './services/commitment-item.service';
import { ScheduleOfValuesService } from './services/schedule-of-values.service';
import { PaymentApplicationService } from './services/payment-application.service';
import { PaymentApplicationPdfService } from './services/payment-application-pdf.service';
import { LienWaiverService } from './services/lien-waiver.service';
import { PotentialChangeOrderService } from './services/potential-change-order.service';
import { OwnerChangeOrderService } from './services/owner-change-order.service';
import { CommitmentChangeOrderService } from './services/commitment-change-order.service';
import { ChangeOrderPackageService } from './services/change-order-package.service';
import { ChangeOrderCalculationService } from './services/change-order-calculation.service';
import { ChangeOrderApprovalService } from './services/change-order-approval.service';
import { ChangeOrderDocumentService } from './services/change-order-document.service';
import { CostEntryService } from './services/cost-entry.service';
import { CostTransferService } from './services/cost-transfer.service';
import { AccrualService } from './services/accrual.service';
import { CostPeriodService } from './services/cost-period.service';
import { CostSummaryService } from './services/cost-summary.service';
import { ReportExcelExportService } from './services/report-excel-export.service';
import { ReportPdfExportService } from './services/report-pdf-export.service';
import { BudgetDetailReportService } from './services/budget-detail-report.service';
import { WIPReportService } from './services/wip-report.service';
import { CostToCompleteReportService } from './services/cost-to-complete-report.service';
import { CommitmentListReportService } from './services/commitment-list-report.service';
import { EarnedValueAnalysisReportService } from './services/earned-value-analysis-report.service';
import { CashFlowProjectionReportService } from './services/cash-flow-projection-report.service';
import { InvoiceRegisterReportService } from './services/invoice-register-report.service';
import { ExecutiveSummaryReportService } from './services/executive-summary-report.service';
import { BudgetVarianceReportService } from './services/budget-variance-report.service';
import { CommitmentStatusReportService } from './services/commitment-status-report.service';
import { PaymentHistoryReportService } from './services/payment-history-report.service';
import { AgingReportService } from './services/aging-report.service';
import { ChangeOrderLogReportService } from './services/change-order-log-report.service';
import { ChangeOrderSummaryReportService } from './services/change-order-summary-report.service';
import { SubcontractorSummaryReportService } from './services/subcontractor-summary-report.service';
import { VendorPaymentsReportService } from './services/vendor-payments-report.service';
import { ReportScheduleService } from './services/report-schedule.service';
import { ReportScheduleQueueProcessor } from './services/report-schedule-queue.processor';
import { ReportEmailService } from './services/report-email.service';
import { BudgetController } from './controllers/budget.controller';
import { BudgetLineItemController } from './controllers/budget-line-item.controller';
import { CostCodeController } from './controllers/cost-code.controller';
import { CommitmentController } from './controllers/commitment.controller';
import { CommitmentItemController } from './controllers/commitment-item.controller';
import { CommitmentDocumentController } from './controllers/commitment-document.controller';
import { ScheduleOfValuesController } from './controllers/schedule-of-values.controller';
import { PaymentApplicationController } from './controllers/payment-application.controller';
import { LienWaiverController } from './controllers/lien-waiver.controller';
import { PotentialChangeOrderController } from './controllers/potential-change-order.controller';
import { OwnerChangeOrderController } from './controllers/owner-change-order.controller';
import { CommitmentChangeOrderController } from './controllers/commitment-change-order.controller';
import { ChangeOrderPackageController } from './controllers/change-order-package.controller';
import { ApprovalThresholdController } from './controllers/approval-threshold.controller';
import { ChangeOrderController } from './controllers/change-order.controller';
import { CostEntryController } from './controllers/cost-entry.controller';
import { CostTransferController } from './controllers/cost-transfer.controller';
import { AccrualController } from './controllers/accrual.controller';
import { CostPeriodController } from './controllers/cost-period.controller';
import { ReportController } from './controllers/report.controller';
import { ReportScheduleController } from './controllers/report-schedule.controller';
import { CustomReportController } from './controllers/custom-report.controller';
import { FinancialDashboardController } from './controllers/financial-dashboard.controller';
import { CustomReportService } from './services/custom-report.service';

/**
 * Financials Module
 *
 * Provides financial management functionality including:
 * - Cost code management (CSI MasterFormat compatible)
 * - Budget tracking and management
 * - Prime contracts
 * - Commitments (subcontracts and purchase orders)
 * - Schedule of Values (SOV) management
 * - Payment applications (AIA G702/G703)
 * - Lien waiver tracking
 * - Invoice processing
 * - Change order management
 * - Financial reporting and analytics
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CostCode,
      Budget,
      BudgetLineItem,
      BudgetSnapshot,
      BudgetAuditLog,
      PrimeContract,
      Commitment,
      CommitmentItem,
      ScheduleOfValues,
      ScheduleOfValuesItem,
      PaymentApplication,
      PaymentApplicationItem,
      LienWaiver,
      PotentialChangeOrder,
      PcoCostTier,
      OwnerChangeOrder,
      OcoCostBreakdown,
      CommitmentChangeOrder,
      CcoLineItem,
      CcoTmEntry,
      ChangeOrderPackage,
      ChangeOrderPackageItem,
      ApprovalThreshold,
      ChangeOrderHistory,
      ChangeOrderDocument,
      CostEntry,
      CostTransfer,
      Accrual,
      CostPeriod,
      CostEntryHistory,
      ReportSchedule,
      CustomReport,
      ReportExecution,
      Project,
      User,
    ]),
    ProjectsModule,
    DocumentsModule,
    EventEmitterModule,
    BullModule.registerQueue({
      name: 'report-schedule',
    }),
  ],
  controllers: [
    BudgetController,
    BudgetLineItemController,
    CostCodeController,
    CommitmentController,
    CommitmentItemController,
    CommitmentDocumentController,
    ScheduleOfValuesController,
    PaymentApplicationController,
    LienWaiverController,
    PotentialChangeOrderController,
    OwnerChangeOrderController,
    CommitmentChangeOrderController,
    ChangeOrderPackageController,
    ApprovalThresholdController,
    ChangeOrderController,
    CostEntryController,
    CostTransferController,
    AccrualController,
    CostPeriodController,
    ReportController,
    ReportScheduleController,
    CustomReportController,
    FinancialDashboardController,
  ],
  providers: [
    CostCodeService,
    BudgetService,
    BudgetLineItemService,
    BudgetAuditService,
    BudgetCalculationService,
    BudgetExportService,
    BudgetImportService,
    PrimeContractService,
    CommitmentService,
    CommitmentItemService,
    ScheduleOfValuesService,
    PaymentApplicationService,
    PaymentApplicationPdfService,
    LienWaiverService,
    PotentialChangeOrderService,
    OwnerChangeOrderService,
    CommitmentChangeOrderService,
    ChangeOrderPackageService,
    ChangeOrderCalculationService,
    ChangeOrderApprovalService,
    ChangeOrderDocumentService,
    CostEntryService,
    CostTransferService,
    AccrualService,
    CostPeriodService,
    CostSummaryService,
    ReportExcelExportService,
    ReportPdfExportService,
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
    ReportScheduleService,
    ReportScheduleQueueProcessor,
    ReportEmailService,
    CustomReportService,
  ],
  exports: [
    CostCodeService,
    BudgetService,
    BudgetLineItemService,
    BudgetAuditService,
    BudgetCalculationService,
    BudgetExportService,
    BudgetImportService,
    PrimeContractService,
    CommitmentService,
    CommitmentItemService,
    ScheduleOfValuesService,
    PaymentApplicationService,
    PaymentApplicationPdfService,
    LienWaiverService,
    PotentialChangeOrderService,
    OwnerChangeOrderService,
    CommitmentChangeOrderService,
    ChangeOrderPackageService,
    ChangeOrderCalculationService,
    ChangeOrderApprovalService,
    ChangeOrderDocumentService,
    CostEntryService,
    CostTransferService,
    AccrualService,
    CostPeriodService,
    CostSummaryService,
    ReportExcelExportService,
    ReportPdfExportService,
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
    ReportScheduleService,
    ReportEmailService,
    CustomReportService,
  ],
})
export class FinancialsModule {}
