import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SearchAnalyticsService } from '../services/search-analytics.service';

/**
 * Search Analytics Controller
 *
 * Provides analytics data for search usage
 */
@Controller('api/search/analytics')
@UseGuards(JwtAuthGuard)
export class SearchAnalyticsController {
  constructor(private readonly analyticsService: SearchAnalyticsService) {}

  /**
   * Get analytics summary
   */
  @Get()
  async getAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Req() req?: Request,
  ): Promise<any> {
    const organizationId = (req as any).user?.organizationId;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return this.analyticsService.getAnalytics(start, end, organizationId);
  }

  /**
   * Get popular searches
   */
  @Get('popular')
  async getPopularSearches(
    @Query('limit') limit?: number,
  ): Promise<any[]> {
    return this.analyticsService.getPopularSearches(limit || 10);
  }

  /**
   * Get trending searches
   */
  @Get('trending')
  async getTrendingSearches(
    @Query('limit') limit?: number,
  ): Promise<any[]> {
    return this.analyticsService.getTrendingSearches(limit || 10);
  }

  /**
   * Get slow queries
   */
  @Get('slow-queries')
  async getSlowQueries(
    @Query('threshold') threshold?: number,
    @Query('limit') limit?: number,
  ): Promise<any[]> {
    return this.analyticsService.getSlowQueries(
      threshold || 1000,
      limit || 10,
    );
  }

  /**
   * Get zero-result searches
   */
  @Get('zero-results')
  async getZeroResultSearches(
    @Query('limit') limit?: number,
  ): Promise<any[]> {
    return this.analyticsService.getZeroResultSearches(limit || 10);
  }

  /**
   * Get performance metrics
   */
  @Get('performance')
  async getPerformanceMetrics(
    @Query('days') days?: number,
  ): Promise<any> {
    return this.analyticsService.getPerformanceMetrics(days || 7);
  }
}