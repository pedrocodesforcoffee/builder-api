import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ShareLinkService } from '../share-link.service';
import { PermissionService } from '../permission.service';
import { S3Service } from '../../../../common/services/s3.service';
import { WatermarkService } from '../watermark.service';
import { ShareLink, Document, DocumentVersion } from '../../entities';
import { ShareLinkStatus, DocumentAction } from '../../enums/permission.enums';

describe('ShareLinkService', () => {
  let service: ShareLinkService;
  let shareLinkRepo: jest.Mocked<Repository<ShareLink>>;
  let documentRepo: jest.Mocked<Repository<Document>>;
  let s3Service: jest.Mocked<S3Service>;
  let watermarkService: jest.Mocked<WatermarkService>;
  let permissionService: jest.Mocked<PermissionService>;

  const mockShareLink: Partial<ShareLink> = {
    id: 'share-link-id',
    shortCode: 'test123',
    documentId: 'doc-id',
    status: ShareLinkStatus.ACTIVE,
    allowDownload: true,
    allowPrint: false,
    watermarkEnabled: true,
    passwordHash: null,
    requireEmail: false,
    allowedEmails: null,
    maxDownloads: null,
    downloadCount: 0,
    accessCount: 0,
    expiresAt: new Date(Date.now() + 86400000), // 1 day from now
    recipientName: 'Test Recipient',
    recipientCompany: 'Test Company',
    purpose: 'Testing',
    watermarkSettings: null,
    notifyOnAccess: false,
    lastAccessedAt: null,
    createdById: 'user-id',
    createdAt: new Date(),
  };

  const mockDocument: Partial<Document> = {
    id: 'doc-id',
    projectId: 'project-id',
    currentVersion: {
      id: 'version-id',
      documentId: 'doc-id',
      s3Key: 'test/document.pdf',
      originalFilename: 'test-document.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024,
      versionNumber: 1,
    } as DocumentVersion,
  };

  const mockFileBuffer = Buffer.from('test file content');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShareLinkService,
        {
          provide: getRepositoryToken(ShareLink),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Document),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: S3Service,
          useValue: {
            getObject: jest.fn(),
            getProductionBucket: jest.fn().mockReturnValue('builder-documents'),
          },
        },
        {
          provide: WatermarkService,
          useValue: {
            watermarkFile: jest.fn(),
            createShareLinkWatermarkSettings: jest.fn(),
          },
        },
        {
          provide: PermissionService,
          useValue: {
            enforcePermission: jest.fn(),
            logAccess: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ShareLinkService>(ShareLinkService);
    shareLinkRepo = module.get(getRepositoryToken(ShareLink));
    documentRepo = module.get(getRepositoryToken(Document));
    s3Service = module.get(S3Service);
    watermarkService = module.get(WatermarkService);
    permissionService = module.get(PermissionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('downloadViaShareLink', () => {
    const accessData = {
      password: undefined,
      email: 'test@example.com',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };

    it('should successfully download document via share link', async () => {
      // Arrange
      shareLinkRepo.findOne.mockResolvedValue(mockShareLink as ShareLink);
      shareLinkRepo.save.mockResolvedValue(mockShareLink as ShareLink);
      documentRepo.findOne.mockResolvedValue(mockDocument as Document);
      s3Service.getObject.mockResolvedValue(mockFileBuffer);
      watermarkService.createShareLinkWatermarkSettings.mockReturnValue({
        recipientEmail: accessData.email,
      });
      watermarkService.watermarkFile.mockResolvedValue(mockFileBuffer);

      // Act
      const result = await service.downloadViaShareLink(
        mockShareLink.shortCode!,
        accessData,
      );

      // Assert
      expect(result).toEqual({
        buffer: mockFileBuffer,
        filename: mockDocument.currentVersion!.originalFilename,
        mimeType: mockDocument.currentVersion!.mimeType,
      });
      expect(shareLinkRepo.findOne).toHaveBeenCalledWith({
        where: { shortCode: mockShareLink.shortCode },
      });
      expect(documentRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockShareLink.documentId },
        relations: ['currentVersion'],
      });
      expect(s3Service.getObject).toHaveBeenCalledWith(
        mockDocument.currentVersion!.s3Key,
        'builder-documents',
      );
      expect(shareLinkRepo.save).toHaveBeenCalled();
      expect(permissionService.logAccess).toHaveBeenCalled();
    });

    it('should throw NotFoundException when share link does not exist', async () => {
      // Arrange
      shareLinkRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.downloadViaShareLink('invalid-code', accessData),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when share link is not active', async () => {
      // Arrange
      const revokedShareLink = {
        ...mockShareLink,
        status: ShareLinkStatus.REVOKED,
      };
      shareLinkRepo.findOne.mockResolvedValue(revokedShareLink as ShareLink);

      // Act & Assert
      await expect(
        service.downloadViaShareLink(mockShareLink.shortCode!, accessData),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when share link has expired', async () => {
      // Arrange
      const expiredShareLink = {
        ...mockShareLink,
        expiresAt: new Date(Date.now() - 1000), // expired
      };
      shareLinkRepo.findOne.mockResolvedValue(expiredShareLink as ShareLink);
      shareLinkRepo.save.mockResolvedValue(expiredShareLink as ShareLink);

      // Act & Assert
      await expect(
        service.downloadViaShareLink(mockShareLink.shortCode!, accessData),
      ).rejects.toThrow(ForbiddenException);

      // Verify status was updated to EXPIRED
      expect(shareLinkRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ShareLinkStatus.EXPIRED,
        }),
      );
    });

    it('should throw UnauthorizedException when password is required but not provided', async () => {
      // Arrange
      const passwordProtectedLink = {
        ...mockShareLink,
        passwordHash: 'hashed-password',
      };
      shareLinkRepo.findOne.mockResolvedValue(
        passwordProtectedLink as ShareLink,
      );

      // Act & Assert
      await expect(
        service.downloadViaShareLink(mockShareLink.shortCode!, {
          ...accessData,
          password: undefined,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when email is required but not provided', async () => {
      // Arrange
      const emailRequiredLink = {
        ...mockShareLink,
        requireEmail: true,
      };
      shareLinkRepo.findOne.mockResolvedValue(emailRequiredLink as ShareLink);

      // Act & Assert
      await expect(
        service.downloadViaShareLink(mockShareLink.shortCode!, {
          ...accessData,
          email: undefined,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when email is not in allowed list', async () => {
      // Arrange
      const restrictedEmailLink = {
        ...mockShareLink,
        allowedEmails: ['allowed@example.com'],
      };
      shareLinkRepo.findOne.mockResolvedValue(restrictedEmailLink as ShareLink);

      // Act & Assert
      await expect(
        service.downloadViaShareLink(mockShareLink.shortCode!, {
          ...accessData,
          email: 'notallowed@example.com',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when download limit is exceeded', async () => {
      // Arrange
      const limitedLink = {
        ...mockShareLink,
        maxDownloads: 5,
        downloadCount: 5,
      };
      shareLinkRepo.findOne.mockResolvedValue(limitedLink as ShareLink);
      shareLinkRepo.save.mockResolvedValue(limitedLink as ShareLink);

      // Act & Assert
      await expect(
        service.downloadViaShareLink(mockShareLink.shortCode!, accessData),
      ).rejects.toThrow(ForbiddenException);

      // Verify status was updated to EXHAUSTED
      expect(shareLinkRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ShareLinkStatus.EXHAUSTED,
        }),
      );
    });

    it('should throw ForbiddenException when IP address is not allowed', async () => {
      // Arrange
      const ipRestrictedLink = {
        ...mockShareLink,
        allowedIpRanges: ['10.0.0.*', '192.168.0.1'],
      };
      shareLinkRepo.findOne.mockResolvedValue(ipRestrictedLink as ShareLink);

      // Act & Assert
      await expect(
        service.downloadViaShareLink(mockShareLink.shortCode!, {
          ...accessData,
          ipAddress: '192.168.1.1', // not in allowed range
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when download is not allowed', async () => {
      // Arrange
      const noDownloadLink = {
        ...mockShareLink,
        allowDownload: false,
      };
      shareLinkRepo.findOne.mockResolvedValue(noDownloadLink as ShareLink);
      shareLinkRepo.save.mockResolvedValue(noDownloadLink as ShareLink);

      // Act & Assert
      await expect(
        service.downloadViaShareLink(mockShareLink.shortCode!, accessData),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when document does not exist', async () => {
      // Arrange
      shareLinkRepo.findOne.mockResolvedValue(mockShareLink as ShareLink);
      shareLinkRepo.save.mockResolvedValue(mockShareLink as ShareLink);
      documentRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.downloadViaShareLink(mockShareLink.shortCode!, accessData),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when document version does not exist', async () => {
      // Arrange
      const docWithoutVersion = {
        ...mockDocument,
        currentVersion: null,
      };
      shareLinkRepo.findOne.mockResolvedValue(mockShareLink as ShareLink);
      shareLinkRepo.save.mockResolvedValue(mockShareLink as ShareLink);
      documentRepo.findOne.mockResolvedValue(docWithoutVersion as Document);

      // Act & Assert
      await expect(
        service.downloadViaShareLink(mockShareLink.shortCode!, accessData),
      ).rejects.toThrow(NotFoundException);
    });

    it('should apply watermark when watermark is enabled', async () => {
      // Arrange
      const watermarkedBuffer = Buffer.from('watermarked content');
      shareLinkRepo.findOne.mockResolvedValue(mockShareLink as ShareLink);
      shareLinkRepo.save.mockResolvedValue(mockShareLink as ShareLink);
      documentRepo.findOne.mockResolvedValue(mockDocument as Document);
      s3Service.getObject.mockResolvedValue(mockFileBuffer);
      watermarkService.createShareLinkWatermarkSettings.mockReturnValue({
        recipientEmail: accessData.email,
      });
      watermarkService.watermarkFile.mockResolvedValue(watermarkedBuffer);

      // Act
      const result = await service.downloadViaShareLink(
        mockShareLink.shortCode!,
        accessData,
      );

      // Assert
      expect(result.buffer).toBe(watermarkedBuffer);
      expect(watermarkService.watermarkFile).toHaveBeenCalledWith(
        mockFileBuffer,
        mockDocument.currentVersion!.mimeType,
        expect.objectContaining({
          recipientEmail: accessData.email,
        }),
      );
    });

    it('should not apply watermark when watermark is disabled', async () => {
      // Arrange
      const noWatermarkLink = {
        ...mockShareLink,
        watermarkEnabled: false,
      };
      shareLinkRepo.findOne.mockResolvedValue(noWatermarkLink as ShareLink);
      shareLinkRepo.save.mockResolvedValue(noWatermarkLink as ShareLink);
      documentRepo.findOne.mockResolvedValue(mockDocument as Document);
      s3Service.getObject.mockResolvedValue(mockFileBuffer);

      // Act
      const result = await service.downloadViaShareLink(
        mockShareLink.shortCode!,
        accessData,
      );

      // Assert
      expect(result.buffer).toBe(mockFileBuffer);
      expect(watermarkService.watermarkFile).not.toHaveBeenCalled();
    });

    it('should gracefully handle watermark errors and return original file', async () => {
      // Arrange
      shareLinkRepo.findOne.mockResolvedValue(mockShareLink as ShareLink);
      shareLinkRepo.save.mockResolvedValue(mockShareLink as ShareLink);
      documentRepo.findOne.mockResolvedValue(mockDocument as Document);
      s3Service.getObject.mockResolvedValue(mockFileBuffer);
      watermarkService.createShareLinkWatermarkSettings.mockReturnValue({
        recipientEmail: accessData.email,
      });
      watermarkService.watermarkFile.mockRejectedValue(
        new Error('Watermark failed'),
      );

      // Act
      const result = await service.downloadViaShareLink(
        mockShareLink.shortCode!,
        accessData,
      );

      // Assert
      expect(result.buffer).toBe(mockFileBuffer);
    });

    it('should increment download count and access count', async () => {
      // Arrange
      shareLinkRepo.findOne.mockResolvedValue(mockShareLink as ShareLink);
      shareLinkRepo.save.mockResolvedValue(mockShareLink as ShareLink);
      documentRepo.findOne.mockResolvedValue(mockDocument as Document);
      s3Service.getObject.mockResolvedValue(mockFileBuffer);
      watermarkService.createShareLinkWatermarkSettings.mockReturnValue({
        recipientEmail: accessData.email,
      });
      watermarkService.watermarkFile.mockResolvedValue(mockFileBuffer);

      // Act
      await service.downloadViaShareLink(mockShareLink.shortCode!, accessData);

      // Assert
      expect(shareLinkRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          downloadCount: 1,
          accessCount: 1,
        }),
      );
    });

    it('should log download access with correct details', async () => {
      // Arrange
      shareLinkRepo.findOne.mockResolvedValue(mockShareLink as ShareLink);
      shareLinkRepo.save.mockResolvedValue(mockShareLink as ShareLink);
      documentRepo.findOne.mockResolvedValue(mockDocument as Document);
      s3Service.getObject.mockResolvedValue(mockFileBuffer);
      watermarkService.createShareLinkWatermarkSettings.mockReturnValue({
        recipientEmail: accessData.email,
      });
      watermarkService.watermarkFile.mockResolvedValue(mockFileBuffer);

      // Act
      await service.downloadViaShareLink(mockShareLink.shortCode!, accessData);

      // Assert
      expect(permissionService.logAccess).toHaveBeenCalledWith({
        documentId: mockShareLink.documentId,
        versionId: mockDocument.currentVersion!.id,
        action: DocumentAction.DOWNLOAD,
        shareLinkId: mockShareLink.id,
        externalEmail: accessData.email,
        ipAddress: accessData.ipAddress,
        userAgent: accessData.userAgent,
        details: {
          success: true,
          watermarkApplied: true,
          downloadFormat: mockDocument.currentVersion!.mimeType,
        },
      });
    });

    it('should allow IP addresses matching wildcard patterns', async () => {
      // Arrange
      const ipRestrictedLink = {
        ...mockShareLink,
        allowedIpRanges: ['192.168.*'],
      };
      shareLinkRepo.findOne.mockResolvedValue(ipRestrictedLink as ShareLink);
      shareLinkRepo.save.mockResolvedValue(ipRestrictedLink as ShareLink);
      documentRepo.findOne.mockResolvedValue(mockDocument as Document);
      s3Service.getObject.mockResolvedValue(mockFileBuffer);
      watermarkService.createShareLinkWatermarkSettings.mockReturnValue({
        recipientEmail: accessData.email,
      });
      watermarkService.watermarkFile.mockResolvedValue(mockFileBuffer);

      // Act
      const result = await service.downloadViaShareLink(
        mockShareLink.shortCode!,
        {
          ...accessData,
          ipAddress: '192.168.1.100',
        },
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.buffer).toBe(mockFileBuffer);
    });
  });
});
