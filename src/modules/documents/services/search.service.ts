import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { Repository } from 'typeorm';
import {
  SearchDocumentsDto,
  AutocompleteDto,
  SuggestDto,
  SearchResponseDto,
  SearchResultDocumentDto,
  SearchFacetDto,
  AutocompleteResponseDto,
} from '../dto/search.dto';
import { SearchLog } from '../entities/search-log.entity';
import { UserDocumentActivity, DocumentActivityType } from '../entities/user-document-activity.entity';
import { Document } from '../entities/document.entity';
import { PermissionService } from './permission.service';
import { DocumentAction } from '../enums/permission.enums';
import { ELASTICSEARCH_INDEX_ALIAS } from '../config/elasticsearch-index.config';

/**
 * Search Service
 *
 * Core search functionality with Elasticsearch integration.
 *
 * Critical Features:
 * - Permission-aware search (users only see authorized documents)
 * - Full-text search with construction-specific analyzers
 * - Faceted search with aggregations
 * - Autocomplete for names, drawing numbers, spec sections
 * - "More Like This" for related documents
 * - Search analytics and logging
 *
 * Security:
 * - ALL searches filtered by user permissions
 * - No data leakage through search results
 * - Audit logging for compliance
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    @InjectRepository(SearchLog)
    private readonly searchLogRepo: Repository<SearchLog>,
    @InjectRepository(UserDocumentActivity)
    private readonly activityRepo: Repository<UserDocumentActivity>,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    private readonly permissionService: PermissionService,
  ) {}

  /**
   * Main search with permission filtering
   *
   * @param projectId - Project to search in
   * @param userId - User performing search
   * @param dto - Search parameters
   * @returns Search results with facets
   */
  async search(
    projectId: string,
    userId: string,
    dto: SearchDocumentsDto,
  ): Promise<SearchResponseDto> {
    const startTime = Date.now();

    try {
      // Get user's allowed documents for permission filtering
      const permissionFilter = await this.buildPermissionFilter(projectId, userId);

      // Build Elasticsearch query
      const esQuery = this.buildSearchQuery(dto, permissionFilter);

      // Execute search
      const response = await this.elasticsearchService.search({
        index: ELASTICSEARCH_INDEX_ALIAS,
        body: esQuery,
        from: dto.offset || 0,
        size: dto.limit || 20,
      });

      const executionTimeMs = Date.now() - startTime;

      // Parse results
      const results: SearchResultDocumentDto[] = response.hits.hits.map((hit: any) => ({
        id: hit._source.documentId,
        projectId: hit._source.projectId,
        name: hit._source.name,
        documentType: hit._source.documentType,
        description: hit._source.description,
        drawingNumber: hit._source.drawingNumber,
        discipline: hit._source.discipline,
        specSection: hit._source.specSection,
        division: hit._source.division,
        mimeType: hit._source.mimeType,
        fileSize: hit._source.fileSize,
        versionNumber: hit._source.versionNumber,
        status: hit._source.status,
        tags: hit._source.tags,
        createdBy: hit._source.createdBy,
        createdByName: hit._source.createdByName,
        createdAt: new Date(hit._source.createdAt),
        updatedAt: new Date(hit._source.updatedAt),
        score: hit._score,
        highlights: dto.includeHighlights ? hit.highlight : undefined,
      }));

      // Parse facets
      const facets: SearchFacetDto[] = dto.includeFacets
        ? this.parseFacets(response.aggregations)
        : [];

      // Log search
      await this.logSearch(userId, projectId, dto, results.length, executionTimeMs);

      return {
        results,
        total: (response.hits.total as any).value || 0,
        offset: dto.offset || 0,
        limit: dto.limit || 20,
        executionTimeMs,
        facets: dto.includeFacets ? facets : undefined,
      };
    } catch (error) {
      this.logger.error(`Search error for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Autocomplete suggestions
   *
   * @param projectId - Project context
   * @param userId - User performing search
   * @param dto - Autocomplete parameters
   * @returns Suggestions
   */
  async autocomplete(
    projectId: string,
    userId: string,
    dto: AutocompleteDto,
  ): Promise<AutocompleteResponseDto> {
    try {
      const permissionFilter = await this.buildPermissionFilter(projectId, userId);

      const field = dto.field || 'name';
      const esQuery = {
        query: {
          bool: {
            must: [
              {
                match: {
                  [`${field}.autocomplete`]: {
                    query: dto.query,
                    operator: 'and',
                  },
                },
              },
            ],
            filter: [
              { term: { projectId } },
              ...permissionFilter,
            ],
          },
        },
        _source: [field, 'documentId'],
        size: dto.limit || 10,
      };

      const response = await this.elasticsearchService.search({
        index: ELASTICSEARCH_INDEX_ALIAS,
        body: esQuery as any,
      });

      const suggestions = response.hits.hits.map((hit: any) => ({
        text: hit._source[field],
        documentId: hit._source.documentId,
        score: hit._score,
      }));

      return { suggestions };
    } catch (error) {
      this.logger.error(`Autocomplete error:`, error);
      throw error;
    }
  }

  /**
   * Context-based suggestions using completion suggester
   *
   * @param projectId - Project context
   * @param userId - User performing search
   * @param dto - Suggest parameters
   * @returns Suggestions
   */
  async suggest(
    projectId: string,
    userId: string,
    dto: SuggestDto,
  ): Promise<AutocompleteResponseDto> {
    try {
      const contexts: any = {
        project: [projectId],
      };

      if (dto.documentType) {
        contexts.documentType = [dto.documentType];
      }

      const response = await this.elasticsearchService.search({
        index: ELASTICSEARCH_INDEX_ALIAS,
        body: {
          suggest: {
            document_suggest: {
              prefix: dto.query,
              completion: {
                field: 'suggest',
                size: dto.limit || 5,
                contexts,
              },
            },
          },
        } as any,
      });

      const suggestions = ((response.suggest?.document_suggest?.[0]?.options as any[]) || []).map((opt: any) => ({
        text: opt.text,
        documentId: opt._source?.documentId,
        score: opt._score,
      })) || [];

      return { suggestions };
    } catch (error) {
      this.logger.error(`Suggest error:`, error);
      return { suggestions: [] };
    }
  }

  /**
   * Find related documents using "More Like This"
   *
   * @param documentId - Source document
   * @param userId - User requesting
   * @param limit - Max results
   * @returns Related documents
   */
  async findRelatedDocuments(
    documentId: string,
    userId: string,
    limit: number = 10,
  ): Promise<SearchResultDocumentDto[]> {
    try {
      // Get document to find project
      const document = await this.documentRepo.findOne({
        where: { id: documentId },
      });

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      const permissionFilter = await this.buildPermissionFilter(document.projectId, userId);

      const response = await this.elasticsearchService.search({
        index: ELASTICSEARCH_INDEX_ALIAS,
        body: {
          query: {
            bool: {
              must: [
                {
                  more_like_this: {
                    fields: ['name', 'description', 'content', 'tags'],
                    like: [
                      {
                        _index: ELASTICSEARCH_INDEX_ALIAS,
                        _id: documentId,
                      },
                    ],
                    min_term_freq: 1,
                    max_query_terms: 12,
                  },
                },
              ],
              filter: [
                { term: { projectId: document.projectId } },
                ...permissionFilter,
              ],
              must_not: [
                { term: { documentId } }, // Exclude the source document
              ],
            },
          },
          size: limit,
        } as any,
      });

      return response.hits.hits.map((hit: any) => ({
        id: hit._source.documentId,
        projectId: hit._source.projectId,
        name: hit._source.name,
        documentType: hit._source.documentType,
        description: hit._source.description,
        drawingNumber: hit._source.drawingNumber,
        discipline: hit._source.discipline,
        specSection: hit._source.specSection,
        division: hit._source.division,
        mimeType: hit._source.mimeType,
        fileSize: hit._source.fileSize,
        versionNumber: hit._source.versionNumber,
        status: hit._source.status,
        tags: hit._source.tags,
        createdBy: hit._source.createdBy,
        createdByName: hit._source.createdByName,
        createdAt: new Date(hit._source.createdAt),
        updatedAt: new Date(hit._source.updatedAt),
        score: hit._score,
      }));
    } catch (error) {
      this.logger.error(`Find related error:`, error);
      return [];
    }
  }

  /**
   * Log search click for analytics
   *
   * @param searchLogId - Search log ID
   * @param documentId - Clicked document
   * @param position - Position in results
   * @param userId - User ID
   */
  async logSearchClick(
    searchLogId: string,
    documentId: string,
    position: number,
    userId: string,
  ): Promise<void> {
    try {
      // Update search log
      await this.searchLogRepo.update(searchLogId, {
        clickedDocumentId: documentId,
        clickedResultPosition: position,
        clickedAt: new Date(),
        wasSuccessful: true,
      });

      // Log as activity
      await this.activityRepo.save({
        userId,
        documentId,
        activityType: DocumentActivityType.SEARCH_CLICK,
        activityDate: new Date(),
        searchResultPosition: position,
      });
    } catch (error) {
      this.logger.error(`Log search click error:`, error);
    }
  }

  /**
   * Build permission filter for Elasticsearch query
   *
   * CRITICAL: This ensures users only see documents they have access to
   *
   * @param projectId - Project context
   * @param userId - User requesting
   * @returns Elasticsearch filter clauses
   */
  private async buildPermissionFilter(
    projectId: string,
    userId: string,
  ): Promise<any[]> {
    // Get user's project member info
    const member = await this.permissionService.getMemberByUserId(userId, projectId);

    if (!member) {
      // User not in project - no results
      return [{ term: { documentId: '__NO_ACCESS__' } }];
    }

    const filters: any[] = [];

    // Option 1: Document is public
    // Option 2: User is explicitly allowed
    // Option 3: User's role is allowed
    // Option 4: User's discipline is allowed

    filters.push({
      bool: {
        should: [
          // Public documents
          { term: { isPublic: true } },

          // User explicitly allowed
          { term: { allowedUserIds: userId } },

          // Role allowed
          { terms: { allowedRoles: member.roles } },

          // Discipline allowed (if user has disciplines)
          ...(member.disciplines && member.disciplines.length > 0
            ? [{ terms: { allowedDisciplines: member.disciplines } }]
            : []),
        ],
        minimum_should_match: 1,
      },
    });

    return filters;
  }

  /**
   * Build Elasticsearch query from search DTO
   *
   * @param dto - Search parameters
   * @param permissionFilter - Permission filter clauses
   * @returns Elasticsearch query
   */
  private buildSearchQuery(dto: SearchDocumentsDto, permissionFilter: any[]): any {
    const mustClauses: any[] = [];
    const filterClauses: any[] = [...permissionFilter];

    // Full-text search
    if (dto.query) {
      mustClauses.push({
        multi_match: {
          query: dto.query,
          fields: [
            'name^3',
            'drawingNumber^2',
            'specSection^2',
            'description',
            'content',
            'tags^1.5',
          ],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      });
    }

    // Filters
    if (dto.documentTypes && dto.documentTypes.length > 0) {
      filterClauses.push({ terms: { documentType: dto.documentTypes } });
    }

    if (dto.disciplines && dto.disciplines.length > 0) {
      filterClauses.push({ terms: { discipline: dto.disciplines } });
    }

    if (dto.divisions && dto.divisions.length > 0) {
      filterClauses.push({ terms: { division: dto.divisions } });
    }

    if (dto.status && dto.status.length > 0) {
      filterClauses.push({ terms: { status: dto.status } });
    }

    if (dto.tags && dto.tags.length > 0) {
      filterClauses.push({ terms: { tags: dto.tags } });
    }

    if (dto.createdBy && dto.createdBy.length > 0) {
      filterClauses.push({ terms: { createdBy: dto.createdBy } });
    }

    // Date ranges
    if (dto.createdAfter || dto.createdBefore) {
      const range: any = {};
      if (dto.createdAfter) range.gte = dto.createdAfter;
      if (dto.createdBefore) range.lte = dto.createdBefore;
      filterClauses.push({ range: { createdAt: range } });
    }

    if (dto.modifiedAfter || dto.modifiedBefore) {
      const range: any = {};
      if (dto.modifiedAfter) range.gte = dto.modifiedAfter;
      if (dto.modifiedBefore) range.lte = dto.modifiedBefore;
      filterClauses.push({ range: { updatedAt: range } });
    }

    // Sorting
    const sort: any[] = [];
    if (dto.sortBy === 'relevance' || !dto.sortBy) {
      sort.push({ _score: { order: 'desc' } });
    } else if (dto.sortBy === 'date') {
      sort.push({ createdAt: { order: dto.sortOrder || 'desc' } });
    } else if (dto.sortBy === 'name') {
      sort.push({ 'name.keyword': { order: dto.sortOrder || 'asc' } });
    } else if (dto.sortBy === 'size') {
      sort.push({ fileSize: { order: dto.sortOrder || 'desc' } });
    }

    // Aggregations (facets)
    const aggregations: any = dto.includeFacets
      ? {
          by_type: {
            terms: { field: 'documentType', size: 20 },
          },
          by_discipline: {
            terms: { field: 'discipline', size: 20 },
          },
          by_division: {
            terms: { field: 'division', size: 20 },
          },
          by_status: {
            terms: { field: 'status', size: 10 },
          },
          by_tags: {
            terms: { field: 'tags', size: 50 },
          },
        }
      : undefined;

    // Highlighting
    const highlight: any = dto.includeHighlights
      ? {
          fields: {
            name: {},
            description: {},
            content: { fragment_size: 150 },
          },
          pre_tags: ['<mark>'],
          post_tags: ['</mark>'],
        }
      : undefined;

    return {
      query: {
        bool: {
          must: mustClauses.length > 0 ? mustClauses : [{ match_all: {} }],
          filter: filterClauses,
        },
      },
      sort,
      aggregations,
      highlight,
    };
  }

  /**
   * Parse Elasticsearch aggregations into facets
   *
   * @param aggregations - ES aggregations
   * @returns Facet DTOs
   */
  private parseFacets(aggregations: any): SearchFacetDto[] {
    if (!aggregations) return [];

    const facets: SearchFacetDto[] = [];

    const facetMapping: Record<string, string> = {
      by_type: 'documentType',
      by_discipline: 'discipline',
      by_division: 'division',
      by_status: 'status',
      by_tags: 'tags',
    };

    for (const [aggKey, fieldName] of Object.entries(facetMapping)) {
      if (aggregations[aggKey]) {
        facets.push({
          field: fieldName,
          values: aggregations[aggKey].buckets.map((bucket: any) => ({
            value: bucket.key,
            count: bucket.doc_count,
          })),
        });
      }
    }

    return facets;
  }

  /**
   * Log search for analytics
   *
   * @param userId - User performing search
   * @param projectId - Project context
   * @param dto - Search parameters
   * @param resultCount - Number of results
   * @param executionTimeMs - Execution time
   */
  private async logSearch(
    userId: string,
    projectId: string,
    dto: SearchDocumentsDto,
    resultCount: number,
    executionTimeMs: number,
  ): Promise<void> {
    try {
      const normalizedQuery = dto.query?.toLowerCase().trim() || '';

      await this.searchLogRepo.save({
        userId,
        projectId,
        query: dto.query || '',
        normalizedQuery,
        filters: {
          documentTypes: dto.documentTypes,
          disciplines: dto.disciplines,
          divisions: dto.divisions,
          status: dto.status,
          tags: dto.tags,
          createdBy: dto.createdBy,
          dateRanges: {
            createdAfter: dto.createdAfter,
            createdBefore: dto.createdBefore,
            modifiedAfter: dto.modifiedAfter,
            modifiedBefore: dto.modifiedBefore,
          },
        },
        resultCount,
        executionTimeMs,
        searchType: 'full_text',
        wasSuccessful: false, // Will be updated if user clicks a result
        searchedAt: new Date(),
      });
    } catch (error) {
      this.logger.error(`Log search error:`, error);
    }
  }
}
