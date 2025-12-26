import {
  Controller,
  Get,
  Post,
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
import { QuickBooksBillService } from '../services';
import {
  CreateQBBillDto,
  QueryBillsDto,
  QBBillResponseDto,
  QBBillsListResponseDto,
  CreateBillFromPaymentApplicationDto,
} from '../dto';
import { QBSyncStatus } from '../enums';

/**
 * QuickBooks Bill Controller
 *
 * Manages QuickBooks bill operations for payment applications.
 * Bills represent invoices received from vendors.
 *
 * @route /api/v1/organizations/:organizationId/integrations/quickbooks/bills
 */
@ApiTags('QuickBooks - Bills')
@Controller('api/v1/organizations/:organizationId/integrations/quickbooks/bills')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuickBooksBillController {
  constructor(private readonly billService: QuickBooksBillService) {}

  /**
   * List bills from QuickBooks
   */
  @Get()
  @ApiOperation({ summary: 'List QuickBooks bills' })
  @ApiResponse({ status: 200, description: 'Bills retrieved', type: QBBillsListResponseDto })
  async getBills(
    @Param('organizationId') organizationId: string,
    @Query() filters: QueryBillsDto,
  ): Promise<QBBillsListResponseDto> {
    return this.billService.getBills(organizationId, filters);
  }

  /**
   * Get bill by ID from QuickBooks
   */
  @Get(':billId')
  @ApiOperation({ summary: 'Get QuickBooks bill by ID' })
  @ApiResponse({ status: 200, description: 'Bill retrieved', type: QBBillResponseDto })
  @ApiResponse({ status: 404, description: 'Bill not found' })
  async getBillById(
    @Param('organizationId') organizationId: string,
    @Param('billId') billId: string,
  ): Promise<QBBillResponseDto> {
    return this.billService.getBillById(organizationId, billId);
  }

  /**
   * Create bill in QuickBooks
   */
  @Post()
  @ApiOperation({ summary: 'Create QuickBooks bill' })
  @ApiResponse({ status: 201, description: 'Bill created', type: QBBillResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createBill(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateQBBillDto,
  ): Promise<QBBillResponseDto> {
    return this.billService.createBill(organizationId, dto);
  }

  /**
   * Export payment application as QuickBooks bill
   */
  @Post('pay-apps/:payAppId/export')
  @ApiOperation({ summary: 'Export payment application as QuickBooks bill' })
  @ApiResponse({ status: 200, description: 'Bill exported successfully' })
  @ApiResponse({ status: 400, description: 'Payment application already exported or invalid' })
  @ApiResponse({ status: 404, description: 'Payment application not found' })
  async exportPayAppAsBill(
    @Param('organizationId') organizationId: string,
    @Param('payAppId') payAppId: string,
    @Body() dto: CreateBillFromPaymentApplicationDto,
  ): Promise<{ success: boolean; billId: string; message: string }> {
    const result = await this.billService.createBillFromPaymentApplication(
      organizationId,
      { ...dto, paymentApplicationId: dto.paymentApplicationId || payAppId },
    );

    return {
      success: true,
      billId: result.id,
      message: `Bill successfully created for payment application ${payAppId}`,
    };
  }

  /**
   * Get bill export status for payment application
   */
  @Get('pay-apps/:payAppId/status')
  @ApiOperation({ summary: 'Get bill export status for payment application' })
  @ApiResponse({ status: 200, description: 'Status retrieved' })
  @ApiResponse({ status: 404, description: 'Payment application not found' })
  async getPayAppBillStatus(
    @Param('organizationId') organizationId: string,
    @Param('payAppId') payAppId: string,
  ): Promise<{
    isExported: boolean;
    billId?: string;
    lastSyncedAt?: string;
    syncStatus?: string;
  }> {
    // Check if payment application is linked to a bill
    const link = await this.billService['entityLinkRepository'].findOne({
      where: {
        organizationId,
        platformEntityType: 'PAYMENT_APPLICATION',
        platformEntityId: payAppId,
        qbEntityType: 'BILL' as any,
      },
    });

    if (!link) {
      return {
        isExported: false,
      };
    }

    return {
      isExported: true,
      billId: link.qbEntityId,
      lastSyncedAt: link.lastSyncedAt?.toISOString(),
      syncStatus: link.syncStatus,
    };
  }

  /**
   * Batch sync bills for multiple payment applications
   */
  @Post('sync')
  @ApiOperation({ summary: 'Batch sync bills for payment applications' })
  @ApiResponse({ status: 200, description: 'Sync completed' })
  async syncBills(
    @Param('organizationId') organizationId: string,
    @Body() body: { paymentApplicationIds: string[] },
  ): Promise<{ processed: number; succeeded: number; failed: number; errors?: string[] }> {
    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const payAppId of body.paymentApplicationIds) {
      processed++;
      try {
        await this.billService.createBillFromPaymentApplication(organizationId, { paymentApplicationId: payAppId });
        succeeded++;
      } catch (error: any) {
        failed++;
        errors.push(`${payAppId}: ${error.message}`);
      }
    }

    return {
      processed,
      succeeded,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Get bill sync status overview
   */
  @Get('sync/status')
  @ApiOperation({ summary: 'Get bill sync status overview' })
  @ApiResponse({ status: 200, description: 'Sync status retrieved' })
  async getSyncStatus(
    @Param('organizationId') organizationId: string,
  ): Promise<{
    totalBills: number;
    syncedBills: number;
    pendingBills: number;
    errorBills: number;
  }> {
    const allLinks = await this.billService['entityLinkRepository'].find({
      where: {
        organizationId,
        qbEntityType: 'BILL' as any,
      },
    });

    const syncedBills = allLinks.filter((link) => link.syncStatus === QBSyncStatus.SUCCESS).length;
    const pendingBills = allLinks.filter((link) => link.syncStatus === QBSyncStatus.PENDING).length;
    const errorBills = allLinks.filter((link) => link.syncStatus === QBSyncStatus.FAILED).length;

    return {
      totalBills: allLinks.length,
      syncedBills,
      pendingBills,
      errorBills,
    };
  }
}
