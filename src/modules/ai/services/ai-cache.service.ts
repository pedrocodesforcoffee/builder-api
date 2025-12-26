/**
 * AI Cache Service
 * Caches AI responses to reduce costs and improve performance
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { AiCache } from '../entities/ai-cache.entity';
import { AiOperationType, AI_CONFIG } from '../constants/ai-config.constants';
import * as crypto from 'crypto';

@Injectable()
export class AiCacheService {
  private readonly logger = new Logger(AiCacheService.name);

  constructor(
    @InjectRepository(AiCache)
    private aiCacheRepo: Repository<AiCache>,
  ) {}

  /**
   * Generate cache key from request parameters
   */
  generateCacheKey(
    operationType: AiOperationType,
    requestData: Record<string, any>,
  ): string {
    // Create a stable, deterministic key
    const dataString = JSON.stringify({
      operationType,
      ...this.normalizeRequestData(requestData),
    });

    // Use SHA-256 to create a fixed-length key
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Normalize request data for consistent caching
   */
  private normalizeRequestData(data: Record<string, any>): Record<string, any> {
    const normalized: Record<string, any> = {};

    // Sort keys alphabetically for consistency
    const sortedKeys = Object.keys(data).sort();

    for (const key of sortedKeys) {
      const value = data[key];

      // Skip user-specific or time-sensitive fields
      if (
        key === 'userId' ||
        key === 'timestamp' ||
        key === 'useCache' ||
        key === 'model' ||
        key === 'temperature' ||
        key === 'maxTokens'
      ) {
        continue;
      }

      // Normalize strings (trim whitespace, lowercase for case-insensitive)
      if (typeof value === 'string') {
        normalized[key] = value.trim();
      } else if (Array.isArray(value)) {
        normalized[key] = value.map((item) =>
          typeof item === 'string' ? item.trim() : item,
        );
      } else {
        normalized[key] = value;
      }
    }

    return normalized;
  }

  /**
   * Get cached response
   */
  async get(
    operationType: AiOperationType,
    requestData: Record<string, any>,
  ): Promise<any | null> {
    if (!AI_CONFIG.CACHE.CACHE_ENABLED) {
      return null;
    }

    const cacheKey = this.generateCacheKey(operationType, requestData);

    const cached = await this.aiCacheRepo.findOne({
      where: { cacheKey },
    });

    if (!cached) {
      this.logger.debug(`Cache MISS: ${operationType} | Key: ${cacheKey}`);
      return null;
    }

    // Check if cache is expired
    if (cached.expiresAt && cached.expiresAt < new Date()) {
      this.logger.debug(`Cache EXPIRED: ${operationType} | Key: ${cacheKey}`);
      await this.aiCacheRepo.delete({ id: cached.id });
      return null;
    }

    // Increment hit count
    await this.aiCacheRepo.update(
      { id: cached.id },
      {
        hitCount: () => 'hitCount + 1',
        updatedAt: new Date(),
      },
    );

    this.logger.debug(
      `Cache HIT: ${operationType} | Key: ${cacheKey} | Hits: ${cached.hitCount + 1}`,
    );

    return cached.response;
  }

  /**
   * Set cached response
   */
  async set(
    operationType: AiOperationType,
    requestData: Record<string, any>,
    response: any,
    ttlSeconds?: number,
  ): Promise<void> {
    if (!AI_CONFIG.CACHE.CACHE_ENABLED) {
      return;
    }

    const cacheKey = this.generateCacheKey(operationType, requestData);
    const ttl = ttlSeconds ?? AI_CONFIG.CACHE.TTL_SECONDS;

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + ttl);

    try {
      // Upsert: Update if exists, insert if not
      const existing = await this.aiCacheRepo.findOne({ where: { cacheKey } });

      if (existing) {
        await this.aiCacheRepo.update(
          { cacheKey },
          {
            response,
            expiresAt,
            updatedAt: new Date(),
          },
        );
      } else {
        await this.aiCacheRepo.save({
          cacheKey,
          operationType,
          response,
          expiresAt,
          hitCount: 0,
        });
      }

      this.logger.debug(
        `Cache SET: ${operationType} | Key: ${cacheKey} | TTL: ${ttl}s`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to cache response: ${error.message}`,
        error.stack,
      );
      // Don't throw - caching failure shouldn't break the operation
    }
  }

  /**
   * Invalidate cache for specific operation type
   */
  async invalidate(
    operationType?: AiOperationType,
    requestData?: Record<string, any>,
  ): Promise<number> {
    if (requestData && operationType) {
      // Invalidate specific cache entry
      const cacheKey = this.generateCacheKey(operationType, requestData);
      const result = await this.aiCacheRepo.delete({ cacheKey });
      const deletedCount = result.affected || 0;

      this.logger.log(
        `Cache invalidated: ${operationType} | Key: ${cacheKey}`,
      );

      return deletedCount;
    } else if (operationType) {
      // Invalidate all cache entries for operation type
      const result = await this.aiCacheRepo.delete({ operationType });
      const deletedCount = result.affected || 0;

      this.logger.log(
        `Cache invalidated for operation type: ${operationType} | Deleted: ${deletedCount}`,
      );

      return deletedCount;
    } else {
      // Invalidate all cache
      const result = await this.aiCacheRepo.clear();
      this.logger.log('All AI cache cleared');
      return 0;
    }
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupExpired(): Promise<number> {
    const result = await this.aiCacheRepo
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now: new Date() })
      .execute();

    const deletedCount = result.affected || 0;

    if (deletedCount > 0) {
      this.logger.log(`Cleaned up ${deletedCount} expired cache entries`);
    }

    return deletedCount;
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalEntries: number;
    totalHits: number;
    averageHitsPerEntry: number;
    byOperationType: Array<{
      operationType: AiOperationType;
      count: number;
      totalHits: number;
    }>;
  }> {
    const [totalEntries, stats] = await Promise.all([
      this.aiCacheRepo.count(),
      this.aiCacheRepo
        .createQueryBuilder('cache')
        .select('cache.operationType', 'operationType')
        .addSelect('COUNT(*)', 'count')
        .addSelect('SUM(cache.hitCount)', 'totalHits')
        .groupBy('cache.operationType')
        .getRawMany(),
    ]);

    const totalHits = stats.reduce(
      (sum, s) => sum + parseInt(s.totalHits || '0', 10),
      0,
    );

    return {
      totalEntries,
      totalHits,
      averageHitsPerEntry: totalEntries > 0 ? totalHits / totalEntries : 0,
      byOperationType: stats.map((s) => ({
        operationType: s.operationType as AiOperationType,
        count: parseInt(s.count, 10),
        totalHits: parseInt(s.totalHits || '0', 10),
      })),
    };
  }

  /**
   * Warm cache with common queries
   * This can be called during off-peak hours to pre-populate cache
   */
  async warmCache(
    operations: Array<{
      operationType: AiOperationType;
      requestData: Record<string, any>;
      response: any;
    }>,
  ): Promise<number> {
    let cachedCount = 0;

    for (const op of operations) {
      try {
        await this.set(op.operationType, op.requestData, op.response);
        cachedCount++;
      } catch (error: any) {
        this.logger.error(
          `Failed to warm cache for ${op.operationType}: ${error.message}`,
        );
      }
    }

    this.logger.log(`Cache warmed with ${cachedCount} entries`);

    return cachedCount;
  }

  /**
   * Get least recently used entries (for potential eviction)
   */
  async getLeastRecentlyUsed(limit: number = 100): Promise<AiCache[]> {
    return this.aiCacheRepo.find({
      order: {
        updatedAt: 'ASC',
      },
      take: limit,
    });
  }

  /**
   * Evict least recently used entries to free space
   */
  async evictLRU(count: number): Promise<number> {
    const lruEntries = await this.getLeastRecentlyUsed(count);

    if (lruEntries.length === 0) {
      return 0;
    }

    const ids = lruEntries.map((entry) => entry.id);
    const result = await this.aiCacheRepo.delete(ids);

    const deletedCount = result.affected || 0;

    this.logger.log(`Evicted ${deletedCount} LRU cache entries`);

    return deletedCount;
  }
}
