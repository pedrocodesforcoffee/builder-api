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
import { PotentialChangeOrder } from './potential-change-order.entity';
import { OcoCostBreakdown } from './oco-cost-breakdown.entity';
import { CommitmentChangeOrder } from './commitment-change-order.entity';
import { OcoStatus } from '../enums/oco-status.enum';
import { OcoChangeType } from '../enums/oco-change-type.enum';
import { CoPriority } from '../enums/co-priority.enum';
import { BudgetImpactType } from '../enums/budget-impact-type.enum';

/**
 * OwnerChangeOrder Entity
 *
 * Represents an Owner Change Order (OCO) - formal change order to prime contract.
 *
 * Features:
 * - 5-state workflow: DRAFT → PENDING_APPROVAL → APPROVED/REJECTED → EXECUTED
 * - Updates prime_contract.currentAmount on approval
 * - Updates budget via cost breakdowns
 * - Approval threshold validation
 *
 * @entity owner_change_orders
 */
@Entity('owner_change_orders')
@Index('IDX_oco_project', ['projectId'])
@Index('IDX_oco_prime_contract', ['primeContractId'])
@Index('IDX_oco_pco', ['pcoId'])
@Index('IDX_oco_status', ['status'])
@Index('IDX_oco_change_type', ['changeType'])
@Index('IDX_oco_number', ['projectId', 'ocoNumber'], { unique: true })
export class OwnerChangeOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'project_id', nullable: false })
  projectId!: string;

  @Column({ type: 'uuid', name: 'prime_contract_id', nullable: false })
  primeContractId!: string;

  @Column({ type: 'uuid', name: 'pco_id', nullable: true })
  pcoId?: string;

  // ==================== IDENTIFICATION ====================

  @Column({ type: 'varchar', length: 50, name: 'oco_number', nullable: false })
  ocoNumber!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // ==================== STATUS AND TYPE ====================

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    default: OcoStatus.DRAFT,
  })
  status!: OcoStatus;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'change_type',
    nullable: false,
  })
  changeType!: OcoChangeType;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    default: CoPriority.MEDIUM,
  })
  priority?: CoPriority;

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

  @Column({ type: 'text', nullable: true })
  reason?: string;

  // ==================== BUDGET INTEGRATION ====================

  @Column({
    type: 'varchar',
    length: 50,
    name: 'budget_impact_type',
    nullable: true,
  })
  budgetImpactType?: BudgetImpactType;

  @Column({
    type: 'uuid',
    name: 'budget_line_item_id',
    nullable: true,
  })
  budgetLineItemId?: string;

  // ==================== SCHEDULE IMPACT ====================

  @Column({
    type: 'integer',
    name: 'schedule_impact_days',
    nullable: true,
    default: 0,
  })
  scheduleImpactDays?: number;

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

  @ManyToOne(() => PrimeContract, { nullable: false })
  @JoinColumn({ name: 'prime_contract_id' })
  primeContract!: PrimeContract;

  @ManyToOne(() => PotentialChangeOrder, { nullable: true })
  @JoinColumn({ name: 'pco_id' })
  pco?: PotentialChangeOrder;

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

  @OneToMany(() => OcoCostBreakdown, (breakdown) => breakdown.oco)
  costBreakdowns?: OcoCostBreakdown[];

  @OneToMany(() => CommitmentChangeOrder, (cco) => cco.oco)
  commitmentChangeOrders?: CommitmentChangeOrder[];
}
