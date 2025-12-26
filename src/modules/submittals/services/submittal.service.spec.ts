import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SubmittalService } from './submittal.service';
import { SubmittalNumberingService } from './submittal-numbering.service';
import { Submittal, SubmittalStatus, SubmittalType } from '../entities/submittal.entity';
import { SubmittalItem } from '../entities/submittal-item.entity';
import { SubmittalRevision } from '../entities/submittal-revision.entity';
import { SubmittalResponse, ApprovalStamp } from '../entities/submittal-response.entity';
import { SubmittalHistory, SubmittalHistoryAction } from '../entities/submittal-history.entity';
import { Project } from '../../projects/entities/project.entity';

describe('SubmittalService', () => {
  let service: SubmittalService;
  let submittalRepo: Repository<Submittal>;
  let submittalItemRepo: Repository<SubmittalItem>;
  let submittalRevisionRepo: Repository<SubmittalRevision>;
  let submittalResponseRepo: Repository<SubmittalResponse>;
  let submittalHistoryRepo: Repository<SubmittalHistory>;
  let projectRepo: Repository<Project>;
  let numberingService: SubmittalNumberingService;
  let dataSource: DataSource;
  let queryRunner: QueryRunner;

  const mockProject = {
    id: 'project-uuid',
    name: 'Test Project',
    code: 'PROJ',
  };

  const mockSubmittal = {
    id: 'submittal-uuid',
    projectId: 'project-uuid',
    organizationId: 'org-uuid',
    number: 'PROJ-SUB-0001',
    sequenceNumber: 1,
    title: 'Test Submittal',
    specSection: '03 30 00',
    specSectionTitle: 'Cast-in-Place Concrete',
    submittalType: SubmittalType.PRODUCT_DATA,
    status: SubmittalStatus.DRAFT,
    currentRevision: 0,
    responsibleContractorId: 'contractor-uuid',
    createdById: 'user-uuid',
    items: [],
    revisions: [],
    history: [],
  };

  const mockCreateDto = {
    title: 'Test Submittal',
    specSection: '03 30 00',
    specSectionTitle: 'Cast-in-Place Concrete',
    submittalType: SubmittalType.PRODUCT_DATA,
    responsibleContractorId: 'contractor-uuid',
    items: [
      {
        description: 'Test Item',
        itemNumber: 1,
        manufacturer: 'Test Manufacturer',
      },
    ],
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      save: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmittalService,
        {
          provide: getRepositoryToken(Submittal),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getMany: jest.fn(),
              getOne: jest.fn(),
            })),
          },
        },
        {
          provide: getRepositoryToken(SubmittalItem),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SubmittalRevision),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SubmittalResponse),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SubmittalHistory),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: SubmittalNumberingService,
          useValue: {
            generateNumber: jest.fn(),
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

    service = module.get<SubmittalService>(SubmittalService);
    submittalRepo = module.get<Repository<Submittal>>(getRepositoryToken(Submittal));
    submittalItemRepo = module.get<Repository<SubmittalItem>>(getRepositoryToken(SubmittalItem));
    submittalRevisionRepo = module.get<Repository<SubmittalRevision>>(getRepositoryToken(SubmittalRevision));
    submittalResponseRepo = module.get<Repository<SubmittalResponse>>(getRepositoryToken(SubmittalResponse));
    submittalHistoryRepo = module.get<Repository<SubmittalHistory>>(getRepositoryToken(SubmittalHistory));
    projectRepo = module.get<Repository<Project>>(getRepositoryToken(Project));
    numberingService = module.get<SubmittalNumberingService>(SubmittalNumberingService);
    dataSource = module.get<DataSource>(DataSource);
    queryRunner = mockQueryRunner as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new submittal with items', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(numberingService, 'generateNumber').mockResolvedValue({
        number: 'PROJ-SUB-0001',
        sequenceNumber: 1,
      } as any);
      mockQueryRunner.manager.create.mockReturnValue(mockSubmittal);
      mockQueryRunner.manager.save.mockResolvedValue(mockSubmittal);

      const result = await service.create(
        'project-uuid',
        'org-uuid',
        'user-uuid',
        mockCreateDto,
      );

      expect(projectRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'project-uuid' },
      });
      expect(numberingService.generateNumber).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if project does not exist', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.create('project-uuid', 'org-uuid', 'user-uuid', mockCreateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should rollback transaction on error', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(numberingService, 'generateNumber').mockRejectedValue(new Error('DB Error'));

      await expect(
        service.create('project-uuid', 'org-uuid', 'user-uuid', mockCreateDto),
      ).rejects.toThrow();

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all submittals for a project', async () => {
      const mockQueryBuilder = submittalRepo.createQueryBuilder();
      jest.spyOn(mockQueryBuilder, 'getMany').mockResolvedValue([mockSubmittal] as any);

      const result = await service.findAll('project-uuid', {});

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockSubmittal);
    });

    it('should filter by status', async () => {
      const mockQueryBuilder = submittalRepo.createQueryBuilder();
      jest.spyOn(mockQueryBuilder, 'getMany').mockResolvedValue([mockSubmittal] as any);

      const result = await service.findAll('project-uuid', {
        status: SubmittalStatus.DRAFT,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should filter by spec section', async () => {
      const mockQueryBuilder = submittalRepo.createQueryBuilder();
      jest.spyOn(mockQueryBuilder, 'getMany').mockResolvedValue([mockSubmittal] as any);

      const result = await service.findAll('project-uuid', {
        specSection: '03 30 00',
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should support pagination', async () => {
      const mockQueryBuilder = submittalRepo.createQueryBuilder();
      jest.spyOn(mockQueryBuilder, 'getMany').mockResolvedValue([mockSubmittal] as any);

      const result = await service.findAll('project-uuid', {
        skip: 0,
        take: 10,
      });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(result).toBeDefined();
    });
  });

  describe('findOne', () => {
    it('should return a submittal by id', async () => {
      jest.spyOn(submittalRepo, 'findOne').mockResolvedValue(mockSubmittal as any);

      const result = await service.findOne('submittal-uuid', 'project-uuid');

      expect(submittalRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'submittal-uuid', projectId: 'project-uuid' },
        relations: ['items', 'revisions', 'history'],
      });
      expect(result).toEqual(mockSubmittal);
    });

    it('should throw NotFoundException if submittal not found', async () => {
      jest.spyOn(submittalRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.findOne('submittal-uuid', 'project-uuid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a submittal in DRAFT status', async () => {
      const draftSubmittal = { ...mockSubmittal, status: SubmittalStatus.DRAFT };
      jest.spyOn(submittalRepo, 'findOne').mockResolvedValue(draftSubmittal as any);
      jest.spyOn(submittalRepo, 'save').mockResolvedValue(draftSubmittal as any);
      jest.spyOn(submittalHistoryRepo, 'create').mockReturnValue({} as any);
      jest.spyOn(submittalHistoryRepo, 'save').mockResolvedValue({} as any);

      const updateDto = { title: 'Updated Title' };
      const result = await service.update('submittal-uuid', 'project-uuid', 'user-uuid', updateDto);

      expect(submittalRepo.save).toHaveBeenCalled();
      expect(result.title).toBe('Updated Title');
    });

    it('should throw BadRequestException if status is not DRAFT or NOT_STARTED', async () => {
      const submittedSubmittal = { ...mockSubmittal, status: SubmittalStatus.SUBMITTED };
      jest.spyOn(submittalRepo, 'findOne').mockResolvedValue(submittedSubmittal as any);

      await expect(
        service.update('submittal-uuid', 'project-uuid', 'user-uuid', { title: 'New' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('submit', () => {
    it('should submit a submittal and create revision', async () => {
      const draftSubmittal = {
        ...mockSubmittal,
        status: SubmittalStatus.DRAFT,
        items: [{ id: 'item-uuid', description: 'Item 1' }],
      };
      jest.spyOn(submittalRepo, 'findOne').mockResolvedValue(draftSubmittal as any);
      jest.spyOn(submittalRepo, 'save').mockResolvedValue({
        ...draftSubmittal,
        status: SubmittalStatus.SUBMITTED,
      } as any);
      jest.spyOn(submittalRevisionRepo, 'create').mockReturnValue({} as any);
      jest.spyOn(submittalRevisionRepo, 'save').mockResolvedValue({} as any);
      jest.spyOn(submittalHistoryRepo, 'create').mockReturnValue({} as any);
      jest.spyOn(submittalHistoryRepo, 'save').mockResolvedValue({} as any);

      const submitDto = { transmittalNotes: 'Please review' };
      const result = await service.submit('submittal-uuid', 'project-uuid', 'user-uuid', submitDto);

      expect(result.status).toBe(SubmittalStatus.SUBMITTED);
      expect(submittalRevisionRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if submittal has no items', async () => {
      const emptySubmittal = { ...mockSubmittal, items: [] };
      jest.spyOn(submittalRepo, 'findOne').mockResolvedValue(emptySubmittal as any);

      await expect(
        service.submit('submittal-uuid', 'project-uuid', 'user-uuid', {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('respond', () => {
    it('should approve a submittal', async () => {
      const submittedSubmittal = { ...mockSubmittal, status: SubmittalStatus.SUBMITTED };
      jest.spyOn(submittalRepo, 'findOne').mockResolvedValue(submittedSubmittal as any);
      jest.spyOn(submittalRepo, 'save').mockResolvedValue({
        ...submittedSubmittal,
        status: SubmittalStatus.APPROVED,
      } as any);
      jest.spyOn(submittalResponseRepo, 'create').mockReturnValue({} as any);
      jest.spyOn(submittalResponseRepo, 'save').mockResolvedValue({} as any);
      jest.spyOn(submittalHistoryRepo, 'create').mockReturnValue({} as any);
      jest.spyOn(submittalHistoryRepo, 'save').mockResolvedValue({} as any);

      const respondDto = {
        stamp: ApprovalStamp.APPROVED,
        comments: 'Approved',
        isOfficial: true,
      };
      const result = await service.respond(
        'submittal-uuid',
        'project-uuid',
        'user-uuid',
        'org-uuid',
        respondDto,
      );

      expect(result.status).toBe(SubmittalStatus.APPROVED);
      expect(submittalResponseRepo.save).toHaveBeenCalled();
    });

    it('should set status to REVISE_RESUBMIT for REVISE_AND_RESUBMIT stamp', async () => {
      const submittedSubmittal = { ...mockSubmittal, status: SubmittalStatus.SUBMITTED };
      jest.spyOn(submittalRepo, 'findOne').mockResolvedValue(submittedSubmittal as any);
      jest.spyOn(submittalRepo, 'save').mockResolvedValue({
        ...submittedSubmittal,
        status: SubmittalStatus.REVISE_RESUBMIT,
      } as any);
      jest.spyOn(submittalResponseRepo, 'create').mockReturnValue({} as any);
      jest.spyOn(submittalResponseRepo, 'save').mockResolvedValue({} as any);
      jest.spyOn(submittalHistoryRepo, 'create').mockReturnValue({} as any);
      jest.spyOn(submittalHistoryRepo, 'save').mockResolvedValue({} as any);

      const respondDto = {
        stamp: ApprovalStamp.REVISE_AND_RESUBMIT,
        comments: 'Please revise',
        isOfficial: true,
      };
      const result = await service.respond(
        'submittal-uuid',
        'project-uuid',
        'user-uuid',
        'org-uuid',
        respondDto,
      );

      expect(result.status).toBe(SubmittalStatus.REVISE_RESUBMIT);
    });
  });

  describe('createRevision', () => {
    it('should create a new revision', async () => {
      const reviseSubmittal = {
        ...mockSubmittal,
        status: SubmittalStatus.REVISE_RESUBMIT,
        currentRevision: 0,
      };
      jest.spyOn(submittalRepo, 'findOne').mockResolvedValue(reviseSubmittal as any);
      jest.spyOn(submittalRepo, 'save').mockResolvedValue({
        ...reviseSubmittal,
        currentRevision: 1,
        status: SubmittalStatus.DRAFT,
      } as any);
      jest.spyOn(submittalItemRepo, 'create').mockReturnValue({} as any);
      jest.spyOn(submittalItemRepo, 'save').mockResolvedValue({} as any);
      jest.spyOn(submittalHistoryRepo, 'create').mockReturnValue({} as any);
      jest.spyOn(submittalHistoryRepo, 'save').mockResolvedValue({} as any);

      const revisionDto = {
        revisionReason: 'Updated per comments',
        items: [{ description: 'Updated Item', itemNumber: 1 }],
      };
      const result = await service.createRevision(
        'submittal-uuid',
        'project-uuid',
        'user-uuid',
        revisionDto,
      );

      expect(result.currentRevision).toBe(1);
      expect(result.status).toBe(SubmittalStatus.DRAFT);
    });

    it('should throw BadRequestException if status is not REVISE_RESUBMIT', async () => {
      const approvedSubmittal = { ...mockSubmittal, status: SubmittalStatus.APPROVED };
      jest.spyOn(submittalRepo, 'findOne').mockResolvedValue(approvedSubmittal as any);

      await expect(
        service.createRevision('submittal-uuid', 'project-uuid', 'user-uuid', {
          revisionReason: 'Test',
          items: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('close', () => {
    it('should close an approved submittal', async () => {
      const approvedSubmittal = { ...mockSubmittal, status: SubmittalStatus.APPROVED };
      jest.spyOn(submittalRepo, 'findOne').mockResolvedValue(approvedSubmittal as any);
      jest.spyOn(submittalRepo, 'save').mockResolvedValue({
        ...approvedSubmittal,
        status: SubmittalStatus.CLOSED,
      } as any);
      jest.spyOn(submittalHistoryRepo, 'create').mockReturnValue({} as any);
      jest.spyOn(submittalHistoryRepo, 'save').mockResolvedValue({} as any);

      const result = await service.close('submittal-uuid', 'project-uuid', 'user-uuid');

      expect(result.status).toBe(SubmittalStatus.CLOSED);
      expect(result.closedDate).toBeDefined();
    });

    it('should throw BadRequestException if status is not APPROVED or APPROVED_AS_NOTED', async () => {
      const draftSubmittal = { ...mockSubmittal, status: SubmittalStatus.DRAFT };
      jest.spyOn(submittalRepo, 'findOne').mockResolvedValue(draftSubmittal as any);

      await expect(
        service.close('submittal-uuid', 'project-uuid', 'user-uuid'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('void', () => {
    it('should void a submittal', async () => {
      jest.spyOn(submittalRepo, 'findOne').mockResolvedValue(mockSubmittal as any);
      jest.spyOn(submittalRepo, 'save').mockResolvedValue({
        ...mockSubmittal,
        status: SubmittalStatus.VOID,
        voidReason: 'Duplicate',
      } as any);
      jest.spyOn(submittalHistoryRepo, 'create').mockReturnValue({} as any);
      jest.spyOn(submittalHistoryRepo, 'save').mockResolvedValue({} as any);

      const result = await service.void('submittal-uuid', 'project-uuid', 'user-uuid', 'Duplicate');

      expect(result.status).toBe(SubmittalStatus.VOID);
      expect(result.voidReason).toBe('Duplicate');
    });

    it('should throw BadRequestException if submittal is already voided', async () => {
      const voidedSubmittal = { ...mockSubmittal, status: SubmittalStatus.VOID };
      jest.spyOn(submittalRepo, 'findOne').mockResolvedValue(voidedSubmittal as any);

      await expect(
        service.void('submittal-uuid', 'project-uuid', 'user-uuid', 'Reason'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getRevisions', () => {
    it('should return all revisions for a submittal', async () => {
      const mockRevisions = [
        { id: 'rev-1', revisionNumber: 0 },
        { id: 'rev-2', revisionNumber: 1 },
      ];
      jest.spyOn(submittalRepo, 'findOne').mockResolvedValue(mockSubmittal as any);
      jest.spyOn(submittalRevisionRepo, 'find').mockResolvedValue(mockRevisions as any);

      const result = await service.getRevisions('submittal-uuid', 'project-uuid');

      expect(result).toHaveLength(2);
      expect(submittalRevisionRepo.find).toHaveBeenCalled();
    });
  });

  describe('getResponses', () => {
    it('should return all responses for a submittal', async () => {
      const mockResponses = [
        { id: 'resp-1', stamp: ApprovalStamp.APPROVED },
      ];
      jest.spyOn(submittalRepo, 'findOne').mockResolvedValue(mockSubmittal as any);
      jest.spyOn(submittalResponseRepo, 'find').mockResolvedValue(mockResponses as any);

      const result = await service.getResponses('submittal-uuid', 'project-uuid');

      expect(result).toHaveLength(1);
      expect(submittalResponseRepo.find).toHaveBeenCalled();
    });
  });
});
