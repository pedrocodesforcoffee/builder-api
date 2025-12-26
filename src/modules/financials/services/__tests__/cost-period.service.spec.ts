import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager, SelectQueryBuilder } from 'typeorm';
import { NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { CostPeriodService } from '../cost-period.service';
import { CostPeriod } from '../../entities/cost-period.entity';
import { CostEntry } from '../../entities/cost-entry.entity';
import { Accrual } from '../../entities/accrual.entity';
import { Budget } from '../../entities/budget.entity';
import { BudgetLineItem } from '../../entities/budget-line-item.entity';
import { Project } from '../../../projects/entities/project.entity';
import { CostPeriodStatus } from '../../enums/cost-period-status.enum';
import { CostEntryStatus } from '../../enums/cost-entry-status.enum';
import { CostEntryType } from '../../enums/cost-entry-type.enum';
import {
  CreateCostPeriodDto,
  UpdateCostPeriodDto,
  CostPeriodFilterDto,
} from '../../dto';

describe('CostPeriodService', () => {
  let service: CostPeriodService;
  let costPeriodRepo: Repository<CostPeriod>;
  let costEntryRepo: Repository<CostEntry>;
  let accrualRepo: Repository<Accrual>;
  let budgetRepo: Repository<Budget>;
  let budgetLineItemRepo: Repository<BudgetLineItem>;
  let projectRepo: Repository<Project>;
  let dataSource: DataSource;
  let queryRunner: any;

  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
  } as Project;

  const mockBudget = {
    id: 'budget-1',
    projectId: 'project-1',
    name: 'Test Budget',
    totalBudgeted: 1000000,
    totalCommitted: 500000,
    totalActual: 300000,
  } as Budget;

  const mockCostPeriod = {
    id: 'period-1',
    projectId: 'project-1',
    budgetId: 'budget-1',
    periodName: 'January 2025',
    periodStart: new Date('2025-01-01'),
    periodEnd: new Date('2025-01-31'),
    status: CostPeriodStatus.OPEN,
    snapshotData: null,
    closedAt: null,
    closedById: null,
    lockedAt: null,
    lockedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as CostPeriod;

  const mockCostEntry = {
    id: 'entry-1',
    costPeriodId: 'period-1',
    type: CostEntryType.LABOR,
    status: CostEntryStatus.POSTED,
    totalCost: 5000,
  } as CostEntry;

  const mockBudgetLineItem = {
    id: 'line-item-1',
    budgetId: 'budget-1',
    costCodeId: 'cost-code-1',
    budgetedCost: 100000,
    committedCost: 50000,
    actualCost: 30000,
    category: 'LABOR',
    costCode: {
      code: '01-100',
      name: 'General Labor',
    },
  } as BudgetLineItem;

  beforeEach(async () => {
    // Mock query runner
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(),
        save: jest.fn(),
        getRepository: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CostPeriodService,
        {
          provide: getRepositoryToken(CostPeriod),
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
            find: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Accrual),
          useValue: {
            count: jest.fn(),
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
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue(queryRunner),
          },
        },
      ],
    }).compile();

    service = module.get<CostPeriodService>(CostPeriodService);
    costPeriodRepo = module.get<Repository<CostPeriod>>(
      getRepositoryToken(CostPeriod),
    );
    costEntryRepo = module.get<Repository<CostEntry>>(
      getRepositoryToken(CostEntry),
    );
    accrualRepo = module.get<Repository<Accrual>>(
      getRepositoryToken(Accrual),
    );
    budgetRepo = module.get<Repository<Budget>>(
      getRepositoryToken(Budget),
    );
    budgetLineItemRepo = module.get<Repository<BudgetLineItem>>(
      getRepositoryToken(BudgetLineItem),
    );
    projectRepo = module.get<Repository<Project>>(
      getRepositoryToken(Project),
    );
    dataSource = module.get<DataSource>(DataSource);

    // Suppress logger output
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== CREATE TESTS ====================

  describe('create', () => {
    const createDto: CreateCostPeriodDto = {
      projectId: 'project-1',
      budgetId: 'budget-1',
      periodName: 'January 2025',
      periodStart: '2025-01-01',
      periodEnd: '2025-01-31',
    };

    it('should create a cost period with OPEN status', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      jest
        .spyOn(costPeriodRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      jest
        .spyOn(costPeriodRepo, 'create')
        .mockReturnValue(mockCostPeriod as any);
      jest
        .spyOn(costPeriodRepo, 'save')
        .mockResolvedValue(mockCostPeriod as any);
      jest
        .spyOn(costPeriodRepo, 'findOne')
        .mockResolvedValue({ ...mockCostPeriod, project: mockProject, budget: mockBudget } as any);

      const result = await service.create(createDto, 'user-1');

      expect(result.status).toBe(CostPeriodStatus.OPEN);
      expect(projectRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'project-1' },
      });
      expect(budgetRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'budget-1' },
      });
      expect(costPeriodRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if project does not exist', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(null);

      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        'Project with ID project-1 not found',
      );
    });

    it('should throw NotFoundException if budget does not exist', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(null);

      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        'Budget with ID budget-1 not found',
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
      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        'Budget budget-1 does not belong to project project-1',
      );
    });

    it('should throw BadRequestException if period end is before period start', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget);

      const invalidDto = {
        ...createDto,
        periodStart: '2025-01-31',
        periodEnd: '2025-01-01',
      };

      await expect(service.create(invalidDto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(invalidDto, 'user-1')).rejects.toThrow(
        'Period end date must be after period start date',
      );
    });

    it('should throw BadRequestException if period overlaps with existing period', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'existing-period',
          periodName: 'December 2024',
          periodStart: new Date('2024-12-15'),
          periodEnd: new Date('2025-01-15'),
        }),
      };
      jest
        .spyOn(costPeriodRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        'Period dates overlap with existing period',
      );
    });
  });

  // ==================== FINDALL TESTS ====================

  describe('findAll', () => {
    it('should return paginated cost periods with filters', async () => {
      const filter: CostPeriodFilterDto = {
        projectId: 'project-1',
        page: 1,
        limit: 10,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockCostPeriod], 1]),
      };

      jest
        .spyOn(costPeriodRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.findAll(filter);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'costPeriod.project_id = :projectId',
        { projectId: 'project-1' },
      );
    });

    it('should apply status filter', async () => {
      const filter: CostPeriodFilterDto = {
        status: CostPeriodStatus.CLOSED,
        page: 1,
        limit: 10,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      jest
        .spyOn(costPeriodRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      await service.findAll(filter);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'costPeriod.status = :status',
        { status: CostPeriodStatus.CLOSED },
      );
    });

    it('should apply date range filters', async () => {
      const filter: CostPeriodFilterDto = {
        fromDate: '2025-01-01',
        toDate: '2025-12-31',
        page: 1,
        limit: 10,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      jest
        .spyOn(costPeriodRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      await service.findAll(filter);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'costPeriod.period_start >= :fromDate',
        { fromDate: '2025-01-01' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'costPeriod.period_end <= :toDate',
        { toDate: '2025-12-31' },
      );
    });

    it('should use default pagination values', async () => {
      const filter: CostPeriodFilterDto = {};

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      jest
        .spyOn(costPeriodRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      await service.findAll(filter);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(50);
    });

    it('should apply custom sorting', async () => {
      const filter: CostPeriodFilterDto = {
        sortBy: 'periodName',
        sortOrder: 'ASC',
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      jest
        .spyOn(costPeriodRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      await service.findAll(filter);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'costPeriod.period_name',
        'ASC',
      );
    });
  });

  // ==================== FINDONE TESTS ====================

  describe('findOne', () => {
    it('should return a cost period by id', async () => {
      jest
        .spyOn(costPeriodRepo, 'findOne')
        .mockResolvedValue({ ...mockCostPeriod, project: mockProject, budget: mockBudget } as any);

      const result = await service.findOne('period-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('period-1');
      expect(costPeriodRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'period-1' },
        relations: ['project', 'budget', 'closedBy', 'lockedBy'],
      });
    });

    it('should throw NotFoundException if period does not exist', async () => {
      jest.spyOn(costPeriodRepo, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('non-existent')).rejects.toThrow(
        'Cost period with ID non-existent not found',
      );
    });
  });

  // ==================== UPDATE TESTS ====================

  describe('update', () => {
    const updateDto: UpdateCostPeriodDto = {
      periodName: 'January 2025 - Updated',
    };

    it('should update a cost period', async () => {
      jest
        .spyOn(costPeriodRepo, 'findOne')
        .mockResolvedValueOnce(mockCostPeriod as any)
        .mockResolvedValueOnce({ ...mockCostPeriod, ...updateDto, project: mockProject, budget: mockBudget } as any);

      jest
        .spyOn(costPeriodRepo, 'save')
        .mockResolvedValue({ ...mockCostPeriod, ...updateDto } as any);

      const result = await service.update('period-1', updateDto, 'user-1');

      expect(result.periodName).toBe('January 2025 - Updated');
      expect(costPeriodRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if period does not exist', async () => {
      jest.spyOn(costPeriodRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.update('non-existent', updateDto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if period is not OPEN', async () => {
      jest.spyOn(costPeriodRepo, 'findOne').mockResolvedValue({
        ...mockCostPeriod,
        status: CostPeriodStatus.CLOSED,
      } as any);

      await expect(
        service.update('period-1', updateDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update('period-1', updateDto, 'user-1'),
      ).rejects.toThrow('Only OPEN periods can be updated');
    });

    it('should update period dates if provided', async () => {
      const dateUpdateDto: UpdateCostPeriodDto = {
        periodStart: '2025-01-05',
        periodEnd: '2025-02-05',
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      jest
        .spyOn(costPeriodRepo, 'findOne')
        .mockResolvedValueOnce(mockCostPeriod as any)
        .mockResolvedValueOnce({ ...mockCostPeriod, ...dateUpdateDto, project: mockProject, budget: mockBudget } as any);

      jest
        .spyOn(costPeriodRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      jest
        .spyOn(costPeriodRepo, 'save')
        .mockResolvedValue({ ...mockCostPeriod, ...dateUpdateDto } as any);

      const result = await service.update('period-1', dateUpdateDto, 'user-1');

      expect(costPeriodRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if updated dates are invalid', async () => {
      const invalidDateDto: UpdateCostPeriodDto = {
        periodStart: '2025-02-01',
        periodEnd: '2025-01-01',
      };

      jest
        .spyOn(costPeriodRepo, 'findOne')
        .mockResolvedValue(mockCostPeriod as any);

      await expect(
        service.update('period-1', invalidDateDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update('period-1', invalidDateDto, 'user-1'),
      ).rejects.toThrow('Period end date must be after period start date');
    });

    it('should validate no overlaps when dates are changed', async () => {
      const dateUpdateDto: UpdateCostPeriodDto = {
        periodStart: '2025-01-15',
        periodEnd: '2025-02-15',
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'other-period',
          periodName: 'February 2025',
        }),
      };

      jest
        .spyOn(costPeriodRepo, 'findOne')
        .mockResolvedValue(mockCostPeriod as any);

      jest
        .spyOn(costPeriodRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      await expect(
        service.update('period-1', dateUpdateDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update('period-1', dateUpdateDto, 'user-1'),
      ).rejects.toThrow('Period dates overlap with existing period');
    });
  });

  // ==================== REMOVE TESTS ====================

  describe('remove', () => {
    it('should delete a cost period', async () => {
      jest
        .spyOn(costPeriodRepo, 'findOne')
        .mockResolvedValue(mockCostPeriod as any);
      jest.spyOn(costEntryRepo, 'count').mockResolvedValue(0);
      jest.spyOn(accrualRepo, 'count').mockResolvedValue(0);
      jest
        .spyOn(costPeriodRepo, 'remove')
        .mockResolvedValue(mockCostPeriod as any);

      await service.remove('period-1', 'user-1');

      expect(costPeriodRepo.remove).toHaveBeenCalledWith(mockCostPeriod);
    });

    it('should throw NotFoundException if period does not exist', async () => {
      jest.spyOn(costPeriodRepo, 'findOne').mockResolvedValue(null);

      await expect(service.remove('non-existent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if period is not OPEN', async () => {
      jest.spyOn(costPeriodRepo, 'findOne').mockResolvedValue({
        ...mockCostPeriod,
        status: CostPeriodStatus.CLOSED,
      } as any);

      await expect(service.remove('period-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.remove('period-1', 'user-1')).rejects.toThrow(
        'Only OPEN periods can be deleted',
      );
    });

    it('should throw BadRequestException if period has cost entries', async () => {
      jest
        .spyOn(costPeriodRepo, 'findOne')
        .mockResolvedValue(mockCostPeriod as any);
      jest.spyOn(costEntryRepo, 'count').mockResolvedValue(5);

      await expect(service.remove('period-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.remove('period-1', 'user-1')).rejects.toThrow(
        'Cannot delete cost period with 5 associated cost entries',
      );
    });

    it('should throw BadRequestException if period has accruals', async () => {
      jest
        .spyOn(costPeriodRepo, 'findOne')
        .mockResolvedValue(mockCostPeriod as any);
      jest.spyOn(costEntryRepo, 'count').mockResolvedValue(0);
      jest.spyOn(accrualRepo, 'count').mockResolvedValue(3);

      await expect(service.remove('period-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.remove('period-1', 'user-1')).rejects.toThrow(
        'Cannot delete cost period with 3 associated accruals',
      );
    });
  });

  // ==================== CLOSE TESTS ====================

  describe('close', () => {
    it('should close an OPEN cost period and create budget snapshot', async () => {
      const periodWithBudget = { ...mockCostPeriod, budget: mockBudget };

      queryRunner.manager.findOne.mockResolvedValue(periodWithBudget);
      queryRunner.manager.getRepository
        .mockReturnValueOnce({
          count: jest.fn().mockResolvedValue(0),
        })
        .mockReturnValueOnce({
          findOne: jest.fn().mockResolvedValue({
            ...mockBudget,
            project: mockProject,
          }),
        })
        .mockReturnValueOnce({
          find: jest.fn().mockResolvedValue([mockBudgetLineItem]),
        });

      queryRunner.manager.save.mockResolvedValue({
        ...mockCostPeriod,
        status: CostPeriodStatus.CLOSED,
        closedAt: new Date(),
        closedById: 'user-1',
        snapshotData: {},
      });

      jest
        .spyOn(costPeriodRepo, 'findOne')
        .mockResolvedValue({
          ...mockCostPeriod,
          status: CostPeriodStatus.CLOSED,
          closedAt: new Date(),
          closedById: 'user-1',
          project: mockProject,
          budget: mockBudget,
        } as any);

      const result = await service.close('period-1', 'user-1');

      expect(result.status).toBe(CostPeriodStatus.CLOSED);
      expect(result.closedById).toBe('user-1');
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should throw NotFoundException if period does not exist', async () => {
      queryRunner.manager.findOne.mockResolvedValue(null);

      await expect(service.close('non-existent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should throw BadRequestException if period is not OPEN', async () => {
      queryRunner.manager.findOne.mockResolvedValue({
        ...mockCostPeriod,
        status: CostPeriodStatus.CLOSED,
      });

      await expect(service.close('period-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.close('period-1', 'user-1')).rejects.toThrow(
        'Only OPEN periods can be closed',
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if period has DRAFT entries', async () => {
      queryRunner.manager.findOne.mockResolvedValue({
        ...mockCostPeriod,
        budget: mockBudget,
      });
      queryRunner.manager.getRepository.mockReturnValue({
        count: jest.fn().mockResolvedValue(3),
      });

      await expect(service.close('period-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.close('period-1', 'user-1')).rejects.toThrow(
        'Cannot close period with 3 DRAFT cost entries',
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      queryRunner.manager.findOne.mockResolvedValue({
        ...mockCostPeriod,
        budget: mockBudget,
      });
      queryRunner.manager.getRepository
        .mockReturnValueOnce({
          count: jest.fn().mockResolvedValue(0),
        })
        .mockReturnValueOnce({
          findOne: jest.fn().mockRejectedValue(new Error('Database error')),
        });

      await expect(service.close('period-1', 'user-1')).rejects.toThrow(
        'Database error',
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should create snapshot with budget line items', async () => {
      const lineItems = [
        { ...mockBudgetLineItem, id: 'item-1' },
        {
          ...mockBudgetLineItem,
          id: 'item-2',
          costCode: { code: '02-200', name: 'Concrete Work' },
        },
      ];

      queryRunner.manager.findOne.mockResolvedValue({
        ...mockCostPeriod,
        budget: mockBudget,
      });

      queryRunner.manager.getRepository
        .mockReturnValueOnce({
          count: jest.fn().mockResolvedValue(0),
        })
        .mockReturnValueOnce({
          findOne: jest.fn().mockResolvedValue({
            ...mockBudget,
            project: mockProject,
          }),
        })
        .mockReturnValueOnce({
          find: jest.fn().mockResolvedValue(lineItems),
        });

      queryRunner.manager.save.mockImplementation(async (entity, data) => {
        return { ...data, id: 'period-1' };
      });

      jest
        .spyOn(costPeriodRepo, 'findOne')
        .mockResolvedValue({
          ...mockCostPeriod,
          status: CostPeriodStatus.CLOSED,
          project: mockProject,
          budget: mockBudget,
        } as any);

      await service.close('period-1', 'user-1');

      expect(queryRunner.manager.save).toHaveBeenCalledWith(
        CostPeriod,
        expect.objectContaining({
          snapshotData: expect.objectContaining({
            lineItems: expect.arrayContaining([
              expect.objectContaining({ costCode: '01-100' }),
              expect.objectContaining({ costCode: '02-200' }),
            ]),
            lineItemCount: 2,
          }),
        }),
      );
    });
  });

  // ==================== LOCK TESTS ====================

  describe('lock', () => {
    it('should lock a CLOSED cost period', async () => {
      const closedPeriod = {
        ...mockCostPeriod,
        status: CostPeriodStatus.CLOSED,
        closedAt: new Date(),
        closedById: 'user-1',
      };

      jest
        .spyOn(costPeriodRepo, 'findOne')
        .mockResolvedValueOnce(closedPeriod as any)
        .mockResolvedValueOnce({
          ...closedPeriod,
          status: CostPeriodStatus.LOCKED,
          lockedAt: new Date(),
          lockedById: 'user-2',
          project: mockProject,
          budget: mockBudget,
        } as any);

      jest.spyOn(costPeriodRepo, 'save').mockResolvedValue({
        ...closedPeriod,
        status: CostPeriodStatus.LOCKED,
        lockedAt: new Date(),
        lockedById: 'user-2',
      } as any);

      const result = await service.lock('period-1', 'user-2');

      expect(result.status).toBe(CostPeriodStatus.LOCKED);
      expect(result.lockedById).toBe('user-2');
      expect(costPeriodRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: CostPeriodStatus.LOCKED,
          lockedById: 'user-2',
        }),
      );
    });

    it('should throw NotFoundException if period does not exist', async () => {
      jest.spyOn(costPeriodRepo, 'findOne').mockResolvedValue(null);

      await expect(service.lock('non-existent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if period is not CLOSED', async () => {
      jest
        .spyOn(costPeriodRepo, 'findOne')
        .mockResolvedValue(mockCostPeriod as any);

      await expect(service.lock('period-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.lock('period-1', 'user-1')).rejects.toThrow(
        'Only CLOSED periods can be locked',
      );
    });

    it('should throw BadRequestException if period is already LOCKED', async () => {
      jest.spyOn(costPeriodRepo, 'findOne').mockResolvedValue({
        ...mockCostPeriod,
        status: CostPeriodStatus.LOCKED,
      } as any);

      await expect(service.lock('period-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==================== GETSUMMARY TESTS ====================

  describe('getSummary', () => {
    it('should return period summary with aggregated cost data', async () => {
      jest
        .spyOn(costPeriodRepo, 'findOne')
        .mockResolvedValue({ ...mockCostPeriod, project: mockProject, budget: mockBudget } as any);

      const costEntries = [
        {
          ...mockCostEntry,
          id: 'entry-1',
          type: CostEntryType.LABOR,
          status: CostEntryStatus.POSTED,
          totalCost: 5000,
        },
        {
          ...mockCostEntry,
          id: 'entry-2',
          type: CostEntryType.MATERIAL,
          status: CostEntryStatus.POSTED,
          totalCost: 3000,
        },
        {
          ...mockCostEntry,
          id: 'entry-3',
          type: CostEntryType.LABOR,
          status: CostEntryStatus.DRAFT,
          totalCost: 2000,
        },
      ];

      jest.spyOn(costEntryRepo, 'find').mockResolvedValue(costEntries as any);

      const result = await service.getSummary('period-1');

      expect(result.periodId).toBe('period-1');
      expect(result.totalCostEntries).toBe(3);
      expect(result.totalAmount).toBe(10000);
      expect(result.entryCountByType[CostEntryType.LABOR]).toBe(2);
      expect(result.entryCountByType[CostEntryType.MATERIAL]).toBe(1);
      expect(result.entryCountByType[CostEntryType.EQUIPMENT]).toBe(0);
      expect(result.entryCountByStatus[CostEntryStatus.POSTED]).toBe(2);
      expect(result.entryCountByStatus[CostEntryStatus.DRAFT]).toBe(1);
    });

    it('should throw NotFoundException if period does not exist', async () => {
      jest.spyOn(costPeriodRepo, 'findOne').mockResolvedValue(null);

      await expect(service.getSummary('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle period with no cost entries', async () => {
      jest
        .spyOn(costPeriodRepo, 'findOne')
        .mockResolvedValue({ ...mockCostPeriod, project: mockProject, budget: mockBudget } as any);
      jest.spyOn(costEntryRepo, 'find').mockResolvedValue([]);

      const result = await service.getSummary('period-1');

      expect(result.totalCostEntries).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(result.entryCountByType[CostEntryType.LABOR]).toBe(0);
      expect(result.entryCountByStatus[CostEntryStatus.POSTED]).toBe(0);
    });

    it('should aggregate all cost entry types correctly', async () => {
      jest
        .spyOn(costPeriodRepo, 'findOne')
        .mockResolvedValue({ ...mockCostPeriod, project: mockProject, budget: mockBudget } as any);

      const costEntries = [
        { ...mockCostEntry, type: CostEntryType.LABOR, totalCost: 1000 },
        { ...mockCostEntry, type: CostEntryType.MATERIAL, totalCost: 2000 },
        { ...mockCostEntry, type: CostEntryType.EQUIPMENT, totalCost: 3000 },
        { ...mockCostEntry, type: CostEntryType.SUBCONTRACT, totalCost: 4000 },
        { ...mockCostEntry, type: CostEntryType.OTHER_DIRECT, totalCost: 5000 },
        { ...mockCostEntry, type: CostEntryType.OVERHEAD, totalCost: 6000 },
        { ...mockCostEntry, type: CostEntryType.INVOICE, totalCost: 7000 },
        { ...mockCostEntry, type: CostEntryType.ACCRUAL, totalCost: 8000 },
      ];

      jest.spyOn(costEntryRepo, 'find').mockResolvedValue(costEntries as any);

      const result = await service.getSummary('period-1');

      expect(result.entryCountByType[CostEntryType.LABOR]).toBe(1);
      expect(result.entryCountByType[CostEntryType.MATERIAL]).toBe(1);
      expect(result.entryCountByType[CostEntryType.EQUIPMENT]).toBe(1);
      expect(result.entryCountByType[CostEntryType.SUBCONTRACT]).toBe(1);
      expect(result.entryCountByType[CostEntryType.OTHER_DIRECT]).toBe(1);
      expect(result.entryCountByType[CostEntryType.OVERHEAD]).toBe(1);
      expect(result.entryCountByType[CostEntryType.INVOICE]).toBe(1);
      expect(result.entryCountByType[CostEntryType.ACCRUAL]).toBe(1);
      expect(result.totalAmount).toBe(36000);
    });

    it('should aggregate all cost entry statuses correctly', async () => {
      jest
        .spyOn(costPeriodRepo, 'findOne')
        .mockResolvedValue({ ...mockCostPeriod, project: mockProject, budget: mockBudget } as any);

      const costEntries = [
        { ...mockCostEntry, status: CostEntryStatus.DRAFT, totalCost: 1000 },
        { ...mockCostEntry, status: CostEntryStatus.POSTED, totalCost: 2000 },
        { ...mockCostEntry, status: CostEntryStatus.VOID, totalCost: 3000 },
        { ...mockCostEntry, status: CostEntryStatus.PENDING_APPROVAL, totalCost: 4000 },
        { ...mockCostEntry, status: CostEntryStatus.APPROVED, totalCost: 5000 },
        { ...mockCostEntry, status: CostEntryStatus.REJECTED, totalCost: 6000 },
      ];

      jest.spyOn(costEntryRepo, 'find').mockResolvedValue(costEntries as any);

      const result = await service.getSummary('period-1');

      expect(result.entryCountByStatus[CostEntryStatus.DRAFT]).toBe(1);
      expect(result.entryCountByStatus[CostEntryStatus.POSTED]).toBe(1);
      expect(result.entryCountByStatus[CostEntryStatus.VOID]).toBe(1);
      expect(result.entryCountByStatus[CostEntryStatus.PENDING_APPROVAL]).toBe(1);
      expect(result.entryCountByStatus[CostEntryStatus.APPROVED]).toBe(1);
      expect(result.entryCountByStatus[CostEntryStatus.REJECTED]).toBe(1);
      expect(result.totalAmount).toBe(21000);
    });
  });

  // ==================== WORKFLOW INTEGRATION TESTS ====================

  describe('workflow integration', () => {
    it('should support full workflow: open → close → lock', async () => {
      let currentStatus = CostPeriodStatus.OPEN;
      const period = { ...mockCostPeriod };

      // Mock for update (OPEN check)
      jest.spyOn(costPeriodRepo, 'findOne').mockImplementation(async () => {
        return { ...period, status: currentStatus } as any;
      });

      // Mock for close operation
      queryRunner.manager.findOne.mockImplementation(async () => {
        return { ...period, status: currentStatus, budget: mockBudget } as any;
      });

      queryRunner.manager.getRepository
        .mockReturnValue({
          count: jest.fn().mockResolvedValue(0),
          findOne: jest.fn().mockResolvedValue({
            ...mockBudget,
            project: mockProject,
          }),
          find: jest.fn().mockResolvedValue([mockBudgetLineItem]),
        });

      queryRunner.manager.save.mockImplementation(async (entity, data) => {
        currentStatus = data.status;
        return { ...data, status: data.status };
      });

      jest.spyOn(costPeriodRepo, 'save').mockImplementation(async (p: any) => {
        currentStatus = p.status;
        return { ...p, status: p.status } as any;
      });

      // Close the period
      const closed = await service.close('period-1', 'user-1');
      expect(closed.status).toBe(CostPeriodStatus.CLOSED);

      // Lock the period
      const locked = await service.lock('period-1', 'user-1');
      expect(locked.status).toBe(CostPeriodStatus.LOCKED);
    });

    it('should prevent updates on non-OPEN periods', async () => {
      jest.spyOn(costPeriodRepo, 'findOne').mockResolvedValue({
        ...mockCostPeriod,
        status: CostPeriodStatus.CLOSED,
      } as any);

      await expect(
        service.update('period-1', { periodName: 'Updated' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent deletion on non-OPEN periods', async () => {
      jest.spyOn(costPeriodRepo, 'findOne').mockResolvedValue({
        ...mockCostPeriod,
        status: CostPeriodStatus.LOCKED,
      } as any);

      await expect(service.remove('period-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should prevent closing non-OPEN periods', async () => {
      queryRunner.manager.findOne.mockResolvedValue({
        ...mockCostPeriod,
        status: CostPeriodStatus.LOCKED,
      });

      await expect(service.close('period-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should prevent locking non-CLOSED periods', async () => {
      jest
        .spyOn(costPeriodRepo, 'findOne')
        .mockResolvedValue(mockCostPeriod as any);

      await expect(service.lock('period-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==================== VALIDATION TESTS ====================

  describe('validation tests', () => {
    it('should prevent overlapping periods for the same project', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'existing-period',
          periodName: 'Existing Period',
          periodStart: new Date('2025-01-15'),
          periodEnd: new Date('2025-02-15'),
        }),
      };

      jest
        .spyOn(costPeriodRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const overlappingDto: CreateCostPeriodDto = {
        projectId: 'project-1',
        budgetId: 'budget-1',
        periodName: 'Overlapping Period',
        periodStart: '2025-01-10',
        periodEnd: '2025-02-10',
      };

      await expect(service.create(overlappingDto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(overlappingDto, 'user-1')).rejects.toThrow(
        'Period dates overlap with existing period',
      );
    });

    it('should allow non-overlapping periods for the same project', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(budgetRepo, 'findOne').mockResolvedValue(mockBudget);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      jest
        .spyOn(costPeriodRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      jest
        .spyOn(costPeriodRepo, 'create')
        .mockReturnValue(mockCostPeriod as any);
      jest
        .spyOn(costPeriodRepo, 'save')
        .mockResolvedValue(mockCostPeriod as any);
      jest
        .spyOn(costPeriodRepo, 'findOne')
        .mockResolvedValue({ ...mockCostPeriod, project: mockProject, budget: mockBudget } as any);

      const nonOverlappingDto: CreateCostPeriodDto = {
        projectId: 'project-1',
        budgetId: 'budget-1',
        periodName: 'February 2025',
        periodStart: '2025-02-01',
        periodEnd: '2025-02-28',
      };

      const result = await service.create(nonOverlappingDto, 'user-1');
      expect(result).toBeDefined();
    });

    it('should exclude current period from overlap check during update', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      jest
        .spyOn(costPeriodRepo, 'findOne')
        .mockResolvedValueOnce(mockCostPeriod as any)
        .mockResolvedValueOnce({ ...mockCostPeriod, project: mockProject, budget: mockBudget } as any);

      jest
        .spyOn(costPeriodRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      jest.spyOn(costPeriodRepo, 'save').mockResolvedValue(mockCostPeriod as any);

      const updateDto: UpdateCostPeriodDto = {
        periodStart: '2025-01-05',
        periodEnd: '2025-02-05',
      };

      await service.update('period-1', updateDto, 'user-1');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'period.id != :excludeId',
        { excludeId: 'period-1' },
      );
    });
  });

  // ==================== EDGE CASES ====================

  describe('edge cases', () => {
    it('should handle period with decimal cost amounts', async () => {
      jest
        .spyOn(costPeriodRepo, 'findOne')
        .mockResolvedValue({ ...mockCostPeriod, project: mockProject, budget: mockBudget } as any);

      const costEntries = [
        { ...mockCostEntry, totalCost: 1234.56 },
        { ...mockCostEntry, totalCost: 7890.12 },
      ];

      jest.spyOn(costEntryRepo, 'find').mockResolvedValue(costEntries as any);

      const result = await service.getSummary('period-1');

      expect(result.totalAmount).toBe(9124.68);
    });

    it('should handle budget with no line items when creating snapshot', async () => {
      queryRunner.manager.findOne.mockResolvedValue({
        ...mockCostPeriod,
        budget: mockBudget,
      });

      queryRunner.manager.getRepository
        .mockReturnValueOnce({
          count: jest.fn().mockResolvedValue(0),
        })
        .mockReturnValueOnce({
          findOne: jest.fn().mockResolvedValue({
            ...mockBudget,
            project: mockProject,
          }),
        })
        .mockReturnValueOnce({
          find: jest.fn().mockResolvedValue([]),
        });

      queryRunner.manager.save.mockImplementation(async (entity, data) => {
        expect(data.snapshotData.lineItems).toEqual([]);
        expect(data.snapshotData.lineItemCount).toBe(0);
        expect(data.snapshotData.totals.budgeted).toBe(0);
        return { ...data, id: 'period-1' };
      });

      jest
        .spyOn(costPeriodRepo, 'findOne')
        .mockResolvedValue({
          ...mockCostPeriod,
          status: CostPeriodStatus.CLOSED,
          project: mockProject,
          budget: mockBudget,
        } as any);

      await service.close('period-1', 'user-1');

      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should handle missing cost code in line item during snapshot', async () => {
      const lineItemWithoutCostCode = {
        ...mockBudgetLineItem,
        costCode: null,
      };

      queryRunner.manager.findOne.mockResolvedValue({
        ...mockCostPeriod,
        budget: mockBudget,
      });

      queryRunner.manager.getRepository
        .mockReturnValueOnce({
          count: jest.fn().mockResolvedValue(0),
        })
        .mockReturnValueOnce({
          findOne: jest.fn().mockResolvedValue({
            ...mockBudget,
            project: mockProject,
          }),
        })
        .mockReturnValueOnce({
          find: jest.fn().mockResolvedValue([lineItemWithoutCostCode]),
        });

      queryRunner.manager.save.mockImplementation(async (entity, data) => {
        const lineItem = data.snapshotData.lineItems[0];
        expect(lineItem.costCode).toBe('N/A');
        expect(lineItem.costCodeName).toBe('N/A');
        return { ...data, id: 'period-1' };
      });

      jest
        .spyOn(costPeriodRepo, 'findOne')
        .mockResolvedValue({
          ...mockCostPeriod,
          status: CostPeriodStatus.CLOSED,
          project: mockProject,
          budget: mockBudget,
        } as any);

      await service.close('period-1', 'user-1');

      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should handle zero budgeted cost when calculating variance', async () => {
      const lineItemZeroBudget = {
        ...mockBudgetLineItem,
        budgetedCost: 0,
        actualCost: 1000,
      };

      queryRunner.manager.findOne.mockResolvedValue({
        ...mockCostPeriod,
        budget: mockBudget,
      });

      queryRunner.manager.getRepository
        .mockReturnValueOnce({
          count: jest.fn().mockResolvedValue(0),
        })
        .mockReturnValueOnce({
          findOne: jest.fn().mockResolvedValue({
            ...mockBudget,
            project: mockProject,
          }),
        })
        .mockReturnValueOnce({
          find: jest.fn().mockResolvedValue([lineItemZeroBudget]),
        });

      queryRunner.manager.save.mockImplementation(async (entity, data) => {
        const lineItem = data.snapshotData.lineItems[0];
        expect(lineItem.variancePercent).toBe(0);
        return { ...data, id: 'period-1' };
      });

      jest
        .spyOn(costPeriodRepo, 'findOne')
        .mockResolvedValue({
          ...mockCostPeriod,
          status: CostPeriodStatus.CLOSED,
          project: mockProject,
          budget: mockBudget,
        } as any);

      await service.close('period-1', 'user-1');

      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });
  });
});
