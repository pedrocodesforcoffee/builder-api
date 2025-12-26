import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Chain Status Enum
 *
 * Status of the approval chain
 */
export enum ChainStatus {
  DRAFT = 'draft', // Being configured
  ACTIVE = 'active', // In use
  COMPLETED = 'completed', // All approvals finished
  CANCELLED = 'cancelled', // Cancelled
  EXPIRED = 'expired', // Expired without completion
}

/**
 * Approval Step Configuration
 *
 * Defines a single approval step in the chain
 */
export interface ApprovalStep {
  stepNumber: number;
  stepName: string;

  // Approver definition (one of these)
  userId?: string; // Specific user
  roleId?: string; // Any user with this role
  groupId?: string; // Any user in this group

  approverName?: string; // Cached name
  approverEmail?: string; // Cached email

  // Step behavior
  isRequired: boolean; // Must be approved
  canDelegate: boolean; // Can delegate to others
  requiresComment: boolean; // Must provide comment
  requiresSignature: boolean; // Must digitally sign

  // Parallel processing
  isParallel: boolean; // Can process in parallel with others
  parallelGroupId?: string; // Group for parallel steps

  // Timing
  dueDateOffset?: number; // Days from chain start
  estimatedDays?: number; // Expected duration

  // Status (populated during execution)
  status?: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'skipped';
  completedAt?: Date;
  completedBy?: string;
  decision?: string;
  comments?: string;
}

/**
 * Escalation Rule
 *
 * Defines when and how to escalate
 */
export interface EscalationRule {
  condition: 'overdue' | 'no_response' | 'rejected';
  daysBeforeEscalation: number;
  escalateTo: string[]; // User IDs to escalate to
  notificationMessage?: string;
  autoApprove?: boolean; // Auto-approve if escalation triggers
}

/**
 * ApprovalChain Entity
 *
 * Defines multi-step approval workflows with sequential and parallel steps.
 * Can be used standalone or referenced by submittals/documents.
 *
 * Features:
 * - Sequential and parallel approval steps
 * - Role-based and user-specific approvers
 * - Escalation rules
 * - Deadline management
 * - Conditional branching
 */
@Entity('approval_chains')
@Index(['projectId', 'status'])
@Index(['entityType', 'entityId'])
@Index(['status', 'dueDate'])
export class ApprovalChain {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ==================== Identification ====================

  @Column('varchar', { length: 100 })
  name!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('uuid')
  @Index()
  projectId!: string;

  // ==================== Entity Link ====================

  @Column('varchar', { length: 50 })
  @Index()
  entityType!: string; // 'submittal' | 'document' | 'change_order' | 'rfi'

  @Column('uuid')
  @Index()
  entityId!: string; // ID of linked entity

  @Column('varchar', { length: 200, nullable: true })
  entityTitle!: string | null; // Cached entity title

  // ==================== Configuration ====================

  @Column('jsonb')
  approvalSteps!: ApprovalStep[];

  @Column('int', { default: 0 })
  totalSteps!: number; // Computed from approvalSteps

  @Column('int', { default: 0 })
  requiredSteps!: number; // Number of required steps

  @Column('int', { default: 0 })
  currentStepNumber!: number; // Current step in sequence

  @Column('boolean', { default: false })
  allowParallelApproval!: boolean; // If steps can run in parallel

  @Column('boolean', { default: false })
  requireAllApprovals!: boolean; // All steps must approve (vs. majority)

  @Column('int', { nullable: true })
  minimumApprovals!: number | null; // Minimum approvals needed if not all

  // ==================== Status ====================

  @Column({ type: 'varchar', length: 50, default: ChainStatus.DRAFT })
  @Index()
  status!: ChainStatus;

  @Column('int', { default: 0 })
  completedSteps!: number;

  @Column('int', { default: 0 })
  approvedSteps!: number;

  @Column('int', { default: 0 })
  rejectedSteps!: number;

  @Column('boolean', { default: false })
  isFullyApproved!: boolean;

  @Column('boolean', { default: false })
  hasRejections!: boolean;

  // ==================== Timing ====================

  @Column('timestamp', { nullable: true })
  startedAt!: Date | null;

  @Column('timestamp', { nullable: true })
  dueDate!: Date | null;

  @Column('timestamp', { nullable: true })
  completedAt!: Date | null;

  @Column('int', { nullable: true })
  estimatedDurationDays!: number | null;

  @Column('int', { nullable: true })
  actualDurationDays!: number | null;

  @Column('boolean', { default: false })
  isOverdue!: boolean;

  // ==================== Escalation ====================

  @Column('jsonb', { nullable: true })
  escalationRules!: EscalationRule[] | null;

  @Column('boolean', { default: false })
  isEscalated!: boolean;

  @Column('timestamp', { nullable: true })
  escalatedAt!: Date | null;

  @Column('simple-array', { nullable: true })
  escalatedTo!: string[] | null; // User IDs

  @Column('int', { default: 0 })
  escalationCount!: number;

  // ==================== Conditional Logic ====================

  @Column('jsonb', { nullable: true })
  conditionalRules!: {
    field?: string; // Field to check
    operator?: 'equals' | 'greater_than' | 'less_than' | 'contains';
    value?: any; // Value to compare
    action?: 'skip_step' | 'add_step' | 'change_approver';
    targetStep?: number; // Step to affect
  }[] | null;

  // ==================== Notifications ====================

  @Column('jsonb', { nullable: true })
  notificationSettings!: {
    notifyOnStart?: boolean;
    notifyOnApproval?: boolean;
    notifyOnRejection?: boolean;
    notifyOnComplete?: boolean;
    notifyOnOverdue?: boolean;
    customRecipients?: string[]; // Additional user IDs to notify
  } | null;

  @Column('int', { default: 0 })
  remindersSent!: number;

  @Column('timestamp', { nullable: true })
  lastReminderSentAt!: Date | null;

  // ==================== Creator ====================

  @Column('uuid')
  createdBy!: string;

  @Column('varchar', { length: 100 })
  createdByName!: string;

  @Column('varchar', { length: 200 })
  createdByEmail!: string;

  // ==================== Completion Info ====================

  @Column('uuid', { nullable: true })
  completedBy!: string | null; // Who completed final step

  @Column('varchar', { length: 100, nullable: true })
  completedByName!: string | null;

  @Column('text', { nullable: true })
  finalComments!: string | null;

  @Column('text', { nullable: true })
  cancellationReason!: string | null;

  @Column('uuid', { nullable: true })
  cancelledBy!: string | null;

  @Column('timestamp', { nullable: true })
  cancelledAt!: Date | null;

  // ==================== Timestamps ====================

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // ==================== Additional Metadata ====================

  @Column('jsonb', { nullable: true })
  metadata!: {
    templateId?: string; // If created from template
    priority?: 'low' | 'normal' | 'high' | 'critical';
    category?: string;
    tags?: string[];
    customFields?: Record<string, any>;
    [key: string]: any;
  } | null;

  // ==================== Methods ====================

  /**
   * Get current approval step
   */
  getCurrentStep(): ApprovalStep | null {
    return (
      this.approvalSteps.find(
        (step) => step.stepNumber === this.currentStepNumber,
      ) || null
    );
  }

  /**
   * Get pending steps
   */
  getPendingSteps(): ApprovalStep[] {
    return this.approvalSteps.filter(
      (step) => !step.status || step.status === 'pending',
    );
  }

  /**
   * Get next step(s) to process
   */
  getNextSteps(): ApprovalStep[] {
    if (this.allowParallelApproval) {
      // Get all pending steps in the next parallel group
      const pending = this.getPendingSteps();
      if (pending.length === 0) return [];

      const nextGroupId = pending[0].parallelGroupId;
      return pending.filter(
        (step) => step.parallelGroupId === nextGroupId,
      );
    } else {
      // Sequential: return next pending step
      const next = this.getCurrentStep();
      return next ? [next] : [];
    }
  }

  /**
   * Calculate approval progress
   */
  getProgress(): number {
    if (this.totalSteps === 0) return 0;
    return (this.completedSteps / this.totalSteps) * 100;
  }

  /**
   * Check if chain is complete
   */
  isComplete(): boolean {
    return [ChainStatus.COMPLETED, ChainStatus.CANCELLED, ChainStatus.EXPIRED].includes(
      this.status,
    );
  }

  /**
   * Check if chain is active
   */
  isActive(): boolean {
    return this.status === ChainStatus.ACTIVE;
  }

  /**
   * Check if approval requirements are met
   */
  meetsApprovalRequirements(): boolean {
    if (this.requireAllApprovals) {
      return this.approvedSteps === this.requiredSteps;
    }

    if (this.minimumApprovals) {
      return this.approvedSteps >= this.minimumApprovals;
    }

    // Default: majority of required steps
    return this.approvedSteps > this.requiredSteps / 2;
  }

  /**
   * Calculate days until due
   */
  daysUntilDue(): number | null {
    if (!this.dueDate) return null;
    const now = new Date();
    const diff = this.dueDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}
