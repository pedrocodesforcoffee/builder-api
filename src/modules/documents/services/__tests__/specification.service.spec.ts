import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SpecificationService } from '../specification.service';
import {
  Specification,
  SpecificationProduct,
  SpecificationDrawing,
  SpecificationRfi,
  Document,
} from '../../entities';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SpecificationDivision } from '../../enums';

describe('SpecificationService', () => {
  let service: SpecificationService;
  let specRepository: jest.Mocked<Repository<Specification>>;
  let productRepository: jest.Mocked<Repository<SpecificationProduct>>;
  let drawingRepository: jest.Mocked<Repository<SpecificationDrawing>>;
  let rfiRepository: jest.Mocked<Repository<SpecificationRfi>>;
  let documentRepository: jest.Mocked<Repository<Document>>;
  let dataSource: jest.Mocked<DataSource>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpecificationService,
        {
          provide: getRepositoryToken(Specification),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SpecificationProduct),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SpecificationDrawing),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SpecificationRfi),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
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
            createQueryRunner: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SpecificationService>(SpecificationService);
    specRepository = module.get(getRepositoryToken(Specification));
    productRepository = module.get(getRepositoryToken(SpecificationProduct));
    drawingRepository = module.get(getRepositoryToken(SpecificationDrawing));
    rfiRepository = module.get(getRepositoryToken(SpecificationRfi));
    documentRepository = module.get(getRepositoryToken(Document));
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a specification successfully', async () => {
      const projectId = 'project-1';
      const userId = 'user-1';
      const dto = {
        documentId: 'doc-1',
        sectionNumber: '03 30 00',
        sectionTitle: 'Cast-in-Place Concrete',
        division: SpecificationDivision.DIV_03,
        scope: 'All cast-in-place concrete work',
        tags: ['concrete', 'structural'],
      };

      const mockDocument = {
        id: 'doc-1',
        projectId,
        name: 'Section 03 30 00',
        currentVersionId: 'version-1',
        status: 'active',
      } as Document;

      const mockSpec = {
        id: 'spec-1',
        projectId,
        ...dto,
        isApplicable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Specification;

      specRepository.findOne.mockResolvedValue(null); // No duplicate
      documentRepository.findOne.mockResolvedValue(mockDocument);
      specRepository.create.mockReturnValue(mockSpec as any);
      specRepository.save.mockResolvedValue(mockSpec);

      const result = await service.create(projectId, dto, userId);

      expect(result.sectionNumber).toBe('03 30 00');
      expect(result.sectionTitle).toBe('Cast-in-Place Concrete');
      expect(result.division).toBe(SpecificationDivision.DIV_03);
    });

    it('should reject invalid section number format', async () => {
      const dto = {
        documentId: 'doc-1',
        sectionNumber: '033000', // Invalid format
        sectionTitle: 'Test',
        division: SpecificationDivision.DIV_03,
      };

      await expect(service.create('project-1', dto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject duplicate section numbers', async () => {
      const dto = {
        documentId: 'doc-1',
        sectionNumber: '03 30 00',
        sectionTitle: 'Test',
        division: SpecificationDivision.DIV_03,
      };

      const existingSpec = { id: 'existing-spec' } as Specification;
      specRepository.findOne.mockResolvedValue(existingSpec);

      await expect(service.create('project-1', dto, 'user-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reject mismatched division and section number', async () => {
      const dto = {
        documentId: 'doc-1',
        sectionNumber: '03 30 00', // Division 03
        sectionTitle: 'Test',
        division: SpecificationDivision.DIV_09, // Wrong division!
      };

      const mockDocument = { id: 'doc-1', projectId: 'project-1' } as Document;
      specRepository.findOne.mockResolvedValue(null);
      documentRepository.findOne.mockResolvedValue(mockDocument);

      await expect(service.create('project-1', dto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne', () => {
    it('should return a specification', async () => {
      const mockSpec = {
        id: 'spec-1',
        projectId: 'project-1',
        sectionNumber: '03 30 00',
        document: {
          id: 'doc-1',
          name: 'Section 03 30 00',
          currentVersionId: 'version-1',
          status: 'active',
        },
      } as Specification;

      specRepository.findOne.mockResolvedValue(mockSpec);

      const result = await service.findOne('project-1', 'spec-1');

      expect(result.id).toBe('spec-1');
      expect(result.sectionNumber).toBe('03 30 00');
    });

    it('should throw NotFoundException when spec not found', async () => {
      specRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('project-1', 'spec-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a specification', async () => {
      const mockSpec = {
        id: 'spec-1',
        projectId: 'project-1',
        sectionTitle: 'Old Title',
        scope: 'Old scope',
        document: { id: 'doc-1' } as Document,
      } as Specification;

      const dto = {
        sectionTitle: 'New Title',
        scope: 'New scope',
        isApplicable: false,
      };

      specRepository.findOne.mockResolvedValue(mockSpec);
      specRepository.save.mockResolvedValue({ ...mockSpec, ...dto } as Specification);

      const result = await service.update('project-1', 'spec-1', dto);

      expect(result.sectionTitle).toBe('New Title');
    });
  });

  describe('delete', () => {
    it('should delete a specification', async () => {
      const mockSpec = {
        id: 'spec-1',
        projectId: 'project-1',
      } as Specification;

      specRepository.findOne.mockResolvedValue(mockSpec);
      specRepository.remove.mockResolvedValue(mockSpec);

      await service.delete('project-1', 'spec-1');

      expect(specRepository.remove).toHaveBeenCalledWith(mockSpec);
    });
  });

  describe('addProduct', () => {
    it('should add a product to a specification', async () => {
      const mockSpec = { id: 'spec-1', projectId: 'project-1' } as Specification;
      const dto = {
        manufacturer: 'Hilti',
        productName: 'HIT-HY 200',
        modelNumber: 'HIT-HY 200-R',
        isBaseBid: true,
        isSubstitution: false,
      };

      specRepository.findOne.mockResolvedValue(mockSpec);
      productRepository.create.mockReturnValue({ id: 'product-1', ...dto } as any);
      productRepository.save.mockResolvedValue({ id: 'product-1', ...dto } as any);

      await service.addProduct('project-1', 'spec-1', dto);

      expect(productRepository.save).toHaveBeenCalled();
    });
  });

  describe('linkDrawing', () => {
    it('should link a drawing to a specification', async () => {
      const mockSpec = { id: 'spec-1', projectId: 'project-1' } as Specification;
      const dto = {
        drawingId: 'drawing-1',
        relationship: 'Referenced in Part 3',
      };

      specRepository.findOne.mockResolvedValue(mockSpec);
      drawingRepository.findOne.mockResolvedValue(null); // No existing link
      drawingRepository.create.mockReturnValue({ id: 'link-1', ...dto } as any);
      drawingRepository.save.mockResolvedValue({ id: 'link-1', ...dto } as any);

      await service.linkDrawing('project-1', 'spec-1', dto, 'user-1');

      expect(drawingRepository.save).toHaveBeenCalled();
    });

    it('should reject duplicate drawing link', async () => {
      const mockSpec = { id: 'spec-1', projectId: 'project-1' } as Specification;
      const dto = { drawingId: 'drawing-1' };

      specRepository.findOne.mockResolvedValue(mockSpec);
      drawingRepository.findOne.mockResolvedValue({ id: 'existing-link' } as any);

      await expect(
        service.linkDrawing('project-1', 'spec-1', dto, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('linkRfi', () => {
    it('should link an RFI to a specification', async () => {
      const mockSpec = { id: 'spec-1', projectId: 'project-1' } as Specification;
      const dto = {
        rfiId: 'rfi-1',
        context: 'Clarification on concrete strength',
      };

      specRepository.findOne.mockResolvedValue(mockSpec);
      rfiRepository.create.mockReturnValue({ id: 'link-1', ...dto } as any);
      rfiRepository.save.mockResolvedValue({ id: 'link-1', ...dto } as any);

      await service.linkRfi('project-1', 'spec-1', dto, 'user-1');

      expect(rfiRepository.save).toHaveBeenCalled();
    });
  });
});
