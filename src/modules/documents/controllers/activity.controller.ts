import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { ActivityService } from '../services/activity.service';
import {
  AddFavoriteDto,
  RecentDocumentsDto,
  FavoriteDocumentResponseDto,
  RecentDocumentResponseDto,
} from '../dto/search.dto';

/**
 * Activity Controller
 *
 * Manages user document activities and favorites.
 *
 * Endpoints:
 * - GET    /projects/:projectId/documents/recent - Recent documents
 * - POST   /documents/:documentId/favorite - Add to favorites
 * - DELETE /documents/:documentId/favorite - Remove from favorites
 * - GET    /projects/:projectId/favorites - List favorites
 * - PUT    /favorites/:favoriteId - Update favorite metadata
 * - GET    /documents/:documentId/favorite-status - Check if favorited
 * - GET    /documents/:documentId/activity-stats - Document activity stats
 */
@Controller()
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  /**
   * Get recent documents for user
   *
   * Returns documents user has viewed, downloaded, or clicked in search
   */
  @Get('projects/:projectId/documents/recent')
  async getRecentDocuments(
    @Param('projectId') projectId: string,
    @Query() dto: RecentDocumentsDto,
    @Request() req: any,
  ): Promise<RecentDocumentResponseDto[]> {
    const userId = req.user.id;
    return this.activityService.getRecentDocuments(projectId, userId, dto);
  }

  /**
   * Add document to favorites
   */
  @Post('documents/:documentId/favorite')
  async addFavorite(
    @Param('documentId') documentId: string,
    @Body() dto: AddFavoriteDto,
    @Request() req: any,
  ): Promise<FavoriteDocumentResponseDto> {
    const userId = req.user.id;
    return this.activityService.addFavorite(userId, documentId, dto);
  }

  /**
   * Remove document from favorites
   */
  @Delete('documents/:documentId/favorite')
  async removeFavorite(
    @Param('documentId') documentId: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    const userId = req.user.id;
    await this.activityService.removeFavorite(userId, documentId);
    return { message: 'Document removed from favorites' };
  }

  /**
   * Get user's favorite documents
   */
  @Get('projects/:projectId/favorites')
  async getFavorites(
    @Param('projectId') projectId: string,
    @Query('limit') limit: number = 50,
    @Request() req: any,
  ): Promise<FavoriteDocumentResponseDto[]> {
    const userId = req.user.id;
    return this.activityService.getFavorites(projectId, userId, limit);
  }

  /**
   * Update favorite metadata (notes, tags)
   */
  @Put('favorites/:favoriteId')
  async updateFavorite(
    @Param('favoriteId') favoriteId: string,
    @Body() dto: AddFavoriteDto,
    @Request() req: any,
  ): Promise<FavoriteDocumentResponseDto> {
    const userId = req.user.id;
    return this.activityService.updateFavorite(userId, favoriteId, dto);
  }

  /**
   * Check if document is in user's favorites
   */
  @Get('documents/:documentId/favorite-status')
  async getFavoriteStatus(
    @Param('documentId') documentId: string,
    @Request() req: any,
  ): Promise<{ isFavorited: boolean }> {
    const userId = req.user.id;
    const isFavorited = await this.activityService.isFavorited(userId, documentId);
    return { isFavorited };
  }

  /**
   * Get document activity statistics
   *
   * Returns view/download/search click counts for a document
   */
  @Get('documents/:documentId/activity-stats')
  async getDocumentActivityStats(
    @Param('documentId') documentId: string,
    @Query('daysBack') daysBack: number = 30,
  ): Promise<{
    viewCount: number;
    downloadCount: number;
    searchClickCount: number;
    uniqueUsers: number;
    favoriteCount: number;
  }> {
    return this.activityService.getDocumentActivityStats(documentId, daysBack);
  }
}
