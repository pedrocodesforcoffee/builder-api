import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { EarnedValueAnalysisReportService } from './earned-value-analysis-report.service';
import {
  Budget,
  BudgetLineItem,
  CostEntry,
  CostCode,
} from '../entities';
import { Project } from '../../projects/entities/project.entity';
import { BudgetStatus } from '../enums/budget-status.enum';
import { CostEntryStatus } from '../enums';

describe('EarnedValueAnalysisReportService', () => {
  let service: EarnedValueAnalysisReportService;
  let budgetRepository: Repository<Budget>;
  let budgetLineItemRepository: Repository<BudgetLineItem>;
  let costEntryRepository: Repository<CostEntry>;
  let costCodeRepository: Repository<CostCode>;
  let projectRepository: Repository<Project>;

  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
  };

  const mockBudget = {
    id: 'budget-1',
    name: 'Active Budget',
    projectId: 'project-1',
    status: BudgetStatus.ACTIVE,
  };

  const mockCostCode1 = {
    id: 'costcode-1',
    code: '1000',
    description: 'Labor',
  };

  const mockCostCode2 = {
    id: 'costcode-2',
    code: '2000',
    description: 'Materials',
  };

  const mockLineItems = [
    {
      id: 'line-1',
      budgetId: 'budget-1',
      costCodeId: 'costcode-1',
      budgetedCost: 100000,
      actualCost: 45000,
      costCode: mockCostCode1,
    },
    {
      id: 'line-2',
      budgetId: 'budget-1',
      costCodeId: 'costcode-2',
      budgetedCost: 50000,
      actualCost: 30000,
      costCode: mockCostCode2,
    },
  ];

  const mockQueryBuilder = {
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
        EarnedValueAnalysisReportService,
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
      ],
    }).compile();

    service = module.get<EarnedValueAnalysisReportService>(EarnedValueAnalysisReportService);
    budgetRepository = module.get<Repository<Budget>>(getRepositoryToken(Budget));
    budgetLineItemRepository = module.get<Repository<BudgetLineItem>>(
      getRepositoryToken(BudgetLineItem),
    );
    costEntryRepository = module.get<Repository<CostEntry>>(getRepositoryToken(CostEntry));
    costCodeRepository = module.get<Repository<CostCode>>(getRepositoryToken(CostCode));
    projectRepository = module.get<Repository<Project>>(getRepositoryToken(Project));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generate', () => {
    it('should generate earned value analysis report successfully', async () => {
      // Arrange
      const asOfDate = new Date('2024-06-30');
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepository, 'find').mockResolvedValue(mockLineItems as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([
        { costCodeId: 'costcode-1', totalActualCost: '45000' },
        { costCodeId: 'costcode-2', totalActualCost: '30000' },
      ]);

      // Act
      const result = await service.generate({
        projectId: 'project-1',
        budgetId: 'budget-1',
        asOfDate,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.projectId).toBe('project-1');
      expect(result.projectName).toBe('Test Project');
      expect(result.budgetId).toBe('budget-1');
      expect(result.budgetName).toBe('Active Budget');
      expect(result.bac).toBe(150000);
      expect(result.ac).toBe(75000);
      expect(result.lines).toHaveLength(2);
      expect(result.monthlyTrends).toBeDefined();
      expect(result.cpi).toBeGreaterThan(0);
      expect(result.spi).toBeGreaterThan(0);
    });

    it('should throw NotFoundException when project not found', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.generate({ projectId: 'invalid-project' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.generate({ projectId: 'invalid-project' }),
      ).rejects.toThrow('Project not found: invalid-project');
    });

    it('should throw NotFoundException when budget not found by ID', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.generate({ projectId: 'project-1', budgetId: 'invalid-budget' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.generate({ projectId: 'project-1', budgetId: 'invalid-budget' }),
      ).rejects.toThrow('Budget not found: invalid-budget');
    });

    it('should throw NotFoundException when no active budget found', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.generate({ projectId: 'project-1' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.generate({ projectId: 'project-1' }),
      ).rejects.toThrow('No active budget found for project: project-1');
    });

    it('should calculate EVM metrics correctly', async () => {
      // Arrange
      const asOfDate = new Date('2024-06-30');
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepository, 'find').mockResolvedValue(mockLineItems as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([
        { costCodeId: 'costcode-1', totalActualCost: '50000' },
        { costCodeId: 'costcode-2', totalActualCost: '25000' },
      ]);

      // Act
      const result = await service.generate({
        projectId: 'project-1',
        budgetId: 'budget-1',
        asOfDate,
      });

      // Assert - Project level metrics
      expect(result.bac).toBe(150000); // 100000 + 50000
      expect(result.ac).toBe(75000); // 50000 + 25000
      expect(result.cv).toBeDefined(); // EV - AC
      expect(result.sv).toBeDefined(); // EV - PV
      expect(result.cpi).toBeGreaterThan(0); // EV / AC
      expect(result.spi).toBeGreaterThan(0); // EV / PV
      expect(result.eac).toBeGreaterThan(0); // BAC / CPI
      expect(result.etc).toBeGreaterThan(0); // EAC - AC
      expect(result.vac).toBeDefined(); // BAC - EAC
      expect(result.tcpi).toBeGreaterThan(0);
    });

    it('should calculate cost code level EVM metrics correctly', async () => {
      // Arrange
      const asOfDate = new Date('2024-06-30');
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepository, 'find').mockResolvedValue(mockLineItems as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([
        { costCodeId: 'costcode-1', totalActualCost: '50000' },
      ]);

      // Act
      const result = await service.generate({
        projectId: 'project-1',
        budgetId: 'budget-1',
        asOfDate,
      });

      // Assert - Cost code level
      const line1 = result.lines.find(l => l.costCode === '1000');
      expect(line1).toBeDefined();
      expect(line1!.bac).toBe(100000);
      expect(line1!.ac).toBe(50000);
      expect(line1!.ev).toBeGreaterThan(0);
      expect(line1!.cv).toBeDefined();
      expect(line1!.sv).toBeDefined();
      expect(line1!.cpi).toBeGreaterThan(0);
      expect(line1!.spi).toBeGreaterThan(0);
      expect(line1!.eac).toBeGreaterThan(0);
      expect(line1!.etc).toBeGreaterThan(0);
      expect(line1!.vac).toBeDefined();
    });

    it('should handle zero actual costs correctly', async () => {
      // Arrange
      const asOfDate = new Date('2024-06-30');
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepository, 'find').mockResolvedValue(mockLineItems as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      const result = await service.generate({
        projectId: 'project-1',
        budgetId: 'budget-1',
        asOfDate,
      });

      // Assert
      expect(result.ac).toBe(0);
      expect(result.cpi).toBe(1.0); // Default when AC = 0
      expect(result.lines).toHaveLength(2);
      result.lines.forEach(line => {
        expect(line.ac).toBe(0);
        expect(line.cpi).toBe(1.0);
      });
    });

    it('should generate monthly trends correctly', async () => {
      // Arrange
      const asOfDate = new Date('2024-06-30');
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepository, 'find').mockResolvedValue(mockLineItems as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([
        { costCodeId: 'costcode-1', totalActualCost: '50000' },
        { costCodeId: 'costcode-2', totalActualCost: '25000' },
      ]);

      // Act
      const result = await service.generate({
        projectId: 'project-1',
        budgetId: 'budget-1',
        asOfDate,
      });

      // Assert
      expect(result.monthlyTrends).toBeDefined();
      expect(result.monthlyTrends.length).toBeGreaterThan(0);
      result.monthlyTrends.forEach(trend => {
        expect(trend.month).toBeInstanceOf(Date);
        expect(trend.plannedValue).toBeGreaterThanOrEqual(0);
        expect(trend.earnedValue).toBeGreaterThanOrEqual(0);
        expect(trend.actualCost).toBeGreaterThanOrEqual(0);
        expect(trend.cpi).toBeGreaterThan(0);
        expect(trend.spi).toBeGreaterThan(0);
      });
    });

    it('should calculate forecast completion date when project has end date', async () => {
      // Arrange
      const asOfDate = new Date('2024-06-30');
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepository, 'find').mockResolvedValue(mockLineItems as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([
        { costCodeId: 'costcode-1', totalActualCost: '50000' },
        { costCodeId: 'costcode-2', totalActualCost: '25000' },
      ]);

      // Act
      const result = await service.generate({
        projectId: 'project-1',
        budgetId: 'budget-1',
        asOfDate,
      });

      // Assert
      expect(result.forecastCompletionDate).toBeDefined();
      expect(result.forecastCompletionDate).toBeInstanceOf(Date);
    });

    it('should handle project without end date', async () => {
      // Arrange
      const projectWithoutEndDate = { ...mockProject, endDate: undefined };
      const asOfDate = new Date('2024-06-30');
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(projectWithoutEndDate as any);
      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepository, 'find').mockResolvedValue(mockLineItems as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([
        { costCodeId: 'costcode-1', totalActualCost: '50000' },
      ]);

      // Act
      const result = await service.generate({
        projectId: 'project-1',
        budgetId: 'budget-1',
        asOfDate,
      });

      // Assert
      expect(result.forecastCompletionDate).toBeUndefined();
    });

    it('should use default as-of date when not provided', async () => {
      // Arrange
      const beforeCall = Date.now();
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepository, 'find').mockResolvedValue(mockLineItems as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      const result = await service.generate({ projectId: 'project-1' });
      const afterCall = Date.now();

      // Assert
      expect(result.asOfDate).toBeInstanceOf(Date);
      expect(result.asOfDate.getTime()).toBeGreaterThanOrEqual(beforeCall);
      expect(result.asOfDate.getTime()).toBeLessThanOrEqual(afterCall);
    });

    it('should handle empty line items', async () => {
      // Arrange
      const asOfDate = new Date('2024-06-30');
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepository, 'find').mockResolvedValue([]);

      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      const result = await service.generate({
        projectId: 'project-1',
        budgetId: 'budget-1',
        asOfDate,
      });

      // Assert
      expect(result.lines).toHaveLength(0);
      expect(result.bac).toBe(0);
      expect(result.pv).toBe(0);
      expect(result.ev).toBe(0);
      expect(result.ac).toBe(0);
    });

    it('should cap percent complete at 100%', async () => {
      // Arrange - AC exceeds BAC
      const lineItemOverBudget = [
        {
          id: 'line-1',
          budgetId: 'budget-1',
          costCodeId: 'costcode-1',
          budgetedCost: 100000,
          actualCost: 150000,
          costCode: mockCostCode1,
        },
      ];

      const asOfDate = new Date('2024-06-30');
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepository, 'find').mockResolvedValue(lineItemOverBudget as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([
        { costCodeId: 'costcode-1', totalActualCost: '150000' },
      ]);

      // Act
      const result = await service.generate({
        projectId: 'project-1',
        budgetId: 'budget-1',
        asOfDate,
      });

      // Assert
      const line = result.lines[0];
      expect(line.ev).toBeLessThanOrEqual(line.bac);
    });
  });
});
