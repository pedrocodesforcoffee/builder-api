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
import { ProjectPhase } from './project-phase.entity';
import { Project } from './project.entity';
import { User } from '../../users/entities/user.entity';
import { MilestoneStatus } from '../enums/milestone-status.enum';

/**
 * Completion Criteria Interface
 * Defines a specific condition that must be met for milestone completion
 */
export interface CompletionCriterion {
  description: string;
  completed: boolean;
}

/**
 * Notification Log Interface
 * Tracks notifications sent for this milestone
 */
export interface NotificationLog {
  type: 'UPCOMING' | 'DUE_TODAY' | 'OVERDUE' | 'COMPLETED';
  sentAt: Date;
  recipients: string[];
}

/**
 * ProjectMilestone Entity
 *
 * Represents a significant milestone within a project phase.
 * Milestones mark important completion points, deliverables, or decision gates.
 *
 * Features:
 * - Planned vs actual date tracking
 * - Status and completion tracking
 * - Approval workflows
 * - Completion criteria checklists
 * - Automated notifications
 * - Dependency tracking
 * - Client visibility flags
 *
 * @entity project_milestones
 */
@Entity('project_milestones')
@Index('IDX_project_milestones_phase', ['phaseId'])
@Index('IDX_project_milestones_project', ['projectId'])
@Index('IDX_project_milestones_planned_date', ['plannedDate'])
@Index('IDX_project_milestones_status', ['status'])
@Index('IDX_project_milestones_order', ['phaseId', 'order'])
export class ProjectMilestone {
  // ==================== CORE FIELDS ====================

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'uuid',
    name: 'phase_id',
    nullable: false,
  })
  phaseId!: string;

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

  // ==================== SCHEDULE FIELDS ====================

  @Column({
    type: 'date',
    name: 'planned_date',
    nullable: false,
  })
  plannedDate!: Date;

  @Column({
    type: 'date',
    name: 'actual_date',
    nullable: true,
  })
  actualDate?: Date;

  @Column({
    type: 'date',
    name: 'baseline_date',
    nullable: true,
  })
  baselineDate?: Date;

  // ==================== STATUS & COMPLETION ====================

  @Column({
    type: 'enum',
    enum: MilestoneStatus,
    default: MilestoneStatus.PENDING,
    nullable: false,
  })
  status!: MilestoneStatus;

  @Column({
    type: 'boolean',
    default: false,
    nullable: false,
  })
  completed!: boolean;

  @Column({
    type: 'timestamp',
    name: 'completed_at',
    nullable: true,
  })
  completedAt?: Date;

  @Column({
    type: 'uuid',
    name: 'completed_by',
    nullable: true,
  })
  completedBy?: string;

  // ==================== IMPORTANCE & TRACKING ====================

  @Column({
    type: 'boolean',
    name: 'is_critical',
    default: false,
    nullable: false,
  })
  isCritical!: boolean;

  @Column({
    type: 'boolean',
    name: 'is_client_facing',
    default: false,
    nullable: false,
  })
  isClientFacing!: boolean;

  @Column({
    type: 'boolean',
    name: 'requires_approval',
    default: false,
    nullable: false,
  })
  requiresApproval!: boolean;

  @Column({
    type: 'uuid',
    name: 'approved_by',
    nullable: true,
  })
  approvedBy?: string;

  @Column({
    type: 'timestamp',
    name: 'approved_at',
    nullable: true,
  })
  approvedAt?: Date;

  // ==================== DEPENDENCIES & CONDITIONS ====================

  @Column({
    type: 'jsonb',
    name: 'depends_on_milestone_ids',
    default: () => "'[]'",
    nullable: false,
  })
  dependsOnMilestoneIds!: string[];

  @Column({
    type: 'jsonb',
    name: 'completion_criteria',
    default: () => "'[]'",
    nullable: false,
  })
  completionCriteria!: CompletionCriterion[];

  // ==================== NOTIFICATIONS ====================

  @Column({
    type: 'integer',
    name: 'notify_days_before',
    default: 7,
    nullable: false,
  })
  notifyDaysBefore!: number;

  @Column({
    type: 'boolean',
    name: 'notify_on_completion',
    default: true,
    nullable: false,
  })
  notifyOnCompletion!: boolean;

  @Column({
    type: 'jsonb',
    name: 'notifications_sent',
    default: () => "'[]'",
    nullable: false,
  })
  notificationsSent!: NotificationLog[];

  // ==================== METADATA ====================

  @Column({
    type: 'integer',
    default: 0,
    nullable: false,
  })
  order!: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 1.0,
    nullable: false,
  })
  weight!: number;

  @Column({
    type: 'jsonb',
    default: () => "'[]'",
    nullable: false,
  })
  tags!: string[];

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

  @ManyToOne(() => ProjectPhase, (phase) => phase.milestones, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'phase_id' })
  phase?: ProjectPhase;

  @ManyToOne(() => Project, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project?: Project;

  @ManyToOne(() => User, {
    nullable: true,
  })
  @JoinColumn({ name: 'completed_by' })
  completer?: User;

  @ManyToOne(() => User, {
    nullable: true,
  })
  @JoinColumn({ name: 'approved_by' })
  approver?: User;

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
   * Check if milestone is overdue
   */
  isOverdue(): boolean {
    if (this.completed || this.status === MilestoneStatus.ACHIEVED) {
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const milestoneDate = new Date(this.plannedDate);
    milestoneDate.setHours(0, 0, 0, 0);
    return milestoneDate < today;
  }

  /**
   * Get days until due (negative if overdue)
   */
  getDaysUntilDue(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const milestoneDate = new Date(this.plannedDate);
    milestoneDate.setHours(0, 0, 0, 0);
    const diffTime = milestoneDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get schedule variance in days (positive = ahead, negative = behind)
   */
  getScheduleVariance(): number | null {
    if (!this.actualDate) {
      return null;
    }
    const planned = new Date(this.plannedDate).getTime();
    const actual = new Date(this.actualDate).getTime();
    return Math.ceil((planned - actual) / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if all completion criteria are met
   */
  areAllCriteriaMet(): boolean {
    if (this.completionCriteria.length === 0) {
      return true;
    }
    return this.completionCriteria.every(c => c.completed);
  }

  /**
   * Get completion criteria progress percentage
   */
  getCriteriaCompletionPercent(): number {
    if (this.completionCriteria.length === 0) {
      return 100;
    }
    const completed = this.completionCriteria.filter(c => c.completed).length;
    return Math.round((completed / this.completionCriteria.length) * 100);
  }

  /**
   * Check if milestone needs approval
   */
  needsApproval(): boolean {
    return this.requiresApproval && this.completed && !this.approvedBy;
  }

  /**
   * Check if milestone is upcoming (within notification window)
   */
  isUpcoming(): boolean {
    if (this.completed) {
      return false;
    }
    const daysUntil = this.getDaysUntilDue();
    return daysUntil >= 0 && daysUntil <= this.notifyDaysBefore;
  }
}
