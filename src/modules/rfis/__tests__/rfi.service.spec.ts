import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { RfiService } from '../services/rfi.service';
import { RfiNumberingService } from '../services/rfi-numbering.service';
import { Rfi, RfiStatus, RfiPriority, RfiDiscipline, BallInCourt } from '../entities/rfi.entity';
import { RfiResponse, RfiResponseType } from '../entities/rfi-response.entity';
import { RfiHistory, RfiHistoryAction } from '../entities/rfi-history.entity';
import { RfiReference } from '../entities/rfi-reference.entity';
import { Project } from '../../projects/entities/project.entity';

describe('RfiService', () => {
  let service: RfiService;
  let numberingService: RfiNumberingService;

  const mockProject = {
    id: 'project-id',
    organizationId: 'org-id',
    number: 'PROJ-001',
  };

  const mockUser = {
    id: 'user-id',
    email: 'test@example.com',
  };

  const mockRfi = {
    id: 'rfi-id',
    projectId: 'project-id',
    organizationId: 'org-id',
    number: 'PROJ-001-RFI-0001',
    sequenceNumber: 1,
    subject: 'Test RFI',
    question: 'Test question',
    status: RfiStatus.DRAFT,
    priority: RfiPriority.MEDIUM,
    discipline: RfiDiscipline.GENERAL,
    createdById: 'user-id',
    ballInCourt: BallInCourt.CREATOR,
    ballInCourtUserId: 'user-id',
    slaResponseDays: 7,
    distributionList: [],
    drawingReferences: [],
    hasCostImpact: false,
    hasScheduleImpact: false,
    isOverdue: false,
    isPrivate: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockRfi], 1]),
    select: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockRfiRepository = {
    create: jest.fn().mockReturnValue(mockRfi),
    save: jest.fn().mockResolvedValue(mockRfi),
    findOne: jest.fn().mockResolvedValue(mockRfi),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockResponseRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockHistoryRepository = {
    create: jest.fn(),
    save: jest.fn().mockResolvedValue({}),
  };

  const mockReferenceRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockProjectRepository = {
    findOne: jest.fn().mockResolvedValue(mockProject),
  };

  const mockNumberingService = {
    generateNumber: jest.fn().mockResolvedValue({
      number: 'PROJ-001-RFI-0001',
      sequenceNumber: 1,
    }),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      save: jest.fn().mockResolvedValue(mockRfi),
      getRepository: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RfiService,
        { provide: getRepositoryToken(Rfi), useValue: mockRfiRepository },
        { provide: getRepositoryToken(RfiResponse), useValue: mockResponseRepository },
        { provide: getRepositoryToken(RfiHistory), useValue: mockHistoryRepository },
        { provide: getRepositoryToken(RfiReference), useValue: mockReferenceRepository },
        { provide: getRepositoryToken(Project), useValue: mockProjectRepository },
        { provide: RfiNumberingService, useValue: mockNumberingService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<RfiService>(RfiService);
    numberingService = module.get<RfiNumberingService>(RfiNumberingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      subject: 'Test RFI',
      question: 'Test question',
      priority: RfiPriority.HIGH,
      discipline: RfiDiscipline.STRUCTURAL,
    };

    it('should create an RFI with auto-generated number', async () => {
      mockRfiRepository.findOne.mockResolvedValueOnce(mockRfi);

      const result = await service.create('project-id', 'user-id', createDto);

      expect(mockProjectRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'project-id' },
      });
      expect(mockNumberingService.generateNumber).toHaveBeenCalled();
      expect(result.number).toBe('PROJ-001-RFI-0001');
    });

    it('should create RFI in DRAFT status by default', async () => {
      mockRfiRepository.findOne.mockResolvedValueOnce(mockRfi);

      const result = await service.create('project-id', 'user-id', createDto);

      expect(mockRfiRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: RfiStatus.DRAFT,
        }),
      );
    });

    it('should create RFI in OPEN status when sendImmediately is true', async () => {
      const dtoWithSend = { ...createDto, sendImmediately: true };
      mockRfiRepository.findOne.mockResolvedValueOnce({
        ...mockRfi,
        status: RfiStatus.OPEN,
      });

      await service.create('project-id', 'user-id', dtoWithSend);

      expect(mockRfiRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: RfiStatus.OPEN,
        }),
      );
    });

    it('should set ball-in-court to assignee when assigned', async () => {
      const dtoWithAssignment = { ...createDto, assignedToId: 'assignee-id' };
      mockRfiRepository.findOne.mockResolvedValueOnce({
        ...mockRfi,
        assignedToId: 'assignee-id',
        ballInCourt: BallInCourt.ASSIGNEE,
      });

      await service.create('project-id', 'user-id', dtoWithAssignment);

      expect(mockRfiRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ballInCourt: BallInCourt.ASSIGNEE,
          ballInCourtUserId: 'assignee-id',
        }),
      );
    });

    it('should throw NotFoundException if project does not exist', async () => {
      mockProjectRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.create('invalid-project', 'user-id', createDto))
        .rejects.toThrow(NotFoundException);
    });

    it('should create history entry on creation', async () => {
      mockRfiRepository.findOne.mockResolvedValueOnce(mockRfi);

      await service.create('project-id', 'user-id', createDto);

      expect(mockHistoryRepository.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    const query = {
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'DESC' as const,
    };

    it('should return paginated RFIs', async () => {
      const result = await service.findAll('project-id', query);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should filter by status', async () => {
      await service.findAll('project-id', { ...query, status: RfiStatus.OPEN });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'rfi.status = :status',
        { status: RfiStatus.OPEN },
      );
    });

    it('should filter by priority', async () => {
      await service.findAll('project-id', { ...query, priority: RfiPriority.HIGH });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'rfi.priority = :priority',
        { priority: RfiPriority.HIGH },
      );
    });

    it('should search by subject and question', async () => {
      await service.findAll('project-id', { ...query, search: 'test' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it('should filter by assignedToId', async () => {
      await service.findAll('project-id', { ...query, assignedToId: 'user-id' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'rfi.assignedToId = :assignedToId',
        { assignedToId: 'user-id' },
      );
    });

    it('should filter by ball-in-court', async () => {
      await service.findAll('project-id', { ...query, ballInCourt: BallInCourt.CREATOR });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'rfi.ballInCourt = :ballInCourt',
        { ballInCourt: BallInCourt.CREATOR },
      );
    });
  });

  describe('findOne', () => {
    it('should return RFI with all relations', async () => {
      const result = await service.findOne('rfi-id', 'project-id');

      expect(mockRfiRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rfi-id', projectId: 'project-id' },
          relations: expect.arrayContaining(['project', 'responses', 'history']),
        }),
      );
      expect(result).toEqual(mockRfi);
    });

    it('should throw NotFoundException if RFI not found', async () => {
      mockRfiRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.findOne('invalid-id', 'project-id'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('status transitions', () => {
    it('should transition from DRAFT to OPEN', async () => {
      const draftRfi = {
        ...mockRfi,
        status: RfiStatus.DRAFT,
        assignedToId: 'assignee-id',
      };
      mockRfiRepository.findOne.mockResolvedValueOnce(draftRfi);
      mockRfiRepository.save.mockResolvedValueOnce({
        ...draftRfi,
        status: RfiStatus.OPEN,
      });
      mockRfiRepository.findOne.mockResolvedValueOnce({
        ...draftRfi,
        status: RfiStatus.OPEN,
      });

      const result = await service.open('rfi-id', 'project-id', 'user-id');

      expect(mockRfiRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: RfiStatus.OPEN,
        }),
      );
    });

    it('should not open RFI without assignedToId', async () => {
      const draftRfi = {
        ...mockRfi,
        status: RfiStatus.DRAFT,
        assignedToId: null,
      };
      mockRfiRepository.findOne.mockResolvedValueOnce(draftRfi);

      await expect(service.open('rfi-id', 'project-id', 'user-id'))
        .rejects.toThrow(BadRequestException);
    });

    it('should transition from OPEN to ANSWERED when official response added', async () => {
      const openRfi = {
        ...mockRfi,
        status: RfiStatus.OPEN,
        sentDate: new Date(),
      };
      mockRfiRepository.findOne.mockResolvedValueOnce(openRfi);

      const responseDto = {
        response: 'Official answer',
        isOfficial: true,
      };

      mockResponseRepository.create.mockReturnValue({ id: 'response-id' });
      mockResponseRepository.save.mockResolvedValue({ id: 'response-id' });
      mockResponseRepository.findOne.mockResolvedValue({ id: 'response-id' });

      await service.addResponse('rfi-id', 'project-id', 'user-id', responseDto);

      expect(mockRfiRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: RfiStatus.ANSWERED,
        }),
      );
    });

    it('should transition from ANSWERED to CLOSED', async () => {
      const answeredRfi = {
        ...mockRfi,
        status: RfiStatus.ANSWERED,
        createdById: 'user-id',
      };
      mockRfiRepository.findOne.mockResolvedValueOnce(answeredRfi);
      mockRfiRepository.save.mockResolvedValueOnce({
        ...answeredRfi,
        status: RfiStatus.CLOSED,
      });
      mockRfiRepository.findOne.mockResolvedValueOnce({
        ...answeredRfi,
        status: RfiStatus.CLOSED,
      });

      const result = await service.close('rfi-id', 'project-id', 'user-id');

      expect(mockRfiRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: RfiStatus.CLOSED,
        }),
      );
    });

    it('should not close RFI if not creator or manager', async () => {
      const answeredRfi = {
        ...mockRfi,
        status: RfiStatus.ANSWERED,
        createdById: 'other-user',
        managerId: 'manager-id',
      };
      mockRfiRepository.findOne.mockResolvedValueOnce(answeredRfi);

      await expect(service.close('rfi-id', 'project-id', 'user-id'))
        .rejects.toThrow(ForbiddenException);
    });

    it('should allow VOID from any status', async () => {
      mockRfiRepository.findOne.mockResolvedValueOnce(mockRfi);
      mockRfiRepository.save.mockResolvedValueOnce({
        ...mockRfi,
        status: RfiStatus.VOID,
      });
      mockRfiRepository.findOne.mockResolvedValueOnce({
        ...mockRfi,
        status: RfiStatus.VOID,
      });

      const result = await service.void('rfi-id', 'project-id', 'user-id', 'Test reason');

      expect(mockRfiRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: RfiStatus.VOID,
          voidReason: 'Test reason',
        }),
      );
    });
  });

  describe('ball-in-court tracking', () => {
    it('should set ball to ASSIGNEE when opened', async () => {
      const draftRfi = {
        ...mockRfi,
        status: RfiStatus.DRAFT,
        assignedToId: 'assignee-id',
      };
      mockRfiRepository.findOne.mockResolvedValueOnce(draftRfi);
      mockRfiRepository.save.mockResolvedValueOnce({
        ...draftRfi,
        status: RfiStatus.OPEN,
        ballInCourt: BallInCourt.ASSIGNEE,
      });
      mockRfiRepository.findOne.mockResolvedValueOnce({
        ...draftRfi,
        status: RfiStatus.OPEN,
        ballInCourt: BallInCourt.ASSIGNEE,
      });

      await service.open('rfi-id', 'project-id', 'user-id');

      expect(mockRfiRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ballInCourt: BallInCourt.ASSIGNEE,
        }),
      );
    });

    it('should set ball to CREATOR when answered', async () => {
      const openRfi = {
        ...mockRfi,
        status: RfiStatus.OPEN,
        sentDate: new Date(),
        createdById: 'creator-id',
      };
      mockRfiRepository.findOne.mockResolvedValueOnce(openRfi);

      const responseDto = {
        response: 'Official answer',
        isOfficial: true,
      };

      mockResponseRepository.create.mockReturnValue({ id: 'response-id' });
      mockResponseRepository.save.mockResolvedValue({ id: 'response-id' });
      mockResponseRepository.findOne.mockResolvedValue({ id: 'response-id' });

      await service.addResponse('rfi-id', 'project-id', 'user-id', responseDto);

      expect(mockRfiRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ballInCourt: BallInCourt.CREATOR,
          ballInCourtUserId: 'creator-id',
        }),
      );
    });

    it('should update ball when forwarded', async () => {
      const openRfi = {
        ...mockRfi,
        status: RfiStatus.OPEN,
      };
      mockRfiRepository.findOne.mockResolvedValueOnce(openRfi);

      const responseDto = {
        response: 'Forwarding this',
        forwardedToId: 'forwarded-user-id',
      };

      mockResponseRepository.create.mockReturnValue({ id: 'response-id' });
      mockResponseRepository.save.mockResolvedValue({ id: 'response-id' });
      mockResponseRepository.findOne.mockResolvedValue({ id: 'response-id' });

      await service.addResponse('rfi-id', 'project-id', 'user-id', responseDto);

      expect(mockRfiRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ballInCourtUserId: 'forwarded-user-id',
        }),
      );
    });
  });

  describe('update', () => {
    it('should update RFI and track changes', async () => {
      const draftRfi = {
        ...mockRfi,
        status: RfiStatus.DRAFT,
      };
      mockRfiRepository.findOne.mockResolvedValueOnce(draftRfi);
      mockRfiRepository.save.mockResolvedValueOnce({
        ...draftRfi,
        subject: 'Updated subject',
      });
      mockRfiRepository.findOne.mockResolvedValueOnce({
        ...draftRfi,
        subject: 'Updated subject',
      });

      const updateDto = { subject: 'Updated subject' };
      const result = await service.update('rfi-id', 'project-id', 'user-id', updateDto);

      expect(mockHistoryRepository.create).toHaveBeenCalled();
    });

    it('should not update closed or voided RFI', async () => {
      const closedRfi = { ...mockRfi, status: RfiStatus.CLOSED };
      mockRfiRepository.findOne.mockResolvedValueOnce(closedRfi);

      await expect(
        service.update('rfi-id', 'project-id', 'user-id', { subject: 'New' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('references', () => {
    it('should add reference and create history entry', async () => {
      mockRfiRepository.findOne.mockResolvedValueOnce(mockRfi);

      const referenceDto = {
        referenceType: 'DRAWING' as any,
        referenceId: 'drawing-id',
        referenceNumber: 'A-101',
      };

      mockReferenceRepository.create.mockReturnValue({ id: 'ref-id' });
      mockReferenceRepository.save.mockResolvedValue({ id: 'ref-id' });

      await service.addReference('rfi-id', 'project-id', 'user-id', referenceDto);

      expect(mockReferenceRepository.save).toHaveBeenCalled();
      expect(mockHistoryRepository.create).toHaveBeenCalled();
    });

    it('should remove reference', async () => {
      mockRfiRepository.findOne.mockResolvedValueOnce(mockRfi);
      mockReferenceRepository.findOne.mockResolvedValueOnce({
        id: 'ref-id',
        referenceType: 'DRAWING',
        referenceNumber: 'A-101',
      });

      await service.removeReference('rfi-id', 'ref-id', 'project-id', 'user-id');

      expect(mockReferenceRepository.remove).toHaveBeenCalled();
      expect(mockHistoryRepository.create).toHaveBeenCalled();
    });
  });

  describe('updateOverdueStatus', () => {
    it('should update overdue RFIs', async () => {
      const result = await service.updateOverdueStatus();

      expect(mockRfiRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result).toBe(1);
    });
  });
});
