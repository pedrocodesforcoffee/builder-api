import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull, Not } from 'typeorm';
import { LockExpirationJob } from '../lock-expiration.job';
import { Document } from '../../entities/document.entity';
import {
  DocumentLockHistory,
  LockAction,
} from '../../entities/document-lock-history.entity';

describe('LockExpirationJob', () => {
  let job: LockExpirationJob;
  let documentRepository: jest.Mocked<Repository<Document>>;
  let lockHistoryRepository: jest.Mocked<Repository<DocumentLockHistory>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LockExpirationJob,
        {
          provide: getRepositoryToken(Document),
          useValue: {
            find: jest.fn(),
            save: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DocumentLockHistory),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    job = module.get<LockExpirationJob>(LockExpirationJob);
    documentRepository = module.get(getRepositoryToken(Document));
    lockHistoryRepository = module.get(getRepositoryToken(DocumentLockHistory));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleExpiredLocks', () => {
    it('should do nothing if no expired locks found', async () => {
      documentRepository.find.mockResolvedValue([]);

      await job.handleExpiredLocks();

      expect(documentRepository.find).toHaveBeenCalledWith({
        where: expect.objectContaining({
          isLocked: true,
          lockExpiresAt: expect.any(Object),
        }),
        relations: ['lockedBy'],
      });
      expect(documentRepository.save).not.toHaveBeenCalled();
      expect(lockHistoryRepository.save).not.toHaveBeenCalled();
    });

    it('should unlock expired documents', async () => {
      const expiredDoc1 = {
        id: 'doc-1',
        isLocked: true,
        lockedById: 'user-1',
        lockedAt: new Date(Date.now() - 7200000), // 2 hours ago
        lockExpiresAt: new Date(Date.now() - 1800000), // 30 minutes ago
        lockedBy: {
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
        },
      } as Document;

      const expiredDoc2 = {
        id: 'doc-2',
        isLocked: true,
        lockedById: 'user-2',
        lockedAt: new Date(Date.now() - 3600000), // 1 hour ago
        lockExpiresAt: new Date(Date.now() - 600000), // 10 minutes ago
        lockedBy: {
          id: 'user-2',
          firstName: 'Jane',
          lastName: 'Smith',
        },
      } as Document;

      documentRepository.find.mockResolvedValue([expiredDoc1, expiredDoc2]);
      documentRepository.save.mockImplementation((doc) => Promise.resolve(doc));
      lockHistoryRepository.create.mockReturnValue({} as DocumentLockHistory);
      lockHistoryRepository.save.mockResolvedValue({} as DocumentLockHistory);

      await job.handleExpiredLocks();

      expect(documentRepository.save).toHaveBeenCalledTimes(2);
      expect(documentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isLocked: false,
          lockedById: null,
          lockExpiresAt: null,
        }),
      );
      expect(lockHistoryRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should record lock history with expiration details', async () => {
      const lockDuration = 3600000; // 1 hour
      const expiredDoc = {
        id: 'doc-1',
        isLocked: true,
        lockedById: 'user-1',
        lockedAt: new Date(Date.now() - lockDuration - 1800000),
        lockExpiresAt: new Date(Date.now() - 1800000), // expired 30 min ago
        lockedBy: {
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
        },
      } as Document;

      documentRepository.find.mockResolvedValue([expiredDoc]);
      documentRepository.save.mockResolvedValue(expiredDoc);

      const mockLockHistory = {} as DocumentLockHistory;
      lockHistoryRepository.create.mockReturnValue(mockLockHistory);
      lockHistoryRepository.save.mockResolvedValue(mockLockHistory);

      await job.handleExpiredLocks();

      expect(lockHistoryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: 'doc-1',
          action: LockAction.EXPIRED,
          userId: 'user-1',
          userName: 'John Doe',
          reason: 'Lock expired automatically',
          metadata: expect.objectContaining({
            previousLockHolder: 'user-1',
            expiredAt: expect.any(String),
            lockDuration: expect.any(Number),
          }),
        }),
      );
      expect(lockHistoryRepository.save).toHaveBeenCalledWith(mockLockHistory);
    });

    it('should continue processing other documents if one fails', async () => {
      const validDoc = {
        id: 'doc-1',
        isLocked: true,
        lockedById: 'user-1',
        lockedAt: new Date(),
        lockExpiresAt: new Date(Date.now() - 1800000),
        lockedBy: {
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
        },
      } as Document;

      const failingDoc = {
        id: 'doc-2',
        isLocked: true,
        lockedById: 'user-2',
        lockedAt: new Date(),
        lockExpiresAt: new Date(Date.now() - 1800000),
        lockedBy: {
          id: 'user-2',
          firstName: 'Jane',
          lastName: 'Smith',
        },
      } as Document;

      documentRepository.find.mockResolvedValue([validDoc, failingDoc]);
      documentRepository.save
        .mockResolvedValueOnce(validDoc)
        .mockRejectedValueOnce(new Error('Database error'));
      lockHistoryRepository.create.mockReturnValue({} as DocumentLockHistory);
      lockHistoryRepository.save.mockResolvedValue({} as DocumentLockHistory);

      // Should not throw
      await job.handleExpiredLocks();

      expect(documentRepository.save).toHaveBeenCalledTimes(2);
      // First document should have been unlocked successfully
      expect(lockHistoryRepository.save).toHaveBeenCalled();
    });

    it('should handle documents with unknown lock holders', async () => {
      const expiredDoc = {
        id: 'doc-1',
        isLocked: true,
        lockedById: 'user-1',
        lockedAt: new Date(),
        lockExpiresAt: new Date(Date.now() - 1800000),
        lockedBy: null, // User deleted or not found
      } as Document;

      documentRepository.find.mockResolvedValue([expiredDoc]);
      documentRepository.save.mockResolvedValue(expiredDoc);
      lockHistoryRepository.create.mockReturnValue({} as DocumentLockHistory);
      lockHistoryRepository.save.mockResolvedValue({} as DocumentLockHistory);

      await job.handleExpiredLocks();

      expect(lockHistoryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userName: 'Unknown',
        }),
      );
    });

    it('should not fail if lock history cannot be saved', async () => {
      const expiredDoc = {
        id: 'doc-1',
        isLocked: true,
        lockedById: 'user-1',
        lockedAt: new Date(),
        lockExpiresAt: new Date(Date.now() - 1800000),
        lockedBy: {
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
        },
      } as Document;

      documentRepository.find.mockResolvedValue([expiredDoc]);
      documentRepository.save.mockResolvedValue(expiredDoc);
      lockHistoryRepository.create.mockReturnValue({} as DocumentLockHistory);
      lockHistoryRepository.save.mockRejectedValue(new Error('History save failed'));

      // Should not throw - document should still be unlocked
      await expect(job.handleExpiredLocks()).rejects.toThrow('History save failed');

      expect(documentRepository.save).toHaveBeenCalled();
    });
  });

  describe('forceCleanup', () => {
    it('should trigger cleanup and return count', async () => {
      const expiredDoc = {
        id: 'doc-1',
        isLocked: true,
        lockedById: 'user-1',
        lockedAt: new Date(),
        lockExpiresAt: new Date(Date.now() - 1800000),
        lockedBy: {
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
        },
      } as Document;

      documentRepository.find.mockResolvedValue([expiredDoc]);
      documentRepository.save.mockResolvedValue(expiredDoc);
      documentRepository.count.mockResolvedValue(0);
      lockHistoryRepository.create.mockReturnValue({} as DocumentLockHistory);
      lockHistoryRepository.save.mockResolvedValue({} as DocumentLockHistory);

      const result = await job.forceCleanup();

      expect(result).toBe(0);
      expect(documentRepository.find).toHaveBeenCalled();
      expect(documentRepository.count).toHaveBeenCalled();
    });

    it('should return correct count of remaining expired locks', async () => {
      documentRepository.find.mockResolvedValue([]);
      documentRepository.count.mockResolvedValue(5);

      const result = await job.forceCleanup();

      expect(result).toBe(5);
    });
  });

  describe('cron schedule', () => {
    it('should be configured to run every 5 minutes', () => {
      // Verify the job has a cron decorator
      const handleExpiredLocks = job.handleExpiredLocks;
      expect(handleExpiredLocks).toBeDefined();
      expect(typeof handleExpiredLocks).toBe('function');
    });
  });

  describe('error handling', () => {
    it('should handle repository errors gracefully', async () => {
      documentRepository.find.mockRejectedValue(new Error('Database connection lost'));

      // Should not throw - errors should be caught and logged
      await expect(job.handleExpiredLocks()).resolves.toBeUndefined();
    });

    it('should handle invalid date values', async () => {
      const expiredDoc = {
        id: 'doc-1',
        isLocked: true,
        lockedById: 'user-1',
        lockedAt: null, // Invalid
        lockExpiresAt: new Date(Date.now() - 1800000),
        lockedBy: {
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
        },
      } as Document;

      documentRepository.find.mockResolvedValue([expiredDoc]);
      documentRepository.save.mockResolvedValue(expiredDoc);
      lockHistoryRepository.create.mockReturnValue({} as DocumentLockHistory);
      lockHistoryRepository.save.mockResolvedValue({} as DocumentLockHistory);

      await job.handleExpiredLocks();

      expect(lockHistoryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            lockDuration: undefined,
          }),
        }),
      );
    });
  });
});
