import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ExportFormat } from '../enums/export-format.enum';
import { ExportStatus } from '../enums/export-status.enum';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';

/**
 * Export Job Entity
 *
 * Tracks export jobs for search results
 *
 * @entity export_jobs
 */
@Entity('export_jobs')
@Index('IDX_export_jobs_user', ['userId'])
@Index('IDX_export_jobs_status', ['status'])
@Index('IDX_export_jobs_created', ['createdAt'])
export class ExportJob {
  /**
   * Unique identifier for the export job (UUID v4)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * User ID who requested the export
   */
  @Column({
    type: 'uuid',
    name: 'user_id',
    nullable: false,
  })
  userId!: string;

  /**
   * Organization ID for the export
   */
  @Column({
    type: 'uuid',
    name: 'organization_id',
    nullable: false,
  })
  organizationId!: string;

  /**
   * Export format
   */
  @Column({
    type: 'enum',
    enum: ExportFormat,
    nullable: false,
  })
  format!: ExportFormat;

  /**
   * Export status
   */
  @Column({
    type: 'enum',
    enum: ExportStatus,
    default: ExportStatus.PENDING,
    nullable: false,
  })
  status!: ExportStatus;

  /**
   * Search criteria for the export
   */
  @Column({
    type: 'jsonb',
    nullable: false,
  })
  criteria!: Record<string, any>;

  /**
   * Columns to include in the export
   */
  @Column({
    type: 'jsonb',
    nullable: false,
  })
  columns!: string[];

  /**
   * Whether to include custom fields
   */
  @Column({
    type: 'boolean',
    default: false,
    nullable: false,
    name: 'include_custom_fields',
  })
  includeCustomFields!: boolean;

  /**
   * Maximum number of records to export
   */
  @Column({
    type: 'integer',
    default: 10000,
    nullable: false,
    name: 'max_records',
  })
  maxRecords!: number;

  /**
   * Actual record count exported
   */
  @Column({
    type: 'integer',
    nullable: true,
    name: 'record_count',
  })
  recordCount?: number;

  /**
   * File size in bytes
   */
  @Column({
    type: 'bigint',
    nullable: true,
    name: 'file_size',
  })
  fileSize?: number;

  /**
   * Download URL for the exported file
   */
  @Column({
    type: 'text',
    nullable: true,
    name: 'download_url',
  })
  downloadUrl?: string;

  /**
   * Error message if export failed
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  error?: string;

  /**
   * Estimated completion time
   */
  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'estimated_completion',
  })
  estimatedCompletion?: Date;

  /**
   * Completion timestamp
   */
  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'completed_at',
  })
  completedAt?: Date;

  /**
   * Expiration timestamp for the download
   */
  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'expires_at',
  })
  expiresAt?: Date;

  /**
   * Timestamp when the export job was created
   */
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  /**
   * Timestamp when the export job was last updated
   */
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;

  // ==================== RELATIONSHIPS ====================

  /**
   * User who requested the export
   */
  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  /**
   * Organization for the export
   */
  @ManyToOne(() => Organization, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization?: Organization;
}