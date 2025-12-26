import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { SearchService } from '../services/search.service';
import { SearchAnalyticsService } from '../services/search-analytics.service';
import {
  SearchDocumentsDto,
  AutocompleteDto,
  SuggestDto,
  SearchResponseDto,
  AutocompleteResponseDto,
  SearchAnalyticsDto,
  SearchResultDocumentDto,
} from '../dto/search.dto';

/**
 * Search Controller
 *
 * Handles document search endpoints.
 *
 * Endpoints:
 * - POST   /projects/:projectId/search - Main search
 * - GET    /projects/:projectId/search/autocomplete - Autocomplete
 * - GET    /projects/:projectId/search/suggest - Context suggestions
 * - GET    /documents/:documentId/related - Related documents
 * - POST   /search/:searchLogId/click - Log search click
 * - GET    /projects/:projectId/search/analytics - Analytics (admin)
 */
@Controller()
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly analyticsService: SearchAnalyticsService,
  ) {}

  /**
   * Main document search
   *
   * Full-text search with faceted filtering and permission awareness
   */
  @Post('projects/:projectId/search')
  async search(
    @Param('projectId') projectId: string,
    @Body() dto: SearchDocumentsDto,
    @Request() req: any,
  ): Promise<SearchResponseDto> {
    const userId = req.user.id;
    return this.searchService.search(projectId, userId, dto);
  }

  /**
   * Autocomplete suggestions
   *
   * Returns matching document names, drawing numbers, or spec sections
   */
  @Get('projects/:projectId/search/autocomplete')
  async autocomplete(
    @Param('projectId') projectId: string,
    @Query() dto: AutocompleteDto,
    @Request() req: any,
  ): Promise<AutocompleteResponseDto> {
    const userId = req.user.id;
    return this.searchService.autocomplete(projectId, userId, dto);
  }

  /**
   * Context-based suggestions
   *
   * Uses Elasticsearch completion suggester for fast suggestions
   */
  @Get('projects/:projectId/search/suggest')
  async suggest(
    @Param('projectId') projectId: string,
    @Query() dto: SuggestDto,
    @Request() req: any,
  ): Promise<AutocompleteResponseDto> {
    const userId = req.user.id;
    return this.searchService.suggest(projectId, userId, dto);
  }

  /**
   * Find related documents
   *
   * Uses "More Like This" query to find similar documents
   */
  @Get('documents/:documentId/related')
  async findRelated(
    @Param('documentId') documentId: string,
    @Query('limit') limit: number = 10,
    @Request() req: any,
  ): Promise<SearchResultDocumentDto[]> {
    const userId = req.user.id;
    return this.searchService.findRelatedDocuments(documentId, userId, limit);
  }

  /**
   * Log search result click
   *
   * Tracks when user clicks a search result for CTR analysis
   */
  @Post('search/:searchLogId/click')
  async logClick(
    @Param('searchLogId') searchLogId: string,
    @Body() body: { documentId: string; position: number },
    @Request() req: any,
  ): Promise<{ message: string }> {
    const userId = req.user.id;
    await this.searchService.logSearchClick(
      searchLogId,
      body.documentId,
      body.position,
      userId,
    );
    return { message: 'Click logged successfully' };
  }

  /**
   * Get search analytics
   *
   * Returns search insights and statistics (admin only)
   */
  @Get('projects/:projectId/search/analytics')
  async getAnalytics(
    @Param('projectId') projectId: string,
    @Query('daysBack') daysBack: number = 30,
    @Request() req: any,
  ): Promise<SearchAnalyticsDto> {
    // TODO: Add admin role check
    return this.analyticsService.getSearchAnalytics(projectId, daysBack);
  }

  /**
   * Get search click-through rate
   *
   * Returns CTR percentage for project (admin only)
   */
  @Get('projects/:projectId/search/ctr')
  async getCTR(
    @Param('projectId') projectId: string,
    @Query('daysBack') daysBack: number = 30,
  ): Promise<{ ctr: number }> {
    // TODO: Add admin role check
    const ctr = await this.analyticsService.getSearchCTR(projectId, daysBack);
    return { ctr };
  }
}
