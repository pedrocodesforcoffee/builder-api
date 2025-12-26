import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QBConnection, QBEntityLink } from '../entities';
import { QuickBooksApiClientService } from './quickbooks-api-client.service';
import {
  CreateQBCustomerDto,
  UpdateQBCustomerDto,
  QBCustomerResponseDto,
  QueryCustomersDto,
  QBCustomersListResponseDto,
  LinkCustomerDto,
  SyncCustomerDto,
  CustomerSyncResultDto,
} from '../dto';
import { QBEntityType } from '../enums';

/**
 * QuickBooks Customer Service
 *
 * Manages customer (owner) synchronization between platform and QuickBooks.
 * Creates and links customers for invoice generation.
 */
@Injectable()
export class QuickBooksCustomerService {
  private readonly logger = new Logger(QuickBooksCustomerService.name);

  constructor(
    @InjectRepository(QBConnection)
    private readonly connectionRepository: Repository<QBConnection>,
    @InjectRepository(QBEntityLink)
    private readonly entityLinkRepository: Repository<QBEntityLink>,
    private readonly apiClient: QuickBooksApiClientService,
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
   * List customers from QuickBooks
   */
  async getCustomers(
    organizationId: string,
    filters: QueryCustomersDto,
  ): Promise<QBCustomersListResponseDto> {
    const connection = await this.getConnection(organizationId);

    const { active, displayName, maxResults = 100, startPosition = 1 } = filters;

    let query = 'SELECT * FROM Customer';
    const conditions: string[] = [];

    if (active !== undefined) {
      conditions.push(`Active = ${active}`);
    }

    if (displayName) {
      conditions.push(`DisplayName LIKE '%${displayName}%'`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;

    const response = await this.apiClient.query<QBCustomerResponseDto[]>(
      organizationId,
      connection.qbRealmId,
      query,
    );

    return {
      customers: response || [],
      totalCount: response?.length || 0,
      startPosition,
      maxResults,
    };
  }

  /**
   * Get customer by ID from QuickBooks
   */
  async getCustomerById(
    organizationId: string,
    customerId: string,
  ): Promise<QBCustomerResponseDto> {
    const connection = await this.getConnection(organizationId);

    const response = await this.apiClient.get<{ Customer: QBCustomerResponseDto }>(
      organizationId,
      connection.qbRealmId,
      `/customer/${customerId}`,
    );

    return response.Customer;
  }

  /**
   * Create customer in QuickBooks
   */
  async createCustomer(
    organizationId: string,
    dto: CreateQBCustomerDto,
  ): Promise<QBCustomerResponseDto> {
    const connection = await this.getConnection(organizationId);

    this.logger.log(`Creating customer in QuickBooks: ${dto.displayName}`);

    const payload = {
      DisplayName: dto.displayName,
      GivenName: dto.givenName,
      FamilyName: dto.familyName,
      CompanyName: dto.companyName,
      PrimaryEmailAddr: dto.primaryEmailAddr ? { Address: dto.primaryEmailAddr } : undefined,
      PrimaryPhone: dto.primaryPhone ? { FreeFormNumber: dto.primaryPhone } : undefined,
      BillAddr: dto.billAddr,
      ShipAddr: dto.shipAddr,
      Notes: dto.notes,
      TermRef: dto.paymentTermsRef ? { value: dto.paymentTermsRef } : undefined,
      Active: dto.active !== undefined ? dto.active : true,
    };

    const response = await this.apiClient.post<{ Customer: QBCustomerResponseDto }>(
      organizationId,
      connection.qbRealmId,
      '/customer',
      payload,
    );

    this.logger.log(`Created customer in QuickBooks: ${response.Customer.id}`);

    return response.Customer;
  }

  /**
   * Update customer in QuickBooks
   */
  async updateCustomer(
    organizationId: string,
    dto: UpdateQBCustomerDto,
  ): Promise<QBCustomerResponseDto> {
    const connection = await this.getConnection(organizationId);

    this.logger.log(`Updating customer in QuickBooks: ${dto.id}`);

    const payload = {
      Id: dto.id,
      SyncToken: dto.syncToken,
      DisplayName: dto.displayName,
      GivenName: dto.givenName,
      FamilyName: dto.familyName,
      CompanyName: dto.companyName,
      PrimaryEmailAddr: dto.primaryEmailAddr ? { Address: dto.primaryEmailAddr } : undefined,
      PrimaryPhone: dto.primaryPhone ? { FreeFormNumber: dto.primaryPhone } : undefined,
      BillAddr: dto.billAddr,
      ShipAddr: dto.shipAddr,
      Notes: dto.notes,
      Active: dto.active,
    };

    const response = await this.apiClient.post<{ Customer: QBCustomerResponseDto }>(
      organizationId,
      connection.qbRealmId,
      '/customer',
      payload,
    );

    this.logger.log(`Updated customer in QuickBooks: ${response.Customer.id}`);

    return response.Customer;
  }

  /**
   * Link entity to QuickBooks customer
   */
  async linkCustomer(
    organizationId: string,
    dto: LinkCustomerDto,
  ): Promise<void> {
    await this.getConnection(organizationId);

    // Check if already linked
    const existingLink = await this.entityLinkRepository.findOne({
      where: {
        organizationId,
        platformEntityType: 'PROJECT', // or 'OWNER'
        platformEntityId: dto.entityId,
      },
    });

    if (existingLink) {
      throw new BadRequestException('Entity is already linked to a QuickBooks customer');
    }

    // Verify customer exists in QB
    await this.getCustomerById(organizationId, dto.qbCustomerId);

    // Create link
    const link = this.entityLinkRepository.create({
      organizationId,
      platformEntityType: 'PROJECT',
      platformEntityId: dto.entityId,
      qbEntityType: QBEntityType.CUSTOMER,
      qbEntityId: dto.qbCustomerId,
      syncDirection: 'TO_QB' as any,
      syncStatus: 'SYNCED' as any,
      lastSyncedAt: new Date(),
    });

    await this.entityLinkRepository.save(link);

    this.logger.log(`Linked entity ${dto.entityId} to QB customer ${dto.qbCustomerId}`);
  }

  /**
   * Sync customer from platform entity
   */
  async syncCustomerFromEntity(
    organizationId: string,
    dto: SyncCustomerDto,
  ): Promise<CustomerSyncResultDto> {
    try {
      await this.getConnection(organizationId);

      // Check if already linked
      const existingLink = await this.entityLinkRepository.findOne({
        where: {
          organizationId,
          platformEntityType: 'PROJECT',
          platformEntityId: dto.entityId,
        },
      });

      let qbCustomer: QBCustomerResponseDto;
      let operation: 'created' | 'updated';

      if (existingLink) {
        // Update existing customer
        const existing = await this.getCustomerById(organizationId, existingLink.qbEntityId);
        qbCustomer = await this.updateCustomer(organizationId, {
          id: existing.id,
          syncToken: existing.syncToken,
          displayName: dto.displayName || existing.displayName,
          primaryEmailAddr: dto.email,
          primaryPhone: dto.phone,
          billAddr: dto.address,
        });
        operation = 'updated';
      } else {
        // Create new customer
        qbCustomer = await this.createCustomer(organizationId, {
          displayName: dto.displayName!,
          primaryEmailAddr: dto.email,
          primaryPhone: dto.phone,
          billAddr: dto.address,
        });

        // Create link
        const link = this.entityLinkRepository.create({
          organizationId,
          platformEntityType: 'PROJECT',
          platformEntityId: dto.entityId,
          qbEntityType: QBEntityType.CUSTOMER,
          qbEntityId: qbCustomer.id,
          syncDirection: 'TO_QB' as any,
          syncStatus: 'SYNCED' as any,
          lastSyncedAt: new Date(),
        });

        await this.entityLinkRepository.save(link);
        operation = 'created';
      }

      this.logger.log(`Synced customer ${qbCustomer.id} (${operation})`);

      return {
        success: true,
        qbCustomerId: qbCustomer.id,
        entityId: dto.entityId,
        operation,
      };
    } catch (error: any) {
      this.logger.error(`Failed to sync customer: ${error?.message}`, error?.stack);
      return {
        success: false,
        qbCustomerId: '',
        entityId: dto.entityId,
        error: error?.message || 'Unknown error',
      };
    }
  }

  /**
   * Get QB customer ID for platform entity
   */
  async getQBCustomerIdForEntity(
    organizationId: string,
    entityId: string,
  ): Promise<string | null> {
    const link = await this.entityLinkRepository.findOne({
      where: {
        organizationId,
        platformEntityType: 'PROJECT',
        platformEntityId: entityId,
      },
    });

    return link?.qbEntityId || null;
  }
}
