import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QBSyncError } from '../entities';
import { QBEntityType } from '../enums';

/**
 * Resolve Error DTO
 */
export class ResolveErrorDto {
  resolutionType!: 'AUTO_RETRY' | 'MANUAL_FIX' | 'IGNORED' | 'DELETED';
  resolutionNotes?: string;
}

/**
 * QuickBooks Sync Error Controller
 *
 * Manages sync errors and resolution workflow.
 *
 * Features:
 * - View sync errors
 * - Filter errors by type, entity, status
 * - Retry failed syncs
 * - Mark errors as resolved
 * - Bulk error resolution
 *
 * @controller
 */
@ApiTags('QuickBooks Sync Errors')
@Controller('api/v1/organizations/:organizationId/integrations/quickbooks/sync-errors')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuickBooksSyncErrorController {
  private readonly logger = new Logger(QuickBooksSyncErrorController.name);

  constructor(
    @InjectRepository(QBSyncError)
    private readonly syncErrorRepository: Repository<QBSyncError>,
  ) {}

  /**
   * List sync errors
   *
   * @param organizationId - Organization ID
   * @param errorType - Filter by error type
   * @param entityType - Filter by entity type
   * @param resolved - Filter by resolution status
   * @param skip - Pagination offset
   * @param take - Pagination limit
   * @param user - Current user
   * @returns List of sync errors
   */
  @Get()
  @ApiOperation({
    summary: 'List sync errors',
    description: 'Retrieves list of sync errors with optional filters',
  })
  @ApiQuery({ name: 'errorType', required: false, enum: ['AUTH', 'RATE_LIMIT', 'VALIDATION', 'CONFLICT', 'NETWORK', 'MAPPING', 'OTHER'] })
  @ApiQuery({ name: 'entityType', required: false, enum: QBEntityType })
  @ApiQuery({ name: 'resolved', required: false, type: Boolean })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Sync errors retrieved' })
  async listSyncErrors(
    @Param('organizationId') organizationId: string,
    @Query('errorType') errorType?: string,
    @Query('entityType') entityType?: QBEntityType,
    @Query('resolved') resolved?: boolean,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @CurrentUser() user?: any,
  ): Promise<{ errors: QBSyncError[]; total: number }> {
    const query = this.syncErrorRepository
      .createQueryBuilder('error')
      .where('error.organizationId = :organizationId', { organizationId })
      .orderBy('error.createdAt', 'DESC');

    if (errorType) {
      query.andWhere('error.errorType = :errorType', { errorType });
    }

    if (entityType) {
      query.andWhere('error.qbEntityType = :entityType', { entityType });
    }

    if (resolved !== undefined) {
      query.andWhere('error.resolved = :resolved', { resolved });
    }

    if (skip) {
      query.skip(skip);
    }

    if (take) {
      query.take(take);
    } else {
      query.take(50); // Default limit
    }

    const [errors, total] = await query.getManyAndCount();

    return { errors, total };
  }

  /**
   * Get sync error by ID
   *
   * @param organizationId - Organization ID
   * @param errorId - Error ID
   * @param user - Current user
   * @returns Sync error details
   */
  @Get(':errorId')
  @ApiOperation({
    summary: 'Get sync error',
    description: 'Retrieves detailed information about a specific sync error',
  })
  @ApiResponse({ status: 200, description: 'Sync error retrieved' })
  @ApiResponse({ status: 404, description: 'Error not found' })
  async getSyncError(
    @Param('organizationId') organizationId: string,
    @Param('errorId') errorId: string,
    @CurrentUser() user: any,
  ): Promise<QBSyncError> {
    const error = await this.syncErrorRepository.findOne({
      where: { id: errorId, organizationId },
    });

    if (!error) {
      throw new NotFoundException('Sync error not found');
    }

    return error;
  }

  /**
   * Resolve sync error
   *
   * @param organizationId - Organization ID
   * @param errorId - Error ID
   * @param dto - Resolution details
   * @param user - Current user
   * @returns Updated error
   */
  @Put(':errorId/resolve')
  @ApiOperation({
    summary: 'Resolve sync error',
    description: 'Marks a sync error as resolved with resolution details',
  })
  @ApiResponse({ status: 200, description: 'Error resolved successfully' })
  @ApiResponse({ status: 404, description: 'Error not found' })
  async resolveSyncError(
    @Param('organizationId') organizationId: string,
    @Param('errorId') errorId: string,
    @Body() dto: ResolveErrorDto,
    @CurrentUser() user: any,
  ): Promise<QBSyncError> {
    const error = await this.syncErrorRepository.findOne({
      where: { id: errorId, organizationId },
    });

    if (!error) {
      throw new NotFoundException('Sync error not found');
    }

    error.resolved = true;
    error.resolutionType = dto.resolutionType;
    error.resolutionNotes = dto.resolutionNotes;
    error.resolvedAt = new Date();

    const updated = await this.syncErrorRepository.save(error);

    this.logger.log(
      `Resolved sync error ${errorId} with type ${dto.resolutionType} by user ${user.id}`,
    );

    return updated;
  }

  /**
   * Retry sync error
   *
   * @param organizationId - Organization ID
   * @param errorId - Error ID
   * @param user - Current user
   * @returns Updated error
   */
  @Post(':errorId/retry')
  @ApiOperation({
    summary: 'Retry failed sync',
    description: 'Increments retry count and schedules next retry attempt',
  })
  @ApiResponse({ status: 200, description: 'Retry scheduled' })
  @ApiResponse({ status: 404, description: 'Error not found' })
  async retrySyncError(
    @Param('organizationId') organizationId: string,
    @Param('errorId') errorId: string,
    @CurrentUser() user: any,
  ): Promise<QBSyncError> {
    const error = await this.syncErrorRepository.findOne({
      where: { id: errorId, organizationId },
    });

    if (!error) {
      throw new NotFoundException('Sync error not found');
    }

    error.retryCount += 1;
    error.lastRetryAt = new Date();

    // Calculate exponential backoff for next retry
    const backoffMinutes = Math.pow(2, error.retryCount) * 5; // 5, 10, 20, 40 minutes...
    error.nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

    const updated = await this.syncErrorRepository.save(error);

    this.logger.log(
      `Scheduled retry ${error.retryCount} for sync error ${errorId} at ${error.nextRetryAt}`,
    );

    // TODO: Queue actual retry job here

    return updated;
  }

  /**
   * Bulk resolve errors
   *
   * @param organizationId - Organization ID
   * @param dto - Bulk resolution details
   * @param user - Current user
   * @returns Number of errors resolved
   */
  @Post('bulk-resolve')
  @ApiOperation({
    summary: 'Bulk resolve errors',
    description: 'Resolves multiple sync errors at once',
  })
  @ApiResponse({ status: 200, description: 'Errors resolved successfully' })
  async bulkResolveErrors(
    @Param('organizationId') organizationId: string,
    @Body() dto: { errorIds: string[]; resolutionType: string; resolutionNotes?: string },
    @CurrentUser() user: any,
  ): Promise<{ resolved: number }> {
    const result = await this.syncErrorRepository
      .createQueryBuilder()
      .update(QBSyncError)
      .set({
        resolved: true,
        resolutionType: dto.resolutionType as any,
        resolutionNotes: dto.resolutionNotes,
        resolvedAt: new Date(),
      })
      .where('id IN (:...errorIds)', { errorIds: dto.errorIds })
      .andWhere('organizationId = :organizationId', { organizationId })
      .execute();

    this.logger.log(
      `Bulk resolved ${result.affected} errors for organization ${organizationId} by user ${user.id}`,
    );

    return { resolved: result.affected || 0 };
  }
}
