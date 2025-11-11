import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ProjectMetrics } from '../entities/project-metrics.entity';
import { MetricGroup } from '../enums/metric-group.enum';
import { MetricResult } from '../interfaces/metric-result.interface';

/**
 * MetricCacheService
 *
 * Multi-level caching service for project metrics.
 * Uses in-memory cache (Redis) for fast access and database for persistence.
 */
@Injectable()
export class MetricCacheService {
  private readonly logger = new Logger(MetricCacheService.name);

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    @InjectRepository(ProjectMetrics)
    private readonly metricsRepository: Repository<ProjectMetrics>,
  ) {}

  /**
   * Get cached metrics
   */
  async get(projectId: string, group: MetricGroup): Promise<MetricResult | null> {
    const cacheKey = this.generateCacheKey(projectId, group);

    try {
      // Check memory cache first
      const cached = await this.cacheManager.get<MetricResult>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit (memory): ${cacheKey}`);
        return { ...cached, fromCache: true };
      }

      // Check database cache
      const dbCache = await this.metricsRepository.findOne({
        where: {
          projectId,
          metricGroup: group,
        },
      });

      if (dbCache && !dbCache.isExpired()) {
        this.logger.debug(`Cache hit (database): ${cacheKey}`);

        const result: MetricResult = {
          group: dbCache.metricGroup,
          calculatedAt: dbCache.calculatedAt,
          calculationDuration: dbCache.calculationDuration || 0,
          metrics: dbCache.metricData,
          dataSourceVersion: dbCache.dataSourceVersion,
          fromCache: true,
          expiresAt: dbCache.expiresAt,
        };

        // Populate memory cache
        const ttl = Math.max(0, Math.floor((dbCache.expiresAt.getTime() - Date.now()) / 1000));
        if (ttl > 0) {
          await this.cacheManager.set(cacheKey, result, ttl);
        }

        return result;
      }

      this.logger.debug(`Cache miss: ${cacheKey}`);
      return null;
    } catch (error) {
      this.logger.error(`Failed to get cache for ${cacheKey}:`, error);
      return null;
    }
  }

  /**
   * Set cached metrics
   */
  async set(
    projectId: string,
    group: MetricGroup,
    metrics: MetricResult,
    ttl: number,
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(projectId, group);

    try {
      const expiresAt = new Date(Date.now() + ttl * 1000);

      // Store in database
      const existing = await this.metricsRepository.findOne({
        where: {
          projectId,
          metricGroup: group,
        },
      });

      if (existing) {
        // Update existing
        existing.metricData = metrics.metrics;
        existing.calculatedAt = metrics.calculatedAt;
        existing.expiresAt = expiresAt;
        existing.calculationDuration = metrics.calculationDuration;
        existing.dataSourceVersion = metrics.dataSourceVersion;
        existing.version = (existing.version || 0) + 1;
        existing.errorInfo = metrics.errors ? {
          message: 'Partial calculation errors',
          timestamp: new Date(),
        } : undefined;

        await this.metricsRepository.save(existing);
      } else {
        // Create new
        const newCache = this.metricsRepository.create({
          projectId,
          metricGroup: group,
          metricData: metrics.metrics,
          calculatedAt: metrics.calculatedAt,
          expiresAt,
          calculationDuration: metrics.calculationDuration,
          dataSourceVersion: metrics.dataSourceVersion,
          version: 1,
        });

        await this.metricsRepository.save(newCache);
      }

      // Store in memory cache
      await this.cacheManager.set(cacheKey, metrics, ttl);

      this.logger.debug(`Cache set: ${cacheKey}, TTL: ${ttl}s`);
    } catch (error) {
      this.logger.error(`Failed to set cache for ${cacheKey}:`, error);
    }
  }

  /**
   * Invalidate cached metrics
   */
  async invalidate(projectId: string, groups?: MetricGroup[]): Promise<void> {
    try {
      if (!groups || groups.length === 0) {
        // Invalidate all groups for project
        groups = Object.values(MetricGroup);
      }

      // Clear memory cache
      const cacheKeys = groups.map((group) => this.generateCacheKey(projectId, group));
      await Promise.all(cacheKeys.map((key) => this.cacheManager.del(key)));

      // Mark database entries as expired
      await this.metricsRepository
        .createQueryBuilder()
        .update(ProjectMetrics)
        .set({ expiresAt: new Date() })
        .where('projectId = :projectId', { projectId })
        .andWhere(groups.length > 0 ? 'metricGroup IN (:...groups)' : '1=1', { groups })
        .execute();

      this.logger.debug(`Cache invalidated for project ${projectId}, groups: ${groups.join(', ')}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache for project ${projectId}:`, error);
    }
  }

  /**
   * Pre-warm cache for multiple projects
   */
  async warmCache(projectIds: string[]): Promise<void> {
    this.logger.log(`Warming cache for ${projectIds.length} projects`);

    for (const projectId of projectIds) {
      try {
        // Get all non-expired cache entries for project
        const cacheEntries = await this.metricsRepository.find({
          where: {
            projectId,
          },
        });

        for (const entry of cacheEntries) {
          if (!entry.isExpired()) {
            const cacheKey = this.generateCacheKey(projectId, entry.metricGroup);
            const ttl = Math.max(0, Math.floor((entry.expiresAt.getTime() - Date.now()) / 1000));

            if (ttl > 0) {
              const result: MetricResult = {
                group: entry.metricGroup,
                calculatedAt: entry.calculatedAt,
                calculationDuration: entry.calculationDuration || 0,
                metrics: entry.metricData,
                dataSourceVersion: entry.dataSourceVersion,
                fromCache: true,
                expiresAt: entry.expiresAt,
              };

              await this.cacheManager.set(cacheKey, result, ttl);
            }
          }
        }
      } catch (error) {
        this.logger.error(`Failed to warm cache for project ${projectId}:`, error);
      }
    }

    this.logger.log('Cache warming completed');
  }

  /**
   * Clean up expired cache entries from database
   */
  async cleanup(): Promise<number> {
    try {
      const result = await this.metricsRepository
        .createQueryBuilder()
        .delete()
        .from(ProjectMetrics)
        .where('expiresAt < :now', { now: new Date() })
        .execute();

      const deletedCount = result.affected || 0;
      if (deletedCount > 0) {
        this.logger.log(`Cleaned up ${deletedCount} expired cache entries`);
      }

      return deletedCount;
    } catch (error) {
      this.logger.error('Failed to cleanup expired cache entries:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(projectId?: string): Promise<any> {
    try {
      const query = this.metricsRepository.createQueryBuilder('metrics');

      if (projectId) {
        query.where('metrics.projectId = :projectId', { projectId });
      }

      const [entries, total] = await query
        .select([
          'COUNT(*) as total',
          'COUNT(CASE WHEN metrics.expiresAt > NOW() THEN 1 END) as valid',
          'COUNT(CASE WHEN metrics.expiresAt <= NOW() THEN 1 END) as expired',
          'AVG(metrics.calculationDuration) as avgDuration',
          'MAX(metrics.calculationDuration) as maxDuration',
        ])
        .getRawOne();

      return {
        total: parseInt(entries.total || '0'),
        valid: parseInt(entries.valid || '0'),
        expired: parseInt(entries.expired || '0'),
        avgDuration: parseFloat(entries.avgDuration || '0'),
        maxDuration: parseFloat(entries.maxDuration || '0'),
        hitRate: 0, // Would need to track hits/misses
      };
    } catch (error) {
      this.logger.error('Failed to get cache stats:', error);
      return {
        total: 0,
        valid: 0,
        expired: 0,
        avgDuration: 0,
        maxDuration: 0,
        hitRate: 0,
      };
    }
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    try {
      // Clear memory cache - cache-manager v5 doesn't have reset, we need to clear manually
      // This is a workaround since there's no built-in method to clear all keys
      // In production, you'd want to use Redis FLUSHDB or similar

      // Clear database cache
      await this.metricsRepository.clear();

      this.logger.log('All cache cleared');
    } catch (error) {
      this.logger.error('Failed to clear all cache:', error);
    }
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(projectId: string, group: MetricGroup): string {
    return `metrics:${projectId}:${group}`;
  }

  /**
   * Get TTL for metric group
   */
  getTTLForGroup(group: MetricGroup): number {
    const ttlMap: Record<MetricGroup, number> = {
      [MetricGroup.SCHEDULE]: 300, // 5 minutes
      [MetricGroup.BUDGET]: 900, // 15 minutes
      [MetricGroup.DOCUMENTS]: 900, // 15 minutes
      [MetricGroup.RFIS]: 600, // 10 minutes
      [MetricGroup.SUBMITTALS]: 600, // 10 minutes
      [MetricGroup.TEAM]: 600, // 10 minutes
      [MetricGroup.SAFETY]: 3600, // 1 hour
      [MetricGroup.QUALITY]: 1800, // 30 minutes
    };

    return ttlMap[group] || 600; // Default 10 minutes
  }
}