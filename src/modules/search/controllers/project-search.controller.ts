import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProjectSearchService } from '../services/project-search.service';
import { SearchCacheService } from '../services/search-cache.service';
import { SearchAnalyticsService } from '../services/search-analytics.service';
import { FacetedSearchService } from '../services/faceted-search.service';
import { SearchCriteriaDto } from '../dto/search-criteria.dto';
import { SearchResultsDto } from '../dto/search-results.dto';

/**
 * Project Search Controller
 *
 * Handles project search requests with caching and analytics
 */
@Controller('api/projects/search')
@UseGuards(JwtAuthGuard)
export class ProjectSearchController {
  private readonly logger = new Logger(ProjectSearchController.name);

  constructor(
    private readonly projectSearchService: ProjectSearchService,
    private readonly searchCacheService: SearchCacheService,
    private readonly searchAnalyticsService: SearchAnalyticsService,
    private readonly facetedSearchService: FacetedSearchService,
  ) {}

  /**
   * Search projects
   */
  @Get()
  async search(
    @Query() criteria: SearchCriteriaDto,
    @Req() req: Request,
  ): Promise<SearchResultsDto> {
    const userId = (req as any).user?.sub || (req as any).user?.id;
    const organizationId = (req as any).user?.organizationId;

    try {
      // Check cache first
      const cachedResults = await this.searchCacheService.getCachedResults(
        criteria,
        userId,
      );

      if (cachedResults) {
        // Track analytics for cached result
        await this.searchAnalyticsService.trackSearch(
          criteria,
          cachedResults,
          0,
          true,
          userId,
          organizationId,
          req,
        );

        return {
          ...cachedResults,
          cached: true,
        };
      }

      // Execute search
      const startTime = Date.now();
      const results = await this.projectSearchService.search(criteria, userId);
      const executionTime = Date.now() - startTime;

      // Generate facets
      const facets = await this.facetedSearchService.generateFacets(
        criteria,
        userId,
      );

      // Add facets to results
      const enrichedResults: SearchResultsDto = {
        ...results,
        facets: Object.entries(facets).map(([field, values]) => ({
          field,
          values: values as Record<string, number>,
        })),
      };

      // Track analytics
      await this.searchAnalyticsService.trackSearch(
        criteria,
        enrichedResults,
        executionTime,
        false,
        userId,
        organizationId,
        req,
      );

      // Cache results
      await this.searchCacheService.cacheResults(
        criteria,
        userId,
        enrichedResults,
      );

      return enrichedResults;
    } catch (error) {
      this.logger.error(`Search error: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }
}