import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { QuickBooksApiClientService } from './quickbooks-api-client.service';
import {
  QBConnection,
  QBEntityLink,
  QBSyncHistory,
  QBSyncError,
} from '../entities';
import {
  CreateQBBillPaymentDto,
  QueryBillPaymentsDto,
  QBBillPaymentResponseDto,
  QBBillPaymentsListResponseDto,
  CreateBillPaymentFromPaymentApplicationDto,
  QBPaymentType,
} from '../dto';
import {
  QBEntityType,
  QBSyncDirection,
  QBSyncStatus,
} from '../enums';
import { PaymentApplication } from '../../../financials/entities/payment-application.entity';

/**
 * QuickBooks BillPayment Service
 *
 * Manages bill payment synchronization from payment applications to QuickBooks.
 * BillPayments record payments made to vendors for outstanding bills.
 *
 * Features:
 * - Create bill payments from paid payment applications
 * - Link payments to bills
 * - Support Check and CreditCard payment types
 * - Track sync status and errors
 *
 * @service
 */
@Injectable()
export class QuickBooksBillPaymentService {
  private readonly logger = new Logger(QuickBooksBillPaymentService.name);

  constructor(
    private readonly apiClient: QuickBooksApiClientService,
    private readonly dataSource: DataSource,
    @InjectRepository(QBConnection)
    private readonly connectionRepository: Repository<QBConnection>,
    @InjectRepository(QBEntityLink)
    private readonly entityLinkRepository: Repository<QBEntityLink>,
    @InjectRepository(QBSyncHistory)
    private readonly syncHistoryRepository: Repository<QBSyncHistory>,
    @InjectRepository(QBSyncError)
    private readonly syncErrorRepository: Repository<QBSyncError>,
    @InjectRepository(PaymentApplication)
    private readonly paymentApplicationRepository: Repository<PaymentApplication>,
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
   * Get bill payments from QuickBooks
   */
  async getBillPayments(
    organizationId: string,
    filters: QueryBillPaymentsDto = {},
  ): Promise<QBBillPaymentsListResponseDto> {
    const connection = await this.getConnection(organizationId);

    this.logger.log(
      `Fetching bill payments for organization ${organizationId} with filters: ${JSON.stringify(filters)}`,
    );

    // Build SQL-like query
    const conditions: string[] = [];

    if (filters.vendorRef) {
      conditions.push(`VendorRef = '${filters.vendorRef}'`);
    }

    if (filters.payType) {
      conditions.push(`PayType = '${filters.payType}'`);
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
    const query = `SELECT * FROM BillPayment${whereClause} STARTPOSITION ${filters.startPosition || 1} MAXRESULTS ${filters.maxResults || 100}`;

    try {
      const response = await this.apiClient.query<any>(
        organizationId,
        connection.qbRealmId,
        query,
      );

      const billPayments = response.QueryResponse?.BillPayment || [];

      return {
        billPayments: billPayments.map((bp: any) => this.normalizeBillPayment(bp)),
        totalCount: response.QueryResponse?.totalCount || billPayments.length,
        startPosition: filters.startPosition || 1,
        maxResults: filters.maxResults || 100,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch bill payments for organization ${organizationId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get bill payment by ID
   */
  async getBillPaymentById(
    organizationId: string,
    billPaymentId: string,
  ): Promise<QBBillPaymentResponseDto> {
    const connection = await this.getConnection(organizationId);

    this.logger.log(
      `Fetching bill payment ${billPaymentId} for organization ${organizationId}`,
    );

    try {
      const response = await this.apiClient.get<any>(
        organizationId,
        connection.qbRealmId,
        `/billpayment/${billPaymentId}`,
      );

      return this.normalizeBillPayment(response.BillPayment);
    } catch (error) {
      this.logger.error(
        `Failed to fetch bill payment ${billPaymentId} for organization ${organizationId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Create bill payment in QuickBooks
   */
  async createBillPayment(
    organizationId: string,
    data: CreateQBBillPaymentDto,
  ): Promise<QBBillPaymentResponseDto> {
    const connection = await this.getConnection(organizationId);

    this.logger.log(
      `Creating bill payment for organization ${organizationId}`,
    );

    // Build QB bill payment object
    const qbBillPayment: any = {
      VendorRef: {
        value: data.vendorRef,
      },
      PayType: data.payType,
      TotalAmt: data.totalAmt,
      TxnDate: data.txnDate,
      Line: data.lines.map((line) => ({
        Amount: line.amount,
        LinkedTxn: [
          {
            TxnId: line.linkedTxnId,
            TxnType: 'Bill',
          },
        ],
      })),
    };

    // Add payment account based on type
    if (data.payType === QBPaymentType.CHECK) {
      if (!data.bankAccountRef) {
        throw new BadRequestException(
          'Bank account reference is required for Check payments',
        );
      }
      qbBillPayment.CheckPayment = {
        BankAccountRef: {
          value: data.bankAccountRef,
        },
      };
      if (data.checkNum) {
        qbBillPayment.CheckPayment.PrintStatus = 'NeedToPrint';
      }
    } else if (data.payType === QBPaymentType.CREDIT_CARD) {
      if (!data.creditCardAccountRef) {
        throw new BadRequestException(
          'Credit card account reference is required for CreditCard payments',
        );
      }
      qbBillPayment.CreditCardPayment = {
        CCAccountRef: {
          value: data.creditCardAccountRef,
        },
      };
    }

    if (data.privateNote) qbBillPayment.PrivateNote = data.privateNote;

    try {
      const response = await this.apiClient.post<any>(
        organizationId,
        connection.qbRealmId,
        '/billpayment',
        qbBillPayment,
      );

      const billPayment = this.normalizeBillPayment(response.BillPayment);

      // Create sync history
      await this.syncHistoryRepository.save({
        organizationId,
        entityType: QBEntityType.BILL_PAYMENT,
        entityId: billPayment.id,
        syncType: 'CREATE',
        syncDirection: QBSyncDirection.TO_QB,
        status: QBSyncStatus.SUCCESS,
        requestPayload: qbBillPayment,
        responsePayload: response.BillPayment,
      });

      this.logger.log(
        `Created bill payment ${billPayment.id} for organization ${organizationId}`,
      );

      return billPayment;
    } catch (error) {
      this.logger.error(
        `Failed to create bill payment for organization ${organizationId}`,
        error,
      );

      // Create sync error
      await this.syncErrorRepository.save({
        organizationId,
        entityType: QBEntityType.BILL_PAYMENT,
        syncType: 'CREATE',
        syncDirection: QBSyncDirection.TO_QB,
        errorType: 'VALIDATION',
        errorMessage: (error as Error).message,
        requestPayload: qbBillPayment,
        retryCount: 0,
        maxRetries: 3,
      });

      throw error;
    }
  }

  /**
   * Create bill payment from payment application
   * Records payment when payment application is marked as PAID
   */
  async createBillPaymentFromPaymentApplication(
    organizationId: string,
    data: CreateBillPaymentFromPaymentApplicationDto,
  ): Promise<QBBillPaymentResponseDto> {
    const connection = await this.getConnection(organizationId);

    this.logger.log(
      `Creating bill payment from payment application ${data.paymentApplicationId} for organization ${organizationId}`,
    );

    // Get payment application with relations
    const paymentApp = await this.paymentApplicationRepository.findOne({
      where: { id: data.paymentApplicationId },
      relations: ['commitment'],
    });

    if (!paymentApp) {
      throw new NotFoundException(
        `Payment application ${data.paymentApplicationId} not found`,
      );
    }

    // Check if payment application is marked as PAID
    if (paymentApp.status !== 'PAID') {
      throw new BadRequestException(
        `Payment application ${data.paymentApplicationId} is not marked as PAID`,
      );
    }

    // Check if already synced
    const existingLink = await this.entityLinkRepository.findOne({
      where: {
        organizationId,
        platformEntityType: 'PAYMENT_APPLICATION_PAYMENT',
        platformEntityId: data.paymentApplicationId,
        qbEntityType: QBEntityType.BILL_PAYMENT,
      },
    });

    if (existingLink) {
      this.logger.warn(
        `Payment application ${data.paymentApplicationId} payment already synced as bill payment ${existingLink.qbEntityId}`,
      );
      return await this.getBillPaymentById(organizationId, existingLink.qbEntityId);
    }

    // Validate commitment has QB vendor
    const vendorRef = paymentApp.commitment?.qbVendorId;

    if (!vendorRef) {
      throw new BadRequestException(
        `Commitment ${paymentApp.commitmentId} is not linked to a QuickBooks vendor`,
      );
    }

    // Find linked bill
    const billLink = await this.entityLinkRepository.findOne({
      where: {
        organizationId,
        platformEntityType: 'PAYMENT_APPLICATION',
        platformEntityId: data.paymentApplicationId,
        qbEntityType: QBEntityType.BILL,
      },
    });

    if (!billLink) {
      throw new BadRequestException(
        `Payment application ${data.paymentApplicationId} is not linked to a QuickBooks bill. Create bill first.`,
      );
    }

    // Validate payment type and account
    if (data.payType === QBPaymentType.CHECK && !data.bankAccountRef) {
      throw new BadRequestException(
        'Bank account reference is required for Check payments',
      );
    }

    if (data.payType === QBPaymentType.CREDIT_CARD && !data.creditCardAccountRef) {
      throw new BadRequestException(
        'Credit card account reference is required for CreditCard payments',
      );
    }

    // Format dates
    const txnDate = this.formatDate(paymentApp.paidAt || new Date());

    // Create bill payment DTO
    const billPaymentDto: CreateQBBillPaymentDto = {
      vendorRef,
      payType: data.payType,
      totalAmt: paymentApp.currentPaymentDue,
      txnDate,
      lines: [
        {
          linkedTxnId: billLink.qbEntityId,
          amount: paymentApp.currentPaymentDue,
        },
      ],
      bankAccountRef: data.bankAccountRef,
      creditCardAccountRef: data.creditCardAccountRef,
      checkNum: data.checkNum,
      privateNote: `Payment for Application #${paymentApp.applicationNumber}`,
    };

    // Create bill payment in transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const billPayment = await this.createBillPayment(organizationId, billPaymentDto);

      // Create entity link
      const entityLink = this.entityLinkRepository.create({
        organizationId,
        platformEntityType: 'PAYMENT_APPLICATION_PAYMENT',
        platformEntityId: data.paymentApplicationId,
        qbEntityType: QBEntityType.BILL_PAYMENT,
        qbEntityId: billPayment.id,
        qbSyncToken: billPayment.syncToken,
        syncDirection: QBSyncDirection.TO_QB,
        syncStatus: QBSyncStatus.SUCCESS,
        lastSyncedAt: new Date(),
      });

      await queryRunner.manager.save(entityLink);

      await queryRunner.commitTransaction();

      this.logger.log(
        `Created bill payment ${billPayment.id} from payment application ${data.paymentApplicationId}`,
      );

      return billPayment;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to create bill payment from payment application ${data.paymentApplicationId}`,
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
   * Normalize QB bill payment response to DTO
   */
  private normalizeBillPayment(qbBillPayment: any): QBBillPaymentResponseDto {
    const lines = qbBillPayment.Line || [];

    return {
      id: qbBillPayment.Id,
      txnDate: qbBillPayment.TxnDate,
      vendorRef: {
        value: qbBillPayment.VendorRef.value,
        name: qbBillPayment.VendorRef.name,
      },
      payType: qbBillPayment.PayType,
      totalAmt: parseFloat(qbBillPayment.TotalAmt || '0'),
      lines: lines.map((line: any) => ({
        linkedTxnType: line.LinkedTxn?.[0]?.TxnType || 'Bill',
        linkedTxnId: line.LinkedTxn?.[0]?.TxnId || '',
        amount: parseFloat(line.Amount || '0'),
      })),
      bankAccountRef: qbBillPayment.CheckPayment?.BankAccountRef
        ? {
            value: qbBillPayment.CheckPayment.BankAccountRef.value,
            name: qbBillPayment.CheckPayment.BankAccountRef.name,
          }
        : undefined,
      creditCardAccountRef: qbBillPayment.CreditCardPayment?.CCAccountRef
        ? {
            value: qbBillPayment.CreditCardPayment.CCAccountRef.value,
            name: qbBillPayment.CreditCardPayment.CCAccountRef.name,
          }
        : undefined,
      checkNum: qbBillPayment.CheckPayment?.CheckNum,
      privateNote: qbBillPayment.PrivateNote,
      syncToken: qbBillPayment.SyncToken,
      lastUpdated: qbBillPayment.MetaData?.LastUpdatedTime,
    };
  }
}
