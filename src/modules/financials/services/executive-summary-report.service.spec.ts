import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ExecutiveSummaryReportService } from './executive-summary-report.service';
import {
  Budget,
  BudgetLineItem,
  CostEntry,
  CostCode,
  Commitment,
} from '../entities';
import { Project } from '../../projects/entities/project.entity';
import { BudgetStatus } from '../enums/budget-status.enum';
import { CostEntryStatus } from '../enums';

describe('ExecutiveSummaryReportService', () => {
  let service: ExecutiveSummaryReportService;
  let budgetRepository: Repository<Budget>;
  let budgetLineItemRepository: Repository<BudgetLineItem>;
  let costEntryRepository: Repository<CostEntry>;
  let costCodeRepository: Repository<CostCode>;
  let commitmentRepository: Repository<Commitment>;
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

  const mockCostCode = {
    id: 'costcode-1',
    code: '1000',
    description: 'Labor',
  };

  const mockLineItems = [
    {
      id: 'line-1',
      budgetId: 'budget-1',
      costCodeId: 'costcode-1',
      budgetedCost: 100000,
      actualCost: 50000,
      costCode: mockCostCode,
    },
  ];

  const mockCommitments = [
    {
      id: 'commitment-1',
      projectId: 'project-1',
      originalAmount: 80000,
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
        ExecutiveSummaryReportService,
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
          provide: getRepositoryToken(Commitment),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ExecutiveSummaryReportService>(ExecutiveSummaryReportService);
    budgetRepository = module.get<Repository<Budget>>(getRepositoryToken(Budget));
    budgetLineItemRepository = module.get<Repository<BudgetLineItem>>(
      getRepositoryToken(BudgetLineItem),
    );
    costEntryRepository = module.get<Repository<CostEntry>>(getRepositoryToken(CostEntry));
    costCodeRepository = module.get<Repository<CostCode>>(getRepositoryToken(CostCode));
    commitmentRepository = module.get<Repository<Commitment>>(getRepositoryToken(Commitment));
    projectRepository = module.get<Repository<Project>>(getRepositoryToken(Project));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generate', () => {
    it('should generate executive summary report successfully', async () => {
      // Arrange
      const asOfDate = new Date('2024-06-30');
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepository, 'find').mockResolvedValue(mockLineItems as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue(mockCommitments as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([
        { costCodeId: 'costcode-1', totalActualCost: '50000' },
      ]);

      // Act
      const result = await service.generate({
        projectId: 'project-1',
        asOfDate,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.projectId).toBe('project-1');
      expect(result.projectName).toBe('Test Project');
      expect(result.asOfDate).toEqual(asOfDate);
      expect(result.originalBudget).toBeDefined();
      expect(result.revisedBudget).toBeDefined();
      expect(result.committedCost).toBeDefined();
      expect(result.actualCost).toBeDefined();
      expect(result.projectedFinalCost).toBeDefined();
      expect(result.budgetVariance).toBeDefined();
      expect(result.percentComplete).toBeDefined();
      expect(result.cpi).toBeDefined();
      expect(result.spi).toBeDefined();
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

    it('should use default as-of date when not provided', async () => {
      // Arrange
      const beforeCall = Date.now();
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepository, 'find').mockResolvedValue(mockLineItems as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue(mockCommitments as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      const result = await service.generate({ projectId: 'project-1' });
      const afterCall = Date.now();

      // Assert
      expect(result.asOfDate).toBeInstanceOf(Date);
      expect(result.asOfDate.getTime()).toBeGreaterThanOrEqual(beforeCall);
      expect(result.asOfDate.getTime()).toBeLessThanOrEqual(afterCall);
    });

    it('should calculate original budget from line items', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepository, 'find').mockResolvedValue(mockLineItems as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue(mockCommitments as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      const expectedBudget = mockLineItems.reduce((sum, item) => sum + item.budgetedCost, 0);
      expect(result.originalBudget).toBe(expectedBudget);
    });

    it('should calculate revised budget as original + change orders', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepository, 'find').mockResolvedValue(mockLineItems as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue(mockCommitments as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      expect(result.revisedBudget).toBe(result.originalBudget + result.approvedChangeOrders);
    });

    it('should calculate total committed cost from commitments', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepository, 'find').mockResolvedValue(mockLineItems as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue(mockCommitments as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      const expectedCommitted = mockCommitments.reduce((sum, c) => sum + c.originalAmount, 0);
      expect(result.committedCost).toBe(expectedCommitted);
    });

    it('should calculate total actual cost from cost entries', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepository, 'find').mockResolvedValue(mockLineItems as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue(mockCommitments as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([
        { costCodeId: 'costcode-1', totalActualCost: '45000' },
      ]);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      expect(result.actualCost).toBe(45000);
    });

    it('should calculate percent complete correctly', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepository, 'find').mockResolvedValue(mockLineItems as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue(mockCommitments as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([
        { costCodeId: 'costcode-1', totalActualCost: '50000' },
      ]);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert - 50000 / 100000 = 50%
      expect(result.percentComplete).toBeCloseTo(50, 2);
    });

    it('should calculate projected final cost (EAC)', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepository, 'find').mockResolvedValue(mockLineItems as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue(mockCommitments as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([
        { costCodeId: 'costcode-1', totalActualCost: '50000' },
      ]);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      expect(result.projectedFinalCost).toBeGreaterThan(0);
      expect(result.projectedFinalCost).toBeGreaterThanOrEqual(result.actualCost);
    });

    it('should calculate budget variance', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepository, 'find').mockResolvedValue(mockLineItems as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue(mockCommitments as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([
        { costCodeId: 'costcode-1', totalActualCost: '50000' },
      ]);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      expect(result.budgetVariance).toBe(result.revisedBudget - result.projectedFinalCost);
      expect(result.budgetVariancePercent).toBeDefined();
    });

    it('should calculate scheduled percent complete based on time elapsed', async () => {
      // Arrange
      const asOfDate = new Date('2024-06-30'); // Halfway through the year
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepository, 'find').mockResolvedValue(mockLineItems as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue(mockCommitments as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      const result = await service.generate({
        projectId: 'project-1',
        asOfDate,
      });

      // Assert
      expect(result.scheduledPercentComplete).toBeGreaterThan(0);
      expect(result.scheduledPercentComplete).toBeLessThanOrEqual(100);
    });

    it('should calculate schedule variance in days', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepository, 'find').mockResolvedValue(mockLineItems as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue(mockCommitments as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([
        { costCodeId: 'costcode-1', totalActualCost: '50000' },
      ]);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      expect(result.scheduleVarianceDays).toBeDefined();
      expect(typeof result.scheduleVarianceDays).toBe('number');
    });

    it('should calculate forecast completion date', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepository, 'find').mockResolvedValue(mockLineItems as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue(mockCommitments as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([
        { costCodeId: 'costcode-1', totalActualCost: '50000' },
      ]);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      expect(result.forecastCompletionDate).toBeDefined();
      if (result.forecastCompletionDate) {
        expect(result.forecastCompletionDate).toBeInstanceOf(Date);
      }
    });

    it('should calculate CPI correctly', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepository, 'find').mockResolvedValue(mockLineItems as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue(mockCommitments as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([
        { costCodeId: 'costcode-1', totalActualCost: '50000' },
      ]);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      expect(result.cpi).toBeGreaterThan(0);
      expect(result.cpi).toBe(1.0); // Simplified calculation in service
    });

    it('should calculate SPI correctly', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepository, 'find').mockResolvedValue(mockLineItems as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue(mockCommitments as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([
        { costCodeId: 'costcode-1', totalActualCost: '50000' },
      ]);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      expect(result.spi).toBeGreaterThan(0);
    });

    it('should identify over-budget line items', async () => {
      // Arrange
      const lineItemsWithOverrun = [
        {
          id: 'line-1',
          budgetId: 'budget-1',
          costCodeId: 'costcode-1',
          budgetedCost: 100000,
          actualCost: 120000, // Over budget
          costCode: mockCostCode,
        },
      ];

      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepository, 'find').mockResolvedValue(lineItemsWithOverrun as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue(mockCommitments as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([
        { costCodeId: 'costcode-1', totalActualCost: '120000' },
      ]);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      expect(result.overBudgetLineItemsCount).toBeGreaterThan(0);
    });

    it('should generate top cost overruns', async () => {
      // Arrange
      const lineItemsWithOverruns = [
        {
          id: 'line-1',
          budgetId: 'budget-1',
          costCodeId: 'costcode-1',
          budgetedCost: 100000,
          actualCost: 120000,
          costCode: { ...mockCostCode, code: '1000', description: 'Labor' },
        },
        {
          id: 'line-2',
          budgetId: 'budget-1',
          costCodeId: 'costcode-2',
          budgetedCost: 50000,
          actualCost: 60000,
          costCode: { id: 'costcode-2', code: '2000', description: 'Materials' },
        },
      ];

      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepository, 'find').mockResolvedValue(lineItemsWithOverruns as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue(mockCommitments as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([
        { costCodeId: 'costcode-1', totalActualCost: '120000' },
        { costCodeId: 'costcode-2', totalActualCost: '60000' },
      ]);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      expect(result.topCostOverruns).toBeDefined();
      expect(result.topCostOverruns.length).toBeGreaterThan(0);
      expect(result.topCostOverruns.length).toBeLessThanOrEqual(5);

      result.topCostOverruns.forEach(overrun => {
        expect(overrun.description).toBeDefined();
        expect(overrun.value).toBeGreaterThan(0);
        expect(overrun.daysOrPercent).toBeDefined();
        expect(overrun.status).toBeDefined();
      });
    });

    it('should generate monthly cost trend', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepository, 'find').mockResolvedValue(mockLineItems as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue(mockCommitments as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([
        { costCodeId: 'costcode-1', totalActualCost: '50000' },
      ]);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      expect(result.costTrend).toBeDefined();
      expect(Array.isArray(result.costTrend)).toBe(true);

      result.costTrend.forEach(trend => {
        expect(trend.month).toBeInstanceOf(Date);
        expect(trend.planned).toBeGreaterThanOrEqual(0);
        expect(trend.actual).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle zero actual costs', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepository, 'find').mockResolvedValue(mockLineItems as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue(mockCommitments as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      expect(result.actualCost).toBe(0);
      expect(result.percentComplete).toBe(0);
    });

    it('should handle project without end date', async () => {
      // Arrange
      const projectWithoutEndDate = { ...mockProject, endDate: undefined };
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(projectWithoutEndDate as any);
      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepository, 'find').mockResolvedValue(mockLineItems as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue(mockCommitments as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert
      expect(result.forecastCompletionDate).toBeUndefined();
    });

    it('should set placeholder values for TODO integrations', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(budgetRepository, 'findOne').mockResolvedValue(mockBudget as any);
      jest.spyOn(budgetLineItemRepository, 'find').mockResolvedValue(mockLineItems as any);
      jest.spyOn(commitmentRepository, 'find').mockResolvedValue(mockCommitments as any);

      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      const result = await service.generate({ projectId: 'project-1' });

      // Assert - These are TODO items set to 0 or default values
      expect(result.contractValue).toBe(0);
      expect(result.approvedChangeOrders).toBe(0);
      expect(result.currentCashPosition).toBe(0);
      expect(result.billedToDate).toBe(0);
      expect(result.receivedFromOwner).toBe(0);
      expect(result.delayedCommitmentsCount).toBe(0);
      expect(result.overdueInvoicesCount).toBe(0);
      expect(result.overdueInvoicesAmount).toBe(0);
      expect(result.topDelayedCommitments).toEqual([]);
      expect(result.topOverdueInvoices).toEqual([]);
      expect(result.cashFlowTrend).toEqual([]);
    });
  });
});
