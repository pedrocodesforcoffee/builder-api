import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProjectExportService } from '../services/project-export.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExportJob } from '../entities/export-job.entity';
import { ExportStatus } from '../enums/export-status.enum';

/**
 * Export Processing Job
 *
 * Background job that processes pending export jobs
 */
@Injectable()
export class ExportProcessingJob {
  private readonly logger = new Logger(ExportProcessingJob.name);

  constructor(
    @InjectRepository(ExportJob)
    private readonly exportJobRepository: Repository<ExportJob>,
    private readonly projectExportService: ProjectExportService,
  ) {}

  /**
   * Process pending export jobs every 5 minutes
   */
  @Cron('*/5 * * * *')
  async handlePendingExports(): Promise<void> {
    try {
      this.logger.debug('Checking for pending export jobs...');

      // Find pending export jobs
      const pendingJobs = await this.exportJobRepository.find({
        where: {
          status: ExportStatus.PENDING,
        },
        order: {
          createdAt: 'ASC',
        },
        take: 5, // Process up to 5 jobs at a time
      });

      if (pendingJobs.length === 0) {
        return;
      }

      this.logger.log(`Processing ${pendingJobs.length} pending export jobs`);

      // Process each job
      for (const job of pendingJobs) {
        try {
          await this.projectExportService.processExport(job.id);
          this.logger.log(`Successfully processed export job ${job.id}`);
        } catch (error) {
          this.logger.error(
            `Failed to process export job ${job.id}: ${(error as Error).message}`,
            (error as Error).stack,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in export processing job: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  /**
   * Clean up expired exports daily at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredExports(): Promise<void> {
    try {
      this.logger.debug('Cleaning up expired exports...');
      await this.projectExportService.cleanupExpiredExports();
      this.logger.log('Successfully cleaned up expired exports');
    } catch (error) {
      this.logger.error(
        `Error cleaning up expired exports: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  /**
   * Retry failed export jobs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleFailedExports(): Promise<void> {
    try {
      this.logger.debug('Checking for failed export jobs to retry...');

      // Find failed jobs that are less than 24 hours old
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const failedJobs = await this.exportJobRepository.find({
        where: {
          status: ExportStatus.FAILED,
          createdAt: oneDayAgo,
        },
        take: 3, // Retry up to 3 jobs at a time
      });

      if (failedJobs.length === 0) {
        return;
      }

      this.logger.log(`Retrying ${failedJobs.length} failed export jobs`);

      for (const job of failedJobs) {
        try {
          // Reset status to pending for retry
          await this.exportJobRepository.update(job.id, {
            status: ExportStatus.PENDING,
            error: undefined,
          });

          await this.projectExportService.processExport(job.id);
          this.logger.log(`Successfully retried export job ${job.id}`);
        } catch (error) {
          this.logger.error(
            `Failed to retry export job ${job.id}: ${(error as Error).message}`,
            (error as Error).stack,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error retrying failed exports: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}