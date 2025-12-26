import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QBSyncHistory } from '../entities';
import { QBEntityType, QBSyncStatus, QBSyncDirection } from '../enums';

/**
 * QuickBooks Sync History Controller
 *
 * Provides audit trail and sync history queries.
 *
 * Features:
 * - View sync history
 * - Filter by entity, status, direction
 * - Date range queries
 * - Performance metrics
 *
 * @controller
 */
@ApiTags('QuickBooks Sync History')
@Controller('api/v1/organizations/:organizationId/integrations/quickbooks/sync-history')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuickBooksSyncHistoryController {
  private readonly logger = new Logger(QuickBooksSyncHistoryController.name);

  constructor(
    @InjectRepository(QBSyncHistory)
    private readonly syncHistoryRepository: Repository<QBSyncHistory>,
  ) {}

  /**
   * List sync history
   *
   * @param organizationId - Organization ID
   * @param entityType - Filter by entity type
   * @param status - Filter by sync status
   * @param syncDirection - Filter by sync direction
   * @param syncType - Filter by sync type
   * @param triggerSource - Filter by trigger source
   * @param startDate - Filter by start date
   * @param endDate - Filter by end date
   * @param skip - Pagination offset
   * @param take - Pagination limit
   * @param user - Current user
   * @returns List of sync history records
   */
  @Get()
  @ApiOperation({
    summary: 'List sync history',
    description: 'Retrieves sync history with optional filters',
  })
  @ApiQuery({ name: 'entityType', required: false, enum: QBEntityType })
  @ApiQuery({ name: 'status', required: false, enum: QBSyncStatus })
  @ApiQuery({ name: 'syncDirection', required: false, enum: QBSyncDirection })
  @ApiQuery({ name: 'syncType', required: false, enum: ['CREATE', 'UPDATE', 'DELETE', 'READ'] })
  @ApiQuery({ name: 'triggerSource', required: false, enum: ['MANUAL', 'SCHEDULED', 'EVENT', 'WEBHOOK', 'RETRY'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Sync history retrieved' })
  async listSyncHistory(
    @Param('organizationId') organizationId: string,
    @Query('entityType') entityType?: QBEntityType,
    @Query('status') status?: QBSyncStatus,
    @Query('syncDirection') syncDirection?: QBSyncDirection,
    @Query('syncType') syncType?: string,
    @Query('triggerSource') triggerSource?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @CurrentUser() user?: any,
  ): Promise<{ history: QBSyncHistory[]; total: number }> {
    const query = this.syncHistoryRepository
      .createQueryBuilder('history')
      .where('history.organizationId = :organizationId', { organizationId })
      .orderBy('history.createdAt', 'DESC');

    if (entityType) {
      query.andWhere('history.qbEntityType = :entityType', { entityType });
    }

    if (status) {
      query.andWhere('history.status = :status', { status });
    }

    if (syncDirection) {
      query.andWhere('history.syncDirection = :syncDirection', { syncDirection });
    }

    if (syncType) {
      query.andWhere('history.syncType = :syncType', { syncType });
    }

    if (triggerSource) {
      query.andWhere('history.triggerSource = :triggerSource', { triggerSource });
    }

    if (startDate) {
      query.andWhere('history.createdAt >= :startDate', { startDate: new Date(startDate) });
    }

    if (endDate) {
      query.andWhere('history.createdAt <= :endDate', { endDate: new Date(endDate) });
    }

    if (skip) {
      query.skip(skip);
    }

    if (take) {
      query.take(take);
    } else {
      query.take(50); // Default limit
    }

    const [history, total] = await query.getManyAndCount();

    return { history, total };
  }

  /**
   * Get sync history by ID
   *
   * @param organizationId - Organization ID
   * @param historyId - History ID
   * @param user - Current user
   * @returns Sync history details
   */
  @Get(':historyId')
  @ApiOperation({
    summary: 'Get sync history record',
    description: 'Retrieves detailed information about a specific sync operation',
  })
  @ApiResponse({ status: 200, description: 'Sync history retrieved' })
  @ApiResponse({ status: 404, description: 'History not found' })
  async getSyncHistory(
    @Param('organizationId') organizationId: string,
    @Param('historyId') historyId: string,
    @CurrentUser() user: any,
  ): Promise<QBSyncHistory> {
    const history = await this.syncHistoryRepository.findOne({
      where: { id: historyId, organizationId },
    });

    if (!history) {
      throw new NotFoundException('Sync history not found');
    }

    return history;
  }

  /**
   * Get sync statistics
   *
   * @param organizationId - Organization ID
   * @param startDate - Start date for stats
   * @param endDate - End date for stats
   * @param user - Current user
   * @returns Sync statistics
   */
  @Get('stats/summary')
  @ApiOperation({
    summary: 'Get sync statistics',
    description: 'Retrieves aggregated sync statistics for the organization',
  })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getSyncStatistics(
    @Param('organizationId') organizationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ): Promise<{
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    averageDuration: number;
    syncsByEntityType: Record<string, number>;
    syncsByStatus: Record<string, number>;
  }> {
    const query = this.syncHistoryRepository
      .createQueryBuilder('history')
      .where('history.organizationId = :organizationId', { organizationId });

    if (startDate) {
      query.andWhere('history.createdAt >= :startDate', { startDate: new Date(startDate) });
    }

    if (endDate) {
      query.andWhere('history.createdAt <= :endDate', { endDate: new Date(endDate) });
    }

    const allHistory = await query.getMany();

    const totalSyncs = allHistory.length;
    const successfulSyncs = allHistory.filter((h) => h.status === QBSyncStatus.SUCCESS).length;
    const failedSyncs = allHistory.filter((h) => h.status === QBSyncStatus.FAILED).length;

    const completedSyncs = allHistory.filter((h) => h.durationMs !== null && h.durationMs !== undefined);
    const averageDuration = completedSyncs.length > 0
      ? completedSyncs.reduce((sum, h) => sum + (h.durationMs || 0), 0) / completedSyncs.length
      : 0;

    const syncsByEntityType: Record<string, number> = {};
    const syncsByStatus: Record<string, number> = {};

    allHistory.forEach((h) => {
      syncsByEntityType[h.qbEntityType] = (syncsByEntityType[h.qbEntityType] || 0) + 1;
      syncsByStatus[h.status] = (syncsByStatus[h.status] || 0) + 1;
    });

    return {
      totalSyncs,
      successfulSyncs,
      failedSyncs,
      averageDuration: Math.round(averageDuration),
      syncsByEntityType,
      syncsByStatus,
    };
  }
}
