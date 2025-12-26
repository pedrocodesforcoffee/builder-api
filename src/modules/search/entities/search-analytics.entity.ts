import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';

/**
 * Search Analytics Entity
 *
 * Tracks search queries and their performance for analytics
 *
 * @entity search_analytics
 */
@Entity('search_analytics')
@Index('IDX_search_analytics_user', ['userId'])
@Index('IDX_search_analytics_organization', ['organizationId'])
@Index('IDX_search_analytics_timestamp', ['timestamp'])
@Index('IDX_search_analytics_query', ['query'])
export class SearchAnalytics {
  /**
   * Unique identifier for the analytics record (UUID v4)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * User ID who performed the search
   */
  @Column({
    type: 'uuid',
    name: 'user_id',
    nullable: true,
  })
  userId?: string;

  /**
   * Organization ID where the search was performed
   */
  @Column({
    type: 'uuid',
    name: 'organization_id',
    nullable: true,
  })
  organizationId?: string;

  /**
   * Search query text
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  query?: string;

  /**
   * Search criteria as JSONB
   */
  @Column({
    type: 'jsonb',
    nullable: false,
  })
  criteria!: Record<string, any>;

  /**
   * Number of results returned
   */
  @Column({
    type: 'integer',
    nullable: false,
    name: 'result_count',
  })
  resultCount!: number;

  /**
   * Execution time in milliseconds
   */
  @Column({
    type: 'integer',
    nullable: false,
    name: 'execution_time',
  })
  executionTime!: number;

  /**
   * IDs of results clicked by the user
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    default: [],
    name: 'clicked_result_ids',
  })
  clickedResultIds?: string[];

  /**
   * Position of the clicked result
   */
  @Column({
    type: 'integer',
    nullable: true,
    name: 'clicked_position',
  })
  clickedPosition?: number;

  /**
   * Whether the results were served from cache
   */
  @Column({
    type: 'boolean',
    default: false,
    nullable: false,
    name: 'was_cached',
  })
  wasCached!: boolean;

  /**
   * Timestamp when the search was performed
   */
  @Column({
    type: 'timestamp',
    nullable: false,
  })
  timestamp!: Date;

  /**
   * User agent string
   */
  @Column({
    type: 'text',
    nullable: true,
    name: 'user_agent',
  })
  userAgent?: string;

  /**
   * IP address of the requester
   */
  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
    name: 'ip_address',
  })
  ipAddress?: string;

  // ==================== RELATIONSHIPS ====================

  /**
   * User who performed the search
   */
  @ManyToOne(() => User, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  /**
   * Organization where the search was performed
   */
  @ManyToOne(() => Organization, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'organization_id' })
  organization?: Organization;
}