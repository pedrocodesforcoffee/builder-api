import {
  Controller,
  Get,
  Delete,
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
import { QBEntityLink } from '../entities';
import { QBEntityType } from '../enums';

/**
 * QuickBooks Entity Link Controller
 *
 * Manages links between QuickBooks entities and platform entities.
 *
 * Features:
 * - View entity links
 * - Filter links by entity type
 * - Remove entity links
 * - Bulk link operations
 *
 * @controller
 */
@ApiTags('QuickBooks Entity Links')
@Controller('api/v1/organizations/:organizationId/integrations/quickbooks/entity-links')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuickBooksEntityLinkController {
  private readonly logger = new Logger(QuickBooksEntityLinkController.name);

  constructor(
    @InjectRepository(QBEntityLink)
    private readonly entityLinkRepository: Repository<QBEntityLink>,
  ) {}

  /**
   * List entity links
   *
   * @param organizationId - Organization ID
   * @param qbEntityType - Filter by QB entity type
   * @param platformEntityType - Filter by platform entity type
   * @param skip - Pagination offset
   * @param take - Pagination limit
   * @param user - Current user
   * @returns List of entity links
   */
  @Get()
  @ApiOperation({
    summary: 'List entity links',
    description: 'Retrieves list of entity links between QuickBooks and platform',
  })
  @ApiQuery({ name: 'qbEntityType', required: false, enum: QBEntityType })
  @ApiQuery({ name: 'platformEntityType', required: false, type: String })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Entity links retrieved' })
  async listEntityLinks(
    @Param('organizationId') organizationId: string,
    @Query('qbEntityType') qbEntityType?: QBEntityType,
    @Query('platformEntityType') platformEntityType?: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @CurrentUser() user?: any,
  ): Promise<{ links: QBEntityLink[]; total: number }> {
    const query = this.entityLinkRepository
      .createQueryBuilder('link')
      .where('link.organizationId = :organizationId', { organizationId })
      .orderBy('link.createdAt', 'DESC');

    if (qbEntityType) {
      query.andWhere('link.qbEntityType = :qbEntityType', { qbEntityType });
    }

    if (platformEntityType) {
      query.andWhere('link.platformEntityType = :platformEntityType', { platformEntityType });
    }

    if (skip) {
      query.skip(skip);
    }

    if (take) {
      query.take(take);
    } else {
      query.take(50); // Default limit
    }

    const [links, total] = await query.getManyAndCount();

    return { links, total };
  }

  /**
   * Get entity link by ID
   *
   * @param organizationId - Organization ID
   * @param linkId - Link ID
   * @param user - Current user
   * @returns Entity link details
   */
  @Get(':linkId')
  @ApiOperation({
    summary: 'Get entity link',
    description: 'Retrieves detailed information about a specific entity link',
  })
  @ApiResponse({ status: 200, description: 'Entity link retrieved' })
  @ApiResponse({ status: 404, description: 'Link not found' })
  async getEntityLink(
    @Param('organizationId') organizationId: string,
    @Param('linkId') linkId: string,
    @CurrentUser() user: any,
  ): Promise<QBEntityLink> {
    const link = await this.entityLinkRepository.findOne({
      where: { id: linkId, organizationId },
    });

    if (!link) {
      throw new NotFoundException('Entity link not found');
    }

    return link;
  }

  /**
   * Get link by platform entity
   *
   * @param organizationId - Organization ID
   * @param platformEntityType - Platform entity type
   * @param platformEntityId - Platform entity ID
   * @param user - Current user
   * @returns Entity link
   */
  @Get('by-platform/:platformEntityType/:platformEntityId')
  @ApiOperation({
    summary: 'Get link by platform entity',
    description: 'Finds QuickBooks link for a specific platform entity',
  })
  @ApiResponse({ status: 200, description: 'Entity link retrieved' })
  @ApiResponse({ status: 404, description: 'Link not found' })
  async getLinkByPlatformEntity(
    @Param('organizationId') organizationId: string,
    @Param('platformEntityType') platformEntityType: string,
    @Param('platformEntityId') platformEntityId: string,
    @CurrentUser() user: any,
  ): Promise<QBEntityLink> {
    const link = await this.entityLinkRepository.findOne({
      where: {
        organizationId,
        platformEntityType,
        platformEntityId,
      },
    });

    if (!link) {
      throw new NotFoundException('Entity link not found');
    }

    return link;
  }

  /**
   * Get link by QuickBooks entity
   *
   * @param organizationId - Organization ID
   * @param qbEntityType - QuickBooks entity type
   * @param qbEntityId - QuickBooks entity ID
   * @param user - Current user
   * @returns Entity link
   */
  @Get('by-quickbooks/:qbEntityType/:qbEntityId')
  @ApiOperation({
    summary: 'Get link by QuickBooks entity',
    description: 'Finds platform entity link for a specific QuickBooks entity',
  })
  @ApiResponse({ status: 200, description: 'Entity link retrieved' })
  @ApiResponse({ status: 404, description: 'Link not found' })
  async getLinkByQuickBooksEntity(
    @Param('organizationId') organizationId: string,
    @Param('qbEntityType') qbEntityType: QBEntityType,
    @Param('qbEntityId') qbEntityId: string,
    @CurrentUser() user: any,
  ): Promise<QBEntityLink> {
    const link = await this.entityLinkRepository.findOne({
      where: {
        organizationId,
        qbEntityType,
        qbEntityId,
      },
    });

    if (!link) {
      throw new NotFoundException('Entity link not found');
    }

    return link;
  }

  /**
   * Remove entity link
   *
   * @param organizationId - Organization ID
   * @param linkId - Link ID
   * @param user - Current user
   */
  @Delete(':linkId')
  @ApiOperation({
    summary: 'Remove entity link',
    description: 'Removes the link between QuickBooks and platform entity',
  })
  @ApiResponse({ status: 204, description: 'Link removed successfully' })
  @ApiResponse({ status: 404, description: 'Link not found' })
  async removeEntityLink(
    @Param('organizationId') organizationId: string,
    @Param('linkId') linkId: string,
    @CurrentUser() user: any,
  ): Promise<void> {
    const link = await this.entityLinkRepository.findOne({
      where: { id: linkId, organizationId },
    });

    if (!link) {
      throw new NotFoundException('Entity link not found');
    }

    await this.entityLinkRepository.remove(link);

    this.logger.log(
      `Removed entity link ${linkId} (${link.qbEntityType} ${link.qbEntityId} <-> ${link.platformEntityType} ${link.platformEntityId}) by user ${user.id}`,
    );
  }
}
