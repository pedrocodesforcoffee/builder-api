import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { QuickBooksApiClientService } from './quickbooks-api-client.service';
import { QuickBooksConfigService } from './quickbooks-config.service';
import {
  QBConnection,
  QBAccountMapping,
  QBEntityLink,
  QBSyncSettings,
  QBSyncHistory,
  QBSyncError,
} from '../entities';
import {
  CreateQBBillDto,
  QueryBillsDto,
  QBBillResponseDto,
  QBBillsListResponseDto,
  CreateBillFromPaymentApplicationDto,
} from '../dto';
import {
  QBEntityType,
  QBSyncDirection,
  QBSyncStatus,
} from '../enums';
import { PaymentApplication } from '../../../financials/entities/payment-application.entity';
import { PaymentApplicationItem } from '../../../financials/entities/payment-application-item.entity';
import { ScheduleOfValuesItem } from '../../../financials/entities/schedule-of-values-item.entity';

/**
 * QuickBooks Bill Service
 *
 * Manages bill synchronization from payment applications to QuickBooks.
 * Bills represent invoices received from vendors for goods or services.
 *
 * Features:
 * - Create bills from approved payment applications
 * - Map payment application line items to bill lines
 * - Use account mappings for cost code to QB account
 * - Handle retention/retainage
 * - Link bills to payment applications
 * - Track sync status and errors
 *
 * @service
 */
@Injectable()
export class QuickBooksBillService {
  private readonly logger = new Logger(QuickBooksBillService.name);

  constructor(
    private readonly apiClient: QuickBooksApiClientService,
    private readonly configService: QuickBooksConfigService,
    private readonly dataSource: DataSource,
    @InjectRepository(QBConnection)
    private readonly connectionRepository: Repository<QBConnection>,
    @InjectRepository(QBAccountMapping)
    private readonly accountMappingRepository: Repository<QBAccountMapping>,
    @InjectRepository(QBEntityLink)
    private readonly entityLinkRepository: Repository<QBEntityLink>,
    @InjectRepository(QBSyncSettings)
    private readonly syncSettingsRepository: Repository<QBSyncSettings>,
    @InjectRepository(QBSyncHistory)
    private readonly syncHistoryRepository: Repository<QBSyncHistory>,
    @InjectRepository(QBSyncError)
    private readonly syncErrorRepository: Repository<QBSyncError>,
    @InjectRepository(PaymentApplication)
    private readonly paymentApplicationRepository: Repository<PaymentApplication>,
    @InjectRepository(PaymentApplicationItem)
    private readonly paymentApplicationItemRepository: Repository<PaymentApplicationItem>,
  ) {}

  /**
   * Get connection for organization
   */
  private async getConnection(organizationId: string): Promise<QBConnection> {
    const connection = await this.connectionRepository.findOne({
      where: { organizationId },
    });

    if (!connection) {
      throw new NotFoundException(
        `QuickBooks connection not found for organization ${organizationId}`,
      );
    }

    return connection;
  }

  /**
   * Get bills from QuickBooks
   */
  async getBills(
    organizationId: string,
    filters: QueryBillsDto = {},
  ): Promise<QBBillsListResponseDto> {
    const connection = await this.getConnection(organizationId);

    this.logger.log(
      `Fetching bills for organization ${organizationId} with filters: ${JSON.stringify(filters)}`,
    );

    // Build SQL-like query
    const conditions: string[] = [];

    if (filters.vendorRef) {
      conditions.push(`VendorRef = '${filters.vendorRef}'`);
    }

    if (filters.unpaidOnly) {
      conditions.push(`Balance > 0`);
    }

    if (filters.txnDateFrom && filters.txnDateTo) {
      conditions.push(
        `TxnDate >= '${filters.txnDateFrom}' AND TxnDate <= '${filters.txnDateTo}'`,
      );
    } else if (filters.txnDateFrom) {
      conditions.push(`TxnDate >= '${filters.txnDateFrom}'`);
    } else if (filters.txnDateTo) {
      conditions.push(`TxnDate <= '${filters.txnDateTo}'`);
    }

    const whereClause =
      conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT * FROM Bill${whereClause} STARTPOSITION ${filters.startPosition || 1} MAXRESULTS ${filters.maxResults || 100}`;

    try {
      const response = await this.apiClient.query<any>(
        organizationId,
        connection.qbRealmId,
        query,
      );

      const bills = response.QueryResponse?.Bill || [];

      return {
        bills: bills.map((bill: any) => this.normalizeBill(bill)),
        totalCount: response.QueryResponse?.totalCount || bills.length,
        startPosition: filters.startPosition || 1,
        maxResults: filters.maxResults || 100,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch bills for organization ${organizationId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get bill by ID
   */
  async getBillById(
    organizationId: string,
    billId: string,
  ): Promise<QBBillResponseDto> {
    const connection = await this.getConnection(organizationId);

    this.logger.log(
      `Fetching bill ${billId} for organization ${organizationId}`,
    );

    try {
      const response = await this.apiClient.get<any>(
        organizationId,
        connection.qbRealmId,
        `/bill/${billId}`,
      );

      return this.normalizeBill(response.Bill);
    } catch (error) {
      this.logger.error(
        `Failed to fetch bill ${billId} for organization ${organizationId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Create bill in QuickBooks
   */
  async createBill(
    organizationId: string,
    data: CreateQBBillDto,
  ): Promise<QBBillResponseDto> {
    const connection = await this.getConnection(organizationId);

    this.logger.log(
      `Creating bill for organization ${organizationId}`,
    );

    // Build QB bill object
    const qbBill: any = {
      VendorRef: {
        value: data.vendorRef,
      },
      APAccountRef: {
        value: data.apAccountRef,
      },
      TxnDate: data.txnDate,
      DueDate: data.dueDate,
      Line: data.accountLines.map((line, index) => ({
        Id: (index + 1).toString(),
        DetailType: 'AccountBasedExpenseLineDetail',
        Amount: line.amount,
        Description: line.description,
        AccountBasedExpenseLineDetail: {
          AccountRef: {
            value: line.accountRef,
          },
          ...(line.customerRef && {
            CustomerRef: {
              value: line.customerRef,
            },
          }),
          ...(line.classRef && {
            ClassRef: {
              value: line.classRef,
            },
          }),
          ...(line.billableStatus && {
            BillableStatus: line.billableStatus,
          }),
        },
      })),
    };

    if (data.docNumber) qbBill.DocNumber = data.docNumber;
    if (data.privateNote) qbBill.PrivateNote = data.privateNote;
    if (data.termRef) {
      qbBill.SalesTermRef = {
        value: data.termRef,
      };
    }

    try {
      const response = await this.apiClient.post<any>(
        organizationId,
        connection.qbRealmId,
        '/bill',
        qbBill,
      );

      const bill = this.normalizeBill(response.Bill);

      // Create sync history
      await this.syncHistoryRepository.save({
        organizationId,
        entityType: QBEntityType.BILL,
        entityId: bill.id,
        syncType: 'CREATE',
        syncDirection: QBSyncDirection.TO_QB,
        status: QBSyncStatus.SUCCESS,
        requestPayload: qbBill,
        responsePayload: response.Bill,
      });

      this.logger.log(
        `Created bill ${bill.id} for organization ${organizationId}`,
      );

      return bill;
    } catch (error) {
      this.logger.error(
        `Failed to create bill for organization ${organizationId}`,
        error,
      );

      // Create sync error
      await this.syncErrorRepository.save({
        organizationId,
        entityType: QBEntityType.BILL,
        syncType: 'CREATE',
        syncDirection: QBSyncDirection.TO_QB,
        errorType: 'VALIDATION',
        errorMessage: (error as Error).message,
        requestPayload: qbBill,
        retryCount: 0,
        maxRetries: 3,
      });

      throw error;
    }
  }

  /**
   * Create bill from payment application
   * Maps payment application data to QB bill format
   */
  async createBillFromPaymentApplication(
    organizationId: string,
    data: CreateBillFromPaymentApplicationDto,
  ): Promise<QBBillResponseDto> {
    const connection = await this.getConnection(organizationId);

    this.logger.log(
      `Creating bill from payment application ${data.paymentApplicationId} for organization ${organizationId}`,
    );

    // Get payment application with relations
    const paymentApp = await this.paymentApplicationRepository.findOne({
      where: { id: data.paymentApplicationId },
      relations: ['commitment', 'items', 'items.sovItem'],
    });

    if (!paymentApp) {
      throw new NotFoundException(
        `Payment application ${data.paymentApplicationId} not found`,
      );
    }

    // Check if already synced
    const existingLink = await this.entityLinkRepository.findOne({
      where: {
        organizationId,
        platformEntityType: 'PAYMENT_APPLICATION',
        platformEntityId: data.paymentApplicationId,
        qbEntityType: QBEntityType.BILL,
      },
    });

    if (existingLink) {
      this.logger.warn(
        `Payment application ${data.paymentApplicationId} already synced as bill ${existingLink.qbEntityId}`,
      );
      return await this.getBillById(organizationId, existingLink.qbEntityId);
    }

    // Validate commitment has QB vendor
    const vendorRef =
      data.vendorRef || paymentApp.commitment?.qbVendorId;

    if (!vendorRef) {
      throw new BadRequestException(
        `Commitment ${paymentApp.commitmentId} is not linked to a QuickBooks vendor`,
      );
    }

    // Get AP account from sync settings or data
    let apAccountRef = data.apAccountRef;
    if (!apAccountRef) {
      const syncSettings = await this.syncSettingsRepository.findOne({
        where: { organizationId },
      });

      if (!syncSettings || !syncSettings.defaultApAccountId) {
        throw new BadRequestException(
          'No Accounts Payable account specified. Please configure sync settings or provide apAccountRef.',
        );
      }

      apAccountRef = syncSettings.defaultApAccountId;
    }

    // Build line items from payment application items
    const lineItems: any[] = [];

    for (const item of paymentApp.items || []) {
      // Get cost code from SOV item
      const costCodeId = item.sovItem?.costCodeId;

      if (!costCodeId) {
        this.logger.warn(
          `Payment application item ${item.id} has no cost code, skipping`,
        );
        continue;
      }

      // Find account mapping for cost code
      const accountMapping = await this.accountMappingRepository.findOne({
        where: {
          organizationId,
          costCodeId,
        },
      });

      if (!accountMapping) {
        throw new BadRequestException(
          `No QuickBooks account mapping found for cost code ${costCodeId}. Please map cost codes to accounts first.`,
        );
      }

      // Add line item for this period's progress
      lineItems.push({
        description: item.description,
        amount: item.workCompletedThisPeriod + item.materialsStoredThisPeriod,
        accountRef: accountMapping.qbAccountId,
      });
    }

    if (lineItems.length === 0) {
      throw new BadRequestException(
        'Payment application has no line items with valid cost code mappings',
      );
    }

    // Format dates
    const txnDate = this.formatDate(paymentApp.applicationDate);
    const dueDate = txnDate; // Same as application date by default

    // Create bill DTO
    const billDto: CreateQBBillDto = {
      vendorRef,
      apAccountRef,
      txnDate,
      dueDate,
      accountLines: lineItems,
      docNumber: `PayApp-${paymentApp.applicationNumber}`,
      privateNote: `Payment Application #${paymentApp.applicationNumber} for ${paymentApp.commitment?.vendorName || 'Vendor'}`,
    };

    // Create bill in transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const bill = await this.createBill(organizationId, billDto);

      // Create entity link
      const entityLink = this.entityLinkRepository.create({
        organizationId,
        platformEntityType: 'PAYMENT_APPLICATION',
        platformEntityId: data.paymentApplicationId,
        qbEntityType: QBEntityType.BILL,
        qbEntityId: bill.id,
        qbSyncToken: bill.syncToken,
        syncDirection: QBSyncDirection.TO_QB,
        syncStatus: QBSyncStatus.SUCCESS,
        lastSyncedAt: new Date(),
      });

      await queryRunner.manager.save(entityLink);

      await queryRunner.commitTransaction();

      this.logger.log(
        `Created bill ${bill.id} from payment application ${data.paymentApplicationId}`,
      );

      return bill;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to create bill from payment application ${data.paymentApplicationId}`,
        error,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Format date to YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Normalize QB bill response to DTO
   */
  private normalizeBill(qbBill: any): QBBillResponseDto {
    const lines = qbBill.Line?.filter((line: any) => line.DetailType !== 'SubTotalLineDetail') || [];

    return {
      id: qbBill.Id,
      docNumber: qbBill.DocNumber,
      txnDate: qbBill.TxnDate,
      dueDate: qbBill.DueDate,
      vendorRef: {
        value: qbBill.VendorRef.value,
        name: qbBill.VendorRef.name,
      },
      apAccountRef: {
        value: qbBill.APAccountRef.value,
        name: qbBill.APAccountRef.name,
      },
      totalAmt: parseFloat(qbBill.TotalAmt || '0'),
      balance: parseFloat(qbBill.Balance || '0'),
      lines: lines.map((line: any, index: number) => ({
        lineNum: index + 1,
        detailType: line.DetailType,
        description: line.Description,
        amount: parseFloat(line.Amount || '0'),
        accountRef: line.AccountBasedExpenseLineDetail?.AccountRef
          ? {
              value: line.AccountBasedExpenseLineDetail.AccountRef.value,
              name: line.AccountBasedExpenseLineDetail.AccountRef.name,
            }
          : undefined,
        customerRef: line.AccountBasedExpenseLineDetail?.CustomerRef
          ? {
              value: line.AccountBasedExpenseLineDetail.CustomerRef.value,
              name: line.AccountBasedExpenseLineDetail.CustomerRef.name,
            }
          : undefined,
        classRef: line.AccountBasedExpenseLineDetail?.ClassRef
          ? {
              value: line.AccountBasedExpenseLineDetail.ClassRef.value,
              name: line.AccountBasedExpenseLineDetail.ClassRef.name,
            }
          : undefined,
      })),
      privateNote: qbBill.PrivateNote,
      termRef: qbBill.SalesTermRef
        ? {
            value: qbBill.SalesTermRef.value,
            name: qbBill.SalesTermRef.name,
          }
        : undefined,
      syncToken: qbBill.SyncToken,
      lastUpdated: qbBill.MetaData?.LastUpdatedTime,
    };
  }
}
