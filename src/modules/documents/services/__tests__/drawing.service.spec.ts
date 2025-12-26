import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DrawingService } from '../drawing.service';
import { Drawing } from '../../entities/drawing.entity';
import { DrawingRevision } from '../../entities/drawing-revision.entity';
import { DrawingCrossReference } from '../../entities/drawing-cross-reference.entity';
import { DrawingSet } from '../../entities/drawing-set.entity';
import { Document } from '../../entities/document.entity';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DrawingSetService } from '../drawing-set.service';

describe('DrawingService', () => {
  let service: DrawingService;
  let drawingRepository: jest.Mocked<Repository<Drawing>>;
  let revisionRepository: jest.Mocked<Repository<DrawingRevision>>;
  let crossReferenceRepository: jest.Mocked<Repository<DrawingCrossReference>>;
  let drawingSetRepository: jest.Mocked<Repository<DrawingSet>>;
  let documentRepository: jest.Mocked<Repository<Document>>;
  let drawingSetService: jest.Mocked<DrawingSetService>;
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
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DrawingService,
        {
          provide: getRepositoryToken(Drawing),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              innerJoin: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getMany: jest.fn(),
            })),
          },
        },
        {
          provide: getRepositoryToken(DrawingRevision),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DrawingCrossReference),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DrawingSet),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Document),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: DrawingSetService,
          useValue: {
            updateDrawingCount: jest.fn(),
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

    service = module.get<DrawingService>(DrawingService);
    drawingRepository = module.get(getRepositoryToken(Drawing));
    revisionRepository = module.get(getRepositoryToken(DrawingRevision));
    crossReferenceRepository = module.get(
      getRepositoryToken(DrawingCrossReference),
    );
    drawingSetRepository = module.get(getRepositoryToken(DrawingSet));
    documentRepository = module.get(getRepositoryToken(Document));
    drawingSetService = module.get(DrawingSetService);
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a drawing successfully', async () => {
      const projectId = 'project-1';
      const userId = 'user-1';
      const dto = {
        documentId: 'doc-1',
        number: 'A-101',
        title: 'First Floor Plan',
        discipline: 'architectural' as any,
        drawingType: 'plan' as any,
        sheetSize: 'ARCH_D',
        pageNumber: 1,
      };

      const mockDocument = {
        id: 'doc-1',
        projectId,
      } as Document;

      const mockDrawing = {
        id: 'drawing-1',
        ...dto,
        revisionHistory: [],
        referencedDrawings: [],
        referencedBy: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Drawing;

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockDocument) // Document check
        .mockResolvedValueOnce(null); // No existing drawing

      mockQueryRunner.manager.create.mockReturnValue(mockDrawing);
      mockQueryRunner.manager.save.mockResolvedValue(mockDrawing);

      const result = await service.create(projectId, userId, dto);

      expect(result.id).toBe('drawing-1');
      expect(result.number).toBe('A-101');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when document not found', async () => {
      const dto = {
        documentId: 'doc-1',
        number: 'A-101',
        title: 'Test',
        discipline: 'architectural' as any,
        drawingType: 'plan' as any,
        sheetSize: 'ARCH_D',
        pageNumber: 1,
      };

      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      await expect(
        service.create('project-1', 'user-1', dto),
      ).rejects.toThrow(NotFoundException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw ConflictException when drawing number exists', async () => {
      const projectId = 'project-1';
      const dto = {
        documentId: 'doc-1',
        number: 'A-101',
        title: 'Test',
        discipline: 'architectural' as any,
        drawingType: 'plan' as any,
        sheetSize: 'ARCH_D',
        pageNumber: 1,
      };

      const mockDocument = {
        id: 'doc-1',
        projectId,
      } as Document;

      const existingDrawing = {
        id: 'existing-1',
        number: 'A-101',
        document: { projectId },
      } as Drawing;

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockDocument)
        .mockResolvedValueOnce(existingDrawing);

      await expect(
        service.create(projectId, 'user-1', dto),
      ).rejects.toThrow(ConflictException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should update drawing set count when drawingSetId provided', async () => {
      const projectId = 'project-1';
      const userId = 'user-1';
      const dto = {
        documentId: 'doc-1',
        drawingSetId: 'set-1',
        number: 'A-101',
        title: 'First Floor Plan',
        discipline: 'architectural' as any,
        drawingType: 'plan' as any,
        sheetSize: 'ARCH_D',
        pageNumber: 1,
      };

      const mockDocument = { id: 'doc-1', projectId } as Document;
      const mockDrawingSet = { id: 'set-1', projectId } as DrawingSet;
      const mockDrawing = {
        id: 'drawing-1',
        ...dto,
      } as Drawing;

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockDocument)
        .mockResolvedValueOnce(null) // No existing drawing
        .mockResolvedValueOnce(mockDrawingSet); // Drawing set check

      mockQueryRunner.manager.create.mockReturnValue(mockDrawing);
      mockQueryRunner.manager.save.mockResolvedValue(mockDrawing);

      await service.create(projectId, userId, dto);

      expect(drawingSetService.updateDrawingCount).toHaveBeenCalledWith(
        'set-1',
      );
    });
  });

  describe('findOne', () => {
    it('should return a drawing', async () => {
      const mockDrawing = {
        id: 'drawing-1',
        number: 'A-101',
        document: { projectId: 'project-1' },
      } as Drawing;

      drawingRepository.findOne.mockResolvedValue(mockDrawing);

      const result = await service.findOne('project-1', 'drawing-1');

      expect(result.id).toBe('drawing-1');
    });

    it('should throw NotFoundException when drawing not found', async () => {
      drawingRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('project-1', 'drawing-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include revisions when requested', async () => {
      const mockDrawing = {
        id: 'drawing-1',
        document: { projectId: 'project-1' },
      } as Drawing;

      const mockRevisions = [
        { id: 'rev-1', revisionMarker: 'A' },
        { id: 'rev-2', revisionMarker: 'B' },
      ] as DrawingRevision[];

      drawingRepository.findOne.mockResolvedValue(mockDrawing);
      revisionRepository.find.mockResolvedValue(mockRevisions);

      const result = await service.findOne('project-1', 'drawing-1', {
        includeRevisions: true,
      });

      expect(result.revisions).toHaveLength(2);
    });

    it('should include cross-references when requested', async () => {
      const mockDrawing = {
        id: 'drawing-1',
        document: { projectId: 'project-1' },
      } as Drawing;

      const mockOutgoing = [
        { id: 'ref-1', targetDrawingId: 'drawing-2' },
      ] as DrawingCrossReference[];

      const mockIncoming = [
        { id: 'ref-2', sourceDrawingId: 'drawing-3' },
      ] as DrawingCrossReference[];

      drawingRepository.findOne.mockResolvedValue(mockDrawing);
      crossReferenceRepository.find
        .mockResolvedValueOnce(mockOutgoing)
        .mockResolvedValueOnce(mockIncoming);

      const result = await service.findOne('project-1', 'drawing-1', {
        includeCrossReferences: true,
      });

      expect(result.crossReferences).toBeDefined();
      expect(result.crossReferences.outgoing).toHaveLength(1);
      expect(result.crossReferences.incoming).toHaveLength(1);
    });
  });

  describe('findAll', () => {
    it('should return all drawings for a project', async () => {
      const mockDrawings = [
        { id: 'drawing-1', number: 'A-101' },
        { id: 'drawing-2', number: 'A-102' },
      ] as Drawing[];

      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockDrawings),
      };

      (drawingRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.findAll('project-1');

      expect(result).toHaveLength(2);
    });

    it('should filter by discipline', async () => {
      const mockDrawings = [
        { id: 'drawing-1', number: 'A-101', discipline: 'architectural' },
      ] as Drawing[];

      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockDrawings),
      };

      (drawingRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.findAll('project-1', {
        discipline: 'architectural',
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'drawing.discipline = :discipline',
        { discipline: 'architectural' },
      );
    });

    it('should filter by search term', async () => {
      const mockDrawings = [
        { id: 'drawing-1', number: 'A-101', title: 'Floor Plan' },
      ] as Drawing[];

      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockDrawings),
      };

      (drawingRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder,
      );

      await service.findAll('project-1', { search: 'Floor' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(drawing.number ILIKE :search OR drawing.title ILIKE :search)',
        { search: '%Floor%' },
      );
    });
  });

  describe('update', () => {
    it('should update a drawing', async () => {
      const mockDrawing = {
        id: 'drawing-1',
        number: 'A-101',
        title: 'Old Title',
        customFields: {},
        document: { projectId: 'project-1' },
      } as Drawing;

      const dto = {
        title: 'New Title',
        tags: ['updated'],
      };

      drawingRepository.findOne.mockResolvedValue(mockDrawing);
      drawingRepository.save.mockResolvedValue({
        ...mockDrawing,
        ...dto,
      } as Drawing);

      const result = await service.update('project-1', 'drawing-1', dto);

      expect(result.title).toBe('New Title');
    });

    it('should throw NotFoundException when drawing not found', async () => {
      drawingRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('project-1', 'drawing-1', { title: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a drawing', async () => {
      const mockDrawing = {
        id: 'drawing-1',
        drawingSetId: 'set-1',
        document: { projectId: 'project-1' },
      } as Drawing;

      mockQueryRunner.manager.findOne.mockResolvedValue(mockDrawing);
      mockQueryRunner.manager.delete.mockResolvedValue(undefined);

      await service.delete('project-1', 'drawing-1');

      expect(mockQueryRunner.manager.delete).toHaveBeenCalledWith(
        Drawing,
        'drawing-1',
      );
      expect(drawingSetService.updateDrawingCount).toHaveBeenCalledWith(
        'set-1',
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when drawing not found', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      await expect(service.delete('project-1', 'drawing-1')).rejects.toThrow(
        NotFoundException,
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('addRevision', () => {
    it('should add a revision to a drawing', async () => {
      const projectId = 'project-1';
      const drawingId = 'drawing-1';
      const userId = 'user-1';
      const dto = {
        revisionMarker: 'A',
        issuedDate: new Date('2024-01-15'),
        description: 'Initial issue',
        cloudLocations: ['Grid A-B/1-2'],
      };

      const mockDrawing = {
        id: drawingId,
        revisionHistory: [],
        document: { projectId },
      } as Drawing;

      const mockRevision = {
        id: 'rev-1',
        drawingId,
        revisionMarker: 'A',
        sequenceNumber: 1,
        ...dto,
      } as DrawingRevision;

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockDrawing) // Drawing check
        .mockResolvedValueOnce(null) // No existing revision
        .mockResolvedValueOnce(null); // No last revision

      mockQueryRunner.manager.create.mockReturnValue(mockRevision);
      mockQueryRunner.manager.save
        .mockResolvedValueOnce(mockRevision)
        .mockResolvedValueOnce({
          ...mockDrawing,
          currentRevision: 'A',
        });

      const result = await service.addRevision(
        projectId,
        drawingId,
        userId,
        dto,
      );

      expect(result.revisionMarker).toBe('A');
      expect(result.sequenceNumber).toBe(1);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw ConflictException when revision marker exists', async () => {
      const dto = {
        revisionMarker: 'A',
        issuedDate: new Date(),
        description: 'Test',
      };

      const mockDrawing = {
        id: 'drawing-1',
        document: { projectId: 'project-1' },
      } as Drawing;

      const existingRevision = {
        id: 'rev-1',
        revisionMarker: 'A',
      } as DrawingRevision;

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockDrawing)
        .mockResolvedValueOnce(existingRevision);

      await expect(
        service.addRevision('project-1', 'drawing-1', 'user-1', dto),
      ).rejects.toThrow(ConflictException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should increment sequence number correctly', async () => {
      const dto = {
        revisionMarker: 'B',
        issuedDate: new Date(),
        description: 'Revision B',
      };

      const mockDrawing = {
        id: 'drawing-1',
        revisionHistory: [],
        document: { projectId: 'project-1' },
      } as Drawing;

      const lastRevision = {
        id: 'rev-1',
        sequenceNumber: 3,
      } as DrawingRevision;

      const newRevision = {
        id: 'rev-2',
        sequenceNumber: 4,
        revisionMarker: 'B',
      } as DrawingRevision;

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockDrawing)
        .mockResolvedValueOnce(null) // No existing revision
        .mockResolvedValueOnce(lastRevision); // Last revision

      mockQueryRunner.manager.create.mockReturnValue(newRevision);
      mockQueryRunner.manager.save.mockResolvedValue(newRevision);

      const result = await service.addRevision(
        'project-1',
        'drawing-1',
        'user-1',
        dto,
      );

      expect(result.sequenceNumber).toBe(4);
    });
  });

  describe('getRevisions', () => {
    it('should return all revisions for a drawing', async () => {
      const mockDrawing = {
        id: 'drawing-1',
        document: { projectId: 'project-1' },
      } as Drawing;

      const mockRevisions = [
        { id: 'rev-1', revisionMarker: 'B', sequenceNumber: 2 },
        { id: 'rev-2', revisionMarker: 'A', sequenceNumber: 1 },
      ] as DrawingRevision[];

      drawingRepository.findOne.mockResolvedValue(mockDrawing);
      revisionRepository.find.mockResolvedValue(mockRevisions);

      const result = await service.getRevisions('project-1', 'drawing-1');

      expect(result).toHaveLength(2);
      expect(revisionRepository.find).toHaveBeenCalledWith({
        where: { drawingId: 'drawing-1' },
        order: { sequenceNumber: 'DESC' },
      });
    });

    it('should throw NotFoundException when drawing not found', async () => {
      drawingRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getRevisions('project-1', 'drawing-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createCrossReference', () => {
    it('should create a cross-reference between drawings', async () => {
      const projectId = 'project-1';
      const sourceDrawingId = 'drawing-1';
      const userId = 'user-1';
      const dto = {
        targetDrawingId: 'drawing-2',
        referenceType: 'detail' as any,
        calloutText: '3/A-501',
        description: 'Detail reference',
      };

      const mockSourceDrawing = {
        id: sourceDrawingId,
        document: { projectId },
      } as Drawing;

      const mockTargetDrawing = {
        id: 'drawing-2',
        document: { projectId },
      } as Drawing;

      const mockCrossReference = {
        id: 'ref-1',
        sourceDrawingId,
        targetDrawingId: 'drawing-2',
        ...dto,
      } as DrawingCrossReference;

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockSourceDrawing)
        .mockResolvedValueOnce(mockTargetDrawing);

      mockQueryRunner.manager.create.mockReturnValue(mockCrossReference);
      mockQueryRunner.manager.save.mockResolvedValue(mockCrossReference);

      const result = await service.createCrossReference(
        projectId,
        sourceDrawingId,
        userId,
        dto,
      );

      expect(result.id).toBe('ref-1');
      expect(result.calloutText).toBe('3/A-501');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when source drawing not found', async () => {
      const dto = {
        targetDrawingId: 'drawing-2',
        referenceType: 'detail' as any,
      };

      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      await expect(
        service.createCrossReference('project-1', 'drawing-1', 'user-1', dto),
      ).rejects.toThrow(NotFoundException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when target drawing not found', async () => {
      const dto = {
        targetDrawingId: 'drawing-2',
        referenceType: 'detail' as any,
      };

      const mockSourceDrawing = {
        id: 'drawing-1',
        document: { projectId: 'project-1' },
      } as Drawing;

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockSourceDrawing)
        .mockResolvedValueOnce(null);

      await expect(
        service.createCrossReference('project-1', 'drawing-1', 'user-1', dto),
      ).rejects.toThrow(NotFoundException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('getCrossReferences', () => {
    it('should return outgoing and incoming cross-references', async () => {
      const mockDrawing = {
        id: 'drawing-1',
        document: { projectId: 'project-1' },
      } as Drawing;

      const mockOutgoing = [
        { id: 'ref-1', targetDrawingId: 'drawing-2' },
      ] as DrawingCrossReference[];

      const mockIncoming = [
        { id: 'ref-2', sourceDrawingId: 'drawing-3' },
      ] as DrawingCrossReference[];

      drawingRepository.findOne.mockResolvedValue(mockDrawing);
      crossReferenceRepository.find
        .mockResolvedValueOnce(mockOutgoing)
        .mockResolvedValueOnce(mockIncoming);

      const result = await service.getCrossReferences('project-1', 'drawing-1');

      expect(result.outgoing).toHaveLength(1);
      expect(result.incoming).toHaveLength(1);
    });

    it('should throw NotFoundException when drawing not found', async () => {
      drawingRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getCrossReferences('project-1', 'drawing-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteCrossReference', () => {
    it('should delete a cross-reference', async () => {
      const mockCrossReference = {
        id: 'ref-1',
        sourceDrawing: {
          document: { projectId: 'project-1' },
        },
      } as DrawingCrossReference;

      crossReferenceRepository.findOne.mockResolvedValue(mockCrossReference);
      crossReferenceRepository.delete.mockResolvedValue(undefined as any);

      await service.deleteCrossReference('project-1', 'ref-1');

      expect(crossReferenceRepository.delete).toHaveBeenCalledWith('ref-1');
    });

    it('should throw NotFoundException when cross-reference not found', async () => {
      crossReferenceRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deleteCrossReference('project-1', 'ref-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateSheetNumber', () => {
    it('should validate correct sheet numbers', () => {
      expect(service.validateSheetNumber('A-101')).toBe(true);
      expect(service.validateSheetNumber('S-201.1')).toBe(true);
      expect(service.validateSheetNumber('M-301')).toBe(true);
      expect(service.validateSheetNumber('E-401.2')).toBe(true);
    });

    it('should reject invalid sheet numbers', () => {
      expect(service.validateSheetNumber('A101')).toBe(false); // Missing hyphen
      expect(service.validateSheetNumber('AA-101')).toBe(false); // Two letters
      expect(service.validateSheetNumber('A-')).toBe(false); // Missing number
      expect(service.validateSheetNumber('A-101-')).toBe(false); // Trailing hyphen
      expect(service.validateSheetNumber('a-101')).toBe(false); // Lowercase
      expect(service.validateSheetNumber('A-101.1.2')).toBe(false); // Multiple dots
    });
  });

  describe('extractDiscipline', () => {
    it('should extract discipline from sheet number', () => {
      expect(service.extractDiscipline('A-101')).toBe('A');
      expect(service.extractDiscipline('S-201.1')).toBe('S');
      expect(service.extractDiscipline('M-301')).toBe('M');
      expect(service.extractDiscipline('E-401')).toBe('E');
    });

    it('should return empty string for invalid format', () => {
      expect(service.extractDiscipline('A101')).toBe('');
      expect(service.extractDiscipline('invalid')).toBe('');
      expect(service.extractDiscipline('')).toBe('');
    });
  });
});
