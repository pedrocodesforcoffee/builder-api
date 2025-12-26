import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';

// Entities
import { SavedSearch } from './entities/saved-search.entity';
import { SearchAnalytics } from './entities/search-analytics.entity';
import { ExportJob } from './entities/export-job.entity';
import { Project } from '../projects/entities/project.entity';
import { Organization } from '../organizations/entities/organization.entity';

// Services
import {
  ProjectSearchService,
  SavedSearchService,
  SearchCacheService,
  SearchAutocompleteService,
  ProjectExportService,
  SearchAnalyticsService,
  FacetedSearchService,
} from './services';

// Controllers
import {
  ProjectSearchController,
  SavedSearchController,
  SearchAutocompleteController,
  ExportController,
  SearchAnalyticsController,
} from './controllers';

// Jobs
import { ExportProcessingJob } from './jobs';

/**
 * Search Module
 *
 * Provides comprehensive search functionality for projects including:
 * - Advanced search with filters and full-text search
 * - Saved searches with notifications
 * - Search analytics and metrics
 * - Export functionality in multiple formats
 * - Autocomplete suggestions
 * - Faceted search
 */
@Module({
  imports: [
    // Database entities
    TypeOrmModule.forFeature([
      SavedSearch,
      SearchAnalytics,
      ExportJob,
      Project,
      Organization,
    ]),

    // Cache module for search result caching
    CacheModule.register({
      ttl: 300, // 5 minutes default TTL
      max: 100, // Maximum number of items in cache
    }),

    // Schedule module for background jobs
    ScheduleModule.forRoot(),
  ],
  controllers: [
    ProjectSearchController,
    SavedSearchController,
    SearchAutocompleteController,
    ExportController,
    SearchAnalyticsController,
  ],
  providers: [
    // Core services
    ProjectSearchService,
    SavedSearchService,
    SearchCacheService,
    SearchAutocompleteService,
    ProjectExportService,
    SearchAnalyticsService,
    FacetedSearchService,

    // Background jobs
    ExportProcessingJob,
  ],
  exports: [
    // Export services that might be used by other modules
    ProjectSearchService,
    SavedSearchService,
    SearchAnalyticsService,
  ],
})
export class SearchModule {}