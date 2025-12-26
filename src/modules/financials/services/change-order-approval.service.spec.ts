import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { ChangeOrderApprovalService } from './change-order-approval.service';
import { ApprovalThreshold } from '../entities/approval-threshold.entity';
import { OwnerChangeOrder } from '../entities/owner-change-order.entity';
import { CommitmentChangeOrder } from '../entities/commitment-change-order.entity';
import { User } from '../../users/entities/user.entity';
import { UpdateThresholdsDto } from '../dto';

describe('ChangeOrderApprovalService', () => {
  let service: ChangeOrderApprovalService;
  let thresholdRepo: jest.Mocked<Repository<ApprovalThreshold>>;
  let ocoRepo: jest.Mocked<Repository<OwnerChangeOrder>>;
  let ccoRepo: jest.Mocked<Repository<CommitmentChangeOrder>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let dataSource: jest.Mocked<DataSource>;

  const mockThresholdRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockOcoRepo = {
    findOne: jest.fn(),
  };

  const mockCcoRepo = {
    findOne: jest.fn(),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockEntityManager = {
    update: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn((callback) => callback(mockEntityManager)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChangeOrderApprovalService,
        {
          provide: getRepositoryToken(ApprovalThreshold),
          useValue: mockThresholdRepo,
        },
        {
          provide: getRepositoryToken(OwnerChangeOrder),
          useValue: mockOcoRepo,
        },
        {
          provide: getRepositoryToken(CommitmentChangeOrder),
          useValue: mockCcoRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<ChangeOrderApprovalService>(ChangeOrderApprovalService);
    thresholdRepo = module.get(getRepositoryToken(ApprovalThreshold));
    ocoRepo = module.get(getRepositoryToken(OwnerChangeOrder));
    ccoRepo = module.get(getRepositoryToken(CommitmentChangeOrder));
    userRepo = module.get(getRepositoryToken(User));
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getThresholds', () => {
    const mockProjectId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return existing thresholds', async () => {
      const mockThresholds = [
        {
          id: '1',
          projectId: mockProjectId,
          minAmount: 0,
          maxAmount: 10000,
          requiredRole: 'PROJECT_MANAGER',
          requiresOwnerApproval: false,
          sortOrder: 0,
          isActive: true,
        },
        {
          id: '2',
          projectId: mockProjectId,
          minAmount: 10000,
          maxAmount: 50000,
          requiredRole: 'DIRECTOR',
          requiresOwnerApproval: true,
          sortOrder: 1,
          isActive: true,
        },
      ] as ApprovalThreshold[];

      thresholdRepo.find.mockResolvedValue(mockThresholds);

      const result = await service.getThresholds(mockProjectId);

      expect(result).toEqual(mockThresholds);
      expect(thresholdRepo.find).toHaveBeenCalledWith({
        where: { projectId: mockProjectId, isActive: true },
        order: { minAmount: 'ASC', sortOrder: 'ASC' },
      });
    });

    it('should create default thresholds if none exist', async () => {
      const mockDefaultThresholds = [
        {
          id: '1',
          projectId: mockProjectId,
          minAmount: 0,
          maxAmount: 10000,
          requiredRole: 'PROJECT_MANAGER',
          requiresOwnerApproval: false,
          sortOrder: 0,
          isActive: true,
        },
        {
          id: '2',
          projectId: mockProjectId,
          minAmount: 10000,
          maxAmount: 50000,
          requiredRole: 'DIRECTOR',
          requiresOwnerApproval: true,
          sortOrder: 1,
          isActive: true,
        },
        {
          id: '3',
          projectId: mockProjectId,
          minAmount: 50000,
          maxAmount: undefined,
          requiredRole: 'VP',
          requiresOwnerApproval: true,
          sortOrder: 2,
          isActive: true,
        },
      ] as ApprovalThreshold[];

      thresholdRepo.find.mockResolvedValue([]);
      thresholdRepo.create.mockImplementation((data) => data as ApprovalThreshold);
      thresholdRepo.save.mockResolvedValue(mockDefaultThresholds);

      const result = await service.getThresholds(mockProjectId);

      expect(result).toEqual(mockDefaultThresholds);
      expect(thresholdRepo.create).toHaveBeenCalledTimes(3);
      expect(thresholdRepo.save).toHaveBeenCalled();
    });
  });

  describe('updateThresholds', () => {
    const mockProjectId = '123e4567-e89b-12d3-a456-426614174000';

    it('should update thresholds successfully', async () => {
      const updateDto: UpdateThresholdsDto = {
        thresholds: [
          {
            minAmount: 0,
            maxAmount: 5000,
            requiredRole: 'SUPERINTENDENT',
            requiresOwnerApproval: false,
          },
          {
            minAmount: 5000,
            maxAmount: 25000,
            requiredRole: 'PROJECT_MANAGER',
            requiresOwnerApproval: false,
          },
          {
            minAmount: 25000,
            maxAmount: null,
            requiredRole: 'VP',
            requiresOwnerApproval: true,
          },
        ],
      };

      const mockSavedThresholds = [
        { id: '1', ...updateDto.thresholds[0], projectId: mockProjectId, sortOrder: 0, isActive: true },
        { id: '2', ...updateDto.thresholds[1], projectId: mockProjectId, sortOrder: 1, isActive: true },
        { id: '3', ...updateDto.thresholds[2], projectId: mockProjectId, sortOrder: 2, isActive: true, maxAmount: undefined },
      ] as ApprovalThreshold[];

      mockEntityManager.create.mockImplementation((entity, data) => data);
      mockEntityManager.save.mockResolvedValue(mockSavedThresholds);

      const result = await service.updateThresholds(mockProjectId, updateDto);

      expect(result).toEqual(mockSavedThresholds);
      expect(mockEntityManager.update).toHaveBeenCalledWith(
        ApprovalThreshold,
        { projectId: mockProjectId, isActive: true },
        { isActive: false }
      );
      expect(mockEntityManager.save).toHaveBeenCalled();
    });

    it('should throw error for overlapping ranges', async () => {
      const updateDto: UpdateThresholdsDto = {
        thresholds: [
          {
            minAmount: 0,
            maxAmount: 10000,
            requiredRole: 'PROJECT_MANAGER',
            requiresOwnerApproval: false,
          },
          {
            minAmount: 5000,
            maxAmount: 15000,
            requiredRole: 'DIRECTOR',
            requiresOwnerApproval: true,
          },
        ],
      };

      await expect(
        service.updateThresholds(mockProjectId, updateDto)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when maxAmount < minAmount', async () => {
      const updateDto: UpdateThresholdsDto = {
        thresholds: [
          {
            minAmount: 10000,
            maxAmount: 5000,
            requiredRole: 'PROJECT_MANAGER',
            requiresOwnerApproval: false,
          },
        ],
      };

      await expect(
        service.updateThresholds(mockProjectId, updateDto)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when non-last threshold has no maxAmount', async () => {
      const updateDto: UpdateThresholdsDto = {
        thresholds: [
          {
            minAmount: 0,
            maxAmount: null,
            requiredRole: 'PROJECT_MANAGER',
            requiresOwnerApproval: false,
          },
          {
            minAmount: 10000,
            maxAmount: 20000,
            requiredRole: 'DIRECTOR',
            requiresOwnerApproval: true,
          },
        ],
      };

      await expect(
        service.updateThresholds(mockProjectId, updateDto)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('determineApprovalRoute', () => {
    const mockProjectId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return correct threshold for amount within range', async () => {
      const mockThresholds = [
        {
          id: '1',
          projectId: mockProjectId,
          minAmount: 0,
          maxAmount: 10000,
          requiredRole: 'PROJECT_MANAGER',
          requiresOwnerApproval: false,
          sortOrder: 0,
          isActive: true,
        },
        {
          id: '2',
          projectId: mockProjectId,
          minAmount: 10000,
          maxAmount: 50000,
          requiredRole: 'DIRECTOR',
          requiresOwnerApproval: true,
          sortOrder: 1,
          isActive: true,
        },
      ] as ApprovalThreshold[];

      thresholdRepo.find.mockResolvedValue(mockThresholds);

      const result = await service.determineApprovalRoute(mockProjectId, new Decimal(25000));

      expect(result.thresholdId).toBe('2');
      expect(result.requiredRole).toBe('DIRECTOR');
      expect(result.requiresOwnerApproval).toBe(true);
      expect(result.changeOrderAmount).toBe(25000);
      expect(result.isWithinRange).toBe(true);
    });

    it('should return correct threshold for amount at boundary', async () => {
      const mockThresholds = [
        {
          id: '1',
          projectId: mockProjectId,
          minAmount: 0,
          maxAmount: 10000,
          requiredRole: 'PROJECT_MANAGER',
          requiresOwnerApproval: false,
          sortOrder: 0,
          isActive: true,
        },
        {
          id: '2',
          projectId: mockProjectId,
          minAmount: 10000,
          maxAmount: 50000,
          requiredRole: 'DIRECTOR',
          requiresOwnerApproval: true,
          sortOrder: 1,
          isActive: true,
        },
      ] as ApprovalThreshold[];

      thresholdRepo.find.mockResolvedValue(mockThresholds);

      const result = await service.determineApprovalRoute(mockProjectId, new Decimal(10000));

      expect(result.thresholdId).toBe('2');
      expect(result.requiredRole).toBe('DIRECTOR');
    });

    it('should handle unlimited upper range', async () => {
      const mockThresholds = [
        {
          id: '1',
          projectId: mockProjectId,
          minAmount: 50000,
          maxAmount: null,
          requiredRole: 'VP',
          requiresOwnerApproval: true,
          sortOrder: 0,
          isActive: true,
        },
      ] as ApprovalThreshold[];

      thresholdRepo.find.mockResolvedValue(mockThresholds);

      const result = await service.determineApprovalRoute(mockProjectId, new Decimal(1000000));

      expect(result.thresholdId).toBe('1');
      expect(result.requiredRole).toBe('VP');
      expect(result.maxAmount).toBeNull();
    });

    it('should throw NotFoundException when no matching threshold', async () => {
      const mockThresholds = [
        {
          id: '1',
          projectId: mockProjectId,
          minAmount: 10000,
          maxAmount: 20000,
          requiredRole: 'PROJECT_MANAGER',
          requiresOwnerApproval: false,
          sortOrder: 0,
          isActive: true,
        },
      ] as ApprovalThreshold[];

      thresholdRepo.find.mockResolvedValue(mockThresholds);

      await expect(
        service.determineApprovalRoute(mockProjectId, new Decimal(5000))
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('canUserApprove', () => {
    const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
    const mockOcoId = '223e4567-e89b-12d3-a456-426614174001';
    const mockProjectId = '323e4567-e89b-12d3-a456-426614174002';

    it('should return true when user has required role', async () => {
      const mockUser = {
        id: mockUserId,
        role: 'DIRECTOR',
      } as any;

      const mockOco = {
        id: mockOcoId,
        projectId: mockProjectId,
        amount: 25000,
      } as OwnerChangeOrder;

      const mockThresholds = [
        {
          id: '1',
          projectId: mockProjectId,
          minAmount: 10000,
          maxAmount: 50000,
          requiredRole: 'DIRECTOR',
          requiresOwnerApproval: false,
          sortOrder: 0,
          isActive: true,
        },
      ] as ApprovalThreshold[];

      userRepo.findOne.mockResolvedValue(mockUser);
      ocoRepo.findOne.mockResolvedValue(mockOco);
      thresholdRepo.find.mockResolvedValue(mockThresholds);

      const result = await service.canUserApprove(mockUserId, mockOcoId, 'OCO');

      expect(result).toBe(true);
    });

    it('should return false when user lacks required role', async () => {
      const mockUser = {
        id: mockUserId,
        role: 'PROJECT_MANAGER',
      } as any;

      const mockOco = {
        id: mockOcoId,
        projectId: mockProjectId,
        amount: 25000,
      } as OwnerChangeOrder;

      const mockThresholds = [
        {
          id: '1',
          projectId: mockProjectId,
          minAmount: 10000,
          maxAmount: 50000,
          requiredRole: 'DIRECTOR',
          requiresOwnerApproval: false,
          sortOrder: 0,
          isActive: true,
        },
      ] as ApprovalThreshold[];

      userRepo.findOne.mockResolvedValue(mockUser);
      ocoRepo.findOne.mockResolvedValue(mockOco);
      thresholdRepo.find.mockResolvedValue(mockThresholds);

      const result = await service.canUserApprove(mockUserId, mockOcoId, 'OCO');

      expect(result).toBe(false);
    });

    it('should return false when owner approval required but user is not owner', async () => {
      const mockUser = {
        id: mockUserId,
        role: 'DIRECTOR',
        isOwner: false,
      } as any;

      const mockOco = {
        id: mockOcoId,
        projectId: mockProjectId,
        amount: 25000,
      } as OwnerChangeOrder;

      const mockThresholds = [
        {
          id: '1',
          projectId: mockProjectId,
          minAmount: 10000,
          maxAmount: 50000,
          requiredRole: 'DIRECTOR',
          requiresOwnerApproval: true,
          sortOrder: 0,
          isActive: true,
        },
      ] as ApprovalThreshold[];

      userRepo.findOne.mockResolvedValue(mockUser);
      ocoRepo.findOne.mockResolvedValue(mockOco);
      thresholdRepo.find.mockResolvedValue(mockThresholds);

      const result = await service.canUserApprove(mockUserId, mockOcoId, 'OCO');

      expect(result).toBe(false);
    });

    it('should return true when user is company owner', async () => {
      const mockUser = {
        id: mockUserId,
        role: 'COMPANY_OWNER',
      } as any;

      const mockOco = {
        id: mockOcoId,
        projectId: mockProjectId,
        amount: 75000,
      } as OwnerChangeOrder;

      const mockThresholds = [
        {
          id: '1',
          projectId: mockProjectId,
          minAmount: 50000,
          maxAmount: null,
          requiredRole: 'COMPANY_OWNER',
          requiresOwnerApproval: true,
          sortOrder: 0,
          isActive: true,
        },
      ] as ApprovalThreshold[];

      userRepo.findOne.mockResolvedValue(mockUser);
      ocoRepo.findOne.mockResolvedValue(mockOco);
      thresholdRepo.find.mockResolvedValue(mockThresholds);

      const result = await service.canUserApprove(mockUserId, mockOcoId, 'OCO');

      expect(result).toBe(true);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.canUserApprove(mockUserId, mockOcoId, 'OCO')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when change order not found', async () => {
      const mockUser = {
        id: mockUserId,
        role: 'DIRECTOR',
      } as any;

      userRepo.findOne.mockResolvedValue(mockUser);
      ocoRepo.findOne.mockResolvedValue(null);

      await expect(
        service.canUserApprove(mockUserId, mockOcoId, 'OCO')
      ).rejects.toThrow(NotFoundException);
    });

    it('should work with CCO', async () => {
      const mockCcoId = '423e4567-e89b-12d3-a456-426614174003';
      const mockUser = {
        id: mockUserId,
        role: 'PROJECT_MANAGER',
      } as any;

      const mockCco = {
        id: mockCcoId,
        projectId: mockProjectId,
        amount: 5000,
      } as CommitmentChangeOrder;

      const mockThresholds = [
        {
          id: '1',
          projectId: mockProjectId,
          minAmount: 0,
          maxAmount: 10000,
          requiredRole: 'PROJECT_MANAGER',
          requiresOwnerApproval: false,
          sortOrder: 0,
          isActive: true,
        },
      ] as ApprovalThreshold[];

      userRepo.findOne.mockResolvedValue(mockUser);
      ccoRepo.findOne.mockResolvedValue(mockCco);
      thresholdRepo.find.mockResolvedValue(mockThresholds);

      const result = await service.canUserApprove(mockUserId, mockCcoId, 'CCO');

      expect(result).toBe(true);
    });
  });

  describe('validateApprovalChain', () => {
    const mockOcoId = '123e4567-e89b-12d3-a456-426614174000';
    const mockProjectId = '223e4567-e89b-12d3-a456-426614174001';
    const mockApproverId = '323e4567-e89b-12d3-a456-426614174002';

    it('should validate approved change order successfully', async () => {
      const mockOco = {
        id: mockOcoId,
        projectId: mockProjectId,
        amount: 25000,
        status: 'APPROVED',
        approvedById: mockApproverId,
        approvedAt: new Date(),
      } as OwnerChangeOrder;

      const mockApprover = {
        id: mockApproverId,
        role: 'DIRECTOR',
      } as any;

      const mockThresholds = [
        {
          id: '1',
          projectId: mockProjectId,
          minAmount: 10000,
          maxAmount: 50000,
          requiredRole: 'DIRECTOR',
          requiresOwnerApproval: false,
          sortOrder: 0,
          isActive: true,
        },
      ] as ApprovalThreshold[];

      ocoRepo.findOne.mockResolvedValue(mockOco);
      thresholdRepo.find.mockResolvedValue(mockThresholds);
      userRepo.findOne.mockResolvedValue(mockApprover);

      const result = await service.validateApprovalChain(mockOcoId, 'OCO');

      expect(result.isValid).toBe(true);
      expect(result.hasRoleApproval).toBe(true);
      expect(result.hasOwnerApproval).toBe(true);
      expect(result.validationErrors).toHaveLength(0);
    });

    it('should fail validation when not approved', async () => {
      const mockOco = {
        id: mockOcoId,
        projectId: mockProjectId,
        amount: 25000,
        status: 'PENDING_APPROVAL',
        approvedById: null,
        approvedAt: null,
      } as OwnerChangeOrder;

      const mockThresholds = [
        {
          id: '1',
          projectId: mockProjectId,
          minAmount: 10000,
          maxAmount: 50000,
          requiredRole: 'DIRECTOR',
          requiresOwnerApproval: false,
          sortOrder: 0,
          isActive: true,
        },
      ] as ApprovalThreshold[];

      ocoRepo.findOne.mockResolvedValue(mockOco);
      thresholdRepo.find.mockResolvedValue(mockThresholds);

      const result = await service.validateApprovalChain(mockOcoId, 'OCO');

      expect(result.isValid).toBe(false);
      expect(result.hasRoleApproval).toBe(false);
      expect(result.validationErrors).toContain('Change order has not been approved');
    });

    it('should fail validation when approver has wrong role', async () => {
      const mockOco = {
        id: mockOcoId,
        projectId: mockProjectId,
        amount: 25000,
        status: 'APPROVED',
        approvedById: mockApproverId,
        approvedAt: new Date(),
      } as OwnerChangeOrder;

      const mockApprover = {
        id: mockApproverId,
        role: 'PROJECT_MANAGER',
      } as any;

      const mockThresholds = [
        {
          id: '1',
          projectId: mockProjectId,
          minAmount: 10000,
          maxAmount: 50000,
          requiredRole: 'DIRECTOR',
          requiresOwnerApproval: false,
          sortOrder: 0,
          isActive: true,
        },
      ] as ApprovalThreshold[];

      ocoRepo.findOne.mockResolvedValue(mockOco);
      thresholdRepo.find.mockResolvedValue(mockThresholds);
      userRepo.findOne.mockResolvedValue(mockApprover);

      const result = await service.validateApprovalChain(mockOcoId, 'OCO');

      expect(result.isValid).toBe(false);
      expect(result.hasRoleApproval).toBe(false);
      expect(result.validationErrors).toContain(
        'Approver does not have required role: DIRECTOR'
      );
    });

    it('should fail validation when owner approval required but not received', async () => {
      const mockOco = {
        id: mockOcoId,
        projectId: mockProjectId,
        amount: 75000,
        status: 'APPROVED',
        approvedById: mockApproverId,
        approvedAt: new Date(),
      } as OwnerChangeOrder;

      const mockApprover = {
        id: mockApproverId,
        role: 'VP',
        isOwner: false,
      } as any;

      const mockThresholds = [
        {
          id: '1',
          projectId: mockProjectId,
          minAmount: 50000,
          maxAmount: null,
          requiredRole: 'VP',
          requiresOwnerApproval: true,
          sortOrder: 0,
          isActive: true,
        },
      ] as ApprovalThreshold[];

      ocoRepo.findOne.mockResolvedValue(mockOco);
      thresholdRepo.find.mockResolvedValue(mockThresholds);
      userRepo.findOne.mockResolvedValue(mockApprover);

      const result = await service.validateApprovalChain(mockOcoId, 'OCO');

      expect(result.isValid).toBe(false);
      expect(result.hasOwnerApproval).toBe(false);
      expect(result.validationErrors).toContain(
        'Owner approval is required but not received'
      );
    });

    it('should throw NotFoundException when change order not found', async () => {
      ocoRepo.findOne.mockResolvedValue(null);

      await expect(
        service.validateApprovalChain(mockOcoId, 'OCO')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRequiredApprovers', () => {
    const mockProjectId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return users with required role', async () => {
      const mockThresholds = [
        {
          id: '1',
          projectId: mockProjectId,
          minAmount: 10000,
          maxAmount: 50000,
          requiredRole: 'DIRECTOR',
          requiresOwnerApproval: false,
          sortOrder: 0,
          isActive: true,
        },
      ] as ApprovalThreshold[];

      const mockUsers = [
        { id: '1', role: 'DIRECTOR', isActive: true },
        { id: '2', role: 'DIRECTOR', isActive: true },
      ] as User[];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockUsers),
      };

      thresholdRepo.find.mockResolvedValue(mockThresholds);
      userRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getRequiredApprovers(mockProjectId, new Decimal(25000));

      expect(result).toEqual(mockUsers);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('user.role = :role', { role: 'DIRECTOR' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.isActive = :isActive', { isActive: true });
    });
  });
});
