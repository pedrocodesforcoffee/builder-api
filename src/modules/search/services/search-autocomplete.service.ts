import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

/**
 * Search Autocomplete Service
 *
 * Provides autocomplete suggestions for various fields
 */
@Injectable()
export class SearchAutocompleteService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  /**
   * Main autocomplete method
   */
  async autocomplete(
    field: string,
    query: string,
    limit: number = 10,
    userId: string,
  ): Promise<any[]> {
    switch (field.toLowerCase()) {
      case 'name':
        return this.autocompleteProjectName(query, limit, userId);
      case 'number':
        return this.autocompleteProjectNumber(query, limit, userId);
      case 'location':
        return this.autocompleteLocation(query, limit, userId);
      case 'tags':
        return this.autocompleteTags(query, limit, userId);
      default:
        return [];
    }
  }

  /**
   * Autocomplete project names
   */
  async autocompleteProjectName(
    query: string,
    limit: number,
    userId: string,
  ): Promise<any[]> {
    const qb = this.projectRepository
      .createQueryBuilder('project')
      .select(['project.id', 'project.name', 'project.number'])
      .where('project.name ILIKE :query', { query: `${query}%` });

    // Apply RBAC
    this.applyAccessControl(qb, userId);

    qb.orderBy('project.name', 'ASC').limit(limit);

    const results = await qb.getMany();

    return this.formatSuggestions(results, 'name', query);
  }

  /**
   * Autocomplete project numbers
   */
  async autocompleteProjectNumber(
    query: string,
    limit: number,
    userId: string,
  ): Promise<any[]> {
    const qb = this.projectRepository
      .createQueryBuilder('project')
      .select(['project.id', 'project.number', 'project.name'])
      .where('project.number ILIKE :query', { query: `${query}%` });

    // Apply RBAC
    this.applyAccessControl(qb, userId);

    qb.orderBy('project.number', 'ASC').limit(limit);

    const results = await qb.getMany();

    return this.formatSuggestions(results, 'number', query);
  }

  /**
   * Autocomplete locations
   */
  async autocompleteLocation(
    query: string,
    limit: number,
    userId: string,
  ): Promise<any[]> {
    // Get unique cities
    const qb = this.projectRepository
      .createQueryBuilder('project')
      .select('DISTINCT project.city', 'city')
      .addSelect('project.state', 'state')
      .where('project.city ILIKE :query', { query: `${query}%` })
      .orWhere('project.state ILIKE :query', { query: `${query}%` })
      .orWhere('project.zip ILIKE :query', { query: `${query}%` });

    // Apply RBAC
    this.applyAccessControl(qb, userId);

    qb.limit(limit);

    const results = await qb.getRawMany();

    return results.map((r) => ({
      value: r.city,
      label: `${r.city}${r.state ? ', ' + r.state : ''}`,
      type: 'location',
    }));
  }

  /**
   * Autocomplete tags
   */
  async autocompleteTags(
    query: string,
    limit: number,
    userId: string,
  ): Promise<any[]> {
    // Get all unique tags
    const qb = this.projectRepository
      .createQueryBuilder('project')
      .select('project.tags', 'tags')
      .where('project.tags IS NOT NULL');

    // Apply RBAC
    this.applyAccessControl(qb, userId);

    const results = await qb.getMany();

    // Extract and deduplicate tags
    const allTags = new Set<string>();
    results.forEach((project) => {
      if (project.tags) {
        project.tags.forEach((tag) => {
          if (tag.toLowerCase().includes(query.toLowerCase())) {
            allTags.add(tag);
          }
        });
      }
    });

    // Convert to array and limit
    const matchingTags = Array.from(allTags)
      .sort()
      .slice(0, limit);

    return matchingTags.map((tag) => ({
      value: tag,
      label: tag,
      type: 'tag',
    }));
  }

  /**
   * Format suggestions for response
   */
  private formatSuggestions(
    results: Project[],
    field: string,
    query: string,
  ): any[] {
    return results.map((project) => {
      const value = (project as any)[field];
      return {
        value,
        label: field === 'name' ? `${project.name} (${project.number})` : value,
        id: project.id,
        type: field,
      };
    });
  }

  /**
   * Apply access control to query builder
   */
  private applyAccessControl(qb: any, userId: string): void {
    // Basic organization-based access control
    // TODO: Implement full RBAC
    qb.innerJoin(
      'organization_members',
      'om',
      'om.organization_id = project.organizationId AND om.user_id = :userId',
      { userId },
    );
  }
}