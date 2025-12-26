import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QBConnection } from '../entities';
import { QuickBooksApiClientService } from './quickbooks-api-client.service';

/**
 * QuickBooks Company Info Response
 */
interface QBCompanyInfoResponse {
  CompanyInfo: {
    CompanyName: string;
    LegalName?: string;
    CompanyAddr?: {
      Line1?: string;
      City?: string;
      CountrySubDivisionCode?: string;
      PostalCode?: string;
      Country?: string;
    };
    CustomerCommunicationAddr?: any;
    LegalAddr?: any;
    PrimaryPhone?: {
      FreeFormNumber?: string;
    };
    CompanyStartDate?: string;
    FiscalYearStartMonth?: string;
    Country?: string;
    Email?: {
      Address?: string;
    };
    WebAddr?: {
      URI?: string;
    };
    SupportedLanguages?: string;
    NameValue?: Array<{
      Name: string;
      Value: string;
    }>;
    domain: string;
    sparse: boolean;
    Id: string;
    SyncToken: string;
    MetaData: {
      CreateTime: string;
      LastUpdatedTime: string;
    };
  };
  time: string;
}

/**
 * Normalized Company Info DTO
 */
export interface CompanyInfoDto {
  id: string;
  companyName: string;
  legalName?: string;
  address?: {
    line1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  phone?: string;
  email?: string;
  website?: string;
  country?: string;
  fiscalYearStartMonth?: string;
  companyStartDate?: string;
  syncToken: string;
  lastUpdated: string;
}

/**
 * QuickBooks Company Service
 *
 * Manages QuickBooks company information retrieval and updates.
 *
 * Features:
 * - Fetch company info from QuickBooks
 * - Update connection with company name
 * - Normalize QB response to platform DTOs
 */
@Injectable()
export class QuickBooksCompanyService {
  private readonly logger = new Logger(QuickBooksCompanyService.name);

  constructor(
    @InjectRepository(QBConnection)
    private readonly connectionRepository: Repository<QBConnection>,
    private readonly apiClient: QuickBooksApiClientService,
  ) {}

  /**
   * Get company information from QuickBooks
   *
   * Fetches company details and updates connection with company name.
   *
   * @param organizationId Organization identifier
   * @returns Normalized company info
   * @throws NotFoundException if connection not found
   */
  async getCompanyInfo(organizationId: string): Promise<CompanyInfoDto> {
    this.logger.log(`Fetching company info for organization ${organizationId}`);

    // Get connection
    const connection = await this.connectionRepository.findOne({
      where: { organizationId },
    });

    if (!connection) {
      throw new NotFoundException(
        `QuickBooks connection not found for organization ${organizationId}`,
      );
    }

    // Fetch company info from QuickBooks
    const response = await this.apiClient.get<QBCompanyInfoResponse>(
      organizationId,
      connection.qbRealmId,
      '/companyinfo/' + connection.qbRealmId,
    );

    const companyInfo = response.CompanyInfo;

    // Update connection with company name
    if (companyInfo.CompanyName && companyInfo.CompanyName !== connection.qbCompanyName) {
      connection.qbCompanyName = companyInfo.CompanyName;
      await this.connectionRepository.save(connection);
      this.logger.log(`Updated company name for organization ${organizationId}: ${companyInfo.CompanyName}`);
    }

    // Normalize response
    const normalized: CompanyInfoDto = {
      id: companyInfo.Id,
      companyName: companyInfo.CompanyName,
      legalName: companyInfo.LegalName,
      address: companyInfo.CompanyAddr ? {
        line1: companyInfo.CompanyAddr.Line1,
        city: companyInfo.CompanyAddr.City,
        state: companyInfo.CompanyAddr.CountrySubDivisionCode,
        postalCode: companyInfo.CompanyAddr.PostalCode,
        country: companyInfo.CompanyAddr.Country,
      } : undefined,
      phone: companyInfo.PrimaryPhone?.FreeFormNumber,
      email: companyInfo.Email?.Address,
      website: companyInfo.WebAddr?.URI,
      country: companyInfo.Country,
      fiscalYearStartMonth: companyInfo.FiscalYearStartMonth,
      companyStartDate: companyInfo.CompanyStartDate,
      syncToken: companyInfo.SyncToken,
      lastUpdated: companyInfo.MetaData.LastUpdatedTime,
    };

    this.logger.log(`Company info fetched for organization ${organizationId}: ${normalized.companyName}`);

    return normalized;
  }

  /**
   * Refresh company info and update connection
   *
   * Useful after initial OAuth connection to populate company name.
   *
   * @param organizationId Organization identifier
   * @returns Company info
   */
  async refreshCompanyInfo(organizationId: string): Promise<CompanyInfoDto> {
    return this.getCompanyInfo(organizationId);
  }
}
