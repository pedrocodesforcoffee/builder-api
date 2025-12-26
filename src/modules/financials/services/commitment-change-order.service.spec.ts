import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, SelectQueryBuilder } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { CommitmentChangeOrderService } from './commitment-change-order.service';
import { CommitmentChangeOrder } from '../entities/commitment-change-order.entity';
import { CcoLineItem } from '../entities/cco-line-item.entity';
import { CcoTmEntry } from '../entities/cco-tm-entry.entity';
import { Commitment } from '../entities/commitment.entity';
import { Project } from '../../projects/entities/project.entity';
import { BudgetLineItem } from '../entities/budget-line-item.entity';
import { CcoStatus } from '../enums/cco-status.enum';
import { BudgetStatus } from '../enums/budget-status.enum';
import {
  CreateCommitmentChangeOrderDto,
  UpdateCommitmentChangeOrderDto,
} from '../dto';

describe('CommitmentChangeOrderService', () => {
  let service: CommitmentChangeOrderService;
  let ccoRepo: jest.Mocked<Repository<CommitmentChangeOrder>>;
  let ccoLineItemRepo: jest.Mocked<Repository<CcoLineItem>>;
  let ccoTmEntryRepo: jest.Mocked<Repository<CcoTmEntry>>;
  let commitmentRepo: jest.Mocked<Repository<Commitment>>;
  let projectRepo: jest.Mocked<Repository<Project>>;
  let dataSource: jest.Mocked<DataSource>;

  const mockCcoRepo = {
    create: jest.fn((data) => data),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockCcoLineItemRepo = {};
  const mockCcoTmEntryRepo = {};
  const mockCommitmentRepo = { findOne: jest.fn() };
  const mockProjectRepo = { findOne: jest.fn() };

  const mockQueryBuilder = {
    getOne: jest.fn(),
  };

  const mockEntityManager = {
    findOne: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    })),
  };

  const mockDataSource = {
    transaction: jest.fn((callback) => callback(mockEntityManager)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommitmentChangeOrderService,
        {
          provide: getRepositoryToken(CommitmentChangeOrder),
          useValue: mockCcoRepo,
        },
        {
          provide: getRepositoryToken(CcoLineItem),
          useValue: mockCcoLineItemRepo,
        },
        {
          provide: getRepositoryToken(CcoTmEntry),
          useValue: mockCcoTmEntryRepo,
        },
        {
          provide: getRepositoryToken(Commitment),
          useValue: mockCommitmentRepo,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<CommitmentChangeOrderService>(CommitmentChangeOrderService);
    ccoRepo = module.get(getRepositoryToken(CommitmentChangeOrder));
    ccoLineItemRepo = module.get(getRepositoryToken(CcoLineItem));
    ccoTmEntryRepo = module.get(getRepositoryToken(CcoTmEntry));
    commitmentRepo = module.get(getRepositoryToken(Commitment));
    projectRepo = module.get(getRepositoryToken(Project));
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const mockProjectId = '123e4567-e89b-12d3-a456-426614174000';
    const mockCommitmentId = '223e4567-e89b-12d3-a456-426614174001';

    it('should create CCO successfully', async () => {
      const createDto: CreateCommitmentChangeOrderDto = {
        projectId: mockProjectId,
        commitmentId: mockCommitmentId,
        ccoNumber: 'CCO-001',
        title: 'Additional Plumbing Work',
        description: 'Additional fixtures per owner request',
        changeType: 'ADDITIVE',
        amount: 15000,
      };

      const mockProject = { id: mockProjectId } as Project;
      const mockCommitment = { id: mockCommitmentId } as Commitment;
      const mockSavedCco = {
        id: '1',
        ...createDto,
        status: CcoStatus.DRAFT,
        isTimeAndMaterial: false,
      } as CommitmentChangeOrder;

      projectRepo.findOne.mockResolvedValue(mockProject);
      commitmentRepo.findOne.mockResolvedValue(mockCommitment);
      ccoRepo.findOne.mockResolvedValue(null);
      ccoRepo.save.mockResolvedValue(mockSavedCco);

      const result = await service.create(createDto);

      expect(result.id).toBe('1');
      expect(result.status).toBe(CcoStatus.DRAFT);
      expect(result.amount).toBe(15000);
      expect(result.isTimeAndMaterial).toBe(false);
    });

    it('should create T&M CCO', async () => {
      const createDto: CreateCommitmentChangeOrderDto = {
        projectId: mockProjectId,
        commitmentId: mockCommitmentId,
        ccoNumber: 'CCO-002',
        title: 'T&M Work',
        changeType: 'ADDITIVE',
        isTimeAndMaterial: true,
      };

      const mockProject = { id: mockProjectId } as Project;
      const mockCommitment = { id: mockCommitmentId } as Commitment;
      const mockSavedCco = {
        id: '2',
        ...createDto,
        status: CcoStatus.DRAFT,
      } as CommitmentChangeOrder;

      projectRepo.findOne.mockResolvedValue(mockProject);
      commitmentRepo.findOne.mockResolvedValue(mockCommitment);
      ccoRepo.findOne.mockResolvedValue(null);
      ccoRepo.save.mockResolvedValue(mockSavedCco);

      const result = await service.create(createDto);

      expect(result.isTimeAndMaterial).toBe(true);
    });

    it('should throw NotFoundException when project not found', async () => {
      const createDto: CreateCommitmentChangeOrderDto = {
        projectId: mockProjectId,
        commitmentId: mockCommitmentId,
        ccoNumber: 'CCO-001',
        title: 'Test CCO',
        changeType: 'ADDITIVE',
      };

      projectRepo.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(createDto)).rejects.toThrow(
        `Project with ID ${mockProjectId} not found`
      );
    });

    it('should throw NotFoundException when commitment not found', async () => {
      const createDto: CreateCommitmentChangeOrderDto = {
        projectId: mockProjectId,
        commitmentId: mockCommitmentId,
        ccoNumber: 'CCO-001',
        title: 'Test CCO',
        changeType: 'ADDITIVE',
      };

      const mockProject = { id: mockProjectId } as Project;

      projectRepo.findOne.mockResolvedValue(mockProject);
      commitmentRepo.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(createDto)).rejects.toThrow(
        `Commitment with ID ${mockCommitmentId} not found`
      );
    });

    it('should throw BadRequestException for duplicate CCO number', async () => {
      const createDto: CreateCommitmentChangeOrderDto = {
        projectId: mockProjectId,
        commitmentId: mockCommitmentId,
        ccoNumber: 'CCO-001',
        title: 'Test CCO',
        changeType: 'ADDITIVE',
      };

      const mockProject = { id: mockProjectId } as Project;
      const mockCommitment = { id: mockCommitmentId } as Commitment;
      const mockExistingCco = { id: '1', ccoNumber: 'CCO-001' } as CommitmentChangeOrder;

      projectRepo.findOne.mockResolvedValue(mockProject);
      commitmentRepo.findOne.mockResolvedValue(mockCommitment);
      ccoRepo.findOne.mockResolvedValue(mockExistingCco);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(
        'CCO number "CCO-001" already exists for this commitment'
      );
    });
  });

  describe('update', () => {
    const mockCcoId = '123e4567-e89b-12d3-a456-426614174000';

    it('should update CCO successfully', async () => {
      const updateDto: UpdateCommitmentChangeOrderDto = {
        title: 'Updated Title',
        amount: 20000,
      };

      const mockCco = {
        id: mockCcoId,
        ccoNumber: 'CCO-001',
        commitmentId: '1',
        status: CcoStatus.DRAFT,
        amount: 15000,
      } as CommitmentChangeOrder;

      const mockUpdatedCco = {
        ...mockCco,
        ...updateDto,
      } as CommitmentChangeOrder;

      ccoRepo.findOne.mockResolvedValue(mockCco);
      ccoRepo.save.mockResolvedValue(mockUpdatedCco);

      const result = await service.update(mockCcoId, updateDto);

      expect(result.title).toBe('Updated Title');
      expect(result.amount).toBe(20000);
    });

    it('should throw BadRequestException when updating executed CCO', async () => {
      const updateDto: UpdateCommitmentChangeOrderDto = { title: 'Updated' };
      const mockCco = {
        id: mockCcoId,
        status: CcoStatus.EXECUTED,
      } as CommitmentChangeOrder;

      ccoRepo.findOne.mockResolvedValue(mockCco);

      await expect(service.update(mockCcoId, updateDto)).rejects.toThrow(BadRequestException);
      await expect(service.update(mockCcoId, updateDto)).rejects.toThrow(
        'Cannot update an executed CCO'
      );
    });
  });

  describe('remove', () => {
    const mockCcoId = '123e4567-e89b-12d3-a456-426614174000';

    it('should remove CCO successfully', async () => {
      const mockCco = {
        id: mockCcoId,
        status: CcoStatus.DRAFT,
      } as CommitmentChangeOrder;

      ccoRepo.findOne.mockResolvedValue(mockCco);

      await service.remove(mockCcoId);

      expect(ccoRepo.remove).toHaveBeenCalledWith(mockCco);
    });

    it('should throw BadRequestException when deleting approved CCO', async () => {
      const mockCco = {
        id: mockCcoId,
        status: CcoStatus.APPROVED,
      } as CommitmentChangeOrder;

      ccoRepo.findOne.mockResolvedValue(mockCco);

      await expect(service.remove(mockCcoId)).rejects.toThrow(BadRequestException);
      await expect(service.remove(mockCcoId)).rejects.toThrow(
        'Cannot delete an approved or executed CCO'
      );
    });
  });

  describe('submit', () => {
    const mockCcoId = '123e4567-e89b-12d3-a456-426614174000';
    const mockUserId = '223e4567-e89b-12d3-a456-426614174001';

    it('should submit CCO from DRAFT status', async () => {
      const mockCco = {
        id: mockCcoId,
        status: CcoStatus.DRAFT,
      } as CommitmentChangeOrder;

      ccoRepo.findOne.mockResolvedValue(mockCco);
      ccoRepo.save.mockResolvedValue({
        ...mockCco,
        status: CcoStatus.PENDING_APPROVAL,
        submittedAt: new Date(),
        submittedById: mockUserId,
      });

      const result = await service.submit(mockCcoId, mockUserId);

      expect(result.status).toBe(CcoStatus.PENDING_APPROVAL);
    });

    it('should throw BadRequestException when submitting from wrong status', async () => {
      const mockCco = {
        id: mockCcoId,
        status: CcoStatus.APPROVED,
      } as CommitmentChangeOrder;

      ccoRepo.findOne.mockResolvedValue(mockCco);

      await expect(service.submit(mockCcoId, mockUserId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('approve', () => {
    const mockCcoId = '123e4567-e89b-12d3-a456-426614174000';
    const mockUserId = '223e4567-e89b-12d3-a456-426614174001';
    const mockCommitmentId = '323e4567-e89b-12d3-a456-426614174002';
    const mockProjectId = '423e4567-e89b-12d3-a456-426614174003';
    const mockCostCodeId = '523e4567-e89b-12d3-a456-426614174004';

    it('should approve CCO and update commitment amount', async () => {
      const mockCco = {
        id: mockCcoId,
        projectId: mockProjectId,
        commitmentId: mockCommitmentId,
        status: CcoStatus.PENDING_APPROVAL,
        amount: 15000,
        costCodeId: null,
      } as CommitmentChangeOrder;

      const mockCommitment = {
        id: mockCommitmentId,
        currentAmount: 100000,
      } as Commitment;

      ccoRepo.findOne.mockResolvedValue(mockCco);
      mockEntityManager.findOne.mockResolvedValue(mockCommitment);
      mockEntityManager.save
        .mockResolvedValueOnce({ ...mockCco, status: CcoStatus.APPROVED })
        .mockResolvedValueOnce({ ...mockCommitment, currentAmount: 115000 });

      const result = await service.approve(mockCcoId, mockUserId);

      expect(result.status).toBe(CcoStatus.APPROVED);
      expect(mockEntityManager.save).toHaveBeenCalledWith(
        Commitment,
        expect.objectContaining({
          currentAmount: 115000,
        })
      );
    });

    it('should use provided approved amount instead of CCO amount', async () => {
      const mockCco = {
        id: mockCcoId,
        projectId: mockProjectId,
        commitmentId: mockCommitmentId,
        status: CcoStatus.PENDING_APPROVAL,
        amount: 15000,
        costCodeId: null,
      } as CommitmentChangeOrder;

      const mockCommitment = {
        id: mockCommitmentId,
        currentAmount: 100000,
      } as Commitment;

      ccoRepo.findOne.mockResolvedValue(mockCco);
      mockEntityManager.findOne.mockResolvedValue(mockCommitment);
      mockEntityManager.save.mockResolvedValue({ ...mockCco, status: CcoStatus.APPROVED });

      await service.approve(mockCcoId, mockUserId, { approvedAmount: 12000 });

      expect(mockEntityManager.save).toHaveBeenCalledWith(
        Commitment,
        expect.objectContaining({
          currentAmount: 112000,
        })
      );
    });

    it('should update budget line item committed cost when costCodeId present', async () => {
      const mockCco = {
        id: mockCcoId,
        projectId: mockProjectId,
        commitmentId: mockCommitmentId,
        status: CcoStatus.PENDING_APPROVAL,
        amount: 10000,
        costCodeId: mockCostCodeId,
      } as CommitmentChangeOrder;

      const mockCommitment = {
        id: mockCommitmentId,
        currentAmount: 100000,
      } as Commitment;

      const mockBudgetLineItem = {
        id: '1',
        costCodeId: mockCostCodeId,
        committedCost: 50000,
      } as BudgetLineItem;

      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockBudgetLineItem),
      };

      ccoRepo.findOne.mockResolvedValue(mockCco);
      mockEntityManager.findOne
        .mockResolvedValueOnce(mockCommitment);
      mockEntityManager.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockEntityManager.save.mockResolvedValue({ ...mockCco, status: CcoStatus.APPROVED });

      await service.approve(mockCcoId, mockUserId);

      expect(mockEntityManager.save).toHaveBeenCalledWith(
        BudgetLineItem,
        expect.objectContaining({
          committedCost: 60000,
        })
      );
    });

    it('should handle negative CCO amounts (deductive changes)', async () => {
      const mockCco = {
        id: mockCcoId,
        projectId: mockProjectId,
        commitmentId: mockCommitmentId,
        status: CcoStatus.PENDING_APPROVAL,
        amount: -5000,
        costCodeId: mockCostCodeId,
      } as CommitmentChangeOrder;

      const mockCommitment = {
        id: mockCommitmentId,
        currentAmount: 100000,
      } as Commitment;

      const mockBudgetLineItem = {
        id: '1',
        costCodeId: mockCostCodeId,
        committedCost: 50000,
      } as BudgetLineItem;

      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockBudgetLineItem),
      };

      ccoRepo.findOne.mockResolvedValue(mockCco);
      mockEntityManager.findOne.mockResolvedValue(mockCommitment);
      mockEntityManager.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockEntityManager.save.mockResolvedValue({ ...mockCco, status: CcoStatus.APPROVED });

      await service.approve(mockCcoId, mockUserId);

      expect(mockEntityManager.save).toHaveBeenCalledWith(
        Commitment,
        expect.objectContaining({
          currentAmount: 95000,
        })
      );
      expect(mockEntityManager.save).toHaveBeenCalledWith(
        BudgetLineItem,
        expect.objectContaining({
          committedCost: 45000,
        })
      );
    });

    it('should throw BadRequestException when approving from wrong status', async () => {
      const mockCco = {
        id: mockCcoId,
        status: CcoStatus.DRAFT,
      } as CommitmentChangeOrder;

      ccoRepo.findOne.mockResolvedValue(mockCco);

      await expect(service.approve(mockCcoId, mockUserId)).rejects.toThrow(BadRequestException);
      await expect(service.approve(mockCcoId, mockUserId)).rejects.toThrow(
        'Can only approve CCOs in PENDING_APPROVAL status'
      );
    });
  });

  describe('reject', () => {
    const mockCcoId = '123e4567-e89b-12d3-a456-426614174000';
    const mockUserId = '223e4567-e89b-12d3-a456-426614174001';
    const reason = 'Price too high';

    it('should reject CCO', async () => {
      const mockCco = {
        id: mockCcoId,
        status: CcoStatus.PENDING_APPROVAL,
      } as CommitmentChangeOrder;

      ccoRepo.findOne.mockResolvedValue(mockCco);
      ccoRepo.save.mockResolvedValue({
        ...mockCco,
        status: CcoStatus.REJECTED,
        rejectionReason: reason,
      });

      const result = await service.reject(mockCcoId, mockUserId, reason);

      expect(result.status).toBe(CcoStatus.REJECTED);
      expect(result.rejectionReason).toBe(reason);
    });

    it('should throw BadRequestException when rejecting from wrong status', async () => {
      const mockCco = {
        id: mockCcoId,
        status: CcoStatus.APPROVED,
      } as CommitmentChangeOrder;

      ccoRepo.findOne.mockResolvedValue(mockCco);

      await expect(service.reject(mockCcoId, mockUserId, reason)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('execute', () => {
    const mockCcoId = '123e4567-e89b-12d3-a456-426614174000';
    const mockUserId = '223e4567-e89b-12d3-a456-426614174001';

    it('should execute approved CCO', async () => {
      const mockCco = {
        id: mockCcoId,
        status: CcoStatus.APPROVED,
      } as CommitmentChangeOrder;

      ccoRepo.findOne.mockResolvedValue(mockCco);
      ccoRepo.save.mockResolvedValue({ ...mockCco, status: CcoStatus.EXECUTED });

      const result = await service.execute(mockCcoId, mockUserId);

      expect(result.status).toBe(CcoStatus.EXECUTED);
    });

    it('should throw BadRequestException when executing unapproved CCO', async () => {
      const mockCco = {
        id: mockCcoId,
        status: CcoStatus.PENDING_APPROVAL,
      } as CommitmentChangeOrder;

      ccoRepo.findOne.mockResolvedValue(mockCco);

      await expect(service.execute(mockCcoId, mockUserId)).rejects.toThrow(BadRequestException);
      await expect(service.execute(mockCcoId, mockUserId)).rejects.toThrow(
        'Can only execute APPROVED CCOs'
      );
    });
  });

  describe('recalculateTotal', () => {
    const mockCcoId = '123e4567-e89b-12d3-a456-426614174000';

    it('should recalculate total from line items', async () => {
      const mockCco = {
        id: mockCcoId,
        isTimeAndMaterial: false,
        lineItems: [
          { id: '1', amount: 5000 },
          { id: '2', amount: 3000 },
          { id: '3', amount: 2000 },
        ],
        tmEntries: [],
      } as CommitmentChangeOrder;

      ccoRepo.findOne.mockResolvedValue(mockCco);
      ccoRepo.save.mockResolvedValue({ ...mockCco, amount: 10000 });

      const result = await service.recalculateTotal(mockCcoId);

      expect(result.amount).toBe(10000);
    });

    it('should recalculate total from T&M entries', async () => {
      const mockCco = {
        id: mockCcoId,
        isTimeAndMaterial: true,
        lineItems: [],
        tmEntries: [
          { id: '1', totalCost: 4000 },
          { id: '2', totalCost: 6000 },
        ],
      } as CommitmentChangeOrder;

      ccoRepo.findOne.mockResolvedValue(mockCco);
      ccoRepo.save.mockResolvedValue({ ...mockCco, amount: 10000 });

      const result = await service.recalculateTotal(mockCcoId);

      expect(result.amount).toBe(10000);
    });

    it('should handle CCO with no items', async () => {
      const mockCco = {
        id: mockCcoId,
        isTimeAndMaterial: false,
        lineItems: [],
        tmEntries: [],
      } as CommitmentChangeOrder;

      ccoRepo.findOne.mockResolvedValue(mockCco);
      ccoRepo.save.mockResolvedValue({ ...mockCco, amount: 0 });

      const result = await service.recalculateTotal(mockCcoId);

      expect(result.amount).toBe(0);
    });

    it('should throw NotFoundException when CCO not found', async () => {
      ccoRepo.findOne.mockResolvedValue(null);

      await expect(service.recalculateTotal(mockCcoId)).rejects.toThrow(NotFoundException);
    });
  });
});
