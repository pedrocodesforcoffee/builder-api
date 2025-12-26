import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SavedSearchService } from '../services/saved-search.service';
import { AlertFrequency } from '../entities/saved-search.entity';

/**
 * Alert Processing Job
 *
 * Processes saved search alerts for notifications.
 *
 * Schedules:
 * - Daily alerts: Every day at 8am
 * - Weekly alerts: Every Monday at 8am
 *
 * Functionality:
 * - Find saved searches needing alerts
 * - Send email notifications (placeholder - needs email service)
 * - Mark alerts as sent
 * - Track alert delivery
 *
 * Note: Email sending requires EmailService integration
 */
@Injectable()
export class AlertProcessingJob {
  private readonly logger = new Logger(AlertProcessingJob.name);

  constructor(private readonly savedSearchService: SavedSearchService) {}

  /**
   * Process daily alerts
   *
   * Runs every day at 8am
   */
  @Cron('0 8 * * *')
  async processDailyAlerts() {
    this.logger.log('Processing daily saved search alerts...');

    try {
      const startTime = Date.now();

      // Get saved searches with daily alerts
      const savedSearches = await this.savedSearchService.getSavedSearchesNeedingAlerts(
        AlertFrequency.DAILY,
      );

      this.logger.log(`Found ${savedSearches.length} daily alerts to process`);

      let successCount = 0;
      let errorCount = 0;

      for (const savedSearch of savedSearches) {
        try {
          await this.sendAlert(savedSearch);
          await this.savedSearchService.markAlertSent(
            savedSearch.id,
            savedSearch.newResultsSinceLastAlert,
          );
          successCount++;
        } catch (error) {
          this.logger.error(
            `Failed to send daily alert for saved search ${savedSearch.id}:`,
            error,
          );
          errorCount++;
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Daily alert processing completed: ${successCount} sent, ${errorCount} failed (${duration}ms)`,
      );
    } catch (error) {
      this.logger.error('Daily alert processing error:', error);
    }
  }

  /**
   * Process weekly alerts
   *
   * Runs every Monday at 8am
   */
  @Cron('0 8 * * 1')
  async processWeeklyAlerts() {
    this.logger.log('Processing weekly saved search alerts...');

    try {
      const startTime = Date.now();

      // Get saved searches with weekly alerts
      const savedSearches = await this.savedSearchService.getSavedSearchesNeedingAlerts(
        AlertFrequency.WEEKLY,
      );

      this.logger.log(`Found ${savedSearches.length} weekly alerts to process`);

      let successCount = 0;
      let errorCount = 0;

      for (const savedSearch of savedSearches) {
        try {
          await this.sendAlert(savedSearch);
          await this.savedSearchService.markAlertSent(
            savedSearch.id,
            savedSearch.newResultsSinceLastAlert,
          );
          successCount++;
        } catch (error) {
          this.logger.error(
            `Failed to send weekly alert for saved search ${savedSearch.id}:`,
            error,
          );
          errorCount++;
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Weekly alert processing completed: ${successCount} sent, ${errorCount} failed (${duration}ms)`,
      );
    } catch (error) {
      this.logger.error('Weekly alert processing error:', error);
    }
  }

  /**
   * Send alert notification
   *
   * TODO: Integrate with EmailService for actual email sending
   *
   * @param savedSearch - Saved search to alert about
   */
  private async sendAlert(savedSearch: any): Promise<void> {
    try {
      // Build alert email content
      const subject = `New documents matching "${savedSearch.name}"`;
      const body = this.buildAlertEmail(savedSearch);

      // TODO: Send email using EmailService
      // await this.emailService.sendEmail({
      //   to: savedSearch.user.email,
      //   subject,
      //   html: body,
      // });

      this.logger.log(
        `Alert notification prepared for saved search "${savedSearch.name}" (${savedSearch.newResultsSinceLastAlert} new results)`,
      );

      // For now, just log the notification
      this.logger.debug(`Email subject: ${subject}`);
      this.logger.debug(`Email body: ${body}`);
    } catch (error) {
      this.logger.error(`Send alert error for saved search ${savedSearch.id}:`, error);
      throw error;
    }
  }

  /**
   * Build alert email HTML
   *
   * @param savedSearch - Saved search data
   * @returns HTML email body
   */
  private buildAlertEmail(savedSearch: any): string {
    const frequency = savedSearch.alertFrequency === AlertFrequency.DAILY ? 'daily' : 'weekly';

    return `
      <html>
        <body>
          <h2>Saved Search Alert: "${savedSearch.name}"</h2>

          <p>Your ${frequency} alert has ${savedSearch.newResultsSinceLastAlert} new result(s).</p>

          ${savedSearch.description ? `<p><strong>Description:</strong> ${savedSearch.description}</p>` : ''}

          <h3>Search Parameters:</h3>
          <ul>
            ${savedSearch.searchParams.query ? `<li><strong>Query:</strong> ${savedSearch.searchParams.query}</li>` : ''}
            ${savedSearch.searchParams.documentTypes ? `<li><strong>Document Types:</strong> ${savedSearch.searchParams.documentTypes.join(', ')}</li>` : ''}
            ${savedSearch.searchParams.disciplines ? `<li><strong>Disciplines:</strong> ${savedSearch.searchParams.disciplines.join(', ')}</li>` : ''}
            ${savedSearch.searchParams.tags ? `<li><strong>Tags:</strong> ${savedSearch.searchParams.tags.join(', ')}</li>` : ''}
          </ul>

          <p>
            <a href="${process.env.APP_URL}/projects/${savedSearch.projectId}/search?savedSearchId=${savedSearch.id}">
              View Results
            </a>
          </p>

          <p>
            <a href="${process.env.APP_URL}/projects/${savedSearch.projectId}/saved-searches/${savedSearch.id}">
              Manage This Saved Search
            </a>
          </p>

          <hr>
          <p style="color: #666; font-size: 12px;">
            You are receiving this alert because you have enabled notifications for this saved search.
            <a href="${process.env.APP_URL}/projects/${savedSearch.projectId}/saved-searches/${savedSearch.id}">
              Manage alert settings
            </a>
          </p>
        </body>
      </html>
    `;
  }
}
