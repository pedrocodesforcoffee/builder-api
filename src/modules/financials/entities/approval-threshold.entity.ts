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

/**
 * ApprovalThreshold Entity
 *
 * Defines approval authority thresholds for change orders at the project level.
 * Determines who can approve change orders based on amount ranges.
 *
 * Features:
 * - Amount range-based approval rules (minAmount to maxAmount)
 * - Role-based approval requirements
 * - Owner approval flag for critical changes
 * - Sort order for priority evaluation
 * - Active/inactive status
 *
 * Example:
 * - $0-$5,000: PROJECT_MANAGER
 * - $5,001-$25,000: PROJECT_EXECUTIVE + owner approval
 * - $25,001+: COMPANY_OWNER + owner approval
 *
 * @entity approval_thresholds
 */
@Entity('approval_thresholds')
@Index('IDX_approval_threshold_project', ['projectId'])
@Index('IDX_approval_threshold_active', ['isActive'])
@Index('IDX_approval_threshold_sort', ['projectId', 'sortOrder'])
@Index('IDX_approval_threshold_amount_range', ['projectId', 'minAmount', 'maxAmount'])
export class ApprovalThreshold {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'project_id', nullable: false })
  projectId!: string;

  // ==================== AMOUNT RANGE ====================

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'min_amount',
    nullable: false,
  })
  minAmount!: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'max_amount',
    nullable: true,
  })
  maxAmount?: number;

  // ==================== APPROVAL REQUIREMENTS ====================

  @Column({
    type: 'varchar',
    length: 100,
    name: 'required_role',
    nullable: false,
  })
  requiredRole!: string;

  @Column({
    type: 'boolean',
    name: 'requires_owner_approval',
    nullable: false,
    default: false,
  })
  requiresOwnerApproval!: boolean;

  // ==================== ORDERING AND STATUS ====================

  @Column({
    type: 'integer',
    name: 'sort_order',
    nullable: false,
    default: 0,
  })
  sortOrder!: number;

  @Column({
    type: 'boolean',
    name: 'is_active',
    nullable: false,
    default: true,
  })
  isActive!: boolean;

  // ==================== AUDIT ====================

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  // ==================== RELATIONSHIPS ====================

  @ManyToOne(() => Project, { nullable: false })
  @JoinColumn({ name: 'project_id' })
  project!: Project;
}
