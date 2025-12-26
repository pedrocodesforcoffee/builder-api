import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QBConnection } from '../entities';
import { QuickBooksApiClientService } from './quickbooks-api-client.service';
import {
  QBAccountResponseDto,
  CreateQBAccountDto,
  UpdateQBAccountDto,
  QueryAccountsDto,
  QBAccountsListResponseDto,
  QBAccountType,
  QBAccountClassification,
} from '../dto/qb-account.dto';

/**
 * QuickBooks Account API Response
 */
interface QBAccountApiResponse {
  Account: {
    Id: string;
    Name: string;
    SubAccount: boolean;
    ParentRef?: {
      value: string;
      name: string;
    };
    Description?: string;
    FullyQualifiedName: string;
    Active: boolean;
    Classification: string;
    AccountType: string;
    AccountSubType?: string;
    CurrentBalance?: number;
    CurrentBalanceWithSubAccounts?: number;
    CurrencyRef?: {
      value: string;
      name: string;
    };
    AcctNum?: string;
    SyncToken: string;
    MetaData: {
      CreateTime: string;
      LastUpdatedTime: string;
    };
    domain?: string;
    sparse?: boolean;
  };
  time: string;
}

/**
 * QuickBooks Query Response
 */
interface QBQueryResponse {
  QueryResponse: {
    Account?: any[];
    startPosition: number;
    maxResults: number;
    totalCount?: number;
  };
  time: string;
}

/**
 * QuickBooks Account Service
 *
 * Manages Chart of Accounts in QuickBooks Online.
 *
 * Features:
 * - Fetch all accounts with filtering
 * - Get single account by ID
 * - Create new accounts
 * - Update existing accounts
 * - Deactivate accounts (soft delete)
 * - Query with pagination
 * - Auto-mapping suggestions
 */
@Injectable()
export class QuickBooksAccountService {
  private readonly logger = new Logger(QuickBooksAccountService.name);

  constructor(
    @InjectRepository(QBConnection)
    private readonly connectionRepository: Repository<QBConnection>,
    private readonly apiClient: QuickBooksApiClientService,
  ) {}

  /**
   * Get all accounts from QuickBooks
   *
   * @param organizationId Organization identifier
   * @param filters Query filters
   * @returns List of accounts with pagination
   */
  async getAccounts(
    organizationId: string,
    filters: QueryAccountsDto = {},
  ): Promise<QBAccountsListResponseDto> {
    this.logger.log(`Fetching accounts for organization ${organizationId}`);

    const connection = await this.getConnection(organizationId);

    // Build query
    const conditions: string[] = [];

    if (filters.accountType) {
      conditions.push(`AccountType = '${filters.accountType}'`);
    }

    if (filters.classification) {
      conditions.push(`Classification = '${filters.classification}'`);
    }

    if (filters.activeOnly !== false) {
      conditions.push(`Active = true`);
    }

    if (filters.nameContains) {
      conditions.push(`Name LIKE '%${filters.nameContains}%'`);
    }

    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT * FROM Account${whereClause} STARTPOSITION ${filters.startPosition || 1} MAXRESULTS ${filters.maxResults || 100}`;

    this.logger.debug(`QB Query: ${query}`);

    // Execute query
    const response = await this.apiClient.query<QBQueryResponse>(
      organizationId,
      connection.qbRealmId,
      query,
    );

    const accounts = response.QueryResponse.Account || [];
    const totalCount = response.QueryResponse.totalCount || accounts.length;

    // Normalize accounts
    const normalizedAccounts = accounts.map(acc => this.normalizeAccount(acc));

    this.logger.log(`Fetched ${normalizedAccounts.length} accounts for organization ${organizationId}`);

    return {
      accounts: normalizedAccounts,
      totalCount,
      startPosition: filters.startPosition || 1,
      maxResults: filters.maxResults || 100,
    };
  }

  /**
   * Get single account by ID
   *
   * @param organizationId Organization identifier
   * @param accountId QuickBooks Account ID
   * @returns Account details
   */
  async getAccountById(
    organizationId: string,
    accountId: string,
  ): Promise<QBAccountResponseDto> {
    this.logger.log(`Fetching account ${accountId} for organization ${organizationId}`);

    const connection = await this.getConnection(organizationId);

    const response = await this.apiClient.get<QBAccountApiResponse>(
      organizationId,
      connection.qbRealmId,
      `/account/${accountId}`,
    );

    return this.normalizeAccount(response.Account);
  }

  /**
   * Create new account in QuickBooks
   *
   * @param organizationId Organization identifier
   * @param data Account creation data
   * @returns Created account
   */
  async createAccount(
    organizationId: string,
    data: CreateQBAccountDto,
  ): Promise<QBAccountResponseDto> {
    this.logger.log(`Creating account for organization ${organizationId}: ${data.name}`);

    const connection = await this.getConnection(organizationId);

    // Build QB Account object
    const qbAccount: any = {
      Name: data.name,
      AccountType: data.accountType,
    };

    if (data.accountSubType) {
      qbAccount.AccountSubType = data.accountSubType;
    }

    if (data.accountNumber) {
      qbAccount.AcctNum = data.accountNumber;
    }

    if (data.description) {
      qbAccount.Description = data.description;
    }

    if (data.parentRef) {
      qbAccount.ParentRef = {
        value: data.parentRef,
      };
      qbAccount.SubAccount = true;
    }

    // Create account
    const response = await this.apiClient.post<QBAccountApiResponse>(
      organizationId,
      connection.qbRealmId,
      '/account',
      qbAccount,
    );

    this.logger.log(`Created account ${response.Account.Id} for organization ${organizationId}`);

    return this.normalizeAccount(response.Account);
  }

  /**
   * Update existing account in QuickBooks
   *
   * @param organizationId Organization identifier
   * @param accountId QuickBooks Account ID
   * @param data Update data
   * @returns Updated account
   */
  async updateAccount(
    organizationId: string,
    accountId: string,
    data: UpdateQBAccountDto,
  ): Promise<QBAccountResponseDto> {
    this.logger.log(`Updating account ${accountId} for organization ${organizationId}`);

    const connection = await this.getConnection(organizationId);

    // Fetch current account to get required fields
    const current = await this.getAccountById(organizationId, accountId);

    // Build update object (must include all required fields)
    const qbAccount: any = {
      Id: accountId,
      SyncToken: data.syncToken,
      Name: data.name || current.name,
      AccountType: current.accountType,
    };

    if (data.accountNumber !== undefined) {
      qbAccount.AcctNum = data.accountNumber;
    } else if (current.accountNumber) {
      qbAccount.AcctNum = current.accountNumber;
    }

    if (data.description !== undefined) {
      qbAccount.Description = data.description;
    } else if (current.description) {
      qbAccount.Description = current.description;
    }

    if (data.active !== undefined) {
      qbAccount.Active = data.active;
    }

    // Update account (uses POST with operation=update)
    const response = await this.apiClient.put<QBAccountApiResponse>(
      organizationId,
      connection.qbRealmId,
      '/account',
      qbAccount,
    );

    this.logger.log(`Updated account ${accountId} for organization ${organizationId}`);

    return this.normalizeAccount(response.Account);
  }

  /**
   * Deactivate account (soft delete)
   *
   * QuickBooks doesn't support hard deletes for accounts with history.
   *
   * @param organizationId Organization identifier
   * @param accountId QuickBooks Account ID
   * @param syncToken Current sync token
   * @returns Deactivated account
   */
  async deactivateAccount(
    organizationId: string,
    accountId: string,
    syncToken: string,
  ): Promise<QBAccountResponseDto> {
    this.logger.log(`Deactivating account ${accountId} for organization ${organizationId}`);

    return this.updateAccount(organizationId, accountId, {
      active: false,
      syncToken,
    });
  }

  /**
   * Get accounts suitable for cost code mapping
   *
   * Returns expense and cost of goods sold accounts.
   *
   * @param organizationId Organization identifier
   * @returns List of mappable accounts
   */
  async getMappableAccounts(organizationId: string): Promise<QBAccountResponseDto[]> {
    this.logger.log(`Fetching mappable accounts for organization ${organizationId}`);

    // Fetch expense and COGS accounts
    const expenseAccounts = await this.getAccounts(organizationId, {
      accountType: QBAccountType.EXPENSE,
      activeOnly: true,
      maxResults: 500,
    });

    const cogsAccounts = await this.getAccounts(organizationId, {
      accountType: QBAccountType.COST_OF_GOODS_SOLD,
      activeOnly: true,
      maxResults: 500,
    });

    const accounts = [
      ...expenseAccounts.accounts,
      ...cogsAccounts.accounts,
    ];

    this.logger.log(`Found ${accounts.length} mappable accounts for organization ${organizationId}`);

    return accounts;
  }

  /**
   * Suggest account mappings for cost codes
   *
   * Uses name matching to suggest appropriate QuickBooks accounts for cost codes.
   *
   * @param organizationId Organization identifier
   * @param costCodeName Cost code name to match
   * @returns Suggested accounts (sorted by relevance)
   */
  async suggestAccountsForCostCode(
    organizationId: string,
    costCodeName: string,
  ): Promise<QBAccountResponseDto[]> {
    this.logger.log(`Suggesting accounts for cost code: ${costCodeName}`);

    // Get all mappable accounts
    const accounts = await this.getMappableAccounts(organizationId);

    // Simple name matching (can be enhanced with fuzzy matching)
    const keywords = costCodeName.toLowerCase().split(/\s+/);

    const scored = accounts.map(account => {
      const accountName = account.name.toLowerCase();
      const score = keywords.reduce((sum, keyword) => {
        return sum + (accountName.includes(keyword) ? 1 : 0);
      }, 0);

      return { account, score };
    });

    // Filter and sort by score
    const suggestions = scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(s => s.account)
      .slice(0, 5); // Top 5 suggestions

    this.logger.log(`Found ${suggestions.length} suggestions for cost code: ${costCodeName}`);

    return suggestions;
  }

  /**
   * Get connection or throw error
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
   * Normalize QB Account to platform DTO
   */
  private normalizeAccount(qbAccount: any): QBAccountResponseDto {
    return {
      id: qbAccount.Id,
      name: qbAccount.Name,
      accountType: qbAccount.AccountType as QBAccountType,
      accountSubType: qbAccount.AccountSubType,
      classification: qbAccount.Classification as QBAccountClassification,
      accountNumber: qbAccount.AcctNum,
      description: qbAccount.Description,
      active: qbAccount.Active,
      currentBalance: qbAccount.CurrentBalance,
      currentBalanceWithSubAccounts: qbAccount.CurrentBalanceWithSubAccounts,
      parentRef: qbAccount.ParentRef?.value,
      subAccount: qbAccount.SubAccount,
      fullyQualifiedName: qbAccount.FullyQualifiedName,
      syncToken: qbAccount.SyncToken,
      createdAt: qbAccount.MetaData.CreateTime,
      updatedAt: qbAccount.MetaData.LastUpdatedTime,
    };
  }
}
