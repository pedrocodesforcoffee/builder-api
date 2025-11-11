/**
 * Expiration Scheduler Service
 *
 * Scheduled job for processing expiration notifications
 * Runs daily to check for expiring memberships and send notifications
 *
 * NOTE: To enable scheduled execution, install @nestjs/schedule:
 *   npm install @nestjs/schedule
 *
 * Then uncomment the @Cron decorator and import, and add ScheduleModule to app.module.ts
 */

import { Injectable, Logger } from '@nestjs/common';
// import { Cron, CronExpression } from '@nestjs/schedule';
import { ExpirationNotificationService } from './expiration-notification.service';

/**
 * Expiration Scheduler Service
 *
 * Handles scheduled processing of expiration notifications
 */
@Injectable()
export class ExpirationSchedulerService {
  private readonly logger = new Logger(ExpirationSchedulerService.name);
  private isProcessing = false;

  constructor(
    private readonly notificationService: ExpirationNotificationService,
  ) {}

  /**
   * Daily cron job to process expiration notifications
   * Runs every day at 9:00 AM
   *
   * To customize the schedule, modify the cron expression:
   * - Every day at 9 AM: '0 9 * * *'
   * - Every day at midnight: '0 0 * * *'
   * - Every 12 hours: '0 */12 * * *'
   * - Every hour: '0 * * * *'
   *
   * NOTE: Uncomment @Cron decorator after installing @nestjs/schedule
   */
  // @Cron('0 9 * * *', {
  //   name: 'processExpirationNotifications',
  //   timeZone: 'America/Los_Angeles', // Adjust to your timezone
  // })
  async handleExpirationNotifications(): Promise<void> {
    // Prevent overlapping executions
    if (this.isProcessing) {
      this.logger.warn(
        'Expiration notification processing already in progress, skipping...',
      );
      return;
    }

    this.isProcessing = true;

    try {
      this.logger.log('Starting scheduled expiration notification processing');

      const startTime = Date.now();

      const result =
        await this.notificationService.processAllExpirationNotifications();

      const duration = Date.now() - startTime;

      this.logger.log(
        `Expiration notification processing completed in ${duration}ms`,
      );
      this.logger.log(
        `Results: ${result.warningNotifications} warnings, ${result.finalNotifications} finals, ${result.expiredNotifications} expired`,
      );

      if (result.errors.length > 0) {
        this.logger.error(
          `Encountered ${result.errors.length} errors during processing`,
        );
        result.errors.forEach((error) => {
          this.logger.error(
            `Error for user ${error.userId} in project ${error.projectId}: ${error.error}`,
          );
        });
      }
    } catch (error) {
      this.logger.error('Failed to process expiration notifications:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Manual trigger for expiration notification processing
   * Can be called via API endpoint for testing or manual execution
   *
   * @returns Notification batch result
   */
  async triggerExpirationNotifications(): Promise<any> {
    if (this.isProcessing) {
      throw new Error('Expiration notification processing already in progress');
    }

    this.logger.log('Manually triggering expiration notification processing');

    this.isProcessing = true;

    try {
      const result =
        await this.notificationService.processAllExpirationNotifications();

      this.logger.log('Manual expiration notification processing completed');

      return result;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Check if notification processing is currently running
   *
   * @returns true if processing
   */
  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }
}
