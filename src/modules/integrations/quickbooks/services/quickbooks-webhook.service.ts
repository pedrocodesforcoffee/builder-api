import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  QBConnection,
  QBEntityLink,
  QBSyncHistory,
} from '../entities';
import {
  QuickBooksWebhookDto,
  WebhookEventDto,
  WebhookProcessingResultDto,
} from '../dto';
import { QBEntityType, QBSyncDirection, QBSyncStatus } from '../enums';

/**
 * QuickBooks Webhook Service
 *
 * Processes webhook notifications from QuickBooks.
 * Handles entity change notifications and queues sync jobs.
 *
 * Features:
 * - Processes CloudEvents format webhooks
 * - Validates realm ID matches connection
 * - Queues sync jobs for background processing
 * - Records webhook receipt in sync history
 * - Supports Create, Update, Delete, Merge operations
 *
 * @service
 */
@Injectable()
export class QuickBooksWebhookService {
  private readonly logger = new Logger(QuickBooksWebhookService.name);

  constructor(
    @InjectRepository(QBConnection)
    private readonly connectionRepository: Repository<QBConnection>,
    @InjectRepository(QBEntityLink)
    private readonly entityLinkRepository: Repository<QBEntityLink>,
    @InjectRepository(QBSyncHistory)
    private readonly syncHistoryRepository: Repository<QBSyncHistory>,
    @InjectQueue('quickbooks-webhook')
    private readonly webhookQueue: Queue,
  ) {}

  /**
   * Process webhook notification
   *
   * @param webhookDto - Webhook payload with CloudEvents
   * @returns Processing result
   */
  async processWebhook(
    webhookDto: QuickBooksWebhookDto,
  ): Promise<WebhookProcessingResultDto> {
    this.logger.log(
      `Processing webhook with ${webhookDto.eventNotifications.length} event(s)`,
    );

    const result: WebhookProcessingResultDto = {
      eventsProcessed: 0,
      eventsFailed: 0,
      status: 'success',
      errors: [],
    };

    for (const event of webhookDto.eventNotifications) {
      try {
        await this.processEvent(event);
        result.eventsProcessed++;
      } catch (error: any) {
        this.logger.error(
          `Failed to process event ${event.id}: ${error?.message}`,
          error?.stack,
        );
        result.eventsFailed++;
        result.errors = result.errors || [];
        result.errors.push(`Event ${event.id}: ${error?.message}`);
      }
    }

    // Determine overall status
    if (result.eventsFailed === 0) {
      result.status = 'success';
    } else if (result.eventsProcessed > 0) {
      result.status = 'partial_success';
    } else {
      result.status = 'failed';
    }

    this.logger.log(
      `Webhook processing complete: ${result.eventsProcessed} succeeded, ${result.eventsFailed} failed`,
    );

    return result;
  }

  /**
   * Process single CloudEvent
   *
   * @param event - CloudEvent from webhook
   */
  private async processEvent(event: WebhookEventDto): Promise<void> {
    this.logger.log(
      `Processing event ${event.id}: ${event.data.operation} ${event.data.name} ${event.data.id}`,
    );

    // Extract realm ID from event source
    const realmId = event.data.realmId;

    // Find connection for this realm
    const connection = await this.connectionRepository.findOne({
      where: { qbRealmId: realmId },
    });

    if (!connection) {
      this.logger.warn(
        `No connection found for realm ${realmId}, skipping event`,
      );
      return;
    }

    // Map entity name to QB entity type
    const entityType = this.mapEntityNameToType(event.data.name);

    if (!entityType) {
      this.logger.debug(
        `Unsupported entity type ${event.data.name}, skipping event`,
      );
      return;
    }

    // Record webhook receipt in sync history
    await this.recordWebhookReceipt(connection.organizationId, event, entityType);

    // Queue background job for sync processing
    await this.queueSyncJob(connection.organizationId, event, entityType);
  }

  /**
   * Record webhook receipt in sync history
   *
   * @param organizationId - Organization ID
   * @param event - CloudEvent
   * @param entityType - QB entity type
   */
  private async recordWebhookReceipt(
    organizationId: string,
    event: WebhookEventDto,
    entityType: QBEntityType,
  ): Promise<void> {
    try {
      const syncHistory = this.syncHistoryRepository.create({
        organizationId,
        qbEntityType: entityType,
        qbEntityId: event.data.id,
        platformEntityType: 'WEBHOOK_EVENT',
        platformEntityId: event.id,
        syncType: this.mapOperationToSyncType(event.data.operation),
        syncDirection: QBSyncDirection.FROM_QB,
        status: QBSyncStatus.PENDING,
        startedAt: new Date(),
        requestPayload: undefined,
        responsePayload: event as any,
        triggerSource: 'WEBHOOK',
      });

      await this.syncHistoryRepository.save(syncHistory);

      this.logger.debug(
        `Recorded webhook receipt for ${entityType} ${event.data.id}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to record webhook receipt: ${error?.message}`,
        error?.stack,
      );
      // Don't throw, continue processing
    }
  }

  /**
   * Queue sync job for background processing
   *
   * @param organizationId - Organization ID
   * @param event - CloudEvent
   * @param entityType - QB entity type
   */
  private async queueSyncJob(
    organizationId: string,
    event: WebhookEventDto,
    entityType: QBEntityType,
  ): Promise<void> {
    try {
      await this.webhookQueue.add(
        'process-entity-change',
        {
          organizationId,
          entityType,
          entityId: event.data.id,
          operation: event.data.operation,
          lastUpdated: event.data.lastUpdated,
          deletedId: event.data.deletedId,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000, // 5 seconds
          },
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: 500, // Keep last 500 failed jobs
        },
      );

      this.logger.log(
        `Queued sync job for ${entityType} ${event.data.id} (${event.data.operation})`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to queue sync job: ${error?.message}`,
        error?.stack,
      );
      throw error; // Throw to mark event as failed
    }
  }

  /**
   * Map entity name to QB entity type enum
   *
   * @param entityName - Entity name from webhook
   * @returns QB entity type or null if not supported
   */
  private mapEntityNameToType(entityName: string): QBEntityType | null {
    const mapping: Record<string, QBEntityType> = {
      'Vendor': QBEntityType.VENDOR,
      'Customer': QBEntityType.CUSTOMER,
      'Account': QBEntityType.ACCOUNT,
      'Bill': QBEntityType.BILL,
      'BillPayment': QBEntityType.BILL_PAYMENT,
      'Invoice': QBEntityType.INVOICE,
      'Payment': QBEntityType.PAYMENT,
      'JournalEntry': QBEntityType.JOURNAL_ENTRY,
      'PurchaseOrder': QBEntityType.PURCHASE_ORDER,
    };

    return mapping[entityName] || null;
  }

  /**
   * Map operation to sync type
   *
   * @param operation - Operation from webhook
   * @returns Sync type
   */
  private mapOperationToSyncType(
    operation: 'Create' | 'Update' | 'Delete' | 'Merge',
  ): 'CREATE' | 'UPDATE' | 'DELETE' | 'READ' {
    switch (operation) {
      case 'Create':
        return 'CREATE';
      case 'Update':
        return 'UPDATE';
      case 'Delete':
      case 'Merge':
        return 'DELETE';
      default:
        return 'UPDATE';
    }
  }
}
