import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  QBConnection,
  QBEntityLink,
  QBSyncHistory,
  QBSyncError,
} from '../entities';
import {
  QuickBooksApiClientService,
  QuickBooksVendorService,
  QuickBooksBillService,
  QuickBooksBillPaymentService,
  QuickBooksCustomerService,
  QuickBooksInvoiceService,
  QuickBooksJournalEntryService,
} from '../services';
import { QBEntityType, QBSyncStatus, QBConnectionStatus } from '../enums';

/**
 * Job payload for webhook entity change processing
 */
interface WebhookEntityChangeJob {
  organizationId: string;
  entityType: QBEntityType;
  entityId: string;
  operation: 'Create' | 'Update' | 'Delete' | 'Merge';
  lastUpdated: string;
  deletedId?: string;
}

/**
 * QuickBooks Webhook Processor
 *
 * Bull consumer that processes webhook entity change notifications.
 * Fetches entity data from QuickBooks and syncs to platform.
 *
 * Features:
 * - Processes queued webhook jobs
 * - Handles Create, Update, Delete operations
 * - Entity-specific sync logic
 * - Updates sync history and error tracking
 * - Automatic retry on failure (configured in queue)
 *
 * @processor
 */
@Processor('quickbooks-webhook')
export class QuickBooksWebhookProcessor {
  private readonly logger = new Logger(QuickBooksWebhookProcessor.name);

  constructor(
    @InjectRepository(QBConnection)
    private readonly connectionRepository: Repository<QBConnection>,
    @InjectRepository(QBEntityLink)
    private readonly entityLinkRepository: Repository<QBEntityLink>,
    @InjectRepository(QBSyncHistory)
    private readonly syncHistoryRepository: Repository<QBSyncHistory>,
    @InjectRepository(QBSyncError)
    private readonly syncErrorRepository: Repository<QBSyncError>,
    private readonly apiClient: QuickBooksApiClientService,
    private readonly vendorService: QuickBooksVendorService,
    private readonly billService: QuickBooksBillService,
    private readonly billPaymentService: QuickBooksBillPaymentService,
    private readonly customerService: QuickBooksCustomerService,
    private readonly invoiceService: QuickBooksInvoiceService,
    private readonly journalEntryService: QuickBooksJournalEntryService,
  ) {}

  /**
   * Process webhook entity change job
   *
   * @param job - Bull job with webhook entity change data
   */
  @Process('process-entity-change')
  async handleEntityChange(job: Job<WebhookEntityChangeJob>): Promise<void> {
    const { organizationId, entityType, entityId, operation, lastUpdated } =
      job.data;

    this.logger.log(
      `Processing webhook job ${job.id}: ${operation} ${entityType} ${entityId}`,
    );

    const startTime = Date.now();
    let syncHistory: QBSyncHistory | null = null;

    try {
      // Find connection for organization
      const connection = await this.connectionRepository.findOne({
        where: { organizationId },
      });

      if (!connection) {
        throw new Error(`No QuickBooks connection found for organization ${organizationId}`);
      }

      if (connection.status !== QBConnectionStatus.CONNECTED) {
        throw new Error(`QuickBooks connection is not active: ${connection.status}`);
      }

      // Find or create sync history record
      syncHistory = await this.findOrCreateSyncHistory(
        organizationId,
        entityType,
        entityId,
        operation,
      );

      // Update sync history to IN_PROGRESS
      syncHistory.status = QBSyncStatus.IN_PROGRESS;
      syncHistory.startedAt = new Date();
      await this.syncHistoryRepository.save(syncHistory);

      // Process based on operation type
      switch (operation) {
        case 'Create':
        case 'Update':
          await this.handleCreateOrUpdate(
            organizationId,
            entityType,
            entityId,
            lastUpdated,
            syncHistory,
          );
          break;

        case 'Delete':
        case 'Merge':
          await this.handleDelete(
            organizationId,
            entityType,
            entityId,
            syncHistory,
          );
          break;

        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }

      // Mark sync history as SUCCESS
      const endTime = Date.now();
      syncHistory.status = QBSyncStatus.SUCCESS;
      syncHistory.completedAt = new Date();
      syncHistory.durationMs = endTime - startTime;
      await this.syncHistoryRepository.save(syncHistory);

      this.logger.log(
        `Successfully processed webhook job ${job.id} in ${syncHistory.durationMs}ms`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to process webhook job ${job.id}: ${error?.message}`,
        error?.stack,
      );

      // Update sync history to FAILED
      if (syncHistory) {
        const endTime = Date.now();
        syncHistory.status = QBSyncStatus.FAILED;
        syncHistory.completedAt = new Date();
        syncHistory.durationMs = endTime - startTime;
        syncHistory.errorMessage = error?.message || 'Unknown error';
        syncHistory.errorCode = error?.code || 'WEBHOOK_PROCESSING_ERROR';
        await this.syncHistoryRepository.save(syncHistory);
      }

      // Record sync error
      await this.recordSyncError(
        organizationId,
        entityType,
        entityId,
        operation,
        error,
      );

      // Re-throw to trigger Bull retry logic
      throw error;
    }
  }

  /**
   * Handle Create or Update operation
   *
   * @param organizationId - Organization ID
   * @param entityType - QB entity type
   * @param entityId - QB entity ID
   * @param lastUpdated - Last updated timestamp
   * @param syncHistory - Sync history record
   */
  private async handleCreateOrUpdate(
    organizationId: string,
    entityType: QBEntityType,
    entityId: string,
    lastUpdated: string,
    syncHistory: QBSyncHistory,
  ): Promise<void> {
    this.logger.debug(
      `Handling Create/Update for ${entityType} ${entityId}`,
    );

    // Route to entity-specific handler
    switch (entityType) {
      case QBEntityType.VENDOR:
        await this.syncVendorFromQuickBooks(organizationId, entityId, syncHistory);
        break;

      case QBEntityType.BILL:
        await this.syncBillFromQuickBooks(organizationId, entityId, syncHistory);
        break;

      case QBEntityType.BILL_PAYMENT:
        await this.syncBillPaymentFromQuickBooks(organizationId, entityId, syncHistory);
        break;

      case QBEntityType.CUSTOMER:
        await this.syncCustomerFromQuickBooks(organizationId, entityId, syncHistory);
        break;

      case QBEntityType.INVOICE:
        await this.syncInvoiceFromQuickBooks(organizationId, entityId, syncHistory);
        break;

      case QBEntityType.PAYMENT:
        await this.syncPaymentFromQuickBooks(organizationId, entityId, syncHistory);
        break;

      case QBEntityType.JOURNAL_ENTRY:
        await this.syncJournalEntryFromQuickBooks(organizationId, entityId, syncHistory);
        break;

      case QBEntityType.ACCOUNT:
      case QBEntityType.PURCHASE_ORDER:
        this.logger.log(
          `Entity type ${entityType} sync not yet implemented, skipping`,
        );
        break;

      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }
  }

  /**
   * Handle Delete operation
   *
   * @param organizationId - Organization ID
   * @param entityType - QB entity type
   * @param entityId - QB entity ID
   * @param syncHistory - Sync history record
   */
  private async handleDelete(
    organizationId: string,
    entityType: QBEntityType,
    entityId: string,
    syncHistory: QBSyncHistory,
  ): Promise<void> {
    this.logger.debug(`Handling Delete for ${entityType} ${entityId}`);

    // Find entity link
    const entityLink = await this.entityLinkRepository.findOne({
      where: {
        organizationId,
        qbEntityType: entityType,
        qbEntityId: entityId,
      },
    });

    if (!entityLink) {
      this.logger.warn(
        `No entity link found for ${entityType} ${entityId}, cannot process delete`,
      );
      return;
    }

    // For now, just log the delete operation
    // In a full implementation, you would update the platform entity status or soft-delete it
    this.logger.log(
      `Delete operation for ${entityType} ${entityId} linked to ${entityLink.platformEntityType} ${entityLink.platformEntityId}`,
    );

    // Update sync history response payload
    syncHistory.responsePayload = {
      action: 'DELETE',
      entityType,
      entityId,
      linkedEntity: {
        type: entityLink.platformEntityType,
        id: entityLink.platformEntityId,
      },
    };
  }

  /**
   * Sync vendor from QuickBooks
   *
   * @param organizationId - Organization ID
   * @param vendorId - QuickBooks vendor ID
   * @param syncHistory - Sync history record
   */
  private async syncVendorFromQuickBooks(
    organizationId: string,
    vendorId: string,
    syncHistory: QBSyncHistory,
  ): Promise<void> {
    this.logger.debug(`Syncing vendor ${vendorId} from QuickBooks`);

    // Fetch vendor from QuickBooks
    const vendor = await this.vendorService.getVendorById(organizationId, vendorId);

    // Check if vendor is linked to a commitment
    const entityLink = await this.entityLinkRepository.findOne({
      where: {
        organizationId,
        qbEntityType: QBEntityType.VENDOR,
        qbEntityId: vendorId,
      },
    });

    if (entityLink && entityLink.platformEntityType === 'COMMITMENT') {
      // Update commitment with vendor data
      // Note: This would require a commitment service method to update from QB vendor data
      this.logger.log(
        `Vendor ${vendorId} is linked to commitment ${entityLink.platformEntityId}`,
      );

      // Store vendor data in sync history for reference
      syncHistory.responsePayload = vendor;
    } else {
      // Vendor not linked to any platform entity
      this.logger.debug(`Vendor ${vendorId} is not linked to any commitment`);
      syncHistory.responsePayload = vendor;
    }
  }

  /**
   * Sync bill from QuickBooks
   *
   * @param organizationId - Organization ID
   * @param billId - QuickBooks bill ID
   * @param syncHistory - Sync history record
   */
  private async syncBillFromQuickBooks(
    organizationId: string,
    billId: string,
    syncHistory: QBSyncHistory,
  ): Promise<void> {
    this.logger.debug(`Syncing bill ${billId} from QuickBooks`);

    // Fetch bill from QuickBooks
    const bill = await this.billService.getBillById(organizationId, billId);

    // Check if bill is linked to a payment application
    const entityLink = await this.entityLinkRepository.findOne({
      where: {
        organizationId,
        qbEntityType: QBEntityType.BILL,
        qbEntityId: billId,
      },
    });

    if (entityLink && entityLink.platformEntityType === 'PAYMENT_APPLICATION') {
      // Bill is linked to a payment application
      this.logger.log(
        `Bill ${billId} is linked to payment application ${entityLink.platformEntityId}`,
      );

      // Store bill data in sync history
      syncHistory.responsePayload = bill;

      // Could update payment application status based on bill status
      // This would require a payment application service method
    } else {
      // Bill not linked to any platform entity
      this.logger.debug(`Bill ${billId} is not linked to any payment application`);
      syncHistory.responsePayload = bill;
    }
  }

  /**
   * Sync bill payment from QuickBooks
   *
   * @param organizationId - Organization ID
   * @param billPaymentId - QuickBooks bill payment ID
   * @param syncHistory - Sync history record
   */
  private async syncBillPaymentFromQuickBooks(
    organizationId: string,
    billPaymentId: string,
    syncHistory: QBSyncHistory,
  ): Promise<void> {
    this.logger.debug(`Syncing bill payment ${billPaymentId} from QuickBooks`);

    // Fetch bill payment from QuickBooks
    const billPayment = await this.billPaymentService.getBillPaymentById(
      organizationId,
      billPaymentId,
    );

    // Check if bill payment is linked to a payment application payment
    const entityLink = await this.entityLinkRepository.findOne({
      where: {
        organizationId,
        qbEntityType: QBEntityType.BILL_PAYMENT,
        qbEntityId: billPaymentId,
      },
    });

    if (entityLink && entityLink.platformEntityType === 'PAYMENT_APPLICATION_PAYMENT') {
      // Bill payment is linked to a payment application payment
      this.logger.log(
        `Bill payment ${billPaymentId} is linked to payment application payment ${entityLink.platformEntityId}`,
      );

      // Store bill payment data in sync history
      syncHistory.responsePayload = billPayment;
    } else {
      // Bill payment not linked to any platform entity
      this.logger.debug(
        `Bill payment ${billPaymentId} is not linked to any payment application payment`,
      );
      syncHistory.responsePayload = billPayment;
    }
  }

  /**
   * Sync customer from QuickBooks
   *
   * @param organizationId - Organization ID
   * @param customerId - QuickBooks customer ID
   * @param syncHistory - Sync history record
   */
  private async syncCustomerFromQuickBooks(
    organizationId: string,
    customerId: string,
    syncHistory: QBSyncHistory,
  ): Promise<void> {
    this.logger.debug(`Syncing customer ${customerId} from QuickBooks`);

    // Fetch customer from QuickBooks
    const customer = await this.customerService.getCustomerById(organizationId, customerId);

    // Check if customer is linked to a project
    const entityLink = await this.entityLinkRepository.findOne({
      where: {
        organizationId,
        qbEntityType: QBEntityType.CUSTOMER,
        qbEntityId: customerId,
      },
    });

    if (entityLink && entityLink.platformEntityType === 'PROJECT') {
      // Customer is linked to a project
      this.logger.log(
        `Customer ${customerId} is linked to project ${entityLink.platformEntityId}`,
      );

      // Store customer data in sync history
      syncHistory.responsePayload = customer;
    } else {
      // Customer not linked to any platform entity
      this.logger.debug(`Customer ${customerId} is not linked to any project`);
      syncHistory.responsePayload = customer;
    }
  }

  /**
   * Sync invoice from QuickBooks
   *
   * @param organizationId - Organization ID
   * @param invoiceId - QuickBooks invoice ID
   * @param syncHistory - Sync history record
   */
  private async syncInvoiceFromQuickBooks(
    organizationId: string,
    invoiceId: string,
    syncHistory: QBSyncHistory,
  ): Promise<void> {
    this.logger.debug(`Syncing invoice ${invoiceId} from QuickBooks`);

    // Fetch invoice from QuickBooks
    const invoice = await this.invoiceService.getInvoiceById(organizationId, invoiceId);

    // Check if invoice is linked to owner billing
    const entityLink = await this.entityLinkRepository.findOne({
      where: {
        organizationId,
        qbEntityType: QBEntityType.INVOICE,
        qbEntityId: invoiceId,
      },
    });

    if (entityLink && entityLink.platformEntityType === 'OWNER_BILLING') {
      // Invoice is linked to owner billing
      this.logger.log(
        `Invoice ${invoiceId} is linked to owner billing ${entityLink.platformEntityId}`,
      );

      // Store invoice data in sync history
      syncHistory.responsePayload = invoice;

      // Could update owner billing status based on invoice status
      // This would require an owner billing service method
    } else {
      // Invoice not linked to any platform entity
      this.logger.debug(`Invoice ${invoiceId} is not linked to any owner billing`);
      syncHistory.responsePayload = invoice;
    }
  }

  /**
   * Sync payment from QuickBooks
   *
   * @param organizationId - Organization ID
   * @param paymentId - QuickBooks payment ID
   * @param syncHistory - Sync history record
   */
  private async syncPaymentFromQuickBooks(
    organizationId: string,
    paymentId: string,
    syncHistory: QBSyncHistory,
  ): Promise<void> {
    this.logger.debug(`Syncing payment ${paymentId} from QuickBooks`);

    // Get connection for realmId
    const connection = await this.connectionRepository.findOne({
      where: { organizationId },
    });

    if (!connection) {
      throw new Error(`No QuickBooks connection found for organization ${organizationId}`);
    }

    // Fetch payment from QuickBooks using API client directly
    // (There's no dedicated payment service, payments are created via invoice service)
    const payment = await this.apiClient.get<any>(
      organizationId,
      connection.qbRealmId,
      `/payment/${paymentId}`,
    );

    // Check if payment is linked to owner payment
    const entityLink = await this.entityLinkRepository.findOne({
      where: {
        organizationId,
        qbEntityType: QBEntityType.PAYMENT,
        qbEntityId: paymentId,
      },
    });

    if (entityLink && entityLink.platformEntityType === 'OWNER_PAYMENT') {
      // Payment is linked to owner payment
      this.logger.log(
        `Payment ${paymentId} is linked to owner payment ${entityLink.platformEntityId}`,
      );

      // Store payment data in sync history
      syncHistory.responsePayload = payment;
    } else {
      // Payment not linked to any platform entity
      this.logger.debug(`Payment ${paymentId} is not linked to any owner payment`);
      syncHistory.responsePayload = payment;
    }
  }

  /**
   * Sync journal entry from QuickBooks
   *
   * @param organizationId - Organization ID
   * @param journalEntryId - QuickBooks journal entry ID
   * @param syncHistory - Sync history record
   */
  private async syncJournalEntryFromQuickBooks(
    organizationId: string,
    journalEntryId: string,
    syncHistory: QBSyncHistory,
  ): Promise<void> {
    this.logger.debug(`Syncing journal entry ${journalEntryId} from QuickBooks`);

    // Fetch journal entry from QuickBooks
    const journalEntry = await this.journalEntryService.getJournalEntryById(
      organizationId,
      journalEntryId,
    );

    // Check if journal entry is linked to cost entry or cost period
    const entityLink = await this.entityLinkRepository.findOne({
      where: {
        organizationId,
        qbEntityType: QBEntityType.JOURNAL_ENTRY,
        qbEntityId: journalEntryId,
      },
    });

    if (entityLink) {
      // Journal entry is linked to a platform entity
      this.logger.log(
        `Journal entry ${journalEntryId} is linked to ${entityLink.platformEntityType} ${entityLink.platformEntityId}`,
      );

      // Store journal entry data in sync history
      syncHistory.responsePayload = journalEntry;
    } else {
      // Journal entry not linked to any platform entity
      this.logger.debug(`Journal entry ${journalEntryId} is not linked to any platform entity`);
      syncHistory.responsePayload = journalEntry;
    }
  }

  /**
   * Find or create sync history record
   *
   * @param organizationId - Organization ID
   * @param entityType - QB entity type
   * @param entityId - QB entity ID
   * @param operation - Operation type
   * @returns Sync history record
   */
  private async findOrCreateSyncHistory(
    organizationId: string,
    entityType: QBEntityType,
    entityId: string,
    operation: 'Create' | 'Update' | 'Delete' | 'Merge',
  ): Promise<QBSyncHistory> {
    // Try to find existing PENDING sync history
    let syncHistory = await this.syncHistoryRepository.findOne({
      where: {
        organizationId,
        qbEntityType: entityType,
        qbEntityId: entityId,
        status: QBSyncStatus.PENDING,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (!syncHistory) {
      // Create new sync history record
      syncHistory = this.syncHistoryRepository.create({
        organizationId,
        qbEntityType: entityType,
        qbEntityId: entityId,
        platformEntityType: 'WEBHOOK_EVENT',
        platformEntityId: `webhook-${entityType}-${entityId}`,
        syncType: this.mapOperationToSyncType(operation),
        syncDirection: 'FROM_QB' as any,
        status: QBSyncStatus.PENDING,
        startedAt: new Date(),
        triggerSource: 'WEBHOOK',
      });

      syncHistory = await this.syncHistoryRepository.save(syncHistory);
    }

    return syncHistory;
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

  /**
   * Record sync error
   *
   * @param organizationId - Organization ID
   * @param entityType - QB entity type
   * @param entityId - QB entity ID
   * @param operation - Operation type
   * @param error - Error object
   */
  private async recordSyncError(
    organizationId: string,
    entityType: QBEntityType,
    entityId: string,
    operation: string,
    error: any,
  ): Promise<void> {
    try {
      const syncError = this.syncErrorRepository.create({
        organizationId,
        qbEntityType: entityType,
        qbEntityId: entityId,
        platformEntityType: 'WEBHOOK_EVENT',
        platformEntityId: `webhook-${entityType}-${entityId}`,
        syncDirection: 'FROM_QB' as any,
        errorType: this.categorizeError(error),
        errorMessage: error?.message || 'Unknown error',
        errorDetails: {
          operation,
          stack: error?.stack,
          code: error?.code,
          statusCode: error?.statusCode,
        },
        resolved: false,
      });

      await this.syncErrorRepository.save(syncError);

      this.logger.debug(
        `Recorded sync error for ${entityType} ${entityId}`,
      );
    } catch (recordError: any) {
      this.logger.error(
        `Failed to record sync error: ${recordError?.message}`,
        recordError?.stack,
      );
    }
  }

  /**
   * Categorize error for error type
   *
   * @param error - Error object
   * @returns Error type
   */
  private categorizeError(
    error: any,
  ): 'AUTH' | 'RATE_LIMIT' | 'VALIDATION' | 'CONFLICT' | 'NETWORK' | 'MAPPING' | 'OTHER' {
    const message = error?.message?.toLowerCase() || '';
    const statusCode = error?.statusCode || error?.status;

    if (statusCode === 401 || message.includes('auth') || message.includes('token')) {
      return 'AUTH';
    }

    if (statusCode === 429 || message.includes('rate limit') || message.includes('too many')) {
      return 'RATE_LIMIT';
    }

    if (statusCode === 400 || message.includes('validation') || message.includes('invalid')) {
      return 'VALIDATION';
    }

    if (statusCode === 409 || message.includes('conflict') || message.includes('version')) {
      return 'CONFLICT';
    }

    if (
      error?.code === 'ECONNRESET' ||
      error?.code === 'ETIMEDOUT' ||
      error?.code === 'ENOTFOUND' ||
      message.includes('network') ||
      message.includes('timeout')
    ) {
      return 'NETWORK';
    }

    if (message.includes('mapping') || message.includes('account') || message.includes('link')) {
      return 'MAPPING';
    }

    return 'OTHER';
  }
}
