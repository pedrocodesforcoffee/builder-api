import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AddendumService } from '../addendum.service';
import {
  Addendum,
  AddendumSection,
  Specification,
  Document,
} from '../../entities';
import {
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { AddendumChangeType } from '../../entities/addendum-section.entity';

describe('AddendumService', () => {
  let service: AddendumService;
  let addendumRepository: jest.Mocked<Repository<Addendum>>;
  let addendumSectionRepository: jest.Mocked<Repository<AddendumSection>>;
  let specRepository: jest.Mocked<Repository<Specification>>;
  let documentRepository: jest.Mocked<Repository<Document>>;
  let dataSource: jest.Mocked<DataSource>;
  let mockQueryRunner: any;

  beforeEach(async () => {
    // Create mock query runner
    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddendumService,
        {
          provide: getRepositoryToken(Addendum),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            softDelete: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AddendumSection),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Specification),
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
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(() => mockQueryRunner),
          },
        },
      ],
    }).compile();

    service = module.get<AddendumService>(AddendumService);
    addendumRepository = module.get(getRepositoryToken(Addendum));
    addendumSectionRepository = module.get(getRepositoryToken(AddendumSection));
    specRepository = module.get(getRepositoryToken(Specification));
    documentRepository = module.get(getRepositoryToken(Document));
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an addendum with affected sections', async () => {
      const projectId = 'project-1';
      const userId = 'user-1';
      const dto = {
        number: '1',
        title: 'Addendum No. 1',
        issueDate: '2024-01-15',
        description: 'Changes to concrete specifications',
        documentId: 'doc-1',
        affectedSections: [
          {
            specificationId: 'spec-1',
            changeType: AddendumChangeType.MODIFY,
            changeDescription: 'Updated concrete strength requirements',
            newContent: '4,000 PSI minimum',
          },
          {
            specificationId: 'spec-2',
            changeType: AddendumChangeType.ADD,
            changeDescription: 'Added waterproofing requirements',
          },
        ],
        relatedRfis: ['rfi-1', 'rfi-2'],
      };

      const mockDocument = {
        id: 'doc-1',
        projectId,
        name: 'Addendum 1',
      } as Document;

      const mockSpec1 = {
        id: 'spec-1',
        projectId,
        sectionNumber: '03 30 00',
      } as Specification;

      const mockSpec2 = {
        id: 'spec-2',
        projectId,
        sectionNumber: '07 10 00',
      } as Specification;

      const mockAddendum = {
        id: 'addendum-1',
        projectId,
        number: '1',
        title: dto.title,
        issueDate: new Date(dto.issueDate),
        description: dto.description,
        documentId: dto.documentId,
        relatedRfiIds: dto.relatedRfis,
        createdById: userId,
        affectedSections: [],
        document: mockDocument,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Addendum;

      addendumRepository.findOne.mockResolvedValue(null); // No duplicate
      documentRepository.findOne.mockResolvedValue(mockDocument);
      mockQueryRunner.manager.create.mockReturnValueOnce(mockAddendum);
      mockQueryRunner.manager.save.mockResolvedValue(mockAddendum);
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockSpec1)
        .mockResolvedValueOnce(mockSpec2);

      // Mock the final fetch with relations
      addendumRepository.findOne.mockResolvedValueOnce({
        ...mockAddendum,
        affectedSections: [
          {
            id: 'as-1',
            addendumId: 'addendum-1',
            specificationId: 'spec-1',
            changeType: AddendumChangeType.MODIFY,
            changeDescription: dto.affectedSections[0].changeDescription,
            specification: mockSpec1,
          },
          {
            id: 'as-2',
            addendumId: 'addendum-1',
            specificationId: 'spec-2',
            changeType: AddendumChangeType.ADD,
            changeDescription: dto.affectedSections[1].changeDescription,
            specification: mockSpec2,
          },
        ],
      } as any);

      const result = await service.create(projectId, dto, userId);

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(result.number).toBe('1');
      expect(result.title).toBe(dto.title);
      expect(result.affectedSections).toHaveLength(2);
    });

    it('should reject duplicate addendum numbers', async () => {
      const dto = {
        number: '1',
        title: 'Test Addendum',
        issueDate: '2024-01-15',
        description: 'Test',
        affectedSections: [],
      };

      const existingAddendum = { id: 'existing-addendum' } as Addendum;
      addendumRepository.findOne.mockResolvedValue(existingAddendum);

      await expect(service.create('project-1', dto, 'user-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reject invalid document reference', async () => {
      const dto = {
        number: '1',
        title: 'Test Addendum',
        issueDate: '2024-01-15',
        description: 'Test',
        documentId: 'invalid-doc',
        affectedSections: [],
      };

      addendumRepository.findOne.mockResolvedValue(null);
      documentRepository.findOne.mockResolvedValue(null);

      await expect(service.create('project-1', dto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should rollback transaction on error', async () => {
      const dto = {
        number: '1',
        title: 'Test Addendum',
        issueDate: '2024-01-15',
        description: 'Test',
        affectedSections: [
          {
            specificationId: 'invalid-spec',
            changeType: AddendumChangeType.MODIFY,
            changeDescription: 'Test',
          },
        ],
      };

      addendumRepository.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.create.mockReturnValue({ id: 'addendum-1' } as any);
      mockQueryRunner.manager.save.mockResolvedValue({ id: 'addendum-1' } as any);
      mockQueryRunner.manager.findOne.mockResolvedValue(null); // Spec not found

      await expect(service.create('project-1', dto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return an addendum with relations', async () => {
      const mockAddendum = {
        id: 'addendum-1',
        projectId: 'project-1',
        number: '1',
        title: 'Addendum No. 1',
        issueDate: new Date('2024-01-15'),
        description: 'Test addendum',
        document: {
          id: 'doc-1',
          name: 'Addendum 1',
        },
        affectedSections: [
          {
            specificationId: 'spec-1',
            specification: {
              sectionNumber: '03 30 00',
              sectionTitle: 'Cast-in-Place Concrete',
            },
            changeType: AddendumChangeType.MODIFY,
            changeDescription: 'Updated strength',
          },
        ],
        createdAt: new Date(),
      } as any;

      addendumRepository.findOne.mockResolvedValue(mockAddendum);

      const result = await service.findOne('project-1', 'addendum-1');

      expect(result.id).toBe('addendum-1');
      expect(result.number).toBe('1');
      expect(result.affectedSections).toHaveLength(1);
      expect(result.affectedSections[0].sectionNumber).toBe('03 30 00');
    });

    it('should throw NotFoundException when addendum not found', async () => {
      addendumRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('project-1', 'addendum-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return filtered addenda with summary', async () => {
      const mockAddenda = [
        {
          id: 'addendum-1',
          projectId: 'project-1',
          number: '1',
          title: 'Addendum No. 1',
          issueDate: new Date('2024-01-15'),
          description: 'Test',
          affectedSections: [
            {
              specificationId: 'spec-1',
              specification: {
                id: 'spec-1',
                sectionNumber: '03 30 00',
                sectionTitle: 'Cast-in-Place Concrete',
              },
              changeType: AddendumChangeType.MODIFY,
              changeDescription: 'Test',
            },
          ],
          document: null,
          createdAt: new Date(),
        },
        {
          id: 'addendum-2',
          projectId: 'project-1',
          number: '2',
          title: 'Addendum No. 2',
          issueDate: new Date('2024-01-20'),
          description: 'Test 2',
          affectedSections: [
            {
              specificationId: 'spec-1',
              specification: {
                id: 'spec-1',
                sectionNumber: '03 30 00',
                sectionTitle: 'Cast-in-Place Concrete',
              },
              changeType: AddendumChangeType.ADD,
              changeDescription: 'Test 2',
            },
            {
              specificationId: 'spec-2',
              specification: {
                id: 'spec-2',
                sectionNumber: '07 10 00',
                sectionTitle: 'Dampproofing and Waterproofing',
              },
              changeType: AddendumChangeType.MODIFY,
              changeDescription: 'Test 3',
            },
          ],
          document: null,
          createdAt: new Date(),
        },
      ] as any[];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockAddenda),
      };

      addendumRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await service.findAll('project-1', {});

      expect(result.addenda).toHaveLength(2);
      expect(result.summary.totalAddenda).toBe(2);
      expect(result.summary.totalSectionsAffected).toBe(2); // spec-1 and spec-2
      expect(result.summary.latestIssueDate).toBe('2024-01-20T00:00:00.000Z');
    });

    it('should filter by affected section', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      addendumRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      await service.findAll('project-1', { affectsSection: '03 30 00' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        's.sectionNumber = :sectionNumber',
        { sectionNumber: '03 30 00' },
      );
    });

    it('should filter by date range', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      addendumRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      await service.findAll('project-1', {
        issuedAfter: '2024-01-01',
        issuedBefore: '2024-12-31',
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'a.issueDate >= :issuedAfter',
        { issuedAfter: '2024-01-01' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'a.issueDate <= :issuedBefore',
        { issuedBefore: '2024-12-31' },
      );
    });
  });

  describe('getSpecificationHistory', () => {
    it('should return addendum history for a specification', async () => {
      const mockSpec = {
        id: 'spec-1',
        projectId: 'project-1',
        sectionNumber: '03 30 00',
        sectionTitle: 'Cast-in-Place Concrete',
      } as Specification;

      const mockAddendumSections = [
        {
          id: 'as-1',
          specificationId: 'spec-1',
          changeType: AddendumChangeType.MODIFY,
          changeDescription: 'Updated strength requirements',
          createdAt: new Date('2024-01-15'),
          addendum: {
            id: 'addendum-1',
            number: '1',
            issueDate: new Date('2024-01-15'),
          },
        },
        {
          id: 'as-2',
          specificationId: 'spec-1',
          changeType: AddendumChangeType.CLARIFY,
          changeDescription: 'Clarified curing requirements',
          createdAt: new Date('2024-01-20'),
          addendum: {
            id: 'addendum-2',
            number: '2',
            issueDate: new Date('2024-01-20'),
          },
        },
      ] as any[];

      specRepository.findOne.mockResolvedValue(mockSpec);
      addendumSectionRepository.find.mockResolvedValue(mockAddendumSections);

      const result = await service.getSpecificationHistory('project-1', 'spec-1');

      expect(result.specificationId).toBe('spec-1');
      expect(result.sectionNumber).toBe('03 30 00');
      expect(result.sectionTitle).toBe('Cast-in-Place Concrete');
      expect(result.addendaHistory).toHaveLength(2);
      expect(result.addendaHistory[0].addendumNumber).toBe('1');
      expect(result.addendaHistory[0].changeType).toBe(AddendumChangeType.MODIFY);
    });

    it('should throw NotFoundException when specification not found', async () => {
      specRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getSpecificationHistory('project-1', 'spec-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should soft delete an addendum', async () => {
      const mockAddendum = {
        id: 'addendum-1',
        projectId: 'project-1',
      } as Addendum;

      addendumRepository.findOne.mockResolvedValue(mockAddendum);
      addendumRepository.softDelete.mockResolvedValue({} as any);

      await service.delete('project-1', 'addendum-1');

      expect(addendumRepository.softDelete).toHaveBeenCalledWith('addendum-1');
    });

    it('should throw NotFoundException when addendum not found', async () => {
      addendumRepository.findOne.mockResolvedValue(null);

      await expect(service.delete('project-1', 'addendum-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
