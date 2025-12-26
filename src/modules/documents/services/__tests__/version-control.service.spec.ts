import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { VersionControlService } from '../version-control.service';
import { Document } from '../../entities/document.entity';
import { DocumentVersion } from '../../entities/document-version.entity';
import {
  DocumentLockHistory,
  LockAction,
} from '../../entities/document-lock-history.entity';
import { VersionDistribution } from '../../entities/version-distribution.entity';
import { VersionType } from '../../dto/version-control.dto';

describe('VersionControlService', () => {
  let service: VersionControlService;
  let documentRepository: jest.Mocked<Repository<Document>>;
  let versionRepository: jest.Mocked<Repository<DocumentVersion>>;
  let lockHistoryRepository: jest.Mocked<Repository<DocumentLockHistory>>;
  let distributionRepository: jest.Mocked<Repository<VersionDistribution>>;
  let dataSource: jest.Mocked<DataSource>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockDocumentId = '123e4567-e89b-12d3-a456-426614174001';
  const mockVersionId = '123e4567-e89b-12d3-a456-426614174002';
  const mockUserContext = {
    name: 'John Doe',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VersionControlService,
        {
          provide: getRepositoryToken(Document),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DocumentVersion),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DocumentLockHistory),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(VersionDistribution),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(() => ({
              connect: jest.fn(),
              startTransaction: jest.fn(),
              commitTransaction: jest.fn(),
              rollbackTransaction: jest.fn(),
              release: jest.fn(),
              manager: {
                save: jest.fn(),
                update: jest.fn(),
              },
            })),
          },
        },
      ],
    }).compile();

    service = module.get<VersionControlService>(VersionControlService);
    documentRepository = module.get(getRepositoryToken(Document));
    versionRepository = module.get(getRepositoryToken(DocumentVersion));
    lockHistoryRepository = module.get(getRepositoryToken(DocumentLockHistory));
    distributionRepository = module.get(getRepositoryToken(VersionDistribution));
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkout', () => {
    it('should successfully checkout an unlocked document', async () => {
      const mockDocument = {
        id: mockDocumentId,
        isLocked: false,
        lockedById: null,
        lockedAt: null,
        lockExpiresAt: null,
      } as Document;

      documentRepository.findOne.mockResolvedValue(mockDocument);
      documentRepository.save.mockResolvedValue(mockDocument);
      lockHistoryRepository.create.mockReturnValue({} as DocumentLockHistory);
      lockHistoryRepository.save.mockResolvedValue({} as DocumentLockHistory);

      const result = await service.checkout(
        mockDocumentId,
        mockUserId,
        { lockDurationMinutes: 30 },
        mockUserContext,
      );

      expect(result.success).toBe(true);
      expect(result.documentId).toBe(mockDocumentId);
      expect(result.lockExpiresAt).toBeInstanceOf(Date);
      expect(documentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isLocked: true,
          lockedById: mockUserId,
        }),
      );
      expect(lockHistoryRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if document does not exist', async () => {
      documentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.checkout(mockDocumentId, mockUserId, {}, mockUserContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if document is locked by another user', async () => {
      const otherUserId = '999e4567-e89b-12d3-a456-426614174999';
      const mockDocument = {
        id: mockDocumentId,
        isLocked: true,
        lockedById: otherUserId,
        lockExpiresAt: new Date(Date.now() + 3600000),
        lockedBy: {
          id: otherUserId,
          firstName: 'Jane',
          lastName: 'Doe',
        },
      } as Document;

      documentRepository.findOne.mockResolvedValue(mockDocument);

      await expect(
        service.checkout(mockDocumentId, mockUserId, {}, mockUserContext),
      ).rejects.toThrow(ConflictException);
    });

    it('should extend lock if already locked by same user', async () => {
      const mockDocument = {
        id: mockDocumentId,
        isLocked: true,
        lockedById: mockUserId,
        lockedAt: new Date(),
        lockExpiresAt: new Date(Date.now() + 1800000),
      } as Document;

      documentRepository.findOne.mockResolvedValue(mockDocument);
      documentRepository.save.mockResolvedValue(mockDocument);

      const result = await service.checkout(
        mockDocumentId,
        mockUserId,
        { lockDurationMinutes: 60 },
        mockUserContext,
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Lock extended successfully');
      expect(documentRepository.save).toHaveBeenCalled();
    });

    it('should auto-unlock expired locks', async () => {
      const mockDocument = {
        id: mockDocumentId,
        isLocked: true,
        lockedById: 'other-user-id',
        lockExpiresAt: new Date(Date.now() - 1000), // Expired
      } as Document;

      documentRepository.findOne.mockResolvedValue(mockDocument);
      documentRepository.save.mockResolvedValue(mockDocument);
      lockHistoryRepository.create.mockReturnValue({} as DocumentLockHistory);
      lockHistoryRepository.save.mockResolvedValue({} as DocumentLockHistory);

      const result = await service.checkout(
        mockDocumentId,
        mockUserId,
        {},
        mockUserContext,
      );

      expect(result.success).toBe(true);
      expect(lockHistoryRepository.save).toHaveBeenCalledTimes(2); // Expiration + checkout
    });
  });

  describe('checkin', () => {
    it('should successfully checkin a locked document', async () => {
      const mockDocument = {
        id: mockDocumentId,
        isLocked: true,
        lockedById: mockUserId,
        lockedAt: new Date(Date.now() - 600000),
        currentVersionId: mockVersionId,
      } as Document;

      const mockCurrentVersion = {
        id: mockVersionId,
        versionNumber: 2,
        versionLabel: '1.1',
        fileName: 'test.pdf',
        originalFileName: 'test.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
        s3Key: 'docs/test.pdf',
        s3Bucket: 'bucket',
      } as DocumentVersion;

      const mockNewVersion = {
        ...mockCurrentVersion,
        id: 'new-version-id',
        versionNumber: 3,
        versionLabel: '1.2',
      } as DocumentVersion;

      const queryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          save: jest.fn().mockResolvedValue(mockNewVersion),
          update: jest.fn(),
        },
      };

      documentRepository.findOne.mockResolvedValue(mockDocument);
      versionRepository.findOne.mockResolvedValue(mockCurrentVersion);
      versionRepository.create.mockReturnValue(mockNewVersion);
      dataSource.createQueryRunner.mockReturnValue(queryRunner as any);

      const result = await service.checkin(
        mockDocumentId,
        mockUserId,
        {
          comment: 'Updated document',
          versionType: VersionType.MINOR,
        },
        mockUserContext,
      );

      expect(result.success).toBe(true);
      expect(result.versionNumber).toBe(3);
      expect(result.versionLabel).toBe('1.2');
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should throw BadRequestException if document is not locked', async () => {
      const mockDocument = {
        id: mockDocumentId,
        isLocked: false,
      } as Document;

      documentRepository.findOne.mockResolvedValue(mockDocument);

      await expect(
        service.checkin(
          mockDocumentId,
          mockUserId,
          { comment: 'Test', versionType: VersionType.MINOR },
          mockUserContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if locked by another user', async () => {
      const mockDocument = {
        id: mockDocumentId,
        isLocked: true,
        lockedById: 'other-user-id',
      } as Document;

      documentRepository.findOne.mockResolvedValue(mockDocument);

      await expect(
        service.checkin(
          mockDocumentId,
          mockUserId,
          { comment: 'Test', versionType: VersionType.MINOR },
          mockUserContext,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should rollback transaction on error', async () => {
      const mockDocument = {
        id: mockDocumentId,
        isLocked: true,
        lockedById: mockUserId,
        currentVersionId: mockVersionId,
      } as Document;

      const queryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          save: jest.fn().mockRejectedValue(new Error('Database error')),
          update: jest.fn(),
        },
      };

      documentRepository.findOne.mockResolvedValue(mockDocument);
      versionRepository.findOne.mockResolvedValue({} as DocumentVersion);
      dataSource.createQueryRunner.mockReturnValue(queryRunner as any);

      await expect(
        service.checkin(
          mockDocumentId,
          mockUserId,
          { comment: 'Test', versionType: VersionType.MINOR },
          mockUserContext,
        ),
      ).rejects.toThrow();

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });

  describe('forceUnlock', () => {
    it('should successfully force unlock a locked document', async () => {
      const mockDocument = {
        id: mockDocumentId,
        isLocked: true,
        lockedById: 'other-user-id',
      } as Document;

      documentRepository.findOne.mockResolvedValue(mockDocument);
      documentRepository.save.mockResolvedValue({
        ...mockDocument,
        isLocked: false,
      });
      lockHistoryRepository.create.mockReturnValue({} as DocumentLockHistory);
      lockHistoryRepository.save.mockResolvedValue({} as DocumentLockHistory);

      const result = await service.forceUnlock(
        mockDocumentId,
        mockUserId,
        { reason: 'User on vacation' },
        mockUserContext,
      );

      expect(result.success).toBe(true);
      expect(result.previousLockHolder).toBe('other-user-id');
      expect(documentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isLocked: false,
          lockedById: null,
        }),
      );
    });

    it('should throw BadRequestException if document is not locked', async () => {
      const mockDocument = {
        id: mockDocumentId,
        isLocked: false,
      } as Document;

      documentRepository.findOne.mockResolvedValue(mockDocument);

      await expect(
        service.forceUnlock(
          mockDocumentId,
          mockUserId,
          { reason: 'Test' },
          mockUserContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('compareVersions', () => {
    it('should successfully compare two versions', async () => {
      const fromVersion = {
        id: 'version-1-id',
        versionNumber: 1,
        versionLabel: '1.0',
        originalFileName: 'test-v1.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
        checksumSHA256: 'hash1',
        metadata: { prop1: 'value1' },
      } as DocumentVersion;

      const toVersion = {
        id: 'version-2-id',
        versionNumber: 2,
        versionLabel: '1.1',
        originalFileName: 'test-v2.pdf',
        fileSize: 2000,
        mimeType: 'application/pdf',
        checksumSHA256: 'hash2',
        metadata: { prop1: 'value2', prop2: 'newvalue' },
      } as DocumentVersion;

      versionRepository.findOne
        .mockResolvedValueOnce(fromVersion)
        .mockResolvedValueOnce(toVersion);

      const result = await service.compareVersions(mockDocumentId, {
        fromVersionId: 'version-1-id',
        toVersionId: 'version-2-id',
      });

      expect(result.fromVersion).toBe(1);
      expect(result.toVersion).toBe(2);
      expect(result.differences.length).toBeGreaterThan(0);
      expect(result.differences).toContainEqual(
        expect.objectContaining({ field: 'fileName' }),
      );
      expect(result.differences).toContainEqual(
        expect.objectContaining({ field: 'fileSize' }),
      );
    });

    it('should throw NotFoundException if version not found', async () => {
      versionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.compareVersions(mockDocumentId, {
          fromVersionId: 'invalid-id',
          toVersionId: 'version-2-id',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('restoreVersion', () => {
    it('should restore version and create new version', async () => {
      const mockDocument = {
        id: mockDocumentId,
        isLocked: false,
        currentVersionId: 'current-version-id',
      } as Document;

      const versionToRestore = {
        id: 'old-version-id',
        versionNumber: 2,
        fileName: 'test-old.pdf',
        originalFileName: 'test-old.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
        s3Key: 'docs/test-old.pdf',
      } as DocumentVersion;

      const currentVersion = {
        id: 'current-version-id',
        versionNumber: 5,
      } as DocumentVersion;

      documentRepository.findOne.mockResolvedValue(mockDocument);
      versionRepository.findOne
        .mockResolvedValueOnce(versionToRestore)
        .mockResolvedValueOnce(currentVersion);
      versionRepository.create.mockReturnValue({
        ...versionToRestore,
        versionNumber: 6,
        id: 'new-version-id',
      } as DocumentVersion);
      versionRepository.save.mockResolvedValue({
        ...versionToRestore,
        versionNumber: 6,
        id: 'new-version-id',
      } as DocumentVersion);
      versionRepository.update.mockResolvedValue({} as any);
      documentRepository.save.mockResolvedValue(mockDocument);

      const result = await service.restoreVersion(
        mockDocumentId,
        mockUserId,
        {
          versionId: 'old-version-id',
          comment: 'Reverting changes',
          createNewVersion: true,
        },
        { name: 'John Doe' },
      );

      expect(result.success).toBe(true);
      expect(result.newVersionId).toBe('new-version-id');
      expect(versionRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if document is locked', async () => {
      const mockDocument = {
        id: mockDocumentId,
        isLocked: true,
        lockedById: 'other-user-id',
      } as Document;

      documentRepository.findOne.mockResolvedValue(mockDocument);

      await expect(
        service.restoreVersion(
          mockDocumentId,
          mockUserId,
          {
            versionId: 'version-id',
            comment: 'Test',
          },
          { name: 'John Doe' },
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getVersionHistory', () => {
    it('should return version history', async () => {
      const mockDocument = {
        id: mockDocumentId,
        currentVersionId: 'version-3-id',
      } as Document;

      const mockVersions = [
        {
          id: 'version-3-id',
          versionNumber: 3,
          versionLabel: '2.0',
          changeDescription: 'Major update',
          uploadedById: mockUserId,
          uploadedBy: { firstName: 'John', lastName: 'Doe' },
          uploadedAt: new Date(),
          fileSize: 3000,
        },
        {
          id: 'version-2-id',
          versionNumber: 2,
          versionLabel: '1.1',
          changeDescription: 'Minor update',
          uploadedById: mockUserId,
          uploadedBy: { firstName: 'John', lastName: 'Doe' },
          uploadedAt: new Date(),
          fileSize: 2000,
        },
      ] as DocumentVersion[];

      documentRepository.findOne.mockResolvedValue(mockDocument);
      versionRepository.find.mockResolvedValue(mockVersions);

      const result = await service.getVersionHistory(mockDocumentId);

      expect(result.documentId).toBe(mockDocumentId);
      expect(result.totalVersions).toBe(2);
      expect(result.currentVersion).toBe(3);
      expect(result.versions).toHaveLength(2);
      expect(result.versions[0].isCurrent).toBe(true);
    });
  });

  describe('getLockStatus', () => {
    it('should return lock status for locked document', async () => {
      const lockExpiresAt = new Date(Date.now() + 1800000); // 30 minutes
      const mockDocument = {
        id: mockDocumentId,
        isLocked: true,
        lockedById: 'other-user-id',
        lockedAt: new Date(),
        lockExpiresAt,
        lockedBy: { firstName: 'Jane', lastName: 'Doe' },
      } as Document;

      documentRepository.findOne.mockResolvedValue(mockDocument);

      const result = await service.getLockStatus(mockDocumentId, mockUserId);

      expect(result.isLocked).toBe(true);
      expect(result.lockedById).toBe('other-user-id');
      expect(result.lockedByName).toBe('Jane Doe');
      expect(result.lockExpiresInMinutes).toBeGreaterThan(0);
      expect(result.canUnlock).toBe(false);
    });

    it('should return unlocked status for unlocked document', async () => {
      const mockDocument = {
        id: mockDocumentId,
        isLocked: false,
      } as Document;

      documentRepository.findOne.mockResolvedValue(mockDocument);

      const result = await service.getLockStatus(mockDocumentId, mockUserId);

      expect(result.isLocked).toBe(false);
      expect(result.canUnlock).toBe(false);
    });
  });

  describe('recordDistribution', () => {
    it('should successfully record distribution', async () => {
      const mockVersion = {
        id: mockVersionId,
      } as DocumentVersion;

      const mockDistribution = {
        id: 'distribution-id',
      } as VersionDistribution;

      versionRepository.findOne.mockResolvedValue(mockVersion);
      distributionRepository.create.mockReturnValue(mockDistribution);
      distributionRepository.save.mockResolvedValue(mockDistribution);

      const result = await service.recordDistribution(
        {
          versionId: mockVersionId,
          distributionType: 'email',
          recipientId: 'recipient-id',
          recipientName: 'Recipient Name',
        },
        mockUserId,
        'John Doe',
        { ipAddress: '192.168.1.1' },
      );

      expect(result.success).toBe(true);
      expect(result.distributionId).toBe('distribution-id');
      expect(distributionRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if version not found', async () => {
      versionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.recordDistribution(
          {
            versionId: 'invalid-id',
            distributionType: 'email',
            recipientId: 'recipient-id',
            recipientName: 'Recipient',
          },
          mockUserId,
          'John Doe',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
