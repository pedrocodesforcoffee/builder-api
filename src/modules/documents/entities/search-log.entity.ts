import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Search Log Entity
 *
 * Tracks all search queries for analytics and insights.
 *
 * Analytics Use Cases:
 * - Popular search terms
 * - Zero-result queries (identify missing content/tags)
 * - Search performance metrics
 * - User behavior patterns
 * - CTR (Click-Through Rate) analysis
 *
 * Privacy Note:
 * - Logs are anonymized after 90 days (userId nullified)
 * - Aggregate analytics retained indefinitely
 */
@Entity('search_logs')
@Index(['projectId', 'searchedAt'])
@Index(['userId', 'searchedAt'])
@Index(['query', 'projectId'])
@Index(['resultCount', 'searchedAt']) // For zero-result analysis
export class SearchLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { nullable: true })
  userId!: string | null; // Nullable for anonymous search / privacy

  @Column('uuid')
  @Index()
  projectId!: string;

  // Search query
  @Column('text')
  query!: string;

  @Column('text', { nullable: true })
  normalizedQuery!: string | null; // Lowercased, trimmed for analytics

  // Filters applied
  @Column('jsonb', { nullable: true })
  filters!: {
    documentTypes?: string[];
    disciplines?: string[];
    divisions?: string[];
    status?: string[];
    dateRanges?: any;
    tags?: string[];
    [key: string]: any;
  } | null;

  // Results
  @Column('int')
  resultCount!: number;

  @Column('int', { nullable: true })
  executionTimeMs!: number | null;

  // User interaction
  @Column('int', { nullable: true })
  clickedResultPosition!: number | null; // Position of clicked result (if any)

  @Column('uuid', { nullable: true })
  clickedDocumentId!: string | null; // Document that was clicked (if any)

  @Column('timestamp', { nullable: true })
  clickedAt!: Date | null;

  // Context
  @Column('varchar', { length: 255, nullable: true })
  ipAddress!: string | null;

  @Column('text', { nullable: true })
  userAgent!: string | null;

  @Column('varchar', { length: 50, nullable: true })
  searchType!: string | null; // 'full_text', 'autocomplete', 'faceted', etc.

  @Column('boolean', { default: false })
  wasSuccessful!: boolean; // Did user click a result?

  @CreateDateColumn()
  @Index()
  searchedAt!: Date;

  // Privacy: Auto-anonymize after 90 days
  @Column('boolean', { default: false })
  anonymized!: boolean;

  @Column('timestamp', { nullable: true })
  anonymizedAt!: Date | null;
}
