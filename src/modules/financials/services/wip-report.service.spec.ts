import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { WIPReportService } from './wip-report.service';
import { ReportExcelExportService } from './report-excel-export.service';
import { Budget, BudgetLineItem, CostEntry, CostCode } from '../entities';
import { Project } from '../../projects/entities/project.entity';
import { BudgetStatus } from '../enums/budget-status.enum';
import { CostEntryStatus } from '../enums';

describe('WIPReportService', () => {
  let service: WIPReportService;
  let budgetRepo: Repository<Budget>;
  let budgetLineItemRepo: Repository<BudgetLineItem>;
  let costEntryRepo: Repository<CostEntry>;
  let costCodeRepo: Repository<CostCode>;
  let projectRepo: Repository<Project>;
  let excelExportService: ReportExcelExportService;

  const mockQueryBuilder: any = {
    createQueryBuilder: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WIPReportService,
        {
          provide: getRepositoryToken(Budget),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(BudgetLineItem),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CostEntry),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(CostCode),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: ReportExcelExportService,
          useValue: {
            exportWIPToExcel: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WIPReportService>(WIPReportService);
    budgetRepo = module.get(getRepositoryToken(Budget));
    budgetLineItemRepo = module.get(getRepositoryToken(BudgetLineItem));
    costEntryRepo = module.get(getRepositoryToken(CostEntry));
    costCodeRepo = module.get(getRepositoryToken(CostCode));
    projectRepo = module.get(getRepositoryToken(Project));
    excelExportService = module.get<ReportExcelExportService>(ReportExcelExportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generate', () => {
    const projectId = 'project-123';
    const budgetId = 'budget-123';
    const costCodeId1 = 'costcode-1';
    const costCodeId2 = 'costcode-2';

    const mockProject = {
      id: projectId,
      name: 'Test Project',
    };

    const mockBudget = {
      id: budgetId,
      name: 'Test Budget',
      projectId,
      status: BudgetStatus.ACTIVE,
    };

    const mockCostCode1 = {
      id: costCodeId1,
      code: '01-100',
      description: 'Site Work',
    };

    const mockCostCode2 = {
      id: costCodeId2,
      code: '01-200',
      description: 'Demolition',
    };

    const mockLineItems = [
      {
        id: 'line-1',
        budgetId,
        costCodeId: costCodeId1,
        costCode: mockCostCode1,
        budgetedCost: 100000,
      },
      {
        id: 'line-2',
        budgetId,
        costCodeId: costCodeId2,
        costCode: mockCostCode2,
        budgetedCost: 50000,
      },
    ];

    it('should generate WIP report successfully', async () => {
      // Arrange
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepo, 'find').mockResolvedValue(mockLineItems as any);

      // Mock actual costs aggregation (called twice - once for actualCosts, once for billedToDate)
      jest.spyOn(costEntryRepo, 'createQueryBuilder').mockReturnValue({
        ...mockQueryBuilder,
        getRawMany: jest.fn()
          .mockResolvedValueOnce([
            { costCodeId: costCodeId1, totalActualCost: '80000' },
            { costCodeId: costCodeId2, totalActualCost: '40000' },
          ])
          .mockResolvedValueOnce([
            { costCodeId: costCodeId1, totalActualCost: '80000' },
            { costCodeId: costCodeId2, totalActualCost: '40000' },
          ]),
      } as any);

      // Act
      const result = await service.generate({ projectId });

      // Assert
      expect(result).toBeDefined();
      expect(result.projectId).toBe(projectId);
      expect(result.projectName).toBe('Test Project');
      expect(result.lines).toHaveLength(2);

      // Contract value is 0 (placeholder), so all contract-based values are 0
      expect(result.totalContractValue).toBe(0);
      expect(result.totalRevisedBudget).toBe(150000);
      expect(result.totalActualCost).toBe(120000);
      expect(result.totalPercentComplete).toBeCloseTo(80, 1); // (120000 / 150000) * 100
      expect(result.totalEarnedRevenue).toBe(0);
      expect(result.totalBilledToDate).toBe(108000); // 120000 * 0.9
      expect(result.estimatedProfit).toBe(-120000); // 0 - 120000
    });

    it('should throw NotFoundException if project not found', async () => {
      // Arrange
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.generate({ projectId })).rejects.toThrow(NotFoundException);
      await expect(service.generate({ projectId })).rejects.toThrow(
        `Project ${projectId} not found`,
      );
    });

    it('should throw NotFoundException if no active budget found', async () => {
      // Arrange
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.generate({ projectId })).rejects.toThrow(NotFoundException);
      await expect(service.generate({ projectId })).rejects.toThrow(
        `No active budget found for project ${projectId}`,
      );
    });

    it('should handle budget with no line items', async () => {
      // Arrange
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepo, 'find').mockResolvedValue([]);

      // Act
      const result = await service.generate({ projectId });

      // Assert
      expect(result).toBeDefined();
      expect(result.lines).toHaveLength(0);
      expect(result.totalRevisedBudget).toBe(0);
      expect(result.totalActualCost).toBe(0);
    });

    it('should calculate WIP metrics correctly with actual costs', async () => {
      // Arrange
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepo, 'find').mockResolvedValue(mockLineItems as any);

      jest.spyOn(costEntryRepo, 'createQueryBuilder').mockReturnValue({
        ...mockQueryBuilder,
        getRawMany: jest.fn()
          .mockResolvedValueOnce([
            { costCodeId: costCodeId1, totalActualCost: '75000' },
            { costCodeId: costCodeId2, totalActualCost: '30000' },
          ])
          .mockResolvedValueOnce([
            { costCodeId: costCodeId1, totalActualCost: '75000' },
            { costCodeId: costCodeId2, totalActualCost: '30000' },
          ]),
      } as any);

      // Act
      const result = await service.generate({ projectId });

      // Assert
      // Verify line 1
      expect(result.lines[0].revisedBudget).toBe(100000);
      expect(result.lines[0].actualCost).toBe(75000);
      expect(result.lines[0].percentComplete).toBe(75); // (75000 / 100000) * 100
      expect(result.lines[0].billedToDate).toBe(67500); // 75000 * 0.9

      // Verify totals
      expect(result.totalActualCost).toBe(105000);
      expect(result.totalPercentComplete).toBeCloseTo(70, 1); // (105000 / 150000) * 100
      expect(result.totalBilledToDate).toBe(94500); // 105000 * 0.9
    });

    it('should handle cost codes with no actual costs', async () => {
      // Arrange
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepo, 'find').mockResolvedValue(mockLineItems as any);

      // Mock empty actual costs
      jest.spyOn(costEntryRepo, 'createQueryBuilder').mockReturnValue({
        ...mockQueryBuilder,
        getRawMany: jest.fn().mockResolvedValue([]),
      } as any);

      // Act
      const result = await service.generate({ projectId });

      // Assert
      expect(result.lines[0].actualCost).toBe(0);
      expect(result.lines[0].percentComplete).toBe(0);
      expect(result.totalActualCost).toBe(0);
    });
  });

  describe('exportToExcel', () => {
    it('should export report to Excel buffer', async () => {
      // Arrange
      const projectId = 'project-123';
      const mockBuffer = Buffer.from('mock-excel-data');

      const mockProject = { id: projectId, name: 'Test Project' };
      const mockBudget = {
        id: 'budget-123',
        name: 'Test Budget',
        projectId,
        status: BudgetStatus.ACTIVE,
      };

      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepo, 'find').mockResolvedValue([]);
      jest.spyOn(excelExportService, 'exportWIPToExcel').mockResolvedValue(mockBuffer);

      // Act
      const result = await service.exportToExcel({ projectId });

      // Assert
      expect(result).toBe(mockBuffer);
      expect(excelExportService.exportWIPToExcel).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId,
        }),
      );
    });
  });
});
