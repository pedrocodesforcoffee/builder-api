import { Test, TestingModule } from '@nestjs/testing';
import { ReportExcelExportService } from './report-excel-export.service';
import {
  BudgetDetailReportDto,
  WIPReportDto,
  CostToCompleteReportDto,
  CommitmentListReportDto,
} from '../dto/report';

describe('ReportExcelExportService', () => {
  let service: ReportExcelExportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportExcelExportService],
    }).compile();

    service = module.get<ReportExcelExportService>(ReportExcelExportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('exportBudgetDetailToExcel', () => {
    it('should generate Excel buffer for budget detail report', async () => {
      // Arrange
      const mockData: BudgetDetailReportDto = {
        projectId: 'project-123',
        projectName: 'Test Project',
        budgetId: 'budget-123',
        budgetName: 'Test Budget',
        asOfDate: new Date('2024-01-01'),
        totalOriginalBudget: 100000,
        totalChangeOrders: 10000,
        totalRevisedBudget: 110000,
        totalCommittedCost: 90000,
        totalActualCost: 80000,
        totalVariance: 30000,
        totalPercentComplete: 72.73,
        totalCostToComplete: 10000,
        totalProjectedFinalCost: 90000,
        totalProjectedVariance: 20000,
        lines: [
          {
            costCode: '01-100',
            description: 'Site Work',
            originalBudget: 100000,
            changeOrders: 10000,
            revisedBudget: 110000,
            committedCost: 90000,
            actualCost: 80000,
            variance: 30000,
            percentComplete: 72.73,
            costToComplete: 10000,
            projectedFinalCost: 90000,
            projectedVariance: 20000,
          },
        ],
        generatedAt: new Date(),
      };

      // Act
      const buffer = await service.exportBudgetDetailToExcel(mockData);

      // Assert
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('exportWIPToExcel', () => {
    it('should generate Excel buffer for WIP report', async () => {
      // Arrange
      const mockData: WIPReportDto = {
        projectId: 'project-123',
        projectName: 'Test Project',
        asOfDate: new Date('2024-01-01'),
        totalContractValue: 200000,
        totalRevisedBudget: 150000,
        totalActualCost: 120000,
        totalPercentComplete: 80,
        totalEarnedRevenue: 160000,
        totalBilledToDate: 150000,
        totalUnderOverBilling: 10000,
        estimatedProfit: 40000,
        estimatedProfitMargin: 20,
        lines: [
          {
            costCode: '01-100',
            description: 'Site Work',
            contractValue: 200000,
            revisedBudget: 150000,
            actualCost: 120000,
            percentComplete: 80,
            earnedRevenue: 160000,
            billedToDate: 150000,
            underOverBilling: 10000,
          },
        ],
        generatedAt: new Date(),
      };

      // Act
      const buffer = await service.exportWIPToExcel(mockData);

      // Assert
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('exportCostToCompleteToExcel', () => {
    it('should generate Excel buffer for cost to complete report', async () => {
      // Arrange
      const mockData: CostToCompleteReportDto = {
        projectId: 'project-123',
        projectName: 'Test Project',
        budgetId: 'budget-123',
        budgetName: 'Test Budget',
        asOfDate: new Date('2024-01-01'),
        totalRevisedBudget: 100000,
        totalActualCost: 80000,
        totalPercentComplete: 80,
        totalEarnedValue: 80000,
        overallCPI: 1.0,
        totalETC: 20000,
        totalEAC: 100000,
        totalVAC: 0,
        overallTCPI: 1.0,
        lines: [
          {
            costCode: '01-100',
            description: 'Site Work',
            revisedBudget: 100000,
            actualCost: 80000,
            percentComplete: 80,
            earnedValue: 80000,
            cpi: 1.0,
            etc: 20000,
            eac: 100000,
            vac: 0,
            tcpi: 1.0,
          },
        ],
        generatedAt: new Date(),
      };

      // Act
      const buffer = await service.exportCostToCompleteToExcel(mockData);

      // Assert
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('exportCommitmentListToExcel', () => {
    it('should generate Excel buffer for commitment list report', async () => {
      // Arrange
      const mockData: CommitmentListReportDto = {
        projectId: 'project-123',
        projectName: 'Test Project',
        asOfDate: new Date('2024-01-01'),
        filterType: undefined,
        filterStatus: undefined,
        totalOriginalAmount: 100000,
        totalChangeOrders: 10000,
        totalRevisedAmount: 110000,
        totalInvoicedToDate: 80000,
        totalPaidToDate: 70000,
        totalRetentionHeld: 4000,
        totalRemainingBalance: 30000,
        lines: [
          {
            commitmentId: 'commitment-1',
            commitmentNumber: 'SC-001',
            type: 'SUBCONTRACT',
            vendorName: 'Test Vendor',
            costCode: '01-100',
            costCodeDescription: 'Site Work',
            originalAmount: 100000,
            changeOrders: 10000,
            revisedAmount: 110000,
            invoicedToDate: 80000,
            paidToDate: 70000,
            retentionHeld: 4000,
            remainingBalance: 30000,
            status: 'APPROVED',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-12-31'),
          },
        ],
        generatedAt: new Date(),
      };

      // Act
      const buffer = await service.exportCommitmentListToExcel(mockData);

      // Assert
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });
});
