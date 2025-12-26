import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ChangeOrderDocumentService } from './change-order-document.service';
import { ChangeOrderDocument } from '../entities/change-order-document.entity';
import { ChangeOrderHistory } from '../entities/change-order-history.entity';
import { OwnerChangeOrder } from '../entities/owner-change-order.entity';
import { CommitmentChangeOrder } from '../entities/commitment-change-order.entity';
import { CoDocumentType } from '../enums/co-document-type.enum';
import { CoAction } from '../enums/co-action.enum';
import { AddCODocumentDto } from '../dto';

describe('ChangeOrderDocumentService', () => {
  let service: ChangeOrderDocumentService;
  let documentRepo: jest.Mocked<Repository<ChangeOrderDocument>>;
  let historyRepo: jest.Mocked<Repository<ChangeOrderHistory>>;
  let ocoRepo: jest.Mocked<Repository<OwnerChangeOrder>>;
  let ccoRepo: jest.Mocked<Repository<CommitmentChangeOrder>>;
  let dataSource: jest.Mocked<DataSource>;

  const mockDocumentRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockHistoryRepo = {};

  const mockOcoRepo = {
    findOne: jest.fn(),
  };

  const mockCcoRepo = {
    findOne: jest.fn(),
  };

  const mockEntityManager = {
    create: jest.fn((entity, data) => data),
    save: jest.fn((entity, data) => data),
    remove: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn((callback) => callback(mockEntityManager)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChangeOrderDocumentService,
        {
          provide: getRepositoryToken(ChangeOrderDocument),
          useValue: mockDocumentRepo,
        },
        {
          provide: getRepositoryToken(ChangeOrderHistory),
          useValue: mockHistoryRepo,
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
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<ChangeOrderDocumentService>(ChangeOrderDocumentService);
    documentRepo = module.get(getRepositoryToken(ChangeOrderDocument));
    historyRepo = module.get(getRepositoryToken(ChangeOrderHistory));
    ocoRepo = module.get(getRepositoryToken(OwnerChangeOrder));
    ccoRepo = module.get(getRepositoryToken(CommitmentChangeOrder));
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDocuments', () => {
    const mockChangeOrderId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return all documents for OCO', async () => {
      const mockDocuments = [
        {
          id: '1',
          changeOrderId: mockChangeOrderId,
          changeOrderType: 'OCO',
          documentType: CoDocumentType.PROPOSAL,
          fileName: 'proposal.pdf',
          uploadedAt: new Date(),
        },
        {
          id: '2',
          changeOrderId: mockChangeOrderId,
          changeOrderType: 'OCO',
          documentType: CoDocumentType.BACKUP,
          fileName: 'backup.xlsx',
          uploadedAt: new Date(),
        },
      ] as ChangeOrderDocument[];

      documentRepo.find.mockResolvedValue(mockDocuments);

      const result = await service.getDocuments(mockChangeOrderId, 'OCO');

      expect(result).toEqual(mockDocuments);
      expect(documentRepo.find).toHaveBeenCalledWith({
        where: {
          changeOrderId: mockChangeOrderId,
          changeOrderType: 'OCO',
        },
        relations: ['uploadedByUser'],
        order: { uploadedAt: 'DESC' },
      });
    });

    it('should return all documents for CCO', async () => {
      const mockDocuments = [
        {
          id: '1',
          changeOrderId: mockChangeOrderId,
          changeOrderType: 'CCO',
          documentType: CoDocumentType.T_AND_M,
          fileName: 'tm-records.pdf',
          uploadedAt: new Date(),
        },
      ] as ChangeOrderDocument[];

      documentRepo.find.mockResolvedValue(mockDocuments);

      const result = await service.getDocuments(mockChangeOrderId, 'CCO');

      expect(result).toEqual(mockDocuments);
      expect(documentRepo.find).toHaveBeenCalledWith({
        where: {
          changeOrderId: mockChangeOrderId,
          changeOrderType: 'CCO',
        },
        relations: ['uploadedByUser'],
        order: { uploadedAt: 'DESC' },
      });
    });

    it('should return empty array when no documents', async () => {
      documentRepo.find.mockResolvedValue([]);

      const result = await service.getDocuments(mockChangeOrderId, 'OCO');

      expect(result).toEqual([]);
    });
  });

  describe('addDocument', () => {
    const mockChangeOrderId = '123e4567-e89b-12d3-a456-426614174000';
    const mockUserId = '223e4567-e89b-12d3-a456-426614174001';

    it('should add document to OCO successfully', async () => {
      const dto: AddCODocumentDto = {
        documentType: CoDocumentType.PROPOSAL,
        fileName: 'contractor-proposal.pdf',
        fileUrl: 'https://storage.example.com/documents/proposal.pdf',
        fileSize: 2048576,
        mimeType: 'application/pdf',
        description: 'Contractor proposal for additional work',
      };

      const mockOco = {
        id: mockChangeOrderId,
        ocoNumber: 'OCO-001',
      } as OwnerChangeOrder;

      const mockDocument = {
        id: '1',
        changeOrderId: mockChangeOrderId,
        changeOrderType: 'OCO',
        ...dto,
        uploadedBy: mockUserId,
      } as ChangeOrderDocument;

      ocoRepo.findOne.mockResolvedValue(mockOco);
      mockEntityManager.save.mockResolvedValueOnce(mockDocument);

      const result = await service.addDocument(mockChangeOrderId, 'OCO', dto, mockUserId);

      expect(result).toEqual(mockDocument);
      expect(mockEntityManager.create).toHaveBeenCalledWith(ChangeOrderDocument, {
        changeOrderId: mockChangeOrderId,
        changeOrderType: 'OCO',
        documentType: dto.documentType,
        fileName: dto.fileName,
        fileUrl: dto.fileUrl,
        fileSize: dto.fileSize,
        mimeType: dto.mimeType,
        description: dto.description,
        uploadedBy: mockUserId,
      });
      expect(mockEntityManager.save).toHaveBeenCalledWith(ChangeOrderDocument, mockDocument);
      expect(mockEntityManager.create).toHaveBeenCalledWith(ChangeOrderHistory, {
        changeOrderId: mockChangeOrderId,
        changeOrderType: 'OCO',
        action: CoAction.DOCUMENT_ADDED,
        performedBy: mockUserId,
        changes: {
          documentId: mockDocument.id,
          documentType: dto.documentType,
          fileName: dto.fileName,
          fileSize: dto.fileSize,
        },
        notes: `Document "${dto.fileName}" added`,
      });
    });

    it('should add document to CCO successfully', async () => {
      const dto: AddCODocumentDto = {
        documentType: CoDocumentType.T_AND_M,
        fileName: 'time-materials.xlsx',
        fileUrl: 'https://storage.example.com/documents/tm.xlsx',
        fileSize: 512000,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };

      const mockCco = {
        id: mockChangeOrderId,
        ccoNumber: 'CCO-001',
      } as CommitmentChangeOrder;

      const mockDocument = {
        id: '2',
        changeOrderId: mockChangeOrderId,
        changeOrderType: 'CCO',
        ...dto,
        uploadedBy: mockUserId,
      } as ChangeOrderDocument;

      ccoRepo.findOne.mockResolvedValue(mockCco);
      mockEntityManager.save.mockResolvedValueOnce(mockDocument);

      const result = await service.addDocument(mockChangeOrderId, 'CCO', dto, mockUserId);

      expect(result).toEqual(mockDocument);
    });

    it('should throw NotFoundException when OCO not found', async () => {
      const dto: AddCODocumentDto = {
        documentType: CoDocumentType.PROPOSAL,
        fileName: 'test.pdf',
        fileUrl: 'https://example.com/test.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
      };

      ocoRepo.findOne.mockResolvedValue(null);

      await expect(
        service.addDocument(mockChangeOrderId, 'OCO', dto, mockUserId)
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.addDocument(mockChangeOrderId, 'OCO', dto, mockUserId)
      ).rejects.toThrow(`OCO with ID ${mockChangeOrderId} not found`);
    });

    it('should throw NotFoundException when CCO not found', async () => {
      const dto: AddCODocumentDto = {
        documentType: CoDocumentType.BACKUP,
        fileName: 'test.pdf',
        fileUrl: 'https://example.com/test.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
      };

      ccoRepo.findOne.mockResolvedValue(null);

      await expect(
        service.addDocument(mockChangeOrderId, 'CCO', dto, mockUserId)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeDocument', () => {
    const mockDocumentId = '123e4567-e89b-12d3-a456-426614174000';
    const mockUserId = '223e4567-e89b-12d3-a456-426614174001';

    it('should remove document successfully', async () => {
      const mockDocument = {
        id: mockDocumentId,
        changeOrderId: '1',
        changeOrderType: 'OCO',
        documentType: CoDocumentType.PROPOSAL,
        fileName: 'proposal.pdf',
        fileSize: 2048576,
      } as ChangeOrderDocument;

      documentRepo.findOne.mockResolvedValue(mockDocument);

      await service.removeDocument(mockDocumentId, mockUserId);

      expect(mockEntityManager.create).toHaveBeenCalledWith(ChangeOrderHistory, {
        changeOrderId: mockDocument.changeOrderId,
        changeOrderType: mockDocument.changeOrderType,
        action: CoAction.DOCUMENT_REMOVED,
        performedBy: mockUserId,
        changes: {
          documentId: mockDocument.id,
          documentType: mockDocument.documentType,
          fileName: mockDocument.fileName,
          fileSize: mockDocument.fileSize,
        },
        notes: `Document "${mockDocument.fileName}" removed`,
      });
      expect(mockEntityManager.remove).toHaveBeenCalledWith(ChangeOrderDocument, mockDocument);
    });

    it('should throw NotFoundException when document not found', async () => {
      documentRepo.findOne.mockResolvedValue(null);

      await expect(
        service.removeDocument(mockDocumentId, mockUserId)
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.removeDocument(mockDocumentId, mockUserId)
      ).rejects.toThrow(`Document with ID ${mockDocumentId} not found`);
    });
  });

  describe('getDocumentsByType', () => {
    const mockChangeOrderId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return documents filtered by type', async () => {
      const mockDocuments = [
        {
          id: '1',
          changeOrderId: mockChangeOrderId,
          changeOrderType: 'CCO',
          documentType: CoDocumentType.T_AND_M,
          fileName: 'tm-week1.pdf',
        },
        {
          id: '2',
          changeOrderId: mockChangeOrderId,
          changeOrderType: 'CCO',
          documentType: CoDocumentType.T_AND_M,
          fileName: 'tm-week2.pdf',
        },
      ] as ChangeOrderDocument[];

      documentRepo.find.mockResolvedValue(mockDocuments);

      const result = await service.getDocumentsByType(
        mockChangeOrderId,
        'CCO',
        CoDocumentType.T_AND_M
      );

      expect(result).toEqual(mockDocuments);
      expect(documentRepo.find).toHaveBeenCalledWith({
        where: {
          changeOrderId: mockChangeOrderId,
          changeOrderType: 'CCO',
          documentType: CoDocumentType.T_AND_M,
        },
        relations: ['uploadedByUser'],
        order: { uploadedAt: 'DESC' },
      });
    });

    it('should return empty array when no documents of type exist', async () => {
      documentRepo.find.mockResolvedValue([]);

      const result = await service.getDocumentsByType(
        mockChangeOrderId,
        'OCO',
        CoDocumentType.SKETCH
      );

      expect(result).toEqual([]);
    });
  });

  describe('getDocumentStats', () => {
    const mockChangeOrderId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return document statistics', async () => {
      const mockDocuments = [
        {
          id: '1',
          documentType: CoDocumentType.PROPOSAL,
          fileSize: 1024000,
        },
        {
          id: '2',
          documentType: CoDocumentType.PROPOSAL,
          fileSize: 2048000,
        },
        {
          id: '3',
          documentType: CoDocumentType.BACKUP,
          fileSize: 512000,
        },
        {
          id: '4',
          documentType: CoDocumentType.T_AND_M,
          fileSize: 256000,
        },
      ] as ChangeOrderDocument[];

      documentRepo.find.mockResolvedValue(mockDocuments);

      const result = await service.getDocumentStats(mockChangeOrderId, 'OCO');

      expect(result.totalCount).toBe(4);
      expect(result.totalSize).toBe(3840000);
      expect(result.byType[CoDocumentType.PROPOSAL]).toBe(2);
      expect(result.byType[CoDocumentType.BACKUP]).toBe(1);
      expect(result.byType[CoDocumentType.T_AND_M]).toBe(1);
      expect(result.byType[CoDocumentType.SKETCH]).toBe(0);
    });

    it('should handle empty document list', async () => {
      documentRepo.find.mockResolvedValue([]);

      const result = await service.getDocumentStats(mockChangeOrderId, 'CCO');

      expect(result.totalCount).toBe(0);
      expect(result.totalSize).toBe(0);
      expect(result.byType[CoDocumentType.PROPOSAL]).toBe(0);
    });
  });

  describe('validateTMDocumentation', () => {
    const mockChangeOrderId = '123e4567-e89b-12d3-a456-426614174000';

    it('should validate complete T&M documentation', async () => {
      const mockDocuments = [
        {
          id: '1',
          documentType: CoDocumentType.T_AND_M,
        },
        {
          id: '2',
          documentType: CoDocumentType.BACKUP,
        },
      ] as ChangeOrderDocument[];

      documentRepo.find.mockResolvedValue(mockDocuments);

      const result = await service.validateTMDocumentation(mockChangeOrderId, 'CCO');

      expect(result.isComplete).toBe(true);
      expect(result.hasTMRecords).toBe(true);
      expect(result.hasBackupDocs).toBe(true);
      expect(result.missingTypes).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should identify missing T&M records', async () => {
      const mockDocuments = [
        {
          id: '1',
          documentType: CoDocumentType.BACKUP,
        },
      ] as ChangeOrderDocument[];

      documentRepo.find.mockResolvedValue(mockDocuments);

      const result = await service.validateTMDocumentation(mockChangeOrderId, 'CCO');

      expect(result.isComplete).toBe(false);
      expect(result.hasTMRecords).toBe(false);
      expect(result.hasBackupDocs).toBe(true);
      expect(result.missingTypes).toContain(CoDocumentType.T_AND_M);
      expect(result.warnings).toContain(
        'T&M records are required for time and materials change orders'
      );
    });

    it('should identify missing backup documentation', async () => {
      const mockDocuments = [
        {
          id: '1',
          documentType: CoDocumentType.T_AND_M,
        },
      ] as ChangeOrderDocument[];

      documentRepo.find.mockResolvedValue(mockDocuments);

      const result = await service.validateTMDocumentation(mockChangeOrderId, 'CCO');

      expect(result.isComplete).toBe(false);
      expect(result.hasTMRecords).toBe(true);
      expect(result.hasBackupDocs).toBe(false);
      expect(result.missingTypes).toContain(CoDocumentType.BACKUP);
      expect(result.warnings).toContain(
        'Backup documentation is recommended for audit compliance'
      );
    });

    it('should identify missing all T&M documentation', async () => {
      documentRepo.find.mockResolvedValue([]);

      const result = await service.validateTMDocumentation(mockChangeOrderId, 'CCO');

      expect(result.isComplete).toBe(false);
      expect(result.hasTMRecords).toBe(false);
      expect(result.hasBackupDocs).toBe(false);
      expect(result.missingTypes).toHaveLength(2);
      expect(result.warnings).toHaveLength(2);
    });
  });
});
