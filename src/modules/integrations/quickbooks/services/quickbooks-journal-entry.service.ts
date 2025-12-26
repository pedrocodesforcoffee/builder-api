import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QBConnection, QBEntityLink } from '../entities';
import { QuickBooksApiClientService } from './quickbooks-api-client.service';
import {
  CreateQBJournalEntryDto,
  UpdateQBJournalEntryDto,
  QBJournalEntryResponseDto,
  QueryJournalEntriesDto,
  QBJournalEntriesListResponseDto,
  ExportCostEntriesAsJEDto,
  ExportPeriodEndJEDto,
  JEExportResultDto,
  JEStatusDto,
  JEValidationResultDto,
  JEPostingType,
} from '../dto';
import { QBEntityType } from '../enums';

/**
 * QuickBooks Journal Entry Service
 *
 * Manages journal entry export for cost entries, accruals, and period-end adjustments.
 * Validates debits = credits and creates balanced journal entries.
 */
@Injectable()
export class QuickBooksJournalEntryService {
  private readonly logger = new Logger(QuickBooksJournalEntryService.name);

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
   * Validate journal entry lines (debits = credits)
   */
  validateJournalEntry(dto: CreateQBJournalEntryDto): JEValidationResultDto {
    let totalDebits = 0;
    let totalCredits = 0;
    const errors: string[] = [];

    for (const line of dto.lines) {
      if (line.postingType === JEPostingType.DEBIT) {
        totalDebits += line.amount;
      } else if (line.postingType === JEPostingType.CREDIT) {
        totalCredits += line.amount;
      } else {
        errors.push(`Invalid posting type: ${line.postingType}`);
      }

      if (line.amount <= 0) {
        errors.push(`Line amount must be positive: ${line.amount}`);
      }

      if (!line.accountRef) {
        errors.push('Line must have accountRef');
      }
    }

    if (dto.lines.length === 0) {
      errors.push('Journal entry must have at least one line');
    }

    const difference = Math.abs(totalDebits - totalCredits);
    const isValid = difference < 0.01 && errors.length === 0; // Allow 1 cent rounding difference

    return {
      isValid,
      totalDebits,
      totalCredits,
      difference: difference > 0 ? difference : undefined,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * List journal entries from QuickBooks
   */
  async getJournalEntries(
    organizationId: string,
    filters: QueryJournalEntriesDto,
  ): Promise<QBJournalEntriesListResponseDto> {
    const connection = await this.getConnection(organizationId);

    const { startDate, endDate, accountId, maxResults = 100, startPosition = 1 } = filters;

    let query = 'SELECT * FROM JournalEntry';
    const conditions: string[] = [];

    if (startDate) {
      conditions.push(`TxnDate >= '${startDate}'`);
    }

    if (endDate) {
      conditions.push(`TxnDate <= '${endDate}'`);
    }

    // Note: QuickBooks query language doesn't support filtering by line account directly
    // Would need to filter in application code if accountId is provided

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;

    const response = await this.apiClient.query<QBJournalEntryResponseDto[]>(
      organizationId,
      connection.qbRealmId,
      query,
    );

    let journalEntries = response || [];

    // Filter by account if specified
    if (accountId) {
      journalEntries = journalEntries.filter((je: any) =>
        je.lines.some(
          (line: any) => line.journalEntryLineDetail?.accountRef?.value === accountId,
        ),
      );
    }

    return {
      journalEntries,
      totalCount: journalEntries.length,
    };
  }

  /**
   * Get journal entry by ID from QuickBooks
   */
  async getJournalEntryById(
    organizationId: string,
    journalEntryId: string,
  ): Promise<QBJournalEntryResponseDto> {
    const connection = await this.getConnection(organizationId);

    const response = await this.apiClient.get<{ JournalEntry: QBJournalEntryResponseDto }>(
      organizationId,
      connection.qbRealmId,
      `/journalentry/${journalEntryId}`,
    );

    return response.JournalEntry;
  }

  /**
   * Create journal entry in QuickBooks
   */
  async createJournalEntry(
    organizationId: string,
    dto: CreateQBJournalEntryDto,
  ): Promise<QBJournalEntryResponseDto> {
    const connection = await this.getConnection(organizationId);

    // Validate before creating
    const validation = this.validateJournalEntry(dto);
    if (!validation.isValid) {
      throw new BadRequestException(`Invalid journal entry: ${validation.errors?.join(', ')}`);
    }

    this.logger.log(`Creating journal entry in QuickBooks with ${dto.lines.length} lines`);

    const payload = {
      TxnDate: dto.txnDate,
      DocNumber: dto.docNumber,
      PrivateNote: dto.privateNote,
      CurrencyRef: dto.currencyRef ? { value: dto.currencyRef } : undefined,
      ExchangeRate: dto.exchangeRate,
      Line: dto.lines.map((line) => ({
        Id: line.id,
        Description: line.description,
        Amount: line.amount,
        DetailType: 'JournalEntryLineDetail',
        JournalEntryLineDetail: {
          PostingType: line.postingType,
          AccountRef: { value: line.accountRef },
          EntityRef: line.entityRef
            ? {
                value: line.entityRef,
                type: line.entityType || 'Customer',
              }
            : undefined,
          ClassRef: line.classRef ? { value: line.classRef } : undefined,
        },
      })),
    };

    const response = await this.apiClient.post<{ JournalEntry: QBJournalEntryResponseDto }>(
      organizationId,
      connection.qbRealmId,
      '/journalentry',
      payload,
    );

    this.logger.log(`Created journal entry in QuickBooks: ${response.JournalEntry.id}`);

    return response.JournalEntry;
  }

  /**
   * Update journal entry in QuickBooks
   */
  async updateJournalEntry(
    organizationId: string,
    dto: UpdateQBJournalEntryDto,
  ): Promise<QBJournalEntryResponseDto> {
    const connection = await this.getConnection(organizationId);

    // Validate before updating
    const validation = this.validateJournalEntry(dto);
    if (!validation.isValid) {
      throw new BadRequestException(`Invalid journal entry: ${validation.errors?.join(', ')}`);
    }

    this.logger.log(`Updating journal entry in QuickBooks: ${dto.id}`);

    const payload = {
      Id: dto.id,
      SyncToken: dto.syncToken,
      TxnDate: dto.txnDate,
      DocNumber: dto.docNumber,
      PrivateNote: dto.privateNote,
      Line: dto.lines.map((line) => ({
        Id: line.id,
        Description: line.description,
        Amount: line.amount,
        DetailType: 'JournalEntryLineDetail',
        JournalEntryLineDetail: {
          PostingType: line.postingType,
          AccountRef: { value: line.accountRef },
        },
      })),
    };

    const response = await this.apiClient.post<{ JournalEntry: QBJournalEntryResponseDto }>(
      organizationId,
      connection.qbRealmId,
      '/journalentry',
      payload,
    );

    this.logger.log(`Updated journal entry in QuickBooks: ${response.JournalEntry.id}`);

    return response.JournalEntry;
  }

  /**
   * Export cost entries as a journal entry
   *
   * This creates a single journal entry with multiple lines representing cost entries.
   * Debits the expense accounts, credits the provided credit account (typically AP or Cash).
   */
  async exportCostEntriesAsJE(
    organizationId: string,
    dto: ExportCostEntriesAsJEDto,
  ): Promise<JEExportResultDto> {
    try {
      await this.getConnection(organizationId);

      this.logger.log(`Exporting ${dto.costEntryIds.length} cost entries as journal entry`);

      // TODO: Fetch cost entries from database
      // For now, this is a placeholder - actual implementation would:
      // 1. Load CostEntry entities with relations (project, costCode, vendor)
      // 2. Look up account mappings for each cost code
      // 3. Create debit lines for each cost entry (expense accounts)
      // 4. Create a single credit line (AP or Cash account)
      // 5. Validate that debits = credits

      if (!dto.creditAccountRef) {
        throw new BadRequestException('Credit account reference is required');
      }

      // Placeholder lines (real implementation would build from actual cost entries)
      const lines = [
        {
          amount: 100,
          postingType: JEPostingType.DEBIT,
          accountRef: '', // Would come from account mapping
          description: dto.memo || 'Cost entry export',
        },
        {
          amount: 100,
          postingType: JEPostingType.CREDIT,
          accountRef: dto.creditAccountRef,
          description: dto.memo || 'Cost entry export',
        },
      ];

      const journalEntry = await this.createJournalEntry(organizationId, {
        txnDate: dto.txnDate,
        docNumber: dto.docNumber,
        privateNote: dto.memo,
        lines,
      });

      // Create entity links for each cost entry
      for (const costEntryId of dto.costEntryIds) {
        const link = this.entityLinkRepository.create({
          organizationId,
          platformEntityType: 'COST_ENTRY',
          platformEntityId: costEntryId,
          qbEntityType: QBEntityType.JOURNAL_ENTRY,
          qbEntityId: journalEntry.id,
          syncDirection: 'TO_QB' as any,
          syncStatus: 'SYNCED' as any,
          lastSyncedAt: new Date(),
        });

        await this.entityLinkRepository.save(link);
      }

      this.logger.log(`Exported ${dto.costEntryIds.length} cost entries to JE ${journalEntry.id}`);

      return {
        success: true,
        qbJournalEntryId: journalEntry.id,
        lineCount: journalEntry.lines.length,
        totalDebit: journalEntry.totalAmt,
        totalCredit: journalEntry.totalAmt,
        docNumber: journalEntry.docNumber,
      };
    } catch (error: any) {
      this.logger.error(`Failed to export cost entries: ${error?.message}`, error?.stack);
      return {
        success: false,
        qbJournalEntryId: '',
        lineCount: 0,
        totalDebit: 0,
        totalCredit: 0,
        error: error?.message || 'Unknown error',
      };
    }
  }

  /**
   * Export period-end journal entry (accruals, retention, adjustments)
   *
   * This creates journal entries for period-end closing:
   * - ACCRUAL: Recognize expenses incurred but not billed
   * - RETENTION: Track retention withheld from vendor payments
   * - ADJUSTMENT: Period-end adjustments and corrections
   */
  async exportPeriodEndJE(
    organizationId: string,
    dto: ExportPeriodEndJEDto,
  ): Promise<JEExportResultDto> {
    try {
      await this.getConnection(organizationId);

      this.logger.log(`Exporting period-end JE (${dto.jeType}) for period ${dto.costPeriodId}`);

      // TODO: Fetch cost period from database
      // For now, this is a placeholder - actual implementation would:
      // 1. Load CostPeriod entity with relations
      // 2. Based on jeType, calculate appropriate journal entry lines:
      //    - ACCRUAL: Debit expense accrual, credit accrued expenses payable
      //    - RETENTION: Debit retention receivable, credit retention payable
      //    - ADJUSTMENT: Various adjustment entries
      // 3. Create journal entry with balanced lines
      // 4. Link to cost period

      // Placeholder lines (real implementation would build from actual period data)
      const lines = [
        {
          amount: 1000,
          postingType: JEPostingType.DEBIT,
          accountRef: '', // Would come from account mapping
          description: dto.memo || `Period-end ${dto.jeType}`,
        },
        {
          amount: 1000,
          postingType: JEPostingType.CREDIT,
          accountRef: '', // Would come from account mapping
          description: dto.memo || `Period-end ${dto.jeType}`,
        },
      ];

      const journalEntry = await this.createJournalEntry(organizationId, {
        txnDate: dto.txnDate,
        docNumber: dto.docNumber,
        privateNote: `${dto.jeType}: ${dto.memo || 'Period-end entry'}`,
        lines,
      });

      // Create entity link to cost period
      const link = this.entityLinkRepository.create({
        organizationId,
        platformEntityType: 'COST_PERIOD',
        platformEntityId: dto.costPeriodId,
        qbEntityType: QBEntityType.JOURNAL_ENTRY,
        qbEntityId: journalEntry.id,
        syncDirection: 'TO_QB' as any,
        syncStatus: 'SYNCED' as any,
        lastSyncedAt: new Date(),
        metadata: { jeType: dto.jeType },
      });

      await this.entityLinkRepository.save(link);

      this.logger.log(`Exported period-end JE to ${journalEntry.id}`);

      return {
        success: true,
        qbJournalEntryId: journalEntry.id,
        lineCount: journalEntry.lines.length,
        totalDebit: journalEntry.totalAmt,
        totalCredit: journalEntry.totalAmt,
        docNumber: journalEntry.docNumber,
      };
    } catch (error: any) {
      this.logger.error(`Failed to export period-end JE: ${error?.message}`, error?.stack);
      return {
        success: false,
        qbJournalEntryId: '',
        lineCount: 0,
        totalDebit: 0,
        totalCredit: 0,
        error: error?.message || 'Unknown error',
      };
    }
  }

  /**
   * Get journal entry export status for cost entry
   */
  async getJEStatus(
    organizationId: string,
    entityType: 'COST_ENTRY' | 'COST_PERIOD',
    entityId: string,
  ): Promise<JEStatusDto> {
    const link = await this.entityLinkRepository.findOne({
      where: {
        organizationId,
        platformEntityType: entityType,
        platformEntityId: entityId,
        qbEntityType: QBEntityType.JOURNAL_ENTRY,
      },
    });

    if (!link) {
      return {
        isExported: false,
      };
    }

    return {
      isExported: true,
      qbJournalEntryId: link.qbEntityId,
      lastSyncedAt: link.lastSyncedAt?.toISOString(),
      syncStatus: link.syncStatus as any,
      errorMessage: link.errorMessage,
    };
  }

  /**
   * Get QB journal entry ID for cost entry
   */
  async getQBJournalEntryIdForEntity(
    organizationId: string,
    entityType: 'COST_ENTRY' | 'COST_PERIOD',
    entityId: string,
  ): Promise<string | null> {
    const link = await this.entityLinkRepository.findOne({
      where: {
        organizationId,
        platformEntityType: entityType,
        platformEntityId: entityId,
        qbEntityType: QBEntityType.JOURNAL_ENTRY,
      },
    });

    return link?.qbEntityId || null;
  }
}
