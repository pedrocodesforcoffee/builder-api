import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CommitmentService } from '../commitment.service';
import { Commitment } from '../../entities/commitment.entity';
import { CommitmentItem } from '../../entities/commitment-item.entity';
import { Project } from '../../../projects/entities/project.entity';
import { CommitmentStatus } from '../../enums/commitment-status.enum';
import { CommitmentType } from '../../enums/commitment-type.enum';
import { CreateCommitmentDto, UpdateCommitmentDto } from '../../dto';

describe('CommitmentService', () => {
  let service: CommitmentService;
  let commitmentRepo: Repository<Commitment>;
  let commitmentItemRepo: Repository<CommitmentItem>;
  let projectRepo: Repository<Project>;

  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
  } as Project;

  const mockCommitment = {
    id: 'commitment-1',
    projectId: 'project-1',
    number: 'SC-001',
    title: 'HVAC Installation',
    type: CommitmentType.SUBCONTRACT,
    status: CommitmentStatus.DRAFT,
    vendorName: 'ACME HVAC',
    originalAmount: 100000,
    retentionPercent: 10,
    approvedById: null,
    approvedAt: null,
    rejectedById: null,
    rejectedAt: null,
    rejectionReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Commitment;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommitmentService,
        {
          provide: getRepositoryToken(Commitment),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            remove: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CommitmentItem),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CommitmentService>(CommitmentService);
    commitmentRepo = module.get<Repository<Commitment>>(
      getRepositoryToken(Commitment),
    );
    commitmentItemRepo = module.get<Repository<CommitmentItem>>(
      getRepositoryToken(CommitmentItem),
    );
    projectRepo = module.get<Repository<Project>>(getRepositoryToken(Project));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateCommitmentDto = {
      projectId: 'project-1',
      number: 'SC-001',
      title: 'HVAC Installation',
      type: CommitmentType.SUBCONTRACT,
      vendorName: 'ACME HVAC',
      originalAmount: 100000,
      retentionPercent: 10,
    };

    it('should create a commitment with DRAFT status', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(commitmentRepo, 'count').mockResolvedValue(0);
      jest
        .spyOn(commitmentRepo, 'save')
        .mockResolvedValue(mockCommitment as any);

      const result = await service.create(createDto, 'user-1');

      expect(result.status).toBe(CommitmentStatus.DRAFT);
      expect(projectRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'project-1' },
      });
    });

    it('should throw NotFoundException if project does not exist', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(null);

      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if commitment number already exists', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(commitmentRepo, 'count').mockResolvedValue(1);

      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('submit', () => {
    it('should change status from DRAFT to PENDING_APPROVAL', async () => {
      const draftCommitment = {
        ...mockCommitment,
        status: CommitmentStatus.DRAFT,
      };

      jest
        .spyOn(commitmentRepo, 'findOne')
        .mockResolvedValue(draftCommitment as any);
      jest.spyOn(commitmentRepo, 'save').mockImplementation(async (commitment) => {
        return { ...commitment, status: CommitmentStatus.PENDING_APPROVAL } as any;
      });

      const result = await service.submit('commitment-1', 'user-1');

      expect(result.status).toBe(CommitmentStatus.PENDING_APPROVAL);
      expect(commitmentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: CommitmentStatus.PENDING_APPROVAL,
        }),
      );
    });

    it('should throw NotFoundException if commitment does not exist', async () => {
      jest.spyOn(commitmentRepo, 'findOne').mockResolvedValue(null);

      await expect(service.submit('commitment-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if status is not DRAFT', async () => {
      const activeCommitment = {
        ...mockCommitment,
        status: CommitmentStatus.ACTIVE,
      };

      jest
        .spyOn(commitmentRepo, 'findOne')
        .mockResolvedValue(activeCommitment as any);

      await expect(service.submit('commitment-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('approve', () => {
    it('should change status from PENDING_APPROVAL to APPROVED', async () => {
      const pendingCommitment = {
        ...mockCommitment,
        status: CommitmentStatus.PENDING_APPROVAL,
      };

      jest
        .spyOn(commitmentRepo, 'findOne')
        .mockResolvedValue(pendingCommitment as any);
      jest.spyOn(commitmentRepo, 'save').mockImplementation(async (commitment) => {
        return {
          ...commitment,
          status: CommitmentStatus.APPROVED,
          approvedById: 'user-1',
          approvedAt: new Date(),
        } as any;
      });

      const result = await service.approve('commitment-1', 'user-1');

      expect(result.status).toBe(CommitmentStatus.APPROVED);
      expect(commitmentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: CommitmentStatus.APPROVED,
          approvedById: 'user-1',
        }),
      );
    });

    it('should throw NotFoundException if commitment does not exist', async () => {
      jest.spyOn(commitmentRepo, 'findOne').mockResolvedValue(null);

      await expect(service.approve('commitment-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if status is not PENDING_APPROVAL', async () => {
      const draftCommitment = {
        ...mockCommitment,
        status: CommitmentStatus.DRAFT,
      };

      jest
        .spyOn(commitmentRepo, 'findOne')
        .mockResolvedValue(draftCommitment as any);

      await expect(service.approve('commitment-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should clear rejection fields when approving', async () => {
      const pendingCommitment = {
        ...mockCommitment,
        status: CommitmentStatus.PENDING_APPROVAL,
        rejectedById: 'previous-user',
        rejectedAt: new Date(),
        rejectionReason: 'Previously rejected',
      };

      jest
        .spyOn(commitmentRepo, 'findOne')
        .mockResolvedValue(pendingCommitment as any);
      jest.spyOn(commitmentRepo, 'save').mockImplementation(async (commitment) => {
        return commitment as any;
      });

      await service.approve('commitment-1', 'user-1');

      expect(commitmentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          rejectedById: null,
          rejectedAt: null,
          rejectionReason: null,
        }),
      );
    });
  });

  describe('reject', () => {
    it('should change status from PENDING_APPROVAL to DRAFT', async () => {
      const pendingCommitment = {
        ...mockCommitment,
        status: CommitmentStatus.PENDING_APPROVAL,
      };

      jest
        .spyOn(commitmentRepo, 'findOne')
        .mockResolvedValue(pendingCommitment as any);
      jest.spyOn(commitmentRepo, 'save').mockImplementation(async (commitment) => {
        return {
          ...commitment,
          status: CommitmentStatus.DRAFT,
        } as any;
      });

      const result = await service.reject(
        'commitment-1',
        'user-1',
        'Budget needs revision',
      );

      expect(result.status).toBe(CommitmentStatus.DRAFT);
      expect(commitmentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: CommitmentStatus.DRAFT,
          rejectedById: 'user-1',
          rejectionReason: 'Budget needs revision',
        }),
      );
    });

    it('should require rejection reason', async () => {
      const pendingCommitment = {
        ...mockCommitment,
        status: CommitmentStatus.PENDING_APPROVAL,
      };

      jest
        .spyOn(commitmentRepo, 'findOne')
        .mockResolvedValue(pendingCommitment as any);

      await expect(
        service.reject('commitment-1', 'user-1', ''),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if commitment does not exist', async () => {
      jest.spyOn(commitmentRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.reject('commitment-1', 'user-1', 'Reason'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if status is not PENDING_APPROVAL', async () => {
      const activeCommitment = {
        ...mockCommitment,
        status: CommitmentStatus.ACTIVE,
      };

      jest
        .spyOn(commitmentRepo, 'findOne')
        .mockResolvedValue(activeCommitment as any);

      await expect(
        service.reject('commitment-1', 'user-1', 'Reason'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should clear approval fields when rejecting', async () => {
      const pendingCommitment = {
        ...mockCommitment,
        status: CommitmentStatus.PENDING_APPROVAL,
        approvedById: 'previous-user',
        approvedAt: new Date(),
      };

      jest
        .spyOn(commitmentRepo, 'findOne')
        .mockResolvedValue(pendingCommitment as any);
      jest.spyOn(commitmentRepo, 'save').mockImplementation(async (commitment) => {
        return commitment as any;
      });

      await service.reject('commitment-1', 'user-1', 'Reason');

      expect(commitmentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          approvedById: null,
          approvedAt: null,
        }),
      );
    });
  });

  describe('activate', () => {
    it('should change status from APPROVED to ACTIVE', async () => {
      const approvedCommitment = {
        ...mockCommitment,
        status: CommitmentStatus.APPROVED,
      };

      jest
        .spyOn(commitmentRepo, 'findOne')
        .mockResolvedValue(approvedCommitment as any);
      jest.spyOn(commitmentRepo, 'save').mockImplementation(async (commitment) => {
        return {
          ...commitment,
          status: CommitmentStatus.ACTIVE,
        } as any;
      });

      const result = await service.activate('commitment-1', 'user-1');

      expect(result.status).toBe(CommitmentStatus.ACTIVE);
    });

    it('should throw NotFoundException if commitment does not exist', async () => {
      jest.spyOn(commitmentRepo, 'findOne').mockResolvedValue(null);

      await expect(service.activate('commitment-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if status is not APPROVED', async () => {
      const draftCommitment = {
        ...mockCommitment,
        status: CommitmentStatus.DRAFT,
      };

      jest
        .spyOn(commitmentRepo, 'findOne')
        .mockResolvedValue(draftCommitment as any);

      await expect(service.activate('commitment-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('complete', () => {
    it('should change status from ACTIVE to COMPLETE', async () => {
      const activeCommitment = {
        ...mockCommitment,
        status: CommitmentStatus.ACTIVE,
      };

      jest
        .spyOn(commitmentRepo, 'findOne')
        .mockResolvedValue(activeCommitment as any);
      jest.spyOn(commitmentRepo, 'save').mockImplementation(async (commitment) => {
        return {
          ...commitment,
          status: CommitmentStatus.COMPLETE,
        } as any;
      });

      const result = await service.complete('commitment-1', 'user-1');

      expect(result.status).toBe(CommitmentStatus.COMPLETE);
    });

    it('should throw NotFoundException if commitment does not exist', async () => {
      jest.spyOn(commitmentRepo, 'findOne').mockResolvedValue(null);

      await expect(service.complete('commitment-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if status is not ACTIVE', async () => {
      const approvedCommitment = {
        ...mockCommitment,
        status: CommitmentStatus.APPROVED,
      };

      jest
        .spyOn(commitmentRepo, 'findOne')
        .mockResolvedValue(approvedCommitment as any);

      await expect(service.complete('commitment-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('close', () => {
    it('should change status from COMPLETE to CLOSED', async () => {
      const completeCommitment = {
        ...mockCommitment,
        status: CommitmentStatus.COMPLETE,
      };

      jest
        .spyOn(commitmentRepo, 'findOne')
        .mockResolvedValue(completeCommitment as any);
      jest.spyOn(commitmentRepo, 'save').mockImplementation(async (commitment) => {
        return {
          ...commitment,
          status: CommitmentStatus.CLOSED,
        } as any;
      });

      const result = await service.close('commitment-1', 'user-1');

      expect(result.status).toBe(CommitmentStatus.CLOSED);
    });

    it('should throw NotFoundException if commitment does not exist', async () => {
      jest.spyOn(commitmentRepo, 'findOne').mockResolvedValue(null);

      await expect(service.close('commitment-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if status is not COMPLETE', async () => {
      const activeCommitment = {
        ...mockCommitment,
        status: CommitmentStatus.ACTIVE,
      };

      jest
        .spyOn(commitmentRepo, 'findOne')
        .mockResolvedValue(activeCommitment as any);

      await expect(service.close('commitment-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('void', () => {
    it('should void commitment from PENDING_APPROVAL status', async () => {
      const pendingCommitment = {
        ...mockCommitment,
        status: CommitmentStatus.PENDING_APPROVAL,
      };

      jest
        .spyOn(commitmentRepo, 'findOne')
        .mockResolvedValue(pendingCommitment as any);
      jest.spyOn(commitmentRepo, 'save').mockImplementation(async (commitment) => {
        return {
          ...commitment,
          status: CommitmentStatus.VOID,
        } as any;
      });

      const result = await service.void(
        'commitment-1',
        'user-1',
        'No longer needed',
      );

      expect(result.status).toBe(CommitmentStatus.VOID);
      expect(commitmentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: CommitmentStatus.VOID,
          rejectionReason: 'No longer needed',
        }),
      );
    });

    it('should void commitment from APPROVED status', async () => {
      const approvedCommitment = {
        ...mockCommitment,
        status: CommitmentStatus.APPROVED,
      };

      jest
        .spyOn(commitmentRepo, 'findOne')
        .mockResolvedValue(approvedCommitment as any);
      jest.spyOn(commitmentRepo, 'save').mockImplementation(async (commitment) => {
        return {
          ...commitment,
          status: CommitmentStatus.VOID,
        } as any;
      });

      const result = await service.void(
        'commitment-1',
        'user-1',
        'Project cancelled',
      );

      expect(result.status).toBe(CommitmentStatus.VOID);
    });

    it('should require void reason', async () => {
      const approvedCommitment = {
        ...mockCommitment,
        status: CommitmentStatus.APPROVED,
      };

      jest
        .spyOn(commitmentRepo, 'findOne')
        .mockResolvedValue(approvedCommitment as any);

      await expect(
        service.void('commitment-1', 'user-1', ''),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if commitment does not exist', async () => {
      jest.spyOn(commitmentRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.void('commitment-1', 'user-1', 'Reason'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if commitment is CLOSED', async () => {
      const closedCommitment = {
        ...mockCommitment,
        status: CommitmentStatus.CLOSED,
      };

      jest
        .spyOn(commitmentRepo, 'findOne')
        .mockResolvedValue(closedCommitment as any);

      await expect(
        service.void('commitment-1', 'user-1', 'Reason'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if commitment is already VOID', async () => {
      const voidCommitment = {
        ...mockCommitment,
        status: CommitmentStatus.VOID,
      };

      jest
        .spyOn(commitmentRepo, 'findOne')
        .mockResolvedValue(voidCommitment as any);

      await expect(
        service.void('commitment-1', 'user-1', 'Reason'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('workflow integration', () => {
    it('should support full workflow: draft → submit → approve → activate → complete → close', async () => {
      let currentStatus = CommitmentStatus.DRAFT;
      const commitment = { ...mockCommitment };

      jest.spyOn(commitmentRepo, 'findOne').mockImplementation(async () => {
        return { ...commitment, status: currentStatus } as any;
      });

      jest.spyOn(commitmentRepo, 'save').mockImplementation(async (c: any) => {
        currentStatus = c.status;
        return { ...c, status: currentStatus } as any;
      });

      const submitted = await service.submit('commitment-1', 'user-1');
      expect(submitted.status).toBe(CommitmentStatus.PENDING_APPROVAL);

      const approved = await service.approve('commitment-1', 'user-1');
      expect(approved.status).toBe(CommitmentStatus.APPROVED);

      const activated = await service.activate('commitment-1', 'user-1');
      expect(activated.status).toBe(CommitmentStatus.ACTIVE);

      const completed = await service.complete('commitment-1', 'user-1');
      expect(completed.status).toBe(CommitmentStatus.COMPLETE);

      const closed = await service.close('commitment-1', 'user-1');
      expect(closed.status).toBe(CommitmentStatus.CLOSED);
    });

    it('should support rejection and resubmission flow', async () => {
      let currentStatus = CommitmentStatus.PENDING_APPROVAL;
      const commitment = { ...mockCommitment };

      jest.spyOn(commitmentRepo, 'findOne').mockImplementation(async () => {
        return { ...commitment, status: currentStatus } as any;
      });

      jest.spyOn(commitmentRepo, 'save').mockImplementation(async (c: any) => {
        currentStatus = c.status;
        return { ...c, status: currentStatus } as any;
      });

      const rejected = await service.reject(
        'commitment-1',
        'user-1',
        'Needs revision',
      );
      expect(rejected.status).toBe(CommitmentStatus.DRAFT);

      const resubmitted = await service.submit('commitment-1', 'user-1');
      expect(resubmitted.status).toBe(CommitmentStatus.PENDING_APPROVAL);
    });
  });
});
