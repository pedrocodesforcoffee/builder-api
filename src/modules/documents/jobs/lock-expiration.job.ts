import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull, Not } from 'typeorm';
import { Document } from '../entities/document.entity';
import {
  DocumentLockHistory,
  LockAction,
} from '../entities/document-lock-history.entity';

/**
 * Lock Expiration Job
 *
 * Automatically unlocks documents whose lock has expired
 *
 * Runs every 5 minutes to:
 * - Find documents with expired locks
 * - Unlock them automatically
 * - Record the expiration in lock history
 *
 * This prevents documents from being indefinitely locked if users
 * forget to checkin or their session expires.
 */
@Injectable()
export class LockExpirationJob {
  private readonly logger = new Logger(LockExpirationJob.name);

  constructor(
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(DocumentLockHistory)
    private lockHistoryRepository: Repository<DocumentLockHistory>,
  ) {}

  /**
   * Run every 5 minutes to clean up expired locks
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiredLocks(): Promise<void> {
    try {
      const now = new Date();

      // Find all documents with expired locks
      const expiredDocs = await this.documentRepository.find({
        where: {
          isLocked: true,
          lockExpiresAt: LessThan(now),
          lockedById: Not(IsNull()),
        },
        relations: ['lockedBy'],
      });

      if (expiredDocs.length === 0) {
        this.logger.debug('No expired locks found');
        return;
      }

      this.logger.log(
        `Found ${expiredDocs.length} document(s) with expired locks`,
      );

      // Process each expired lock
      for (const doc of expiredDocs) {
        try {
          const previousLockHolder = doc.lockedById;
          const previousLockHolderName = doc.lockedBy
            ? `${doc.lockedBy.firstName} ${doc.lockedBy.lastName}`.trim()
            : 'Unknown';

          // Unlock document
          doc.isLocked = false;
          doc.lockedById = null;
          doc.lockedAt = null;
          const expiredAt = doc.lockExpiresAt;
          doc.lockExpiresAt = null;

          await this.documentRepository.save(doc);

          // Record in lock history
          const lockHistory = this.lockHistoryRepository.create({
            documentId: doc.id,
            action: LockAction.EXPIRED,
            userId: previousLockHolder!,
            userName: previousLockHolderName,
            ipAddress: null,
            userAgent: null,
            reason: 'Lock expired automatically',
            metadata: {
              previousLockHolder,
              expiredAt: expiredAt?.toISOString(),
              lockDuration: doc.lockedAt
                ? now.getTime() - new Date(doc.lockedAt).getTime()
                : undefined,
            },
          });

          await this.lockHistoryRepository.save(lockHistory);

          this.logger.log(
            `Unlocked document ${doc.id} (was locked by ${previousLockHolderName}, expired at ${expiredAt})`,
          );
        } catch (error) {
          this.logger.error(
            `Error unlocking document ${doc.id}:`,
            error instanceof Error ? error.stack : error,
          );
          // Continue with other documents even if one fails
        }
      }

      this.logger.log(
        `Successfully processed ${expiredDocs.length} expired lock(s)`,
      );
    } catch (error) {
      this.logger.error(
        'Error in lock expiration job:',
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /**
   * Manual trigger for testing or emergency cleanup
   */
  async forceCleanup(): Promise<number> {
    this.logger.log('Manual lock expiration cleanup triggered');
    await this.handleExpiredLocks();

    // Return count of cleaned up locks
    const count = await this.documentRepository.count({
      where: {
        isLocked: true,
        lockExpiresAt: LessThan(new Date()),
      },
    });

    return count;
  }
}
