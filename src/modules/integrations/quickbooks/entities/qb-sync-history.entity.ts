import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from '../../../organizations/entities/organization.entity';
import { User } from '../../../users/entities/user.entity';
import { QBEntityType, QBSyncDirection, QBSyncStatus } from '../enums';

/**
 * QuickBooks Sync History Entity
 *
 * Audit trail of all synchronization operations.
 * Tracks what was synced, when, by whom, and the result.
 */
@Entity('qb_sync_history')
@Index(['organizationId', 'createdAt'])
@Index(['platformEntityId'])
@Index(['qbEntityType', 'qbEntityId'])
export class QBSyncHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @Column({ type: 'varchar', length: 50, name: 'sync_type', nullable: true })
  syncType?: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ';

  @Column({ type: 'varchar', length: 50, name: 'sync_direction' })
  syncDirection!: QBSyncDirection;

  @Column({ type: 'varchar', length: 50, name: 'qb_entity_type' })
  qbEntityType!: QBEntityType;

  @Column({ type: 'varchar', length: 100, name: 'qb_entity_id', nullable: true })
  qbEntityId?: string;

  @Column({ type: 'varchar', length: 100, name: 'platform_entity_type' })
  platformEntityType!: string;

  @Column({ type: 'uuid', name: 'platform_entity_id', nullable: true })
  platformEntityId?: string;

  @Column({ type: 'varchar', length: 50, default: QBSyncStatus.PENDING })
  status!: QBSyncStatus;

  @Column({ type: 'timestamp with time zone', name: 'started_at' })
  startedAt!: Date;

  @Column({ type: 'timestamp with time zone', name: 'completed_at', nullable: true })
  completedAt?: Date;

  @Column({ type: 'integer', name: 'duration_ms', nullable: true })
  durationMs?: number;

  @Column({ type: 'integer', name: 'total_records', default: 0 })
  totalRecords!: number;

  @Column({ type: 'integer', name: 'success_count', default: 0 })
  successCount!: number;

  @Column({ type: 'integer', name: 'failure_count', default: 0 })
  failureCount!: number;

  @Column({ type: 'uuid', name: 'initiated_by_user_id', nullable: true })
  initiatedByUserId?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'initiated_by_user_id' })
  initiatedByUser?: User;

  @Column({ type: 'varchar', length: 50, name: 'trigger_source' })
  triggerSource!: 'MANUAL' | 'SCHEDULED' | 'EVENT' | 'WEBHOOK' | 'RETRY';

  @Column({ type: 'jsonb', name: 'request_payload', nullable: true })
  requestPayload?: Record<string, any>;

  @Column({ type: 'jsonb', name: 'response_payload', nullable: true })
  responsePayload?: Record<string, any>;

  @Column({ type: 'text', name: 'error_message', nullable: true })
  errorMessage?: string;

  @Column({ type: 'varchar', length: 100, name: 'error_code', nullable: true })
  errorCode?: string;

  @Column({ type: 'integer', name: 'retry_count', default: 0 })
  retryCount!: number;

  @Column({ type: 'uuid', name: 'parent_sync_id', nullable: true })
  parentSyncId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
