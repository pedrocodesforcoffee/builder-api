import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SearchLog } from '../entities/search-log.entity';
import { UserDocumentActivity, DocumentActivityType } from '../entities/user-document-activity.entity';
import { SearchAnalyticsDto } from '../dto/search.dto';

/**
 * Search Analytics Service
 *
 * Provides insights and analytics on search behavior.
 *
 * Analytics:
 * - Popular search queries
 * - Zero-result queries (identify content gaps)
 * - Top viewed/downloaded documents
 * - Search volume trends
 * - Click-through rates (CTR)
 * - User behavior patterns
 *
 * Use Cases:
 * - Content strategy (what users are looking for)
 * - Tag/metadata improvements
 * - Document organization insights
 * - Search quality monitoring
 */
@Injectable()
export class SearchAnalyticsService {
  private readonly logger = new Logger(SearchAnalyticsService.name);

  constructor(
    @InjectRepository(SearchLog)
    private readonly searchLogRepo: Repository<SearchLog>,
    @InjectRepository(UserDocumentActivity)
    private readonly activityRepo: Repository<UserDocumentActivity>,
  ) {}

  /**
   * Get comprehensive search analytics for a project
   *
   * @param projectId - Project to analyze
   * @param daysBack - Number of days to analyze
   * @returns Analytics data
   */
  async getSearchAnalytics(
    projectId: string,
    daysBack: number = 30,
  ): Promise<SearchAnalyticsDto> {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - daysBack);

    try {
      const [
        popularQueries,
        zeroResultQueries,
        topDocuments,
        searchVolume,
      ] = await Promise.all([
        this.getPopularQueries(projectId, dateThreshold),
        this.getZeroResultQueries(projectId, dateThreshold),
        this.getTopDocuments(projectId, dateThreshold),
        this.getSearchVolume(projectId, dateThreshold),
      ]);

      return {
        popularQueries,
        zeroResultQueries,
        topDocuments,
        searchVolume,
      };
    } catch (error) {
      this.logger.error(`Get search analytics error:`, error);
      throw error;
    }
  }

  /**
   * Get popular search queries
   *
   * @param projectId - Project context
   * @param dateThreshold - Minimum date
   * @returns Popular queries with stats
   */
  private async getPopularQueries(
    projectId: string,
    dateThreshold: Date,
  ): Promise<
    Array<{
      query: string;
      count: number;
      avgResultCount: number;
    }>
  > {
    try {
      const results = await this.searchLogRepo
        .createQueryBuilder('log')
        .select('log.normalizedQuery', 'query')
        .addSelect('COUNT(*)', 'count')
        .addSelect('AVG(log.resultCount)', 'avgResultCount')
        .where('log.projectId = :projectId', { projectId })
        .andWhere('log.searchedAt >= :dateThreshold', { dateThreshold })
        .andWhere('log.normalizedQuery IS NOT NULL')
        .andWhere("log.normalizedQuery != ''")
        .groupBy('log.normalizedQuery')
        .orderBy('count', 'DESC')
        .limit(20)
        .getRawMany();

      return results.map(r => ({
        query: r.query,
        count: parseInt(r.count),
        avgResultCount: parseFloat(r.avgResultCount || '0'),
      }));
    } catch (error) {
      this.logger.error(`Get popular queries error:`, error);
      return [];
    }
  }

  /**
   * Get zero-result queries (content gap analysis)
   *
   * @param projectId - Project context
   * @param dateThreshold - Minimum date
   * @returns Queries that returned no results
   */
  private async getZeroResultQueries(
    projectId: string,
    dateThreshold: Date,
  ): Promise<
    Array<{
      query: string;
      count: number;
      lastSearchedAt: Date;
    }>
  > {
    try {
      const results = await this.searchLogRepo
        .createQueryBuilder('log')
        .select('log.normalizedQuery', 'query')
        .addSelect('COUNT(*)', 'count')
        .addSelect('MAX(log.searchedAt)', 'lastSearchedAt')
        .where('log.projectId = :projectId', { projectId })
        .andWhere('log.searchedAt >= :dateThreshold', { dateThreshold })
        .andWhere('log.resultCount = 0')
        .andWhere('log.normalizedQuery IS NOT NULL')
        .andWhere("log.normalizedQuery != ''")
        .groupBy('log.normalizedQuery')
        .orderBy('count', 'DESC')
        .limit(20)
        .getRawMany();

      return results.map(r => ({
        query: r.query,
        count: parseInt(r.count),
        lastSearchedAt: new Date(r.lastSearchedAt),
      }));
    } catch (error) {
      this.logger.error(`Get zero-result queries error:`, error);
      return [];
    }
  }

  /**
   * Get top documents by activity
   *
   * @param projectId - Project context (derived from documents)
   * @param dateThreshold - Minimum date
   * @returns Top documents with activity counts
   */
  private async getTopDocuments(
    projectId: string,
    dateThreshold: Date,
  ): Promise<
    Array<{
      documentId: string;
      documentName: string;
      viewCount: number;
      downloadCount: number;
      searchClickCount: number;
    }>
  > {
    try {
      // Get all activity counts grouped by document
      const results = await this.activityRepo
        .createQueryBuilder('activity')
        .leftJoinAndSelect('activity.document', 'document')
        .select('activity.documentId', 'documentId')
        .addSelect('document.name', 'documentName')
        .addSelect(
          `SUM(CASE WHEN activity.activityType = '${DocumentActivityType.VIEW}' THEN 1 ELSE 0 END)`,
          'viewCount',
        )
        .addSelect(
          `SUM(CASE WHEN activity.activityType = '${DocumentActivityType.DOWNLOAD}' THEN 1 ELSE 0 END)`,
          'downloadCount',
        )
        .addSelect(
          `SUM(CASE WHEN activity.activityType = '${DocumentActivityType.SEARCH_CLICK}' THEN 1 ELSE 0 END)`,
          'searchClickCount',
        )
        .where('document.projectId = :projectId', { projectId })
        .andWhere('activity.activityDate >= :dateThreshold', { dateThreshold })
        .groupBy('activity.documentId')
        .addGroupBy('document.name')
        .orderBy('viewCount + downloadCount + searchClickCount', 'DESC')
        .limit(20)
        .getRawMany();

      return results.map(r => ({
        documentId: r.documentId,
        documentName: r.documentName,
        viewCount: parseInt(r.viewCount || '0'),
        downloadCount: parseInt(r.downloadCount || '0'),
        searchClickCount: parseInt(r.searchClickCount || '0'),
      }));
    } catch (error) {
      this.logger.error(`Get top documents error:`, error);
      return [];
    }
  }

  /**
   * Get search volume over time
   *
   * @param projectId - Project context
   * @param dateThreshold - Minimum date
   * @returns Search volume stats
   */
  private async getSearchVolume(
    projectId: string,
    dateThreshold: Date,
  ): Promise<{
    total: number;
    byDay: Array<{
      date: string;
      count: number;
    }>;
  }> {
    try {
      // Get total count
      const total = await this.searchLogRepo.count({
        where: {
          projectId,
          searchedAt: dateThreshold as any, // TypeORM MoreThan would be used here
        },
      });

      // Get daily counts
      const dailyResults = await this.searchLogRepo
        .createQueryBuilder('log')
        .select("DATE(log.searchedAt)", 'date')
        .addSelect('COUNT(*)', 'count')
        .where('log.projectId = :projectId', { projectId })
        .andWhere('log.searchedAt >= :dateThreshold', { dateThreshold })
        .groupBy('DATE(log.searchedAt)')
        .orderBy('date', 'ASC')
        .getRawMany();

      const byDay = dailyResults.map(r => ({
        date: r.date,
        count: parseInt(r.count),
      }));

      return {
        total,
        byDay,
      };
    } catch (error) {
      this.logger.error(`Get search volume error:`, error);
      return {
        total: 0,
        byDay: [],
      };
    }
  }

  /**
   * Get click-through rate for searches
   *
   * @param projectId - Project context
   * @param daysBack - Number of days to analyze
   * @returns CTR percentage
   */
  async getSearchCTR(projectId: string, daysBack: number = 30): Promise<number> {
    try {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - daysBack);

      const result = await this.searchLogRepo
        .createQueryBuilder('log')
        .select('COUNT(*)', 'totalSearches')
        .addSelect('SUM(CASE WHEN log.wasSuccessful = true THEN 1 ELSE 0 END)', 'successfulSearches')
        .where('log.projectId = :projectId', { projectId })
        .andWhere('log.searchedAt >= :dateThreshold', { dateThreshold })
        .getRawOne();

      const total = parseInt(result.totalSearches || '0');
      const successful = parseInt(result.successfulSearches || '0');

      return total > 0 ? (successful / total) * 100 : 0;
    } catch (error) {
      this.logger.error(`Get search CTR error:`, error);
      return 0;
    }
  }

  /**
   * Auto-anonymize old search logs for privacy
   *
   * Called by scheduled job to anonymize logs older than 90 days
   *
   * @returns Number of records anonymized
   */
  async anonymizeOldSearchLogs(): Promise<number> {
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const result = await this.searchLogRepo
        .createQueryBuilder()
        .update(SearchLog)
        .set({
          userId: null,
          anonymized: true,
          anonymizedAt: new Date(),
        })
        .where('searchedAt < :ninetyDaysAgo', { ninetyDaysAgo })
        .andWhere('anonymized = :anonymized', { anonymized: false })
        .execute();

      return result.affected || 0;
    } catch (error) {
      this.logger.error(`Anonymize old search logs error:`, error);
      return 0;
    }
  }
}
