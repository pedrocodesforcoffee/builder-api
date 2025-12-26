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
import { QBEntityType, QBSyncStatus, QBSyncDirection } from '../enums';

/**
 * QuickBooks Entity Link
 *
 * Links platform entities to their corresponding QuickBooks entities.
 * Enables bidirectional lookups and relationship tracking.
 *
 * Example:
 * - Platform Commitment (UUID) → QB Vendor (ID: 123)
 * - Platform PaymentApplication (UUID) → QB Bill (ID: 456)
 */
@Entity('qb_entity_links')
@Index(['organizationId', 'platformEntityType', 'platformEntityId'], { unique: true })
@Index(['organizationId', 'qbEntityType', 'qbEntityId'])
export class QBEntityLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @Column({ type: 'varchar', length: 100, name: 'platform_entity_type' })
  platformEntityType!: string;

  @Column({ type: 'uuid', name: 'platform_entity_id' })
  platformEntityId!: string;

  @Column({ type: 'varchar', length: 50, name: 'qb_entity_type' })
  qbEntityType!: QBEntityType;

  @Column({ type: 'varchar', length: 100, name: 'qb_entity_id' })
  qbEntityId!: string;

  @Column({ type: 'varchar', length: 50, name: 'qb_sync_token', nullable: true })
  qbSyncToken?: string;

  @Column({ type: 'timestamp with time zone', name: 'last_synced_at', nullable: true })
  lastSyncedAt?: Date;

  @Column({ type: 'varchar', length: 50, name: 'sync_direction', default: QBSyncDirection.TO_QB })
  syncDirection!: QBSyncDirection;

  @Column({ type: 'varchar', length: 50, name: 'sync_status', default: QBSyncStatus.SUCCESS })
  syncStatus!: QBSyncStatus;

  @Column({ type: 'varchar', length: 500, name: 'error_message', nullable: true })
  errorMessage?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
