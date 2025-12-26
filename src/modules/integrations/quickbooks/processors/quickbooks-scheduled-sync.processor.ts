import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QBSyncSettings, QBConnection } from '../entities';
import { QBEntityType, QBSyncDirection, QBSyncFrequency } from '../enums';

/**
 * QuickBooks Scheduled Sync Processor
 *
 * Background processor for scheduled/periodic synchronization.
 * Handles:
 * - Periodic vendor sync
 * - Periodic bill sync
 * - Periodic customer sync
 * - Periodic invoice sync
 *
 * Queue: quickbooks-scheduled-sync
 * Jobs: check-scheduled-syncs
 *
 * This processor runs periodically (e.g., every hour) and checks
 * which organizations have auto-sync enabled. It then queues
 * full-sync jobs for those organizations.
 */
@Processor('quickbooks-scheduled-sync')
export class QuickBooksScheduledSyncProcessor {
  private readonly logger = new Logger(QuickBooksScheduledSyncProcessor.name);

  constructor(
    @InjectRepository(QBSyncSettings)
    private readonly syncSettingsRepository: Repository<QBSyncSettings>,
    @InjectRepository(QBConnection)
    private readonly connectionRepository: Repository<QBConnection>,
    @InjectQueue('quickbooks-sync')
    private readonly syncQueue: Queue,
  ) {}

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`Processing scheduled sync check job ${job.id}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(`Scheduled sync check completed: ${JSON.stringify(result)}`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Scheduled sync check failed: ${error.message}`, error.stack);
  }

  /**
   * Check scheduled syncs and queue jobs
   *
   * This job runs periodically and checks which organizations
   * have auto-sync enabled. It then queues full-sync jobs based on
   * their sync settings and last sync time.
   */
  @Process('check-scheduled-syncs')
  async handleScheduledSyncCheck(job: Job) {
    this.logger.log('Checking for scheduled syncs...');

    try {
      // Get all active connections
      const connections = await this.connectionRepository.find({
        where: { isActive: true },
      });

      this.logger.log(`Found ${connections.length} active QuickBooks connections`);

      const results = {
        checked: connections.length,
        queued: 0,
        skipped: 0,
      };

      for (const connection of connections) {
        const syncSettings = await this.syncSettingsRepository.findOne({
          where: { organizationId: connection.organizationId },
        });

        if (!syncSettings) {
          this.logger.log(`No sync settings for organization ${connection.organizationId}, skipping`);
          results.skipped++;
          continue;
        }

        // Check and queue syncs for each entity type
        if (syncSettings.autoSyncVendors) {
          const shouldSync = this.shouldPerformSync(
            syncSettings.vendorSyncFrequency,
            syncSettings.vendorLastSyncedAt,
          );

          if (shouldSync) {
            await this.syncQueue.add('full-sync', {
              organizationId: connection.organizationId,
              entityType: QBEntityType.VENDOR,
              direction: QBSyncDirection.FROM_QB,
            });

            // Update last synced time
            syncSettings.vendorLastSyncedAt = new Date();
            await this.syncSettingsRepository.save(syncSettings);

            this.logger.log(`Queued vendor sync for organization ${connection.organizationId}`);
            results.queued++;
          }
        }

        if (syncSettings.autoSyncBills) {
          const shouldSync = this.shouldPerformSync(
            syncSettings.billSyncFrequency,
            syncSettings.billLastSyncedAt,
          );

          if (shouldSync) {
            await this.syncQueue.add('full-sync', {
              organizationId: connection.organizationId,
              entityType: QBEntityType.BILL,
              direction: QBSyncDirection.FROM_QB,
            });

            // Update last synced time
            syncSettings.billLastSyncedAt = new Date();
            await this.syncSettingsRepository.save(syncSettings);

            this.logger.log(`Queued bill sync for organization ${connection.organizationId}`);
            results.queued++;
          }
        }

        if (syncSettings.autoSyncCustomers) {
          const shouldSync = this.shouldPerformSync(
            syncSettings.customerSyncFrequency,
            syncSettings.customerLastSyncedAt,
          );

          if (shouldSync) {
            await this.syncQueue.add('full-sync', {
              organizationId: connection.organizationId,
              entityType: QBEntityType.CUSTOMER,
              direction: QBSyncDirection.FROM_QB,
            });

            // Update last synced time
            syncSettings.customerLastSyncedAt = new Date();
            await this.syncSettingsRepository.save(syncSettings);

            this.logger.log(`Queued customer sync for organization ${connection.organizationId}`);
            results.queued++;
          }
        }

        if (syncSettings.autoSyncInvoices) {
          const shouldSync = this.shouldPerformSync(
            syncSettings.invoiceSyncFrequency,
            syncSettings.invoiceLastSyncedAt,
          );

          if (shouldSync) {
            await this.syncQueue.add('full-sync', {
              organizationId: connection.organizationId,
              entityType: QBEntityType.INVOICE,
              direction: QBSyncDirection.FROM_QB,
            });

            // Update last synced time
            syncSettings.invoiceLastSyncedAt = new Date();
            await this.syncSettingsRepository.save(syncSettings);

            this.logger.log(`Queued invoice sync for organization ${connection.organizationId}`);
            results.queued++;
          }
        }
      }

      this.logger.log(`Scheduled sync check completed: ${JSON.stringify(results)}`);

      return results;
    } catch (error: any) {
      this.logger.error(`Scheduled sync check failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Determine if sync should be performed based on frequency and last sync time
   */
  private shouldPerformSync(
    frequency: QBSyncFrequency,
    lastSyncedAt?: Date | null,
  ): boolean {
    if (!lastSyncedAt) {
      // Never synced before, should sync now
      return true;
    }

    const now = new Date();
    const lastSyncTime = new Date(lastSyncedAt);
    const minutesSinceLastSync = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60);

    switch (frequency) {
      case QBSyncFrequency.HOURLY:
        return minutesSinceLastSync >= 60;

      case QBSyncFrequency.EVERY_6_HOURS:
        return minutesSinceLastSync >= 360;

      case QBSyncFrequency.DAILY:
        return minutesSinceLastSync >= 1440;

      case QBSyncFrequency.WEEKLY:
        return minutesSinceLastSync >= 10080;

      case QBSyncFrequency.MANUAL:
        return false; // Never auto-sync for manual frequency

      default:
        return false;
    }
  }
}
