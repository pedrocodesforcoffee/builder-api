import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { CostToCompleteReportService } from './cost-to-complete-report.service';
import { ReportExcelExportService } from './report-excel-export.service';
import { Budget, BudgetLineItem, CostEntry, CostCode } from '../entities';
import { Project } from '../../projects/entities/project.entity';
import { BudgetStatus } from '../enums/budget-status.enum';
import { CostEntryStatus } from '../enums';

describe('CostToCompleteReportService', () => {
  let service: CostToCompleteReportService;
  let budgetRepo: Repository<Budget>;
  let budgetLineItemRepo: Repository<BudgetLineItem>;
  let costEntryRepo: Repository<CostEntry>;
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
        CostToCompleteReportService,
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
            exportCostToCompleteToExcel: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CostToCompleteReportService>(CostToCompleteReportService);
    budgetRepo = module.get(getRepositoryToken(Budget));
    budgetLineItemRepo = module.get(getRepositoryToken(BudgetLineItem));
    costEntryRepo = module.get(getRepositoryToken(CostEntry));
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

    const mockLineItems = [
      {
        id: 'line-1',
        budgetId,
        costCodeId: costCodeId1,
        costCode: mockCostCode1,
        budgetedCost: 100000,
      },
    ];

    it('should generate cost to complete report with EAC/ETC calculations', async () => {
      // Arrange
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepo, 'find').mockResolvedValue(mockLineItems as any);

      jest.spyOn(costEntryRepo, 'createQueryBuilder').mockReturnValue({
        ...mockQueryBuilder,
        getRawMany: jest.fn().mockResolvedValue([
          { costCodeId: costCodeId1, totalActualCost: '80000' },
        ]),
      } as any);

      // Act
      const result = await service.generate({ projectId, budgetId });

      // Assert
      expect(result).toBeDefined();
      expect(result.projectId).toBe(projectId);
      expect(result.budgetId).toBe(budgetId);
      expect(result.lines).toHaveLength(1);

      // Verify EVM calculations
      const line = result.lines[0];
      expect(line.revisedBudget).toBe(100000);
      expect(line.actualCost).toBe(80000);
      expect(line.percentComplete).toBe(80); // (80000 / 100000) * 100
      expect(line.earnedValue).toBe(80000); // (80/100) * 100000
      expect(line.cpi).toBe(1); // 80000 / 80000
      expect(line.etc).toBe(20000); // (100000 - 80000) / 1
      expect(line.eac).toBe(100000); // 80000 + 20000
      expect(line.vac).toBe(0); // 100000 - 100000
    });

    it('should throw NotFoundException if project not found', async () => {
      // Arrange
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.generate({ projectId, budgetId })).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if specified budget not found', async () => {
      // Arrange
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.generate({ projectId, budgetId })).rejects.toThrow(NotFoundException);
    });

    it('should use active budget when budgetId not provided', async () => {
      // Arrange
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepo, 'find').mockResolvedValue([]);
      jest.spyOn(costEntryRepo, 'createQueryBuilder').mockReturnValue({
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

    it('should calculate TCPI correctly', async () => {
      // Arrange
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepo, 'find').mockResolvedValue(mockLineItems as any);

      jest.spyOn(costEntryRepo, 'createQueryBuilder').mockReturnValue({
        ...mockQueryBuilder,
        getRawMany: jest.fn().mockResolvedValue([
          { costCodeId: costCodeId1, totalActualCost: '60000' },
        ]),
      } as any);

      // Act
      const result = await service.generate({ projectId, budgetId });

      // Assert
      const line = result.lines[0];
      // workRemaining = 100000 - 60000 = 40000
      // fundsRemaining = 100000 - 60000 = 40000
      // tcpi = 40000 / 40000 = 1.0
      expect(line.tcpi).toBe(1.0);
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
      jest.spyOn(costEntryRepo, 'createQueryBuilder').mockReturnValue({
        ...mockQueryBuilder,
        getRawMany: jest.fn().mockResolvedValue([]),
      } as any);
      jest.spyOn(excelExportService, 'exportCostToCompleteToExcel').mockResolvedValue(mockBuffer);

      // Act
      const result = await service.exportToExcel({ projectId, budgetId });

      // Assert
      expect(result).toBe(mockBuffer);
      expect(excelExportService.exportCostToCompleteToExcel).toHaveBeenCalled();
    });
  });
});
