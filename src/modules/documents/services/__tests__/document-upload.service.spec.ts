import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Queue } from 'bull';
import { getQueueToken } from '@nestjs/bull';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DocumentUploadService } from '../document-upload.service';
import { DocumentUpload, UploadStatus, UploadType } from '../../entities/document-upload.entity';
import { Document } from '../../entities/document.entity';
import { DocumentVersion } from '../../entities/document-version.entity';
import { S3Service } from '../../../../common/services/s3.service';
import { QUEUE_NAMES } from '../../constants/queue-names';

describe('DocumentUploadService', () => {
  let service: DocumentUploadService;
  let uploadRepository: jest.Mocked<Repository<DocumentUpload>>;
  let documentRepository: jest.Mocked<Repository<Document>>;
  let versionRepository: jest.Mocked<Repository<DocumentVersion>>;
  let s3Service: jest.Mocked<S3Service>;
  let documentQueue: jest.Mocked<Queue>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockProjectId = '123e4567-e89b-12d3-a456-426614174001';
  const mockUploadId = '123e4567-e89b-12d3-a456-426614174002';
  const mockDocumentId = '123e4567-e89b-12d3-a456-426614174003';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentUploadService,
        {
          provide: getRepositoryToken(DocumentUpload),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Document),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DocumentVersion),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getOne: jest.fn(),
            })),
          },
        },
        {
          provide: S3Service,
          useValue: {
            getPresignedPostUrl: jest.fn(),
            initializeMultipartUpload: jest.fn(),
            getPresignedPartUrl: jest.fn(),
            completeMultipartUpload: jest.fn(),
            abortMultipartUpload: jest.fn(),
            getPresignedGetUrl: jest.fn(),
            deleteObject: jest.fn(),
          },
        },
        {
          provide: getQueueToken(QUEUE_NAMES.DOCUMENT_PROCESSING),
          useValue: {
            add: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DocumentUploadService>(DocumentUploadService);
    uploadRepository = module.get(getRepositoryToken(DocumentUpload));
    documentRepository = module.get(getRepositoryToken(Document));
    versionRepository = module.get(getRepositoryToken(DocumentVersion));
    s3Service = module.get(S3Service);
    documentQueue = module.get(getQueueToken(QUEUE_NAMES.DOCUMENT_PROCESSING));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initiateSingleUpload', () => {
    it('should initiate a single upload successfully', async () => {
      const dto = {
        projectId: mockProjectId,
        fileName: 'test.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        documentName: 'Test Document',
        documentType: 'specification',
      };

      const mockUpload = {
        id: mockUploadId,
        ...dto,
        uploadType: UploadType.SINGLE,
        status: UploadStatus.INITIATED,
        s3Key: `projects/${mockProjectId}/uploads/${mockUploadId}/test.pdf`,
      };

      const mockPresignedData = {
        url: 'https://s3.amazonaws.com/bucket',
        fields: { key: 'test-key' },
        s3Key: mockUpload.s3Key,
        expiresAt: new Date(Date.now() + 3600000),
      };

      uploadRepository.create.mockReturnValue(mockUpload as any);
      uploadRepository.save.mockResolvedValue(mockUpload as any);
      s3Service.getPresignedPostUrl.mockResolvedValue(mockPresignedData);

      const result = await service.initiateSingleUpload(dto, mockUserId);

      expect(result).toEqual({
        uploadId: mockUploadId,
        uploadUrl: mockPresignedData.url,
        uploadFields: mockPresignedData.fields,
        s3Key: mockUpload.s3Key,
        expiresAt: mockPresignedData.expiresAt,
      });

      expect(uploadRepository.create).toHaveBeenCalledWith({
        projectId: dto.projectId,
        fileName: dto.fileName,
        fileSize: dto.fileSize,
        mimeType: dto.mimeType,
        documentName: dto.documentName,
        documentType: dto.documentType,
        uploadType: UploadType.SINGLE,
        status: UploadStatus.INITIATED,
        uploadedById: mockUserId,
        s3Key: expect.stringContaining('uploads'),
        expiresAt: expect.any(Date),
      });

      expect(s3Service.getPresignedPostUrl).toHaveBeenCalledWith(
        expect.stringContaining('uploads'),
        dto.fileName,
        dto.mimeType,
        dto.fileSize,
      );
    });

    it('should throw BadRequestException for invalid file size', async () => {
      const dto = {
        projectId: mockProjectId,
        fileName: 'test.pdf',
        fileSize: 10 * 1024 * 1024 * 1024, // 10GB
        mimeType: 'application/pdf',
        documentName: 'Test Document',
        documentType: 'specification',
      };

      await expect(service.initiateSingleUpload(dto, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('initiateMultipartUpload', () => {
    it('should initiate a multipart upload successfully', async () => {
      const dto = {
        projectId: mockProjectId,
        fileName: 'large-file.pdf',
        fileSize: 100 * 1024 * 1024, // 100MB
        mimeType: 'application/pdf',
        documentName: 'Large Document',
        documentType: 'specification',
      };

      const mockUpload = {
        id: mockUploadId,
        ...dto,
        uploadType: UploadType.MULTIPART,
        status: UploadStatus.INITIATED,
        s3Key: `projects/${mockProjectId}/uploads/${mockUploadId}/large-file.pdf`,
        s3UploadId: 's3-upload-id-123',
      };

      uploadRepository.create.mockReturnValue(mockUpload as any);
      uploadRepository.save.mockResolvedValue(mockUpload as any);
      s3Service.initializeMultipartUpload.mockResolvedValue({
        uploadId: 's3-upload-id-123',
        s3Key: mockUpload.s3Key,
      });

      const result = await service.initiateMultipartUpload(dto, mockUserId);

      expect(result).toEqual({
        uploadId: mockUploadId,
        s3UploadId: 's3-upload-id-123',
        s3Key: mockUpload.s3Key,
        partSize: 10 * 1024 * 1024, // 10MB
        totalParts: expect.any(Number),
      });

      expect(s3Service.initializeMultipartUpload).toHaveBeenCalledWith(
        expect.stringContaining('uploads'),
        dto.fileName,
        dto.mimeType,
      );
    });
  });

  describe('getPartUploadUrl', () => {
    it('should get part upload URL successfully', async () => {
      const mockUpload = {
        id: mockUploadId,
        s3Key: 'test-key',
        s3UploadId: 's3-upload-id-123',
        status: UploadStatus.UPLOADING,
        uploadType: UploadType.MULTIPART,
      };

      const mockPresignedUrl = 'https://s3.amazonaws.com/part-url';

      uploadRepository.findOne.mockResolvedValue(mockUpload as any);
      s3Service.getPresignedPartUrl.mockResolvedValue(mockPresignedUrl);

      const result = await service.getPartUploadUrl(mockUploadId, 1);

      expect(result).toEqual({
        partNumber: 1,
        uploadUrl: mockPresignedUrl,
      });

      expect(s3Service.getPresignedPartUrl).toHaveBeenCalledWith(
        'test-key',
        's3-upload-id-123',
        1,
      );
    });

    it('should throw NotFoundException if upload not found', async () => {
      uploadRepository.findOne.mockResolvedValue(null);

      await expect(service.getPartUploadUrl(mockUploadId, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if upload type is not multipart', async () => {
      const mockUpload = {
        id: mockUploadId,
        uploadType: UploadType.SINGLE,
      };

      uploadRepository.findOne.mockResolvedValue(mockUpload as any);

      await expect(service.getPartUploadUrl(mockUploadId, 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('completeMultipartUpload', () => {
    it('should complete multipart upload successfully', async () => {
      const parts = [
        { PartNumber: 1, ETag: 'etag1' },
        { PartNumber: 2, ETag: 'etag2' },
      ];

      const mockUpload = {
        id: mockUploadId,
        s3Key: 'test-key',
        s3UploadId: 's3-upload-id-123',
        status: UploadStatus.UPLOADING,
        uploadType: UploadType.MULTIPART,
        projectId: mockProjectId,
        documentName: 'Test Doc',
        fileName: 'test.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        uploadedById: mockUserId,
      };

      const mockDocument = {
        id: mockDocumentId,
      };

      const mockVersion = {
        id: 'version-id',
      };

      uploadRepository.findOne.mockResolvedValue(mockUpload as any);
      uploadRepository.save.mockResolvedValue({ ...mockUpload, status: UploadStatus.PROCESSING } as any);
      documentRepository.create.mockReturnValue(mockDocument as any);
      documentRepository.save.mockResolvedValue(mockDocument as any);
      versionRepository.create.mockReturnValue(mockVersion as any);
      versionRepository.save.mockResolvedValue(mockVersion as any);
      s3Service.completeMultipartUpload.mockResolvedValue(undefined);
      documentQueue.add.mockResolvedValue(undefined as any);

      const result = await service.completeMultipartUpload(mockUploadId, parts);

      expect(result).toEqual({
        uploadId: mockUploadId,
        status: UploadStatus.PROCESSING,
        documentId: mockDocumentId,
        versionId: 'version-id',
      });

      expect(s3Service.completeMultipartUpload).toHaveBeenCalledWith(
        'test-key',
        's3-upload-id-123',
        parts,
      );

      expect(documentQueue.add).toHaveBeenCalledTimes(4); // virus scan, thumbnail, OCR, metadata
    });
  });

  describe('completeSingleUpload', () => {
    it('should complete single upload successfully', async () => {
      const mockUpload = {
        id: mockUploadId,
        s3Key: 'test-key',
        status: UploadStatus.UPLOADED,
        uploadType: UploadType.SINGLE,
        projectId: mockProjectId,
        documentName: 'Test Doc',
        fileName: 'test.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        uploadedById: mockUserId,
      };

      const mockDocument = {
        id: mockDocumentId,
      };

      const mockVersion = {
        id: 'version-id',
      };

      uploadRepository.findOne.mockResolvedValue(mockUpload as any);
      uploadRepository.save.mockResolvedValue({ ...mockUpload, status: UploadStatus.PROCESSING } as any);
      documentRepository.create.mockReturnValue(mockDocument as any);
      documentRepository.save.mockResolvedValue(mockDocument as any);
      versionRepository.create.mockReturnValue(mockVersion as any);
      versionRepository.save.mockResolvedValue(mockVersion as any);
      documentQueue.add.mockResolvedValue(undefined as any);

      const result = await service.completeSingleUpload(mockUploadId);

      expect(result).toEqual({
        uploadId: mockUploadId,
        status: UploadStatus.PROCESSING,
        documentId: mockDocumentId,
        versionId: 'version-id',
      });

      expect(documentQueue.add).toHaveBeenCalledTimes(4); // virus scan, thumbnail, OCR, metadata
    });
  });

  describe('getUploadStatus', () => {
    it('should get upload status with document URL', async () => {
      const mockUpload = {
        id: mockUploadId,
        status: UploadStatus.COMPLETE,
        s3Key: 'test-key',
        documentId: mockDocumentId,
        versionId: 'version-id',
        processingStatus: {
          virusScan: { status: 'completed', clean: true },
          thumbnails: { status: 'completed' },
          ocr: { status: 'completed' },
          metadata: { status: 'completed' },
        },
      };

      const mockPresignedUrl = 'https://s3.amazonaws.com/document-url';

      uploadRepository.findOne.mockResolvedValue(mockUpload as any);
      s3Service.getPresignedGetUrl.mockResolvedValue(mockPresignedUrl);

      const result = await service.getUploadStatus(mockUploadId);

      expect(result).toEqual({
        uploadId: mockUploadId,
        status: UploadStatus.COMPLETE,
        documentId: mockDocumentId,
        versionId: 'version-id',
        documentUrl: mockPresignedUrl,
        processingStatus: mockUpload.processingStatus,
      });
    });

    it('should get upload status without document URL if not complete', async () => {
      const mockUpload = {
        id: mockUploadId,
        status: UploadStatus.UPLOADING,
        s3Key: 'test-key',
        processingStatus: {},
      };

      uploadRepository.findOne.mockResolvedValue(mockUpload as any);

      const result = await service.getUploadStatus(mockUploadId);

      expect(result).toEqual({
        uploadId: mockUploadId,
        status: UploadStatus.UPLOADING,
        processingStatus: {},
      });

      expect(s3Service.getPresignedGetUrl).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if upload not found', async () => {
      uploadRepository.findOne.mockResolvedValue(null);

      await expect(service.getUploadStatus(mockUploadId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('abortUpload', () => {
    it('should abort multipart upload successfully', async () => {
      const mockUpload = {
        id: mockUploadId,
        s3Key: 'test-key',
        s3UploadId: 's3-upload-id-123',
        status: UploadStatus.UPLOADING,
        uploadType: UploadType.MULTIPART,
      };

      uploadRepository.findOne.mockResolvedValue(mockUpload as any);
      uploadRepository.save.mockResolvedValue({ ...mockUpload, status: UploadStatus.ABORTED } as any);
      s3Service.abortMultipartUpload.mockResolvedValue(undefined);

      await service.abortUpload(mockUploadId);

      expect(s3Service.abortMultipartUpload).toHaveBeenCalledWith(
        'test-key',
        's3-upload-id-123',
      );
    });

    it('should abort single upload successfully', async () => {
      const mockUpload = {
        id: mockUploadId,
        s3Key: 'test-key',
        status: UploadStatus.UPLOADING,
        uploadType: UploadType.SINGLE,
      };

      uploadRepository.findOne.mockResolvedValue(mockUpload as any);
      uploadRepository.save.mockResolvedValue({ ...mockUpload, status: UploadStatus.ABORTED } as any);
      s3Service.deleteObject.mockResolvedValue(undefined);

      await service.abortUpload(mockUploadId);

      expect(s3Service.deleteObject).toHaveBeenCalledWith('test-key');
    });

    it('should throw NotFoundException if upload not found', async () => {
      uploadRepository.findOne.mockResolvedValue(null);

      await expect(service.abortUpload(mockUploadId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listProjectUploads', () => {
    it('should list uploads for a project', async () => {
      const mockUploads = [
        { id: mockUploadId, status: UploadStatus.COMPLETE },
        { id: 'upload-2', status: UploadStatus.UPLOADING },
      ];

      uploadRepository.find.mockResolvedValue(mockUploads as any);

      const result = await service.listProjectUploads(mockProjectId);

      expect(result).toEqual(mockUploads);
      expect(uploadRepository.find).toHaveBeenCalledWith({
        where: { projectId: mockProjectId },
        order: { createdAt: 'DESC' },
      });
    });
  });
});
