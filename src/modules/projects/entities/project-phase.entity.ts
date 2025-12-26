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
import { Project } from './project.entity';
import { ProjectMilestone } from './project-milestone.entity';
import { User } from '../../users/entities/user.entity';
import { PhaseStatus } from '../enums/phase-status.enum';
import { DependencyType } from '../enums/dependency-type.enum';

/**
 * ProjectPhase Entity
 *
 * Represents a phase in a project timeline (e.g., Design, Construction, Closeout).
 * Phases have start/end dates, status tracking, dependencies, and contain milestones.
 *
 * Features:
 * - Schedule tracking (planned vs actual dates)
 * - Progress monitoring (percentage complete)
 * - Phase dependencies with lag/lead time
 * - Critical path analysis support
 * - Financial tracking (budgeted vs actual cost)
 * - Flexible metadata and custom fields
 *
 * @entity project_phases
 */
@Entity('project_phases')
@Index('IDX_project_phases_project', ['projectId'])
@Index('IDX_project_phases_status', ['status'])
@Index('IDX_project_phases_dates', ['startDate', 'endDate'])
@Index('IDX_project_phases_order', ['projectId', 'order'])
export class ProjectPhase {
  // ==================== CORE FIELDS ====================

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'uuid',
    name: 'project_id',
    nullable: false,
  })
  projectId!: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  name!: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  @Column({
    type: 'integer',
    nullable: false,
  })
  order!: number;

  // ==================== SCHEDULE FIELDS ====================

  @Column({
    type: 'date',
    name: 'start_date',
    nullable: false,
  })
  startDate!: Date;

  @Column({
    type: 'date',
    name: 'end_date',
    nullable: false,
  })
  endDate!: Date;

  @Column({
    type: 'date',
    name: 'actual_start_date',
    nullable: true,
  })
  actualStartDate?: Date;

  @Column({
    type: 'date',
    name: 'actual_end_date',
    nullable: true,
  })
  actualEndDate?: Date;

  // ==================== STATUS & PROGRESS ====================

  @Column({
    type: 'enum',
    enum: PhaseStatus,
    default: PhaseStatus.NOT_STARTED,
    nullable: false,
  })
  status!: PhaseStatus;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: false,
    default: 0,
    name: 'percent_complete',
  })
  percentComplete!: number;

  @Column({
    type: 'boolean',
    name: 'is_on_critical_path',
    default: false,
    nullable: false,
  })
  isOnCriticalPath!: boolean;

  @Column({
    type: 'boolean',
    name: 'is_milestone',
    default: false,
    nullable: false,
  })
  isMilestone!: boolean;

  // ==================== DEPENDENCIES ====================

  @Column({
    type: 'jsonb',
    name: 'predecessor_ids',
    default: () => "'[]'",
    nullable: false,
  })
  predecessorIds!: string[];

  @Column({
    type: 'jsonb',
    name: 'successor_ids',
    default: () => "'[]'",
    nullable: false,
  })
  successorIds!: string[];

  @Column({
    type: 'enum',
    enum: DependencyType,
    name: 'dependency_type',
    nullable: true,
  })
  dependencyType?: DependencyType;

  @Column({
    type: 'integer',
    name: 'lag_days',
    default: 0,
    nullable: false,
  })
  lagDays!: number;

  // ==================== FINANCIAL TRACKING ====================

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'budgeted_cost',
    nullable: true,
  })
  budgetedCost?: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'actual_cost',
    default: 0,
    nullable: false,
  })
  actualCost!: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'earned_value',
    default: 0,
    nullable: false,
  })
  earnedValue!: number;

  // ==================== METADATA ====================

  @Column({
    type: 'varchar',
    length: 7,
    nullable: true,
  })
  color?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  icon?: string;

  @Column({
    type: 'boolean',
    name: 'is_default',
    default: false,
    nullable: false,
  })
  isDefault!: boolean;

  @Column({
    type: 'jsonb',
    name: 'custom_fields',
    default: () => "'{}'",
    nullable: false,
  })
  customFields!: Record<string, any>;

  // ==================== AUDIT FIELDS ====================

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
  })
  updatedAt!: Date;

  @Column({
    type: 'uuid',
    name: 'created_by',
    nullable: true,
  })
  createdBy?: string;

  @Column({
    type: 'uuid',
    name: 'updated_by',
    nullable: true,
  })
  updatedBy?: string;

  // ==================== RELATIONSHIPS ====================

  @ManyToOne(() => Project, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project?: Project;

  @OneToMany(() => ProjectMilestone, (milestone) => milestone.phase, {
    cascade: true,
  })
  milestones?: ProjectMilestone[];

  @ManyToOne(() => User, {
    nullable: true,
  })
  @JoinColumn({ name: 'created_by' })
  creator?: User;

  @ManyToOne(() => User, {
    nullable: true,
  })
  @JoinColumn({ name: 'updated_by' })
  updater?: User;

  // ==================== HELPER METHODS ====================

  /**
   * Get planned duration in days
   */
  getPlannedDuration(): number {
    const diffTime = new Date(this.endDate).getTime() - new Date(this.startDate).getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get actual duration in days (if completed)
   */
  getActualDuration(): number | null {
    if (!this.actualStartDate || !this.actualEndDate) {
      return null;
    }
    const diffTime = new Date(this.actualEndDate).getTime() - new Date(this.actualStartDate).getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if phase is active
   */
  isActive(): boolean {
    return this.status === PhaseStatus.IN_PROGRESS;
  }

  /**
   * Check if phase is completed
   */
  isCompleted(): boolean {
    return this.status === PhaseStatus.COMPLETED;
  }

  /**
   * Check if phase is delayed
   */
  isDelayed(): boolean {
    if (this.status === PhaseStatus.COMPLETED) {
      return false;
    }
    const today = new Date();
    return today > new Date(this.endDate);
  }

  /**
   * Get schedule variance in days (negative = behind schedule)
   */
  getScheduleVariance(): number | null {
    if (!this.actualEndDate) {
      return null;
    }
    const planned = new Date(this.endDate).getTime();
    const actual = new Date(this.actualEndDate).getTime();
    return Math.ceil((planned - actual) / (1000 * 60 * 60 * 24));
  }

  /**
   * Get cost variance (budgeted - actual)
   */
  getCostVariance(): number | null {
    if (!this.budgetedCost) {
      return null;
    }
    return this.budgetedCost - this.actualCost;
  }

  /**
   * Get days remaining until end date
   */
  getDaysRemaining(): number {
    if (this.status === PhaseStatus.COMPLETED) {
      return 0;
    }
    const today = new Date();
    const end = new Date(this.endDate);
    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
