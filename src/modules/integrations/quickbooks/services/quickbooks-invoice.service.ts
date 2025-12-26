import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QBConnection, QBEntityLink } from '../entities';
import { QuickBooksApiClientService } from './quickbooks-api-client.service';
import { QuickBooksCustomerService } from './quickbooks-customer.service';
import {
  CreateQBInvoiceDto,
  UpdateQBInvoiceDto,
  QBInvoiceResponseDto,
  QueryInvoicesDto,
  QBInvoicesListResponseDto,
  CreateInvoiceFromOwnerBillingDto,
  InvoiceExportResultDto,
  InvoiceStatusDto,
  RecordInvoicePaymentDto,
  QBPaymentResponseDto,
  InvoiceSyncResultDto,
} from '../dto';
import { QBEntityType } from '../enums';

/**
 * QuickBooks Invoice Service
 *
 * Manages invoice synchronization between platform owner billing and QuickBooks.
 * Creates invoices for progress payments and records payments.
 */
@Injectable()
export class QuickBooksInvoiceService {
  private readonly logger = new Logger(QuickBooksInvoiceService.name);

  constructor(
    @InjectRepository(QBConnection)
    private readonly connectionRepository: Repository<QBConnection>,
    @InjectRepository(QBEntityLink)
    private readonly entityLinkRepository: Repository<QBEntityLink>,
    private readonly apiClient: QuickBooksApiClientService,
    private readonly customerService: QuickBooksCustomerService,
  ) {}

  /**
   * Get connection for organization
   */
  private async getConnection(organizationId: string): Promise<QBConnection> {
    const connection = await this.connectionRepository.findOne({
      where: { organizationId },
    });

    if (!connection) {
      throw new NotFoundException(`No QuickBooks connection found for organization ${organizationId}`);
    }

    return connection;
  }

  /**
   * List invoices from QuickBooks
   */
  async getInvoices(
    organizationId: string,
    filters: QueryInvoicesDto,
  ): Promise<QBInvoicesListResponseDto> {
    const connection = await this.getConnection(organizationId);

    const { customerId, status, startDate, endDate, maxResults = 100, startPosition = 1 } = filters;

    let query = 'SELECT * FROM Invoice';
    const conditions: string[] = [];

    if (customerId) {
      conditions.push(`CustomerRef = '${customerId}'`);
    }

    if (status === 'open') {
      conditions.push(`Balance > 0`);
    } else if (status === 'paid') {
      conditions.push(`Balance = 0`);
    } else if (status === 'overdue') {
      conditions.push(`Balance > 0 AND DueDate < CURRENT_DATE`);
    }

    if (startDate) {
      conditions.push(`TxnDate >= '${startDate}'`);
    }

    if (endDate) {
      conditions.push(`TxnDate <= '${endDate}'`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;

    const response = await this.apiClient.query<QBInvoiceResponseDto[]>(
      organizationId,
      connection.qbRealmId,
      query,
    );

    return {
      invoices: response || [],
      totalCount: response?.length || 0,
    };
  }

  /**
   * Get invoice by ID from QuickBooks
   */
  async getInvoiceById(
    organizationId: string,
    invoiceId: string,
  ): Promise<QBInvoiceResponseDto> {
    const connection = await this.getConnection(organizationId);

    const response = await this.apiClient.get<{ Invoice: QBInvoiceResponseDto }>(
      organizationId,
      connection.qbRealmId,
      `/invoice/${invoiceId}`,
    );

    return response.Invoice;
  }

  /**
   * Create invoice in QuickBooks
   */
  async createInvoice(
    organizationId: string,
    dto: CreateQBInvoiceDto,
  ): Promise<QBInvoiceResponseDto> {
    const connection = await this.getConnection(organizationId);

    this.logger.log(`Creating invoice in QuickBooks for customer ${dto.customerRef}`);

    const payload = {
      CustomerRef: { value: dto.customerRef },
      TxnDate: dto.txnDate,
      DueDate: dto.dueDate,
      DocNumber: dto.docNumber,
      Line: dto.lines.map((line) => ({
        Id: line.id,
        DetailType: 'SalesItemLineDetail',
        Amount: line.amount,
        Description: line.description,
        SalesItemLineDetail: {
          ItemRef: { value: line.salesItemRef },
          Qty: line.qty,
          UnitPrice: line.unitPrice,
          TaxCodeRef: line.taxCodeRef ? { value: line.taxCodeRef } : undefined,
        },
      })),
      PrivateNote: dto.privateNote,
      CustomerMemo: dto.customerMemo ? { value: dto.customerMemo } : undefined,
      BillAddr: dto.billAddr,
      ShipAddr: dto.shipAddr,
      SalesTermRef: dto.salesTermRef ? { value: dto.salesTermRef } : undefined,
      Deposit: dto.deposit,
      EmailStatus: dto.emailStatus ? 'EmailSent' : 'NotSet',
    };

    const response = await this.apiClient.post<{ Invoice: QBInvoiceResponseDto }>(
      organizationId,
      connection.qbRealmId,
      '/invoice',
      payload,
    );

    this.logger.log(`Created invoice in QuickBooks: ${response.Invoice.id}`);

    return response.Invoice;
  }

  /**
   * Update invoice in QuickBooks
   */
  async updateInvoice(
    organizationId: string,
    dto: UpdateQBInvoiceDto,
  ): Promise<QBInvoiceResponseDto> {
    const connection = await this.getConnection(organizationId);

    this.logger.log(`Updating invoice in QuickBooks: ${dto.id}`);

    const payload = {
      Id: dto.id,
      SyncToken: dto.syncToken,
      CustomerRef: { value: dto.customerRef },
      TxnDate: dto.txnDate,
      DueDate: dto.dueDate,
      DocNumber: dto.docNumber,
      Line: dto.lines.map((line) => ({
        Id: line.id,
        DetailType: 'SalesItemLineDetail',
        Amount: line.amount,
        Description: line.description,
        SalesItemLineDetail: {
          ItemRef: { value: line.salesItemRef },
          Qty: line.qty,
          UnitPrice: line.unitPrice,
        },
      })),
      PrivateNote: dto.privateNote,
      CustomerMemo: dto.customerMemo ? { value: dto.customerMemo } : undefined,
      BillAddr: dto.billAddr,
      ShipAddr: dto.shipAddr,
    };

    const response = await this.apiClient.post<{ Invoice: QBInvoiceResponseDto }>(
      organizationId,
      connection.qbRealmId,
      '/invoice',
      payload,
    );

    this.logger.log(`Updated invoice in QuickBooks: ${response.Invoice.id}`);

    return response.Invoice;
  }

  /**
   * Record payment for an invoice
   */
  async recordInvoicePayment(
    organizationId: string,
    dto: RecordInvoicePaymentDto,
  ): Promise<QBPaymentResponseDto> {
    const connection = await this.getConnection(organizationId);

    // Get invoice to get customer reference
    const invoice = await this.getInvoiceById(organizationId, dto.invoiceId);

    this.logger.log(`Recording payment for invoice ${dto.invoiceId}: $${dto.amount}`);

    const payload = {
      CustomerRef: invoice.customerRef,
      TotalAmt: dto.amount,
      TxnDate: dto.txnDate,
      PrivateNote: dto.privateNote,
      PaymentRefNum: dto.refNumber,
      PaymentMethodRef: dto.paymentMethod ? { value: dto.paymentMethod } : undefined,
      DepositToAccountRef: dto.depositToAccountRef ? { value: dto.depositToAccountRef } : undefined,
      Line: [
        {
          Amount: dto.amount,
          LinkedTxn: [
            {
              TxnId: dto.invoiceId,
              TxnType: 'Invoice',
            },
          ],
        },
      ],
    };

    const response = await this.apiClient.post<{ Payment: QBPaymentResponseDto }>(
      organizationId,
      connection.qbRealmId,
      '/payment',
      payload,
    );

    this.logger.log(`Recorded payment in QuickBooks: ${response.Payment.id}`);

    return response.Payment;
  }

  /**
   * Export owner billing as invoice to QuickBooks
   *
   * This is the main method that:
   * 1. Ensures customer is synced
   * 2. Creates invoice in QB
   * 3. Creates entity link
   * 4. Returns export result
   */
  async exportOwnerBillingAsInvoice(
    organizationId: string,
    dto: CreateInvoiceFromOwnerBillingDto,
  ): Promise<InvoiceExportResultDto> {
    try {
      await this.getConnection(organizationId);

      this.logger.log(`Exporting owner billing ${dto.ownerBillingId} as QB invoice`);

      // Check if already exported
      const existingLink = await this.entityLinkRepository.findOne({
        where: {
          organizationId,
          platformEntityType: 'OWNER_BILLING',
          platformEntityId: dto.ownerBillingId,
          qbEntityType: QBEntityType.INVOICE,
        },
      });

      if (existingLink) {
        throw new BadRequestException('Owner billing is already exported to QuickBooks');
      }

      // TODO: Fetch owner billing entity from database to get details
      // For now, this is a placeholder - actual implementation would:
      // 1. Load OwnerBilling entity with relations (project, owner, line items)
      // 2. Ensure customer is synced (call customerService.syncCustomerFromEntity)
      // 3. Map billing line items to invoice lines
      // 4. Handle retention if includeRetentionLine is true

      // Get or create customer
      let qbCustomerId = dto.customerRef;
      if (!qbCustomerId) {
        // In real implementation, we'd sync the project owner as a customer
        // qbCustomerId = await this.customerService.syncCustomerFromEntity(...)
        throw new BadRequestException('Customer reference is required or customer must be synced first');
      }

      // Create invoice (placeholder - real implementation would map actual billing data)
      const invoice = await this.createInvoice(organizationId, {
        customerRef: qbCustomerId,
        txnDate: new Date().toISOString().split('T')[0],
        lines: [
          {
            description: 'Progress Payment',
            amount: 0, // Would come from actual billing
            salesItemRef: '', // Would come from account mapping
          },
        ],
      });

      // Create entity link
      const link = this.entityLinkRepository.create({
        organizationId,
        platformEntityType: 'OWNER_BILLING',
        platformEntityId: dto.ownerBillingId,
        qbEntityType: QBEntityType.INVOICE,
        qbEntityId: invoice.id,
        syncDirection: 'TO_QB' as any,
        syncStatus: 'SYNCED' as any,
        lastSyncedAt: new Date(),
      });

      await this.entityLinkRepository.save(link);

      this.logger.log(`Exported owner billing ${dto.ownerBillingId} to QB invoice ${invoice.id}`);

      return {
        success: true,
        qbInvoiceId: invoice.id,
        ownerBillingId: dto.ownerBillingId,
        totalAmount: invoice.totalAmt,
        invoiceNumber: invoice.docNumber,
      };
    } catch (error: any) {
      this.logger.error(`Failed to export owner billing: ${error?.message}`, error?.stack);
      return {
        success: false,
        qbInvoiceId: '',
        ownerBillingId: dto.ownerBillingId,
        totalAmount: 0,
        error: error?.message || 'Unknown error',
      };
    }
  }

  /**
   * Get invoice export status for owner billing
   */
  async getInvoiceStatus(
    organizationId: string,
    ownerBillingId: string,
  ): Promise<InvoiceStatusDto> {
    const link = await this.entityLinkRepository.findOne({
      where: {
        organizationId,
        platformEntityType: 'OWNER_BILLING',
        platformEntityId: ownerBillingId,
        qbEntityType: QBEntityType.INVOICE,
      },
    });

    if (!link) {
      return {
        isExported: false,
      };
    }

    return {
      isExported: true,
      qbInvoiceId: link.qbEntityId,
      lastSyncedAt: link.lastSyncedAt?.toISOString(),
      syncStatus: link.syncStatus as any,
      errorMessage: link.errorMessage,
    };
  }

  /**
   * Get QB invoice ID for owner billing
   */
  async getQBInvoiceIdForOwnerBilling(
    organizationId: string,
    ownerBillingId: string,
  ): Promise<string | null> {
    const link = await this.entityLinkRepository.findOne({
      where: {
        organizationId,
        platformEntityType: 'OWNER_BILLING',
        platformEntityId: ownerBillingId,
        qbEntityType: QBEntityType.INVOICE,
      },
    });

    return link?.qbEntityId || null;
  }

  /**
   * Sync multiple invoices (batch operation)
   */
  async syncInvoices(
    organizationId: string,
    ownerBillingIds: string[],
  ): Promise<InvoiceSyncResultDto> {
    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const ownerBillingId of ownerBillingIds) {
      processed++;
      try {
        const result = await this.exportOwnerBillingAsInvoice(organizationId, {
          ownerBillingId,
        });

        if (result.success) {
          succeeded++;
        } else {
          failed++;
          if (result.error) {
            errors.push(`${ownerBillingId}: ${result.error}`);
          }
        }
      } catch (error: any) {
        failed++;
        errors.push(`${ownerBillingId}: ${error?.message || 'Unknown error'}`);
      }
    }

    return {
      processed,
      succeeded,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
