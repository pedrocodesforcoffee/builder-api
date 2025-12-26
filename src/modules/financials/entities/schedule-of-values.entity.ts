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
import { User } from '../../users/entities/user.entity';
import { Commitment } from './commitment.entity';
import { ScheduleOfValuesItem } from './schedule-of-values-item.entity';
import { PaymentApplication } from './payment-application.entity';

/**
 * Schedule of Values (SOV) Entity
 *
 * Represents a Schedule of Values for a commitment (subcontract or purchase order).
 * The SOV breaks down the total contract value into line items mapped to cost codes.
 * It serves as the baseline for payment applications (AIA G702/G703).
 *
 * Features:
 * - Created from commitment line items
 * - One SOV per commitment
 * - Line items define the scheduled value for each scope of work
 * - Used as the basis for billing and progress tracking
 *
 * @entity schedule_of_values
 */
@Entity('schedule_of_values')
@Index('IDX_sov_commitment', ['commitmentId'], { unique: true })
@Index('IDX_sov_project', ['projectId'])
export class ScheduleOfValues {
  /**
   * Unique identifier for the SOV (UUID v4)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Commitment ID (one-to-one relationship)
   * Each commitment has exactly one SOV
   */
  @Column({
    type: 'uuid',
    name: 'commitment_id',
    nullable: false,
    unique: true,
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

  /**
   * User ID who created this SOV
   */
  @Column({
    type: 'uuid',
    name: 'created_by_id',
    nullable: false,
  })
  createdById!: string;

  /**
   * Timestamp when the SOV was created
   */
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
  })
  createdAt!: Date;

  /**
   * Timestamp when the SOV was last updated
   */
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp with time zone',
  })
  updatedAt!: Date;

  // ==================== RELATIONSHIPS ====================

  /**
   * Commitment relationship
   * One-to-one relationship with commitment
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
   * Created by relationship
   */
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy!: User;

  /**
   * SOV line items
   * All line items that belong to this SOV
   */
  @OneToMany(() => ScheduleOfValuesItem, (item) => item.sov)
  items?: ScheduleOfValuesItem[];

  /**
   * Payment applications
   * All payment applications that use this SOV
   */
  @OneToMany(() => PaymentApplication, (payApp) => payApp.sov)
  paymentApplications?: PaymentApplication[];
}
