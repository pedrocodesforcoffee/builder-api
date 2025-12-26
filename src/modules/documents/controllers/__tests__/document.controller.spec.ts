import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DocumentController } from '../document.controller';
import { DocumentService } from '../../services/document.service';
import { PermissionService } from '../../services/permission.service';
import { S3Service } from '../../../../common/services/s3.service';
import { DocumentAction } from '../../enums/permission.enums';
import { Document } from '../../entities/document.entity';
import { DocumentVersion } from '../../entities/document-version.entity';
import { Response } from 'express';

describe('DocumentController', () => {
  let controller: DocumentController;
  let documentService: jest.Mocked<DocumentService>;
  let permissionService: jest.Mocked<PermissionService>;
  let s3Service: jest.Mocked<S3Service>;

  const mockProjectId = '123e4567-e89b-12d3-a456-426614174000';
  const mockDocumentId = '223e4567-e89b-12d3-a456-426614174000';
  const mockUserId = '323e4567-e89b-12d3-a456-426614174000';
  const mockS3Key = 'documents/2024/12/test-file.pdf';
  const mockS3Bucket = 'builder-documents';

  const mockDocument: Partial<Document> = {
    id: mockDocumentId,
    name: 'test-document.pdf',
    projectId: mockProjectId,
    currentVersion: {
      id: 'version-id',
      s3Key: mockS3Key,
      s3Bucket: mockS3Bucket,
      mimeType: 'application/pdf',
      fileSize: 1024,
    } as DocumentVersion,
  };

  const mockFileBuffer = Buffer.from('test file content');

  beforeEach(async () => {
    const mockDocumentService = {
      getDocument: jest.fn(),
      getProjectDocuments: jest.fn(),
      updateDocument: jest.fn(),
      deleteDocument: jest.fn(),
    };

    const mockPermissionService = {
      getMemberByUserId: jest.fn(),
      enforcePermission: jest.fn(),
    };

    const mockS3Service = {
      getObject: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentController],
      providers: [
        {
          provide: DocumentService,
          useValue: mockDocumentService,
        },
        {
          provide: PermissionService,
          useValue: mockPermissionService,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
      ],
    }).compile();

    controller = module.get<DocumentController>(DocumentController);
    documentService = module.get(DocumentService);
    permissionService = module.get(PermissionService);
    s3Service = module.get(S3Service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('downloadDocument', () => {
    let mockResponse: Partial<Response>;

    beforeEach(() => {
      mockResponse = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
    });

    it('should be defined', () => {
      expect(controller).toBeDefined();
      expect(controller.downloadDocument).toBeDefined();
    });

    describe('successful download', () => {
      beforeEach(() => {
        permissionService.getMemberByUserId.mockResolvedValue(undefined);
        permissionService.enforcePermission.mockResolvedValue(undefined);
        documentService.getDocument.mockResolvedValue(mockDocument as Document);
        s3Service.getObject.mockResolvedValue(mockFileBuffer);
      });

      it('should download document and return file buffer with correct headers', async () => {
        const mockRequest = {
          user: { id: mockUserId },
        };

        await controller.downloadDocument(
          mockProjectId,
          mockDocumentId,
          mockRequest,
          mockResponse as Response,
        );

        expect(permissionService.getMemberByUserId).toHaveBeenCalledWith(
          mockUserId,
          mockProjectId,
        );
        expect(permissionService.enforcePermission).toHaveBeenCalledWith(
          mockUserId,
          mockDocumentId,
          DocumentAction.VIEW,
        );
        expect(documentService.getDocument).toHaveBeenCalledWith(mockDocumentId);
        expect(s3Service.getObject).toHaveBeenCalledWith(mockS3Key, mockS3Bucket);
      });

      it('should set correct Content-Type header', async () => {
        const mockRequest = {
          user: { id: mockUserId },
        };

        await controller.downloadDocument(
          mockProjectId,
          mockDocumentId,
          mockRequest,
          mockResponse as Response,
        );

        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'Content-Type',
          'application/pdf',
        );
      });

      it('should set Content-Disposition header with inline for viewing', async () => {
        const mockRequest = {
          user: { id: mockUserId },
        };

        await controller.downloadDocument(
          mockProjectId,
          mockDocumentId,
          mockRequest,
          mockResponse as Response,
        );

        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'Content-Disposition',
          `inline; filename="${mockDocument.name}"`,
        );
      });

      it('should set Content-Length header', async () => {
        const mockRequest = {
          user: { id: mockUserId },
        };

        await controller.downloadDocument(
          mockProjectId,
          mockDocumentId,
          mockRequest,
          mockResponse as Response,
        );

        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'Content-Length',
          mockFileBuffer.length,
        );
      });

      it('should send file buffer with 200 status', async () => {
        const mockRequest = {
          user: { id: mockUserId },
        };

        await controller.downloadDocument(
          mockProjectId,
          mockDocumentId,
          mockRequest,
          mockResponse as Response,
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.send).toHaveBeenCalledWith(mockFileBuffer);
      });

      it('should handle document with different MIME type', async () => {
        const imageDocument = {
          ...mockDocument,
          name: 'test-image.png',
          currentVersion: {
            ...mockDocument.currentVersion,
            mimeType: 'image/png',
          },
        };

        documentService.getDocument.mockResolvedValue(imageDocument as Document);

        const mockRequest = {
          user: { id: mockUserId },
        };

        await controller.downloadDocument(
          mockProjectId,
          mockDocumentId,
          mockRequest,
          mockResponse as Response,
        );

        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'Content-Type',
          'image/png',
        );
      });

      it('should handle documents without authenticated user', async () => {
        const mockRequest = {
          user: undefined,
        };

        await controller.downloadDocument(
          mockProjectId,
          mockDocumentId,
          mockRequest,
          mockResponse as Response,
        );

        // Should not call permission checks when no user
        expect(permissionService.getMemberByUserId).not.toHaveBeenCalled();
        expect(permissionService.enforcePermission).not.toHaveBeenCalled();

        // Should still fetch document and file
        expect(documentService.getDocument).toHaveBeenCalledWith(mockDocumentId);
        expect(s3Service.getObject).toHaveBeenCalledWith(mockS3Key, mockS3Bucket);
      });
    });

    describe('error handling', () => {
      beforeEach(() => {
        permissionService.getMemberByUserId.mockResolvedValue(undefined);
        permissionService.enforcePermission.mockResolvedValue(undefined);
      });

      it('should throw NotFoundException when document not found', async () => {
        documentService.getDocument.mockRejectedValue(
          new NotFoundException('Document not found'),
        );

        const mockRequest = {
          user: { id: mockUserId },
        };

        await expect(
          controller.downloadDocument(
            mockProjectId,
            mockDocumentId,
            mockRequest,
            mockResponse as Response,
          ),
        ).rejects.toThrow(NotFoundException);

        await expect(
          controller.downloadDocument(
            mockProjectId,
            mockDocumentId,
            mockRequest,
            mockResponse as Response,
          ),
        ).rejects.toThrow('Document not found');
      });

      it('should throw NotFoundException when document has no current version', async () => {
        const documentWithoutVersion = {
          ...mockDocument,
          currentVersion: null,
        };

        documentService.getDocument.mockResolvedValue(
          documentWithoutVersion as Document,
        );

        const mockRequest = {
          user: { id: mockUserId },
        };

        await expect(
          controller.downloadDocument(
            mockProjectId,
            mockDocumentId,
            mockRequest,
            mockResponse as Response,
          ),
        ).rejects.toThrow(NotFoundException);

        await expect(
          controller.downloadDocument(
            mockProjectId,
            mockDocumentId,
            mockRequest,
            mockResponse as Response,
          ),
        ).rejects.toThrow('Document version not found');
      });

      it('should propagate permission errors', async () => {
        permissionService.enforcePermission.mockRejectedValue(
          new Error('Permission denied'),
        );

        documentService.getDocument.mockResolvedValue(mockDocument as Document);

        const mockRequest = {
          user: { id: mockUserId },
        };

        await expect(
          controller.downloadDocument(
            mockProjectId,
            mockDocumentId,
            mockRequest,
            mockResponse as Response,
          ),
        ).rejects.toThrow('Permission denied');
      });

      it('should propagate S3 service errors', async () => {
        documentService.getDocument.mockResolvedValue(mockDocument as Document);
        s3Service.getObject.mockRejectedValue(new Error('S3 error: File not found'));

        const mockRequest = {
          user: { id: mockUserId },
        };

        await expect(
          controller.downloadDocument(
            mockProjectId,
            mockDocumentId,
            mockRequest,
            mockResponse as Response,
          ),
        ).rejects.toThrow('S3 error: File not found');
      });
    });

    describe('permission verification', () => {
      beforeEach(() => {
        documentService.getDocument.mockResolvedValue(mockDocument as Document);
        s3Service.getObject.mockResolvedValue(mockFileBuffer);
      });

      it('should verify user is project member', async () => {
        permissionService.getMemberByUserId.mockResolvedValue(undefined);
        permissionService.enforcePermission.mockResolvedValue(undefined);

        const mockRequest = {
          user: { id: mockUserId },
        };

        await controller.downloadDocument(
          mockProjectId,
          mockDocumentId,
          mockRequest,
          mockResponse as Response,
        );

        expect(permissionService.getMemberByUserId).toHaveBeenCalledWith(
          mockUserId,
          mockProjectId,
        );
      });

      it('should verify user has VIEW permission on document', async () => {
        permissionService.getMemberByUserId.mockResolvedValue(undefined);
        permissionService.enforcePermission.mockResolvedValue(undefined);

        const mockRequest = {
          user: { id: mockUserId },
        };

        await controller.downloadDocument(
          mockProjectId,
          mockDocumentId,
          mockRequest,
          mockResponse as Response,
        );

        expect(permissionService.enforcePermission).toHaveBeenCalledWith(
          mockUserId,
          mockDocumentId,
          DocumentAction.VIEW,
        );
      });

      it('should check project membership before checking document permission', async () => {
        const callOrder: string[] = [];

        permissionService.getMemberByUserId.mockImplementation(async () => {
          callOrder.push('memberCheck');
        });

        permissionService.enforcePermission.mockImplementation(async () => {
          callOrder.push('permissionCheck');
        });

        const mockRequest = {
          user: { id: mockUserId },
        };

        await controller.downloadDocument(
          mockProjectId,
          mockDocumentId,
          mockRequest,
          mockResponse as Response,
        );

        expect(callOrder).toEqual(['memberCheck', 'permissionCheck']);
      });
    });

    describe('edge cases', () => {
      beforeEach(() => {
        permissionService.getMemberByUserId.mockResolvedValue(undefined);
        permissionService.enforcePermission.mockResolvedValue(undefined);
        documentService.getDocument.mockResolvedValue(mockDocument as Document);
        s3Service.getObject.mockResolvedValue(mockFileBuffer);
      });

      it('should handle documents with special characters in filename', async () => {
        const documentWithSpecialChars = {
          ...mockDocument,
          name: 'test document (2024) [final].pdf',
        };

        documentService.getDocument.mockResolvedValue(
          documentWithSpecialChars as Document,
        );

        const mockRequest = {
          user: { id: mockUserId },
        };

        await controller.downloadDocument(
          mockProjectId,
          mockDocumentId,
          mockRequest,
          mockResponse as Response,
        );

        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'Content-Disposition',
          `inline; filename="test document (2024) [final].pdf"`,
        );
      });

      it('should sanitize documents with unicode characters in filename', async () => {
        const documentWithUnicode = {
          ...mockDocument,
          name: 'Relatório_Técnico_2024.pdf',
        };

        documentService.getDocument.mockResolvedValue(
          documentWithUnicode as Document,
        );

        const mockRequest = {
          user: { id: mockUserId },
        };

        await controller.downloadDocument(
          mockProjectId,
          mockDocumentId,
          mockRequest,
          mockResponse as Response,
        );

        // Unicode characters should be replaced with underscores for HTTP header compatibility
        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'Content-Disposition',
          `inline; filename="Relat_rio_T_cnico_2024.pdf"`,
        );
      });

      it('should sanitize filenames with special non-ASCII characters', async () => {
        const documentWithSpecialChars = {
          ...mockDocument,
          name: 'Structures and Classes â The Swift Programming Language (Swift 5.5).pdf',
        };

        documentService.getDocument.mockResolvedValue(
          documentWithSpecialChars as Document,
        );

        const mockRequest = {
          user: { id: mockUserId },
        };

        await controller.downloadDocument(
          mockProjectId,
          mockDocumentId,
          mockRequest,
          mockResponse as Response,
        );

        // The 'â' character (outside ASCII range 0x20-0x7E) should be replaced with underscore
        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'Content-Disposition',
          `inline; filename="Structures and Classes _ The Swift Programming Language (Swift 5.5).pdf"`,
        );
      });

      it('should handle empty file buffers', async () => {
        const emptyBuffer = Buffer.from('');
        s3Service.getObject.mockResolvedValue(emptyBuffer);

        const mockRequest = {
          user: { id: mockUserId },
        };

        await controller.downloadDocument(
          mockProjectId,
          mockDocumentId,
          mockRequest,
          mockResponse as Response,
        );

        expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Length', 0);
        expect(mockResponse.send).toHaveBeenCalledWith(emptyBuffer);
      });

      it('should handle large file buffers', async () => {
        const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
        s3Service.getObject.mockResolvedValue(largeBuffer);

        const mockRequest = {
          user: { id: mockUserId },
        };

        await controller.downloadDocument(
          mockProjectId,
          mockDocumentId,
          mockRequest,
          mockResponse as Response,
        );

        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'Content-Length',
          largeBuffer.length,
        );
        expect(mockResponse.send).toHaveBeenCalledWith(largeBuffer);
      });
    });
  });
});
