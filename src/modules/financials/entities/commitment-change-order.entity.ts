import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { Commitment } from './commitment.entity';
import { OwnerChangeOrder } from './owner-change-order.entity';
import { CcoLineItem } from './cco-line-item.entity';
import { CcoTmEntry } from './cco-tm-entry.entity';
import { CcoStatus } from '../enums/cco-status.enum';
import { CcoChangeType } from '../enums/cco-change-type.enum';

/**
 * CommitmentChangeOrder Entity
 *
 * Represents a Commitment Change Order (CCO) - changes to subcontracts/POs.
 *
 * Features:
 * - 5-state workflow: DRAFT → PENDING_APPROVAL → APPROVED/REJECTED → EXECUTED
 * - Updates commitment.currentAmount on approval
 * - T&M (Time and Materials) support
 * - Line item breakdown
 *
 * @entity commitment_change_orders
 */
@Entity('commitment_change_orders')
@Index('IDX_cco_project', ['projectId'])
@Index('IDX_cco_commitment', ['commitmentId'])
@Index('IDX_cco_oco', ['ocoId'])
@Index('IDX_cco_status', ['status'])
@Index('IDX_cco_number', ['commitmentId', 'ccoNumber'], { unique: true })
export class CommitmentChangeOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'project_id', nullable: false })
  projectId!: string;

  @Column({ type: 'uuid', name: 'commitment_id', nullable: false })
  commitmentId!: string;

  @Column({ type: 'uuid', name: 'oco_id', nullable: true })
  ocoId?: string;

  // ==================== IDENTIFICATION ====================

  @Column({ type: 'varchar', length: 50, name: 'cco_number', nullable: false })
  ccoNumber!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // ==================== STATUS AND TYPE ====================

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    default: CcoStatus.DRAFT,
  })
  status!: CcoStatus;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'change_type',
    nullable: false,
  })
  changeType!: CcoChangeType;

  // ==================== FINANCIAL ====================

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
  })
  amount!: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'approved_amount',
    nullable: true,
  })
  approvedAmount?: number;

  @Column({
    type: 'boolean',
    name: 'is_time_and_material',
    nullable: false,
    default: false,
  })
  isTimeAndMaterial!: boolean;

  // ==================== BUDGET INTEGRATION ====================

  @Column({
    type: 'uuid',
    name: 'cost_code_id',
    nullable: true,
  })
  costCodeId?: string;

  // ==================== WORKFLOW TRACKING ====================

  @Column({ type: 'timestamp with time zone', name: 'submitted_at', nullable: true })
  submittedAt?: Date;

  @Column({ type: 'uuid', name: 'submitted_by_id', nullable: true })
  submittedById?: string;

  @Column({ type: 'timestamp with time zone', name: 'approved_at', nullable: true })
  approvedAt?: Date;

  @Column({ type: 'uuid', name: 'approved_by_id', nullable: true })
  approvedById?: string;

  @Column({ type: 'timestamp with time zone', name: 'rejected_at', nullable: true })
  rejectedAt?: Date;

  @Column({ type: 'uuid', name: 'rejected_by_id', nullable: true })
  rejectedById?: string;

  @Column({ type: 'text', name: 'rejection_reason', nullable: true })
  rejectionReason?: string;

  @Column({ type: 'timestamp with time zone', name: 'executed_at', nullable: true })
  executedAt?: Date;

  // ==================== AUDIT ====================

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @Column({ type: 'uuid', name: 'created_by_id', nullable: false })
  createdById!: string;

  // ==================== RELATIONSHIPS ====================

  @ManyToOne(() => Project, { nullable: false })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @ManyToOne(() => Commitment, { nullable: false })
  @JoinColumn({ name: 'commitment_id' })
  commitment!: Commitment;

  @ManyToOne(() => OwnerChangeOrder, (oco) => oco.commitmentChangeOrders, {
    nullable: true,
  })
  @JoinColumn({ name: 'oco_id' })
  oco?: OwnerChangeOrder;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy!: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'submitted_by_id' })
  submittedBy?: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy?: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'rejected_by_id' })
  rejectedBy?: User;

  @OneToMany(() => CcoLineItem, (item) => item.cco)
  lineItems?: CcoLineItem[];

  @OneToMany(() => CcoTmEntry, (entry) => entry.cco)
  tmEntries?: CcoTmEntry[];
}
