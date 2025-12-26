import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull } from 'typeorm';
import { SearchAnalytics } from '../entities/search-analytics.entity';
import { Request } from 'express';

/**
 * Search Analytics Service
 *
 * Tracks and analyzes search patterns and performance
 */
@Injectable()
export class SearchAnalyticsService {
  constructor(
    @InjectRepository(SearchAnalytics)
    private readonly analyticsRepository: Repository<SearchAnalytics>,
  ) {}

  /**
   * Track a search query
   */
  async trackSearch(
    criteria: Record<string, any>,
    results: { pagination: { totalItems: number } },
    executionTime: number,
    wasCached: boolean,
    userId: string | null,
    organizationId: string | null,
    req: Request,
  ): Promise<void> {
    const analytics = this.analyticsRepository.create({
      userId: userId || undefined,
      organizationId: organizationId || undefined,
      query: criteria.q || undefined,
      criteria,
      resultCount: results.pagination.totalItems,
      executionTime,
      wasCached,
      timestamp: new Date(),
      userAgent: req.get('user-agent') || undefined,
      ipAddress: this.getClientIp(req) || undefined,
    });

    await this.analyticsRepository.save(analytics);
  }

  /**
   * Track a click on search result
   */
  async trackClick(
    userId: string,
    projectId: string,
    position: number,
    searchId?: string,
  ): Promise<void> {
    if (searchId) {
      const analytics = await this.analyticsRepository.findOne({
        where: { id: searchId },
      });

      if (analytics) {
        analytics.clickedResultIds = [
          ...(analytics.clickedResultIds || []),
          projectId,
        ];
        analytics.clickedPosition = position;
        await this.analyticsRepository.save(analytics);
      }
    }
  }

  /**
   * Get analytics summary
   */
  async getAnalytics(
    startDate: Date,
    endDate: Date,
    organizationId?: string,
  ): Promise<any> {
    const whereClause: any = {
      timestamp: Between(startDate, endDate),
    };

    if (organizationId) {
      whereClause.organizationId = organizationId;
    }

    const analytics = await this.analyticsRepository.find({
      where: whereClause,
    });

    // Calculate metrics
    const totalSearches = analytics.length;
    const averageExecutionTime =
      analytics.reduce((sum, a) => sum + a.executionTime, 0) / totalSearches || 0;
    const cacheHitRate =
      (analytics.filter((a) => a.wasCached).length / totalSearches) * 100 || 0;
    const zeroResultRate =
      (analytics.filter((a) => a.resultCount === 0).length / totalSearches) * 100 || 0;

    // Get popular searches
    const searchCounts = new Map<string, number>();
    analytics.forEach((a) => {
      if (a.query) {
        searchCounts.set(a.query, (searchCounts.get(a.query) || 0) + 1);
      }
    });

    const popularSearches = Array.from(searchCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    return {
      totalSearches,
      averageExecutionTime: Math.round(averageExecutionTime),
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      zeroResultRate: Math.round(zeroResultRate * 100) / 100,
      popularSearches,
      slowQueries: await this.getSlowQueries(1000, 10),
      zeroResultSearches: await this.getZeroResultSearches(10),
    };
  }

  /**
   * Get popular searches
   */
  async getPopularSearches(limit: number = 10): Promise<any[]> {
    const result = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('analytics.query', 'query')
      .addSelect('COUNT(*)', 'count')
      .where('analytics.query IS NOT NULL')
      .groupBy('analytics.query')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();

    return result.map((r) => ({
      query: r.query,
      count: parseInt(r.count),
    }));
  }

  /**
   * Get trending searches (last 24 hours vs previous 24 hours)
   */
  async getTrendingSearches(limit: number = 10): Promise<any[]> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // Get searches from last 24 hours
    const recentSearches = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('analytics.query', 'query')
      .addSelect('COUNT(*)', 'count')
      .where('analytics.query IS NOT NULL')
      .andWhere('analytics.timestamp >= :oneDayAgo', { oneDayAgo })
      .groupBy('analytics.query')
      .getRawMany();

    // Get searches from previous 24 hours
    const previousSearches = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('analytics.query', 'query')
      .addSelect('COUNT(*)', 'count')
      .where('analytics.query IS NOT NULL')
      .andWhere('analytics.timestamp >= :twoDaysAgo', { twoDaysAgo })
      .andWhere('analytics.timestamp < :oneDayAgo', { oneDayAgo })
      .groupBy('analytics.query')
      .getRawMany();

    // Calculate trends
    const previousMap = new Map(
      previousSearches.map((s) => [s.query, parseInt(s.count)]),
    );

    const trends = recentSearches
      .map((search) => {
        const recentCount = parseInt(search.count);
        const previousCount = previousMap.get(search.query) || 0;
        const growth =
          previousCount > 0
            ? ((recentCount - previousCount) / previousCount) * 100
            : recentCount > 0
            ? 100
            : 0;

        return {
          query: search.query,
          recentCount,
          previousCount,
          growth: Math.round(growth),
        };
      })
      .sort((a, b) => b.growth - a.growth)
      .slice(0, limit);

    return trends;
  }

  /**
   * Get slow queries
   */
  async getSlowQueries(
    threshold: number = 1000,
    limit: number = 10,
  ): Promise<any[]> {
    const slowQueries = await this.analyticsRepository.find({
      where: {
        executionTime: threshold,
        wasCached: false,
      },
      order: {
        executionTime: 'DESC',
      },
      take: limit,
    });

    return slowQueries.map((q) => ({
      query: q.query,
      criteria: q.criteria,
      executionTime: q.executionTime,
      resultCount: q.resultCount,
      timestamp: q.timestamp,
    }));
  }

  /**
   * Get zero-result searches
   */
  async getZeroResultSearches(limit: number = 10): Promise<any[]> {
    const zeroResults = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('analytics.query', 'query')
      .addSelect('COUNT(*)', 'count')
      .where('analytics.resultCount = 0')
      .andWhere('analytics.query IS NOT NULL')
      .groupBy('analytics.query')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();

    return zeroResults.map((r) => ({
      query: r.query,
      count: parseInt(r.count),
    }));
  }

  /**
   * Get search performance metrics
   */
  async getPerformanceMetrics(days: number = 7): Promise<any> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const metrics = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('DATE(analytics.timestamp)', 'date')
      .addSelect('AVG(analytics.executionTime)', 'avgExecutionTime')
      .addSelect('MAX(analytics.executionTime)', 'maxExecutionTime')
      .addSelect('MIN(analytics.executionTime)', 'minExecutionTime')
      .addSelect('COUNT(*)', 'searchCount')
      .addSelect(
        'SUM(CASE WHEN analytics.wasCached THEN 1 ELSE 0 END)',
        'cachedCount',
      )
      .where('analytics.timestamp >= :startDate', { startDate })
      .groupBy('DATE(analytics.timestamp)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return metrics.map((m) => ({
      date: m.date,
      avgExecutionTime: Math.round(parseFloat(m.avgExecutionTime)),
      maxExecutionTime: parseInt(m.maxExecutionTime),
      minExecutionTime: parseInt(m.minExecutionTime),
      searchCount: parseInt(m.searchCount),
      cacheHitRate:
        Math.round((parseInt(m.cachedCount) / parseInt(m.searchCount)) * 10000) /
        100,
    }));
  }

  /**
   * Extract client IP from request
   */
  private getClientIp(req: Request): string {
    const forwarded = req.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.connection?.remoteAddress || '';
  }
}