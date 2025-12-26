import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from '../../../organizations/entities/organization.entity';
import { QBEntityType } from '../enums';

/**
 * QuickBooks Sync Error Entity
 *
 * Tracks sync errors that require attention or retry.
 * Provides context for troubleshooting and conflict resolution.
 */
@Entity('qb_sync_errors')
@Index(['organizationId', 'resolved'])
@Index(['platformEntityId'])
export class QBSyncError {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @Column({ type: 'uuid', name: 'sync_history_id', nullable: true })
  syncHistoryId?: string;

  @Column({ type: 'varchar', length: 50, name: 'error_type' })
  errorType!: 'AUTH' | 'RATE_LIMIT' | 'VALIDATION' | 'CONFLICT' | 'NETWORK' | 'MAPPING' | 'OTHER';

  @Column({ type: 'varchar', length: 100, name: 'error_code', nullable: true })
  errorCode?: string;

  @Column({ type: 'text', name: 'error_message' })
  errorMessage!: string;

  @Column({ type: 'varchar', length: 50, name: 'qb_entity_type' })
  qbEntityType!: QBEntityType;

  @Column({ type: 'varchar', length: 100, name: 'qb_entity_id', nullable: true })
  qbEntityId?: string;

  @Column({ type: 'varchar', length: 100, name: 'platform_entity_type' })
  platformEntityType!: string;

  @Column({ type: 'uuid', name: 'platform_entity_id' })
  platformEntityId!: string;

  @Column({ type: 'varchar', length: 50, name: 'sync_direction' })
  syncDirection!: 'TO_QB' | 'FROM_QB';

  @Column({ type: 'jsonb', name: 'error_details', nullable: true })
  errorDetails?: Record<string, any>;

  @Column({ type: 'jsonb', name: 'context_data', nullable: true })
  contextData?: Record<string, any>;

  @Column({ type: 'integer', name: 'retry_count', default: 0 })
  retryCount!: number;

  @Column({ type: 'integer', name: 'max_retries', default: 3 })
  maxRetries!: number;

  @Column({ type: 'timestamp with time zone', name: 'next_retry_at', nullable: true })
  nextRetryAt?: Date;

  @Column({ type: 'timestamp with time zone', name: 'last_retry_at', nullable: true })
  lastRetryAt?: Date;

  @Column({ type: 'boolean', default: false })
  resolved!: boolean;

  @Column({ type: 'varchar', length: 50, name: 'resolution_type', nullable: true })
  resolutionType?: 'AUTO_RETRY' | 'MANUAL_FIX' | 'IGNORED' | 'DELETED';

  @Column({ type: 'text', name: 'resolution_notes', nullable: true })
  resolutionNotes?: string;

  @Column({ type: 'timestamp with time zone', name: 'resolved_at', nullable: true })
  resolvedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
