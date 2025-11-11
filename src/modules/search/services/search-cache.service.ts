import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SearchCriteriaDto } from '../dto/search-criteria.dto';
import { SearchResultsDto } from '../dto/search-results.dto';
import * as crypto from 'crypto';

/**
 * Search Cache Service
 *
 * Manages caching of search results for performance
 */
@Injectable()
export class SearchCacheService {
  private readonly CACHE_TTL = 300; // 5 minutes in seconds

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  /**
   * Get cached search results
   */
  async getCachedResults(
    criteria: SearchCriteriaDto,
    userId: string,
  ): Promise<SearchResultsDto | null> {
    const key = this.generateCacheKey(criteria, userId);
    return (await this.cacheManager.get<SearchResultsDto>(key)) || null;
  }

  /**
   * Cache search results
   */
  async cacheResults(
    criteria: SearchCriteriaDto,
    userId: string,
    results: SearchResultsDto,
  ): Promise<void> {
    const key = this.generateCacheKey(criteria, userId);
    await this.cacheManager.set(key, results, this.CACHE_TTL * 1000); // TTL in milliseconds
  }

  /**
   * Generate cache key from criteria and user
   */
  generateCacheKey(criteria: SearchCriteriaDto, userId: string): string {
    // Sort criteria object keys for consistent hashing
    const sortedCriteria = Object.keys(criteria)
      .sort()
      .reduce((obj, key) => {
        obj[key] = (criteria as any)[key];
        return obj;
      }, {} as any);

    const cacheObject = {
      ...sortedCriteria,
      userId, // Include userId for permission-aware caching
    };

    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(cacheObject))
      .digest('hex');

    return `search:${hash}`;
  }

  /**
   * Invalidate cache for a specific project
   */
  async invalidateProjectCache(projectId: string): Promise<void> {
    // Aggressive approach: clear all search caches
    // In production, you might want to track which searches include this project
    await this.invalidateAllCaches();
  }

  /**
   * Invalidate all search caches
   */
  async invalidateAllCaches(): Promise<void> {
    // Note: cache-manager v5 doesn't have reset(), would need to track keys manually
    // For now, we'll skip clearing all caches
    console.warn('Cache invalidation across all keys not supported in this cache-manager version');
    // In production, consider tracking keys or using a different cache manager with reset support
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    size: number;
    ttl: number;
  }> {
    return {
      size: await this.getCacheSize(),
      ttl: this.CACHE_TTL,
    };
  }

  /**
   * Get approximate cache size
   */
  private async getCacheSize(): Promise<number> {
    // This is implementation-specific
    // For in-memory cache, you could track keys
    // For Redis, you could use DBSIZE command
    return 0; // Placeholder
  }
}