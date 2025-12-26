import { Project } from '../../projects/entities/project.entity';

/**
 * Pagination DTO
 */
export class PaginationDto {
  page!: number;
  pageSize!: number;
  totalItems!: number;
  totalPages!: number;
  hasNext!: boolean;
  hasPrevious!: boolean;
}

/**
 * Facet DTO
 */
export class FacetDto {
  field!: string;
  values!: Record<string, number>;
}

/**
 * Search Results DTO
 *
 * Response structure for search queries
 */
export class SearchResultsDto {
  /**
   * Original search query
   */
  query?: string;

  /**
   * Search results
   */
  results!: Project[];

  /**
   * Pagination information
   */
  pagination!: PaginationDto;

  /**
   * Facets for filtering
   */
  facets?: FacetDto[];

  /**
   * Execution time in milliseconds
   */
  executionTime!: number;

  /**
   * Whether results were cached
   */
  cached!: boolean;
}