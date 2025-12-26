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
import { QuickBooksCustomerService } from '../services';
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

/**
 * QuickBooks Customer Controller
 *
 * Manages QuickBooks customer (project owner) operations.
 * Customers are required for invoice creation.
 *
 * @route /api/v1/organizations/:organizationId/integrations/quickbooks/customers
 */
@ApiTags('QuickBooks - Customers')
@Controller('api/v1/organizations/:organizationId/integrations/quickbooks/customers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuickBooksCustomerController {
  constructor(private readonly customerService: QuickBooksCustomerService) {}

  /**
   * List customers from QuickBooks
   */
  @Get()
  @ApiOperation({ summary: 'List QuickBooks customers' })
  @ApiResponse({ status: 200, description: 'Customers retrieved', type: QBCustomersListResponseDto })
  async getCustomers(
    @Param('organizationId') organizationId: string,
    @Query() filters: QueryCustomersDto,
  ): Promise<QBCustomersListResponseDto> {
    return this.customerService.getCustomers(organizationId, filters);
  }

  /**
   * Get customer by ID
   */
  @Get(':customerId')
  @ApiOperation({ summary: 'Get QuickBooks customer by ID' })
  @ApiResponse({ status: 200, description: 'Customer retrieved', type: QBCustomerResponseDto })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async getCustomerById(
    @Param('organizationId') organizationId: string,
    @Param('customerId') customerId: string,
  ): Promise<QBCustomerResponseDto> {
    return this.customerService.getCustomerById(organizationId, customerId);
  }

  /**
   * Create customer in QuickBooks
   */
  @Post()
  @ApiOperation({ summary: 'Create QuickBooks customer' })
  @ApiResponse({ status: 201, description: 'Customer created', type: QBCustomerResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createCustomer(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateQBCustomerDto,
  ): Promise<QBCustomerResponseDto> {
    return this.customerService.createCustomer(organizationId, dto);
  }

  /**
   * Update customer in QuickBooks
   */
  @Put(':customerId')
  @ApiOperation({ summary: 'Update QuickBooks customer' })
  @ApiResponse({ status: 200, description: 'Customer updated', type: QBCustomerResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async updateCustomer(
    @Param('organizationId') organizationId: string,
    @Body() dto: UpdateQBCustomerDto,
  ): Promise<QBCustomerResponseDto> {
    return this.customerService.updateCustomer(organizationId, dto);
  }

  /**
   * Link platform entity to QuickBooks customer
   */
  @Post('link')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Link entity to QuickBooks customer' })
  @ApiResponse({ status: 204, description: 'Entity linked successfully' })
  @ApiResponse({ status: 400, description: 'Entity already linked or customer not found' })
  async linkCustomer(
    @Param('organizationId') organizationId: string,
    @Body() dto: LinkCustomerDto,
  ): Promise<void> {
    return this.customerService.linkCustomer(organizationId, dto);
  }

  /**
   * Sync platform entity as QuickBooks customer
   */
  @Post('sync')
  @ApiOperation({ summary: 'Sync entity to QuickBooks customer' })
  @ApiResponse({ status: 200, description: 'Customer synced', type: CustomerSyncResultDto })
  async syncCustomer(
    @Param('organizationId') organizationId: string,
    @Body() dto: SyncCustomerDto,
  ): Promise<CustomerSyncResultDto> {
    return this.customerService.syncCustomerFromEntity(organizationId, dto);
  }

  /**
   * Get QB customer ID for platform entity
   */
  @Get('entity/:entityId/qb-id')
  @ApiOperation({ summary: 'Get QuickBooks customer ID for platform entity' })
  @ApiResponse({ status: 200, description: 'QB customer ID retrieved' })
  async getQBCustomerIdForEntity(
    @Param('organizationId') organizationId: string,
    @Param('entityId') entityId: string,
  ): Promise<{ qbCustomerId: string | null }> {
    const qbCustomerId = await this.customerService.getQBCustomerIdForEntity(organizationId, entityId);
    return { qbCustomerId };
  }
}
