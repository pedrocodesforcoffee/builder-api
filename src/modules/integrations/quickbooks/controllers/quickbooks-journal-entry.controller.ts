import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { QuickBooksJournalEntryService } from '../services';
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
} from '../dto';

/**
 * QuickBooks Journal Entry Controller
 *
 * Manages QuickBooks journal entry operations for cost entries,
 * accruals, and period-end adjustments.
 *
 * @route /api/v1/organizations/:organizationId/integrations/quickbooks/journal-entries
 */
@ApiTags('QuickBooks - Journal Entries')
@Controller('api/v1/organizations/:organizationId/integrations/quickbooks/journal-entries')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuickBooksJournalEntryController {
  constructor(private readonly journalEntryService: QuickBooksJournalEntryService) {}

  /**
   * List journal entries from QuickBooks
   */
  @Get()
  @ApiOperation({ summary: 'List QuickBooks journal entries' })
  @ApiResponse({ status: 200, description: 'Journal entries retrieved', type: QBJournalEntriesListResponseDto })
  async getJournalEntries(
    @Param('organizationId') organizationId: string,
    @Query() filters: QueryJournalEntriesDto,
  ): Promise<QBJournalEntriesListResponseDto> {
    return this.journalEntryService.getJournalEntries(organizationId, filters);
  }

  /**
   * Get journal entry by ID
   */
  @Get(':journalEntryId')
  @ApiOperation({ summary: 'Get QuickBooks journal entry by ID' })
  @ApiResponse({ status: 200, description: 'Journal entry retrieved', type: QBJournalEntryResponseDto })
  @ApiResponse({ status: 404, description: 'Journal entry not found' })
  async getJournalEntryById(
    @Param('organizationId') organizationId: string,
    @Param('journalEntryId') journalEntryId: string,
  ): Promise<QBJournalEntryResponseDto> {
    return this.journalEntryService.getJournalEntryById(organizationId, journalEntryId);
  }

  /**
   * Create journal entry in QuickBooks
   */
  @Post()
  @ApiOperation({ summary: 'Create QuickBooks journal entry' })
  @ApiResponse({ status: 201, description: 'Journal entry created', type: QBJournalEntryResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input (debits must equal credits)' })
  async createJournalEntry(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateQBJournalEntryDto,
  ): Promise<QBJournalEntryResponseDto> {
    return this.journalEntryService.createJournalEntry(organizationId, dto);
  }

  /**
   * Update journal entry in QuickBooks
   */
  @Put(':journalEntryId')
  @ApiOperation({ summary: 'Update QuickBooks journal entry' })
  @ApiResponse({ status: 200, description: 'Journal entry updated', type: QBJournalEntryResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input (debits must equal credits)' })
  @ApiResponse({ status: 404, description: 'Journal entry not found' })
  async updateJournalEntry(
    @Param('organizationId') organizationId: string,
    @Body() dto: UpdateQBJournalEntryDto,
  ): Promise<QBJournalEntryResponseDto> {
    return this.journalEntryService.updateJournalEntry(organizationId, dto);
  }

  /**
   * Validate journal entry (debits = credits)
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate journal entry (debits = credits)' })
  @ApiResponse({ status: 200, description: 'Validation result', type: JEValidationResultDto })
  async validateJournalEntry(
    @Body() dto: CreateQBJournalEntryDto,
  ): Promise<JEValidationResultDto> {
    return this.journalEntryService.validateJournalEntry(dto);
  }

  /**
   * Export cost entries as journal entry
   */
  @Post('export-cost-entries')
  @ApiOperation({ summary: 'Export cost entries as journal entry' })
  @ApiResponse({ status: 200, description: 'Cost entries exported', type: JEExportResultDto })
  @ApiResponse({ status: 400, description: 'Invalid input or unbalanced entry' })
  async exportCostEntriesAsJE(
    @Param('organizationId') organizationId: string,
    @Body() dto: ExportCostEntriesAsJEDto,
  ): Promise<JEExportResultDto> {
    return this.journalEntryService.exportCostEntriesAsJE(organizationId, dto);
  }

  /**
   * Export period-end journal entry (accruals, retention, adjustments)
   */
  @Post('export-period-end')
  @ApiOperation({ summary: 'Export period-end journal entry' })
  @ApiResponse({ status: 200, description: 'Period-end JE exported', type: JEExportResultDto })
  @ApiResponse({ status: 400, description: 'Invalid input or unbalanced entry' })
  async exportPeriodEndJE(
    @Param('organizationId') organizationId: string,
    @Body() dto: ExportPeriodEndJEDto,
  ): Promise<JEExportResultDto> {
    return this.journalEntryService.exportPeriodEndJE(organizationId, dto);
  }

  /**
   * Get journal entry export status for cost entry
   */
  @Get('cost-entry/:costEntryId/status')
  @ApiOperation({ summary: 'Get JE export status for cost entry' })
  @ApiResponse({ status: 200, description: 'Status retrieved', type: JEStatusDto })
  async getJEStatusForCostEntry(
    @Param('organizationId') organizationId: string,
    @Param('costEntryId') costEntryId: string,
  ): Promise<JEStatusDto> {
    return this.journalEntryService.getJEStatus(organizationId, 'COST_ENTRY', costEntryId);
  }

  /**
   * Get journal entry export status for cost period
   */
  @Get('cost-period/:costPeriodId/status')
  @ApiOperation({ summary: 'Get JE export status for cost period' })
  @ApiResponse({ status: 200, description: 'Status retrieved', type: JEStatusDto })
  async getJEStatusForCostPeriod(
    @Param('organizationId') organizationId: string,
    @Param('costPeriodId') costPeriodId: string,
  ): Promise<JEStatusDto> {
    return this.journalEntryService.getJEStatus(organizationId, 'COST_PERIOD', costPeriodId);
  }

  /**
   * Get QB journal entry ID for cost entry
   */
  @Get('cost-entry/:costEntryId/qb-id')
  @ApiOperation({ summary: 'Get QuickBooks JE ID for cost entry' })
  @ApiResponse({ status: 200, description: 'QB JE ID retrieved' })
  async getQBJEIdForCostEntry(
    @Param('organizationId') organizationId: string,
    @Param('costEntryId') costEntryId: string,
  ): Promise<{ qbJournalEntryId: string | null }> {
    const qbJournalEntryId = await this.journalEntryService.getQBJournalEntryIdForEntity(
      organizationId,
      'COST_ENTRY',
      costEntryId,
    );
    return { qbJournalEntryId };
  }

  /**
   * Get QB journal entry ID for cost period
   */
  @Get('cost-period/:costPeriodId/qb-id')
  @ApiOperation({ summary: 'Get QuickBooks JE ID for cost period' })
  @ApiResponse({ status: 200, description: 'QB JE ID retrieved' })
  async getQBJEIdForCostPeriod(
    @Param('organizationId') organizationId: string,
    @Param('costPeriodId') costPeriodId: string,
  ): Promise<{ qbJournalEntryId: string | null }> {
    const qbJournalEntryId = await this.journalEntryService.getQBJournalEntryIdForEntity(
      organizationId,
      'COST_PERIOD',
      costPeriodId,
    );
    return { qbJournalEntryId };
  }
}
