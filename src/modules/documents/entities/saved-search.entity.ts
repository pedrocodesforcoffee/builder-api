import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Alert frequency options for saved searches
 */
export enum AlertFrequency {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  INSTANT = 'instant',
}

/**
 * Saved Search Entity
 *
 * Stores user-defined searches with optional alert notifications.
 *
 * Features:
 * - Save complex search queries for re-use
 * - Alert notifications when new matching documents appear
 * - Flexible alert frequency (instant, daily, weekly)
 * - Track last execution and new result counts
 *
 * Alert Processing:
 * - Instant: Triggered immediately when documents are indexed
 * - Daily: Batch processed at configured time
 * - Weekly: Batch processed on configured day
 *
 * Used for:
 * - Quick access to common searches
 * - Document monitoring/tracking
 * - Automated notifications
 */
@Entity('document_saved_searches')
@Index(['userId', 'projectId'])
@Index(['alertsEnabled', 'alertFrequency', 'lastAlertAt'])
export class SavedSearch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  @Index()
  userId!: string;

  @Column('uuid')
  @Index()
  projectId!: string;

  @Column('varchar', { length: 255 })
  name!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  // Search parameters (stored as JSON)
  @Column('jsonb')
  searchParams!: {
    query?: string;
    documentTypes?: string[];
    disciplines?: string[];
    divisions?: string[];
    status?: string[];
    createdAfter?: string;
    createdBefore?: string;
    modifiedAfter?: string;
    modifiedBefore?: string;
    tags?: string[];
    createdBy?: string[];
    [key: string]: any;
  };

  // Alert settings
  @Column('boolean', { default: false })
  alertsEnabled!: boolean;

  @Column({
    type: 'varchar',
    length: 20,
    default: AlertFrequency.NONE,
  })
  alertFrequency!: AlertFrequency;

  @Column('timestamp', { nullable: true })
  lastAlertAt!: Date | null;

  @Column('timestamp', { nullable: true })
  lastExecutedAt!: Date | null;

  @Column('int', { default: 0 })
  lastResultCount!: number;

  @Column('int', { default: 0 })
  newResultsSinceLastAlert!: number;

  // Execution tracking
  @Column('int', { default: 0 })
  executionCount!: number;

  @Column('timestamp', { nullable: true })
  lastResultAt!: Date | null; // When this search last returned results

  // Organization
  @Column('boolean', { default: false })
  isPinned!: boolean;

  @Column('simple-array', { nullable: true })
  tags!: string[] | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
