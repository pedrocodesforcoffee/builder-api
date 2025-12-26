import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { BudgetDetailReportService } from './budget-detail-report.service';
import { ReportExcelExportService } from './report-excel-export.service';
import {
  Budget,
  BudgetLineItem,
  CostEntry,
  CostCode,
  Commitment,
  CommitmentChangeOrder,
} from '../entities';
import { Project } from '../../projects/entities/project.entity';
import { BudgetStatus } from '../enums/budget-status.enum';
import { CostEntryStatus } from '../enums';

describe('BudgetDetailReportService', () => {
  let service: BudgetDetailReportService;
  let budgetRepo: Repository<Budget>;
  let budgetLineItemRepo: Repository<BudgetLineItem>;
  let costEntryRepo: Repository<CostEntry>;
  let costCodeRepo: Repository<CostCode>;
  let commitmentRepo: Repository<Commitment>;
  let changeOrderRepo: Repository<CommitmentChangeOrder>;
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
        BudgetDetailReportService,
        {
          provide: getRepositoryToken(Budget),
          useValue: {
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(BudgetLineItem),
          useValue: {
            find: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(CostEntry),
          useValue: {
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(CostCode),
          useValue: {
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Commitment),
          useValue: {
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(CommitmentChangeOrder),
          useValue: {
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
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
            exportBudgetDetailToExcel: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BudgetDetailReportService>(BudgetDetailReportService);
    budgetRepo = module.get(getRepositoryToken(Budget));
    budgetLineItemRepo = module.get(getRepositoryToken(BudgetLineItem));
    costEntryRepo = module.get(getRepositoryToken(CostEntry));
    costCodeRepo = module.get(getRepositoryToken(CostCode));
    commitmentRepo = module.get(getRepositoryToken(Commitment));
    changeOrderRepo = module.get(getRepositoryToken(CommitmentChangeOrder));
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

    it('should generate budget detail report successfully', async () => {
      // Arrange
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepo, 'find').mockResolvedValue(mockLineItems as any);

      // Mock change orders aggregation
      jest.spyOn(changeOrderRepo, 'createQueryBuilder').mockReturnValue({
        ...mockQueryBuilder,
        getRawMany: jest.fn().mockResolvedValue([
          { costCodeId: costCodeId1, totalChangeOrders: '10000' },
          { costCodeId: costCodeId2, totalChangeOrders: '5000' },
        ]),
      } as any);

      // Mock actual costs aggregation
      jest.spyOn(costEntryRepo, 'createQueryBuilder').mockReturnValue({
        ...mockQueryBuilder,
        getRawMany: jest.fn().mockResolvedValue([
          { costCodeId: costCodeId1, totalActualCost: '80000' },
          { costCodeId: costCodeId2, totalActualCost: '40000' },
        ]),
      } as any);

      // Mock committed costs aggregation
      jest.spyOn(commitmentRepo, 'createQueryBuilder').mockReturnValue({
        ...mockQueryBuilder,
        getRawMany: jest.fn().mockResolvedValue([
          { costCodeId: costCodeId1, totalCommittedCost: '90000' },
          { costCodeId: costCodeId2, totalCommittedCost: '45000' },
        ]),
      } as any);

      // Act
      const result = await service.generate({ projectId, budgetId });

      // Assert
      expect(result).toBeDefined();
      expect(result.projectId).toBe(projectId);
      expect(result.projectName).toBe('Test Project');
      expect(result.budgetId).toBe(budgetId);
      expect(result.budgetName).toBe('Test Budget');
      expect(result.lines).toHaveLength(2);

      // Verify line 1 calculations
      expect(result.lines[0].costCode).toBe('01-100');
      expect(result.lines[0].originalBudget).toBe(100000);
      expect(result.lines[0].changeOrders).toBe(10000);
      expect(result.lines[0].revisedBudget).toBe(110000);
      expect(result.lines[0].committedCost).toBe(90000);
      expect(result.lines[0].actualCost).toBe(80000);
      expect(result.lines[0].variance).toBe(30000); // 110000 - 80000
      expect(result.lines[0].percentComplete).toBeCloseTo(72.73, 1); // (80000 / 110000) * 100
      expect(result.lines[0].costToComplete).toBe(10000); // 90000 - 80000
      expect(result.lines[0].projectedFinalCost).toBe(90000); // 80000 + 10000
      expect(result.lines[0].projectedVariance).toBe(20000); // 110000 - 90000

      // Verify totals
      expect(result.totalOriginalBudget).toBe(150000);
      expect(result.totalChangeOrders).toBe(15000);
      expect(result.totalRevisedBudget).toBe(165000);
      expect(result.totalCommittedCost).toBe(135000);
      expect(result.totalActualCost).toBe(120000);
      expect(result.totalVariance).toBe(45000);
      expect(result.totalPercentComplete).toBeCloseTo(72.73, 1);
      expect(result.totalCostToComplete).toBe(15000);
      expect(result.totalProjectedFinalCost).toBe(135000);
      expect(result.totalProjectedVariance).toBe(30000);
    });

    it('should throw NotFoundException if project not found', async () => {
      // Arrange
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.generate({ projectId, budgetId })).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.generate({ projectId, budgetId })).rejects.toThrow(
        `Project ${projectId} not found`,
      );
    });

    it('should throw NotFoundException if specified budget not found', async () => {
      // Arrange
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.generate({ projectId, budgetId })).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.generate({ projectId, budgetId })).rejects.toThrow(
        `Budget ${budgetId} not found`,
      );
    });

    it('should throw NotFoundException if no active budget found', async () => {
      // Arrange
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.generate({ projectId })).rejects.toThrow(
        NotFoundException,
      );
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
      const result = await service.generate({ projectId, budgetId });

      // Assert
      expect(result).toBeDefined();
      expect(result.lines).toHaveLength(0);
      expect(result.totalOriginalBudget).toBe(0);
      expect(result.totalActualCost).toBe(0);
    });

    it('should handle cost codes with no change orders', async () => {
      // Arrange
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepo, 'find').mockResolvedValue(mockLineItems as any);

      // Mock empty change orders
      jest.spyOn(changeOrderRepo, 'createQueryBuilder').mockReturnValue({
        ...mockQueryBuilder,
        getRawMany: jest.fn().mockResolvedValue([]),
      } as any);

      jest.spyOn(costEntryRepo, 'createQueryBuilder').mockReturnValue({
        ...mockQueryBuilder,
        getRawMany: jest.fn().mockResolvedValue([]),
      } as any);

      jest.spyOn(commitmentRepo, 'createQueryBuilder').mockReturnValue({
        ...mockQueryBuilder,
        getRawMany: jest.fn().mockResolvedValue([]),
      } as any);

      // Act
      const result = await service.generate({ projectId, budgetId });

      // Assert
      expect(result.lines[0].changeOrders).toBe(0);
      expect(result.lines[0].revisedBudget).toBe(100000); // Original budget only
      expect(result.totalChangeOrders).toBe(0);
    });

    it('should use active budget when budgetId not provided', async () => {
      // Arrange
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepo, 'find').mockResolvedValue([]);
      jest.spyOn(changeOrderRepo, 'createQueryBuilder').mockReturnValue({
        ...mockQueryBuilder,
        getRawMany: jest.fn().mockResolvedValue([]),
      } as any);
      jest.spyOn(costEntryRepo, 'createQueryBuilder').mockReturnValue({
        ...mockQueryBuilder,
        getRawMany: jest.fn().mockResolvedValue([]),
      } as any);
      jest.spyOn(commitmentRepo, 'createQueryBuilder').mockReturnValue({
        ...mockQueryBuilder,
        getRawMany: jest.fn().mockResolvedValue([]),
      } as any);

      // Act
      const result = await service.generate({ projectId });

      // Assert
      expect(budgetRepo.findOne).toHaveBeenCalledWith({
        where: { projectId, status: BudgetStatus.ACTIVE },
      });
      expect(result).toBeDefined();
    });
  });

  describe('exportToExcel', () => {
    it('should export report to Excel buffer', async () => {
      // Arrange
      const projectId = 'project-123';
      const budgetId = 'budget-123';
      const mockBuffer = Buffer.from('mock-excel-data');

      const mockProject = { id: projectId, name: 'Test Project' };
      const mockBudget = {
        id: budgetId,
        name: 'Test Budget',
        projectId,
        status: BudgetStatus.ACTIVE,
      };

      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepo, 'find').mockResolvedValue([]);
      jest.spyOn(changeOrderRepo, 'createQueryBuilder').mockReturnValue({
        ...mockQueryBuilder,
        getRawMany: jest.fn().mockResolvedValue([]),
      } as any);
      jest.spyOn(costEntryRepo, 'createQueryBuilder').mockReturnValue({
        ...mockQueryBuilder,
        getRawMany: jest.fn().mockResolvedValue([]),
      } as any);
      jest.spyOn(commitmentRepo, 'createQueryBuilder').mockReturnValue({
        ...mockQueryBuilder,
        getRawMany: jest.fn().mockResolvedValue([]),
      } as any);

      jest.spyOn(excelExportService, 'exportBudgetDetailToExcel').mockResolvedValue(mockBuffer);

      // Act
      const result = await service.exportToExcel({ projectId, budgetId });

      // Assert
      expect(result).toBe(mockBuffer);
      expect(excelExportService.exportBudgetDetailToExcel).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId,
          budgetId,
        }),
      );
    });
  });
});
