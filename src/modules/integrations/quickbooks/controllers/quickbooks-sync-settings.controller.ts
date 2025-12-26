import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QBSyncSettings } from '../entities';

/**
 * Update Sync Settings DTO
 */
export class UpdateSyncSettingsDto {
  autoSyncVendors?: boolean;
  autoSyncBills?: boolean;
  autoSyncBillPayments?: boolean;
  autoSyncInvoices?: boolean;
  autoSyncJournalEntries?: boolean;
  syncFrequency?: 'REALTIME' | 'HOURLY' | 'DAILY' | 'MANUAL';
  defaultBankAccountId?: string;
  enableConflictNotifications?: boolean;
  enableSyncErrorNotifications?: boolean;
}

/**
 * QuickBooks Sync Settings Controller
 *
 * Manages sync configuration and preferences.
 *
 * Features:
 * - View sync settings
 * - Update sync preferences
 * - Configure auto-sync behavior
 *
 * @controller
 */
@ApiTags('QuickBooks Sync Settings')
@Controller('api/v1/organizations/:organizationId/integrations/quickbooks/sync-settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuickBooksSyncSettingsController {
  private readonly logger = new Logger(QuickBooksSyncSettingsController.name);

  constructor(
    @InjectRepository(QBSyncSettings)
    private readonly syncSettingsRepository: Repository<QBSyncSettings>,
  ) {}

  /**
   * Get sync settings
   *
   * @param organizationId - Organization ID
   * @param user - Current user
   * @returns Sync settings
   */
  @Get()
  @ApiOperation({
    summary: 'Get sync settings',
    description: 'Retrieves QuickBooks sync configuration for the organization',
  })
  @ApiResponse({ status: 200, description: 'Sync settings retrieved' })
  @ApiResponse({ status: 404, description: 'No sync settings found' })
  async getSyncSettings(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: any,
  ): Promise<QBSyncSettings> {
    const settings = await this.syncSettingsRepository.findOne({
      where: { organizationId },
    });

    if (!settings) {
      throw new NotFoundException('No sync settings found for this organization');
    }

    return settings;
  }

  /**
   * Update sync settings
   *
   * @param organizationId - Organization ID
   * @param dto - Update settings DTO
   * @param user - Current user
   * @returns Updated settings
   */
  @Put()
  @ApiOperation({
    summary: 'Update sync settings',
    description: 'Updates QuickBooks sync configuration',
  })
  @ApiResponse({ status: 200, description: 'Sync settings updated' })
  @ApiResponse({ status: 404, description: 'No sync settings found' })
  async updateSyncSettings(
    @Param('organizationId') organizationId: string,
    @Body() dto: UpdateSyncSettingsDto,
    @CurrentUser() user: any,
  ): Promise<QBSyncSettings> {
    let settings = await this.syncSettingsRepository.findOne({
      where: { organizationId },
    });

    if (!settings) {
      // Create new settings if they don't exist
      settings = this.syncSettingsRepository.create({
        organizationId,
        autoSyncVendors: dto.autoSyncVendors,
        autoSyncBills: dto.autoSyncBills,
        autoSyncBillPayments: dto.autoSyncBillPayments,
        autoSyncInvoices: dto.autoSyncInvoices,
        autoSyncJournalEntries: dto.autoSyncJournalEntries,
        syncFrequency: dto.syncFrequency as any,
        defaultBankAccountId: dto.defaultBankAccountId,
        enableConflictNotifications: dto.enableConflictNotifications,
        enableSyncErrorNotifications: dto.enableSyncErrorNotifications,
      });
    } else {
      // Update existing settings
      if (dto.autoSyncVendors !== undefined) settings.autoSyncVendors = dto.autoSyncVendors;
      if (dto.autoSyncBills !== undefined) settings.autoSyncBills = dto.autoSyncBills;
      if (dto.autoSyncBillPayments !== undefined) settings.autoSyncBillPayments = dto.autoSyncBillPayments;
      if (dto.autoSyncInvoices !== undefined) settings.autoSyncInvoices = dto.autoSyncInvoices;
      if (dto.autoSyncJournalEntries !== undefined) settings.autoSyncJournalEntries = dto.autoSyncJournalEntries;
      if (dto.syncFrequency !== undefined) settings.syncFrequency = dto.syncFrequency as any;
      if (dto.defaultBankAccountId !== undefined) settings.defaultBankAccountId = dto.defaultBankAccountId;
      if (dto.enableConflictNotifications !== undefined) settings.enableConflictNotifications = dto.enableConflictNotifications;
      if (dto.enableSyncErrorNotifications !== undefined) settings.enableSyncErrorNotifications = dto.enableSyncErrorNotifications;
    }

    const updated = await this.syncSettingsRepository.save(settings);

    this.logger.log(
      `Updated sync settings for organization ${organizationId} by user ${user.id}`,
    );

    return updated;
  }
}
