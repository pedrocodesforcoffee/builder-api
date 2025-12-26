import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { QuickBooksAccountService } from '../services/quickbooks-account.service';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import {
  QBAccountResponseDto,
  QBAccountsListResponseDto,
  CreateQBAccountDto,
  UpdateQBAccountDto,
  QueryAccountsDto,
} from '../dto/qb-account.dto';

/**
 * QuickBooks Account Controller
 *
 * REST API endpoints for QuickBooks Chart of Accounts management.
 *
 * Features:
 * - List accounts with filtering
 * - Get single account
 * - Create new account
 * - Update existing account
 * - Deactivate account
 * - Get mappable accounts for cost codes
 * - Suggest account mappings
 */
@ApiTags('QuickBooks Accounts')
@Controller('integrations/quickbooks/:organizationId/accounts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuickBooksAccountController {
  private readonly logger = new Logger(QuickBooksAccountController.name);

  constructor(
    private readonly accountService: QuickBooksAccountService,
  ) {}

  /**
   * Get all accounts
   *
   * Retrieve Chart of Accounts from QuickBooks with optional filtering.
   *
   * @param organizationId Organization ID
   * @param filters Query filters
   * @returns List of accounts with pagination
   */
  @Get()
  @ApiOperation({
    summary: 'Get Chart of Accounts',
    description: 'Retrieve all accounts from QuickBooks with optional filtering and pagination.',
  })
  @ApiResponse({
    status: 200,
    description: 'Accounts retrieved successfully',
    type: QBAccountsListResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'QuickBooks connection not found',
  })
  async getAccounts(
    @Param('organizationId') organizationId: string,
    @Query() filters: QueryAccountsDto,
  ): Promise<QBAccountsListResponseDto> {
    this.logger.log(`Getting accounts for organization ${organizationId}`);
    return this.accountService.getAccounts(organizationId, filters);
  }

  /**
   * Get single account by ID
   *
   * @param organizationId Organization ID
   * @param accountId QuickBooks Account ID
   * @returns Account details
   */
  @Get(':accountId')
  @ApiOperation({
    summary: 'Get account by ID',
    description: 'Retrieve single account details from QuickBooks.',
  })
  @ApiResponse({
    status: 200,
    description: 'Account retrieved successfully',
    type: QBAccountResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Account or connection not found',
  })
  async getAccountById(
    @Param('organizationId') organizationId: string,
    @Param('accountId') accountId: string,
  ): Promise<QBAccountResponseDto> {
    this.logger.log(`Getting account ${accountId} for organization ${organizationId}`);
    return this.accountService.getAccountById(organizationId, accountId);
  }

  /**
   * Create new account
   *
   * @param organizationId Organization ID
   * @param data Account creation data
   * @returns Created account
   */
  @Post()
  @ApiOperation({
    summary: 'Create account',
    description: 'Create new account in QuickBooks Chart of Accounts.',
  })
  @ApiResponse({
    status: 201,
    description: 'Account created successfully',
    type: QBAccountResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid account data',
  })
  @ApiResponse({
    status: 404,
    description: 'QuickBooks connection not found',
  })
  async createAccount(
    @Param('organizationId') organizationId: string,
    @Body() data: CreateQBAccountDto,
  ): Promise<QBAccountResponseDto> {
    this.logger.log(`Creating account for organization ${organizationId}: ${data.name}`);
    return this.accountService.createAccount(organizationId, data);
  }

  /**
   * Update existing account
   *
   * @param organizationId Organization ID
   * @param accountId QuickBooks Account ID
   * @param data Update data
   * @returns Updated account
   */
  @Put(':accountId')
  @ApiOperation({
    summary: 'Update account',
    description: 'Update existing account in QuickBooks. Requires SyncToken for optimistic locking.',
  })
  @ApiResponse({
    status: 200,
    description: 'Account updated successfully',
    type: QBAccountResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid update data or stale SyncToken',
  })
  @ApiResponse({
    status: 404,
    description: 'Account or connection not found',
  })
  async updateAccount(
    @Param('organizationId') organizationId: string,
    @Param('accountId') accountId: string,
    @Body() data: UpdateQBAccountDto,
  ): Promise<QBAccountResponseDto> {
    this.logger.log(`Updating account ${accountId} for organization ${organizationId}`);
    return this.accountService.updateAccount(organizationId, accountId, data);
  }

  /**
   * Deactivate account
   *
   * Soft delete - sets account to inactive rather than deleting.
   *
   * @param organizationId Organization ID
   * @param accountId QuickBooks Account ID
   * @param syncToken Current sync token
   * @returns Deactivated account
   */
  @Post(':accountId/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deactivate account',
    description: 'Deactivate account (soft delete). Accounts with transaction history cannot be deleted.',
  })
  @ApiQuery({ name: 'syncToken', description: 'Current SyncToken for optimistic locking' })
  @ApiResponse({
    status: 200,
    description: 'Account deactivated successfully',
    type: QBAccountResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid syncToken',
  })
  @ApiResponse({
    status: 404,
    description: 'Account or connection not found',
  })
  async deactivateAccount(
    @Param('organizationId') organizationId: string,
    @Param('accountId') accountId: string,
    @Query('syncToken') syncToken: string,
  ): Promise<QBAccountResponseDto> {
    this.logger.log(`Deactivating account ${accountId} for organization ${organizationId}`);
    return this.accountService.deactivateAccount(organizationId, accountId, syncToken);
  }

  /**
   * Get mappable accounts
   *
   * Returns accounts suitable for cost code mapping (Expense and COGS accounts).
   *
   * @param organizationId Organization ID
   * @returns List of mappable accounts
   */
  @Get('mappable/list')
  @ApiOperation({
    summary: 'Get mappable accounts',
    description: 'Get accounts suitable for cost code mapping (Expense and Cost of Goods Sold accounts).',
  })
  @ApiResponse({
    status: 200,
    description: 'Mappable accounts retrieved successfully',
    type: [QBAccountResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'QuickBooks connection not found',
  })
  async getMappableAccounts(
    @Param('organizationId') organizationId: string,
  ): Promise<QBAccountResponseDto[]> {
    this.logger.log(`Getting mappable accounts for organization ${organizationId}`);
    return this.accountService.getMappableAccounts(organizationId);
  }

  /**
   * Suggest accounts for cost code
   *
   * Uses name matching to suggest appropriate QuickBooks accounts.
   *
   * @param organizationId Organization ID
   * @param costCodeName Cost code name to match
   * @returns Suggested accounts (sorted by relevance)
   */
  @Get('suggest/:costCodeName')
  @ApiOperation({
    summary: 'Suggest accounts for cost code',
    description: 'Get account suggestions for cost code based on name matching.',
  })
  @ApiResponse({
    status: 200,
    description: 'Account suggestions retrieved successfully',
    type: [QBAccountResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'QuickBooks connection not found',
  })
  async suggestAccountsForCostCode(
    @Param('organizationId') organizationId: string,
    @Param('costCodeName') costCodeName: string,
  ): Promise<QBAccountResponseDto[]> {
    this.logger.log(`Suggesting accounts for cost code: ${costCodeName}`);
    return this.accountService.suggestAccountsForCostCode(organizationId, costCodeName);
  }
}
