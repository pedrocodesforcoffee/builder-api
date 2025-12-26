import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { WorkflowType } from './submittal.entity';
import { ReviewerType } from './submittal-reviewer.entity';

/**
 * Template Scope Enum
 *
 * Who can use this template
 */
export enum TemplateScope {
  PROJECT = 'project', // Available to project only
  ORGANIZATION = 'organization', // Available to entire organization
  PERSONAL = 'personal', // Available to creator only
  SYSTEM = 'system', // System-provided template
}

/**
 * Template Category Enum
 *
 * Category of workflow template
 */
export enum TemplateCategory {
  SUBMITTAL = 'submittal', // For submittal workflows
  DOCUMENT_REVIEW = 'document_review', // For general document review
  APPROVAL = 'approval', // For approval workflows
  CUSTOM = 'custom', // Custom workflow type
}

/**
 * Reviewer Step Configuration
 *
 * Defines a single reviewer in the workflow
 */
export interface ReviewerStepConfig {
  // Reviewer identification (one of these required)
  userId?: string; // Specific user
  roleId?: string; // Any user with this role
  discipline?: string; // Any user with this discipline
  email?: string; // External email

  // Step configuration
  reviewerType: ReviewerType;
  reviewOrder: number; // 0 = parallel, >0 = sequential
  isRequired: boolean;
  isFinalReviewer: boolean;
  canDelegate: boolean;

  // Timing
  dueDateOffset?: number; // Days from submittal date
  estimatedDays?: number; // Estimated review time

  // Notification settings
  sendNotification?: boolean;
  reminderIntervalDays?: number;

  // Additional settings
  description?: string;
  instructions?: string;
}

/**
 * Workflow Conditions
 *
 * When to apply this template automatically
 */
export interface WorkflowConditions {
  // Document filters
  documentTypes?: string[]; // Apply to these document types
  specSections?: string[]; // Apply to these spec sections
  disciplines?: string[]; // Apply to these disciplines

  // Value thresholds
  minValue?: number; // Minimum dollar value
  maxValue?: number; // Maximum dollar value

  // Tags and metadata
  requiredTags?: string[];
  excludedTags?: string[];

  // Custom rules
  customRules?: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
    value: any;
  }>;
}

/**
 * WorkflowTemplate Entity
 *
 * Reusable workflow configurations for submittals and approvals.
 * Templates define reviewer sequences, timing, and automation rules.
 *
 * Features:
 * - Sequential and parallel workflow definitions
 * - Role-based and user-specific reviewers
 * - Automatic template selection based on conditions
 * - SLA and deadline calculations
 * - Notification and reminder settings
 */
@Entity('workflow_templates')
@Index(['projectId', 'isActive'])
@Index(['organizationId', 'scope'])
@Index(['category', 'isActive'])
export class WorkflowTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ==================== Identification ====================

  @Column('varchar', { length: 100 })
  name!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 50, default: TemplateCategory.SUBMITTAL })
  category!: TemplateCategory;

  @Column({ type: 'varchar', length: 50, default: TemplateScope.PROJECT })
  scope!: TemplateScope;

  // ==================== Ownership ====================

  @Column('uuid', { nullable: true })
  projectId!: string | null; // Null for org/system templates

  @Column('uuid', { nullable: true })
  organizationId!: string | null; // For org-level templates

  @Column('uuid')
  createdBy!: string;

  @Column('varchar', { length: 100 })
  createdByName!: string;

  // ==================== Workflow Configuration ====================

  @Column({ type: 'varchar', length: 50, default: WorkflowType.SEQUENTIAL })
  workflowType!: WorkflowType;

  @Column('jsonb')
  reviewerSteps!: ReviewerStepConfig[];

  @Column('boolean', { default: false })
  requireAllApprovals!: boolean; // All reviewers must approve

  @Column('int', { nullable: true })
  totalSteps!: number; // Computed from reviewerSteps

  // ==================== Timing & SLA ====================

  @Column('int', { nullable: true })
  defaultLeadTimeDays!: number | null; // Default review time

  @Column('int', { nullable: true })
  dueDateOffsetDays!: number | null; // Days from submission

  @Column('jsonb', { nullable: true })
  slaConfig!: {
    targetDays?: number; // Target completion time
    warningDays?: number; // When to show warning
    escalationDays?: number; // When to escalate
    escalationUserIds?: string[]; // Who to escalate to
  } | null;

  // ==================== Automation ====================

  @Column('boolean', { default: false })
  autoApply!: boolean; // Automatically apply when conditions match

  @Column('jsonb', { nullable: true })
  conditions!: WorkflowConditions | null; // When to auto-apply

  @Column('int', { default: 0 })
  priority!: number; // Higher priority templates chosen first

  // ==================== Notifications ====================

  @Column('jsonb', { nullable: true })
  notificationSettings!: {
    notifyOnSubmit?: boolean;
    notifyOnReviewStart?: boolean;
    notifyOnReviewComplete?: boolean;
    notifyOnOverdue?: boolean;
    notifyOnEscalation?: boolean;
    customNotifications?: Array<{
      event: string;
      recipients: string[]; // 'submitter' | 'reviewers' | 'userId'
      template?: string;
    }>;
  } | null;

  @Column('int', { nullable: true })
  defaultReminderIntervalDays!: number | null;

  // ==================== Status & Usage ====================

  @Column('boolean', { default: true })
  @Index()
  isActive!: boolean;

  @Column('boolean', { default: false })
  isDefault!: boolean; // Default template for project/category

  @Column('int', { default: 0 })
  usageCount!: number; // Times used

  @Column('timestamp', { nullable: true })
  lastUsedAt!: Date | null;

  // ==================== Versioning ====================

  @Column('int', { default: 1 })
  version!: number;

  @Column('uuid', { nullable: true })
  previousVersionId!: string | null; // Link to previous version

  @Column('text', { nullable: true })
  changeLog!: string | null; // Description of changes

  // ==================== Approval Requirements ====================

  @Column('jsonb', { nullable: true })
  approvalRules!: {
    minimumApprovals?: number; // Min number of approvals needed
    requiredReviewerIds?: string[]; // Must have approval from these
    allowParallelApproval?: boolean;
    allowDelegation?: boolean;
    requireDigitalSignature?: boolean;
    requireComments?: boolean;
  } | null;

  // ==================== Document Requirements ====================

  @Column('jsonb', { nullable: true })
  documentRequirements!: {
    requiredDocumentTypes?: Array<{
      type: string;
      purpose: string;
      isRequired: boolean;
      allowMultiple: boolean;
    }>;
    minimumDocuments?: number;
    maximumDocuments?: number;
    requiredAttachments?: string[];
  } | null;

  // ==================== Timestamps ====================

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column('timestamp', { nullable: true })
  archivedAt!: Date | null;

  @Column('uuid', { nullable: true })
  archivedBy!: string | null;

  // ==================== Additional Metadata ====================

  @Column('jsonb', { nullable: true })
  metadata!: {
    tags?: string[];
    industry?: string; // 'commercial' | 'residential' | 'industrial'
    complexity?: 'simple' | 'standard' | 'complex';
    estimatedDuration?: string; // Human-readable duration
    instructions?: string; // Usage instructions
    [key: string]: any;
  } | null;

  // ==================== Methods ====================

  /**
   * Check if template matches given conditions
   */
  matchesConditions(data: {
    documentType?: string;
    specSection?: string;
    discipline?: string;
    value?: number;
    tags?: string[];
    metadata?: Record<string, any>;
  }): boolean {
    if (!this.autoApply || !this.conditions) return false;

    // Check document type
    if (
      this.conditions.documentTypes &&
      data.documentType &&
      !this.conditions.documentTypes.includes(data.documentType)
    ) {
      return false;
    }

    // Check spec section
    if (
      this.conditions.specSections &&
      data.specSection &&
      !this.conditions.specSections.includes(data.specSection)
    ) {
      return false;
    }

    // Check discipline
    if (
      this.conditions.disciplines &&
      data.discipline &&
      !this.conditions.disciplines.includes(data.discipline)
    ) {
      return false;
    }

    // Check value thresholds
    if (
      this.conditions.minValue !== undefined &&
      data.value !== undefined &&
      data.value < this.conditions.minValue
    ) {
      return false;
    }

    if (
      this.conditions.maxValue !== undefined &&
      data.value !== undefined &&
      data.value > this.conditions.maxValue
    ) {
      return false;
    }

    // Check required tags
    if (
      this.conditions.requiredTags &&
      data.tags &&
      !this.conditions.requiredTags.every((tag) => data.tags?.includes(tag))
    ) {
      return false;
    }

    // Check excluded tags
    if (
      this.conditions.excludedTags &&
      data.tags &&
      this.conditions.excludedTags.some((tag) => data.tags?.includes(tag))
    ) {
      return false;
    }

    return true;
  }

  /**
   * Calculate total expected duration
   */
  calculateExpectedDuration(): number {
    if (this.defaultLeadTimeDays) {
      return this.defaultLeadTimeDays;
    }

    // Sum up estimated days from reviewer steps
    let totalDays = 0;

    if (this.workflowType === WorkflowType.SEQUENTIAL) {
      // Sequential: sum all steps
      totalDays = this.reviewerSteps.reduce(
        (sum, step) => sum + (step.estimatedDays || 3),
        0,
      );
    } else {
      // Parallel: take maximum
      totalDays = Math.max(
        ...this.reviewerSteps.map((step) => step.estimatedDays || 3),
      );
    }

    return totalDays;
  }

  /**
   * Get required reviewers
   */
  getRequiredReviewers(): ReviewerStepConfig[] {
    return this.reviewerSteps.filter((step) => step.isRequired);
  }

  /**
   * Get optional reviewers
   */
  getOptionalReviewers(): ReviewerStepConfig[] {
    return this.reviewerSteps.filter((step) => !step.isRequired);
  }

  /**
   * Check if template is archived
   */
  isArchived(): boolean {
    return this.archivedAt !== null;
  }
}
