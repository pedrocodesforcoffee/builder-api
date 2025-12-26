import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { OwnerChangeOrderService } from './owner-change-order.service';
import { OwnerChangeOrder } from '../entities/owner-change-order.entity';
import { OcoCostBreakdown } from '../entities/oco-cost-breakdown.entity';
import { PrimeContract } from '../entities/prime-contract.entity';
import { Project } from '../../projects/entities/project.entity';
import { Budget } from '../entities/budget.entity';
import { BudgetLineItem } from '../entities/budget-line-item.entity';
import { OcoStatus } from '../enums/oco-status.enum';
import { BudgetStatus } from '../enums/budget-status.enum';
import { BudgetImpactType } from '../enums/budget-impact-type.enum';
import {
  CreateOwnerChangeOrderDto,
  UpdateOwnerChangeOrderDto,
  UpdateCostBreakdownDto,
} from '../dto';

describe('OwnerChangeOrderService', () => {
  let service: OwnerChangeOrderService;
  let ocoRepo: jest.Mocked<Repository<OwnerChangeOrder>>;
  let ocoCostBreakdownRepo: jest.Mocked<Repository<OcoCostBreakdown>>;
  let primeContractRepo: jest.Mocked<Repository<PrimeContract>>;
  let projectRepo: jest.Mocked<Repository<Project>>;
  let dataSource: jest.Mocked<DataSource>;

  const mockOcoRepo = {
    create: jest.fn((data) => data),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockOcoCostBreakdownRepo = {
    create: jest.fn((data) => data),
    save: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
  };

  const mockPrimeContractRepo = { findOne: jest.fn() };
  const mockProjectRepo = { findOne: jest.fn() };

  const mockEntityManager = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn((callback) => callback(mockEntityManager)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OwnerChangeOrderService,
        {
          provide: getRepositoryToken(OwnerChangeOrder),
          useValue: mockOcoRepo,
        },
        {
          provide: getRepositoryToken(OcoCostBreakdown),
          useValue: mockOcoCostBreakdownRepo,
        },
        {
          provide: getRepositoryToken(PrimeContract),
          useValue: mockPrimeContractRepo,
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

    service = module.get<OwnerChangeOrderService>(OwnerChangeOrderService);
    ocoRepo = module.get(getRepositoryToken(OwnerChangeOrder));
    ocoCostBreakdownRepo = module.get(getRepositoryToken(OcoCostBreakdown));
    primeContractRepo = module.get(getRepositoryToken(PrimeContract));
    projectRepo = module.get(getRepositoryToken(Project));
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const mockProjectId = '123e4567-e89b-12d3-a456-426614174000';
    const mockPrimeContractId = '223e4567-e89b-12d3-a456-426614174001';

    it('should create OCO successfully', async () => {
      const createDto: CreateOwnerChangeOrderDto = {
        projectId: mockProjectId,
        primeContractId: mockPrimeContractId,
        ocoNumber: 'OCO-001',
        title: 'Additional Structural Work',
        description: 'Reinforcement of foundation per structural engineer recommendation',
        changeType: 'ADDITIVE',
        priority: 'HIGH',
        amount: 50000,
        reason: 'Design change',
        scheduleImpactDays: 10,
      };

      const mockProject = { id: mockProjectId } as Project;
      const mockPrimeContract = { id: mockPrimeContractId } as PrimeContract;
      const mockSavedOco = {
        id: '1',
        ...createDto,
        status: OcoStatus.DRAFT,
      } as OwnerChangeOrder;

      projectRepo.findOne.mockResolvedValue(mockProject);
      primeContractRepo.findOne.mockResolvedValue(mockPrimeContract);
      ocoRepo.findOne.mockResolvedValue(null);
      ocoRepo.save.mockResolvedValue(mockSavedOco);

      const result = await service.create(createDto);

      expect(result.id).toBe('1');
      expect(result.status).toBe(OcoStatus.DRAFT);
      expect(result.amount).toBe(50000);
      expect(ocoRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: OcoStatus.DRAFT,
        })
      );
    });

    it('should throw NotFoundException when project not found', async () => {
      const createDto: CreateOwnerChangeOrderDto = {
        projectId: mockProjectId,
        primeContractId: mockPrimeContractId,
        ocoNumber: 'OCO-001',
        title: 'Test OCO',
        changeType: 'ADDITIVE',
      };

      projectRepo.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(createDto)).rejects.toThrow(
        `Project with ID ${mockProjectId} not found`
      );
    });

    it('should throw BadRequestException for duplicate OCO number', async () => {
      const createDto: CreateOwnerChangeOrderDto = {
        projectId: mockProjectId,
        primeContractId: mockPrimeContractId,
        ocoNumber: 'OCO-001',
        title: 'Test OCO',
        changeType: 'ADDITIVE',
      };

      const mockProject = { id: mockProjectId } as Project;
      const mockPrimeContract = { id: mockPrimeContractId } as PrimeContract;
      const mockExistingOco = { id: '1', ocoNumber: 'OCO-001' } as OwnerChangeOrder;

      projectRepo.findOne.mockResolvedValue(mockProject);
      primeContractRepo.findOne.mockResolvedValue(mockPrimeContract);
      ocoRepo.findOne.mockResolvedValue(mockExistingOco);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(
        'OCO number "OCO-001" already exists in this project'
      );
    });
  });

  describe('update', () => {
    const mockOcoId = '123e4567-e89b-12d3-a456-426614174000';

    it('should update OCO successfully', async () => {
      const updateDto: UpdateOwnerChangeOrderDto = {
        title: 'Updated Title',
        amount: 55000,
      };

      const mockOco = {
        id: mockOcoId,
        ocoNumber: 'OCO-001',
        projectId: '1',
        status: OcoStatus.DRAFT,
        amount: 50000,
      } as OwnerChangeOrder;

      const mockUpdatedOco = {
        ...mockOco,
        ...updateDto,
      } as OwnerChangeOrder;

      ocoRepo.findOne.mockResolvedValue(mockOco);
      ocoRepo.save.mockResolvedValue(mockUpdatedOco);

      const result = await service.update(mockOcoId, updateDto);

      expect(result.title).toBe('Updated Title');
      expect(result.amount).toBe(55000);
    });

    it('should throw BadRequestException when updating executed OCO', async () => {
      const updateDto: UpdateOwnerChangeOrderDto = { title: 'Updated' };
      const mockOco = {
        id: mockOcoId,
        status: OcoStatus.EXECUTED,
      } as OwnerChangeOrder;

      ocoRepo.findOne.mockResolvedValue(mockOco);

      await expect(service.update(mockOcoId, updateDto)).rejects.toThrow(BadRequestException);
      await expect(service.update(mockOcoId, updateDto)).rejects.toThrow(
        'Cannot update an executed OCO'
      );
    });
  });

  describe('remove', () => {
    const mockOcoId = '123e4567-e89b-12d3-a456-426614174000';

    it('should remove OCO successfully', async () => {
      const mockOco = {
        id: mockOcoId,
        status: OcoStatus.DRAFT,
      } as OwnerChangeOrder;

      ocoRepo.findOne.mockResolvedValue(mockOco);

      await service.remove(mockOcoId);

      expect(ocoRepo.remove).toHaveBeenCalledWith(mockOco);
    });

    it('should throw BadRequestException when deleting approved OCO', async () => {
      const mockOco = {
        id: mockOcoId,
        status: OcoStatus.APPROVED,
      } as OwnerChangeOrder;

      ocoRepo.findOne.mockResolvedValue(mockOco);

      await expect(service.remove(mockOcoId)).rejects.toThrow(BadRequestException);
      await expect(service.remove(mockOcoId)).rejects.toThrow(
        'Cannot delete an approved or executed OCO'
      );
    });

    it('should throw BadRequestException when deleting executed OCO', async () => {
      const mockOco = {
        id: mockOcoId,
        status: OcoStatus.EXECUTED,
      } as OwnerChangeOrder;

      ocoRepo.findOne.mockResolvedValue(mockOco);

      await expect(service.remove(mockOcoId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('submit', () => {
    const mockOcoId = '123e4567-e89b-12d3-a456-426614174000';
    const mockUserId = '223e4567-e89b-12d3-a456-426614174001';

    it('should submit OCO from DRAFT status', async () => {
      const mockOco = {
        id: mockOcoId,
        status: OcoStatus.DRAFT,
      } as OwnerChangeOrder;

      ocoRepo.findOne.mockResolvedValue(mockOco);
      ocoRepo.save.mockResolvedValue({
        ...mockOco,
        status: OcoStatus.PENDING_APPROVAL,
        submittedAt: new Date(),
        submittedById: mockUserId,
      });

      const result = await service.submit(mockOcoId, mockUserId);

      expect(result.status).toBe(OcoStatus.PENDING_APPROVAL);
    });

    it('should submit OCO from REJECTED status', async () => {
      const mockOco = {
        id: mockOcoId,
        status: OcoStatus.REJECTED,
      } as OwnerChangeOrder;

      ocoRepo.findOne.mockResolvedValue(mockOco);
      ocoRepo.save.mockResolvedValue({ ...mockOco, status: OcoStatus.PENDING_APPROVAL });

      const result = await service.submit(mockOcoId, mockUserId);

      expect(result.status).toBe(OcoStatus.PENDING_APPROVAL);
    });

    it('should throw BadRequestException when submitting from wrong status', async () => {
      const mockOco = {
        id: mockOcoId,
        status: OcoStatus.APPROVED,
      } as OwnerChangeOrder;

      ocoRepo.findOne.mockResolvedValue(mockOco);

      await expect(service.submit(mockOcoId, mockUserId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('approve', () => {
    const mockOcoId = '123e4567-e89b-12d3-a456-426614174000';
    const mockUserId = '223e4567-e89b-12d3-a456-426614174001';
    const mockPrimeContractId = '323e4567-e89b-12d3-a456-426614174002';
    const mockProjectId = '423e4567-e89b-12d3-a456-426614174003';

    it('should approve OCO and update prime contract amount', async () => {
      const mockOco = {
        id: mockOcoId,
        projectId: mockProjectId,
        primeContractId: mockPrimeContractId,
        status: OcoStatus.PENDING_APPROVAL,
        amount: 50000,
        budgetImpactType: null,
      } as OwnerChangeOrder;

      const mockPrimeContract = {
        id: mockPrimeContractId,
        currentAmount: 1000000,
      } as PrimeContract;

      ocoRepo.findOne.mockResolvedValue(mockOco);
      mockEntityManager.findOne.mockResolvedValue(mockPrimeContract);
      mockEntityManager.save
        .mockResolvedValueOnce({ ...mockOco, status: OcoStatus.APPROVED })
        .mockResolvedValueOnce({ ...mockPrimeContract, currentAmount: 1050000 });

      const result = await service.approve(mockOcoId, mockUserId);

      expect(result.status).toBe(OcoStatus.APPROVED);
      expect(mockEntityManager.save).toHaveBeenCalledWith(
        PrimeContract,
        expect.objectContaining({
          currentAmount: 1050000,
        })
      );
    });

    it('should use provided approved amount instead of OCO amount', async () => {
      const mockOco = {
        id: mockOcoId,
        projectId: mockProjectId,
        primeContractId: mockPrimeContractId,
        status: OcoStatus.PENDING_APPROVAL,
        amount: 50000,
      } as OwnerChangeOrder;

      const mockPrimeContract = {
        id: mockPrimeContractId,
        currentAmount: 1000000,
      } as PrimeContract;

      ocoRepo.findOne.mockResolvedValue(mockOco);
      mockEntityManager.findOne.mockResolvedValue(mockPrimeContract);
      mockEntityManager.save.mockResolvedValue({ ...mockOco, status: OcoStatus.APPROVED });

      await service.approve(mockOcoId, mockUserId, { approvedAmount: 45000 });

      expect(mockEntityManager.save).toHaveBeenCalledWith(
        PrimeContract,
        expect.objectContaining({
          currentAmount: 1045000,
        })
      );
    });

    it('should update budget contingency when budgetImpactType is CONTINGENCY', async () => {
      const mockBudgetId = '523e4567-e89b-12d3-a456-426614174004';

      const mockOco = {
        id: mockOcoId,
        projectId: mockProjectId,
        primeContractId: mockPrimeContractId,
        status: OcoStatus.PENDING_APPROVAL,
        amount: 30000,
        budgetImpactType: BudgetImpactType.CONTINGENCY,
      } as OwnerChangeOrder;

      const mockPrimeContract = {
        id: mockPrimeContractId,
        currentAmount: 1000000,
      } as PrimeContract;

      const mockBudget = {
        id: mockBudgetId,
        projectId: mockProjectId,
        status: BudgetStatus.ACTIVE,
        contingency: 100000,
      } as Budget;

      ocoRepo.findOne.mockResolvedValue(mockOco);
      mockEntityManager.findOne
        .mockResolvedValueOnce(mockPrimeContract)
        .mockResolvedValueOnce(mockBudget);
      mockEntityManager.save.mockResolvedValue({ ...mockOco, status: OcoStatus.APPROVED });

      await service.approve(mockOcoId, mockUserId);

      expect(mockEntityManager.save).toHaveBeenCalledWith(
        Budget,
        expect.objectContaining({
          contingency: 70000,
        })
      );
    });

    it('should update budget line item when budgetImpactType is LINE_ITEM', async () => {
      const mockBudgetLineItemId = '623e4567-e89b-12d3-a456-426614174005';

      const mockOco = {
        id: mockOcoId,
        projectId: mockProjectId,
        primeContractId: mockPrimeContractId,
        status: OcoStatus.PENDING_APPROVAL,
        amount: 20000,
        budgetImpactType: BudgetImpactType.LINE_ITEM,
        budgetLineItemId: mockBudgetLineItemId,
      } as OwnerChangeOrder;

      const mockPrimeContract = {
        id: mockPrimeContractId,
        currentAmount: 1000000,
      } as PrimeContract;

      const mockBudget = {
        id: '1',
        projectId: mockProjectId,
        status: BudgetStatus.ACTIVE,
      } as Budget;

      const mockLineItem = {
        id: mockBudgetLineItemId,
        budgetedCost: 50000,
      } as BudgetLineItem;

      ocoRepo.findOne.mockResolvedValue(mockOco);
      mockEntityManager.findOne
        .mockResolvedValueOnce(mockPrimeContract)
        .mockResolvedValueOnce(mockBudget)
        .mockResolvedValueOnce(mockLineItem);
      mockEntityManager.save.mockResolvedValue({ ...mockOco, status: OcoStatus.APPROVED });

      await service.approve(mockOcoId, mockUserId);

      expect(mockEntityManager.save).toHaveBeenCalledWith(
        BudgetLineItem,
        expect.objectContaining({
          budgetedCost: 70000,
        })
      );
    });

    it('should throw BadRequestException when approving from wrong status', async () => {
      const mockOco = {
        id: mockOcoId,
        status: OcoStatus.DRAFT,
      } as OwnerChangeOrder;

      ocoRepo.findOne.mockResolvedValue(mockOco);

      await expect(service.approve(mockOcoId, mockUserId)).rejects.toThrow(BadRequestException);
      await expect(service.approve(mockOcoId, mockUserId)).rejects.toThrow(
        'Can only approve OCOs in PENDING_APPROVAL status'
      );
    });
  });

  describe('reject', () => {
    const mockOcoId = '123e4567-e89b-12d3-a456-426614174000';
    const mockUserId = '223e4567-e89b-12d3-a456-426614174001';
    const reason = 'Cost too high';

    it('should reject OCO', async () => {
      const mockOco = {
        id: mockOcoId,
        status: OcoStatus.PENDING_APPROVAL,
      } as OwnerChangeOrder;

      ocoRepo.findOne.mockResolvedValue(mockOco);
      ocoRepo.save.mockResolvedValue({
        ...mockOco,
        status: OcoStatus.REJECTED,
        rejectionReason: reason,
      });

      const result = await service.reject(mockOcoId, mockUserId, reason);

      expect(result.status).toBe(OcoStatus.REJECTED);
      expect(result.rejectionReason).toBe(reason);
    });

    it('should throw BadRequestException when rejecting from wrong status', async () => {
      const mockOco = {
        id: mockOcoId,
        status: OcoStatus.APPROVED,
      } as OwnerChangeOrder;

      ocoRepo.findOne.mockResolvedValue(mockOco);

      await expect(service.reject(mockOcoId, mockUserId, reason)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('execute', () => {
    const mockOcoId = '123e4567-e89b-12d3-a456-426614174000';
    const mockUserId = '223e4567-e89b-12d3-a456-426614174001';

    it('should execute approved OCO', async () => {
      const mockOco = {
        id: mockOcoId,
        status: OcoStatus.APPROVED,
      } as OwnerChangeOrder;

      ocoRepo.findOne.mockResolvedValue(mockOco);
      ocoRepo.save.mockResolvedValue({ ...mockOco, status: OcoStatus.EXECUTED });

      const result = await service.execute(mockOcoId, mockUserId);

      expect(result.status).toBe(OcoStatus.EXECUTED);
    });

    it('should throw BadRequestException when executing unapproved OCO', async () => {
      const mockOco = {
        id: mockOcoId,
        status: OcoStatus.PENDING_APPROVAL,
      } as OwnerChangeOrder;

      ocoRepo.findOne.mockResolvedValue(mockOco);

      await expect(service.execute(mockOcoId, mockUserId)).rejects.toThrow(BadRequestException);
      await expect(service.execute(mockOcoId, mockUserId)).rejects.toThrow(
        'Can only execute APPROVED OCOs'
      );
    });
  });

  describe('getCostBreakdown', () => {
    const mockOcoId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return cost breakdown items', async () => {
      const mockOco = { id: mockOcoId } as OwnerChangeOrder;
      const mockBreakdowns = [
        {
          id: '1',
          ocoId: mockOcoId,
          costCodeId: '1',
          description: 'Labor',
          amount: 10000,
          order: 0,
        },
        {
          id: '2',
          ocoId: mockOcoId,
          costCodeId: '2',
          description: 'Materials',
          amount: 5000,
          order: 1,
        },
      ] as OcoCostBreakdown[];

      ocoRepo.findOne.mockResolvedValue(mockOco);
      ocoCostBreakdownRepo.find.mockResolvedValue(mockBreakdowns);

      const result = await service.getCostBreakdown(mockOcoId);

      expect(result).toHaveLength(2);
      expect(result[0].amount).toBe(10000);
      expect(result[1].amount).toBe(5000);
    });
  });

  describe('updateCostBreakdown', () => {
    const mockOcoId = '123e4567-e89b-12d3-a456-426614174000';
    const mockUserId = '223e4567-e89b-12d3-a456-426614174001';

    it('should update cost breakdown and recalculate OCO amount', async () => {
      const updateDto: UpdateCostBreakdownDto = {
        items: [
          {
            costCodeId: '1',
            description: 'Foundation work',
            amount: 15000,
            order: 0,
          },
          {
            costCodeId: '2',
            description: 'Concrete',
            amount: 10000,
            order: 1,
          },
        ],
      };

      const mockOco = {
        id: mockOcoId,
        status: OcoStatus.DRAFT,
        amount: 20000,
      } as OwnerChangeOrder;

      const mockSavedBreakdowns = [
        { id: '1', ocoId: mockOcoId, amount: 15000 },
        { id: '2', ocoId: mockOcoId, amount: 10000 },
      ] as OcoCostBreakdown[];

      ocoRepo.findOne.mockResolvedValue(mockOco);
      ocoCostBreakdownRepo.save.mockResolvedValue(mockSavedBreakdowns);
      ocoRepo.save.mockResolvedValue({ ...mockOco, amount: 25000 });

      const result = await service.updateCostBreakdown(mockOcoId, updateDto, mockUserId);

      expect(result).toHaveLength(2);
      expect(ocoCostBreakdownRepo.delete).toHaveBeenCalledWith({ ocoId: mockOcoId });
      expect(ocoRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 25000,
        })
      );
    });

    it('should throw BadRequestException when updating non-DRAFT OCO', async () => {
      const updateDto: UpdateCostBreakdownDto = { items: [] };
      const mockOco = {
        id: mockOcoId,
        status: OcoStatus.APPROVED,
      } as OwnerChangeOrder;

      ocoRepo.findOne.mockResolvedValue(mockOco);

      await expect(
        service.updateCostBreakdown(mockOcoId, updateDto, mockUserId)
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateCostBreakdown(mockOcoId, updateDto, mockUserId)
      ).rejects.toThrow('Can only update cost breakdown for OCOs in DRAFT status');
    });
  });
});
