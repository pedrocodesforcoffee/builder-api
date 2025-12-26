import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { ProjectFolder } from '../../projects/entities/project-folder.entity';
import { CommitmentType } from '../enums/commitment-type.enum';
import { CommitmentStatus } from '../enums/commitment-status.enum';
import { CommitmentItem } from './commitment-item.entity';

/**
 * Commitment Entity
 *
 * Represents a financial commitment (subcontract or purchase order).
 * Commitments represent contracted obligations to vendors or subcontractors,
 * enabling proactive cost tracking before invoices are received.
 *
 * Features:
 * - Tracks original vs current commitment value
 * - Supports subcontracts and purchase orders
 * - Line items mapped to cost codes
 * - Status workflow (draft → approval → active → closed)
 * - Tracks vendor/subcontractor details
 *
 * @entity commitments
 */
@Entity('commitments')
@Index('IDX_commitments_project', ['projectId'])
@Index('IDX_commitments_number', ['projectId', 'number'], { unique: true })
@Index('IDX_commitments_type', ['type'])
@Index('IDX_commitments_status', ['status'])
@Index('IDX_commitments_vendor', ['vendorName'])
export class Commitment {
  /**
   * Unique identifier for the commitment (UUID v4)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Project ID
   */
  @Column({
    type: 'uuid',
    name: 'project_id',
    nullable: false,
  })
  projectId!: string;

  /**
   * Commitment number
   */
  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  number!: string;

  /**
   * Commitment type (SUBCONTRACT or PURCHASE_ORDER)
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  type!: CommitmentType;

  /**
   * Commitment title
   */
  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  title!: string;

  /**
   * Commitment description
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  /**
   * Status
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    default: CommitmentStatus.DRAFT,
  })
  status!: CommitmentStatus;

  /**
   * Vendor/subcontractor name
   */
  @Column({
    type: 'varchar',
    length: 255,
    name: 'vendor_name',
    nullable: false,
  })
  vendorName!: string;

  /**
   * Vendor contact name
   */
  @Column({
    type: 'varchar',
    length: 255,
    name: 'vendor_contact',
    nullable: true,
  })
  vendorContact?: string;

  /**
   * Vendor email
   */
  @Column({
    type: 'varchar',
    length: 255,
    name: 'vendor_email',
    nullable: true,
  })
  vendorEmail?: string;

  /**
   * Original commitment amount
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'original_amount',
    nullable: false,
  })
  originalAmount!: number;

  /**
   * Current commitment amount
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'current_amount',
    nullable: false,
  })
  currentAmount!: number;

  /**
   * Contract start date
   */
  @Column({
    type: 'date',
    name: 'start_date',
    nullable: true,
  })
  startDate?: Date;

  /**
   * Contract end date
   */
  @Column({
    type: 'date',
    name: 'end_date',
    nullable: true,
  })
  endDate?: Date;

  /**
   * Retention percentage (e.g., 10 = 10%)
   */
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'retention_percent',
    nullable: true,
    default: 0,
  })
  retentionPercent?: number;

  /**
   * User ID who approved this commitment
   */
  @Column({
    type: 'uuid',
    name: 'approved_by_id',
    nullable: true,
  })
  approvedById?: string;

  /**
   * Timestamp when commitment was approved
   */
  @Column({
    type: 'timestamp with time zone',
    name: 'approved_at',
    nullable: true,
  })
  approvedAt?: Date;

  /**
   * User ID who rejected this commitment
   */
  @Column({
    type: 'uuid',
    name: 'rejected_by_id',
    nullable: true,
  })
  rejectedById?: string;

  /**
   * Timestamp when commitment was rejected
   */
  @Column({
    type: 'timestamp with time zone',
    name: 'rejected_at',
    nullable: true,
  })
  rejectedAt?: Date;

  /**
   * Rejection reason or notes
   */
  @Column({
    type: 'text',
    name: 'rejection_reason',
    nullable: true,
  })
  rejectionReason?: string;

  /**
   * Invoiced amount
   * Sum of approved payment applications (totalEarnedLessRetainage)
   * Updated when payment applications are approved
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'invoiced_amount',
    nullable: false,
    default: 0,
  })
  invoicedAmount!: number;

  /**
   * Paid amount
   * Sum of paid payment applications (currentPaymentDue)
   * Updated when payment applications are marked as paid
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'paid_amount',
    nullable: false,
    default: 0,
  })
  paidAmount!: number;

  /**
   * QuickBooks Vendor ID
   * Links this commitment to a QuickBooks Vendor entity
   */
  @Column({
    type: 'varchar',
    length: 100,
    name: 'qb_vendor_id',
    nullable: true,
  })
  qbVendorId?: string;

  /**
   * QuickBooks Sync Status
   * Tracks the sync state with QuickBooks
   */
  @Column({
    type: 'varchar',
    length: 50,
    name: 'qb_sync_status',
    nullable: true,
  })
  qbSyncStatus?: 'PENDING' | 'SYNCED' | 'FAILED';

  /**
   * QuickBooks Last Synced At
   * Timestamp of the last successful sync with QuickBooks
   */
  @Column({
    type: 'timestamp with time zone',
    name: 'qb_last_synced_at',
    nullable: true,
  })
  qbLastSyncedAt?: Date;

  /**
   * Folder ID
   * Reference to the ProjectFolder where commitment documents are stored
   * Folder structure: /Financials/Commitments/{Title}/{Number - Vendor}
   */
  @Column({
    type: 'uuid',
    name: 'folder_id',
    nullable: true,
  })
  folderId?: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp with time zone',
  })
  updatedAt!: Date;

  @ManyToOne(() => Project, { nullable: false })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @ManyToOne(() => ProjectFolder, { nullable: true })
  @JoinColumn({ name: 'folder_id' })
  folder?: ProjectFolder;

  @OneToMany(() => CommitmentItem, (item) => item.commitment)
  items?: CommitmentItem[];
}
