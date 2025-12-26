import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuickBooksBillService } from '../services/quickbooks-bill.service';
import { QuickBooksBillPaymentService } from '../services/quickbooks-bill-payment.service';
import {
  PaymentApplicationApprovedEvent,
  PaymentApplicationPaidEvent,
} from '../events';
import {
  QBConnection,
  QBSyncSettings,
  QBSyncError,
} from '../entities';
import { QBConnectionStatus } from '../enums/qb-connection-status.enum';
import { QBEntityType, QBSyncDirection } from '../enums';

/**
 * QuickBooks Sync Listener
 *
 * Event listener that automatically syncs payment applications to QuickBooks
 * when they are approved or marked as paid.
 *
 * Events handled:
 * - payment-application.approved → Creates Bill in QuickBooks
 * - payment-application.paid → Creates BillPayment in QuickBooks
 *
 * Features:
 * - Checks if QuickBooks is connected before syncing
 * - Respects sync settings (auto-sync enabled/disabled)
 * - Handles errors gracefully with logging
 * - Records sync errors for retry
 *
 * @listener
 */
@Injectable()
export class QuickBooksSyncListener {
  private readonly logger = new Logger(QuickBooksSyncListener.name);

  constructor(
    private readonly billService: QuickBooksBillService,
    private readonly billPaymentService: QuickBooksBillPaymentService,
    @InjectRepository(QBConnection)
    private readonly connectionRepository: Repository<QBConnection>,
    @InjectRepository(QBSyncSettings)
    private readonly syncSettingsRepository: Repository<QBSyncSettings>,
    @InjectRepository(QBSyncError)
    private readonly syncErrorRepository: Repository<QBSyncError>,
  ) {}

  /**
   * Handle payment application approved event
   *
   * Creates a Bill in QuickBooks when a payment application is approved.
   * Only runs if:
   * - QuickBooks is connected
   * - Auto-sync for bills is enabled
   * - Commitment has a linked QB vendor
   *
   * @param event - Payment application approved event
   */
  @OnEvent('payment-application.approved', { async: true })
  async handlePaymentApplicationApproved(
    event: PaymentApplicationApprovedEvent,
  ): Promise<void> {
    this.logger.log(
      `Received payment-application.approved event for payment application ${event.paymentApplicationId}`,
    );

    try {
      // Check if QuickBooks is connected
      const connection = await this.connectionRepository.findOne({
        where: { organizationId: event.organizationId },
      });

      if (!connection) {
        this.logger.debug(
          `QuickBooks not connected for organization ${event.organizationId}, skipping bill sync`,
        );
        return;
      }

      if (connection.status !== QBConnectionStatus.CONNECTED) {
        this.logger.debug(
          `QuickBooks connection status is ${connection.status} for organization ${event.organizationId}, skipping bill sync`,
        );
        return;
      }

      // Check if auto-sync is enabled
      const syncSettings = await this.syncSettingsRepository.findOne({
        where: { organizationId: event.organizationId },
      });

      if (!syncSettings || !syncSettings.autoSyncBills) {
        this.logger.debug(
          `Auto-sync for bills is disabled for organization ${event.organizationId}, skipping bill sync`,
        );
        return;
      }

      // Create bill in QuickBooks
      this.logger.log(
        `Creating bill in QuickBooks for payment application ${event.paymentApplicationId}`,
      );

      await this.billService.createBillFromPaymentApplication(
        event.organizationId,
        {
          paymentApplicationId: event.paymentApplicationId,
        },
      );

      this.logger.log(
        `Successfully created bill in QuickBooks for payment application ${event.paymentApplicationId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create bill in QuickBooks for payment application ${event.paymentApplicationId}: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Record sync error for retry
      try {
        const syncError = this.syncErrorRepository.create({
          organizationId: event.organizationId,
          qbEntityType: QBEntityType.BILL,
          platformEntityType: 'PAYMENT_APPLICATION',
          platformEntityId: event.paymentApplicationId,
          syncDirection: 'TO_QB' as any,
          errorType: this.categorizeError(error),
          errorMessage: (error as any)?.message || 'Unknown error',
          errorDetails: { stack: (error as any)?.stack },
          retryCount: 0,
          maxRetries: 3,
          resolved: false,
        });
        await this.syncErrorRepository.save(syncError);
      } catch (saveError: any) {
        this.logger.error(
          `Failed to save sync error: ${saveError?.message}`,
          saveError?.stack,
        );
      }
    }
  }

  /**
   * Handle payment application paid event
   *
   * Creates a BillPayment in QuickBooks when a payment application is marked as paid.
   * Only runs if:
   * - QuickBooks is connected
   * - Auto-sync for bill payments is enabled
   * - Payment application has a linked Bill in QuickBooks
   *
   * @param event - Payment application paid event
   */
  @OnEvent('payment-application.paid', { async: true })
  async handlePaymentApplicationPaid(
    event: PaymentApplicationPaidEvent,
  ): Promise<void> {
    this.logger.log(
      `Received payment-application.paid event for payment application ${event.paymentApplicationId}`,
    );

    try {
      // Check if QuickBooks is connected
      const connection = await this.connectionRepository.findOne({
        where: { organizationId: event.organizationId },
      });

      if (!connection) {
        this.logger.debug(
          `QuickBooks not connected for organization ${event.organizationId}, skipping bill payment sync`,
        );
        return;
      }

      if (connection.status !== QBConnectionStatus.CONNECTED) {
        this.logger.debug(
          `QuickBooks connection status is ${connection.status} for organization ${event.organizationId}, skipping bill payment sync`,
        );
        return;
      }

      // Check if auto-sync is enabled
      const syncSettings = await this.syncSettingsRepository.findOne({
        where: { organizationId: event.organizationId },
      });

      if (!syncSettings || !syncSettings.autoSyncBillPayments) {
        this.logger.debug(
          `Auto-sync for bill payments is disabled for organization ${event.organizationId}, skipping bill payment sync`,
        );
        return;
      }

      // Check if default payment account is configured
      if (!syncSettings.defaultBankAccountId) {
        this.logger.warn(
          `No default bank account configured for organization ${event.organizationId}, cannot create bill payment`,
        );

        const syncError = this.syncErrorRepository.create({
          organizationId: event.organizationId,
          qbEntityType: QBEntityType.BILL_PAYMENT,
          platformEntityType: 'PAYMENT_APPLICATION_PAYMENT',
          platformEntityId: event.paymentApplicationId,
          syncDirection: 'TO_QB' as any,
          errorType: 'MAPPING',
          errorMessage:
            'No default bank account configured. Please configure defaultBankAccountId in sync settings.',
          retryCount: 0,
          maxRetries: 0, // Don't retry, requires user configuration
          resolved: false,
        });
        await this.syncErrorRepository.save(syncError);

        return;
      }

      // Use Check payment type with default bank account
      const payType = 'Check';
      const bankAccountRef = syncSettings.defaultBankAccountId;

      // Create bill payment in QuickBooks
      this.logger.log(
        `Creating bill payment in QuickBooks for payment application ${event.paymentApplicationId}`,
      );

      await this.billPaymentService.createBillPaymentFromPaymentApplication(
        event.organizationId,
        {
          paymentApplicationId: event.paymentApplicationId,
          payType: payType as any,
          bankAccountRef,
        },
      );

      this.logger.log(
        `Successfully created bill payment in QuickBooks for payment application ${event.paymentApplicationId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create bill payment in QuickBooks for payment application ${event.paymentApplicationId}: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Record sync error for retry
      try {
        const syncError = this.syncErrorRepository.create({
          organizationId: event.organizationId,
          qbEntityType: QBEntityType.BILL_PAYMENT,
          platformEntityType: 'PAYMENT_APPLICATION_PAYMENT',
          platformEntityId: event.paymentApplicationId,
          syncDirection: 'TO_QB' as any,
          errorType: this.categorizeError(error),
          errorMessage: (error as any)?.message || 'Unknown error',
          errorDetails: { stack: (error as any)?.stack },
          retryCount: 0,
          maxRetries: 3,
          resolved: false,
        });
        await this.syncErrorRepository.save(syncError);
      } catch (saveError: any) {
        this.logger.error(
          `Failed to save sync error: ${saveError?.message}`,
          saveError?.stack,
        );
      }
    }
  }

  /**
   * Categorize error type for sync error tracking
   */
  private categorizeError(error: any): 'AUTH' | 'RATE_LIMIT' | 'VALIDATION' | 'CONFLICT' | 'NETWORK' | 'MAPPING' | 'OTHER' {
    if (error.status === 401 || error.message?.includes('auth')) {
      return 'AUTH';
    }
    if (error.status === 429 || error.message?.includes('rate limit')) {
      return 'RATE_LIMIT';
    }
    if (error.status === 400 || error.message?.includes('validation')) {
      return 'VALIDATION';
    }
    if (error.message?.includes('mapping') || error.message?.includes('account')) {
      return 'MAPPING';
    }
    if (error.message?.includes('not found')) {
      return 'OTHER';
    }
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return 'NETWORK';
    }
    return 'OTHER';
  }
}
