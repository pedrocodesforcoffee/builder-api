import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { DocumentVersion } from './document-version.entity';

/**
 * Distribution Type Enum
 *
 * Tracks how a document version was distributed
 */
export enum DistributionType {
  DOWNLOAD = 'download',
  TRANSMITTAL = 'transmittal',
  EMAIL = 'email',
  SHARED_LINK = 'shared_link',
  API = 'api',
}

/**
 * Version Distribution Entity
 *
 * COMPLIANCE: Tracks who received which version of a document
 *
 * Critical for:
 * - Legal compliance (who had what information when)
 * - Audit trails
 * - Construction liability
 * - RFI/submittal tracking
 */
@Entity('version_distributions')
@Index(['versionId', 'distributedAt'])
@Index(['recipientId', 'distributedAt'])
@Index(['distributionType', 'distributedAt'])
export class VersionDistribution {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  @Index()
  versionId!: string;

  @ManyToOne(() => DocumentVersion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'versionId' })
  version!: DocumentVersion;

  @Column({
    type: 'enum',
    enum: DistributionType,
  })
  distributionType!: DistributionType;

  @Column('uuid')
  @Index()
  recipientId!: string;

  @Column({ type: 'varchar', length: 255 })
  recipientName!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  recipientEmail!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  recipientCompany!: string | null;

  @Column('uuid')
  distributedBy!: string;

  @Column({ type: 'varchar', length: 255 })
  distributedByName!: string;

  @CreateDateColumn()
  @Index()
  distributedAt!: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  transmittalNumber!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  referenceNumber!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: {
    ipAddress?: string;
    userAgent?: string;
    downloadCount?: number;
    sharedLinkId?: string;
    expiresAt?: string;
    [key: string]: any;
  } | null;

  @Column({ type: 'boolean', default: false })
  acknowledged!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  acknowledgedAt!: Date | null;

  @Column({ type: 'uuid', nullable: true })
  acknowledgedBy!: string | null;
}
