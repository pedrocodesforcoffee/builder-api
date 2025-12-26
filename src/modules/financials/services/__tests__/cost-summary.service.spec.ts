import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { NotFoundException, Logger } from '@nestjs/common';
import { CostSummaryService } from '../cost-summary.service';
import { CostEntry } from '../../entities/cost-entry.entity';
import { CostTransfer } from '../../entities/cost-transfer.entity';
import { Accrual } from '../../entities/accrual.entity';
import { Budget } from '../../entities/budget.entity';
import { BudgetLineItem } from '../../entities/budget-line-item.entity';
import { CostPeriod } from '../../entities/cost-period.entity';
import { CostCode } from '../../entities/cost-code.entity';
import { CommitmentItem } from '../../entities/commitment-item.entity';
import { Project } from '../../../projects/entities/project.entity';
import { CostPeriodService } from '../cost-period.service';
import { CostEntryStatus } from '../../enums/cost-entry-status.enum';
import { CostEntryType } from '../../enums/cost-entry-type.enum';
import { AccrualStatus } from '../../enums/accrual-status.enum';
import { CostTransferStatus } from '../../enums/cost-transfer-status.enum';
import { CostReportFilterDto } from '../../dto/cost-report-filter.dto';

describe('CostSummaryService', () => {
  let service: CostSummaryService;
  let costEntryRepo: Repository<CostEntry>;
  let costTransferRepo: Repository<CostTransfer>;
  let accrualRepo: Repository<Accrual>;
  let budgetRepo: Repository<Budget>;
  let budgetLineItemRepo: Repository<BudgetLineItem>;
  let costPeriodRepo: Repository<CostPeriod>;
  let costCodeRepo: Repository<CostCode>;
  let commitmentItemRepo: Repository<CommitmentItem>;
  let projectRepo: Repository<Project>;
  let costPeriodService: CostPeriodService;

  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
    number: 'PROJ-001',
  } as Project;

  const mockBudget = {
    id: 'budget-1',
    projectId: 'project-1',
    name: 'Original Budget',
    status: 'ACTIVE',
    totalAmount: 1000000,
  } as Budget;

  const mockCostCode = {
    id: 'cost-code-1',
    code: '03-100',
    name: 'Concrete - Foundations',
    division: '03',
    description: 'Foundation work',
  } as CostCode;

  const mockBudgetLineItem = {
    id: 'line-item-1',
    budgetId: 'budget-1',
    costCodeId: 'cost-code-1',
    budgetedCost: 100000,
    committedCost: 80000,
    costCode: mockCostCode,
  } as BudgetLineItem;

  const mockCostEntry = {
    id: 'entry-1',
    projectId: 'project-1',
    budgetId: 'budget-1',
    costCodeId: 'cost-code-1',
    status: CostEntryStatus.POSTED,
    type: CostEntryType.LABOR,
    totalCost: 5000,
    entryDate: new Date('2024-01-15'),
    description: 'Labor costs',
  } as CostEntry;

  const mockCommitmentItem = {
    id: 'commit-item-1',
    costCodeId: 'cost-code-1',
    amount: 10000,
  } as CommitmentItem;

  const mockAccrual = {
    id: 'accrual-1',
    projectId: 'project-1',
    budgetId: 'budget-1',
    costCodeId: 'cost-code-1',
    status: AccrualStatus.ACTIVE,
    estimatedCost: 3000,
  } as Accrual;

  const mockCostTransfer = {
    id: 'transfer-1',
    projectId: 'project-1',
    budgetId: 'budget-1',
    status: CostTransferStatus.APPROVED,
    amount: 2000,
  } as CostTransfer;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
    getRawOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CostSummaryService,
        {
          provide: getRepositoryToken(CostEntry),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(CostTransfer),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Accrual),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Budget),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(BudgetLineItem),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(CostPeriod),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(CostCode),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(CommitmentItem),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: CostPeriodService,
          useValue: {
            getSummary: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CostSummaryService>(CostSummaryService);
    costEntryRepo = module.get<Repository<CostEntry>>(
      getRepositoryToken(CostEntry),
    );
    costTransferRepo = module.get<Repository<CostTransfer>>(
      getRepositoryToken(CostTransfer),
    );
    accrualRepo = module.get<Repository<Accrual>>(getRepositoryToken(Accrual));
    budgetRepo = module.get<Repository<Budget>>(getRepositoryToken(Budget));
    budgetLineItemRepo = module.get<Repository<BudgetLineItem>>(
      getRepositoryToken(BudgetLineItem),
    );
    costPeriodRepo = module.get<Repository<CostPeriod>>(
      getRepositoryToken(CostPeriod),
    );
    costCodeRepo = module.get<Repository<CostCode>>(
      getRepositoryToken(CostCode),
    );
    commitmentItemRepo = module.get<Repository<CommitmentItem>>(
      getRepositoryToken(CommitmentItem),
    );
    projectRepo = module.get<Repository<Project>>(getRepositoryToken(Project));
    costPeriodService = module.get<CostPeriodService>(CostPeriodService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSummaryByProject', () => {
    it('should return comprehensive project cost summary', async () => {
      const filter: CostReportFilterDto = {
        projectId: 'project-1',
      };

      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);

      const budgetQueryBuilder = {
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockBudget),
      };
      jest.spyOn(budgetRepo, 'createQueryBuilder').mockReturnValue(budgetQueryBuilder as any);

      const lineItemQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([mockBudgetLineItem]),
      };
      jest.spyOn(budgetLineItemRepo, 'createQueryBuilder').mockReturnValue(lineItemQueryBuilder as any);

      const commitmentQueryBuilder = {
        ...mockQueryBuilder,
        getRawOne: jest.fn().mockResolvedValue({ totalCommitted: '80000' }),
      };
      jest.spyOn(commitmentItemRepo, 'createQueryBuilder').mockReturnValue(commitmentQueryBuilder as any);

      const costEntryQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([mockCostEntry]),
      };
      jest.spyOn(costEntryRepo, 'createQueryBuilder').mockReturnValue(costEntryQueryBuilder as any);

      const accrualQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([mockAccrual]),
      };
      jest.spyOn(accrualRepo, 'createQueryBuilder').mockReturnValue(accrualQueryBuilder as any);

      const transferQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([mockCostTransfer]),
      };
      jest.spyOn(costTransferRepo, 'createQueryBuilder').mockReturnValue(transferQueryBuilder as any);

      const result = await service.getSummaryByProject('project-1', filter);

      expect(result.projectId).toBe('project-1');
      expect(result.projectName).toBe('Test Project');
      expect(result.projectNumber).toBe('PROJ-001');
      expect(result.totalBudget).toBe(100000);
      expect(result.totalCommitted).toBe(80000);
      expect(result.totalActual).toBe(5000);
      expect(result.totalForecast).toBe(83000);
      expect(result.totalVariance).toBe(17000);
      expect(result.percentComplete).toBeGreaterThan(0);
      expect(result.costCodeSummaries).toBeDefined();
      expect(result.entriesByType).toBeDefined();
      expect(result.entriesByStatus).toBeDefined();
      expect(result.accrualsSummary).toBeDefined();
      expect(result.transfersSummary).toBeDefined();
    });

    it('should throw NotFoundException if project does not exist', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.getSummaryByProject('invalid-project', {}),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getSummaryByProject('invalid-project', {}),
      ).rejects.toThrow('Project with ID invalid-project not found');
    });

    it('should throw NotFoundException if no active budget found', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);

      const budgetQueryBuilder = {
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(null),
      };
      jest.spyOn(budgetRepo, 'createQueryBuilder').mockReturnValue(budgetQueryBuilder as any);

      await expect(
        service.getSummaryByProject('project-1', {}),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getSummaryByProject('project-1', {}),
      ).rejects.toThrow('No active budget found for project project-1');
    });

    it('should apply date range filters', async () => {
      const filter: CostReportFilterDto = {
        projectId: 'project-1',
        fromDate: '2024-01-01',
        toDate: '2024-12-31',
      };

      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);

      const budgetQueryBuilder = {
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockBudget),
      };
      jest.spyOn(budgetRepo, 'createQueryBuilder').mockReturnValue(budgetQueryBuilder as any);

      const lineItemQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([mockBudgetLineItem]),
      };
      jest.spyOn(budgetLineItemRepo, 'createQueryBuilder').mockReturnValue(lineItemQueryBuilder as any);

      const commitmentQueryBuilder = {
        ...mockQueryBuilder,
        getRawOne: jest.fn().mockResolvedValue({ totalCommitted: '0' }),
      };
      jest.spyOn(commitmentItemRepo, 'createQueryBuilder').mockReturnValue(commitmentQueryBuilder as any);

      const costEntryQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([]),
      };
      const costEntrySpy = jest.spyOn(costEntryRepo, 'createQueryBuilder').mockReturnValue(costEntryQueryBuilder as any);

      const accrualQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([]),
      };
      jest.spyOn(accrualRepo, 'createQueryBuilder').mockReturnValue(accrualQueryBuilder as any);

      const transferQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([]),
      };
      jest.spyOn(costTransferRepo, 'createQueryBuilder').mockReturnValue(transferQueryBuilder as any);

      await service.getSummaryByProject('project-1', filter);

      expect(costEntrySpy).toHaveBeenCalled();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'entry.entry_date >= :fromDate',
        { fromDate: '2024-01-01' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'entry.entry_date <= :toDate',
        { toDate: '2024-12-31' },
      );
    });

    it('should apply cost code filters', async () => {
      const filter: CostReportFilterDto = {
        projectId: 'project-1',
        costCodeId: ['cost-code-1', 'cost-code-2'],
      };

      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);

      const budgetQueryBuilder = {
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockBudget),
      };
      jest.spyOn(budgetRepo, 'createQueryBuilder').mockReturnValue(budgetQueryBuilder as any);

      const lineItemQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([mockBudgetLineItem]),
      };
      jest.spyOn(budgetLineItemRepo, 'createQueryBuilder').mockReturnValue(lineItemQueryBuilder as any);

      const commitmentQueryBuilder = {
        ...mockQueryBuilder,
        getRawOne: jest.fn().mockResolvedValue({ totalCommitted: '0' }),
      };
      const commitmentSpy = jest.spyOn(commitmentItemRepo, 'createQueryBuilder').mockReturnValue(commitmentQueryBuilder as any);

      const costEntryQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([]),
      };
      const costEntrySpy = jest.spyOn(costEntryRepo, 'createQueryBuilder').mockReturnValue(costEntryQueryBuilder as any);

      const accrualQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([]),
      };
      jest.spyOn(accrualRepo, 'createQueryBuilder').mockReturnValue(accrualQueryBuilder as any);

      const transferQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([]),
      };
      jest.spyOn(costTransferRepo, 'createQueryBuilder').mockReturnValue(transferQueryBuilder as any);

      await service.getSummaryByProject('project-1', filter);

      expect(commitmentSpy).toHaveBeenCalled();
      expect(costEntrySpy).toHaveBeenCalled();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'item.cost_code_id IN (:...costCodeIds)',
        { costCodeIds: ['cost-code-1', 'cost-code-2'] },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'entry.cost_code_id IN (:...costCodeIds)',
        { costCodeIds: ['cost-code-1', 'cost-code-2'] },
      );
    });

    it('should apply type filters', async () => {
      const filter: CostReportFilterDto = {
        projectId: 'project-1',
        includeTypes: [CostEntryType.LABOR, CostEntryType.MATERIAL],
      };

      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);

      const budgetQueryBuilder = {
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockBudget),
      };
      jest.spyOn(budgetRepo, 'createQueryBuilder').mockReturnValue(budgetQueryBuilder as any);

      const lineItemQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([mockBudgetLineItem]),
      };
      jest.spyOn(budgetLineItemRepo, 'createQueryBuilder').mockReturnValue(lineItemQueryBuilder as any);

      const commitmentQueryBuilder = {
        ...mockQueryBuilder,
        getRawOne: jest.fn().mockResolvedValue({ totalCommitted: '0' }),
      };
      jest.spyOn(commitmentItemRepo, 'createQueryBuilder').mockReturnValue(commitmentQueryBuilder as any);

      const costEntryQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([]),
      };
      const costEntrySpy = jest.spyOn(costEntryRepo, 'createQueryBuilder').mockReturnValue(costEntryQueryBuilder as any);

      const accrualQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([]),
      };
      jest.spyOn(accrualRepo, 'createQueryBuilder').mockReturnValue(accrualQueryBuilder as any);

      const transferQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([]),
      };
      jest.spyOn(costTransferRepo, 'createQueryBuilder').mockReturnValue(transferQueryBuilder as any);

      await service.getSummaryByProject('project-1', filter);

      expect(costEntrySpy).toHaveBeenCalled();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'entry.type IN (:...types)',
        { types: [CostEntryType.LABOR, CostEntryType.MATERIAL] },
      );
    });

    it('should apply status filters', async () => {
      const filter: CostReportFilterDto = {
        projectId: 'project-1',
        includeStatuses: [CostEntryStatus.POSTED, CostEntryStatus.APPROVED],
      };

      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);

      const budgetQueryBuilder = {
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockBudget),
      };
      jest.spyOn(budgetRepo, 'createQueryBuilder').mockReturnValue(budgetQueryBuilder as any);

      const lineItemQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([mockBudgetLineItem]),
      };
      jest.spyOn(budgetLineItemRepo, 'createQueryBuilder').mockReturnValue(lineItemQueryBuilder as any);

      const commitmentQueryBuilder = {
        ...mockQueryBuilder,
        getRawOne: jest.fn().mockResolvedValue({ totalCommitted: '0' }),
      };
      jest.spyOn(commitmentItemRepo, 'createQueryBuilder').mockReturnValue(commitmentQueryBuilder as any);

      const costEntryQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([]),
      };
      const costEntrySpy = jest.spyOn(costEntryRepo, 'createQueryBuilder').mockReturnValue(costEntryQueryBuilder as any);

      const accrualQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([]),
      };
      jest.spyOn(accrualRepo, 'createQueryBuilder').mockReturnValue(accrualQueryBuilder as any);

      const transferQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([]),
      };
      jest.spyOn(costTransferRepo, 'createQueryBuilder').mockReturnValue(transferQueryBuilder as any);

      await service.getSummaryByProject('project-1', filter);

      expect(costEntrySpy).toHaveBeenCalled();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'entry.status IN (:...statuses)',
        { statuses: [CostEntryStatus.POSTED, CostEntryStatus.APPROVED] },
      );
    });

    it('should use specific budget when budgetId is provided', async () => {
      const filter: CostReportFilterDto = {
        projectId: 'project-1',
        budgetId: 'budget-2',
      };

      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);

      const budgetQueryBuilder = {
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockBudget),
      };
      const budgetSpy = jest.spyOn(budgetRepo, 'createQueryBuilder').mockReturnValue(budgetQueryBuilder as any);

      const lineItemQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([mockBudgetLineItem]),
      };
      jest.spyOn(budgetLineItemRepo, 'createQueryBuilder').mockReturnValue(lineItemQueryBuilder as any);

      const commitmentQueryBuilder = {
        ...mockQueryBuilder,
        getRawOne: jest.fn().mockResolvedValue({ totalCommitted: '0' }),
      };
      jest.spyOn(commitmentItemRepo, 'createQueryBuilder').mockReturnValue(commitmentQueryBuilder as any);

      const costEntryQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([]),
      };
      jest.spyOn(costEntryRepo, 'createQueryBuilder').mockReturnValue(costEntryQueryBuilder as any);

      const accrualQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([]),
      };
      jest.spyOn(accrualRepo, 'createQueryBuilder').mockReturnValue(accrualQueryBuilder as any);

      const transferQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([]),
      };
      jest.spyOn(costTransferRepo, 'createQueryBuilder').mockReturnValue(transferQueryBuilder as any);

      await service.getSummaryByProject('project-1', filter);

      expect(budgetSpy).toHaveBeenCalled();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'budget.id = :budgetId',
        { budgetId: 'budget-2' },
      );
    });

    it('should calculate correct aggregations with multiple entries', async () => {
      const entries = [
        { ...mockCostEntry, type: CostEntryType.LABOR, totalCost: 1000 },
        { ...mockCostEntry, type: CostEntryType.MATERIAL, totalCost: 2000 },
        { ...mockCostEntry, type: CostEntryType.EQUIPMENT, totalCost: 1500 },
      ];

      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);

      const budgetQueryBuilder = {
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockBudget),
      };
      jest.spyOn(budgetRepo, 'createQueryBuilder').mockReturnValue(budgetQueryBuilder as any);

      const lineItemQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([mockBudgetLineItem]),
      };
      jest.spyOn(budgetLineItemRepo, 'createQueryBuilder').mockReturnValue(lineItemQueryBuilder as any);

      const commitmentQueryBuilder = {
        ...mockQueryBuilder,
        getRawOne: jest.fn().mockResolvedValue({ totalCommitted: '80000' }),
      };
      jest.spyOn(commitmentItemRepo, 'createQueryBuilder').mockReturnValue(commitmentQueryBuilder as any);

      const costEntryQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue(entries),
      };
      jest.spyOn(costEntryRepo, 'createQueryBuilder').mockReturnValue(costEntryQueryBuilder as any);

      const accrualQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([]),
      };
      jest.spyOn(accrualRepo, 'createQueryBuilder').mockReturnValue(accrualQueryBuilder as any);

      const transferQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([]),
      };
      jest.spyOn(costTransferRepo, 'createQueryBuilder').mockReturnValue(transferQueryBuilder as any);

      const result = await service.getSummaryByProject('project-1', {});

      expect(result.totalActual).toBe(4500);
      expect(result.entriesByType[CostEntryType.LABOR].amount).toBe(1000);
      expect(result.entriesByType[CostEntryType.MATERIAL].amount).toBe(2000);
      expect(result.entriesByType[CostEntryType.EQUIPMENT].amount).toBe(1500);
      expect(result.entriesByType[CostEntryType.LABOR].count).toBe(1);
      expect(result.entriesByType[CostEntryType.MATERIAL].count).toBe(1);
      expect(result.entriesByType[CostEntryType.EQUIPMENT].count).toBe(1);
    });

    it('should build cost code summaries correctly', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);

      const budgetQueryBuilder = {
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockBudget),
      };
      jest.spyOn(budgetRepo, 'createQueryBuilder').mockReturnValue(budgetQueryBuilder as any);

      const lineItemQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([mockBudgetLineItem]),
      };
      jest.spyOn(budgetLineItemRepo, 'createQueryBuilder').mockReturnValue(lineItemQueryBuilder as any);

      const commitmentQueryBuilder = {
        ...mockQueryBuilder,
        getRawOne: jest.fn().mockResolvedValue({ totalCommitted: '80000' }),
      };
      jest.spyOn(commitmentItemRepo, 'createQueryBuilder').mockReturnValue(commitmentQueryBuilder as any);

      const costEntryQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([mockCostEntry]),
      };
      jest.spyOn(costEntryRepo, 'createQueryBuilder').mockReturnValue(costEntryQueryBuilder as any);

      const accrualQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([]),
      };
      jest.spyOn(accrualRepo, 'createQueryBuilder').mockReturnValue(accrualQueryBuilder as any);

      const transferQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([]),
      };
      jest.spyOn(costTransferRepo, 'createQueryBuilder').mockReturnValue(transferQueryBuilder as any);

      const result = await service.getSummaryByProject('project-1', {});

      expect(result.costCodeSummaries).toHaveLength(1);
      expect(result.costCodeSummaries[0].costCodeId).toBe('cost-code-1');
      expect(result.costCodeSummaries[0].costCode).toBe('03-100');
      expect(result.costCodeSummaries[0].costCodeName).toBe('Concrete - Foundations');
    });
  });

  describe('getSummaryByCostCode', () => {
    it('should return detailed cost code summary', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(costCodeRepo, 'findOne').mockResolvedValue(mockCostCode);

      const budgetQueryBuilder = {
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockBudget),
      };
      jest.spyOn(budgetRepo, 'createQueryBuilder').mockReturnValue(budgetQueryBuilder as any);

      const lineItemQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([mockBudgetLineItem]),
      };
      jest.spyOn(budgetLineItemRepo, 'createQueryBuilder').mockReturnValue(lineItemQueryBuilder as any);

      const commitmentQueryBuilder = {
        ...mockQueryBuilder,
        getRawOne: jest.fn().mockResolvedValue({
          committedAmount: '80000',
          commitmentCount: '3',
        }),
      };
      jest.spyOn(commitmentItemRepo, 'createQueryBuilder').mockReturnValue(commitmentQueryBuilder as any);

      const costEntryQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([mockCostEntry]),
      };
      jest.spyOn(costEntryRepo, 'createQueryBuilder').mockReturnValue(costEntryQueryBuilder as any);

      const accrualQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([mockAccrual]),
      };
      jest.spyOn(accrualRepo, 'createQueryBuilder').mockReturnValue(accrualQueryBuilder as any);

      const result = await service.getSummaryByCostCode('project-1', 'cost-code-1');

      expect(result.costCodeId).toBe('cost-code-1');
      expect(result.code).toBe('03-100');
      expect(result.name).toBe('Concrete - Foundations');
      expect(result.division).toBe('03');
      expect(result.budgetAmount).toBe(100000);
      expect(result.committedAmount).toBe(80000);
      expect(result.actualCost).toBe(5000);
      expect(result.accrualAmount).toBe(3000);
      expect(result.forecastCost).toBe(83000);
      expect(result.variance).toBe(17000);
      expect(result.percentComplete).toBeGreaterThan(0);
      expect(result.entryCount).toBe(1);
      expect(result.commitmentCount).toBe(3);
      expect(result.accrualCount).toBe(1);
    });

    it('should throw NotFoundException if project does not exist', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.getSummaryByCostCode('invalid-project', 'cost-code-1'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getSummaryByCostCode('invalid-project', 'cost-code-1'),
      ).rejects.toThrow('Project with ID invalid-project not found');
    });

    it('should throw NotFoundException if cost code does not exist', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(costCodeRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.getSummaryByCostCode('project-1', 'invalid-cost-code'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getSummaryByCostCode('project-1', 'invalid-cost-code'),
      ).rejects.toThrow('Cost code with ID invalid-cost-code not found');
    });

    it('should throw NotFoundException if no active budget found', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(costCodeRepo, 'findOne').mockResolvedValue(mockCostCode);

      const budgetQueryBuilder = {
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(null),
      };
      jest.spyOn(budgetRepo, 'createQueryBuilder').mockReturnValue(budgetQueryBuilder as any);

      await expect(
        service.getSummaryByCostCode('project-1', 'cost-code-1'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getSummaryByCostCode('project-1', 'cost-code-1'),
      ).rejects.toThrow('No active budget found for project project-1');
    });

    it('should apply date filters for cost entries', async () => {
      const filter: CostReportFilterDto = {
        projectId: 'project-1',
        fromDate: '2024-01-01',
        toDate: '2024-12-31',
      };

      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(costCodeRepo, 'findOne').mockResolvedValue(mockCostCode);

      const budgetQueryBuilder = {
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockBudget),
      };
      jest.spyOn(budgetRepo, 'createQueryBuilder').mockReturnValue(budgetQueryBuilder as any);

      const lineItemQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([mockBudgetLineItem]),
      };
      jest.spyOn(budgetLineItemRepo, 'createQueryBuilder').mockReturnValue(lineItemQueryBuilder as any);

      const commitmentQueryBuilder = {
        ...mockQueryBuilder,
        getRawOne: jest.fn().mockResolvedValue({
          committedAmount: '0',
          commitmentCount: '0',
        }),
      };
      jest.spyOn(commitmentItemRepo, 'createQueryBuilder').mockReturnValue(commitmentQueryBuilder as any);

      const costEntryQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([]),
      };
      const costEntrySpy = jest.spyOn(costEntryRepo, 'createQueryBuilder').mockReturnValue(costEntryQueryBuilder as any);

      const accrualQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([]),
      };
      jest.spyOn(accrualRepo, 'createQueryBuilder').mockReturnValue(accrualQueryBuilder as any);

      await service.getSummaryByCostCode('project-1', 'cost-code-1', filter);

      expect(costEntrySpy).toHaveBeenCalled();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'entry.entry_date >= :fromDate',
        { fromDate: '2024-01-01' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'entry.entry_date <= :toDate',
        { toDate: '2024-12-31' },
      );
    });

    it('should build entry type breakdown correctly', async () => {
      const entries = [
        { ...mockCostEntry, type: CostEntryType.LABOR, totalCost: 1000 },
        { ...mockCostEntry, type: CostEntryType.LABOR, totalCost: 1500 },
        { ...mockCostEntry, type: CostEntryType.MATERIAL, totalCost: 2000 },
      ];

      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(costCodeRepo, 'findOne').mockResolvedValue(mockCostCode);

      const budgetQueryBuilder = {
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockBudget),
      };
      jest.spyOn(budgetRepo, 'createQueryBuilder').mockReturnValue(budgetQueryBuilder as any);

      const lineItemQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([mockBudgetLineItem]),
      };
      jest.spyOn(budgetLineItemRepo, 'createQueryBuilder').mockReturnValue(lineItemQueryBuilder as any);

      const commitmentQueryBuilder = {
        ...mockQueryBuilder,
        getRawOne: jest.fn().mockResolvedValue({
          committedAmount: '0',
          commitmentCount: '0',
        }),
      };
      jest.spyOn(commitmentItemRepo, 'createQueryBuilder').mockReturnValue(commitmentQueryBuilder as any);

      const costEntryQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue(entries),
      };
      jest.spyOn(costEntryRepo, 'createQueryBuilder').mockReturnValue(costEntryQueryBuilder as any);

      const accrualQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([]),
      };
      jest.spyOn(accrualRepo, 'createQueryBuilder').mockReturnValue(accrualQueryBuilder as any);

      const result = await service.getSummaryByCostCode('project-1', 'cost-code-1');

      expect(result.entryBreakdown[CostEntryType.LABOR].count).toBe(2);
      expect(result.entryBreakdown[CostEntryType.LABOR].amount).toBe(2500);
      expect(result.entryBreakdown[CostEntryType.MATERIAL].count).toBe(1);
      expect(result.entryBreakdown[CostEntryType.MATERIAL].amount).toBe(2000);
    });

    it('should include last entry details', async () => {
      const lastEntry = {
        ...mockCostEntry,
        entryDate: new Date('2024-01-20'),
        totalCost: 3500,
        description: 'Latest entry',
      };

      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(costCodeRepo, 'findOne').mockResolvedValue(mockCostCode);

      const budgetQueryBuilder = {
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockBudget),
      };
      jest.spyOn(budgetRepo, 'createQueryBuilder').mockReturnValue(budgetQueryBuilder as any);

      const lineItemQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([mockBudgetLineItem]),
      };
      jest.spyOn(budgetLineItemRepo, 'createQueryBuilder').mockReturnValue(lineItemQueryBuilder as any);

      const commitmentQueryBuilder = {
        ...mockQueryBuilder,
        getRawOne: jest.fn().mockResolvedValue({
          committedAmount: '0',
          commitmentCount: '0',
        }),
      };
      jest.spyOn(commitmentItemRepo, 'createQueryBuilder').mockReturnValue(commitmentQueryBuilder as any);

      const costEntryQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([lastEntry]),
      };
      jest.spyOn(costEntryRepo, 'createQueryBuilder').mockReturnValue(costEntryQueryBuilder as any);

      const accrualQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([]),
      };
      jest.spyOn(accrualRepo, 'createQueryBuilder').mockReturnValue(accrualQueryBuilder as any);

      const result = await service.getSummaryByCostCode('project-1', 'cost-code-1');

      expect(result.lastEntryDate).toEqual(new Date('2024-01-20'));
      expect(result.lastEntryAmount).toBe(3500);
      expect(result.lastEntryDescription).toBe('Latest entry');
    });

    it('should calculate zero percent complete when budget is zero', async () => {
      const zeroBudgetLineItem = {
        ...mockBudgetLineItem,
        budgetedCost: 0,
      };

      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(costCodeRepo, 'findOne').mockResolvedValue(mockCostCode);

      const budgetQueryBuilder = {
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockBudget),
      };
      jest.spyOn(budgetRepo, 'createQueryBuilder').mockReturnValue(budgetQueryBuilder as any);

      const lineItemQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([zeroBudgetLineItem]),
      };
      jest.spyOn(budgetLineItemRepo, 'createQueryBuilder').mockReturnValue(lineItemQueryBuilder as any);

      const commitmentQueryBuilder = {
        ...mockQueryBuilder,
        getRawOne: jest.fn().mockResolvedValue({
          committedAmount: '0',
          commitmentCount: '0',
        }),
      };
      jest.spyOn(commitmentItemRepo, 'createQueryBuilder').mockReturnValue(commitmentQueryBuilder as any);

      const costEntryQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([mockCostEntry]),
      };
      jest.spyOn(costEntryRepo, 'createQueryBuilder').mockReturnValue(costEntryQueryBuilder as any);

      const accrualQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([]),
      };
      jest.spyOn(accrualRepo, 'createQueryBuilder').mockReturnValue(accrualQueryBuilder as any);

      const result = await service.getSummaryByCostCode('project-1', 'cost-code-1');

      expect(result.percentComplete).toBe(0);
    });
  });

  describe('getSummaryByPeriod', () => {
    it('should delegate to CostPeriodService.getSummary', async () => {
      const mockPeriodSummary = {
        periodId: 'period-1',
        periodName: 'January 2024',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
        status: 'OPEN',
        totalCostEntries: 50,
        totalAmount: 25000,
        entryCountByType: {},
        entryCountByStatus: {},
      };

      jest.spyOn(costPeriodService, 'getSummary').mockResolvedValue(mockPeriodSummary as any);

      const result = await service.getSummaryByPeriod('period-1');

      expect(result).toEqual(mockPeriodSummary);
      expect(costPeriodService.getSummary).toHaveBeenCalledWith('period-1');
    });

    it('should throw NotFoundException if period does not exist', async () => {
      jest.spyOn(costPeriodService, 'getSummary').mockRejectedValue(
        new NotFoundException('Period not found'),
      );

      await expect(
        service.getSummaryByPeriod('invalid-period'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBudgetPerformance', () => {
    it('should return comprehensive budget performance metrics', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);

      const budgetQueryBuilder = {
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockBudget),
      };
      jest.spyOn(budgetRepo, 'createQueryBuilder').mockReturnValue(budgetQueryBuilder as any);

      const lineItemQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([mockBudgetLineItem]),
      };
      jest.spyOn(budgetLineItemRepo, 'createQueryBuilder').mockReturnValue(lineItemQueryBuilder as any);

      const commitmentQueryBuilder = {
        ...mockQueryBuilder,
        getRawOne: jest.fn().mockResolvedValue({ totalCommitted: '80000' }),
      };
      jest.spyOn(commitmentItemRepo, 'createQueryBuilder').mockReturnValue(commitmentQueryBuilder as any);

      const costEntryQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([
          { ...mockCostEntry, costCodeId: 'cost-code-1', totalCost: 50000 },
        ]),
      };
      jest.spyOn(costEntryRepo, 'createQueryBuilder').mockReturnValue(costEntryQueryBuilder as any);

      const result = await service.getBudgetPerformance('project-1');

      expect(result.projectId).toBe('project-1');
      expect(result.totalBudget).toBe(100000);
      expect(result.totalCommitted).toBe(80000);
      expect(result.totalActual).toBe(50000);
      expect(result.budgetRemaining).toBe(50000);
      expect(result.costPerformanceIndex).toBeCloseTo(2.0);
      expect(result.budgetConsumptionRate).toBe(50);
      expect(result.estimateAtCompletion).toBeCloseTo(50000);
      expect(result.forecastedOverrun).toBeCloseTo(-50000);
      expect(result.totalCostCodes).toBe(1);
    });

    it('should throw NotFoundException if project does not exist', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.getBudgetPerformance('invalid-project'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getBudgetPerformance('invalid-project'),
      ).rejects.toThrow('Project with ID invalid-project not found');
    });

    it('should throw NotFoundException if no active budget found', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);

      const budgetQueryBuilder = {
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(null),
      };
      jest.spyOn(budgetRepo, 'createQueryBuilder').mockReturnValue(budgetQueryBuilder as any);

      await expect(
        service.getBudgetPerformance('project-1'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getBudgetPerformance('project-1'),
      ).rejects.toThrow('No active budget found for project project-1');
    });

    it('should calculate CPI correctly', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);

      const budgetQueryBuilder = {
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockBudget),
      };
      jest.spyOn(budgetRepo, 'createQueryBuilder').mockReturnValue(budgetQueryBuilder as any);

      const lineItemQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([
          { ...mockBudgetLineItem, budgetedCost: 100000 },
        ]),
      };
      jest.spyOn(budgetLineItemRepo, 'createQueryBuilder').mockReturnValue(lineItemQueryBuilder as any);

      const commitmentQueryBuilder = {
        ...mockQueryBuilder,
        getRawOne: jest.fn().mockResolvedValue({ totalCommitted: '0' }),
      };
      jest.spyOn(commitmentItemRepo, 'createQueryBuilder').mockReturnValue(commitmentQueryBuilder as any);

      const costEntryQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([
          { ...mockCostEntry, costCodeId: 'cost-code-1', totalCost: 80000 },
        ]),
      };
      jest.spyOn(costEntryRepo, 'createQueryBuilder').mockReturnValue(costEntryQueryBuilder as any);

      const result = await service.getBudgetPerformance('project-1');

      // CPI = totalBudget / totalActual = 100000 / 80000 = 1.25
      expect(result.costPerformanceIndex).toBeCloseTo(1.25);
    });

    it('should calculate EAC correctly', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);

      const budgetQueryBuilder = {
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockBudget),
      };
      jest.spyOn(budgetRepo, 'createQueryBuilder').mockReturnValue(budgetQueryBuilder as any);

      const lineItemQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([
          { ...mockBudgetLineItem, budgetedCost: 100000 },
        ]),
      };
      jest.spyOn(budgetLineItemRepo, 'createQueryBuilder').mockReturnValue(lineItemQueryBuilder as any);

      const commitmentQueryBuilder = {
        ...mockQueryBuilder,
        getRawOne: jest.fn().mockResolvedValue({ totalCommitted: '0' }),
      };
      jest.spyOn(commitmentItemRepo, 'createQueryBuilder').mockReturnValue(commitmentQueryBuilder as any);

      const costEntryQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([
          { ...mockCostEntry, costCodeId: 'cost-code-1', totalCost: 80000 },
        ]),
      };
      jest.spyOn(costEntryRepo, 'createQueryBuilder').mockReturnValue(costEntryQueryBuilder as any);

      const result = await service.getBudgetPerformance('project-1');

      // EAC = totalBudget / CPI = 100000 / 1.25 = 80000
      expect(result.estimateAtCompletion).toBeCloseTo(80000);
    });

    it('should identify top cost overruns', async () => {
      const lineItems = [
        {
          ...mockBudgetLineItem,
          costCodeId: 'cost-code-1',
          budgetedCost: 50000,
          costCode: { ...mockCostCode, id: 'cost-code-1', code: '01-100', name: 'Code 1' },
        },
        {
          ...mockBudgetLineItem,
          id: 'line-item-2',
          costCodeId: 'cost-code-2',
          budgetedCost: 30000,
          costCode: { ...mockCostCode, id: 'cost-code-2', code: '02-100', name: 'Code 2' },
        },
      ];

      const entries = [
        { ...mockCostEntry, costCodeId: 'cost-code-1', totalCost: 60000 }, // Over by 10000
        { ...mockCostEntry, costCodeId: 'cost-code-2', totalCost: 25000 }, // Under by 5000
      ];

      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);

      const budgetQueryBuilder = {
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockBudget),
      };
      jest.spyOn(budgetRepo, 'createQueryBuilder').mockReturnValue(budgetQueryBuilder as any);

      const lineItemQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue(lineItems),
      };
      jest.spyOn(budgetLineItemRepo, 'createQueryBuilder').mockReturnValue(lineItemQueryBuilder as any);

      const commitmentQueryBuilder = {
        ...mockQueryBuilder,
        getRawOne: jest.fn().mockResolvedValue({ totalCommitted: '0' }),
      };
      jest.spyOn(commitmentItemRepo, 'createQueryBuilder').mockReturnValue(commitmentQueryBuilder as any);

      const costEntryQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue(entries),
      };
      jest.spyOn(costEntryRepo, 'createQueryBuilder').mockReturnValue(costEntryQueryBuilder as any);

      const result = await service.getBudgetPerformance('project-1');

      expect(result.topCostOverruns).toHaveLength(1);
      expect(result.topCostOverruns[0].costCodeId).toBe('cost-code-1');
      expect(result.topCostOverruns[0].variance).toBe(-10000);
      expect(result.topCostOverruns[0].actualCost).toBe(60000);
    });

    it('should count cost codes by budget status', async () => {
      const lineItems = [
        {
          ...mockBudgetLineItem,
          costCodeId: 'cost-code-1',
          budgetedCost: 50000,
          costCode: { ...mockCostCode, id: 'cost-code-1', code: '01-100' },
        },
        {
          ...mockBudgetLineItem,
          id: 'line-item-2',
          costCodeId: 'cost-code-2',
          budgetedCost: 30000,
          costCode: { ...mockCostCode, id: 'cost-code-2', code: '02-100' },
        },
        {
          ...mockBudgetLineItem,
          id: 'line-item-3',
          costCodeId: 'cost-code-3',
          budgetedCost: 20000,
          costCode: { ...mockCostCode, id: 'cost-code-3', code: '03-100' },
        },
      ];

      const entries = [
        { ...mockCostEntry, costCodeId: 'cost-code-1', totalCost: 60000 }, // Over budget
        { ...mockCostEntry, costCodeId: 'cost-code-2', totalCost: 25000 }, // Under budget
        { ...mockCostEntry, costCodeId: 'cost-code-3', totalCost: 20000 }, // On budget
      ];

      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);

      const budgetQueryBuilder = {
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockBudget),
      };
      jest.spyOn(budgetRepo, 'createQueryBuilder').mockReturnValue(budgetQueryBuilder as any);

      const lineItemQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue(lineItems),
      };
      jest.spyOn(budgetLineItemRepo, 'createQueryBuilder').mockReturnValue(lineItemQueryBuilder as any);

      const commitmentQueryBuilder = {
        ...mockQueryBuilder,
        getRawOne: jest.fn().mockResolvedValue({ totalCommitted: '0' }),
      };
      jest.spyOn(commitmentItemRepo, 'createQueryBuilder').mockReturnValue(commitmentQueryBuilder as any);

      const costEntryQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue(entries),
      };
      jest.spyOn(costEntryRepo, 'createQueryBuilder').mockReturnValue(costEntryQueryBuilder as any);

      const result = await service.getBudgetPerformance('project-1');

      expect(result.overBudgetCostCodes).toBe(1);
      expect(result.underBudgetCostCodes).toBe(1);
      expect(result.onBudgetCostCodes).toBe(1);
    });

    it('should handle zero actual cost correctly', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);

      const budgetQueryBuilder = {
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockBudget),
      };
      jest.spyOn(budgetRepo, 'createQueryBuilder').mockReturnValue(budgetQueryBuilder as any);

      const lineItemQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([mockBudgetLineItem]),
      };
      jest.spyOn(budgetLineItemRepo, 'createQueryBuilder').mockReturnValue(lineItemQueryBuilder as any);

      const commitmentQueryBuilder = {
        ...mockQueryBuilder,
        getRawOne: jest.fn().mockResolvedValue({ totalCommitted: '0' }),
      };
      jest.spyOn(commitmentItemRepo, 'createQueryBuilder').mockReturnValue(commitmentQueryBuilder as any);

      const costEntryQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([]),
      };
      jest.spyOn(costEntryRepo, 'createQueryBuilder').mockReturnValue(costEntryQueryBuilder as any);

      const result = await service.getBudgetPerformance('project-1');

      expect(result.totalActual).toBe(0);
      expect(result.costPerformanceIndex).toBe(0);
      expect(result.budgetConsumptionRate).toBe(0);
    });

    it('should apply cost code filters', async () => {
      const filter: CostReportFilterDto = {
        projectId: 'project-1',
        costCodeId: ['cost-code-1', 'cost-code-2'],
      };

      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);

      const budgetQueryBuilder = {
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockBudget),
      };
      jest.spyOn(budgetRepo, 'createQueryBuilder').mockReturnValue(budgetQueryBuilder as any);

      const lineItemQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([mockBudgetLineItem]),
      };
      jest.spyOn(budgetLineItemRepo, 'createQueryBuilder').mockReturnValue(lineItemQueryBuilder as any);

      const commitmentQueryBuilder = {
        ...mockQueryBuilder,
        getRawOne: jest.fn().mockResolvedValue({ totalCommitted: '0' }),
      };
      const commitmentSpy = jest.spyOn(commitmentItemRepo, 'createQueryBuilder').mockReturnValue(commitmentQueryBuilder as any);

      const costEntryQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([]),
      };
      const costEntrySpy = jest.spyOn(costEntryRepo, 'createQueryBuilder').mockReturnValue(costEntryQueryBuilder as any);

      await service.getBudgetPerformance('project-1', filter);

      expect(commitmentSpy).toHaveBeenCalled();
      expect(costEntrySpy).toHaveBeenCalled();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'item.cost_code_id IN (:...costCodeIds)',
        { costCodeIds: ['cost-code-1', 'cost-code-2'] },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'entry.cost_code_id IN (:...costCodeIds)',
        { costCodeIds: ['cost-code-1', 'cost-code-2'] },
      );
    });

    it('should apply date range filters', async () => {
      const filter: CostReportFilterDto = {
        projectId: 'project-1',
        fromDate: '2024-01-01',
        toDate: '2024-12-31',
      };

      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);

      const budgetQueryBuilder = {
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockBudget),
      };
      jest.spyOn(budgetRepo, 'createQueryBuilder').mockReturnValue(budgetQueryBuilder as any);

      const lineItemQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([mockBudgetLineItem]),
      };
      jest.spyOn(budgetLineItemRepo, 'createQueryBuilder').mockReturnValue(lineItemQueryBuilder as any);

      const commitmentQueryBuilder = {
        ...mockQueryBuilder,
        getRawOne: jest.fn().mockResolvedValue({ totalCommitted: '0' }),
      };
      jest.spyOn(commitmentItemRepo, 'createQueryBuilder').mockReturnValue(commitmentQueryBuilder as any);

      const costEntryQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([]),
      };
      const costEntrySpy = jest.spyOn(costEntryRepo, 'createQueryBuilder').mockReturnValue(costEntryQueryBuilder as any);

      await service.getBudgetPerformance('project-1', filter);

      expect(costEntrySpy).toHaveBeenCalled();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'entry.entry_date >= :fromDate',
        { fromDate: '2024-01-01' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'entry.entry_date <= :toDate',
        { toDate: '2024-12-31' },
      );
    });

    it('should limit top cost overruns to 10', async () => {
      const lineItems = Array.from({ length: 15 }, (_, i) => ({
        ...mockBudgetLineItem,
        id: `line-item-${i}`,
        costCodeId: `cost-code-${i}`,
        budgetedCost: 10000,
        costCode: { ...mockCostCode, id: `cost-code-${i}`, code: `0${i}-100`, name: `Code ${i}` },
      }));

      const entries = Array.from({ length: 15 }, (_, i) => ({
        ...mockCostEntry,
        id: `entry-${i}`,
        costCodeId: `cost-code-${i}`,
        totalCost: 15000, // All over budget
      }));

      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);

      const budgetQueryBuilder = {
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockBudget),
      };
      jest.spyOn(budgetRepo, 'createQueryBuilder').mockReturnValue(budgetQueryBuilder as any);

      const lineItemQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue(lineItems),
      };
      jest.spyOn(budgetLineItemRepo, 'createQueryBuilder').mockReturnValue(lineItemQueryBuilder as any);

      const commitmentQueryBuilder = {
        ...mockQueryBuilder,
        getRawOne: jest.fn().mockResolvedValue({ totalCommitted: '0' }),
      };
      jest.spyOn(commitmentItemRepo, 'createQueryBuilder').mockReturnValue(commitmentQueryBuilder as any);

      const costEntryQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue(entries),
      };
      jest.spyOn(costEntryRepo, 'createQueryBuilder').mockReturnValue(costEntryQueryBuilder as any);

      const result = await service.getBudgetPerformance('project-1');

      expect(result.topCostOverruns).toHaveLength(10);
    });
  });
});
