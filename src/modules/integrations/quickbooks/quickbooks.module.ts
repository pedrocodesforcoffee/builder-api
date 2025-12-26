import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import {
  QBConnection,
  QBSyncSettings,
  QBAccountMapping,
  QBEntityLink,
  QBSyncHistory,
  QBSyncError,
} from './entities';
import {
  QuickBooksConfigService,
  QuickBooksAuthService,
  QuickBooksApiClientService,
  QuickBooksCompanyService,
  QuickBooksAccountService,
  QuickBooksVendorService,
  QuickBooksBillService,
  QuickBooksBillPaymentService,
  QuickBooksCustomerService,
  QuickBooksInvoiceService,
  QuickBooksJournalEntryService,
  QuickBooksWebhookService,
} from './services';
import {
  QuickBooksAuthController,
  QuickBooksAccountController,
  QuickBooksVendorController,
  QuickBooksCustomerController,
  QuickBooksInvoiceController,
  QuickBooksJournalEntryController,
  QuickBooksWebhookController,
  QuickBooksConnectionController,
  QuickBooksSyncSettingsController,
  QuickBooksSyncOperationsController,
  QuickBooksSyncErrorController,
  QuickBooksEntityLinkController,
  QuickBooksSyncHistoryController,
  QuickBooksBillController,
  QuickBooksAccountMappingController,
} from './controllers';
import { Commitment } from '../../financials/entities/commitment.entity';
import { PaymentApplication } from '../../financials/entities/payment-application.entity';
import { PaymentApplicationItem } from '../../financials/entities/payment-application-item.entity';
import { ScheduleOfValuesItem } from '../../financials/entities/schedule-of-values-item.entity';
import { QuickBooksSyncListener } from './listeners';
import {
  QuickBooksWebhookProcessor,
  QuickBooksFullSyncProcessor,
  QuickBooksScheduledSyncProcessor,
  QuickBooksTokenRefreshProcessor,
} from './processors';

/**
 * QuickBooks Integration Module
 *
 * Provides QuickBooks Online integration capabilities:
 * - OAuth 2.0 authentication
 * - Bidirectional data synchronization
 * - Chart of accounts mapping
 * - Vendor, bill, invoice, and journal entry sync
 * - Webhook handling
 * - Sync error tracking and retry
 *
 * @module QuickBooksModule
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      QBConnection,
      QBSyncSettings,
      QBAccountMapping,
      QBEntityLink,
      QBSyncHistory,
      QBSyncError,
      Commitment,
      PaymentApplication,
      PaymentApplicationItem,
      ScheduleOfValuesItem,
    ]),
    BullModule.registerQueue(
      {
        name: 'quickbooks-sync',
      },
      {
        name: 'quickbooks-webhook',
      },
      {
        name: 'quickbooks-scheduled-sync',
      },
      {
        name: 'quickbooks-token-refresh',
      },
    ),
  ],
  controllers: [
    QuickBooksAuthController,
    QuickBooksAccountController,
    QuickBooksVendorController,
    QuickBooksCustomerController,
    QuickBooksInvoiceController,
    QuickBooksJournalEntryController,
    QuickBooksWebhookController,
    QuickBooksConnectionController,
    QuickBooksSyncSettingsController,
    QuickBooksSyncOperationsController,
    QuickBooksSyncErrorController,
    QuickBooksEntityLinkController,
    QuickBooksSyncHistoryController,
    QuickBooksBillController,
    QuickBooksAccountMappingController,
  ],
  providers: [
    QuickBooksConfigService,
    QuickBooksAuthService,
    QuickBooksApiClientService,
    QuickBooksCompanyService,
    QuickBooksAccountService,
    QuickBooksVendorService,
    QuickBooksBillService,
    QuickBooksBillPaymentService,
    QuickBooksCustomerService,
    QuickBooksInvoiceService,
    QuickBooksJournalEntryService,
    QuickBooksWebhookService,
    QuickBooksSyncListener,
    QuickBooksWebhookProcessor,
    QuickBooksFullSyncProcessor,
    QuickBooksScheduledSyncProcessor,
    QuickBooksTokenRefreshProcessor,
  ],
  exports: [
    TypeOrmModule,
    QuickBooksConfigService,
    QuickBooksAuthService,
    QuickBooksApiClientService,
    QuickBooksCompanyService,
    QuickBooksAccountService,
    QuickBooksVendorService,
    QuickBooksBillService,
    QuickBooksBillPaymentService,
    QuickBooksCustomerService,
    QuickBooksInvoiceService,
    QuickBooksJournalEntryService,
    QuickBooksWebhookService,
  ],
})
export class QuickBooksModule {}
