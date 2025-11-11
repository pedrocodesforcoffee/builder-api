import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { SearchCriteriaDto } from '../dto/search-criteria.dto';
import { ProjectStatus } from '../../projects/enums/project-status.enum';
import { ProjectType } from '../../projects/enums/project-type.enum';
import { DeliveryMethod } from '../../projects/enums/delivery-method.enum';

/**
 * Faceted Search Service
 *
 * Generates facets (aggregated counts) for search filters
 */
@Injectable()
export class FacetedSearchService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  /**
   * Generate all facets for search results
   */
  async generateFacets(
    criteria: SearchCriteriaDto,
    userId: string,
  ): Promise<any> {
    const baseCriteria = { ...criteria };

    // Generate facets for each field
    const [status, type, deliveryMethod, budget, tags] = await Promise.all([
      this.getStatusFacets(baseCriteria, userId),
      this.getTypeFacets(baseCriteria, userId),
      this.getDeliveryMethodFacets(baseCriteria, userId),
      this.getBudgetRangeFacets(baseCriteria, userId),
      this.getTagsFacets(baseCriteria, userId),
    ]);

    return {
      status,
      type,
      deliveryMethod,
      budget,
      tags,
    };
  }

  /**
   * Get status facets
   */
  async getStatusFacets(
    criteria: SearchCriteriaDto,
    userId: string,
  ): Promise<Record<string, number>> {
    // Remove status filter from criteria to get all counts
    const { status: _, ...baseCriteria } = criteria;

    const qb = this.buildBaseQuery(baseCriteria, userId);

    const results = await qb
      .select('project.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('project.status')
      .getRawMany();

    const facets: Record<string, number> = {};
    results.forEach((r: any) => {
      facets[r.status] = parseInt(r.count);
    });

    // Ensure all statuses are present
    Object.values(ProjectStatus).forEach((status) => {
      if (!facets[status]) {
        facets[status] = 0;
      }
    });

    return facets;
  }

  /**
   * Get type facets
   */
  async getTypeFacets(
    criteria: SearchCriteriaDto,
    userId: string,
  ): Promise<Record<string, number>> {
    // Remove type filter from criteria
    const { type: _, ...baseCriteria } = criteria;

    const qb = this.buildBaseQuery(baseCriteria, userId);

    const results = await qb
      .select('project.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('project.type')
      .getRawMany();

    const facets: Record<string, number> = {};
    results.forEach((r: any) => {
      facets[r.type] = parseInt(r.count);
    });

    // Ensure all types are present
    Object.values(ProjectType).forEach((type) => {
      if (!facets[type]) {
        facets[type] = 0;
      }
    });

    return facets;
  }

  /**
   * Get delivery method facets
   */
  async getDeliveryMethodFacets(
    criteria: SearchCriteriaDto,
    userId: string,
  ): Promise<Record<string, number>> {
    // Remove delivery method filter from criteria
    const { deliveryMethod: _, ...baseCriteria } = criteria;

    const qb = this.buildBaseQuery(baseCriteria, userId);

    const results = await qb
      .select('project.deliveryMethod', 'deliveryMethod')
      .addSelect('COUNT(*)', 'count')
      .where('project.deliveryMethod IS NOT NULL')
      .groupBy('project.deliveryMethod')
      .getRawMany();

    const facets: Record<string, number> = {};
    results.forEach((r: any) => {
      facets[r.deliveryMethod] = parseInt(r.count);
    });

    // Ensure all delivery methods are present
    Object.values(DeliveryMethod).forEach((method) => {
      if (!facets[method]) {
        facets[method] = 0;
      }
    });

    return facets;
  }

  /**
   * Get budget range facets
   */
  async getBudgetRangeFacets(
    criteria: SearchCriteriaDto,
    userId: string,
  ): Promise<Record<string, number>> {
    // Remove budget filters from criteria
    const { budgetMin: _, budgetMax: __, ...baseCriteria } = criteria;

    const qb = this.buildBaseQuery(baseCriteria, userId);

    // Define budget ranges
    const ranges = [
      { label: 'Under $100K', min: 0, max: 100000 },
      { label: '$100K - $500K', min: 100000, max: 500000 },
      { label: '$500K - $1M', min: 500000, max: 1000000 },
      { label: '$1M - $5M', min: 1000000, max: 5000000 },
      { label: '$5M - $10M', min: 5000000, max: 10000000 },
      { label: 'Over $10M', min: 10000000, max: null },
    ];

    const facets: Record<string, number> = {};

    for (const range of ranges) {
      const rangeQb = qb.clone();

      rangeQb.andWhere('project.originalContract >= :min', { min: range.min });
      if (range.max !== null) {
        rangeQb.andWhere('project.originalContract < :max', { max: range.max });
      }

      const count = await rangeQb.getCount();
      facets[range.label] = count;
    }

    return facets;
  }

  /**
   * Get tags facets
   */
  async getTagsFacets(
    criteria: SearchCriteriaDto,
    userId: string,
  ): Promise<Record<string, number>> {
    // Remove tags filters from criteria
    const { tags: _, tagsAll: __, ...baseCriteria } = criteria;

    const qb = this.buildBaseQuery(baseCriteria, userId);

    // Get all projects with tags
    const projects = await qb
      .select(['project.tags'])
      .where('project.tags IS NOT NULL')
      .getMany();

    // Count tag occurrences
    const tagCounts: Record<string, number> = {};

    projects.forEach((project: any) => {
      if (project.tags) {
        project.tags.forEach((tag: any) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    // Sort by count and return top 20
    const sortedTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    const facets: Record<string, number> = {};
    sortedTags.forEach(([tag, count]) => {
      facets[tag] = count;
    });

    return facets;
  }

  /**
   * Build base query with common filters
   */
  private buildBaseQuery(
    criteria: SearchCriteriaDto,
    userId: string,
  ): any {
    const qb = this.projectRepository.createQueryBuilder('project');

    // Apply RBAC
    this.applyAccessControl(qb, userId);

    // Apply basic filters (excluding the facet being calculated)
    if (criteria.q) {
      qb.andWhere(
        '(project.name ILIKE :q OR project.number ILIKE :q OR project.description ILIKE :q)',
        { q: `%${criteria.q}%` },
      );
    }

    if (criteria.organizationId) {
      qb.andWhere('project.organizationId = :organizationId', {
        organizationId: criteria.organizationId,
      });
    }

    if (criteria.location) {
      qb.andWhere(
        '(project.address ILIKE :location OR project.city ILIKE :location OR project.state ILIKE :location)',
        { location: `%${criteria.location}%` },
      );
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

    // Include the specific filters that weren't excluded
    if (criteria.status && criteria.status.length > 0) {
      qb.andWhere('project.status IN (:...status)', {
        status: criteria.status,
      });
    }

    if (criteria.type && criteria.type.length > 0) {
      qb.andWhere('project.type IN (:...type)', {
        type: criteria.type,
      });
    }

    return qb;
  }

  /**
   * Apply access control to query
   */
  private applyAccessControl(qb: any, userId: string): void {
    // Basic organization-based access control
    qb.innerJoin(
      'organization_members',
      'om',
      'om.organization_id = project.organizationId AND om.user_id = :userId',
      { userId },
    );
  }
}