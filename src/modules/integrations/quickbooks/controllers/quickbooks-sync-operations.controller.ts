import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QBConnection } from '../entities';
import { QBEntityType } from '../enums';

/**
 * Manual Sync Request DTO
 */
export class ManualSyncDto {
  entityType!: QBEntityType;
  entityIds?: string[]; // Optional: sync specific entities
  fullSync?: boolean; // Sync all entities of this type
}

/**
 * Sync Result DTO
 */
export class SyncResultDto {
  jobId!: string;
  entityType!: QBEntityType;
  entitiesQueued!: number;
  message!: string;
}

/**
 * QuickBooks Sync Operations Controller
 *
 * Handles manual sync operations and bulk sync triggers.
 *
 * Features:
 * - Trigger manual entity sync
 * - Full sync for entity type
 * - Selective entity sync
 * - Bulk sync operations
 *
 * @controller
 */
@ApiTags('QuickBooks Sync Operations')
@Controller('api/v1/organizations/:organizationId/integrations/quickbooks/sync')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuickBooksSyncOperationsController {
  private readonly logger = new Logger(QuickBooksSyncOperationsController.name);

  constructor(
    @InjectRepository(QBConnection)
    private readonly connectionRepository: Repository<QBConnection>,
    @InjectQueue('quickbooks-sync')
    private readonly syncQueue: Queue,
  ) {}

  /**
   * Trigger manual sync
   *
   * @param organizationId - Organization ID
   * @param dto - Manual sync request
   * @param user - Current user
   * @returns Sync job details
   */
  @Post('manual')
  @ApiOperation({
    summary: 'Trigger manual sync',
    description: 'Manually triggers synchronization for specific entities or entity type',
  })
  @ApiResponse({ status: 200, description: 'Sync jobs queued successfully' })
  @ApiResponse({ status: 400, description: 'Invalid sync request' })
  @ApiResponse({ status: 404, description: 'No connection found' })
  async triggerManualSync(
    @Param('organizationId') organizationId: string,
    @Body() dto: ManualSyncDto,
    @CurrentUser() user: any,
  ): Promise<SyncResultDto> {
    // Verify connection exists
    const connection = await this.connectionRepository.findOne({
      where: { organizationId },
    });

    if (!connection) {
      throw new BadRequestException('No QuickBooks connection found for this organization');
    }

    if (connection.status !== 'CONNECTED') {
      throw new BadRequestException(`QuickBooks connection is not active: ${connection.status}`);
    }

    // Validate sync request
    if (!dto.fullSync && (!dto.entityIds || dto.entityIds.length === 0)) {
      throw new BadRequestException('Must specify either fullSync=true or provide entityIds');
    }

    let entitiesQueued = 0;

    if (dto.fullSync) {
      // Queue full sync job for this entity type
      const job = await this.syncQueue.add(
        'full-sync',
        {
          organizationId,
          entityType: dto.entityType,
          triggeredBy: user.id,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      );

      this.logger.log(
        `Queued full sync job ${job.id} for ${dto.entityType} in organization ${organizationId}`,
      );

      return {
        jobId: job.id.toString(),
        entityType: dto.entityType,
        entitiesQueued: 0, // Unknown until job processes
        message: `Full sync queued for ${dto.entityType}`,
      };
    } else {
      // Queue individual entity sync jobs
      const jobs = await Promise.all(
        dto.entityIds!.map((entityId) =>
          this.syncQueue.add(
            'sync-entity',
            {
              organizationId,
              entityType: dto.entityType,
              entityId,
              triggeredBy: user.id,
            },
            {
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 5000,
              },
            },
          ),
        ),
      );

      entitiesQueued = jobs.length;

      this.logger.log(
        `Queued ${entitiesQueued} entity sync jobs for ${dto.entityType} in organization ${organizationId}`,
      );

      return {
        jobId: jobs[0]?.id.toString() || '',
        entityType: dto.entityType,
        entitiesQueued,
        message: `Queued sync for ${entitiesQueued} ${dto.entityType} entities`,
      };
    }
  }

  /**
   * Trigger full sync for all supported entities
   *
   * @param organizationId - Organization ID
   * @param user - Current user
   * @returns Sync job details
   */
  @Post('full')
  @ApiOperation({
    summary: 'Trigger full sync',
    description: 'Triggers full synchronization for all supported entity types',
  })
  @ApiResponse({ status: 200, description: 'Full sync jobs queued successfully' })
  @ApiResponse({ status: 400, description: 'Invalid sync request' })
  async triggerFullSync(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: any,
  ): Promise<{ jobsQueued: number; message: string }> {
    // Verify connection exists
    const connection = await this.connectionRepository.findOne({
      where: { organizationId },
    });

    if (!connection) {
      throw new BadRequestException('No QuickBooks connection found for this organization');
    }

    if (connection.status !== 'CONNECTED') {
      throw new BadRequestException(`QuickBooks connection is not active: ${connection.status}`);
    }

    // Queue full sync for all supported entity types
    const entityTypes = [
      QBEntityType.VENDOR,
      QBEntityType.CUSTOMER,
      QBEntityType.ACCOUNT,
      QBEntityType.BILL,
      QBEntityType.BILL_PAYMENT,
      QBEntityType.INVOICE,
      QBEntityType.PAYMENT,
    ];

    const jobs = await Promise.all(
      entityTypes.map((entityType) =>
        this.syncQueue.add(
          'full-sync',
          {
            organizationId,
            entityType,
            triggeredBy: user.id,
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
          },
        ),
      ),
    );

    this.logger.log(
      `Queued ${jobs.length} full sync jobs for organization ${organizationId}`,
    );

    return {
      jobsQueued: jobs.length,
      message: `Queued full sync for ${jobs.length} entity types`,
    };
  }
}
