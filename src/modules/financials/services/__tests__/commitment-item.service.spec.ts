import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CommitmentItemService } from '../commitment-item.service';
import { CommitmentItem } from '../../entities/commitment-item.entity';
import { Commitment } from '../../entities/commitment.entity';
import { CostCode } from '../../entities/cost-code.entity';
import { CommitmentStatus } from '../../enums/commitment-status.enum';
import { CommitmentType } from '../../enums/commitment-type.enum';
import { CreateCommitmentItemDto, UpdateCommitmentItemDto } from '../../dto';

describe('CommitmentItemService', () => {
  let service: CommitmentItemService;
  let commitmentItemRepo: Repository<CommitmentItem>;
  let commitmentRepo: Repository<Commitment>;
  let costCodeRepo: Repository<CostCode>;

  const mockCommitment = {
    id: 'commitment-1',
    projectId: 'project-1',
    number: 'SC-001',
    title: 'HVAC Installation',
    type: CommitmentType.SUBCONTRACT,
    status: CommitmentStatus.DRAFT,
    vendorName: 'ACME HVAC',
    originalAmount: 100000,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Commitment;

  const mockCostCode = {
    id: 'cost-code-1',
    projectId: 'project-1',
    code: '03-30-00',
    description: 'Cast-in-Place Concrete',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as CostCode;

  const mockCommitmentItem = {
    id: 'item-1',
    commitmentId: 'commitment-1',
    costCodeId: 'cost-code-1',
    description: 'Concrete Foundation',
    amount: 25000,
    lineNumber: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as CommitmentItem;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommitmentItemService,
        {
          provide: getRepositoryToken(CommitmentItem),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getOne: jest.fn(),
            })),
          },
        },
        {
          provide: getRepositoryToken(Commitment),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CostCode),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CommitmentItemService>(CommitmentItemService);
    commitmentItemRepo = module.get<Repository<CommitmentItem>>(
      getRepositoryToken(CommitmentItem),
    );
    commitmentRepo = module.get<Repository<Commitment>>(
      getRepositoryToken(Commitment),
    );
    costCodeRepo = module.get<Repository<CostCode>>(
      getRepositoryToken(CostCode),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateCommitmentItemDto = {
      commitmentId: 'commitment-1',
      costCodeId: 'cost-code-1',
      description: 'Concrete Foundation',
      amount: 25000,
    };

    it('should create a commitment item successfully', async () => {
      jest.spyOn(commitmentRepo, 'findOne').mockResolvedValue(mockCommitment);
      jest.spyOn(costCodeRepo, 'findOne').mockResolvedValue(mockCostCode);
      jest
        .spyOn(commitmentItemRepo, 'create')
        .mockReturnValue(mockCommitmentItem as any);
      jest
        .spyOn(commitmentItemRepo, 'save')
        .mockResolvedValue(mockCommitmentItem as any);

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(commitmentRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'commitment-1' },
      });
      expect(costCodeRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'cost-code-1' },
      });
      expect(commitmentItemRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if commitment does not exist', async () => {
      jest.spyOn(commitmentRepo, 'findOne').mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if cost code does not exist', async () => {
      jest.spyOn(commitmentRepo, 'findOne').mockResolvedValue(mockCommitment);
      jest.spyOn(costCodeRepo, 'findOne').mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if commitment is CLOSED', async () => {
      const closedCommitment = {
        ...mockCommitment,
        status: CommitmentStatus.CLOSED,
      };

      jest
        .spyOn(commitmentRepo, 'findOne')
        .mockResolvedValue(closedCommitment as any);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if commitment is VOID', async () => {
      const voidCommitment = {
        ...mockCommitment,
        status: CommitmentStatus.VOID,
      };

      jest
        .spyOn(commitmentRepo, 'findOne')
        .mockResolvedValue(voidCommitment as any);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all line items for a commitment', async () => {
      const items = [mockCommitmentItem, { ...mockCommitmentItem, id: 'item-2' }];

      jest.spyOn(commitmentItemRepo, 'find').mockResolvedValue(items as any);

      const result = await service.findAll('commitment-1');

      expect(result).toHaveLength(2);
      expect(commitmentItemRepo.find).toHaveBeenCalledWith({
        where: { commitmentId: 'commitment-1' },
        relations: ['costCode'],
      });
    });

    it('should return empty array if no items exist', async () => {
      jest.spyOn(commitmentItemRepo, 'find').mockResolvedValue([]);

      const result = await service.findAll('commitment-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('should return a commitment item by ID', async () => {
      jest
        .spyOn(commitmentItemRepo, 'findOne')
        .mockResolvedValue(mockCommitmentItem as any);

      const result = await service.findOne('item-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('item-1');
      expect(commitmentItemRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        relations: ['costCode'],
      });
    });

    it('should throw NotFoundException if item does not exist', async () => {
      jest.spyOn(commitmentItemRepo, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('item-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateCommitmentItemDto = {
      description: 'Updated Concrete Foundation',
      amount: 30000,
    };

    it('should update a commitment item successfully', async () => {
      const updatedItem = { ...mockCommitmentItem, ...updateDto };

      jest
        .spyOn(commitmentItemRepo, 'findOne')
        .mockResolvedValue(mockCommitmentItem as any);
      jest.spyOn(commitmentRepo, 'findOne').mockResolvedValue(mockCommitment);
      jest
        .spyOn(commitmentItemRepo, 'save')
        .mockResolvedValue(updatedItem as any);

      const result = await service.update('item-1', updateDto);

      expect(result.description).toBe('Updated Concrete Foundation');
      expect(result.amount).toBe(30000);
      expect(commitmentItemRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if item does not exist', async () => {
      jest.spyOn(commitmentItemRepo, 'findOne').mockResolvedValue(null);

      await expect(service.update('item-1', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if commitment is CLOSED', async () => {
      const closedCommitment = {
        ...mockCommitment,
        status: CommitmentStatus.CLOSED,
      };

      jest
        .spyOn(commitmentItemRepo, 'findOne')
        .mockResolvedValue(mockCommitmentItem as any);
      jest
        .spyOn(commitmentRepo, 'findOne')
        .mockResolvedValue(closedCommitment as any);

      await expect(service.update('item-1', updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if commitment is VOID', async () => {
      const voidCommitment = {
        ...mockCommitment,
        status: CommitmentStatus.VOID,
      };

      jest
        .spyOn(commitmentItemRepo, 'findOne')
        .mockResolvedValue(mockCommitmentItem as any);
      jest
        .spyOn(commitmentRepo, 'findOne')
        .mockResolvedValue(voidCommitment as any);

      await expect(service.update('item-1', updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a commitment item successfully', async () => {
      jest
        .spyOn(commitmentItemRepo, 'findOne')
        .mockResolvedValue(mockCommitmentItem as any);
      jest.spyOn(commitmentRepo, 'findOne').mockResolvedValue(mockCommitment);
      jest.spyOn(commitmentItemRepo, 'remove').mockResolvedValue(undefined);

      await service.remove('item-1');

      expect(commitmentItemRepo.remove).toHaveBeenCalledWith(
        mockCommitmentItem,
      );
    });

    it('should throw NotFoundException if item does not exist', async () => {
      jest.spyOn(commitmentItemRepo, 'findOne').mockResolvedValue(null);

      await expect(service.remove('item-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if commitment is CLOSED', async () => {
      const closedCommitment = {
        ...mockCommitment,
        status: CommitmentStatus.CLOSED,
      };

      jest
        .spyOn(commitmentItemRepo, 'findOne')
        .mockResolvedValue(mockCommitmentItem as any);
      jest
        .spyOn(commitmentRepo, 'findOne')
        .mockResolvedValue(closedCommitment as any);

      await expect(service.remove('item-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if commitment is VOID', async () => {
      const voidCommitment = {
        ...mockCommitment,
        status: CommitmentStatus.VOID,
      };

      jest
        .spyOn(commitmentItemRepo, 'findOne')
        .mockResolvedValue(mockCommitmentItem as any);
      jest
        .spyOn(commitmentRepo, 'findOne')
        .mockResolvedValue(voidCommitment as any);

      await expect(service.remove('item-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
