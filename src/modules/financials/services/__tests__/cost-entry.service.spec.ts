import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { CostEntryService } from '../cost-entry.service';
import { CostEntry } from '../../entities/cost-entry.entity';
import { CostEntryHistory } from '../../entities/cost-entry-history.entity';
import { Project } from '../../../projects/entities/project.entity';
import { Budget } from '../../entities/budget.entity';
import { BudgetLineItem } from '../../entities/budget-line-item.entity';
import { CostCode } from '../../entities/cost-code.entity';
import { Commitment } from '../../entities/commitment.entity';
import { PaymentApplication } from '../../entities/payment-application.entity';
import { CostPeriod } from '../../entities/cost-period.entity';
import { CostEntryStatus } from '../../enums/cost-entry-status.enum';
import { CostEntryType } from '../../enums/cost-entry-type.enum';
import { CostEntryAction } from '../../enums/cost-entry-action.enum';
import {
  CreateCostEntryDto,
  UpdateCostEntryDto,
  VoidCostEntryDto,
  CostEntryFilterDto,
} from '../../dto';

describe('CostEntryService', () => {
  let service: CostEntryService;
  let costEntryRepo: Repository<CostEntry>;
  let historyRepo: Repository<CostEntryHistory>;
  let projectRepo: Repository<Project>;
  let budgetRepo: Repository<Budget>;
  let budgetLineItemRepo: Repository<BudgetLineItem>;
  let costCodeRepo: Repository<CostCode>;
  let commitmentRepo: Repository<Commitment>;
  let paymentApplicationRepo: Repository<PaymentApplication>;
  let costPeriodRepo: Repository<CostPeriod>;
  let dataSource: DataSource;

  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
  } as Project;

  const mockBudget = {
    id: 'budget-1',
    projectId: 'project-1',
    name: 'Test Budget',
  } as Budget;

  const mockCostCode = {
    id: 'cost-code-1',
    code: '01-100',
    name: 'General Requirements',
    category: 'LABOR',
  } as CostCode;

  const mockCommitment = {
    id: 'commitment-1',
    vendorName: 'ACME Corp',
  } as Commitment;

  const mockPaymentApplication = {
    id: 'payment-app-1',
    applicationNumber: 'PA-001',
  } as PaymentApplication;

  const mockCostPeriod = {
    id: 'cost-period-1',
    periodName: '2025-01',
  } as CostPeriod;

  const mockCostEntry = {
    id: 'cost-entry-1',
    entryNumber: 'CE-2025-00001',
    projectId: 'project-1',
    budgetId: 'budget-1',
    costCodeId: 'cost-code-1',
    commitmentId: null,
    paymentApplicationId: null,
    costPeriodId: null,
    type: CostEntryType.LABOR,
    status: CostEntryStatus.DRAFT,
    entryDate: new Date('2025-01-15'),
    description: 'Labor costs',
    quantity: 10,
    unitCost: 100,
    totalCost: 1000,
    vendor: null,
    invoiceNumber: null,
    postedAt: null,
    postedById: null,
    voidedAt: null,
    voidedById: null,
    voidReason: null,
    notes: null,
    createdById: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as CostEntry;

  const mockBudgetLineItem = {
    id: 'line-item-1',
    budgetId: 'budget-1',
    costCodeId: 'cost-code-1',
    category: 'LABOR',
    budgetedCost: 10000,
    committedCost: 0,
    actualCost: 0,
  } as BudgetLineItem;

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      getRepository: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CostEntryService,
        {
          provide: getRepositoryToken(CostEntry),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CostEntryHistory),
          useValue: {
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Budget),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(BudgetLineItem),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CostCode),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Commitment),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PaymentApplication),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CostPeriod),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CostEntryService>(CostEntryService);
    costEntryRepo = module.get<Repository<CostEntry>>(
      getRepositoryToken(CostEntry),
    );
    historyRepo = module.get<Repository<CostEntryHistory>>(
      getRepositoryToken(CostEntryHistory),
    );
    projectRepo = module.get<Repository<Project>>(getRepositoryToken(Project));
    budgetRepo = module.get<Repository<Budget>>(getRepositoryToken(Budget));
    budgetLineItemRepo = module.get<Repository<BudgetLineItem>>(
      getRepositoryToken(BudgetLineItem),
    );
    costCodeRepo = module.get<Repository<CostCode>>(
      getRepositoryToken(CostCode),
    );
    commitmentRepo = module.get<Repository<Commitment>>(
      getRepositoryToken(Commitment),
    );
    paymentApplicationRepo = module.get<Repository<PaymentApplication>>(
      getRepositoryToken(PaymentApplication),
    );
    costPeriodRepo = module.get<Repository<CostPeriod>>(
      getRepositoryToken(CostPeriod),
    );
    dataSource = module.get<DataSource>(DataSource);

    // Mock Logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateCostEntryDto = {
      projectId: 'project-1',
      budgetId: 'budget-1',
      costCodeId: 'cost-code-1',
      type: CostEntryType.LABOR,
      entryDate: new Date('2025-01-15'),
      description: 'Labor costs',
      quantity: 10,
      unitCost: 100,
      totalCost: 1000,
    };

    it('should create a cost entry with DRAFT status', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget);
      jest.spyOn(costCodeRepo, 'findOne').mockResolvedValue(mockCostCode);
      jest
        .spyOn(costEntryRepo, 'create')
        .mockReturnValue(mockCostEntry as any);
      jest
        .spyOn(costEntryRepo, 'save')
        .mockResolvedValue(mockCostEntry as any);
      jest
        .spyOn(historyRepo, 'create')
        .mockReturnValue({} as CostEntryHistory);
      jest.spyOn(historyRepo, 'save').mockResolvedValue({} as any);
      jest
        .spyOn(costEntryRepo, 'findOne')
        .mockResolvedValue(mockCostEntry as any);

      const result = await service.create(createDto, 'user-1');

      expect(result.status).toBe(CostEntryStatus.DRAFT);
      expect(projectRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'project-1' },
      });
      expect(budgetRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'budget-1' },
      });
      expect(costCodeRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'cost-code-1' },
      });
      expect(historyRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if project does not exist', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(null);

      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if budget does not exist', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(null);

      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if cost code does not exist', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget);
      jest.spyOn(costCodeRepo, 'findOne').mockResolvedValue(null);

      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if budget does not belong to project', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue({
        ...mockBudget,
        projectId: 'different-project',
      } as Budget);

      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should calculate totalCost from quantity and unitCost if not provided', async () => {
      const dtoWithoutTotal = {
        ...createDto,
        totalCost: undefined,
      };

      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget);
      jest.spyOn(costCodeRepo, 'findOne').mockResolvedValue(mockCostCode);

      let savedEntry: any;
      jest.spyOn(costEntryRepo, 'create').mockImplementation((entry: any) => {
        savedEntry = entry;
        return entry as any;
      });
      jest.spyOn(costEntryRepo, 'save').mockResolvedValue(mockCostEntry as any);
      jest
        .spyOn(historyRepo, 'create')
        .mockReturnValue({} as CostEntryHistory);
      jest.spyOn(historyRepo, 'save').mockResolvedValue({} as any);
      jest
        .spyOn(costEntryRepo, 'findOne')
        .mockResolvedValue(mockCostEntry as any);

      await service.create(dtoWithoutTotal, 'user-1');

      expect(savedEntry.totalCost).toBe(1000);
    });

    it('should throw BadRequestException if provided totalCost does not match calculated value', async () => {
      const dtoWithWrongTotal = {
        ...createDto,
        totalCost: 999,
      };

      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget);
      jest.spyOn(costCodeRepo, 'findOne').mockResolvedValue(mockCostCode);

      await expect(
        service.create(dtoWithWrongTotal, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate optional commitment if provided', async () => {
      const dtoWithCommitment = {
        ...createDto,
        commitmentId: 'commitment-1',
      };

      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget);
      jest.spyOn(costCodeRepo, 'findOne').mockResolvedValue(mockCostCode);
      jest.spyOn(commitmentRepo, 'findOne').mockResolvedValue(mockCommitment);
      jest
        .spyOn(costEntryRepo, 'create')
        .mockReturnValue(mockCostEntry as any);
      jest
        .spyOn(costEntryRepo, 'save')
        .mockResolvedValue(mockCostEntry as any);
      jest
        .spyOn(historyRepo, 'create')
        .mockReturnValue({} as CostEntryHistory);
      jest.spyOn(historyRepo, 'save').mockResolvedValue({} as any);
      jest
        .spyOn(costEntryRepo, 'findOne')
        .mockResolvedValue(mockCostEntry as any);

      await service.create(dtoWithCommitment, 'user-1');

      expect(commitmentRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'commitment-1' },
      });
    });

    it('should throw NotFoundException if commitment does not exist', async () => {
      const dtoWithCommitment = {
        ...createDto,
        commitmentId: 'commitment-1',
      };

      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget);
      jest.spyOn(costCodeRepo, 'findOne').mockResolvedValue(mockCostCode);
      jest.spyOn(commitmentRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.create(dtoWithCommitment, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated cost entries', async () => {
      const filter: CostEntryFilterDto = {
        page: 1,
        limit: 50,
      };

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest
          .fn()
          .mockResolvedValue([[mockCostEntry], 1]),
      };

      jest
        .spyOn(costEntryRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.findAll(filter);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(50);
    });

    it('should apply project filter', async () => {
      const filter: CostEntryFilterDto = {
        projectId: 'project-1',
        page: 1,
        limit: 50,
      };

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest
          .fn()
          .mockResolvedValue([[mockCostEntry], 1]),
      };

      jest
        .spyOn(costEntryRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      await service.findAll(filter);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'costEntry.project_id = :projectId',
        { projectId: 'project-1' },
      );
    });

    it('should apply status filter', async () => {
      const filter: CostEntryFilterDto = {
        status: CostEntryStatus.POSTED,
        page: 1,
        limit: 50,
      };

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest
          .fn()
          .mockResolvedValue([[mockCostEntry], 1]),
      };

      jest
        .spyOn(costEntryRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      await service.findAll(filter);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'costEntry.status = :status',
        { status: CostEntryStatus.POSTED },
      );
    });

    it('should apply date range filters', async () => {
      const filter: CostEntryFilterDto = {
        fromDate: new Date('2025-01-01'),
        toDate: new Date('2025-01-31'),
        page: 1,
        limit: 50,
      };

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest
          .fn()
          .mockResolvedValue([[mockCostEntry], 1]),
      };

      jest
        .spyOn(costEntryRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      await service.findAll(filter);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'costEntry.entry_date >= :fromDate',
        { fromDate: filter.fromDate },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'costEntry.entry_date <= :toDate',
        { toDate: filter.toDate },
      );
    });

    it('should apply custom sorting', async () => {
      const filter: CostEntryFilterDto = {
        page: 1,
        limit: 50,
        sortBy: 'totalCost',
        sortOrder: 'ASC',
      };

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest
          .fn()
          .mockResolvedValue([[mockCostEntry], 1]),
      };

      jest
        .spyOn(costEntryRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      await service.findAll(filter);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'costEntry.totalCost',
        'ASC',
      );
    });
  });

  describe('findOne', () => {
    it('should return a cost entry by id', async () => {
      jest
        .spyOn(costEntryRepo, 'findOne')
        .mockResolvedValue(mockCostEntry as any);

      const result = await service.findOne('cost-entry-1');

      expect(result.id).toBe('cost-entry-1');
      expect(costEntryRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'cost-entry-1' },
        relations: [
          'project',
          'budget',
          'costCode',
          'commitment',
          'paymentApplication',
          'costPeriod',
          'createdBy',
          'postedBy',
          'voidedBy',
        ],
      });
    });

    it('should throw NotFoundException if cost entry does not exist', async () => {
      jest.spyOn(costEntryRepo, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('cost-entry-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateCostEntryDto = {
      description: 'Updated labor costs',
      totalCost: 1100,
    };

    it('should update a cost entry in DRAFT status', async () => {
      const draftEntry = { ...mockCostEntry, status: CostEntryStatus.DRAFT };

      jest
        .spyOn(costEntryRepo, 'findOne')
        .mockResolvedValueOnce(draftEntry as any)
        .mockResolvedValueOnce({ ...draftEntry, ...updateDto } as any);
      jest.spyOn(costEntryRepo, 'save').mockResolvedValue({
        ...draftEntry,
        ...updateDto,
      } as any);
      jest
        .spyOn(historyRepo, 'create')
        .mockReturnValue({} as CostEntryHistory);
      jest.spyOn(historyRepo, 'save').mockResolvedValue({} as any);

      const result = await service.update('cost-entry-1', updateDto, 'user-1');

      expect(result.description).toBe('Updated labor costs');
      expect(historyRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if cost entry does not exist', async () => {
      jest.spyOn(costEntryRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.update('cost-entry-1', updateDto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if status is not DRAFT', async () => {
      const postedEntry = { ...mockCostEntry, status: CostEntryStatus.POSTED };

      jest
        .spyOn(costEntryRepo, 'findOne')
        .mockResolvedValue(postedEntry as any);

      await expect(
        service.update('cost-entry-1', updateDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should recalculate totalCost if quantity or unitCost changed', async () => {
      const draftEntry = { ...mockCostEntry, status: CostEntryStatus.DRAFT };
      const updateWithQuantity: UpdateCostEntryDto = {
        quantity: 20,
        unitCost: 100,
      };

      jest
        .spyOn(costEntryRepo, 'findOne')
        .mockResolvedValueOnce(draftEntry as any)
        .mockResolvedValueOnce({
          ...draftEntry,
          ...updateWithQuantity,
          totalCost: 2000,
        } as any);

      let savedEntry: any;
      jest.spyOn(costEntryRepo, 'save').mockImplementation(async (entry: any) => {
        savedEntry = entry;
        return entry;
      });

      jest
        .spyOn(historyRepo, 'create')
        .mockReturnValue({} as CostEntryHistory);
      jest.spyOn(historyRepo, 'save').mockResolvedValue({} as any);

      await service.update('cost-entry-1', updateWithQuantity, 'user-1');

      expect(savedEntry.totalCost).toBe(2000);
    });

    it('should throw BadRequestException if provided totalCost does not match calculated value', async () => {
      const draftEntry = { ...mockCostEntry, status: CostEntryStatus.DRAFT };
      const updateWithWrongTotal: UpdateCostEntryDto = {
        quantity: 20,
        unitCost: 100,
        totalCost: 1999,
      };

      jest
        .spyOn(costEntryRepo, 'findOne')
        .mockResolvedValue(draftEntry as any);

      await expect(
        service.update('cost-entry-1', updateWithWrongTotal, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate relations if changed', async () => {
      const draftEntry = { ...mockCostEntry, status: CostEntryStatus.DRAFT };
      const updateWithNewCostCode: UpdateCostEntryDto = {
        costCodeId: 'cost-code-2',
      };

      jest
        .spyOn(costEntryRepo, 'findOne')
        .mockResolvedValueOnce(draftEntry as any)
        .mockResolvedValueOnce({
          ...draftEntry,
          costCodeId: 'cost-code-2',
        } as any);
      jest.spyOn(costCodeRepo, 'findOne').mockResolvedValue({
        id: 'cost-code-2',
        code: '01-200',
        name: 'Site Work',
      } as CostCode);
      jest.spyOn(costEntryRepo, 'save').mockResolvedValue({
        ...draftEntry,
        costCodeId: 'cost-code-2',
      } as any);
      jest
        .spyOn(historyRepo, 'create')
        .mockReturnValue({} as CostEntryHistory);
      jest.spyOn(historyRepo, 'save').mockResolvedValue({} as any);

      await service.update('cost-entry-1', updateWithNewCostCode, 'user-1');

      expect(costCodeRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'cost-code-2' },
      });
    });
  });

  describe('remove', () => {
    it('should delete a cost entry in DRAFT status', async () => {
      const draftEntry = { ...mockCostEntry, status: CostEntryStatus.DRAFT };

      jest
        .spyOn(costEntryRepo, 'findOne')
        .mockResolvedValue(draftEntry as any);
      jest.spyOn(costEntryRepo, 'remove').mockResolvedValue(draftEntry as any);

      await service.remove('cost-entry-1', 'user-1');

      expect(costEntryRepo.remove).toHaveBeenCalledWith(draftEntry);
    });

    it('should throw NotFoundException if cost entry does not exist', async () => {
      jest.spyOn(costEntryRepo, 'findOne').mockResolvedValue(null);

      await expect(service.remove('cost-entry-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if status is not DRAFT', async () => {
      const postedEntry = { ...mockCostEntry, status: CostEntryStatus.POSTED };

      jest
        .spyOn(costEntryRepo, 'findOne')
        .mockResolvedValue(postedEntry as any);

      await expect(service.remove('cost-entry-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('post', () => {
    it('should post a cost entry and update budget actualCost', async () => {
      const draftEntry = { ...mockCostEntry, status: CostEntryStatus.DRAFT };
      const postedEntry = {
        ...draftEntry,
        status: CostEntryStatus.POSTED,
        postedAt: new Date(),
        postedById: 'user-1',
      };

      jest.spyOn(dataSource, 'createQueryRunner').mockReturnValue({
        ...mockQueryRunner,
        manager: {
          ...mockQueryRunner.manager,
          findOne: jest
            .fn()
            .mockResolvedValueOnce({ ...draftEntry, costCode: mockCostCode, budget: mockBudget })
            .mockResolvedValueOnce(mockBudgetLineItem),
          save: jest.fn().mockResolvedValue(postedEntry),
          create: jest.fn().mockReturnValue({}),
          getRepository: jest.fn().mockReturnValue({
            findOne: jest.fn().mockResolvedValue(mockBudgetLineItem),
            save: jest.fn().mockResolvedValue({
              ...mockBudgetLineItem,
              actualCost: 1000,
            }),
          }),
        },
      } as any);

      jest
        .spyOn(costEntryRepo, 'findOne')
        .mockResolvedValue(postedEntry as any);

      const result = await service.post('cost-entry-1', 'user-1');

      expect(result.status).toBe(CostEntryStatus.POSTED);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw NotFoundException if cost entry does not exist', async () => {
      jest.spyOn(dataSource, 'createQueryRunner').mockReturnValue({
        ...mockQueryRunner,
        manager: {
          ...mockQueryRunner.manager,
          findOne: jest.fn().mockResolvedValue(null),
        },
      } as any);

      await expect(service.post('cost-entry-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw BadRequestException if status is not DRAFT', async () => {
      const postedEntry = { ...mockCostEntry, status: CostEntryStatus.POSTED };

      jest.spyOn(dataSource, 'createQueryRunner').mockReturnValue({
        ...mockQueryRunner,
        manager: {
          ...mockQueryRunner.manager,
          findOne: jest.fn().mockResolvedValue(postedEntry),
        },
      } as any);

      await expect(service.post('cost-entry-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should create a new budget line item if one does not exist', async () => {
      const draftEntry = { ...mockCostEntry, status: CostEntryStatus.DRAFT };
      const postedEntry = {
        ...draftEntry,
        status: CostEntryStatus.POSTED,
        postedAt: new Date(),
        postedById: 'user-1',
      };

      const newLineItem = {
        ...mockBudgetLineItem,
        actualCost: 1000,
      };

      jest.spyOn(dataSource, 'createQueryRunner').mockReturnValue({
        ...mockQueryRunner,
        manager: {
          ...mockQueryRunner.manager,
          findOne: jest
            .fn()
            .mockResolvedValueOnce({ ...draftEntry, costCode: mockCostCode, budget: mockBudget })
            .mockResolvedValueOnce(mockCostCode),
          save: jest.fn().mockResolvedValue(postedEntry),
          create: jest.fn().mockReturnValue({}),
          getRepository: jest.fn().mockReturnValue({
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockReturnValue(newLineItem),
            save: jest.fn().mockResolvedValue(newLineItem),
          }),
        },
      } as any);

      jest.spyOn(costCodeRepo, 'findOne').mockResolvedValue(mockCostCode);
      jest
        .spyOn(costEntryRepo, 'findOne')
        .mockResolvedValue(postedEntry as any);

      const result = await service.post('cost-entry-1', 'user-1');

      expect(result.status).toBe(CostEntryStatus.POSTED);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      const error = new Error('Database error');

      jest.spyOn(dataSource, 'createQueryRunner').mockReturnValue({
        ...mockQueryRunner,
        manager: {
          ...mockQueryRunner.manager,
          findOne: jest.fn().mockRejectedValue(error),
        },
      } as any);

      await expect(service.post('cost-entry-1', 'user-1')).rejects.toThrow(
        error,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('void', () => {
    const voidDto: VoidCostEntryDto = {
      voidReason: 'Entry was incorrect',
    };

    it('should void a posted cost entry and reverse budget actualCost', async () => {
      const postedEntry = {
        ...mockCostEntry,
        status: CostEntryStatus.POSTED,
        postedAt: new Date(),
        postedById: 'user-1',
      };
      const voidedEntry = {
        ...postedEntry,
        status: CostEntryStatus.VOID,
        voidedAt: new Date(),
        voidedById: 'user-1',
        voidReason: 'Entry was incorrect',
      };

      const updatedLineItem = {
        ...mockBudgetLineItem,
        actualCost: 1000,
      };

      jest.spyOn(dataSource, 'createQueryRunner').mockReturnValue({
        ...mockQueryRunner,
        manager: {
          ...mockQueryRunner.manager,
          findOne: jest.fn().mockResolvedValue({ ...postedEntry, costCode: mockCostCode, budget: mockBudget }),
          save: jest.fn().mockResolvedValue(voidedEntry),
          create: jest.fn().mockReturnValue({}),
          getRepository: jest.fn().mockReturnValue({
            findOne: jest.fn().mockResolvedValue(updatedLineItem),
            save: jest.fn().mockResolvedValue({
              ...updatedLineItem,
              actualCost: 0,
            }),
          }),
        },
      } as any);

      jest
        .spyOn(costEntryRepo, 'findOne')
        .mockResolvedValue(voidedEntry as any);

      const result = await service.void('cost-entry-1', voidDto, 'user-1');

      expect(result.status).toBe(CostEntryStatus.VOID);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw NotFoundException if cost entry does not exist', async () => {
      jest.spyOn(dataSource, 'createQueryRunner').mockReturnValue({
        ...mockQueryRunner,
        manager: {
          ...mockQueryRunner.manager,
          findOne: jest.fn().mockResolvedValue(null),
        },
      } as any);

      await expect(
        service.void('cost-entry-1', voidDto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw BadRequestException if status is not POSTED', async () => {
      const draftEntry = { ...mockCostEntry, status: CostEntryStatus.DRAFT };

      jest.spyOn(dataSource, 'createQueryRunner').mockReturnValue({
        ...mockQueryRunner,
        manager: {
          ...mockQueryRunner.manager,
          findOne: jest.fn().mockResolvedValue(draftEntry),
        },
      } as any);

      await expect(
        service.void('cost-entry-1', voidDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      const error = new Error('Database error');

      jest.spyOn(dataSource, 'createQueryRunner').mockReturnValue({
        ...mockQueryRunner,
        manager: {
          ...mockQueryRunner.manager,
          findOne: jest.fn().mockRejectedValue(error),
        },
      } as any);

      await expect(
        service.void('cost-entry-1', voidDto, 'user-1'),
      ).rejects.toThrow(error);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('workflow validations', () => {
    it('should only allow DRAFT entries to be updated', async () => {
      const postedEntry = { ...mockCostEntry, status: CostEntryStatus.POSTED };

      jest
        .spyOn(costEntryRepo, 'findOne')
        .mockResolvedValue(postedEntry as any);

      await expect(
        service.update('cost-entry-1', { description: 'New' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should only allow DRAFT entries to be deleted', async () => {
      const postedEntry = { ...mockCostEntry, status: CostEntryStatus.POSTED };

      jest
        .spyOn(costEntryRepo, 'findOne')
        .mockResolvedValue(postedEntry as any);

      await expect(service.remove('cost-entry-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should only allow DRAFT entries to be posted', async () => {
      const voidEntry = { ...mockCostEntry, status: CostEntryStatus.VOID };

      jest.spyOn(dataSource, 'createQueryRunner').mockReturnValue({
        ...mockQueryRunner,
        manager: {
          ...mockQueryRunner.manager,
          findOne: jest.fn().mockResolvedValue(voidEntry),
        },
      } as any);

      await expect(service.post('cost-entry-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should only allow POSTED entries to be voided', async () => {
      const draftEntry = { ...mockCostEntry, status: CostEntryStatus.DRAFT };

      jest.spyOn(dataSource, 'createQueryRunner').mockReturnValue({
        ...mockQueryRunner,
        manager: {
          ...mockQueryRunner.manager,
          findOne: jest.fn().mockResolvedValue(draftEntry),
        },
      } as any);

      await expect(
        service.void('cost-entry-1', { voidReason: 'Test' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('budget integration', () => {
    it('should increment budget actualCost when posting', async () => {
      const draftEntry = { ...mockCostEntry, status: CostEntryStatus.DRAFT };
      const lineItemWithZeroActual = {
        ...mockBudgetLineItem,
        actualCost: 0,
      };

      let savedLineItem: any;
      const mockRepo = {
        findOne: jest.fn().mockResolvedValue(lineItemWithZeroActual),
        save: jest.fn().mockImplementation(async (item: any) => {
          savedLineItem = item;
          return item;
        }),
      };

      jest.spyOn(dataSource, 'createQueryRunner').mockReturnValue({
        ...mockQueryRunner,
        manager: {
          ...mockQueryRunner.manager,
          findOne: jest.fn().mockResolvedValue({ ...draftEntry, costCode: mockCostCode, budget: mockBudget }),
          save: jest.fn().mockResolvedValue({
            ...draftEntry,
            status: CostEntryStatus.POSTED,
          }),
          create: jest.fn().mockReturnValue({}),
          getRepository: jest.fn().mockReturnValue(mockRepo),
        },
      } as any);

      jest.spyOn(costEntryRepo, 'findOne').mockResolvedValue({
        ...draftEntry,
        status: CostEntryStatus.POSTED,
      } as any);

      await service.post('cost-entry-1', 'user-1');

      expect(savedLineItem.actualCost).toBe(1000);
    });

    it('should decrement budget actualCost when voiding', async () => {
      const postedEntry = {
        ...mockCostEntry,
        status: CostEntryStatus.POSTED,
      };
      const lineItemWithActual = {
        ...mockBudgetLineItem,
        actualCost: 1000,
      };

      let savedLineItem: any;
      const mockRepo = {
        findOne: jest.fn().mockResolvedValue(lineItemWithActual),
        save: jest.fn().mockImplementation(async (item: any) => {
          savedLineItem = item;
          return item;
        }),
      };

      jest.spyOn(dataSource, 'createQueryRunner').mockReturnValue({
        ...mockQueryRunner,
        manager: {
          ...mockQueryRunner.manager,
          findOne: jest.fn().mockResolvedValue({ ...postedEntry, costCode: mockCostCode, budget: mockBudget }),
          save: jest.fn().mockResolvedValue({
            ...postedEntry,
            status: CostEntryStatus.VOID,
          }),
          create: jest.fn().mockReturnValue({}),
          getRepository: jest.fn().mockReturnValue(mockRepo),
        },
      } as any);

      jest.spyOn(costEntryRepo, 'findOne').mockResolvedValue({
        ...postedEntry,
        status: CostEntryStatus.VOID,
      } as any);

      await service.void('cost-entry-1', { voidReason: 'Test' }, 'user-1');

      expect(savedLineItem.actualCost).toBe(0);
    });

    it('should not allow actualCost to go below zero when voiding', async () => {
      const postedEntry = {
        ...mockCostEntry,
        status: CostEntryStatus.POSTED,
      };
      const lineItemWithLowActual = {
        ...mockBudgetLineItem,
        actualCost: 500,
      };

      let savedLineItem: any;
      const mockRepo = {
        findOne: jest.fn().mockResolvedValue(lineItemWithLowActual),
        save: jest.fn().mockImplementation(async (item: any) => {
          savedLineItem = item;
          return item;
        }),
      };

      jest.spyOn(dataSource, 'createQueryRunner').mockReturnValue({
        ...mockQueryRunner,
        manager: {
          ...mockQueryRunner.manager,
          findOne: jest.fn().mockResolvedValue({ ...postedEntry, costCode: mockCostCode, budget: mockBudget }),
          save: jest.fn().mockResolvedValue({
            ...postedEntry,
            status: CostEntryStatus.VOID,
          }),
          create: jest.fn().mockReturnValue({}),
          getRepository: jest.fn().mockReturnValue(mockRepo),
        },
      } as any);

      jest.spyOn(costEntryRepo, 'findOne').mockResolvedValue({
        ...postedEntry,
        status: CostEntryStatus.VOID,
      } as any);

      await service.void('cost-entry-1', { voidReason: 'Test' }, 'user-1');

      expect(savedLineItem.actualCost).toBe(0);
    });
  });

  describe('workflow integration', () => {
    it('should support full workflow: create → post → void', async () => {
      const createDto: CreateCostEntryDto = {
        projectId: 'project-1',
        budgetId: 'budget-1',
        costCodeId: 'cost-code-1',
        type: CostEntryType.LABOR,
        entryDate: new Date('2025-01-15'),
        description: 'Labor costs',
        quantity: 10,
        unitCost: 100,
      };

      // Create
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget);
      jest.spyOn(costCodeRepo, 'findOne').mockResolvedValue(mockCostCode);
      jest
        .spyOn(costEntryRepo, 'create')
        .mockReturnValue(mockCostEntry as any);
      jest
        .spyOn(costEntryRepo, 'save')
        .mockResolvedValue(mockCostEntry as any);
      jest
        .spyOn(historyRepo, 'create')
        .mockReturnValue({} as CostEntryHistory);
      jest.spyOn(historyRepo, 'save').mockResolvedValue({} as any);

      let currentEntry = { ...mockCostEntry };
      jest
        .spyOn(costEntryRepo, 'findOne')
        .mockImplementation(async () => currentEntry as any);

      const created = await service.create(createDto, 'user-1');
      expect(created.status).toBe(CostEntryStatus.DRAFT);

      // Post
      currentEntry = {
        ...currentEntry,
        status: CostEntryStatus.POSTED,
        postedAt: new Date(),
        postedById: 'user-1',
      };

      jest.spyOn(dataSource, 'createQueryRunner').mockReturnValue({
        ...mockQueryRunner,
        manager: {
          ...mockQueryRunner.manager,
          findOne: jest
            .fn()
            .mockResolvedValue({ ...mockCostEntry, status: CostEntryStatus.DRAFT, costCode: mockCostCode, budget: mockBudget }),
          save: jest.fn().mockResolvedValue(currentEntry),
          create: jest.fn().mockReturnValue({}),
          getRepository: jest.fn().mockReturnValue({
            findOne: jest.fn().mockResolvedValue(mockBudgetLineItem),
            save: jest.fn().mockResolvedValue(mockBudgetLineItem),
          }),
        },
      } as any);

      const posted = await service.post('cost-entry-1', 'user-1');
      expect(posted.status).toBe(CostEntryStatus.POSTED);

      // Void
      currentEntry = {
        ...currentEntry,
        status: CostEntryStatus.VOID,
        voidedAt: new Date(),
        voidedById: 'user-1',
        voidReason: 'Test void',
      };

      jest.spyOn(dataSource, 'createQueryRunner').mockReturnValue({
        ...mockQueryRunner,
        manager: {
          ...mockQueryRunner.manager,
          findOne: jest
            .fn()
            .mockResolvedValue({ ...posted, status: CostEntryStatus.POSTED, costCode: mockCostCode, budget: mockBudget }),
          save: jest.fn().mockResolvedValue(currentEntry),
          create: jest.fn().mockReturnValue({}),
          getRepository: jest.fn().mockReturnValue({
            findOne: jest.fn().mockResolvedValue(mockBudgetLineItem),
            save: jest.fn().mockResolvedValue(mockBudgetLineItem),
          }),
        },
      } as any);

      const voided = await service.void(
        'cost-entry-1',
        { voidReason: 'Test void' },
        'user-1',
      );
      expect(voided.status).toBe(CostEntryStatus.VOID);
    });
  });

  describe('toResponseDto', () => {
    it('should convert entity to response DTO', () => {
      const entryWithRelations = {
        ...mockCostEntry,
        project: mockProject,
        budget: mockBudget,
        costCode: mockCostCode,
      };

      const result = service.toResponseDto(entryWithRelations as any);

      expect(result.id).toBe('cost-entry-1');
      expect(result.project).toEqual({ name: 'Test Project' });
      expect(result.budget).toEqual({ name: 'Test Budget' });
      expect(result.costCode).toEqual({ code: '01-100', name: 'General Requirements' });
    });

    it('should handle missing relations gracefully', () => {
      const result = service.toResponseDto(mockCostEntry as any);

      expect(result.id).toBe('cost-entry-1');
      expect(result.project).toBeUndefined();
      expect(result.budget).toBeUndefined();
      expect(result.costCode).toBeUndefined();
    });
  });
});
