import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DrawingSetService } from '../drawing-set.service';
import { DrawingSet } from '../../entities/drawing-set.entity';
import { Drawing } from '../../entities/drawing.entity';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

describe('DrawingSetService', () => {
  let service: DrawingSetService;
  let drawingSetRepository: jest.Mocked<Repository<DrawingSet>>;
  let drawingRepository: jest.Mocked<Repository<Drawing>>;
  let dataSource: jest.Mocked<DataSource>;

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DrawingSetService,
        {
          provide: getRepositoryToken(DrawingSet),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Drawing),
          useValue: {
            find: jest.fn(),
            count: jest.fn(),
            update: jest.fn(),
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

    service = module.get<DrawingSetService>(DrawingSetService);
    drawingSetRepository = module.get(getRepositoryToken(DrawingSet));
    drawingRepository = module.get(getRepositoryToken(Drawing));
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a drawing set successfully', async () => {
      const projectId = 'project-1';
      const userId = 'user-1';
      const dto = {
        name: 'Construction Documents',
        setType: 'CD' as any,
        description: 'Complete CD set',
        issueDate: new Date('2024-01-15'),
        revisionLabel: 'A',
        metadata: {},
      };

      const mockSet = {
        id: 'set-1',
        ...dto,
        projectId,
        status: 'draft',
        drawingCount: 0,
        isCurrent: false,
        createdById: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as DrawingSet;

      drawingSetRepository.create.mockReturnValue(mockSet as any);
      drawingSetRepository.save.mockResolvedValue(mockSet);

      const result = await service.create(projectId, userId, dto);

      expect(result.id).toBe('set-1');
      expect(result.name).toBe('Construction Documents');
      expect(result.status).toBe('draft');
    });
  });

  describe('findOne', () => {
    it('should return a drawing set', async () => {
      const mockSet = {
        id: 'set-1',
        projectId: 'project-1',
        name: 'CD Set',
        status: 'issued',
      } as DrawingSet;

      drawingSetRepository.findOne.mockResolvedValue(mockSet);

      const result = await service.findOne('project-1', 'set-1');

      expect(result.id).toBe('set-1');
    });

    it('should throw NotFoundException when set not found', async () => {
      drawingSetRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('project-1', 'set-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('issue', () => {
    it('should issue a draft drawing set', async () => {
      const mockSet = {
        id: 'set-1',
        status: 'draft',
      } as DrawingSet;

      mockQueryRunner.manager.findOne.mockResolvedValue(mockSet);
      mockQueryRunner.manager.save.mockResolvedValue({
        ...mockSet,
        status: 'issued',
      });
      mockQueryRunner.manager.find.mockResolvedValue([]);

      const result = await service.issue('project-1', 'set-1', {
        issueDate: new Date(),
        issuePurpose: 'Construction',
      });

      expect(result.status).toBe('issued');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should reject issuing non-draft set', async () => {
      const mockSet = {
        id: 'set-1',
        status: 'issued',
      } as DrawingSet;

      mockQueryRunner.manager.findOne.mockResolvedValue(mockSet);

      await expect(
        service.issue('project-1', 'set-1', {
          issueDate: new Date(),
          issuePurpose: 'Construction',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('markAsCurrent', () => {
    it('should mark issued set as current', async () => {
      const mockSet = {
        id: 'set-1',
        status: 'issued',
        isCurrent: false,
      } as DrawingSet;

      mockQueryRunner.manager.findOne.mockResolvedValue(mockSet);
      mockQueryRunner.manager.update.mockResolvedValue(undefined);
      mockQueryRunner.manager.save.mockResolvedValue({
        ...mockSet,
        isCurrent: true,
      });

      const result = await service.markAsCurrent('project-1', 'set-1');

      expect(result.isCurrent).toBe(true);
      expect(mockQueryRunner.manager.update).toHaveBeenCalledWith(
        DrawingSet,
        { projectId: 'project-1', isCurrent: true },
        { isCurrent: false },
      );
    });

    it('should reject marking non-issued set as current', async () => {
      const mockSet = {
        id: 'set-1',
        status: 'draft',
      } as DrawingSet;

      mockQueryRunner.manager.findOne.mockResolvedValue(mockSet);

      await expect(
        service.markAsCurrent('project-1', 'set-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('supersede', () => {
    it('should supersede a drawing set', async () => {
      const oldSet = {
        id: 'set-1',
        status: 'issued',
        metadata: {},
      } as DrawingSet;

      const newSet = {
        id: 'set-2',
        status: 'issued',
      } as DrawingSet;

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(oldSet)
        .mockResolvedValueOnce(newSet);
      mockQueryRunner.manager.save.mockResolvedValue({
        ...oldSet,
        status: 'superseded',
        supersededById: 'set-2',
      });

      const result = await service.supersede('project-1', 'set-1', {
        supersededById: 'set-2',
        reason: 'New revision',
      });

      expect(result.status).toBe('superseded');
      expect(result.supersededById).toBe('set-2');
    });
  });

  describe('archive', () => {
    it('should archive a non-current set', async () => {
      const mockSet = {
        id: 'set-1',
        isCurrent: false,
        status: 'issued',
      } as DrawingSet;

      drawingSetRepository.findOne.mockResolvedValue(mockSet);
      drawingSetRepository.save.mockResolvedValue({
        ...mockSet,
        status: 'archived',
      });
      drawingSetRepository.softDelete.mockResolvedValue(undefined as any);

      await service.archive('project-1', 'set-1');

      expect(drawingSetRepository.softDelete).toHaveBeenCalledWith('set-1');
    });

    it('should reject archiving current set', async () => {
      const mockSet = {
        id: 'set-1',
        isCurrent: true,
      } as DrawingSet;

      drawingSetRepository.findOne.mockResolvedValue(mockSet);

      await expect(
        service.archive('project-1', 'set-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCurrent', () => {
    it('should return current drawing set', async () => {
      const mockSet = {
        id: 'set-1',
        isCurrent: true,
      } as DrawingSet;

      drawingSetRepository.findOne.mockResolvedValue(mockSet);

      const result = await service.getCurrent('project-1');

      expect(result?.isCurrent).toBe(true);
    });

    it('should return null when no current set', async () => {
      drawingSetRepository.findOne.mockResolvedValue(null);

      const result = await service.getCurrent('project-1');

      expect(result).toBeNull();
    });
  });
});
