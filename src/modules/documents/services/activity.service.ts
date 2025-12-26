import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import {
  UserDocumentActivity,
  DocumentActivityType,
} from '../entities/user-document-activity.entity';
import { UserFavorite } from '../entities/user-favorite.entity';
import { Document } from '../entities/document.entity';
import {
  AddFavoriteDto,
  RecentDocumentsDto,
  FavoriteDocumentResponseDto,
  RecentDocumentResponseDto,
} from '../dto/search.dto';
import { PermissionService } from './permission.service';
import { DocumentAction } from '../enums/permission.enums';

/**
 * Activity Service
 *
 * Manages user document activities and favorites.
 *
 * Features:
 * - Track document views, downloads, and interactions
 * - Manage favorites/starred documents
 * - Retrieve recent document history
 * - Permission-aware (only show accessible documents)
 *
 * Use Cases:
 * - "Recently Viewed" sidebar
 * - "My Favorites" page
 * - Usage analytics
 * - Personalized recommendations
 */
@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(
    @InjectRepository(UserDocumentActivity)
    private readonly activityRepo: Repository<UserDocumentActivity>,
    @InjectRepository(UserFavorite)
    private readonly favoriteRepo: Repository<UserFavorite>,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    private readonly permissionService: PermissionService,
  ) {}

  /**
   * Track document activity (view, download, etc.)
   *
   * @param userId - User performing action
   * @param documentId - Document being accessed
   * @param activityType - Type of activity
   * @param context - Additional context (search query, IP, etc.)
   */
  async trackActivity(
    userId: string,
    documentId: string,
    activityType: DocumentActivityType,
    context?: {
      versionId?: string;
      searchQuery?: string;
      searchResultPosition?: number;
      ipAddress?: string;
      userAgent?: string;
      durationSeconds?: number;
    },
  ): Promise<void> {
    try {
      await this.activityRepo.save({
        userId,
        documentId,
        versionId: context?.versionId || null,
        activityType,
        activityDate: new Date(),
        searchQuery: context?.searchQuery || null,
        searchResultPosition: context?.searchResultPosition || null,
        ipAddress: context?.ipAddress || null,
        userAgent: context?.userAgent || null,
        durationSeconds: context?.durationSeconds || null,
      });
    } catch (error) {
      this.logger.error(`Track activity error:`, error);
      // Don't throw - activity tracking should not break main flow
    }
  }

  /**
   * Get user's recent documents
   *
   * @param projectId - Project context
   * @param userId - User requesting
   * @param dto - Recent documents parameters
   * @returns Recent document activities
   */
  async getRecentDocuments(
    projectId: string,
    userId: string,
    dto: RecentDocumentsDto,
  ): Promise<RecentDocumentResponseDto[]> {
    try {
      // Calculate date threshold
      const daysBack = dto.daysBack || 30;
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - daysBack);

      // Build query
      const queryBuilder = this.activityRepo
        .createQueryBuilder('activity')
        .leftJoinAndSelect('activity.document', 'document')
        .where('activity.userId = :userId', { userId })
        .andWhere('document.projectId = :projectId', { projectId })
        .andWhere('activity.activityDate >= :dateThreshold', { dateThreshold });

      // Filter by activity types if specified
      if (dto.activityTypes && dto.activityTypes.length > 0) {
        queryBuilder.andWhere('activity.activityType IN (:...activityTypes)', {
          activityTypes: dto.activityTypes,
        });
      }

      // Order by most recent
      queryBuilder
        .orderBy('activity.activityDate', 'DESC')
        .limit(dto.limit || 20);

      const activities = await queryBuilder.getMany();

      // Filter by permissions (ensure user still has access)
      const accessibleActivities: RecentDocumentResponseDto[] = [];

      for (const activity of activities) {
        try {
          // Check if user still has access
          const hasAccess = await this.permissionService.hasPermission(
            userId,
            activity.documentId,
            DocumentAction.VIEW,
          );

          if (hasAccess && activity.document) {
            accessibleActivities.push({
              documentId: activity.documentId,
              document: {
                id: activity.document.id,
                name: activity.document.name,
                documentType: activity.document.documentType,
                mimeType: (activity.document as any).currentVersion?.mimeType || 'application/octet-stream',
              },
              activityType: activity.activityType,
              activityDate: activity.activityDate,
              searchQuery: activity.searchQuery || undefined,
            });
          }
        } catch (error) {
          // Skip documents user doesn't have access to
          continue;
        }
      }

      return accessibleActivities;
    } catch (error) {
      this.logger.error(`Get recent documents error:`, error);
      throw error;
    }
  }

  /**
   * Add document to favorites
   *
   * @param userId - User adding favorite
   * @param documentId - Document to favorite
   * @param dto - Favorite metadata
   * @returns Created favorite
   */
  async addFavorite(
    userId: string,
    documentId: string,
    dto: AddFavoriteDto,
  ): Promise<FavoriteDocumentResponseDto> {
    try {
      // Verify document exists and user has access
      const document = await this.documentRepo.findOne({
        where: { id: documentId },
      });

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      // Check permission
      await this.permissionService.enforcePermission(
        userId,
        documentId,
        DocumentAction.VIEW,
      );

      // Check if already favorited
      const existing = await this.favoriteRepo.findOne({
        where: { userId, documentId },
      });

      if (existing) {
        throw new ConflictException('Document already in favorites');
      }

      // Create favorite
      const favorite = await this.favoriteRepo.save({
        userId,
        documentId,
        notes: dto.notes || null,
        tags: dto.tags || null,
        lastAccessedAt: new Date(),
      });

      return {
        id: favorite.id,
        documentId: favorite.documentId,
        document: {
          id: document.id,
          name: document.name,
          documentType: document.documentType,
          mimeType: (document as any).currentVersion?.mimeType || 'application/octet-stream',
        },
        notes: favorite.notes || undefined,
        tags: favorite.tags || undefined,
        createdAt: favorite.createdAt,
        lastAccessedAt: favorite.lastAccessedAt || undefined,
      };
    } catch (error) {
      this.logger.error(`Add favorite error:`, error);
      throw error;
    }
  }

  /**
   * Remove document from favorites
   *
   * @param userId - User removing favorite
   * @param documentId - Document to unfavorite
   */
  async removeFavorite(userId: string, documentId: string): Promise<void> {
    try {
      const favorite = await this.favoriteRepo.findOne({
        where: { userId, documentId },
      });

      if (!favorite) {
        throw new NotFoundException('Favorite not found');
      }

      await this.favoriteRepo.remove(favorite);
    } catch (error) {
      this.logger.error(`Remove favorite error:`, error);
      throw error;
    }
  }

  /**
   * Get user's favorite documents
   *
   * @param projectId - Project context
   * @param userId - User requesting
   * @param limit - Max results
   * @returns Favorite documents
   */
  async getFavorites(
    projectId: string,
    userId: string,
    limit: number = 50,
  ): Promise<FavoriteDocumentResponseDto[]> {
    try {
      const favorites = await this.favoriteRepo
        .createQueryBuilder('favorite')
        .leftJoinAndSelect('favorite.document', 'document')
        .where('favorite.userId = :userId', { userId })
        .andWhere('document.projectId = :projectId', { projectId })
        .orderBy('favorite.createdAt', 'DESC')
        .limit(limit)
        .getMany();

      // Filter by current permissions
      const accessibleFavorites: FavoriteDocumentResponseDto[] = [];

      for (const favorite of favorites) {
        try {
          const hasAccess = await this.permissionService.hasPermission(
            userId,
            favorite.documentId,
            DocumentAction.VIEW,
          );

          if (hasAccess && favorite.document) {
            accessibleFavorites.push({
              id: favorite.id,
              documentId: favorite.documentId,
              document: {
                id: favorite.document.id,
                name: favorite.document.name,
                documentType: favorite.document.documentType,
                mimeType: (favorite.document as any).currentVersion?.mimeType || 'application/octet-stream',
              },
              notes: favorite.notes || undefined,
              tags: favorite.tags || undefined,
              createdAt: favorite.createdAt,
              lastAccessedAt: favorite.lastAccessedAt || undefined,
            });
          }
        } catch (error) {
          // Skip inaccessible favorites
          continue;
        }
      }

      return accessibleFavorites;
    } catch (error) {
      this.logger.error(`Get favorites error:`, error);
      throw error;
    }
  }

  /**
   * Update favorite metadata
   *
   * @param userId - User updating
   * @param favoriteId - Favorite ID
   * @param dto - Updated metadata
   * @returns Updated favorite
   */
  async updateFavorite(
    userId: string,
    favoriteId: string,
    dto: AddFavoriteDto,
  ): Promise<FavoriteDocumentResponseDto> {
    try {
      const favorite = await this.favoriteRepo.findOne({
        where: { id: favoriteId, userId },
        relations: ['document'],
      });

      if (!favorite) {
        throw new NotFoundException('Favorite not found');
      }

      // Update fields
      if (dto.notes !== undefined) favorite.notes = dto.notes || null;
      if (dto.tags !== undefined) favorite.tags = dto.tags || null;
      favorite.lastAccessedAt = new Date();

      await this.favoriteRepo.save(favorite);

      return {
        id: favorite.id,
        documentId: favorite.documentId,
        document: {
          id: favorite.document.id,
          name: favorite.document.name,
          documentType: favorite.document.documentType,
          mimeType: (favorite.document as any).currentVersion?.mimeType || 'application/octet-stream',
        },
        notes: favorite.notes || undefined,
        tags: favorite.tags || undefined,
        createdAt: favorite.createdAt,
        lastAccessedAt: favorite.lastAccessedAt || undefined,
      };
    } catch (error) {
      this.logger.error(`Update favorite error:`, error);
      throw error;
    }
  }

  /**
   * Check if document is favorited by user
   *
   * @param userId - User to check
   * @param documentId - Document to check
   * @returns True if favorited
   */
  async isFavorited(userId: string, documentId: string): Promise<boolean> {
    try {
      const count = await this.favoriteRepo.count({
        where: { userId, documentId },
      });
      return count > 0;
    } catch (error) {
      this.logger.error(`Is favorited check error:`, error);
      return false;
    }
  }

  /**
   * Get activity statistics for a document
   *
   * @param documentId - Document to analyze
   * @param daysBack - Number of days to analyze
   * @returns Activity statistics
   */
  async getDocumentActivityStats(
    documentId: string,
    daysBack: number = 30,
  ): Promise<{
    viewCount: number;
    downloadCount: number;
    searchClickCount: number;
    uniqueUsers: number;
    favoriteCount: number;
  }> {
    try {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - daysBack);

      // Count by activity type
      const activities = await this.activityRepo
        .createQueryBuilder('activity')
        .select('activity.activityType', 'type')
        .addSelect('COUNT(DISTINCT activity.userId)', 'uniqueUsers')
        .addSelect('COUNT(*)', 'count')
        .where('activity.documentId = :documentId', { documentId })
        .andWhere('activity.activityDate >= :dateThreshold', { dateThreshold })
        .groupBy('activity.activityType')
        .getRawMany();

      let viewCount = 0;
      let downloadCount = 0;
      let searchClickCount = 0;
      const uniqueUsersSet = new Set<string>();

      for (const activity of activities) {
        if (activity.type === DocumentActivityType.VIEW) {
          viewCount = parseInt(activity.count);
        } else if (activity.type === DocumentActivityType.DOWNLOAD) {
          downloadCount = parseInt(activity.count);
        } else if (activity.type === DocumentActivityType.SEARCH_CLICK) {
          searchClickCount = parseInt(activity.count);
        }
      }

      // Get unique users
      const uniqueUserActivities = await this.activityRepo
        .createQueryBuilder('activity')
        .select('DISTINCT activity.userId', 'userId')
        .where('activity.documentId = :documentId', { documentId })
        .andWhere('activity.activityDate >= :dateThreshold', { dateThreshold })
        .getRawMany();

      const uniqueUsers = uniqueUserActivities.length;

      // Get favorite count
      const favoriteCount = await this.favoriteRepo.count({
        where: { documentId },
      });

      return {
        viewCount,
        downloadCount,
        searchClickCount,
        uniqueUsers,
        favoriteCount,
      };
    } catch (error) {
      this.logger.error(`Get document activity stats error:`, error);
      return {
        viewCount: 0,
        downloadCount: 0,
        searchClickCount: 0,
        uniqueUsers: 0,
        favoriteCount: 0,
      };
    }
  }
}
