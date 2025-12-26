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
import { QuickBooksInvoiceService } from '../services';
import {
  CreateQBInvoiceDto,
  UpdateQBInvoiceDto,
  QBInvoiceResponseDto,
  QueryInvoicesDto,
  QBInvoicesListResponseDto,
  CreateInvoiceFromOwnerBillingDto,
  InvoiceExportResultDto,
  InvoiceStatusDto,
  RecordInvoicePaymentDto,
  QBPaymentResponseDto,
  InvoiceSyncResultDto,
} from '../dto';

/**
 * QuickBooks Invoice Controller
 *
 * Manages QuickBooks invoice operations for owner billing and progress payments.
 * Invoices are created from platform owner billing records.
 *
 * @route /api/v1/organizations/:organizationId/integrations/quickbooks/invoices
 */
@ApiTags('QuickBooks - Invoices')
@Controller('api/v1/organizations/:organizationId/integrations/quickbooks/invoices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuickBooksInvoiceController {
  constructor(private readonly invoiceService: QuickBooksInvoiceService) {}

  /**
   * List invoices from QuickBooks
   */
  @Get()
  @ApiOperation({ summary: 'List QuickBooks invoices' })
  @ApiResponse({ status: 200, description: 'Invoices retrieved', type: QBInvoicesListResponseDto })
  async getInvoices(
    @Param('organizationId') organizationId: string,
    @Query() filters: QueryInvoicesDto,
  ): Promise<QBInvoicesListResponseDto> {
    return this.invoiceService.getInvoices(organizationId, filters);
  }

  /**
   * Get invoice by ID
   */
  @Get(':invoiceId')
  @ApiOperation({ summary: 'Get QuickBooks invoice by ID' })
  @ApiResponse({ status: 200, description: 'Invoice retrieved', type: QBInvoiceResponseDto })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async getInvoiceById(
    @Param('organizationId') organizationId: string,
    @Param('invoiceId') invoiceId: string,
  ): Promise<QBInvoiceResponseDto> {
    return this.invoiceService.getInvoiceById(organizationId, invoiceId);
  }

  /**
   * Create invoice in QuickBooks
   */
  @Post()
  @ApiOperation({ summary: 'Create QuickBooks invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created', type: QBInvoiceResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createInvoice(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateQBInvoiceDto,
  ): Promise<QBInvoiceResponseDto> {
    return this.invoiceService.createInvoice(organizationId, dto);
  }

  /**
   * Update invoice in QuickBooks
   */
  @Put(':invoiceId')
  @ApiOperation({ summary: 'Update QuickBooks invoice' })
  @ApiResponse({ status: 200, description: 'Invoice updated', type: QBInvoiceResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async updateInvoice(
    @Param('organizationId') organizationId: string,
    @Body() dto: UpdateQBInvoiceDto,
  ): Promise<QBInvoiceResponseDto> {
    return this.invoiceService.updateInvoice(organizationId, dto);
  }

  /**
   * Export owner billing as QuickBooks invoice
   */
  @Post('export')
  @ApiOperation({ summary: 'Export owner billing as QuickBooks invoice' })
  @ApiResponse({ status: 200, description: 'Invoice exported', type: InvoiceExportResultDto })
  @ApiResponse({ status: 400, description: 'Owner billing already exported or invalid' })
  async exportOwnerBillingAsInvoice(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateInvoiceFromOwnerBillingDto,
  ): Promise<InvoiceExportResultDto> {
    return this.invoiceService.exportOwnerBillingAsInvoice(organizationId, dto);
  }

  /**
   * Get invoice export status for owner billing
   */
  @Get('owner-billing/:ownerBillingId/status')
  @ApiOperation({ summary: 'Get invoice export status for owner billing' })
  @ApiResponse({ status: 200, description: 'Status retrieved', type: InvoiceStatusDto })
  async getInvoiceStatus(
    @Param('organizationId') organizationId: string,
    @Param('ownerBillingId') ownerBillingId: string,
  ): Promise<InvoiceStatusDto> {
    return this.invoiceService.getInvoiceStatus(organizationId, ownerBillingId);
  }

  /**
   * Get QB invoice ID for owner billing
   */
  @Get('owner-billing/:ownerBillingId/qb-id')
  @ApiOperation({ summary: 'Get QuickBooks invoice ID for owner billing' })
  @ApiResponse({ status: 200, description: 'QB invoice ID retrieved' })
  async getQBInvoiceIdForOwnerBilling(
    @Param('organizationId') organizationId: string,
    @Param('ownerBillingId') ownerBillingId: string,
  ): Promise<{ qbInvoiceId: string | null }> {
    const qbInvoiceId = await this.invoiceService.getQBInvoiceIdForOwnerBilling(
      organizationId,
      ownerBillingId,
    );
    return { qbInvoiceId };
  }

  /**
   * Record payment for an invoice
   */
  @Post(':invoiceId/payment')
  @ApiOperation({ summary: 'Record payment for QuickBooks invoice' })
  @ApiResponse({ status: 201, description: 'Payment recorded', type: QBPaymentResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async recordInvoicePayment(
    @Param('organizationId') organizationId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: RecordInvoicePaymentDto,
  ): Promise<QBPaymentResponseDto> {
    return this.invoiceService.recordInvoicePayment(organizationId, {
      ...dto,
      invoiceId,
    });
  }

  /**
   * Batch sync multiple owner billings as invoices
   */
  @Post('batch-sync')
  @ApiOperation({ summary: 'Batch sync owner billings as invoices' })
  @ApiResponse({ status: 200, description: 'Batch sync completed', type: InvoiceSyncResultDto })
  async batchSyncInvoices(
    @Param('organizationId') organizationId: string,
    @Body() body: { ownerBillingIds: string[] },
  ): Promise<InvoiceSyncResultDto> {
    return this.invoiceService.syncInvoices(organizationId, body.ownerBillingIds);
  }
}
