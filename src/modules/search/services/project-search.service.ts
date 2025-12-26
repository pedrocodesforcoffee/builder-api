import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, Brackets } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { SearchCriteriaDto } from '../dto/search-criteria.dto';
import { SearchResultsDto, PaginationDto } from '../dto/search-results.dto';
import { ProjectStatus } from '../../projects/enums/project-status.enum';
import { ProjectType } from '../../projects/enums/project-type.enum';
import { DeliveryMethod } from '../../projects/enums/delivery-method.enum';
import { SortField } from '../enums/sort-field.enum';

/**
 * Project Search Service
 *
 * Handles complex project search queries with filtering, sorting, and RBAC
 */
@Injectable()
export class ProjectSearchService {
  private readonly logger = new Logger(ProjectSearchService.name);
  private readonly searchTimeout = 5000; // 5 seconds

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  /**
   * Main search method
   */
  async search(
    criteria: SearchCriteriaDto,
    userId: string,
  ): Promise<SearchResultsDto> {
    const startTime = Date.now();

    try {
      // Build query
      const queryBuilder = this.buildSearchQuery(criteria, userId);

      // Apply sorting
      this.applySorting(queryBuilder, criteria);

      // Get total count
      const totalItems = await queryBuilder.getCount();

      // Apply pagination
      const page = criteria.page || 1;
      const pageSize = criteria.pageSize || 20;
      queryBuilder
        .skip((page - 1) * pageSize)
        .limit(pageSize);

      // Execute query with timeout
      const results = await Promise.race([
        queryBuilder.getMany(),
        new Promise<Project[]>((_, reject) =>
          setTimeout(() => reject(new Error('Search timeout')), this.searchTimeout),
        ),
      ]);

      const executionTime = Date.now() - startTime;

      // Log slow queries
      if (executionTime > 1000) {
        this.logger.warn(
          `Slow query detected: ${executionTime}ms for criteria: ${JSON.stringify(criteria)}`,
        );
      }

      return this.formatResults(results, criteria, executionTime, totalItems);
    } catch (error) {
      this.logger.error(`Search error: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  /**
   * Search all results without pagination (for exports)
   */
  async searchAll(
    criteria: SearchCriteriaDto,
    maxRecords: number,
  ): Promise<Project[]> {
    const queryBuilder = this.buildSearchQuery(criteria, null);
    this.applySorting(queryBuilder, criteria);
    queryBuilder.limit(maxRecords);
    return queryBuilder.getMany();
  }

  /**
   * Build search query with all filters
   */
  buildSearchQuery(
    criteria: SearchCriteriaDto,
    userId: string | null,
  ): SelectQueryBuilder<Project> {
    const qb = this.projectRepository.createQueryBuilder('project');

    // Apply RBAC if userId provided
    if (userId) {
      this.applyAccessControl(qb, userId);
    }

    // Full-text search (using ILIKE for now)
    if (criteria.q) {
      const searchQuery = this.parseSearchQuery(criteria.q);
      qb.andWhere(
        new Brackets((qb) => {
          qb.where('project.name ILIKE :query', { query: `%${searchQuery}%` })
            .orWhere('project.number ILIKE :query', { query: `%${searchQuery}%` })
            .orWhere('project.description ILIKE :query', { query: `%${searchQuery}%` })
            .orWhere('project.address ILIKE :query', { query: `%${searchQuery}%` })
            .orWhere('project.city ILIKE :query', { query: `%${searchQuery}%` });
        }),
      );
    }

    // Project number filter
    if (criteria.projectNumber) {
      qb.andWhere('project.number ILIKE :projectNumber', {
        projectNumber: `%${criteria.projectNumber}%`,
      });
    }

    // Project name filter
    if (criteria.name) {
      qb.andWhere('project.name ILIKE :name', {
        name: `%${criteria.name}%`,
      });
    }

    // Status filter
    if (criteria.status && criteria.status.length > 0) {
      qb.andWhere('project.status IN (:...status)', {
        status: criteria.status,
      });
    }

    // Type filter
    if (criteria.type && criteria.type.length > 0) {
      qb.andWhere('project.type IN (:...type)', {
        type: criteria.type,
      });
    }

    // Delivery method filter
    if (criteria.deliveryMethod && criteria.deliveryMethod.length > 0) {
      qb.andWhere('project.deliveryMethod IN (:...deliveryMethod)', {
        deliveryMethod: criteria.deliveryMethod,
      });
    }

    // Organization filter
    if (criteria.organizationId) {
      qb.andWhere('project.organizationId = :organizationId', {
        organizationId: criteria.organizationId,
      });
    }

    // Location filter
    if (criteria.location) {
      qb.andWhere(
        new Brackets((qb) => {
          qb.where('project.address ILIKE :location', {
            location: `%${criteria.location}%`,
          })
            .orWhere('project.city ILIKE :location', {
              location: `%${criteria.location}%`,
            })
            .orWhere('project.state ILIKE :location', {
              location: `%${criteria.location}%`,
            });
        }),
      );
    }

    // Spatial search (near location)
    if (criteria.near) {
      const { lat, lng, radiusKm } = this.parseNearQuery(criteria.near);
      if (lat && lng && radiusKm) {
        // Simple distance calculation using Haversine formula approximation
        // Note: This assumes lat/lng columns exist on Project entity
        qb.andWhere(
          `(
            6371 * acos(
              cos(radians(:lat)) *
              cos(radians(project.latitude)) *
              cos(radians(project.longitude) - radians(:lng)) +
              sin(radians(:lat)) *
              sin(radians(project.latitude))
            )
          ) <= :radius`,
          { lat, lng, radius: radiusKm },
        );
      }
    }

    // Budget filters
    if (criteria.budgetMin !== undefined) {
      qb.andWhere('project.originalContract >= :budgetMin', {
        budgetMin: criteria.budgetMin,
      });
    }
    if (criteria.budgetMax !== undefined) {
      qb.andWhere('project.originalContract <= :budgetMax', {
        budgetMax: criteria.budgetMax,
      });
    }

    // Date filters
    if (criteria.startDateFrom) {
      qb.andWhere('project.startDate >= :startDateFrom', {
        startDateFrom: criteria.startDateFrom,
      });
    }
    if (criteria.startDateTo) {
      qb.andWhere('project.startDate <= :startDateTo', {
        startDateTo: criteria.startDateTo,
      });
    }
    if (criteria.endDateFrom) {
      qb.andWhere('project.endDate >= :endDateFrom', {
        endDateFrom: criteria.endDateFrom,
      });
    }
    if (criteria.endDateTo) {
      qb.andWhere('project.endDate <= :endDateTo', {
        endDateTo: criteria.endDateTo,
      });
    }

    // Percent complete filters
    if (criteria.percentCompleteMin !== undefined) {
      qb.andWhere('project.percentComplete >= :percentCompleteMin', {
        percentCompleteMin: criteria.percentCompleteMin,
      });
    }
    if (criteria.percentCompleteMax !== undefined) {
      qb.andWhere('project.percentComplete <= :percentCompleteMax', {
        percentCompleteMax: criteria.percentCompleteMax,
      });
    }

    // Tags filter (ANY match)
    if (criteria.tags && criteria.tags.length > 0) {
      qb.andWhere('project.tags && ARRAY[:...tags]::text[]', {
        tags: criteria.tags,
      });
    }

    // Tags filter (ALL match)
    if (criteria.tagsAll && criteria.tagsAll.length > 0) {
      qb.andWhere('project.tags @> ARRAY[:...tagsAll]::text[]', {
        tagsAll: criteria.tagsAll,
      });
    }

    // Custom fields filter
    if (criteria.customFields) {
      Object.entries(criteria.customFields).forEach(([key, value]) => {
        qb.andWhere(`project.customFields->>'${key}' = :${key}`, {
          [key]: value,
        });
      });
    }

    // Include archived filter
    if (!criteria.includeArchived) {
      // Assuming ARCHIVED is a status - exclude it
      qb.andWhere('project.status != :archived', {
        archived: ProjectStatus.COMPLETE,
      });
    }

    return qb;
  }

  /**
   * Apply sorting to query
   */
  private applySorting(
    qb: SelectQueryBuilder<Project>,
    criteria: SearchCriteriaDto,
  ): void {
    const sortBy = criteria.sortBy || SortField.RELEVANCE;
    const sortOrder = criteria.sortOrder || 'desc';

    switch (sortBy) {
      case SortField.NAME:
        qb.orderBy('project.name', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case SortField.START_DATE:
        qb.orderBy('project.startDate', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case SortField.END_DATE:
        qb.orderBy('project.endDate', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case SortField.BUDGET:
        qb.orderBy('project.originalContract', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case SortField.PERCENT_COMPLETE:
        qb.orderBy('project.percentComplete', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case SortField.DISTANCE:
        // Distance sorting requires spatial calculation in WHERE clause
        // Will be ordered by calculated distance if near query is present
        break;
      case SortField.RELEVANCE:
      default:
        // Default to creation date for now
        qb.orderBy('project.createdAt', 'DESC');
        break;
    }
  }

  /**
   * Apply access control based on user permissions
   */
  private applyAccessControl(
    qb: SelectQueryBuilder<Project>,
    userId: string,
  ): void {
    // For now, implement basic organization-based access control
    // Users can only see projects from their organizations
    // TODO: Implement full RBAC with project-level permissions
    qb.innerJoin(
      'organization_members',
      'om',
      'om.organization_id = project.organizationId AND om.user_id = :userId',
      { userId },
    );
  }

  /**
   * Parse near query string
   */
  private parseNearQuery(near: string): {
    lat?: number;
    lng?: number;
    radiusKm?: number;
  } {
    try {
      const parts = near.split(',');
      if (parts.length !== 3) return {};

      return {
        lat: parseFloat(parts[0]),
        lng: parseFloat(parts[1]),
        radiusKm: parseFloat(parts[2]),
      };
    } catch {
      return {};
    }
  }

  /**
   * Parse search query for special operators
   */
  private parseSearchQuery(query: string): string {
    // Remove special characters that could break SQL
    return query.replace(/[%_]/g, '\\$&');
  }

  /**
   * Format search results
   */
  private formatResults(
    results: Project[],
    criteria: SearchCriteriaDto,
    executionTime: number,
    totalItems: number,
  ): SearchResultsDto {
    const page = criteria.page || 1;
    const pageSize = criteria.pageSize || 20;
    const totalPages = Math.ceil(totalItems / pageSize);

    const pagination: PaginationDto = {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };

    return {
      query: criteria.q,
      results,
      pagination,
      executionTime,
      cached: false,
    };
  }
}