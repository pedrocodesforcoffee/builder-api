/**
 * Guard Cache Service
 *
 * Provides high-performance caching for permission guard checks
 * Target: <10ms response time for cached checks
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

/**
 * Cached permission entry
 */
interface CachedPermission {
  allowed: boolean;
  cachedAt: Date;
  expiresAt: Date;
}

/**
 * Cache statistics
 */
interface CacheStatistics {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  avgResponseTime: number;
}

/**
 * Guard Cache Service
 *
 * Provides in-memory caching for permission checks with:
 * - 5-minute TTL
 * - Automatic cleanup
 * - Cache invalidation on role changes
 * - Performance monitoring
 */
@Injectable()
export class GuardCacheService implements OnModuleInit {
  private readonly logger = new Logger(GuardCacheService.name);

  // In-memory cache (in production, use Redis for distributed caching)
  private cache: Map<string, CachedPermission> = new Map();

  // Cache configuration
  private readonly TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute

  // Statistics
  private hits = 0;
  private misses = 0;
  private responseTimes: number[] = [];
  private cleanupTimer: NodeJS.Timeout | null = null;

  /**
   * Initialize service and start cleanup timer
   */
  onModuleInit() {
    this.startCleanupTimer();
    this.logger.log('Guard cache service initialized');
  }

  /**
   * Get cached permission result
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @param action - Action
   * @param resourceId - Optional resource ID
   * @returns Cached permission result or null if not cached/expired
   */
  get(
    userId: string,
    projectId: string,
    action: string,
    resourceId?: string,
  ): boolean | null {
    const startTime = Date.now();

    const key = this.getCacheKey(userId, projectId, action, resourceId);
    const cached = this.cache.get(key);

    if (!cached) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (cached.expiresAt < new Date()) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Cache hit
    this.hits++;
    const responseTime = Date.now() - startTime;
    this.responseTimes.push(responseTime);

    // Keep only last 1000 response times for statistics
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }

    this.logger.debug(
      `Cache hit for ${key} (${responseTime}ms)`,
    );

    return cached.allowed;
  }

  /**
   * Set cached permission result
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @param action - Action
   * @param allowed - Permission result
   * @param resourceId - Optional resource ID
   */
  set(
    userId: string,
    projectId: string,
    action: string,
    allowed: boolean,
    resourceId?: string,
  ): void {
    const key = this.getCacheKey(userId, projectId, action, resourceId);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.TTL_MS);

    this.cache.set(key, {
      allowed,
      cachedAt: now,
      expiresAt,
    });

    this.logger.debug(
      `Cached permission for ${key}: ${allowed} (expires in ${this.TTL_MS / 1000}s)`,
    );
  }

  /**
   * Clear cache for user (call when roles/permissions change)
   *
   * @param userId - User ID
   * @param projectId - Optional project ID (clears all projects if not provided)
   */
  clear(userId: string, projectId?: string): void {
    let cleared = 0;

    for (const key of this.cache.keys()) {
      if (projectId) {
        // Clear specific user-project combination
        if (key.startsWith(`${userId}:${projectId}:`)) {
          this.cache.delete(key);
          cleared++;
        }
      } else {
        // Clear all entries for user across all projects
        if (key.startsWith(`${userId}:`)) {
          this.cache.delete(key);
          cleared++;
        }
      }
    }

    this.logger.log(
      `Cleared ${cleared} cache entries for user ${userId}${projectId ? ` on project ${projectId}` : ''}`,
    );
  }

  /**
   * Clear entire cache
   */
  clearAll(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.log(`Cleared entire cache (${size} entries)`);
  }

  /**
   * Get cache statistics
   *
   * @returns Cache statistics
   */
  getStatistics(): CacheStatistics {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;

    const avgResponseTime =
      this.responseTimes.length > 0
        ? this.responseTimes.reduce((a, b) => a + b, 0) /
          this.responseTimes.length
        : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
    };
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.hits = 0;
    this.misses = 0;
    this.responseTimes = [];
    this.logger.log('Cache statistics reset');
  }

  /**
   * Generate cache key
   *
   * @param userId - User ID
   * @param projectId - Project ID
   * @param action - Action
   * @param resourceId - Optional resource ID
   * @returns Cache key
   */
  private getCacheKey(
    userId: string,
    projectId: string,
    action: string,
    resourceId?: string,
  ): string {
    if (resourceId) {
      return `${userId}:${projectId}:${action}:${resourceId}`;
    }
    return `${userId}:${projectId}:${action}`;
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.CLEANUP_INTERVAL_MS);

    this.logger.debug(
      `Started cache cleanup timer (interval: ${this.CLEANUP_INTERVAL_MS / 1000}s)`,
    );
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredEntries(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired cache entries`);
    }
  }

  /**
   * Stop cleanup timer (for testing)
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      this.logger.debug('Stopped cache cleanup timer');
    }
  }
}
