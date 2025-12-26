import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, SelectQueryBuilder } from 'typeorm';
import { NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { AccrualService } from '../accrual.service';
import { Accrual } from '../../entities/accrual.entity';
import { CostEntry } from '../../entities/cost-entry.entity';
import { CostEntryHistory } from '../../entities/cost-entry-history.entity';
import { Budget } from '../../entities/budget.entity';
import { BudgetLineItem } from '../../entities/budget-line-item.entity';
import { Commitment } from '../../entities/commitment.entity';
import { Vendor } from '../../entities/vendor.entity';
import { CostCode } from '../../entities/cost-code.entity';
import { CostPeriod } from '../../entities/cost-period.entity';
import { Project } from '../../../projects/entities/project.entity';
import { AccrualStatus } from '../../enums/accrual-status.enum';
import { CostEntryType } from '../../enums/cost-entry-type.enum';
import { CostEntryStatus } from '../../enums/cost-entry-status.enum';
import { CostEntryService } from '../cost-entry.service';
import {
  CreateAccrualDto,
  UpdateAccrualDto,
  ReverseAccrualDto,
  ConvertAccrualDto,
  AccrualFilterDto,
} from '../../dto';

describe('AccrualService', () => {
  let service: AccrualService;
  let accrualRepo: Repository<Accrual>;
  let costEntryRepo: Repository<CostEntry>;
  let budgetRepo: Repository<Budget>;
  let budgetLineItemRepo: Repository<BudgetLineItem>;
  let costCodeRepo: Repository<CostCode>;
  let projectRepo: Repository<Project>;
  let commitmentRepo: Repository<Commitment>;
  let costPeriodRepo: Repository<CostPeriod>;
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

  const mockCostCode = {
    id: 'cost-code-1',
    code: '01-100',
    name: 'Labor',
    category: 'LABOR',
  } as CostCode;

  const mockCommitment = {
    id: 'commitment-1',
    vendorName: 'Test Vendor',
  } as Commitment;

  const mockCostPeriod = {
    id: 'cost-period-1',
    periodName: '2024-01',
  } as CostPeriod;

  const mockAccrual = {
    id: 'accrual-1',
    accrualNumber: 'ACC-001',
    projectId: 'project-1',
    budgetId: 'budget-1',
    costCodeId: 'cost-code-1',
    commitmentId: 'commitment-1',
    costPeriodId: 'cost-period-1',
    description: 'Test Accrual',
    estimatedCost: 5000,
    status: AccrualStatus.ACTIVE,
    accrualDate: new Date('2024-01-15'),
    notes: 'Test notes',
    createdById: 'user-1',
    reversedAt: null,
    reversedById: null,
    reversalReason: null,
    convertedEntryId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    project: mockProject,
    budget: mockBudget,
    costCode: mockCostCode,
    commitment: mockCommitment,
    costPeriod: mockCostPeriod,
  } as Accrual;

  const mockBudgetLineItem = {
    id: 'line-item-1',
    budgetId: 'budget-1',
    costCodeId: 'cost-code-1',
    category: 'LABOR',
    budgetedCost: 100000,
    committedCost: 20000,
    actualCost: 10000,
  } as BudgetLineItem;

  const mockCostEntry = {
    id: 'cost-entry-1',
    entryNumber: 'CE-001',
    projectId: 'project-1',
    budgetId: 'budget-1',
    costCodeId: 'cost-code-1',
    type: CostEntryType.ACCRUAL,
    status: CostEntryStatus.POSTED,
    totalCost: 5000,
    entryDate: new Date(),
    description: 'Test Entry',
    createdById: 'user-1',
  } as CostEntry;

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

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  } as unknown as SelectQueryBuilder<Accrual>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccrualService,
        {
          provide: getRepositoryToken(Accrual),
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
          provide: getRepositoryToken(CostEntry),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
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
          provide: getRepositoryToken(Commitment),
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
          provide: CostEntryService,
          useValue: {
            create: jest.fn(),
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

    service = module.get<AccrualService>(AccrualService);
    accrualRepo = module.get<Repository<Accrual>>(getRepositoryToken(Accrual));
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
    commitmentRepo = module.get<Repository<Commitment>>(
      getRepositoryToken(Commitment),
    );
    costPeriodRepo = module.get<Repository<CostPeriod>>(
      getRepositoryToken(CostPeriod),
    );
    costEntryService = module.get<CostEntryService>(CostEntryService);
    dataSource = module.get<DataSource>(DataSource);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateAccrualDto = {
      projectId: 'project-1',
      budgetId: 'budget-1',
      costCodeId: 'cost-code-1',
      commitmentId: 'commitment-1',
      costPeriodId: 'cost-period-1',
      description: 'Test Accrual',
      estimatedCost: 5000,
      accrualDate: new Date('2024-01-15'),
      notes: 'Test notes',
    };

    it('should create an accrual with ACTIVE status', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget);
      jest.spyOn(costCodeRepo, 'findOne').mockResolvedValue(mockCostCode);
      jest.spyOn(commitmentRepo, 'findOne').mockResolvedValue(mockCommitment);
      jest.spyOn(costPeriodRepo, 'findOne').mockResolvedValue(mockCostPeriod);
      jest
        .spyOn(accrualRepo, 'create')
        .mockReturnValue({ ...mockAccrual, status: AccrualStatus.ACTIVE } as any);
      jest.spyOn(accrualRepo, 'save').mockResolvedValue(mockAccrual as any);
      jest.spyOn(accrualRepo, 'findOne').mockResolvedValue(mockAccrual as any);

      const result = await service.create(createDto, 'user-1');

      expect(result.status).toBe(AccrualStatus.ACTIVE);
      expect(accrualRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createDto,
          status: AccrualStatus.ACTIVE,
          createdById: 'user-1',
        }),
      );
      expect(accrualRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if project does not exist', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(null);

      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(projectRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'project-1' },
      });
    });

    it('should throw NotFoundException if budget does not exist', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(null);

      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(budgetRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'budget-1' },
      });
    });

    it('should throw BadRequestException if budget does not belong to project', async () => {
      const wrongBudget = { ...mockBudget, projectId: 'wrong-project' };
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(wrongBudget as any);

      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if cost code does not exist', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget);
      jest.spyOn(costCodeRepo, 'findOne').mockResolvedValue(null);

      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(costCodeRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'cost-code-1' },
      });
    });

    it('should throw NotFoundException if commitment does not exist', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget);
      jest.spyOn(costCodeRepo, 'findOne').mockResolvedValue(mockCostCode);
      jest.spyOn(commitmentRepo, 'findOne').mockResolvedValue(null);

      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(commitmentRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'commitment-1' },
      });
    });

    it('should throw NotFoundException if cost period does not exist', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget);
      jest.spyOn(costCodeRepo, 'findOne').mockResolvedValue(mockCostCode);
      jest.spyOn(commitmentRepo, 'findOne').mockResolvedValue(mockCommitment);
      jest.spyOn(costPeriodRepo, 'findOne').mockResolvedValue(null);

      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(costPeriodRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'cost-period-1' },
      });
    });

    it('should create accrual without optional relations', async () => {
      const minimalDto: CreateAccrualDto = {
        projectId: 'project-1',
        budgetId: 'budget-1',
        costCodeId: 'cost-code-1',
        description: 'Test Accrual',
        estimatedCost: 5000,
        accrualDate: new Date('2024-01-15'),
      };

      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget);
      jest.spyOn(costCodeRepo, 'findOne').mockResolvedValue(mockCostCode);
      jest.spyOn(accrualRepo, 'create').mockReturnValue(mockAccrual as any);
      jest.spyOn(accrualRepo, 'save').mockResolvedValue(mockAccrual as any);
      jest.spyOn(accrualRepo, 'findOne').mockResolvedValue(mockAccrual as any);

      const result = await service.create(minimalDto, 'user-1');

      expect(result).toBeDefined();
      expect(accrualRepo.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return accruals with pagination', async () => {
      const filter: AccrualFilterDto = {
        page: 1,
        limit: 10,
        sortBy: 'accrualDate',
        sortOrder: 'DESC',
      };

      jest
        .spyOn(accrualRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder);
      jest
        .spyOn(mockQueryBuilder, 'getManyAndCount')
        .mockResolvedValue([[mockAccrual], 1]);

      const result = await service.findAll(filter);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(accrualRepo.createQueryBuilder).toHaveBeenCalledWith('accrual');
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'accrual.accrualDate',
        'DESC',
      );
    });

    it('should apply filters correctly', async () => {
      const filter: AccrualFilterDto = {
        projectId: 'project-1',
        budgetId: 'budget-1',
        costCodeId: 'cost-code-1',
        status: AccrualStatus.ACTIVE,
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-12-31'),
        commitmentId: 'commitment-1',
        costPeriodId: 'cost-period-1',
      };

      jest
        .spyOn(accrualRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder);
      jest
        .spyOn(mockQueryBuilder, 'getManyAndCount')
        .mockResolvedValue([[], 0]);

      await service.findAll(filter);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'accrual.project_id = :projectId',
        { projectId: 'project-1' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'accrual.budget_id = :budgetId',
        { budgetId: 'budget-1' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'accrual.cost_code_id = :costCodeId',
        { costCodeId: 'cost-code-1' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'accrual.status = :status',
        { status: AccrualStatus.ACTIVE },
      );
    });

    it('should use default pagination values', async () => {
      const filter: AccrualFilterDto = {};

      jest
        .spyOn(accrualRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder);
      jest
        .spyOn(mockQueryBuilder, 'getManyAndCount')
        .mockResolvedValue([[], 0]);

      await service.findAll(filter);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(50);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'accrual.accrualDate',
        'DESC',
      );
    });

    it('should load all relations', async () => {
      const filter: AccrualFilterDto = {};

      jest
        .spyOn(accrualRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder);
      jest
        .spyOn(mockQueryBuilder, 'getManyAndCount')
        .mockResolvedValue([[mockAccrual], 1]);

      await service.findAll(filter);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'accrual.project',
        'project',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'accrual.budget',
        'budget',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'accrual.costCode',
        'costCode',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'accrual.commitment',
        'commitment',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'accrual.costPeriod',
        'costPeriod',
      );
    });
  });

  describe('findOne', () => {
    it('should return an accrual by id', async () => {
      jest.spyOn(accrualRepo, 'findOne').mockResolvedValue(mockAccrual as any);

      const result = await service.findOne('accrual-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('accrual-1');
      expect(accrualRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'accrual-1' },
        relations: [
          'project',
          'budget',
          'costCode',
          'commitment',
          'costPeriod',
          'createdBy',
          'reversedBy',
          'convertedEntry',
        ],
      });
    });

    it('should throw NotFoundException if accrual does not exist', async () => {
      jest.spyOn(accrualRepo, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      expect(accrualRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'non-existent' },
        relations: [
          'project',
          'budget',
          'costCode',
          'commitment',
          'costPeriod',
          'createdBy',
          'reversedBy',
          'convertedEntry',
        ],
      });
    });
  });

  describe('update', () => {
    const updateDto: UpdateAccrualDto = {
      description: 'Updated description',
      estimatedCost: 6000,
      notes: 'Updated notes',
    };

    it('should update an ACTIVE accrual', async () => {
      const updatedAccrual = { ...mockAccrual, ...updateDto };
      jest
        .spyOn(accrualRepo, 'findOne')
        .mockResolvedValueOnce(mockAccrual as any)
        .mockResolvedValueOnce(updatedAccrual as any);
      jest.spyOn(accrualRepo, 'save').mockResolvedValue(updatedAccrual as any);

      const result = await service.update('accrual-1', updateDto, 'user-1');

      expect(result.description).toBe('Updated description');
      expect(accrualRepo.save).toHaveBeenCalledWith(
        expect.objectContaining(updateDto),
      );
    });

    it('should throw NotFoundException if accrual does not exist', async () => {
      jest.spyOn(accrualRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.update('non-existent', updateDto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if accrual is not ACTIVE', async () => {
      const reversedAccrual = {
        ...mockAccrual,
        status: AccrualStatus.REVERSED,
      };
      jest.spyOn(accrualRepo, 'findOne').mockResolvedValue(reversedAccrual as any);

      await expect(
        service.update('accrual-1', updateDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate commitment when updated', async () => {
      const updateWithCommitment: UpdateAccrualDto = {
        commitmentId: 'new-commitment',
      };

      jest.spyOn(accrualRepo, 'findOne').mockResolvedValue(mockAccrual as any);
      jest.spyOn(commitmentRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.update('accrual-1', updateWithCommitment, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate cost period when updated', async () => {
      const updateWithCostPeriod: UpdateAccrualDto = {
        costPeriodId: 'new-period',
      };

      jest.spyOn(accrualRepo, 'findOne').mockResolvedValue(mockAccrual as any);
      jest.spyOn(costPeriodRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.update('accrual-1', updateWithCostPeriod, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete an ACTIVE accrual', async () => {
      jest.spyOn(accrualRepo, 'findOne').mockResolvedValue(mockAccrual as any);
      jest.spyOn(accrualRepo, 'remove').mockResolvedValue(mockAccrual as any);

      await service.remove('accrual-1', 'user-1');

      expect(accrualRepo.remove).toHaveBeenCalledWith(mockAccrual);
    });

    it('should throw NotFoundException if accrual does not exist', async () => {
      jest.spyOn(accrualRepo, 'findOne').mockResolvedValue(null);

      await expect(service.remove('non-existent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if accrual is not ACTIVE', async () => {
      const convertedAccrual = {
        ...mockAccrual,
        status: AccrualStatus.CONVERTED,
      };
      jest.spyOn(accrualRepo, 'findOne').mockResolvedValue(convertedAccrual as any);

      await expect(service.remove('accrual-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('reverse', () => {
    const reverseDto: ReverseAccrualDto = {
      reversalReason: 'Invoice received with different amount',
    };

    it('should reverse an ACTIVE accrual', async () => {
      const reversedAccrual = {
        ...mockAccrual,
        status: AccrualStatus.REVERSED,
        reversedAt: new Date(),
        reversedById: 'user-1',
        reversalReason: reverseDto.reversalReason,
      };

      mockQueryRunner.manager.findOne.mockResolvedValue(mockAccrual);
      mockQueryRunner.manager.create.mockReturnValue(mockCostEntry);
      mockQueryRunner.manager.save.mockResolvedValue(mockCostEntry);
      mockQueryRunner.manager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockBudgetLineItem),
        save: jest.fn().mockResolvedValue(mockBudgetLineItem),
      });

      jest
        .spyOn(accrualRepo, 'findOne')
        .mockResolvedValue(reversedAccrual as any);

      const result = await service.reverse('accrual-1', reverseDto, 'user-1');

      expect(result.status).toBe(AccrualStatus.REVERSED);
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should create negative cost entry when reversing', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(mockAccrual);
      mockQueryRunner.manager.create.mockReturnValue(mockCostEntry);
      mockQueryRunner.manager.save.mockResolvedValue(mockCostEntry);
      mockQueryRunner.manager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockBudgetLineItem),
        save: jest.fn().mockResolvedValue(mockBudgetLineItem),
      });

      jest.spyOn(accrualRepo, 'findOne').mockResolvedValue({
        ...mockAccrual,
        status: AccrualStatus.REVERSED,
      } as any);

      await service.reverse('accrual-1', reverseDto, 'user-1');

      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        CostEntry,
        expect.objectContaining({
          type: CostEntryType.ACCRUAL,
          status: CostEntryStatus.POSTED,
          totalCost: -Math.abs(Number(mockAccrual.estimatedCost)),
        }),
      );
    });

    it('should update budget actualCost when reversing', async () => {
      const mockLineItemRepo = {
        findOne: jest.fn().mockResolvedValue(mockBudgetLineItem),
        save: jest.fn().mockResolvedValue({
          ...mockBudgetLineItem,
          actualCost: 5000,
        }),
      };

      mockQueryRunner.manager.findOne.mockResolvedValue(mockAccrual);
      mockQueryRunner.manager.create.mockReturnValue(mockCostEntry);
      mockQueryRunner.manager.save.mockResolvedValue(mockCostEntry);
      mockQueryRunner.manager.getRepository.mockReturnValue(mockLineItemRepo);

      jest.spyOn(accrualRepo, 'findOne').mockResolvedValue({
        ...mockAccrual,
        status: AccrualStatus.REVERSED,
      } as any);

      await service.reverse('accrual-1', reverseDto, 'user-1');

      expect(mockLineItemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          actualCost: expect.any(Number),
        }),
      );
    });

    it('should throw NotFoundException if accrual does not exist', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      await expect(
        service.reverse('non-existent', reverseDto, 'user-1'),
      ).rejects.toThrow(NotFoundException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw BadRequestException if accrual is not ACTIVE', async () => {
      const reversedAccrual = {
        ...mockAccrual,
        status: AccrualStatus.REVERSED,
      };
      mockQueryRunner.manager.findOne.mockResolvedValue(reversedAccrual);

      await expect(
        service.reverse('accrual-1', reverseDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(mockAccrual);
      mockQueryRunner.manager.create.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(
        service.reverse('accrual-1', reverseDto, 'user-1'),
      ).rejects.toThrow('Database error');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should create new budget line item if not found', async () => {
      const mockLineItemRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockReturnValue({
          budgetId: 'budget-1',
          costCodeId: 'cost-code-1',
          category: 'LABOR',
          budgetedCost: 0,
          committedCost: 0,
          actualCost: 0,
        }),
        save: jest.fn().mockResolvedValue({
          budgetId: 'budget-1',
          costCodeId: 'cost-code-1',
          actualCost: 0,
        }),
      };

      mockQueryRunner.manager.findOne.mockResolvedValue(mockAccrual);
      mockQueryRunner.manager.create.mockReturnValue(mockCostEntry);
      mockQueryRunner.manager.save.mockResolvedValue(mockCostEntry);
      mockQueryRunner.manager.getRepository.mockReturnValue(mockLineItemRepo);

      jest.spyOn(costCodeRepo, 'findOne').mockResolvedValue(mockCostCode);
      jest.spyOn(accrualRepo, 'findOne').mockResolvedValue({
        ...mockAccrual,
        status: AccrualStatus.REVERSED,
      } as any);

      await service.reverse('accrual-1', reverseDto, 'user-1');

      expect(mockLineItemRepo.create).toHaveBeenCalled();
      expect(mockLineItemRepo.save).toHaveBeenCalled();
    });
  });

  describe('convert', () => {
    const convertDto: ConvertAccrualDto = {
      actualCost: 5500,
      invoiceNumber: 'INV-001',
      vendor: 'Test Vendor',
      notes: 'Converted to actual',
    };

    it('should convert an ACTIVE accrual to cost entry', async () => {
      const convertedAccrual = {
        ...mockAccrual,
        status: AccrualStatus.CONVERTED,
        convertedEntryId: 'cost-entry-1',
      };

      mockQueryRunner.manager.findOne.mockResolvedValue(mockAccrual);
      mockQueryRunner.manager.create.mockReturnValue(mockCostEntry);
      mockQueryRunner.manager.save
        .mockResolvedValueOnce(mockCostEntry)
        .mockResolvedValueOnce(convertedAccrual);
      mockQueryRunner.manager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockBudgetLineItem),
        save: jest.fn().mockResolvedValue(mockBudgetLineItem),
      });

      jest
        .spyOn(accrualRepo, 'findOne')
        .mockResolvedValue(convertedAccrual as any);

      const result = await service.convert('accrual-1', convertDto, 'user-1');

      expect(result.status).toBe(AccrualStatus.CONVERTED);
      expect(result.convertedEntryId).toBe('cost-entry-1');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should create cost entry with actual cost', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(mockAccrual);
      mockQueryRunner.manager.create.mockReturnValue(mockCostEntry);
      mockQueryRunner.manager.save.mockResolvedValue(mockCostEntry);
      mockQueryRunner.manager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockBudgetLineItem),
        save: jest.fn().mockResolvedValue(mockBudgetLineItem),
      });

      jest.spyOn(accrualRepo, 'findOne').mockResolvedValue({
        ...mockAccrual,
        status: AccrualStatus.CONVERTED,
      } as any);

      await service.convert('accrual-1', convertDto, 'user-1');

      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        CostEntry,
        expect.objectContaining({
          type: CostEntryType.ACCRUAL,
          status: CostEntryStatus.POSTED,
          totalCost: 5500,
          invoiceNumber: 'INV-001',
          vendor: 'Test Vendor',
        }),
      );
    });

    it('should use estimated cost if actual cost not provided', async () => {
      const convertDtoNoActual: ConvertAccrualDto = {
        notes: 'Converted',
      };

      mockQueryRunner.manager.findOne.mockResolvedValue(mockAccrual);
      mockQueryRunner.manager.create.mockReturnValue(mockCostEntry);
      mockQueryRunner.manager.save.mockResolvedValue(mockCostEntry);
      mockQueryRunner.manager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockBudgetLineItem),
        save: jest.fn().mockResolvedValue(mockBudgetLineItem),
      });

      jest.spyOn(accrualRepo, 'findOne').mockResolvedValue({
        ...mockAccrual,
        status: AccrualStatus.CONVERTED,
      } as any);

      await service.convert('accrual-1', convertDtoNoActual, 'user-1');

      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        CostEntry,
        expect.objectContaining({
          totalCost: Number(mockAccrual.estimatedCost),
        }),
      );
    });

    it('should adjust budget by difference between actual and estimated', async () => {
      const mockLineItemRepo = {
        findOne: jest.fn().mockResolvedValue(mockBudgetLineItem),
        save: jest.fn().mockResolvedValue({
          ...mockBudgetLineItem,
          actualCost: 10500, // 10000 + (5500 - 5000)
        }),
      };

      mockQueryRunner.manager.findOne.mockResolvedValue(mockAccrual);
      mockQueryRunner.manager.create.mockReturnValue(mockCostEntry);
      mockQueryRunner.manager.save.mockResolvedValue(mockCostEntry);
      mockQueryRunner.manager.getRepository.mockReturnValue(mockLineItemRepo);

      jest.spyOn(accrualRepo, 'findOne').mockResolvedValue({
        ...mockAccrual,
        status: AccrualStatus.CONVERTED,
      } as any);

      await service.convert('accrual-1', convertDto, 'user-1');

      expect(mockLineItemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          actualCost: expect.any(Number),
        }),
      );
    });

    it('should throw NotFoundException if accrual does not exist', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      await expect(
        service.convert('non-existent', convertDto, 'user-1'),
      ).rejects.toThrow(NotFoundException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw BadRequestException if accrual is not ACTIVE', async () => {
      const convertedAccrual = {
        ...mockAccrual,
        status: AccrualStatus.CONVERTED,
      };
      mockQueryRunner.manager.findOne.mockResolvedValue(convertedAccrual);

      await expect(
        service.convert('accrual-1', convertDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(mockAccrual);
      mockQueryRunner.manager.create.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(
        service.convert('accrual-1', convertDto, 'user-1'),
      ).rejects.toThrow('Database error');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should include conversion notes in cost entry description', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(mockAccrual);
      mockQueryRunner.manager.create.mockReturnValue(mockCostEntry);
      mockQueryRunner.manager.save.mockResolvedValue(mockCostEntry);
      mockQueryRunner.manager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockBudgetLineItem),
        save: jest.fn().mockResolvedValue(mockBudgetLineItem),
      });

      jest.spyOn(accrualRepo, 'findOne').mockResolvedValue({
        ...mockAccrual,
        status: AccrualStatus.CONVERTED,
      } as any);

      await service.convert('accrual-1', convertDto, 'user-1');

      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        CostEntry,
        expect.objectContaining({
          description: expect.stringContaining('Converted to actual'),
        }),
      );
    });
  });

  describe('workflow validations', () => {
    it('should only allow reverse on ACTIVE accruals', async () => {
      const statuses = [
        AccrualStatus.REVERSED,
        AccrualStatus.CONVERTED,
      ];

      for (const status of statuses) {
        const accrual = { ...mockAccrual, status };
        mockQueryRunner.manager.findOne.mockResolvedValue(accrual);

        await expect(
          service.reverse(
            'accrual-1',
            { reversalReason: 'Test' },
            'user-1',
          ),
        ).rejects.toThrow(BadRequestException);
      }
    });

    it('should only allow convert on ACTIVE accruals', async () => {
      const statuses = [
        AccrualStatus.REVERSED,
        AccrualStatus.CONVERTED,
      ];

      for (const status of statuses) {
        const accrual = { ...mockAccrual, status };
        mockQueryRunner.manager.findOne.mockResolvedValue(accrual);

        await expect(
          service.convert('accrual-1', { notes: 'Test' }, 'user-1'),
        ).rejects.toThrow(BadRequestException);
      }
    });

    it('should only allow update on ACTIVE accruals', async () => {
      const reversedAccrual = {
        ...mockAccrual,
        status: AccrualStatus.REVERSED,
      };
      jest.spyOn(accrualRepo, 'findOne').mockResolvedValue(reversedAccrual as any);

      await expect(
        service.update('accrual-1', { notes: 'Test' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should only allow delete on ACTIVE accruals', async () => {
      const convertedAccrual = {
        ...mockAccrual,
        status: AccrualStatus.CONVERTED,
      };
      jest.spyOn(accrualRepo, 'findOne').mockResolvedValue(convertedAccrual as any);

      await expect(service.remove('accrual-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('toResponseDto', () => {
    it('should convert entity to response DTO', () => {
      const result = service.toResponseDto(mockAccrual);

      expect(result.id).toBe(mockAccrual.id);
      expect(result.accrualNumber).toBe(mockAccrual.accrualNumber);
      expect(result.status).toBe(mockAccrual.status);
      expect(result.estimatedCost).toBe(mockAccrual.estimatedCost);
      expect(result.project).toBeDefined();
      expect(result.budget).toBeDefined();
      expect(result.costCode).toBeDefined();
    });

    it('should handle missing optional relations', () => {
      const accrualNoRelations = {
        ...mockAccrual,
        project: null,
        budget: null,
        costCode: null,
        commitment: null,
        costPeriod: null,
        createdBy: null,
        reversedBy: null,
        convertedEntry: null,
      };

      const result = service.toResponseDto(accrualNoRelations as any);

      expect(result.project).toBeUndefined();
      expect(result.budget).toBeUndefined();
      expect(result.costCode).toBeUndefined();
      expect(result.commitment).toBeUndefined();
      expect(result.costPeriod).toBeUndefined();
    });

    it('should include all nested relation data', () => {
      const result = service.toResponseDto(mockAccrual);

      expect(result.project).toEqual({ name: mockProject.name });
      expect(result.budget).toEqual({ name: mockBudget.name });
      expect(result.costCode).toEqual({
        code: mockCostCode.code,
        name: mockCostCode.name,
      });
      expect(result.commitment).toEqual({
        vendorName: mockCommitment.vendorName,
      });
      expect(result.costPeriod).toEqual({
        periodName: mockCostPeriod.periodName,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle budget line item actualCost preventing negative values', async () => {
      const lineItemWithLowActual = {
        ...mockBudgetLineItem,
        actualCost: 100,
      };

      const mockLineItemRepo = {
        findOne: jest.fn().mockResolvedValue(lineItemWithLowActual),
        save: jest.fn().mockImplementation((item) => item),
      };

      mockQueryRunner.manager.findOne.mockResolvedValue(mockAccrual);
      mockQueryRunner.manager.create.mockReturnValue(mockCostEntry);
      mockQueryRunner.manager.save.mockResolvedValue(mockCostEntry);
      mockQueryRunner.manager.getRepository.mockReturnValue(mockLineItemRepo);

      jest.spyOn(accrualRepo, 'findOne').mockResolvedValue({
        ...mockAccrual,
        status: AccrualStatus.REVERSED,
      } as any);

      await service.reverse(
        'accrual-1',
        { reversalReason: 'Test' },
        'user-1',
      );

      const savedItem = mockLineItemRepo.save.mock.calls[0][0];
      expect(savedItem.actualCost).toBeGreaterThanOrEqual(0);
    });

    it('should handle large cost adjustments in conversion', async () => {
      const largeConvertDto: ConvertAccrualDto = {
        actualCost: 50000,
      };

      mockQueryRunner.manager.findOne.mockResolvedValue(mockAccrual);
      mockQueryRunner.manager.create.mockReturnValue(mockCostEntry);
      mockQueryRunner.manager.save.mockResolvedValue(mockCostEntry);
      mockQueryRunner.manager.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockBudgetLineItem),
        save: jest.fn().mockResolvedValue(mockBudgetLineItem),
      });

      jest.spyOn(accrualRepo, 'findOne').mockResolvedValue({
        ...mockAccrual,
        status: AccrualStatus.CONVERTED,
      } as any);

      const result = await service.convert(
        'accrual-1',
        largeConvertDto,
        'user-1',
      );

      expect(result.status).toBe(AccrualStatus.CONVERTED);
    });

    it('should handle empty filter gracefully', async () => {
      jest
        .spyOn(accrualRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder);
      jest
        .spyOn(mockQueryBuilder, 'getManyAndCount')
        .mockResolvedValue([[], 0]);

      const result = await service.findAll({});

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle pagination with large page numbers', async () => {
      const filter: AccrualFilterDto = {
        page: 100,
        limit: 50,
      };

      jest
        .spyOn(accrualRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder);
      jest
        .spyOn(mockQueryBuilder, 'getManyAndCount')
        .mockResolvedValue([[], 0]);

      await service.findAll(filter);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(4950);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(50);
    });
  });
});
