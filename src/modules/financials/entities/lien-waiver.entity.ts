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
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { Commitment } from './commitment.entity';
import { PaymentApplication } from './payment-application.entity';
import { LienWaiverType } from '../enums/lien-waiver-type.enum';

/**
 * LienWaiver Entity
 *
 * Represents a lien waiver document for a payment application.
 * Lien waivers protect property owners from future mechanic's liens
 * by documenting that payment has been or will be received.
 *
 * Features:
 * - Conditional waivers (effective upon payment)
 * - Unconditional waivers (effective immediately)
 * - Document storage (PDF, image, etc.)
 * - Amount and through-date tracking
 * - Linked to payment application
 *
 * @entity lien_waivers
 */
@Entity('lien_waivers')
@Index('IDX_lien_waiver_pay_app', ['paymentApplicationId'])
@Index('IDX_lien_waiver_commitment', ['commitmentId'])
@Index('IDX_lien_waiver_project', ['projectId'])
@Index('IDX_lien_waiver_type', ['type'])
export class LienWaiver {
  /**
   * Unique identifier for the lien waiver (UUID v4)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Payment Application ID
   */
  @Column({
    type: 'uuid',
    name: 'payment_application_id',
    nullable: false,
  })
  paymentApplicationId!: string;

  /**
   * Commitment ID (denormalized for efficient queries)
   */
  @Column({
    type: 'uuid',
    name: 'commitment_id',
    nullable: false,
  })
  commitmentId!: string;

  /**
   * Project ID (denormalized for efficient queries)
   */
  @Column({
    type: 'uuid',
    name: 'project_id',
    nullable: false,
  })
  projectId!: string;

  // ==================== WAIVER DETAILS ====================

  /**
   * Lien waiver type
   * CONDITIONAL: Effective upon payment clearing
   * UNCONDITIONAL: Effective immediately
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  type!: LienWaiverType;

  /**
   * Waiver amount
   * The amount of payment covered by this waiver
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
  })
  amount!: number;

  /**
   * Through date
   * The date through which lien rights are waived
   */
  @Column({
    type: 'date',
    name: 'through_date',
    nullable: false,
  })
  throughDate!: Date;

  // ==================== DOCUMENT STORAGE ====================

  /**
   * Document URL (S3 or file path)
   * Location where the signed waiver document is stored
   */
  @Column({
    type: 'varchar',
    length: 500,
    name: 'document_url',
    nullable: false,
  })
  documentUrl!: string;

  /**
   * File name
   * Original name of the uploaded file
   */
  @Column({
    type: 'varchar',
    length: 255,
    name: 'file_name',
    nullable: false,
  })
  fileName!: string;

  /**
   * File size (bytes)
   */
  @Column({
    type: 'integer',
    name: 'file_size',
    nullable: false,
  })
  fileSize!: number;

  /**
   * MIME type
   * Example: application/pdf, image/jpeg
   */
  @Column({
    type: 'varchar',
    length: 100,
    name: 'mime_type',
    nullable: false,
  })
  mimeType!: string;

  // ==================== METADATA ====================

  /**
   * User ID who uploaded this waiver
   */
  @Column({
    type: 'uuid',
    name: 'uploaded_by_id',
    nullable: false,
  })
  uploadedById!: string;

  /**
   * Timestamp when waiver was uploaded
   */
  @Column({
    type: 'timestamp with time zone',
    name: 'uploaded_at',
    nullable: false,
  })
  uploadedAt!: Date;

  /**
   * Notes or comments about this waiver
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  notes?: string;

  // ==================== TIMESTAMPS ====================

  /**
   * Timestamp when the waiver record was created
   */
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
  })
  createdAt!: Date;

  /**
   * Timestamp when the waiver record was last updated
   */
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp with time zone',
  })
  updatedAt!: Date;

  // ==================== RELATIONSHIPS ====================

  /**
   * Payment Application relationship
   */
  @ManyToOne(() => PaymentApplication, (payApp) => payApp.lienWaivers, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'payment_application_id' })
  paymentApplication!: PaymentApplication;

  /**
   * Commitment relationship
   */
  @ManyToOne(() => Commitment, { nullable: false })
  @JoinColumn({ name: 'commitment_id' })
  commitment!: Commitment;

  /**
   * Project relationship
   */
  @ManyToOne(() => Project, { nullable: false })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  /**
   * Uploaded by user
   */
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'uploaded_by_id' })
  uploadedBy!: User;
}
