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
import { PrimeContract } from './prime-contract.entity';
import { OwnerChangeOrder } from './owner-change-order.entity';
import { PcoCostTier } from './pco-cost-tier.entity';
import { PcoStatus } from '../enums/pco-status.enum';
import { CoPriority } from '../enums/co-priority.enum';

/**
 * PotentialChangeOrder Entity
 *
 * Represents a Potential Change Order (PCO) - upstream change tracking
 * before formal owner change orders are created.
 *
 * Features:
 * - Multi-tier cost breakdown with markup calculations
 * - 6-state workflow: DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED → CONVERTED
 * - Converts to Owner Change Order on approval
 * - Overhead, profit, and contingency tracking
 *
 * @entity potential_change_orders
 */
@Entity('potential_change_orders')
@Index('IDX_pco_project', ['projectId'])
@Index('IDX_pco_prime_contract', ['primeContractId'])
@Index('IDX_pco_status', ['status'])
@Index('IDX_pco_number', ['projectId', 'pcoNumber'], { unique: true })
@Index('IDX_pco_converted_to_oco', ['convertedToOcoId'])
export class PotentialChangeOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'project_id', nullable: false })
  projectId!: string;

  @Column({ type: 'uuid', name: 'prime_contract_id', nullable: false })
  primeContractId!: string;

  // ==================== IDENTIFICATION ====================

  @Column({ type: 'varchar', length: 50, name: 'pco_number', nullable: false })
  pcoNumber!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // ==================== STATUS ====================

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    default: PcoStatus.DRAFT,
  })
  status!: PcoStatus;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    default: CoPriority.MEDIUM,
  })
  priority?: CoPriority;

  // ==================== FINANCIAL SUMMARY ====================

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'direct_cost',
    nullable: false,
    default: 0,
  })
  directCost!: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'overhead_amount',
    nullable: false,
    default: 0,
  })
  overheadAmount!: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'overhead_percent',
    nullable: false,
    default: 0,
  })
  overheadPercent!: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'profit_amount',
    nullable: false,
    default: 0,
  })
  profitAmount!: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'profit_percent',
    nullable: false,
    default: 0,
  })
  profitPercent!: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'contingency_amount',
    nullable: false,
    default: 0,
  })
  contingencyAmount!: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'contingency_percent',
    nullable: false,
    default: 0,
  })
  contingencyPercent!: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'total_amount',
    nullable: false,
    default: 0,
  })
  totalAmount!: number;

  // ==================== WORKFLOW TRACKING ====================

  @Column({ type: 'timestamp with time zone', name: 'submitted_at', nullable: true })
  submittedAt?: Date;

  @Column({ type: 'uuid', name: 'submitted_by_id', nullable: true })
  submittedById?: string;

  @Column({ type: 'timestamp with time zone', name: 'reviewed_at', nullable: true })
  reviewedAt?: Date;

  @Column({ type: 'uuid', name: 'reviewed_by_id', nullable: true })
  reviewedById?: string;

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

  // ==================== CONVERSION TRACKING ====================

  @Column({ type: 'uuid', name: 'converted_to_oco_id', nullable: true })
  convertedToOcoId?: string;

  @Column({ type: 'timestamp with time zone', name: 'converted_at', nullable: true })
  convertedAt?: Date;

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

  @ManyToOne(() => PrimeContract, { nullable: false })
  @JoinColumn({ name: 'prime_contract_id' })
  primeContract!: PrimeContract;

  @ManyToOne(() => OwnerChangeOrder, { nullable: true })
  @JoinColumn({ name: 'converted_to_oco_id' })
  convertedToOco?: OwnerChangeOrder;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy!: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'submitted_by_id' })
  submittedBy?: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by_id' })
  reviewedBy?: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy?: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'rejected_by_id' })
  rejectedBy?: User;

  @OneToMany(() => PcoCostTier, (tier) => tier.pco)
  costTiers?: PcoCostTier[];
}
