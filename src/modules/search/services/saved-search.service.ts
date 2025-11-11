import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedSearch } from '../entities/saved-search.entity';
import { CreateSavedSearchDto } from '../dto/create-saved-search.dto';
import { UpdateSavedSearchDto } from '../dto/update-saved-search.dto';
import { SearchResultsDto } from '../dto/search-results.dto';
import { ProjectSearchService } from './project-search.service';
import { NotificationFrequency } from '../enums/notification-frequency.enum';
import { SortField } from '../enums/sort-field.enum';

/**
 * Saved Search Service
 *
 * Manages saved searches with CRUD operations and execution
 */
@Injectable()
export class SavedSearchService {
  constructor(
    @InjectRepository(SavedSearch)
    private readonly savedSearchRepository: Repository<SavedSearch>,
    private readonly projectSearchService: ProjectSearchService,
  ) {}

  /**
   * Create a new saved search
   */
  async create(
    dto: CreateSavedSearchDto,
    userId: string,
    organizationId: string,
  ): Promise<SavedSearch> {
    const savedSearch = this.savedSearchRepository.create({
      ...dto,
      userId,
      organizationId,
    });

    return this.savedSearchRepository.save(savedSearch);
  }

  /**
   * Find all saved searches for a user
   */
  async findAll(userId: string, organizationId: string): Promise<SavedSearch[]> {
    return this.savedSearchRepository.find({
      where: [
        { userId, organizationId },
        { organizationId, isPublic: true },
      ],
      order: {
        lastExecuted: 'DESC',
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Find a single saved search
   */
  async findOne(id: string, userId: string): Promise<SavedSearch> {
    const savedSearch = await this.savedSearchRepository.findOne({
      where: { id },
    });

    if (!savedSearch) {
      throw new NotFoundException(`Saved search ${id} not found`);
    }

    // Check access permissions
    if (
      savedSearch.userId !== userId &&
      !savedSearch.isPublic &&
      !savedSearch.sharedWithUsers?.includes(userId)
    ) {
      throw new ForbiddenException('Access denied to this saved search');
    }

    return savedSearch;
  }

  /**
   * Update a saved search
   */
  async update(
    id: string,
    dto: UpdateSavedSearchDto,
    userId: string,
  ): Promise<SavedSearch> {
    const savedSearch = await this.findOne(id, userId);

    // Only owner can update
    if (savedSearch.userId !== userId) {
      throw new ForbiddenException('Only the owner can update this saved search');
    }

    Object.assign(savedSearch, dto);
    return this.savedSearchRepository.save(savedSearch);
  }

  /**
   * Remove a saved search
   */
  async remove(id: string, userId: string): Promise<void> {
    const savedSearch = await this.findOne(id, userId);

    // Only owner can delete
    if (savedSearch.userId !== userId) {
      throw new ForbiddenException('Only the owner can delete this saved search');
    }

    await this.savedSearchRepository.remove(savedSearch);
  }

  /**
   * Execute a saved search
   */
  async execute(id: string, userId: string): Promise<SearchResultsDto> {
    const savedSearch = await this.findOne(id, userId);

    // Execute the search
    const results = await this.projectSearchService.search(
      {
        ...savedSearch.criteria,
        sortBy: savedSearch.sortBy as SortField,
        sortOrder: savedSearch.sortOrder as 'asc' | 'desc',
      },
      userId,
    );

    // Update execution statistics
    const executionCount = savedSearch.executionCount + 1;
    const currentAverage = savedSearch.averageResultCount || 0;
    const newAverage = Math.round(
      (currentAverage * savedSearch.executionCount + results.pagination.totalItems) /
        executionCount,
    );

    await this.savedSearchRepository.update(id, {
      executionCount,
      lastExecuted: new Date(),
      averageResultCount: newAverage,
    });

    return results;
  }

  /**
   * Share a saved search with users or roles
   */
  async share(
    id: string,
    userIds: string[] | undefined,
    roleIds: string[] | undefined,
    userId: string,
  ): Promise<SavedSearch> {
    const savedSearch = await this.findOne(id, userId);

    // Only owner can share
    if (savedSearch.userId !== userId) {
      throw new ForbiddenException('Only the owner can share this saved search');
    }

    if (userIds) {
      savedSearch.sharedWithUsers = [
        ...new Set([...(savedSearch.sharedWithUsers || []), ...userIds]),
      ];
    }

    if (roleIds) {
      savedSearch.sharedWithRoles = [
        ...new Set([...(savedSearch.sharedWithRoles || []), ...roleIds]),
      ];
    }

    return this.savedSearchRepository.save(savedSearch);
  }

  /**
   * Update notification settings for a saved search
   */
  async updateNotifications(
    id: string,
    enabled: boolean,
    frequency: NotificationFrequency | undefined,
    userId: string,
  ): Promise<SavedSearch> {
    const savedSearch = await this.findOne(id, userId);

    // Only owner can update notifications
    if (savedSearch.userId !== userId) {
      throw new ForbiddenException(
        'Only the owner can update notification settings',
      );
    }

    savedSearch.enableNotifications = enabled;
    if (frequency) {
      savedSearch.notificationFrequency = frequency;
    }

    return this.savedSearchRepository.save(savedSearch);
  }

  /**
   * Get saved searches that need notifications
   */
  async getSearchesForNotifications(): Promise<SavedSearch[]> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return this.savedSearchRepository
      .createQueryBuilder('search')
      .where('search.enableNotifications = true')
      .andWhere(
        `(
          (search.notificationFrequency = :realtime AND (search.lastNotificationSent IS NULL OR search.lastNotificationSent < :now)) OR
          (search.notificationFrequency = :daily AND (search.lastNotificationSent IS NULL OR search.lastNotificationSent < :oneDayAgo)) OR
          (search.notificationFrequency = :weekly AND (search.lastNotificationSent IS NULL OR search.lastNotificationSent < :oneWeekAgo))
        )`,
        {
          realtime: NotificationFrequency.REALTIME,
          daily: NotificationFrequency.DAILY,
          weekly: NotificationFrequency.WEEKLY,
          now,
          oneDayAgo,
          oneWeekAgo,
        },
      )
      .getMany();
  }

  /**
   * Mark notification as sent
   */
  async markNotificationSent(id: string): Promise<void> {
    await this.savedSearchRepository.update(id, {
      lastNotificationSent: new Date(),
    });
  }
}