import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull } from 'typeorm';
import { SavedSearch, AlertFrequency } from '../entities/saved-search.entity';
import {
  CreateSavedSearchDto,
  UpdateSavedSearchDto,
  SavedSearchResponseDto,
  SearchResponseDto,
} from '../dto/search.dto';
import { SearchService } from './search.service';

/**
 * Saved Search Service
 *
 * Manages user-defined saved searches with alert notifications.
 *
 * Features:
 * - Save complex search queries for reuse
 * - Alert notifications (instant, daily, weekly)
 * - Track new results since last alert
 * - Execute saved searches
 * - Manage search organization (pins, tags)
 *
 * Alert Processing:
 * - Instant: Triggered immediately when matching documents indexed
 * - Daily: Batch processed daily at configured time
 * - Weekly: Batch processed weekly on configured day
 */
@Injectable()
export class SavedSearchService {
  private readonly logger = new Logger(SavedSearchService.name);

  constructor(
    @InjectRepository(SavedSearch)
    private readonly savedSearchRepo: Repository<SavedSearch>,
    private readonly searchService: SearchService,
  ) {}

  /**
   * Create a new saved search
   *
   * @param projectId - Project context
   * @param userId - User creating search
   * @param dto - Saved search data
   * @returns Created saved search
   */
  async createSavedSearch(
    projectId: string,
    userId: string,
    dto: CreateSavedSearchDto,
  ): Promise<SavedSearchResponseDto> {
    try {
      const savedSearch = this.savedSearchRepo.create({
        userId,
        projectId,
        name: dto.name,
        description: dto.description || null,
        searchParams: dto.searchParams as any,
        alertsEnabled: dto.alertsEnabled || false,
        alertFrequency: dto.alertFrequency || AlertFrequency.NONE,
        isPinned: dto.isPinned || false,
        tags: dto.tags || null,
        lastResultCount: 0,
        newResultsSinceLastAlert: 0,
        executionCount: 0,
      });

      const saved = await this.savedSearchRepo.save(savedSearch);

      return this.toResponseDto(saved);
    } catch (error) {
      this.logger.error(`Create saved search error:`, error);
      throw error;
    }
  }

  /**
   * Get saved search by ID
   *
   * @param savedSearchId - Saved search ID
   * @param userId - User requesting
   * @returns Saved search
   */
  async getSavedSearch(
    savedSearchId: string,
    userId: string,
  ): Promise<SavedSearchResponseDto> {
    const savedSearch = await this.savedSearchRepo.findOne({
      where: { id: savedSearchId, userId },
    });

    if (!savedSearch) {
      throw new NotFoundException('Saved search not found');
    }

    return this.toResponseDto(savedSearch);
  }

  /**
   * List user's saved searches
   *
   * @param projectId - Project context
   * @param userId - User requesting
   * @returns List of saved searches
   */
  async listSavedSearches(
    projectId: string,
    userId: string,
  ): Promise<SavedSearchResponseDto[]> {
    const savedSearches = await this.savedSearchRepo.find({
      where: { projectId, userId },
      order: {
        isPinned: 'DESC',
        updatedAt: 'DESC',
      },
    });

    return savedSearches.map(s => this.toResponseDto(s));
  }

  /**
   * Update saved search
   *
   * @param savedSearchId - Saved search ID
   * @param userId - User updating
   * @param dto - Updates
   * @returns Updated saved search
   */
  async updateSavedSearch(
    savedSearchId: string,
    userId: string,
    dto: UpdateSavedSearchDto,
  ): Promise<SavedSearchResponseDto> {
    const savedSearch = await this.savedSearchRepo.findOne({
      where: { id: savedSearchId, userId },
    });

    if (!savedSearch) {
      throw new NotFoundException('Saved search not found');
    }

    // Update fields
    if (dto.name !== undefined) savedSearch.name = dto.name;
    if (dto.description !== undefined) savedSearch.description = dto.description || null;
    if (dto.searchParams !== undefined) savedSearch.searchParams = dto.searchParams as any;
    if (dto.alertsEnabled !== undefined) savedSearch.alertsEnabled = dto.alertsEnabled;
    if (dto.alertFrequency !== undefined) savedSearch.alertFrequency = dto.alertFrequency;
    if (dto.isPinned !== undefined) savedSearch.isPinned = dto.isPinned;
    if (dto.tags !== undefined) savedSearch.tags = dto.tags || null;

    const updated = await this.savedSearchRepo.save(savedSearch);

    return this.toResponseDto(updated);
  }

  /**
   * Delete saved search
   *
   * @param savedSearchId - Saved search ID
   * @param userId - User deleting
   */
  async deleteSavedSearch(
    savedSearchId: string,
    userId: string,
  ): Promise<void> {
    const savedSearch = await this.savedSearchRepo.findOne({
      where: { id: savedSearchId, userId },
    });

    if (!savedSearch) {
      throw new NotFoundException('Saved search not found');
    }

    await this.savedSearchRepo.remove(savedSearch);
  }

  /**
   * Execute a saved search
   *
   * @param savedSearchId - Saved search ID
   * @param userId - User executing
   * @param overrides - Optional parameter overrides
   * @returns Search results
   */
  async executeSavedSearch(
    savedSearchId: string,
    userId: string,
    overrides?: Partial<any>,
  ): Promise<SearchResponseDto> {
    const savedSearch = await this.savedSearchRepo.findOne({
      where: { id: savedSearchId, userId },
    });

    if (!savedSearch) {
      throw new NotFoundException('Saved search not found');
    }

    // Merge search params with overrides
    const searchParams = {
      ...savedSearch.searchParams,
      ...overrides,
    };

    // Execute search
    const results = await this.searchService.search(
      savedSearch.projectId,
      userId,
      searchParams,
    );

    // Update execution tracking
    savedSearch.executionCount += 1;
    savedSearch.lastExecutedAt = new Date();
    savedSearch.lastResultCount = results.total;

    // Calculate new results if alerts enabled
    if (savedSearch.alertsEnabled) {
      const newResults = Math.max(0, results.total - savedSearch.lastResultCount);
      savedSearch.newResultsSinceLastAlert += newResults;
    }

    if (results.total > 0) {
      savedSearch.lastResultAt = new Date();
    }

    await this.savedSearchRepo.save(savedSearch);

    return results;
  }

  /**
   * Get saved searches needing alerts
   *
   * Used by AlertProcessingJob to find searches that need notification
   *
   * @param frequency - Alert frequency to check
   * @returns Saved searches needing alerts
   */
  async getSavedSearchesNeedingAlerts(
    frequency: AlertFrequency,
  ): Promise<SavedSearch[]> {
    const query = this.savedSearchRepo
      .createQueryBuilder('savedSearch')
      .where('savedSearch.alertsEnabled = :enabled', { enabled: true })
      .andWhere('savedSearch.alertFrequency = :frequency', { frequency })
      .andWhere('savedSearch.newResultsSinceLastAlert > 0');

    // Filter by last alert time based on frequency
    if (frequency === AlertFrequency.DAILY) {
      // Last alert was more than 1 day ago
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      query.andWhere(
        '(savedSearch.lastAlertAt IS NULL OR savedSearch.lastAlertAt < :oneDayAgo)',
        { oneDayAgo },
      );
    } else if (frequency === AlertFrequency.WEEKLY) {
      // Last alert was more than 7 days ago
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      query.andWhere(
        '(savedSearch.lastAlertAt IS NULL OR savedSearch.lastAlertAt < :oneWeekAgo)',
        { oneWeekAgo },
      );
    }

    return query.getMany();
  }

  /**
   * Mark alert as sent
   *
   * @param savedSearchId - Saved search ID
   * @param newResultCount - Number of new results alerted
   */
  async markAlertSent(
    savedSearchId: string,
    newResultCount: number,
  ): Promise<void> {
    try {
      await this.savedSearchRepo.update(savedSearchId, {
        lastAlertAt: new Date(),
        newResultsSinceLastAlert: 0, // Reset counter after alert
      });
    } catch (error) {
      this.logger.error(`Mark alert sent error:`, error);
    }
  }

  /**
   * Check for instant alerts when document is indexed
   *
   * Called by IndexSyncJob when documents are added/updated
   *
   * @param projectId - Project context
   * @param documentId - Newly indexed document
   * @returns Saved searches that match (needing instant alert)
   */
  async checkInstantAlerts(
    projectId: string,
    documentId: string,
  ): Promise<SavedSearch[]> {
    try {
      // Get all instant alert searches for this project
      const savedSearches = await this.savedSearchRepo.find({
        where: {
          projectId,
          alertsEnabled: true,
          alertFrequency: AlertFrequency.INSTANT,
        },
      });

      const matchingSearches: SavedSearch[] = [];

      // Check each search to see if document matches
      for (const savedSearch of savedSearches) {
        // Execute search with document ID filter
        // In real implementation, would check if document matches criteria
        // For now, increment new results counter
        savedSearch.newResultsSinceLastAlert += 1;
        await this.savedSearchRepo.save(savedSearch);
        matchingSearches.push(savedSearch);
      }

      return matchingSearches;
    } catch (error) {
      this.logger.error(`Check instant alerts error:`, error);
      return [];
    }
  }

  /**
   * Convert entity to response DTO
   *
   * @param savedSearch - Saved search entity
   * @returns Response DTO
   */
  private toResponseDto(savedSearch: SavedSearch): SavedSearchResponseDto {
    return {
      id: savedSearch.id,
      projectId: savedSearch.projectId,
      name: savedSearch.name,
      description: savedSearch.description || undefined,
      searchParams: savedSearch.searchParams,
      alertsEnabled: savedSearch.alertsEnabled,
      alertFrequency: savedSearch.alertFrequency,
      lastExecutedAt: savedSearch.lastExecutedAt || undefined,
      lastResultCount: savedSearch.lastResultCount,
      newResultsSinceLastAlert: savedSearch.newResultsSinceLastAlert,
      executionCount: savedSearch.executionCount,
      isPinned: savedSearch.isPinned,
      tags: savedSearch.tags || undefined,
      createdAt: savedSearch.createdAt,
      updatedAt: savedSearch.updatedAt,
    };
  }
}
