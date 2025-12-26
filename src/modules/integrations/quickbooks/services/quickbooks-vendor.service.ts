import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuickBooksApiClientService } from './quickbooks-api-client.service';
import {
  QBConnection,
  QBEntityLink,
  QBSyncHistory,
  QBSyncError,
} from '../entities';
import {
  CreateQBVendorDto,
  UpdateQBVendorDto,
  QueryVendorsDto,
  QBVendorResponseDto,
  QBVendorsListResponseDto,
  LinkVendorToCommitmentDto,
  SyncVendorFromCommitmentDto,
} from '../dto';
import {
  QBEntityType,
  QBSyncDirection,
  QBSyncStatus,
} from '../enums';
import { Commitment } from '../../../financials/entities/commitment.entity';

/**
 * QuickBooks Vendor Service
 *
 * Manages vendor synchronization between the platform and QuickBooks.
 * Provides bidirectional sync capabilities with Commitment entities.
 *
 * Features:
 * - Fetch vendors from QuickBooks
 * - Create vendors in QuickBooks
 * - Update vendor information
 * - Link vendors to commitments
 * - Sync commitments to vendors
 * - Track sync status and errors
 *
 * @service
 */
@Injectable()
export class QuickBooksVendorService {
  private readonly logger = new Logger(QuickBooksVendorService.name);

  constructor(
    private readonly apiClient: QuickBooksApiClientService,
    @InjectRepository(QBConnection)
    private readonly connectionRepository: Repository<QBConnection>,
    @InjectRepository(QBEntityLink)
    private readonly entityLinkRepository: Repository<QBEntityLink>,
    @InjectRepository(QBSyncHistory)
    private readonly syncHistoryRepository: Repository<QBSyncHistory>,
    @InjectRepository(QBSyncError)
    private readonly syncErrorRepository: Repository<QBSyncError>,
    @InjectRepository(Commitment)
    private readonly commitmentRepository: Repository<Commitment>,
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
   * Get vendors from QuickBooks
   */
  async getVendors(
    organizationId: string,
    filters: QueryVendorsDto = {},
  ): Promise<QBVendorsListResponseDto> {
    const connection = await this.getConnection(organizationId);

    this.logger.log(
      `Fetching vendors for organization ${organizationId} with filters: ${JSON.stringify(filters)}`,
    );

    // Build SQL-like query
    const conditions: string[] = [];

    if (filters.displayNameContains) {
      conditions.push(`DisplayName LIKE '%${filters.displayNameContains}%'`);
    }

    if (filters.activeOnly !== false) {
      conditions.push(`Active = true`);
    }

    if (filters.vendor1099 !== undefined) {
      conditions.push(`Vendor1099 = ${filters.vendor1099}`);
    }

    const whereClause =
      conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT * FROM Vendor${whereClause} STARTPOSITION ${filters.startPosition || 1} MAXRESULTS ${filters.maxResults || 100}`;

    try {
      const response = await this.apiClient.query<any>(
        organizationId,
        connection.qbRealmId,
        query,
      );

      const vendors = response.QueryResponse?.Vendor || [];

      return {
        vendors: vendors.map((vendor: any) => this.normalizeVendor(vendor)),
        totalCount: response.QueryResponse?.totalCount || vendors.length,
        startPosition: filters.startPosition || 1,
        maxResults: filters.maxResults || 100,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch vendors for organization ${organizationId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get vendor by ID
   */
  async getVendorById(
    organizationId: string,
    vendorId: string,
  ): Promise<QBVendorResponseDto> {
    const connection = await this.getConnection(organizationId);

    this.logger.log(
      `Fetching vendor ${vendorId} for organization ${organizationId}`,
    );

    try {
      const response = await this.apiClient.get<any>(
        organizationId,
        connection.qbRealmId,
        `/vendor/${vendorId}`,
      );

      return this.normalizeVendor(response.Vendor);
    } catch (error) {
      this.logger.error(
        `Failed to fetch vendor ${vendorId} for organization ${organizationId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Create vendor in QuickBooks
   */
  async createVendor(
    organizationId: string,
    data: CreateQBVendorDto,
  ): Promise<QBVendorResponseDto> {
    const connection = await this.getConnection(organizationId);

    this.logger.log(
      `Creating vendor for organization ${organizationId}: ${data.displayName}`,
    );

    // Build QB vendor object
    const qbVendor: any = {
      DisplayName: data.displayName,
    };

    if (data.companyName) qbVendor.CompanyName = data.companyName;
    if (data.givenName) qbVendor.GivenName = data.givenName;
    if (data.familyName) qbVendor.FamilyName = data.familyName;
    if (data.printOnCheckName) qbVendor.PrintOnCheckName = data.printOnCheckName;
    if (data.accNum) qbVendor.AcctNum = data.accNum;
    if (data.vendor1099 !== undefined) qbVendor.Vendor1099 = data.vendor1099;
    if (data.taxIdentifier) qbVendor.TaxIdentifier = data.taxIdentifier;

    if (data.primaryPhone) {
      qbVendor.PrimaryPhone = {
        FreeFormNumber: data.primaryPhone.freeFormNumber,
      };
    }

    if (data.mobile) {
      qbVendor.Mobile = {
        FreeFormNumber: data.mobile.freeFormNumber,
      };
    }

    if (data.primaryEmailAddr) {
      qbVendor.PrimaryEmailAddr = {
        Address: data.primaryEmailAddr.address,
      };
    }

    if (data.webAddr) {
      qbVendor.WebAddr = {
        URI: data.webAddr,
      };
    }

    if (data.billAddr) {
      qbVendor.BillAddr = {
        Line1: data.billAddr.line1,
        Line2: data.billAddr.line2,
        Line3: data.billAddr.line3,
        City: data.billAddr.city,
        CountrySubDivisionCode: data.billAddr.countrySubDivisionCode,
        PostalCode: data.billAddr.postalCode,
        Country: data.billAddr.country,
      };
    }

    if (data.termRef) {
      qbVendor.TermRef = {
        value: data.termRef,
      };
    }

    try {
      const response = await this.apiClient.post<any>(
        organizationId,
        connection.qbRealmId,
        '/vendor',
        qbVendor,
      );

      const vendor = this.normalizeVendor(response.Vendor);

      // Create sync history
      await this.syncHistoryRepository.save({
        organizationId,
        entityType: QBEntityType.VENDOR,
        entityId: vendor.id,
        syncType: 'CREATE',
        syncDirection: QBSyncDirection.TO_QB,
        status: QBSyncStatus.SUCCESS,
        requestPayload: qbVendor,
        responsePayload: response.Vendor,
      });

      this.logger.log(
        `Created vendor ${vendor.id} for organization ${organizationId}`,
      );

      return vendor;
    } catch (error) {
      this.logger.error(
        `Failed to create vendor for organization ${organizationId}`,
        error,
      );

      // Create sync error
      await this.syncErrorRepository.save({
        organizationId,
        entityType: QBEntityType.VENDOR,
        syncType: 'CREATE',
        syncDirection: QBSyncDirection.TO_QB,
        errorType: 'VALIDATION',
        errorMessage: (error as Error).message,
        requestPayload: qbVendor,
        retryCount: 0,
        maxRetries: 3,
      });

      throw error;
    }
  }

  /**
   * Update vendor in QuickBooks
   */
  async updateVendor(
    organizationId: string,
    vendorId: string,
    data: UpdateQBVendorDto,
  ): Promise<QBVendorResponseDto> {
    const connection = await this.getConnection(organizationId);

    this.logger.log(
      `Updating vendor ${vendorId} for organization ${organizationId}`,
    );

    // Get current vendor to merge with updates
    const current = await this.getVendorById(organizationId, vendorId);

    // Build QB vendor object with required fields
    const qbVendor: any = {
      Id: vendorId,
      SyncToken: data.syncToken,
      DisplayName: data.displayName || current.displayName,
    };

    if (data.companyName !== undefined) qbVendor.CompanyName = data.companyName;
    if (data.givenName !== undefined) qbVendor.GivenName = data.givenName;
    if (data.familyName !== undefined) qbVendor.FamilyName = data.familyName;
    if (data.accNum !== undefined) qbVendor.AcctNum = data.accNum;
    if (data.active !== undefined) qbVendor.Active = data.active;

    if (data.primaryPhone) {
      qbVendor.PrimaryPhone = {
        FreeFormNumber: data.primaryPhone.freeFormNumber,
      };
    }

    if (data.primaryEmailAddr) {
      qbVendor.PrimaryEmailAddr = {
        Address: data.primaryEmailAddr.address,
      };
    }

    if (data.billAddr) {
      qbVendor.BillAddr = {
        Line1: data.billAddr.line1,
        Line2: data.billAddr.line2,
        Line3: data.billAddr.line3,
        City: data.billAddr.city,
        CountrySubDivisionCode: data.billAddr.countrySubDivisionCode,
        PostalCode: data.billAddr.postalCode,
        Country: data.billAddr.country,
      };
    }

    if (data.termRef) {
      qbVendor.TermRef = {
        value: data.termRef,
      };
    }

    try {
      const response = await this.apiClient.put<any>(
        organizationId,
        connection.qbRealmId,
        '/vendor',
        qbVendor,
      );

      const vendor = this.normalizeVendor(response.Vendor);

      // Create sync history
      await this.syncHistoryRepository.save({
        organizationId,
        entityType: QBEntityType.VENDOR,
        entityId: vendor.id,
        syncType: 'UPDATE',
        syncDirection: QBSyncDirection.TO_QB,
        status: QBSyncStatus.SUCCESS,
        requestPayload: qbVendor,
        responsePayload: response.Vendor,
      });

      this.logger.log(
        `Updated vendor ${vendor.id} for organization ${organizationId}`,
      );

      return vendor;
    } catch (error) {
      this.logger.error(
        `Failed to update vendor ${vendorId} for organization ${organizationId}`,
        error,
      );

      // Create sync error
      await this.syncErrorRepository.save({
        organizationId,
        entityType: QBEntityType.VENDOR,
        entityId: vendorId,
        syncType: 'UPDATE',
        syncDirection: QBSyncDirection.TO_QB,
        errorType: 'VALIDATION',
        errorMessage: (error as Error).message,
        requestPayload: qbVendor,
        retryCount: 0,
        maxRetries: 3,
      });

      throw error;
    }
  }

  /**
   * Link vendor to commitment
   * Updates commitment.qbVendorId and creates entity link
   */
  async linkVendorToCommitment(
    organizationId: string,
    data: LinkVendorToCommitmentDto,
  ): Promise<void> {
    const connection = await this.getConnection(organizationId);

    this.logger.log(
      `Linking vendor ${data.qbVendorId} to commitment ${data.commitmentId}`,
    );

    // Validate commitment exists
    const commitment = await this.commitmentRepository.findOne({
      where: { id: data.commitmentId },
    });

    if (!commitment) {
      throw new NotFoundException(
        `Commitment ${data.commitmentId} not found`,
      );
    }

    // Validate vendor exists in QB
    const vendor = await this.getVendorById(organizationId, data.qbVendorId);

    // Update commitment
    commitment.qbVendorId = data.qbVendorId;
    commitment.qbSyncStatus = 'SYNCED';
    commitment.qbLastSyncedAt = new Date();
    await this.commitmentRepository.save(commitment);

    // Create or update entity link
    let entityLink = await this.entityLinkRepository.findOne({
      where: {
        organizationId,
        platformEntityType: 'COMMITMENT',
        platformEntityId: data.commitmentId,
        qbEntityType: QBEntityType.VENDOR,
      },
    });

    if (entityLink) {
      entityLink.qbEntityId = data.qbVendorId;
      entityLink.qbSyncToken = vendor.syncToken;
      entityLink.syncStatus = QBSyncStatus.SUCCESS;
      entityLink.lastSyncedAt = new Date();
    } else {
      entityLink = this.entityLinkRepository.create({
        organizationId,
        platformEntityType: 'COMMITMENT',
        platformEntityId: data.commitmentId,
        qbEntityType: QBEntityType.VENDOR,
        qbEntityId: data.qbVendorId,
        qbSyncToken: vendor.syncToken,
        syncDirection: QBSyncDirection.BIDIRECTIONAL,
        syncStatus: QBSyncStatus.SUCCESS,
        lastSyncedAt: new Date(),
      });
    }

    await this.entityLinkRepository.save(entityLink);

    this.logger.log(
      `Linked vendor ${data.qbVendorId} to commitment ${data.commitmentId}`,
    );
  }

  /**
   * Sync vendor from commitment
   * Creates or updates vendor in QB based on commitment data
   */
  async syncVendorFromCommitment(
    organizationId: string,
    data: SyncVendorFromCommitmentDto,
  ): Promise<QBVendorResponseDto> {
    const connection = await this.getConnection(organizationId);

    this.logger.log(
      `Syncing vendor from commitment ${data.commitmentId} for organization ${organizationId}`,
    );

    // Get commitment
    const commitment = await this.commitmentRepository.findOne({
      where: { id: data.commitmentId },
    });

    if (!commitment) {
      throw new NotFoundException(
        `Commitment ${data.commitmentId} not found`,
      );
    }

    try {
      let vendor: QBVendorResponseDto;

      if (commitment.qbVendorId) {
        // Update existing vendor
        this.logger.log(
          `Updating existing vendor ${commitment.qbVendorId} from commitment ${data.commitmentId}`,
        );

        const existingVendor = await this.getVendorById(
          organizationId,
          commitment.qbVendorId,
        );

        vendor = await this.updateVendor(
          organizationId,
          commitment.qbVendorId,
          {
            syncToken: existingVendor.syncToken,
            displayName: commitment.vendorName,
            companyName: commitment.vendorName,
            primaryEmailAddr: commitment.vendorEmail
              ? { address: commitment.vendorEmail }
              : undefined,
          },
        );
      } else if (data.createIfNotExists) {
        // Create new vendor
        this.logger.log(
          `Creating new vendor from commitment ${data.commitmentId}`,
        );

        vendor = await this.createVendor(organizationId, {
          displayName: commitment.vendorName,
          companyName: commitment.vendorName,
          primaryEmailAddr: commitment.vendorEmail
            ? { address: commitment.vendorEmail }
            : undefined,
        });

        // Link vendor to commitment
        await this.linkVendorToCommitment(organizationId, {
          commitmentId: data.commitmentId,
          qbVendorId: vendor.id,
        });
      } else {
        throw new BadRequestException(
          `Commitment ${data.commitmentId} is not linked to a QuickBooks vendor`,
        );
      }

      return vendor;
    } catch (error) {
      this.logger.error(
        `Failed to sync vendor from commitment ${data.commitmentId}`,
        error,
      );

      // Update commitment sync status
      commitment.qbSyncStatus = 'FAILED';
      await this.commitmentRepository.save(commitment);

      throw error;
    }
  }

  /**
   * Normalize QB vendor response to DTO
   */
  private normalizeVendor(qbVendor: any): QBVendorResponseDto {
    return {
      id: qbVendor.Id,
      displayName: qbVendor.DisplayName,
      companyName: qbVendor.CompanyName,
      givenName: qbVendor.GivenName,
      familyName: qbVendor.FamilyName,
      primaryPhone: qbVendor.PrimaryPhone
        ? {
            freeFormNumber: qbVendor.PrimaryPhone.FreeFormNumber,
          }
        : undefined,
      mobile: qbVendor.Mobile
        ? {
            freeFormNumber: qbVendor.Mobile.FreeFormNumber,
          }
        : undefined,
      primaryEmailAddr: qbVendor.PrimaryEmailAddr
        ? {
            address: qbVendor.PrimaryEmailAddr.Address,
          }
        : undefined,
      webAddr: qbVendor.WebAddr?.URI,
      billAddr: qbVendor.BillAddr
        ? {
            line1: qbVendor.BillAddr.Line1,
            line2: qbVendor.BillAddr.Line2,
            line3: qbVendor.BillAddr.Line3,
            city: qbVendor.BillAddr.City,
            countrySubDivisionCode: qbVendor.BillAddr.CountrySubDivisionCode,
            postalCode: qbVendor.BillAddr.PostalCode,
            country: qbVendor.BillAddr.Country,
          }
        : undefined,
      taxIdentifier: qbVendor.TaxIdentifier,
      termRef: qbVendor.TermRef?.value,
      vendor1099: qbVendor.Vendor1099,
      accNum: qbVendor.AcctNum,
      printOnCheckName: qbVendor.PrintOnCheckName,
      active: qbVendor.Active !== false,
      balance: parseFloat(qbVendor.Balance || '0'),
      syncToken: qbVendor.SyncToken,
      lastUpdated: qbVendor.MetaData?.LastUpdatedTime,
    };
  }
}
