import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QBSyncHistory, QBSyncError } from '../entities';
import {
  QuickBooksVendorService,
  QuickBooksBillService,
  QuickBooksCustomerService,
  QuickBooksInvoiceService,
} from '../services';
import { QBEntityType, QBSyncDirection, QBSyncStatus } from '../enums';

/**
 * QuickBooks Full Sync Processor
 *
 * Background processor for full synchronization operations.
 * Handles:
 * - Full sync: Sync all entities of a type
 * - Entity sync: Sync a specific entity
 * - Batch operations
 *
 * Queue: quickbooks-sync
 * Jobs: full-sync, sync-entity
 */
@Processor('quickbooks-sync')
export class QuickBooksFullSyncProcessor {
  private readonly logger = new Logger(QuickBooksFullSyncProcessor.name);

  constructor(
    @InjectRepository(QBSyncHistory)
    private readonly syncHistoryRepository: Repository<QBSyncHistory>,
    @InjectRepository(QBSyncError)
    private readonly syncErrorRepository: Repository<QBSyncError>,
    private readonly vendorService: QuickBooksVendorService,
    private readonly billService: QuickBooksBillService,
    private readonly customerService: QuickBooksCustomerService,
    private readonly invoiceService: QuickBooksInvoiceService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(`Job ${job.id} completed with result: ${JSON.stringify(result)}`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed with error: ${error.message}`, error.stack);
  }

  /**
   * Process full sync job
   *
   * Syncs all entities of specified type from QuickBooks
   */
  @Process('full-sync')
  async handleFullSync(job: Job<{
    organizationId: string;
    entityType: QBEntityType;
    direction: QBSyncDirection;
    options?: {
      maxResults?: number;
      startDate?: string;
      endDate?: string;
    };
  }>) {
    const { organizationId, entityType, direction, options } = job.data;

    this.logger.log(`Starting full sync for ${entityType} (${direction})`);

    // Create sync history record
    const syncHistory: QBSyncHistory = await this.syncHistoryRepository.save(
      this.syncHistoryRepository.create({
        organizationId,
        qbEntityType: entityType,
        platformEntityType: this.mapQBEntityTypeToPlatform(entityType),
        syncDirection: direction,
        status: QBSyncStatus.IN_PROGRESS,
        triggerSource: 'MANUAL',
        startedAt: new Date(),
        totalRecords: 0,
        successCount: 0,
        failureCount: 0,
      })
    );

    try {
      let result: any;

      switch (entityType) {
        case QBEntityType.VENDOR:
          result = await this.syncAllVendors(organizationId, direction, options);
          break;

        case QBEntityType.BILL:
          result = await this.syncAllBills(organizationId, direction, options);
          break;

        case QBEntityType.CUSTOMER:
          result = await this.syncAllCustomers(organizationId, direction, options);
          break;

        case QBEntityType.INVOICE:
          result = await this.syncAllInvoices(organizationId, direction, options);
          break;

        default:
          throw new Error(`Unsupported entity type for full sync: ${entityType}`);
      }

      // Update sync history
      syncHistory.status = QBSyncStatus.SUCCESS;
      syncHistory.completedAt = new Date();
      syncHistory.totalRecords = result.total;
      syncHistory.successCount = result.success;
      syncHistory.failureCount = result.failed;

      await this.syncHistoryRepository.save(syncHistory);

      // Emit event
      this.eventEmitter.emit('quickbooks.sync.completed', {
        organizationId,
        entityType,
        syncHistoryId: syncHistory.id,
        result,
      });

      return result;
    } catch (error: any) {
      this.logger.error(`Full sync failed: ${error.message}`, error.stack);

      // Update sync history
      syncHistory.status = QBSyncStatus.FAILED;
      syncHistory.completedAt = new Date();
      syncHistory.errorMessage = error.message;

      await this.syncHistoryRepository.save(syncHistory);

      // Create sync error
      await this.createSyncError(organizationId, entityType, error, syncHistory.id);

      // Emit event
      this.eventEmitter.emit('quickbooks.sync.failed', {
        organizationId,
        entityType,
        syncHistoryId: syncHistory.id,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Process single entity sync job
   *
   * Syncs a specific entity by ID
   */
  @Process('sync-entity')
  async handleEntitySync(job: Job<{
    organizationId: string;
    entityType: QBEntityType;
    entityId: string;
    platformEntityId?: string;
    direction: QBSyncDirection;
  }>) {
    const { organizationId, entityType, entityId, platformEntityId, direction } = job.data;

    this.logger.log(`Syncing ${entityType} entity ${entityId || platformEntityId} (${direction})`);

    try {
      let result: any;

      switch (entityType) {
        case QBEntityType.VENDOR:
          if (direction === QBSyncDirection.TO_QB && platformEntityId) {
            // Sync vendor from commitment to QB
            result = await this.vendorService.syncVendorFromCommitment(organizationId, {
              commitmentId: platformEntityId,
            });
          } else if (direction === QBSyncDirection.FROM_QB && entityId) {
            // Get vendor from QB
            result = await this.vendorService.getVendorById(organizationId, entityId);
          }
          break;

        case QBEntityType.BILL:
          if (direction === QBSyncDirection.TO_QB && platformEntityId) {
            // Create bill from payment application
            result = await this.billService.createBillFromPaymentApplication(organizationId, {
              paymentApplicationId: platformEntityId,
            });
          } else if (direction === QBSyncDirection.FROM_QB && entityId) {
            // Get bill from QB
            result = await this.billService.getBillById(organizationId, entityId);
          }
          break;

        case QBEntityType.CUSTOMER:
          if (direction === QBSyncDirection.TO_QB && platformEntityId) {
            // Sync project owner to QB customer
            result = await this.customerService.syncCustomerFromEntity(organizationId, {
              entityId: platformEntityId,
            });
          } else if (direction === QBSyncDirection.FROM_QB && entityId) {
            // Get customer from QB
            result = await this.customerService.getCustomerById(organizationId, entityId);
          }
          break;

        case QBEntityType.INVOICE:
          if (direction === QBSyncDirection.TO_QB && platformEntityId) {
            // Sync owner billing to QB invoice
            result = await this.invoiceService.exportOwnerBillingAsInvoice(organizationId, {
              ownerBillingId: platformEntityId,
            });
          } else if (direction === QBSyncDirection.FROM_QB && entityId) {
            // Get invoice from QB
            result = await this.invoiceService.getInvoiceById(organizationId, entityId);
          }
          break;

        default:
          throw new Error(`Unsupported entity type for entity sync: ${entityType}`);
      }

      this.logger.log(`Entity sync completed: ${JSON.stringify(result)}`);

      return result;
    } catch (error: any) {
      this.logger.error(`Entity sync failed: ${error.message}`, error.stack);

      // Create sync error
      await this.createSyncError(organizationId, entityType, error, undefined, entityId);

      throw error;
    }
  }

  /**
   * Sync all vendors
   */
  private async syncAllVendors(
    organizationId: string,
    direction: QBSyncDirection,
    options?: any,
  ): Promise<{ total: number; success: number; failed: number }> {
    // TODO: Implement full vendor sync
    // For TO_QB: Query platform vendors and sync each
    // For FROM_QB: Query QB vendors and create/update platform records
    this.logger.log('Full vendor sync not yet implemented');
    return { total: 0, success: 0, failed: 0 };
  }

  /**
   * Sync all bills
   */
  private async syncAllBills(
    organizationId: string,
    direction: QBSyncDirection,
    options?: any,
  ): Promise<{ total: number; success: number; failed: number }> {
    // TODO: Implement full bill sync
    this.logger.log('Full bill sync not yet implemented');
    return { total: 0, success: 0, failed: 0 };
  }

  /**
   * Sync all customers
   */
  private async syncAllCustomers(
    organizationId: string,
    direction: QBSyncDirection,
    options?: any,
  ): Promise<{ total: number; success: number; failed: number }> {
    // TODO: Implement full customer sync
    this.logger.log('Full customer sync not yet implemented');
    return { total: 0, success: 0, failed: 0 };
  }

  /**
   * Sync all invoices
   */
  private async syncAllInvoices(
    organizationId: string,
    direction: QBSyncDirection,
    options?: any,
  ): Promise<{ total: number; success: number; failed: number }> {
    // TODO: Implement full invoice sync
    this.logger.log('Full invoice sync not yet implemented');
    return { total: 0, success: 0, failed: 0 };
  }

  /**
   * Map QB entity type to platform entity type
   */
  private mapQBEntityTypeToPlatform(qbEntityType: QBEntityType): string {
    const mapping: Record<QBEntityType, string> = {
      [QBEntityType.VENDOR]: 'VENDOR',
      [QBEntityType.BILL]: 'PAYMENT_APPLICATION',
      [QBEntityType.BILL_PAYMENT]: 'VENDOR_PAYMENT',
      [QBEntityType.CUSTOMER]: 'PROJECT',
      [QBEntityType.INVOICE]: 'OWNER_BILLING',
      [QBEntityType.JOURNAL_ENTRY]: 'COST_ENTRY',
      [QBEntityType.PAYMENT]: 'OWNER_PAYMENT',
      [QBEntityType.ACCOUNT]: 'COST_CODE',
      [QBEntityType.PURCHASE_ORDER]: 'COMMITMENT',
    };

    return mapping[qbEntityType] || 'UNKNOWN';
  }

  /**
   * Create sync error record
   */
  private async createSyncError(
    organizationId: string,
    entityType: QBEntityType,
    error: Error,
    syncHistoryId?: string,
    qbEntityId?: string,
  ): Promise<void> {
    const syncError = this.syncErrorRepository.create({
      organizationId,
      syncHistoryId,
      qbEntityType: entityType,
      qbEntityId,
      platformEntityType: this.mapQBEntityTypeToPlatform(entityType),
      platformEntityId: qbEntityId || 'unknown',
      syncDirection: 'TO_QB',
      errorType: 'OTHER',
      errorCode: 'SYNC_ERROR',
      errorMessage: error.message,
      errorDetails: { stack: error.stack || '' },
      retryCount: 0,
    });

    await this.syncErrorRepository.save(syncError);
  }
}
