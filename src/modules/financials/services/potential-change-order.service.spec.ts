import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PotentialChangeOrderService } from './potential-change-order.service';
import { PotentialChangeOrder } from '../entities/potential-change-order.entity';
import { PcoCostTier } from '../entities/pco-cost-tier.entity';
import { OwnerChangeOrder } from '../entities/owner-change-order.entity';
import { PrimeContract } from '../entities/prime-contract.entity';
import { Project } from '../../projects/entities/project.entity';
import { PcoStatus } from '../enums/pco-status.enum';
import { OcoStatus } from '../enums/oco-status.enum';
import {
  CreatePotentialChangeOrderDto,
  UpdatePotentialChangeOrderDto,
  ConvertPcoToOcoDto,
} from '../dto';

describe('PotentialChangeOrderService', () => {
  let service: PotentialChangeOrderService;
  let pcoRepo: jest.Mocked<Repository<PotentialChangeOrder>>;
  let pcoCostTierRepo: jest.Mocked<Repository<PcoCostTier>>;
  let ocoRepo: jest.Mocked<Repository<OwnerChangeOrder>>;
  let primeContractRepo: jest.Mocked<Repository<PrimeContract>>;
  let projectRepo: jest.Mocked<Repository<Project>>;

  const mockPcoRepo = {
    create: jest.fn((data) => data),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockPcoCostTierRepo = {};
  const mockOcoRepo = {
    create: jest.fn((data) => data),
    save: jest.fn(),
    findOne: jest.fn(),
  };
  const mockPrimeContractRepo = { findOne: jest.fn() };
  const mockProjectRepo = { findOne: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PotentialChangeOrderService,
        {
          provide: getRepositoryToken(PotentialChangeOrder),
          useValue: mockPcoRepo,
        },
        {
          provide: getRepositoryToken(PcoCostTier),
          useValue: mockPcoCostTierRepo,
        },
        {
          provide: getRepositoryToken(OwnerChangeOrder),
          useValue: mockOcoRepo,
        },
        {
          provide: getRepositoryToken(PrimeContract),
          useValue: mockPrimeContractRepo,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepo,
        },
      ],
    }).compile();

    service = module.get<PotentialChangeOrderService>(PotentialChangeOrderService);
    pcoRepo = module.get(getRepositoryToken(PotentialChangeOrder));
    pcoCostTierRepo = module.get(getRepositoryToken(PcoCostTier));
    ocoRepo = module.get(getRepositoryToken(OwnerChangeOrder));
    primeContractRepo = module.get(getRepositoryToken(PrimeContract));
    projectRepo = module.get(getRepositoryToken(Project));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const mockProjectId = '123e4567-e89b-12d3-a456-426614174000';
    const mockPrimeContractId = '223e4567-e89b-12d3-a456-426614174001';

    it('should create PCO successfully', async () => {
      const createDto: CreatePotentialChangeOrderDto = {
        projectId: mockProjectId,
        primeContractId: mockPrimeContractId,
        pcoNumber: 'PCO-001',
        title: 'Additional Foundation Work',
        description: 'Unforeseen soil conditions require additional foundation work',
        directCost: 10000,
        overheadPercent: 10,
        profitPercent: 10,
        contingencyPercent: 5,
        priority: 'HIGH',
      };

      const mockProject = { id: mockProjectId } as Project;
      const mockPrimeContract = { id: mockPrimeContractId } as PrimeContract;
      const mockSavedPco = {
        id: '1',
        ...createDto,
        status: PcoStatus.DRAFT,
        overheadAmount: 1000,
        profitAmount: 1000,
        contingencyAmount: 500,
        totalAmount: 12500,
      } as PotentialChangeOrder;

      projectRepo.findOne.mockResolvedValue(mockProject);
      primeContractRepo.findOne.mockResolvedValue(mockPrimeContract);
      pcoRepo.findOne.mockResolvedValue(null);
      pcoRepo.save.mockResolvedValue(mockSavedPco);

      const result = await service.create(createDto);

      expect(result.id).toBe('1');
      expect(result.status).toBe(PcoStatus.DRAFT);
      expect(result.totalAmount).toBe(12500);
      expect(pcoRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PcoStatus.DRAFT,
          overheadAmount: 1000,
          profitAmount: 1000,
          contingencyAmount: 500,
          totalAmount: 12500,
        })
      );
    });

    it('should throw NotFoundException when project not found', async () => {
      const createDto: CreatePotentialChangeOrderDto = {
        projectId: mockProjectId,
        primeContractId: mockPrimeContractId,
        pcoNumber: 'PCO-001',
        title: 'Test PCO',
      };

      projectRepo.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(createDto)).rejects.toThrow(
        `Project with ID ${mockProjectId} not found`
      );
    });

    it('should throw NotFoundException when prime contract not found', async () => {
      const createDto: CreatePotentialChangeOrderDto = {
        projectId: mockProjectId,
        primeContractId: mockPrimeContractId,
        pcoNumber: 'PCO-001',
        title: 'Test PCO',
      };

      const mockProject = { id: mockProjectId } as Project;

      projectRepo.findOne.mockResolvedValue(mockProject);
      primeContractRepo.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(createDto)).rejects.toThrow(
        `Prime contract with ID ${mockPrimeContractId} not found`
      );
    });

    it('should throw BadRequestException for duplicate PCO number', async () => {
      const createDto: CreatePotentialChangeOrderDto = {
        projectId: mockProjectId,
        primeContractId: mockPrimeContractId,
        pcoNumber: 'PCO-001',
        title: 'Test PCO',
      };

      const mockProject = { id: mockProjectId } as Project;
      const mockPrimeContract = { id: mockPrimeContractId } as PrimeContract;
      const mockExistingPco = { id: '1', pcoNumber: 'PCO-001' } as PotentialChangeOrder;

      projectRepo.findOne.mockResolvedValue(mockProject);
      primeContractRepo.findOne.mockResolvedValue(mockPrimeContract);
      pcoRepo.findOne.mockResolvedValue(mockExistingPco);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(
        'PCO number "PCO-001" already exists in this project'
      );
    });

    it('should calculate markup correctly with zero percentages', async () => {
      const createDto: CreatePotentialChangeOrderDto = {
        projectId: mockProjectId,
        primeContractId: mockPrimeContractId,
        pcoNumber: 'PCO-002',
        title: 'Test PCO',
        directCost: 5000,
      };

      const mockProject = { id: mockProjectId } as Project;
      const mockPrimeContract = { id: mockPrimeContractId } as PrimeContract;
      const mockSavedPco = {
        id: '1',
        ...createDto,
        status: PcoStatus.DRAFT,
        overheadAmount: 0,
        profitAmount: 0,
        contingencyAmount: 0,
        totalAmount: 5000,
      } as PotentialChangeOrder;

      projectRepo.findOne.mockResolvedValue(mockProject);
      primeContractRepo.findOne.mockResolvedValue(mockPrimeContract);
      pcoRepo.findOne.mockResolvedValue(null);
      pcoRepo.save.mockResolvedValue(mockSavedPco);

      const result = await service.create(createDto);

      expect(result.totalAmount).toBe(5000);
    });
  });

  describe('findAll', () => {
    it('should return all PCOs', async () => {
      const mockPcos = [
        { id: '1', pcoNumber: 'PCO-001', status: PcoStatus.DRAFT },
        { id: '2', pcoNumber: 'PCO-002', status: PcoStatus.APPROVED },
      ] as PotentialChangeOrder[];

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockPcos),
      };

      pcoRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('pco.created_at', 'DESC');
    });

    it('should filter by projectId', async () => {
      const mockProjectId = '123e4567-e89b-12d3-a456-426614174000';
      const mockPcos = [
        { id: '1', projectId: mockProjectId, pcoNumber: 'PCO-001' },
      ] as PotentialChangeOrder[];

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockPcos),
      };

      pcoRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll(mockProjectId);

      expect(result).toHaveLength(1);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'pco.project_id = :projectId',
        { projectId: mockProjectId }
      );
    });

    it('should filter by status', async () => {
      const mockPcos = [
        { id: '1', pcoNumber: 'PCO-001', status: PcoStatus.APPROVED },
      ] as PotentialChangeOrder[];

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockPcos),
      };

      pcoRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll(undefined, PcoStatus.APPROVED);

      expect(result).toHaveLength(1);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'pco.status = :status',
        { status: PcoStatus.APPROVED }
      );
    });
  });

  describe('findOne', () => {
    const mockPcoId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return PCO by id', async () => {
      const mockPco = {
        id: mockPcoId,
        pcoNumber: 'PCO-001',
        status: PcoStatus.DRAFT,
        costTiers: [],
      } as PotentialChangeOrder;

      pcoRepo.findOne.mockResolvedValue(mockPco);

      const result = await service.findOne(mockPcoId);

      expect(result.id).toBe(mockPcoId);
      expect(pcoRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockPcoId },
        relations: ['costTiers'],
      });
    });

    it('should throw NotFoundException when PCO not found', async () => {
      pcoRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(mockPcoId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(mockPcoId)).rejects.toThrow(
        `PCO with ID ${mockPcoId} not found`
      );
    });
  });

  describe('update', () => {
    const mockPcoId = '123e4567-e89b-12d3-a456-426614174000';

    it('should update PCO successfully', async () => {
      const updateDto: UpdatePotentialChangeOrderDto = {
        title: 'Updated Title',
        directCost: 15000,
        overheadPercent: 12,
      };

      const mockPco = {
        id: mockPcoId,
        pcoNumber: 'PCO-001',
        projectId: '1',
        status: PcoStatus.DRAFT,
        directCost: 10000,
        overheadPercent: 10,
        profitPercent: 10,
        contingencyPercent: 5,
      } as PotentialChangeOrder;

      const mockUpdatedPco = {
        ...mockPco,
        ...updateDto,
        overheadAmount: 1800,
        profitAmount: 1500,
        contingencyAmount: 750,
        totalAmount: 19050,
      } as PotentialChangeOrder;

      pcoRepo.findOne.mockResolvedValue(mockPco);
      pcoRepo.save.mockResolvedValue(mockUpdatedPco);

      const result = await service.update(mockPcoId, updateDto);

      expect(result.totalAmount).toBe(19050);
      expect(result.overheadAmount).toBe(1800);
    });

    it('should throw NotFoundException when PCO not found', async () => {
      const updateDto: UpdatePotentialChangeOrderDto = { title: 'Updated' };

      pcoRepo.findOne.mockResolvedValue(null);

      await expect(service.update(mockPcoId, updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when updating converted PCO', async () => {
      const updateDto: UpdatePotentialChangeOrderDto = { title: 'Updated' };
      const mockPco = {
        id: mockPcoId,
        status: PcoStatus.CONVERTED,
      } as PotentialChangeOrder;

      pcoRepo.findOne.mockResolvedValue(mockPco);

      await expect(service.update(mockPcoId, updateDto)).rejects.toThrow(BadRequestException);
      await expect(service.update(mockPcoId, updateDto)).rejects.toThrow(
        'Cannot update a converted PCO'
      );
    });

    it('should throw BadRequestException for duplicate PCO number', async () => {
      const updateDto: UpdatePotentialChangeOrderDto = { pcoNumber: 'PCO-002' };
      const mockPco = {
        id: mockPcoId,
        pcoNumber: 'PCO-001',
        projectId: '1',
        status: PcoStatus.DRAFT,
      } as PotentialChangeOrder;

      const mockExistingPco = {
        id: 'different-id',
        pcoNumber: 'PCO-002',
      } as PotentialChangeOrder;

      pcoRepo.findOne
        .mockResolvedValueOnce(mockPco)
        .mockResolvedValueOnce(mockExistingPco);

      await expect(service.update(mockPcoId, updateDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    const mockPcoId = '123e4567-e89b-12d3-a456-426614174000';

    it('should remove PCO successfully', async () => {
      const mockPco = {
        id: mockPcoId,
        status: PcoStatus.DRAFT,
      } as PotentialChangeOrder;

      pcoRepo.findOne.mockResolvedValue(mockPco);

      await service.remove(mockPcoId);

      expect(pcoRepo.remove).toHaveBeenCalledWith(mockPco);
    });

    it('should throw NotFoundException when PCO not found', async () => {
      pcoRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(mockPcoId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when deleting converted PCO', async () => {
      const mockPco = {
        id: mockPcoId,
        status: PcoStatus.CONVERTED,
      } as PotentialChangeOrder;

      pcoRepo.findOne.mockResolvedValue(mockPco);

      await expect(service.remove(mockPcoId)).rejects.toThrow(BadRequestException);
      await expect(service.remove(mockPcoId)).rejects.toThrow(
        'Cannot delete a converted PCO'
      );
    });
  });

  describe('submit', () => {
    const mockPcoId = '123e4567-e89b-12d3-a456-426614174000';
    const mockUserId = '223e4567-e89b-12d3-a456-426614174001';

    it('should submit PCO from DRAFT status', async () => {
      const mockPco = {
        id: mockPcoId,
        status: PcoStatus.DRAFT,
      } as PotentialChangeOrder;

      const mockSubmittedPco = {
        ...mockPco,
        status: PcoStatus.SUBMITTED,
        submittedAt: expect.any(Date),
        submittedById: mockUserId,
      } as PotentialChangeOrder;

      pcoRepo.findOne.mockResolvedValue(mockPco);
      pcoRepo.save.mockResolvedValue(mockSubmittedPco);

      const result = await service.submit(mockPcoId, mockUserId);

      expect(result.status).toBe(PcoStatus.SUBMITTED);
      expect(pcoRepo.save).toHaveBeenCalled();
    });

    it('should submit PCO from REJECTED status', async () => {
      const mockPco = {
        id: mockPcoId,
        status: PcoStatus.REJECTED,
      } as PotentialChangeOrder;

      pcoRepo.findOne.mockResolvedValue(mockPco);
      pcoRepo.save.mockResolvedValue({ ...mockPco, status: PcoStatus.SUBMITTED });

      const result = await service.submit(mockPcoId, mockUserId);

      expect(result.status).toBe(PcoStatus.SUBMITTED);
    });

    it('should throw BadRequestException when submitting from wrong status', async () => {
      const mockPco = {
        id: mockPcoId,
        status: PcoStatus.APPROVED,
      } as PotentialChangeOrder;

      pcoRepo.findOne.mockResolvedValue(mockPco);

      await expect(service.submit(mockPcoId, mockUserId)).rejects.toThrow(BadRequestException);
      await expect(service.submit(mockPcoId, mockUserId)).rejects.toThrow(
        'Can only submit PCOs in DRAFT or REJECTED status'
      );
    });
  });

  describe('markUnderReview', () => {
    const mockPcoId = '123e4567-e89b-12d3-a456-426614174000';
    const mockUserId = '223e4567-e89b-12d3-a456-426614174001';

    it('should mark PCO as under review', async () => {
      const mockPco = {
        id: mockPcoId,
        status: PcoStatus.SUBMITTED,
      } as PotentialChangeOrder;

      pcoRepo.findOne.mockResolvedValue(mockPco);
      pcoRepo.save.mockResolvedValue({ ...mockPco, status: PcoStatus.UNDER_REVIEW });

      const result = await service.markUnderReview(mockPcoId, mockUserId);

      expect(result.status).toBe(PcoStatus.UNDER_REVIEW);
    });

    it('should throw BadRequestException when not in SUBMITTED status', async () => {
      const mockPco = {
        id: mockPcoId,
        status: PcoStatus.DRAFT,
      } as PotentialChangeOrder;

      pcoRepo.findOne.mockResolvedValue(mockPco);

      await expect(service.markUnderReview(mockPcoId, mockUserId)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('approve', () => {
    const mockPcoId = '123e4567-e89b-12d3-a456-426614174000';
    const mockUserId = '223e4567-e89b-12d3-a456-426614174001';

    it('should approve PCO', async () => {
      const mockPco = {
        id: mockPcoId,
        status: PcoStatus.UNDER_REVIEW,
      } as PotentialChangeOrder;

      pcoRepo.findOne.mockResolvedValue(mockPco);
      pcoRepo.save.mockResolvedValue({ ...mockPco, status: PcoStatus.APPROVED });

      const result = await service.approve(mockPcoId, mockUserId);

      expect(result.status).toBe(PcoStatus.APPROVED);
    });

    it('should throw BadRequestException when not in UNDER_REVIEW status', async () => {
      const mockPco = {
        id: mockPcoId,
        status: PcoStatus.SUBMITTED,
      } as PotentialChangeOrder;

      pcoRepo.findOne.mockResolvedValue(mockPco);

      await expect(service.approve(mockPcoId, mockUserId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('reject', () => {
    const mockPcoId = '123e4567-e89b-12d3-a456-426614174000';
    const mockUserId = '223e4567-e89b-12d3-a456-426614174001';
    const reason = 'Insufficient documentation';

    it('should reject PCO from SUBMITTED status', async () => {
      const mockPco = {
        id: mockPcoId,
        status: PcoStatus.SUBMITTED,
      } as PotentialChangeOrder;

      pcoRepo.findOne.mockResolvedValue(mockPco);
      pcoRepo.save.mockResolvedValue({
        ...mockPco,
        status: PcoStatus.REJECTED,
        rejectionReason: reason,
      });

      const result = await service.reject(mockPcoId, mockUserId, reason);

      expect(result.status).toBe(PcoStatus.REJECTED);
      expect(result.rejectionReason).toBe(reason);
    });

    it('should reject PCO from UNDER_REVIEW status', async () => {
      const mockPco = {
        id: mockPcoId,
        status: PcoStatus.UNDER_REVIEW,
      } as PotentialChangeOrder;

      pcoRepo.findOne.mockResolvedValue(mockPco);
      pcoRepo.save.mockResolvedValue({ ...mockPco, status: PcoStatus.REJECTED });

      const result = await service.reject(mockPcoId, mockUserId, reason);

      expect(result.status).toBe(PcoStatus.REJECTED);
    });

    it('should throw BadRequestException when rejecting from wrong status', async () => {
      const mockPco = {
        id: mockPcoId,
        status: PcoStatus.APPROVED,
      } as PotentialChangeOrder;

      pcoRepo.findOne.mockResolvedValue(mockPco);

      await expect(service.reject(mockPcoId, mockUserId, reason)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('convertToOco', () => {
    const mockPcoId = '123e4567-e89b-12d3-a456-426614174000';
    const mockUserId = '223e4567-e89b-12d3-a456-426614174001';

    it('should convert approved PCO to OCO', async () => {
      const convertDto: ConvertPcoToOcoDto = {
        ocoNumber: 'OCO-001',
        title: 'Converted OCO',
        changeType: 'ADDITIVE',
        priority: 'HIGH',
        reason: 'Approved by owner',
      };

      const mockPco = {
        id: mockPcoId,
        projectId: '1',
        primeContractId: '2',
        status: PcoStatus.APPROVED,
        title: 'Original PCO',
        description: 'PCO Description',
        priority: 'MEDIUM',
        totalAmount: 10000,
        costTiers: [],
      } as PotentialChangeOrder;

      const mockOco = {
        id: '3',
        projectId: mockPco.projectId,
        primeContractId: mockPco.primeContractId,
        pcoId: mockPcoId,
        ocoNumber: convertDto.ocoNumber,
        status: OcoStatus.DRAFT,
        amount: 10000,
      } as OwnerChangeOrder;

      pcoRepo.findOne.mockResolvedValue(mockPco);
      ocoRepo.findOne.mockResolvedValue(null);
      ocoRepo.save.mockResolvedValue(mockOco);
      pcoRepo.save.mockResolvedValue({
        ...mockPco,
        status: PcoStatus.CONVERTED,
        convertedToOcoId: mockOco.id,
      });

      const result = await service.convertToOco(mockPcoId, convertDto, mockUserId);

      expect(result.id).toBe('3');
      expect(result.status).toBe(OcoStatus.DRAFT);
      expect(ocoRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          pcoId: mockPcoId,
          ocoNumber: convertDto.ocoNumber,
          amount: mockPco.totalAmount,
        })
      );
    });

    it('should throw NotFoundException when PCO not found', async () => {
      const convertDto: ConvertPcoToOcoDto = {
        ocoNumber: 'OCO-001',
        changeType: 'ADDITIVE',
      };

      pcoRepo.findOne.mockResolvedValue(null);

      await expect(service.convertToOco(mockPcoId, convertDto, mockUserId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException when converting unapproved PCO', async () => {
      const convertDto: ConvertPcoToOcoDto = {
        ocoNumber: 'OCO-001',
        changeType: 'ADDITIVE',
      };

      const mockPco = {
        id: mockPcoId,
        status: PcoStatus.UNDER_REVIEW,
      } as PotentialChangeOrder;

      pcoRepo.findOne.mockResolvedValue(mockPco);

      await expect(service.convertToOco(mockPcoId, convertDto, mockUserId)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.convertToOco(mockPcoId, convertDto, mockUserId)).rejects.toThrow(
        'Can only convert APPROVED PCOs'
      );
    });

    it('should throw BadRequestException for duplicate OCO number', async () => {
      const convertDto: ConvertPcoToOcoDto = {
        ocoNumber: 'OCO-001',
        changeType: 'ADDITIVE',
      };

      const mockPco = {
        id: mockPcoId,
        projectId: '1',
        status: PcoStatus.APPROVED,
      } as PotentialChangeOrder;

      const mockExistingOco = {
        id: '2',
        ocoNumber: 'OCO-001',
      } as OwnerChangeOrder;

      pcoRepo.findOne.mockResolvedValue(mockPco);
      ocoRepo.findOne.mockResolvedValue(mockExistingOco);

      await expect(service.convertToOco(mockPcoId, convertDto, mockUserId)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('recalculateTotals', () => {
    const mockPcoId = '123e4567-e89b-12d3-a456-426614174000';

    it('should recalculate totals from cost tiers', async () => {
      const mockPco = {
        id: mockPcoId,
        overheadPercent: 10,
        profitPercent: 10,
        contingencyPercent: 5,
        costTiers: [
          { id: '1', directCost: 5000 },
          { id: '2', directCost: 3000 },
        ],
      } as PotentialChangeOrder;

      pcoRepo.findOne.mockResolvedValue(mockPco);
      pcoRepo.save.mockResolvedValue({
        ...mockPco,
        directCost: 8000,
        overheadAmount: 800,
        profitAmount: 800,
        contingencyAmount: 400,
        totalAmount: 10000,
      });

      const result = await service.recalculateTotals(mockPcoId);

      expect(result.directCost).toBe(8000);
      expect(result.totalAmount).toBe(10000);
    });

    it('should handle PCO with no cost tiers', async () => {
      const mockPco = {
        id: mockPcoId,
        overheadPercent: 10,
        profitPercent: 10,
        contingencyPercent: 5,
        costTiers: [],
      } as PotentialChangeOrder;

      pcoRepo.findOne.mockResolvedValue(mockPco);
      pcoRepo.save.mockResolvedValue({
        ...mockPco,
        directCost: 0,
        totalAmount: 0,
      });

      const result = await service.recalculateTotals(mockPcoId);

      expect(result.directCost).toBe(0);
      expect(result.totalAmount).toBe(0);
    });
  });
});
