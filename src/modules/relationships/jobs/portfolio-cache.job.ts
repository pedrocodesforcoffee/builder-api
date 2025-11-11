import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PortfolioView } from '../entities/portfolio-view.entity';
import { PortfolioService } from '../services/portfolio.service';
import { PortfolioAnalyticsService } from '../services/portfolio-analytics.service';
import { PortfolioHealthService } from '../services/portfolio-health.service';

interface CacheEntry {
  viewId: string;
  data: any;
  updatedAt: Date;
  ttl: number;
}

@Injectable()
export class PortfolioCacheJob {
  private readonly logger = new Logger(PortfolioCacheJob.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    @InjectRepository(PortfolioView)
    private readonly portfolioViewRepository: Repository<PortfolioView>,
    private readonly portfolioService: PortfolioService,
    private readonly portfolioAnalyticsService: PortfolioAnalyticsService,
    private readonly portfolioHealthService: PortfolioHealthService,
  ) {}

  /**
   * Update portfolio cache every 15 minutes
   */
  @Cron('*/15 * * * *')
  async handleCacheUpdate(): Promise<void> {
    this.logger.log('Starting portfolio cache update');

    try {
      // Get all portfolio views
      const views = await this.portfolioViewRepository.find({
        where: { isPublic: true },
      });

      this.logger.log(`Updating cache for ${views.length} portfolio views`);

      // Update cache for each view
      const results = await Promise.allSettled(
        views.map(view => this.updateViewCache(view)),
      );

      // Clean up old cache entries
      this.cleanupCache();

      // Log summary
      const summary = this.summarizeResults(results);
      this.logger.log(
        `Portfolio cache update completed: ${summary.success} successful, ${summary.failed} failed`,
      );

    } catch (error) {
      this.logger.error('Portfolio cache update failed', (error as Error).stack);
    }
  }

  /**
   * Update analytics cache every 30 minutes
   */
  @Cron('*/30 * * * *')
  async handleAnalyticsCache(): Promise<void> {
    this.logger.log('Starting portfolio analytics cache update');

    try {
      // Get unique organization IDs from views
      const views = await this.portfolioViewRepository.find();
      const organizationIds = [...new Set(views.map(v => v.organizationId))];

      this.logger.log(`Updating analytics for ${organizationIds.length} organizations`);

      // Update analytics cache for each organization
      for (const orgId of organizationIds) {
        await this.updateAnalyticsCache(orgId);
      }

      this.logger.log('Portfolio analytics cache update completed');
    } catch (error) {
      this.logger.error('Analytics cache update failed', (error as Error).stack);
    }
  }

  /**
   * Update health metrics cache hourly
   */
  @Cron('0 * * * *')
  async handleHealthMetricsCache(): Promise<void> {
    this.logger.log('Starting health metrics cache update');

    try {
      // Get unique organization IDs
      const views = await this.portfolioViewRepository.find();
      const organizationIds = [...new Set(views.map(v => v.organizationId))];

      this.logger.log(`Updating health metrics for ${organizationIds.length} organizations`);

      // Update health cache for each organization
      for (const orgId of organizationIds) {
        await this.updateHealthCache(orgId);
      }

      this.logger.log('Health metrics cache update completed');
    } catch (error) {
      this.logger.error('Health metrics cache update failed', (error as Error).stack);
    }
  }

  /**
   * Update cache for a specific view
   */
  private async updateViewCache(view: PortfolioView): Promise<void> {
    try {
      const startTime = Date.now();

      // Get portfolio data
      const data = await this.portfolioService.getPortfolioData(view.id);

      // Store in cache
      const cacheKey = `view:${view.id}`;
      this.cache.set(cacheKey, {
        viewId: view.id,
        data,
        updatedAt: new Date(),
        ttl: 15 * 60 * 1000, // 15 minutes
      });

      const duration = Date.now() - startTime;
      this.logger.debug(
        `Updated cache for view ${view.name} in ${duration}ms`,
      );

      // Check if update took too long
      if (duration > 5000) {
        this.logger.warn(
          `Slow cache update for view ${view.name}: ${duration}ms`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to update cache for view ${view.name}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * Update analytics cache for an organization
   */
  private async updateAnalyticsCache(organizationId: string): Promise<void> {
    try {
      const startTime = Date.now();

      // Get analytics data
      const [healthMetrics, riskAnalysis, resourceUtilization] = await Promise.all([
        this.portfolioAnalyticsService.getHealthMetrics(organizationId),
        this.portfolioAnalyticsService.getRiskAnalysis(organizationId),
        this.portfolioAnalyticsService.getResourceUtilization(organizationId),
      ]);

      // Store in cache
      this.cache.set(`analytics:health:${organizationId}`, {
        viewId: `health:${organizationId}`,
        data: healthMetrics,
        updatedAt: new Date(),
        ttl: 30 * 60 * 1000, // 30 minutes
      });

      this.cache.set(`analytics:risk:${organizationId}`, {
        viewId: `risk:${organizationId}`,
        data: riskAnalysis,
        updatedAt: new Date(),
        ttl: 30 * 60 * 1000,
      });

      this.cache.set(`analytics:resources:${organizationId}`, {
        viewId: `resources:${organizationId}`,
        data: resourceUtilization,
        updatedAt: new Date(),
        ttl: 30 * 60 * 1000,
      });

      const duration = Date.now() - startTime;
      this.logger.debug(
        `Updated analytics cache for org ${organizationId} in ${duration}ms`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update analytics cache for org ${organizationId}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Update health cache for an organization
   */
  private async updateHealthCache(organizationId: string): Promise<void> {
    try {
      const startTime = Date.now();

      // Get health data
      const healthData = await this.portfolioHealthService.getPortfolioHealth(
        organizationId,
      );

      // Store in cache
      this.cache.set(`health:${organizationId}`, {
        viewId: `health:${organizationId}`,
        data: healthData,
        updatedAt: new Date(),
        ttl: 60 * 60 * 1000, // 1 hour
      });

      const duration = Date.now() - startTime;
      this.logger.debug(
        `Updated health cache for org ${organizationId} in ${duration}ms`,
      );

      // Alert on critical health scores
      if (healthData.overallScore < 50) {
        this.logger.warn(
          `Critical portfolio health for org ${organizationId}: ${healthData.overallScore}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to update health cache for org ${organizationId}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.updatedAt.getTime();
      if (age > entry.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      this.logger.debug(`Removed ${removed} expired cache entries`);
    }
  }

  /**
   * Get cached data for a view
   */
  getCachedData(viewId: string): any | null {
    const cacheKey = `view:${viewId}`;
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return null;
    }

    const age = Date.now() - entry.updatedAt.getTime();
    if (age > entry.ttl) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.data;
  }

  /**
   * Get cached analytics data
   */
  getCachedAnalytics(
    organizationId: string,
    type: 'health' | 'risk' | 'resources',
  ): any | null {
    const cacheKey = `analytics:${type}:${organizationId}`;
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return null;
    }

    const age = Date.now() - entry.updatedAt.getTime();
    if (age > entry.ttl) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.data;
  }

  /**
   * Invalidate cache for a specific view
   */
  invalidateViewCache(viewId: string): void {
    const cacheKey = `view:${viewId}`;
    this.cache.delete(cacheKey);
    this.logger.debug(`Invalidated cache for view ${viewId}`);
  }

  /**
   * Invalidate all cache for an organization
   */
  invalidateOrganizationCache(organizationId: string): void {
    let invalidated = 0;

    // Remove all entries for this organization
    for (const [key] of this.cache.entries()) {
      if (key.includes(organizationId)) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    this.logger.debug(
      `Invalidated ${invalidated} cache entries for org ${organizationId}`,
    );
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): any {
    const now = Date.now();
    const stats = {
      totalEntries: this.cache.size,
      entriesByType: {
        view: 0,
        analytics: 0,
        health: 0,
      },
      oldestEntry: null as Date | null,
      newestEntry: null as Date | null,
      averageAge: 0,
    };

    let totalAge = 0;
    let oldestTime = now;
    let newestTime = 0;

    for (const [key, entry] of this.cache.entries()) {
      // Count by type
      if (key.startsWith('view:')) {
        stats.entriesByType.view++;
      } else if (key.startsWith('analytics:')) {
        stats.entriesByType.analytics++;
      } else if (key.startsWith('health:')) {
        stats.entriesByType.health++;
      }

      // Track age
      const entryTime = entry.updatedAt.getTime();
      const age = now - entryTime;
      totalAge += age;

      if (entryTime < oldestTime) {
        oldestTime = entryTime;
        stats.oldestEntry = entry.updatedAt;
      }
      if (entryTime > newestTime) {
        newestTime = entryTime;
        stats.newestEntry = entry.updatedAt;
      }
    }

    if (this.cache.size > 0) {
      stats.averageAge = Math.round(totalAge / this.cache.size / 1000); // in seconds
    }

    return stats;
  }

  private summarizeResults(
    results: PromiseSettledResult<void>[],
  ): { success: number; failed: number } {
    let success = 0;
    let failed = 0;

    for (const result of results) {
      if (result.status === 'fulfilled') {
        success++;
      } else {
        failed++;
      }
    }

    return { success, failed };
  }
}