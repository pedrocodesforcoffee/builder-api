import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SavedSearchService } from '../services/saved-search.service';
import { CreateSavedSearchDto } from '../dto/create-saved-search.dto';
import { UpdateSavedSearchDto } from '../dto/update-saved-search.dto';
import { ShareSavedSearchDto } from '../dto/share-saved-search.dto';
import { SavedSearch } from '../entities/saved-search.entity';
import { SearchResultsDto } from '../dto/search-results.dto';
import { NotificationFrequency } from '../enums/notification-frequency.enum';

/**
 * Saved Search Controller
 *
 * Manages saved searches with CRUD operations
 */
@Controller('api/saved-searches')
@UseGuards(JwtAuthGuard)
export class SavedSearchController {
  constructor(private readonly savedSearchService: SavedSearchService) {}

  /**
   * Create a new saved search
   */
  @Post()
  async create(
    @Body() dto: CreateSavedSearchDto,
    @Req() req: Request,
  ): Promise<SavedSearch> {
    const userId = (req as any).user?.sub || (req as any).user?.id;
    const organizationId = (req as any).user?.organizationId;

    return this.savedSearchService.create(dto, userId, organizationId);
  }

  /**
   * Get all saved searches for the user
   */
  @Get()
  async findAll(@Req() req: Request): Promise<SavedSearch[]> {
    const userId = (req as any).user?.sub || (req as any).user?.id;
    const organizationId = (req as any).user?.organizationId;

    return this.savedSearchService.findAll(userId, organizationId);
  }

  /**
   * Get a specific saved search
   */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<SavedSearch> {
    const userId = (req as any).user?.sub || (req as any).user?.id;

    return this.savedSearchService.findOne(id, userId);
  }

  /**
   * Update a saved search
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSavedSearchDto,
    @Req() req: Request,
  ): Promise<SavedSearch> {
    const userId = (req as any).user?.sub || (req as any).user?.id;

    return this.savedSearchService.update(id, dto, userId);
  }

  /**
   * Delete a saved search
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<void> {
    const userId = (req as any).user?.sub || (req as any).user?.id;

    await this.savedSearchService.remove(id, userId);
  }

  /**
   * Execute a saved search
   */
  @Post(':id/execute')
  async execute(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<SearchResultsDto> {
    const userId = (req as any).user?.sub || (req as any).user?.id;

    return this.savedSearchService.execute(id, userId);
  }

  /**
   * Share a saved search with users or roles
   */
  @Post(':id/share')
  async share(
    @Param('id') id: string,
    @Body() dto: ShareSavedSearchDto,
    @Req() req: Request,
  ): Promise<SavedSearch> {
    const userId = (req as any).user?.sub || (req as any).user?.id;

    return this.savedSearchService.share(
      id,
      dto.userIds,
      dto.roleIds,
      userId,
    );
  }

  /**
   * Update notification settings for a saved search
   */
  @Post(':id/notifications')
  async updateNotifications(
    @Param('id') id: string,
    @Body() dto: { enabled: boolean; frequency?: NotificationFrequency },
    @Req() req: Request,
  ): Promise<SavedSearch> {
    const userId = (req as any).user?.sub || (req as any).user?.id;

    return this.savedSearchService.updateNotifications(
      id,
      dto.enabled,
      dto.frequency,
      userId,
    );
  }
}