import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { DocumentUpload, UploadStatus } from '../entities/document-upload.entity';
import { S3Service } from '../../../common/services/s3.service';

/**
 * Upload Cleanup Job
 *
 * Scheduled job to clean up expired or abandoned uploads.
 * Runs daily at 2 AM to remove:
 * - Failed uploads older than 7 days
 * - Pending uploads older than 24 hours
 * - Associated S3 files
 */
@Injectable()
export class UploadCleanupJob {
  private readonly logger = new Logger(UploadCleanupJob.name);

  // Retention periods
  private readonly FAILED_UPLOAD_RETENTION_DAYS = 7;
  private readonly PENDING_UPLOAD_RETENTION_HOURS = 24;

  constructor(
    @InjectRepository(DocumentUpload)
    private uploadRepository: Repository<DocumentUpload>,
    private s3Service: S3Service,
  ) {}

  /**
   * Clean up expired uploads
   * Runs daily at 2 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleUploadCleanup(): Promise<void> {
    this.logger.log('Starting upload cleanup job');

    try {
      const startTime = Date.now();
      let totalCleaned = 0;

      // Clean up failed uploads
      const failedCleaned = await this.cleanupFailedUploads();
      totalCleaned += failedCleaned;

      // Clean up pending uploads
      const pendingCleaned = await this.cleanupPendingUploads();
      totalCleaned += pendingCleaned;

      const duration = Date.now() - startTime;
      this.logger.log(
        `Upload cleanup completed: ${totalCleaned} uploads cleaned in ${duration}ms`,
      );
    } catch (error: any) {
      this.logger.error('Error during upload cleanup:', error.stack);
    }
  }

  /**
   * Clean up failed uploads older than retention period
   */
  private async cleanupFailedUploads(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.FAILED_UPLOAD_RETENTION_DAYS);

    this.logger.log(
      `Cleaning up failed uploads older than ${this.FAILED_UPLOAD_RETENTION_DAYS} days (before ${cutoffDate.toISOString()})`,
    );

    try {
      // Find expired failed uploads
      const expiredUploads = await this.uploadRepository.find({
        where: {
          status: UploadStatus.FAILED,
          createdAt: LessThan(cutoffDate),
        },
      });

      if (expiredUploads.length === 0) {
        this.logger.log('No expired failed uploads found');
        return 0;
      }

      this.logger.log(`Found ${expiredUploads.length} expired failed uploads`);

      // Delete S3 files and database records
      let cleaned = 0;
      for (const upload of expiredUploads) {
        try {
          // Delete from S3 if exists
          if (upload.s3Key) {
            await this.s3Service.deleteObject(upload.s3Key);
            this.logger.debug(`Deleted S3 file: ${upload.s3Key}`);
          }

          // Delete upload record (version will be cascade deleted)
          await this.uploadRepository.remove(upload);
          cleaned++;
        } catch (error: any) {
          this.logger.error(
            `Error cleaning up failed upload ${upload.id}:`,
            error.message,
          );
        }
      }

      this.logger.log(`Cleaned up ${cleaned} failed uploads`);
      return cleaned;
    } catch (error: any) {
      this.logger.error('Error cleaning up failed uploads:', error.stack);
      return 0;
    }
  }

  /**
   * Clean up pending uploads older than retention period
   */
  private async cleanupPendingUploads(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setHours(
      cutoffDate.getHours() - this.PENDING_UPLOAD_RETENTION_HOURS,
    );

    this.logger.log(
      `Cleaning up pending uploads older than ${this.PENDING_UPLOAD_RETENTION_HOURS} hours (before ${cutoffDate.toISOString()})`,
    );

    try {
      // Find expired pending uploads (not initiated or not completed)
      const expiredUploads = await this.uploadRepository.find({
        where: [
          {
            status: UploadStatus.INITIATED,
            createdAt: LessThan(cutoffDate),
          },
          {
            status: UploadStatus.UPLOADING,
            createdAt: LessThan(cutoffDate),
          },
        ],
      });

      if (expiredUploads.length === 0) {
        this.logger.log('No expired pending uploads found');
        return 0;
      }

      this.logger.log(`Found ${expiredUploads.length} expired pending uploads`);

      // Delete S3 files and database records
      let cleaned = 0;
      for (const upload of expiredUploads) {
        try {
          // For multipart uploads, abort the upload
          if (upload.s3UploadId && upload.s3Key) {
            try {
              await this.s3Service.abortMultipartUpload(
                upload.s3Key,
                upload.s3UploadId,
              );
              this.logger.debug(
                `Aborted multipart upload: ${upload.s3UploadId}`,
              );
            } catch (error: any) {
              // Ignore if already completed or doesn't exist
              this.logger.debug(
                `Could not abort multipart upload ${upload.s3UploadId}: ${error.message}`,
              );
            }
          }

          // Delete from S3 if any parts were uploaded
          if (upload.s3Key) {
            try {
              await this.s3Service.deleteObject(upload.s3Key);
              this.logger.debug(`Deleted S3 file: ${upload.s3Key}`);
            } catch (error: any) {
              // Ignore if doesn't exist
              this.logger.debug(
                `Could not delete S3 file ${upload.s3Key}: ${error.message}`,
              );
            }
          }

          // Delete upload record
          await this.uploadRepository.remove(upload);
          cleaned++;
        } catch (error: any) {
          this.logger.error(
            `Error cleaning up pending upload ${upload.id}:`,
            error.message,
          );
        }
      }

      this.logger.log(`Cleaned up ${cleaned} pending uploads`);
      return cleaned;
    } catch (error: any) {
      this.logger.error('Error cleaning up pending uploads:', error.stack);
      return 0;
    }
  }

  /**
   * Manual cleanup trigger (for testing or maintenance)
   */
  async triggerManualCleanup(): Promise<{
    success: boolean;
    totalCleaned: number;
    failedCleaned: number;
    pendingCleaned: number;
  }> {
    this.logger.log('Manual cleanup triggered');

    try {
      const failedCleaned = await this.cleanupFailedUploads();
      const pendingCleaned = await this.cleanupPendingUploads();
      const totalCleaned = failedCleaned + pendingCleaned;

      return {
        success: true,
        totalCleaned,
        failedCleaned,
        pendingCleaned,
      };
    } catch (error: any) {
      this.logger.error('Error during manual cleanup:', error.stack);
      return {
        success: false,
        totalCleaned: 0,
        failedCleaned: 0,
        pendingCleaned: 0,
      };
    }
  }
}
