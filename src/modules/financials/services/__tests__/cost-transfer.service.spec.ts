import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { CostTransferService } from '../cost-transfer.service';
import { CostTransfer } from '../../entities/cost-transfer.entity';
import { CostEntry } from '../../entities/cost-entry.entity';
import { CostEntryHistory } from '../../entities/cost-entry-history.entity';
import { Budget } from '../../entities/budget.entity';
import { BudgetLineItem } from '../../entities/budget-line-item.entity';
import { CostCode } from '../../entities/cost-code.entity';
import { Project } from '../../../projects/entities/project.entity';
import { CostEntryService } from '../cost-entry.service';
import { CostTransferStatus } from '../../enums/cost-transfer-status.enum';
import { CostEntryType } from '../../enums/cost-entry-type.enum';
import { CostEntryStatus } from '../../enums/cost-entry-status.enum';
import {
  CreateCostTransferDto,
  UpdateCostTransferDto,
  CostTransferFilterDto,
  RejectCostTransferDto,
  VoidCostTransferDto,
} from '../../dto';

describe('CostTransferService', () => {
  let service: CostTransferService;
  let costTransferRepo: Repository<CostTransfer>;
  let costEntryRepo: Repository<CostEntry>;
  let budgetRepo: Repository<Budget>;
  let budgetLineItemRepo: Repository<BudgetLineItem>;
  let costCodeRepo: Repository<CostCode>;
  let projectRepo: Repository<Project>;
  let costEntryService: CostEntryService;
  let dataSource: DataSource;

  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
  } as Project;

  const mockBudget = {
    id: 'budget-1',
    name: 'Test Budget',
    projectId: 'project-1',
  } as Budget;

  const mockFromCostCode = {
    id: 'cost-code-1',
    code: 'CC-001',
    name: 'Labor',
    category: 'LABOR',
  } as CostCode;

  const mockToCostCode = {
    id: 'cost-code-2',
    code: 'CC-002',
    name: 'Materials',
    category: 'MATERIALS',
  } as CostCode;

  const mockCostTransfer = {
    id: 'transfer-1',
    transferNumber: 'CT-001',
    projectId: 'project-1',
    budgetId: 'budget-1',
    fromCostCodeId: 'cost-code-1',
    toCostCodeId: 'cost-code-2',
    amount: 5000,
    reason: 'Cost reallocation',
    status: CostTransferStatus.DRAFT,
    requestedById: 'user-1',
    requestedAt: new Date(),
    approvedById: null,
    approvedAt: null,
    rejectedById: null,
    rejectedAt: null,
    rejectionReason: null,
    voidedById: null,
    voidedAt: null,
    voidReason: null,
    fromEntryId: null,
    toEntryId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as CostTransfer;

  const mockBudgetLineItem = {
    id: 'line-item-1',
    budgetId: 'budget-1',
    costCodeId: 'cost-code-1',
    category: 'LABOR',
    budgetedCost: 50000,
    committedCost: 10000,
    actualCost: 20000,
  } as BudgetLineItem;

  const mockCostEntry = {
    id: 'entry-1',
    entryNumber: 'CE-001',
    projectId: 'project-1',
    budgetId: 'budget-1',
    costCodeId: 'cost-code-1',
    type: CostEntryType.OTHER_DIRECT,
    status: CostEntryStatus.POSTED,
    entryDate: new Date(),
    description: 'Test entry',
    totalCost: -5000,
    createdById: 'user-1',
    postedAt: new Date(),
    postedById: 'user-1',
  } as CostEntry;

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CostTransferService,
        {
          provide: getRepositoryToken(CostTransfer),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
            })),
          },
        },
        {
          provide: getRepositoryToken(CostEntry),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
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
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: CostEntryService,
          useValue: {
            create: jest.fn(),
            post: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(() => mockQueryRunner),
          },
        },
      ],
    }).compile();

    service = module.get<CostTransferService>(CostTransferService);
    costTransferRepo = module.get<Repository<CostTransfer>>(
      getRepositoryToken(CostTransfer),
    );
    costEntryRepo = module.get<Repository<CostEntry>>(
      getRepositoryToken(CostEntry),
    );
    budgetRepo = module.get<Repository<Budget>>(getRepositoryToken(Budget));
    budgetLineItemRepo = module.get<Repository<BudgetLineItem>>(
      getRepositoryToken(BudgetLineItem),
    );
    costCodeRepo = module.get<Repository<CostCode>>(
      getRepositoryToken(CostCode),
    );
    projectRepo = module.get<Repository<Project>>(getRepositoryToken(Project));
    costEntryService = module.get<CostEntryService>(CostEntryService);
    dataSource = module.get<DataSource>(DataSource);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateCostTransferDto = {
      projectId: 'project-1',
      budgetId: 'budget-1',
      fromCostCodeId: 'cost-code-1',
      toCostCodeId: 'cost-code-2',
      amount: 5000,
      reason: 'Cost reallocation',
    };

    it('should create a cost transfer with DRAFT status', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget);
      jest.spyOn(costCodeRepo, 'findOne')
        .mockResolvedValueOnce(mockFromCostCode)
        .mockResolvedValueOnce(mockToCostCode);
      jest.spyOn(costTransferRepo, 'create').mockReturnValue(mockCostTransfer as any);
      jest.spyOn(costTransferRepo, 'save').mockResolvedValue(mockCostTransfer as any);
      jest.spyOn(costTransferRepo, 'findOne').mockResolvedValue({
        ...mockCostTransfer,
        project: mockProject,
        budget: mockBudget,
        fromCostCode: mockFromCostCode,
        toCostCode: mockToCostCode,
      } as any);

      const result = await service.create(createDto, 'user-1');

      expect(result.status).toBe(CostTransferStatus.DRAFT);
      expect(costTransferRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: CostTransferStatus.DRAFT,
          requestedById: 'user-1',
        }),
      );
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

    it('should throw BadRequestException if budget does not belong to project', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue({
        ...mockBudget,
        projectId: 'different-project',
      } as any);

      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if from cost code does not exist', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget);
      jest.spyOn(costCodeRepo, 'findOne').mockResolvedValue(null);

      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if to cost code does not exist', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget);
      jest.spyOn(costCodeRepo, 'findOne')
        .mockResolvedValueOnce(mockFromCostCode)
        .mockResolvedValueOnce(null);

      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if from and to cost codes are the same', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget);
      jest.spyOn(costCodeRepo, 'findOne')
        .mockResolvedValueOnce(mockFromCostCode)
        .mockResolvedValueOnce(mockFromCostCode);

      const invalidDto = { ...createDto, toCostCodeId: 'cost-code-1' };

      await expect(service.create(invalidDto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated cost transfers', async () => {
      const mockTransfers = [mockCostTransfer];
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockTransfers, 1]),
      };
      jest.spyOn(costTransferRepo, 'createQueryBuilder').mockReturnValue(queryBuilder as any);

      const filter: CostTransferFilterDto = { page: 1, limit: 10 };
      const result = await service.findAll(filter);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should apply filters correctly', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      jest.spyOn(costTransferRepo, 'createQueryBuilder').mockReturnValue(queryBuilder as any);

      const filter: CostTransferFilterDto = {
        projectId: 'project-1',
        budgetId: 'budget-1',
        status: CostTransferStatus.APPROVED,
        page: 1,
        limit: 10,
      };

      await service.findAll(filter);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'costTransfer.project_id = :projectId',
        { projectId: 'project-1' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'costTransfer.budget_id = :budgetId',
        { budgetId: 'budget-1' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'costTransfer.status = :status',
        { status: CostTransferStatus.APPROVED },
      );
    });
  });

  describe('findOne', () => {
    it('should return a cost transfer by id', async () => {
      jest.spyOn(costTransferRepo, 'findOne').mockResolvedValue({
        ...mockCostTransfer,
        project: mockProject,
        budget: mockBudget,
        fromCostCode: mockFromCostCode,
        toCostCode: mockToCostCode,
      } as any);

      const result = await service.findOne('transfer-1');

      expect(result.id).toBe('transfer-1');
      expect(costTransferRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'transfer-1' },
        relations: expect.any(Array),
      });
    });

    it('should throw NotFoundException if transfer does not exist', async () => {
      jest.spyOn(costTransferRepo, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('transfer-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateCostTransferDto = {
      amount: 7000,
      reason: 'Updated reason',
    };

    it('should update a DRAFT cost transfer', async () => {
      jest.spyOn(costTransferRepo, 'findOne')
        .mockResolvedValueOnce(mockCostTransfer as any)
        .mockResolvedValueOnce({
          ...mockCostTransfer,
          ...updateDto,
          project: mockProject,
          budget: mockBudget,
          fromCostCode: mockFromCostCode,
          toCostCode: mockToCostCode,
        } as any);
      jest.spyOn(costTransferRepo, 'save').mockResolvedValue({
        ...mockCostTransfer,
        ...updateDto,
      } as any);

      const result = await service.update('transfer-1', updateDto, 'user-1');

      expect(result.amount).toBe(7000);
      expect(costTransferRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if transfer does not exist', async () => {
      jest.spyOn(costTransferRepo, 'findOne').mockResolvedValue(null);

      await expect(service.update('transfer-1', updateDto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if status is not DRAFT', async () => {
      jest.spyOn(costTransferRepo, 'findOne').mockResolvedValue({
        ...mockCostTransfer,
        status: CostTransferStatus.APPROVED,
      } as any);

      await expect(service.update('transfer-1', updateDto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate cost codes if changed', async () => {
      jest.spyOn(costTransferRepo, 'findOne').mockResolvedValue(mockCostTransfer as any);
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget);
      jest.spyOn(costCodeRepo, 'findOne')
        .mockResolvedValueOnce(mockFromCostCode)
        .mockResolvedValueOnce(null);

      const updateWithCostCodes: UpdateCostTransferDto = {
        toCostCodeId: 'invalid-cost-code',
      };

      await expect(
        service.update('transfer-1', updateWithCostCodes, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if from and to cost codes become the same', async () => {
      jest.spyOn(costTransferRepo, 'findOne').mockResolvedValue(mockCostTransfer as any);
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget);
      jest.spyOn(costCodeRepo, 'findOne')
        .mockResolvedValueOnce(mockFromCostCode)
        .mockResolvedValueOnce(mockFromCostCode);

      const updateWithSameCostCodes: UpdateCostTransferDto = {
        toCostCodeId: 'cost-code-1',
      };

      await expect(
        service.update('transfer-1', updateWithSameCostCodes, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete a DRAFT cost transfer', async () => {
      jest.spyOn(costTransferRepo, 'findOne').mockResolvedValue(mockCostTransfer as any);
      jest.spyOn(costTransferRepo, 'remove').mockResolvedValue(mockCostTransfer as any);

      await service.remove('transfer-1', 'user-1');

      expect(costTransferRepo.remove).toHaveBeenCalledWith(mockCostTransfer);
    });

    it('should throw NotFoundException if transfer does not exist', async () => {
      jest.spyOn(costTransferRepo, 'findOne').mockResolvedValue(null);

      await expect(service.remove('transfer-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if status is not DRAFT', async () => {
      jest.spyOn(costTransferRepo, 'findOne').mockResolvedValue({
        ...mockCostTransfer,
        status: CostTransferStatus.APPROVED,
      } as any);

      await expect(service.remove('transfer-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('submit', () => {
    it('should change status from DRAFT to PENDING_APPROVAL', async () => {
      jest.spyOn(costTransferRepo, 'findOne')
        .mockResolvedValueOnce(mockCostTransfer as any)
        .mockResolvedValueOnce({
          ...mockCostTransfer,
          status: CostTransferStatus.PENDING_APPROVAL,
          project: mockProject,
          budget: mockBudget,
          fromCostCode: mockFromCostCode,
          toCostCode: mockToCostCode,
        } as any);
      jest.spyOn(costTransferRepo, 'save').mockResolvedValue({
        ...mockCostTransfer,
        status: CostTransferStatus.PENDING_APPROVAL,
      } as any);

      const result = await service.submit('transfer-1', 'user-1');

      expect(result.status).toBe(CostTransferStatus.PENDING_APPROVAL);
      expect(costTransferRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: CostTransferStatus.PENDING_APPROVAL,
        }),
      );
    });

    it('should throw NotFoundException if transfer does not exist', async () => {
      jest.spyOn(costTransferRepo, 'findOne').mockResolvedValue(null);

      await expect(service.submit('transfer-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if status is not DRAFT', async () => {
      jest.spyOn(costTransferRepo, 'findOne').mockResolvedValue({
        ...mockCostTransfer,
        status: CostTransferStatus.APPROVED,
      } as any);

      await expect(service.submit('transfer-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('approve', () => {
    it('should approve transfer and create cost entries', async () => {
      const pendingTransfer = {
        ...mockCostTransfer,
        status: CostTransferStatus.PENDING_APPROVAL,
        fromCostCode: mockFromCostCode,
        toCostCode: mockToCostCode,
        budget: mockBudget,
      };

      const fromEntry = { ...mockCostEntry, id: 'from-entry', totalCost: -5000 };
      const toEntry = { ...mockCostEntry, id: 'to-entry', totalCost: 5000 };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(pendingTransfer)
        .mockResolvedValueOnce(mockBudgetLineItem)
        .mockResolvedValueOnce(mockBudgetLineItem);
      mockQueryRunner.manager.create
        .mockReturnValueOnce(fromEntry)
        .mockReturnValueOnce(toEntry);
      mockQueryRunner.manager.save
        .mockResolvedValueOnce(fromEntry)
        .mockResolvedValueOnce(toEntry)
        .mockResolvedValueOnce(fromEntry)
        .mockResolvedValueOnce(toEntry)
        .mockResolvedValueOnce(mockBudgetLineItem)
        .mockResolvedValueOnce(mockBudgetLineItem)
        .mockResolvedValueOnce(pendingTransfer);

      jest.spyOn(costTransferRepo, 'findOne').mockResolvedValue({
        ...pendingTransfer,
        status: CostTransferStatus.APPROVED,
        project: mockProject,
        budget: mockBudget,
        fromCostCode: mockFromCostCode,
        toCostCode: mockToCostCode,
      } as any);

      const result = await service.approve('transfer-1', 'user-1');

      expect(result.status).toBe(CostTransferStatus.APPROVED);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.create).toHaveBeenCalledTimes(2);
      expect(mockQueryRunner.manager.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if transfer does not exist', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      await expect(service.approve('transfer-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if status is not PENDING_APPROVAL', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue({
        ...mockCostTransfer,
        status: CostTransferStatus.DRAFT,
      });

      await expect(service.approve('transfer-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if insufficient funds', async () => {
      const pendingTransfer = {
        ...mockCostTransfer,
        status: CostTransferStatus.PENDING_APPROVAL,
        fromCostCode: mockFromCostCode,
        toCostCode: mockToCostCode,
        budget: mockBudget,
        amount: 50000,
      };

      const lineItemWithInsufficientFunds = {
        ...mockBudgetLineItem,
        budgetedCost: 50000,
        actualCost: 40000,
      };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(pendingTransfer)
        .mockResolvedValueOnce(lineItemWithInsufficientFunds);

      await expect(service.approve('transfer-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if no budget line item exists', async () => {
      const pendingTransfer = {
        ...mockCostTransfer,
        status: CostTransferStatus.PENDING_APPROVAL,
        fromCostCode: mockFromCostCode,
        toCostCode: mockToCostCode,
        budget: mockBudget,
      };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(pendingTransfer)
        .mockResolvedValueOnce(null);

      await expect(service.approve('transfer-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should update budget line items correctly', async () => {
      const pendingTransfer = {
        ...mockCostTransfer,
        status: CostTransferStatus.PENDING_APPROVAL,
        fromCostCode: mockFromCostCode,
        toCostCode: mockToCostCode,
        budget: mockBudget,
      };

      const fromEntry = { ...mockCostEntry, id: 'from-entry', totalCost: -5000 };
      const toEntry = { ...mockCostEntry, id: 'to-entry', totalCost: 5000 };

      const fromLineItem = { ...mockBudgetLineItem, actualCost: 20000 };
      const toLineItem = { ...mockBudgetLineItem, costCodeId: 'cost-code-2', actualCost: 15000 };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(pendingTransfer)
        .mockResolvedValueOnce(fromLineItem)
        .mockResolvedValueOnce(fromLineItem)
        .mockResolvedValueOnce(toLineItem);

      mockQueryRunner.manager.create
        .mockReturnValueOnce(fromEntry)
        .mockReturnValueOnce(toEntry);

      mockQueryRunner.manager.save
        .mockResolvedValueOnce(fromEntry)
        .mockResolvedValueOnce(toEntry)
        .mockResolvedValueOnce(fromEntry)
        .mockResolvedValueOnce(toEntry)
        .mockResolvedValueOnce({ ...fromLineItem, actualCost: 15000 })
        .mockResolvedValueOnce({ ...toLineItem, actualCost: 20000 })
        .mockResolvedValueOnce(pendingTransfer);

      jest.spyOn(costTransferRepo, 'findOne').mockResolvedValue({
        ...pendingTransfer,
        status: CostTransferStatus.APPROVED,
        project: mockProject,
        budget: mockBudget,
        fromCostCode: mockFromCostCode,
        toCostCode: mockToCostCode,
      } as any);

      await service.approve('transfer-1', 'user-1');

      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        BudgetLineItem,
        expect.objectContaining({ actualCost: 15000 }),
      );
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        BudgetLineItem,
        expect.objectContaining({ actualCost: 20000 }),
      );
    });
  });

  describe('reject', () => {
    const rejectDto: RejectCostTransferDto = {
      rejectionReason: 'Insufficient justification',
    };

    it('should reject a PENDING_APPROVAL transfer', async () => {
      const pendingTransfer = {
        ...mockCostTransfer,
        status: CostTransferStatus.PENDING_APPROVAL,
      };

      jest.spyOn(costTransferRepo, 'findOne')
        .mockResolvedValueOnce(pendingTransfer as any)
        .mockResolvedValueOnce({
          ...pendingTransfer,
          status: CostTransferStatus.REJECTED,
          rejectedById: 'user-1',
          rejectionReason: rejectDto.rejectionReason,
          project: mockProject,
          budget: mockBudget,
          fromCostCode: mockFromCostCode,
          toCostCode: mockToCostCode,
        } as any);
      jest.spyOn(costTransferRepo, 'save').mockResolvedValue({
        ...pendingTransfer,
        status: CostTransferStatus.REJECTED,
        rejectedById: 'user-1',
        rejectionReason: rejectDto.rejectionReason,
      } as any);

      const result = await service.reject('transfer-1', rejectDto, 'user-1');

      expect(result.status).toBe(CostTransferStatus.REJECTED);
      expect(result.rejectionReason).toBe(rejectDto.rejectionReason);
      expect(costTransferRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: CostTransferStatus.REJECTED,
          rejectedById: 'user-1',
          rejectionReason: rejectDto.rejectionReason,
        }),
      );
    });

    it('should throw NotFoundException if transfer does not exist', async () => {
      jest.spyOn(costTransferRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.reject('transfer-1', rejectDto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if status is not PENDING_APPROVAL', async () => {
      jest.spyOn(costTransferRepo, 'findOne').mockResolvedValue({
        ...mockCostTransfer,
        status: CostTransferStatus.APPROVED,
      } as any);

      await expect(
        service.reject('transfer-1', rejectDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('void', () => {
    const voidDto: VoidCostTransferDto = {
      voidReason: 'Transfer no longer needed',
    };

    it('should void an APPROVED transfer', async () => {
      const approvedTransfer = {
        ...mockCostTransfer,
        status: CostTransferStatus.APPROVED,
        fromCostCode: mockFromCostCode,
        toCostCode: mockToCostCode,
        budget: mockBudget,
        fromEntry: mockCostEntry,
        toEntry: { ...mockCostEntry, id: 'entry-2' },
      };

      const reversalFromEntry = { ...mockCostEntry, id: 'reversal-from', totalCost: 5000 };
      const reversalToEntry = { ...mockCostEntry, id: 'reversal-to', totalCost: -5000 };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(approvedTransfer)
        .mockResolvedValueOnce(mockBudgetLineItem)
        .mockResolvedValueOnce(mockBudgetLineItem);

      mockQueryRunner.manager.create
        .mockReturnValueOnce(reversalFromEntry)
        .mockReturnValueOnce(reversalToEntry);

      mockQueryRunner.manager.save
        .mockResolvedValueOnce(reversalFromEntry)
        .mockResolvedValueOnce(reversalToEntry)
        .mockResolvedValueOnce(reversalFromEntry)
        .mockResolvedValueOnce(reversalToEntry)
        .mockResolvedValueOnce(mockBudgetLineItem)
        .mockResolvedValueOnce(mockBudgetLineItem)
        .mockResolvedValueOnce(approvedTransfer);

      jest.spyOn(costTransferRepo, 'findOne').mockResolvedValue({
        ...approvedTransfer,
        status: CostTransferStatus.VOID,
        voidedById: 'user-1',
        voidReason: voidDto.voidReason,
        project: mockProject,
        budget: mockBudget,
        fromCostCode: mockFromCostCode,
        toCostCode: mockToCostCode,
      } as any);

      const result = await service.void('transfer-1', voidDto, 'user-1');

      expect(result.status).toBe(CostTransferStatus.VOID);
      expect(result.voidReason).toBe(voidDto.voidReason);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.create).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException if transfer does not exist', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      await expect(service.void('transfer-1', voidDto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if status is not APPROVED', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue({
        ...mockCostTransfer,
        status: CostTransferStatus.DRAFT,
      });

      await expect(service.void('transfer-1', voidDto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should create reversal entries with correct amounts', async () => {
      const approvedTransfer = {
        ...mockCostTransfer,
        status: CostTransferStatus.APPROVED,
        amount: 10000,
        fromCostCode: mockFromCostCode,
        toCostCode: mockToCostCode,
        budget: mockBudget,
        fromEntry: mockCostEntry,
        toEntry: { ...mockCostEntry, id: 'entry-2' },
      };

      const reversalFromEntry = { ...mockCostEntry, id: 'reversal-from', totalCost: 10000 };
      const reversalToEntry = { ...mockCostEntry, id: 'reversal-to', totalCost: -10000 };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(approvedTransfer)
        .mockResolvedValueOnce(mockBudgetLineItem)
        .mockResolvedValueOnce(mockBudgetLineItem);

      mockQueryRunner.manager.create
        .mockReturnValueOnce(reversalFromEntry)
        .mockReturnValueOnce(reversalToEntry);

      mockQueryRunner.manager.save
        .mockResolvedValueOnce(reversalFromEntry)
        .mockResolvedValueOnce(reversalToEntry)
        .mockResolvedValueOnce(reversalFromEntry)
        .mockResolvedValueOnce(reversalToEntry)
        .mockResolvedValueOnce(mockBudgetLineItem)
        .mockResolvedValueOnce(mockBudgetLineItem)
        .mockResolvedValueOnce(approvedTransfer);

      jest.spyOn(costTransferRepo, 'findOne').mockResolvedValue({
        ...approvedTransfer,
        status: CostTransferStatus.VOID,
        project: mockProject,
        budget: mockBudget,
        fromCostCode: mockFromCostCode,
        toCostCode: mockToCostCode,
      } as any);

      await service.void('transfer-1', voidDto, 'user-1');

      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        CostEntry,
        expect.objectContaining({
          totalCost: 10000, // Positive to restore FROM
        }),
      );
      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        CostEntry,
        expect.objectContaining({
          totalCost: -10000, // Negative to remove from TO
        }),
      );
    });

    it('should update budget line items correctly on void', async () => {
      const approvedTransfer = {
        ...mockCostTransfer,
        status: CostTransferStatus.APPROVED,
        amount: 5000,
        fromCostCode: mockFromCostCode,
        toCostCode: mockToCostCode,
        budget: mockBudget,
        fromEntry: mockCostEntry,
        toEntry: { ...mockCostEntry, id: 'entry-2' },
      };

      const fromLineItem = { ...mockBudgetLineItem, actualCost: 15000 };
      const toLineItem = { ...mockBudgetLineItem, costCodeId: 'cost-code-2', actualCost: 25000 };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(approvedTransfer)
        .mockResolvedValueOnce(fromLineItem)
        .mockResolvedValueOnce(toLineItem);

      const reversalFromEntry = { ...mockCostEntry, id: 'reversal-from', totalCost: 5000 };
      const reversalToEntry = { ...mockCostEntry, id: 'reversal-to', totalCost: -5000 };

      mockQueryRunner.manager.create
        .mockReturnValueOnce(reversalFromEntry)
        .mockReturnValueOnce(reversalToEntry);

      mockQueryRunner.manager.save
        .mockResolvedValueOnce(reversalFromEntry)
        .mockResolvedValueOnce(reversalToEntry)
        .mockResolvedValueOnce(reversalFromEntry)
        .mockResolvedValueOnce(reversalToEntry)
        .mockResolvedValueOnce({ ...fromLineItem, actualCost: 20000 })
        .mockResolvedValueOnce({ ...toLineItem, actualCost: 20000 })
        .mockResolvedValueOnce(approvedTransfer);

      jest.spyOn(costTransferRepo, 'findOne').mockResolvedValue({
        ...approvedTransfer,
        status: CostTransferStatus.VOID,
        project: mockProject,
        budget: mockBudget,
        fromCostCode: mockFromCostCode,
        toCostCode: mockToCostCode,
      } as any);

      await service.void('transfer-1', voidDto, 'user-1');

      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        BudgetLineItem,
        expect.objectContaining({ actualCost: 20000 }),
      );
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        BudgetLineItem,
        expect.objectContaining({ actualCost: 20000 }),
      );
    });
  });

  describe('workflow integration', () => {
    it('should support full workflow: draft → submit → approve → void', async () => {
      let currentStatus = CostTransferStatus.DRAFT;
      const transfer = { ...mockCostTransfer };

      // Setup for submit
      jest.spyOn(costTransferRepo, 'findOne').mockImplementation(async () => {
        const baseTransfer = { ...transfer, status: currentStatus };
        if (currentStatus === CostTransferStatus.DRAFT ||
            currentStatus === CostTransferStatus.PENDING_APPROVAL ||
            currentStatus === CostTransferStatus.APPROVED ||
            currentStatus === CostTransferStatus.VOID) {
          return {
            ...baseTransfer,
            project: mockProject,
            budget: mockBudget,
            fromCostCode: mockFromCostCode,
            toCostCode: mockToCostCode,
          } as any;
        }
        return baseTransfer as any;
      });

      jest.spyOn(costTransferRepo, 'save').mockImplementation(async (t: any) => {
        currentStatus = t.status;
        return { ...t, status: currentStatus } as any;
      });

      // Setup for approve
      mockQueryRunner.manager.findOne.mockImplementation(async (entity, options) => {
        if (entity === CostTransfer) {
          return {
            ...transfer,
            status: currentStatus,
            fromCostCode: mockFromCostCode,
            toCostCode: mockToCostCode,
            budget: mockBudget,
          };
        }
        return mockBudgetLineItem;
      });

      const fromEntry = { ...mockCostEntry, id: 'from-entry' };
      const toEntry = { ...mockCostEntry, id: 'to-entry' };

      mockQueryRunner.manager.create
        .mockReturnValueOnce(fromEntry)
        .mockReturnValueOnce(toEntry)
        .mockReturnValueOnce(fromEntry)
        .mockReturnValueOnce(toEntry);

      mockQueryRunner.manager.save.mockResolvedValue({} as any);

      // Execute workflow
      const submitted = await service.submit('transfer-1', 'user-1');
      expect(submitted.status).toBe(CostTransferStatus.PENDING_APPROVAL);

      const approved = await service.approve('transfer-1', 'user-1');
      expect(approved.status).toBe(CostTransferStatus.APPROVED);

      const voided = await service.void('transfer-1', { voidReason: 'Test void' }, 'user-1');
      expect(voided.status).toBe(CostTransferStatus.VOID);
    });

    it('should support rejection and resubmission flow', async () => {
      let currentStatus = CostTransferStatus.PENDING_APPROVAL;
      const transfer = { ...mockCostTransfer };

      jest.spyOn(costTransferRepo, 'findOne').mockImplementation(async () => {
        const baseTransfer = { ...transfer, status: currentStatus };
        return {
          ...baseTransfer,
          project: mockProject,
          budget: mockBudget,
          fromCostCode: mockFromCostCode,
          toCostCode: mockToCostCode,
        } as any;
      });

      jest.spyOn(costTransferRepo, 'save').mockImplementation(async (t: any) => {
        currentStatus = t.status;
        return { ...t, status: currentStatus } as any;
      });

      const rejected = await service.reject(
        'transfer-1',
        { rejectionReason: 'Needs revision' },
        'user-1',
      );
      expect(rejected.status).toBe(CostTransferStatus.REJECTED);

      // Can't submit rejected transfers - would need to be DRAFT
      // This demonstrates that rejected transfers stay rejected
    });
  });

  describe('error handling', () => {
    it('should rollback transaction on approve failure', async () => {
      mockQueryRunner.manager.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.approve('transfer-1', 'user-1')).rejects.toThrow();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should rollback transaction on void failure', async () => {
      mockQueryRunner.manager.findOne.mockRejectedValue(new Error('Database error'));

      await expect(
        service.void('transfer-1', { voidReason: 'Test' }, 'user-1'),
      ).rejects.toThrow();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });
});
