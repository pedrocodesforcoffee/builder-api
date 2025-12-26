import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Organization } from '../../../organizations/entities/organization.entity';
import { QBConnectionStatus } from '../enums';

/**
 * QuickBooks Connection Entity
 *
 * Stores OAuth 2.0 connection details and encrypted tokens for QuickBooks Online integration.
 * One connection per organization (one-to-one relationship).
 */
@Entity('qb_connections')
export class QBConnection {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'organization_id', unique: true })
  organizationId!: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @Column({ type: 'varchar', length: 50, default: QBConnectionStatus.DISCONNECTED })
  status!: QBConnectionStatus;

  @Column({ type: 'varchar', length: 100, name: 'qb_realm_id' })
  qbRealmId!: string;

  @Column({ type: 'varchar', length: 255, name: 'qb_company_name', nullable: true })
  qbCompanyName?: string;

  @Column({ type: 'text', name: 'encrypted_access_token' })
  encryptedAccessToken!: string;

  @Column({ type: 'text', name: 'encrypted_refresh_token' })
  encryptedRefreshToken!: string;

  @Column({ type: 'timestamp with time zone', name: 'access_token_expires_at' })
  accessTokenExpiresAt!: Date;

  @Column({ type: 'timestamp with time zone', name: 'refresh_token_expires_at' })
  refreshTokenExpiresAt!: Date;

  @Column({ type: 'timestamp with time zone', name: 'connected_at', nullable: true })
  connectedAt?: Date;

  @Column({ type: 'timestamp with time zone', name: 'disconnected_at', nullable: true })
  disconnectedAt?: Date;

  @Column({ type: 'timestamp with time zone', name: 'last_synced_at', nullable: true })
  lastSyncedAt?: Date;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ type: 'varchar', length: 500, name: 'last_error', nullable: true })
  lastError?: string;

  // Alias for lastError (used in some services)
  get errorMessage(): string | undefined {
    return this.lastError;
  }
  set errorMessage(value: string | undefined) {
    this.lastError = value;
  }

  @Column({ type: 'varchar', length: 50, name: 'qb_environment', default: 'production' })
  qbEnvironment!: 'production' | 'sandbox';

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
