import { IsString, IsOptional, IsArray, IsBoolean, IsNumber, IsEnum, IsUUID, IsDateString, ValidateNested, IsObject, MinLength, MaxLength, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import {
  SubmittalType,
  SubmittalStatus,
  SubmittalFinalStatus,
  WorkflowType,
} from '../entities/submittal.entity';
import {
  ReviewerType,
  ReviewerStatus,
  ReviewDecision,
} from '../entities/submittal-reviewer.entity';
import {
  CommentType,
  CommentVisibility,
} from '../entities/submittal-comment.entity';
import {
  TemplateCategory,
  TemplateScope,
  ReviewerStepConfig,
  WorkflowConditions,
} from '../entities/workflow-template.entity';
import {
  ApprovalStatus,
} from '../entities/document-approval.entity';
import {
  ApprovalActionType,
} from '../entities/approval-action.entity';

// ==================== Submittal DTOs ====================

/**
 * Create Submittal DTO
 */
export class CreateSubmittalDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  submittalNumber!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(SubmittalType)
  submittalType!: SubmittalType;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  specSection?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  specTitle?: string;

  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @IsOptional()
  @IsEnum(WorkflowType)
  workflowType?: WorkflowType;

  @IsOptional()
  @IsUUID()
  workflowTemplateId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  leadTimeDays?: number;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  documentIds?: string[];

  @IsOptional()
  @IsBoolean()
  requiresAllApprovals?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * Update Submittal DTO
 */
export class UpdateSubmittalDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  leadTimeDays?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * Submit for Review DTO
 */
export class SubmitForReviewDto {
  @IsOptional()
  @IsString()
  coverLetterComments?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddReviewerDto)
  reviewers?: AddReviewerDto[];

  @IsOptional()
  @IsBoolean()
  sendNotifications?: boolean;
}

/**
 * Add Reviewer DTO
 */
export class AddReviewerDto {
  @IsUUID()
  userId!: string;

  @IsEnum(ReviewerType)
  reviewerType!: ReviewerType;

  @IsNumber()
  @Min(0)
  reviewOrder!: number;

  @IsBoolean()
  isRequired!: boolean;

  @IsOptional()
  @IsBoolean()
  isFinalReviewer?: boolean;

  @IsOptional()
  @IsBoolean()
  canDelegate?: boolean;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  discipline?: string;
}

/**
 * Submit Review DTO
 */
export class SubmitReviewDto {
  @IsEnum(ReviewDecision)
  decision!: ReviewDecision;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsEnum(SubmittalFinalStatus)
  recommendedStatus?: SubmittalFinalStatus;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  markupDocumentIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attachmentDocumentIds?: string[];

  @IsOptional()
  @IsBoolean()
  signReview?: boolean;
}

/**
 * Assign Final Status DTO
 */
export class AssignFinalStatusDto {
  @IsEnum(SubmittalFinalStatus)
  finalStatus!: SubmittalFinalStatus;

  @IsOptional()
  @IsString()
  finalComments?: string;

  @IsOptional()
  @IsBoolean()
  requiresResubmittal?: boolean;

  @IsOptional()
  @IsString()
  resubmittalInstructions?: string;

  @IsOptional()
  @IsBoolean()
  signFinalReview?: boolean;
}

/**
 * Add Comment DTO
 */
export class AddCommentDto {
  @IsEnum(CommentType)
  commentType!: CommentType;

  @IsString()
  @MinLength(1)
  content!: string;

  @IsOptional()
  @IsEnum(CommentVisibility)
  visibility?: CommentVisibility;

  @IsOptional()
  @IsUUID()
  parentCommentId?: string;

  @IsOptional()
  @IsUUID()
  documentId?: string;

  @IsOptional()
  @IsNumber()
  pageNumber?: number;

  @IsOptional()
  @IsObject()
  coordinates?: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  mentionedUserIds?: string[];

  @IsOptional()
  @IsBoolean()
  requiresResponse?: boolean;

  @IsOptional()
  @IsDateString()
  responseDueDate?: string;
}

/**
 * Void Submittal DTO
 */
export class VoidSubmittalDto {
  @IsString()
  @MinLength(1)
  voidReason!: string;
}

// ==================== Response DTOs ====================

/**
 * Submittal Response DTO
 */
export class SubmittalResponseDto {
  id!: string;
  projectId!: string;
  submittalNumber!: string;
  title!: string;
  description!: string | null;
  submittalType!: SubmittalType;
  specSection!: string | null;
  specTitle!: string | null;
  revisionNumber!: number;
  status!: SubmittalStatus;
  workflowType!: WorkflowType | null;
  totalReviewers!: number;
  completedReviews!: number;
  reviewProgress!: number;
  submittedBy!: string;
  submittedByName!: string;
  submittedByCompany!: string;
  assignedTo!: string | null;
  assignedToName!: string | null;
  submittedAt!: Date | null;
  dueDate!: Date | null;
  isOverdue!: boolean;
  finalStatus!: SubmittalFinalStatus | null;
  finalComments!: string | null;
  finalReviewedAt!: Date | null;
  requiresResubmittal!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  // Computed fields
  daysUntilDue!: number | null;
  canEdit!: boolean;
  canSubmit!: boolean;
  canReview!: boolean;
  canClose!: boolean;
}

/**
 * Reviewer Response DTO
 */
export class ReviewerResponseDto {
  id!: string;
  submittalId!: string;
  userId!: string;
  userName!: string;
  userEmail!: string;
  company!: string | null;
  reviewerType!: ReviewerType;
  discipline!: string | null;
  reviewOrder!: number;
  isRequired!: boolean;
  isFinalReviewer!: boolean;
  status!: ReviewerStatus;
  decision!: ReviewDecision | null;
  comments!: string | null;
  recommendedStatus!: SubmittalFinalStatus | null;
  assignedAt!: Date | null;
  dueDate!: Date | null;
  startedAt!: Date | null;
  completedAt!: Date | null;
  isOverdue!: boolean;
  isDelegated!: boolean;
  delegatedTo!: string | null;
  delegatedToName!: string | null;
  hasMarkups!: boolean;
  isSigned!: boolean;
  createdAt!: Date;
}

/**
 * Comment Response DTO
 */
export class CommentResponseDto {
  id!: string;
  submittalId!: string;
  reviewerId!: string | null;
  parentCommentId!: string | null;
  authorId!: string;
  authorName!: string;
  authorEmail!: string;
  authorCompany!: string | null;
  commentType!: CommentType;
  content!: string;
  visibility!: CommentVisibility;
  documentId!: string | null;
  documentName!: string | null;
  pageNumber!: number | null;
  attachmentIds!: string[] | null;
  mentionedUserIds!: string[] | null;
  requiresResponse!: boolean;
  isResolved!: boolean;
  resolvedAt!: Date | null;
  replyCount!: number;
  isEdited!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}

// ==================== Workflow Template DTOs ====================

/**
 * Create Template DTO
 */
export class CreateTemplateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(TemplateCategory)
  category!: TemplateCategory;

  @IsEnum(TemplateScope)
  scope!: TemplateScope;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsEnum(WorkflowType)
  workflowType!: WorkflowType;

  @IsArray()
  @ValidateNested({ each: true })
  reviewerSteps!: ReviewerStepConfig[];

  @IsOptional()
  @IsBoolean()
  requireAllApprovals?: boolean;

  @IsOptional()
  @IsNumber()
  defaultLeadTimeDays?: number;

  @IsOptional()
  @IsBoolean()
  autoApply?: boolean;

  @IsOptional()
  @IsObject()
  conditions?: WorkflowConditions;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsObject()
  notificationSettings?: any;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * Update Template DTO
 */
export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  reviewerSteps?: ReviewerStepConfig[];

  @IsOptional()
  @IsBoolean()
  requireAllApprovals?: boolean;

  @IsOptional()
  @IsNumber()
  defaultLeadTimeDays?: number;

  @IsOptional()
  @IsBoolean()
  autoApply?: boolean;

  @IsOptional()
  @IsObject()
  conditions?: WorkflowConditions;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * Template Response DTO
 */
export class TemplateResponseDto {
  id!: string;
  name!: string;
  description!: string | null;
  category!: TemplateCategory;
  scope!: TemplateScope;
  projectId!: string | null;
  organizationId!: string | null;
  workflowType!: WorkflowType;
  reviewerSteps!: ReviewerStepConfig[];
  totalSteps!: number;
  requireAllApprovals!: boolean;
  defaultLeadTimeDays!: number | null;
  autoApply!: boolean;
  conditions!: WorkflowConditions | null;
  priority!: number;
  isActive!: boolean;
  isDefault!: boolean;
  usageCount!: number;
  lastUsedAt!: Date | null;
  createdBy!: string;
  createdByName!: string;
  createdAt!: Date;
  updatedAt!: Date;
  expectedDuration!: number;
}

// ==================== Approval DTOs ====================

/**
 * Create Approval Chain DTO
 */
export class CreateApprovalChainDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @MaxLength(50)
  entityType!: string;

  @IsUUID()
  entityId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  approvalSteps!: any[]; // ApprovalStep[]

  @IsOptional()
  @IsBoolean()
  allowParallelApproval?: boolean;

  @IsOptional()
  @IsBoolean()
  requireAllApprovals?: boolean;

  @IsOptional()
  @IsNumber()
  minimumApprovals?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  estimatedDurationDays?: number;

  @IsOptional()
  @IsArray()
  escalationRules?: any[];

  @IsOptional()
  @IsObject()
  notificationSettings?: any;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * Approve Document DTO
 */
export class ApproveDocumentDto {
  @IsOptional()
  @IsString()
  approvalComments?: string;

  @IsOptional()
  @IsString()
  conditions?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attachmentIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  markupIds?: string[];

  @IsOptional()
  @IsBoolean()
  signApproval?: boolean;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

/**
 * Reject Document DTO
 */
export class RejectDocumentDto {
  @IsString()
  @MinLength(1)
  rejectionReason!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredChanges?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  markupIds?: string[];

  @IsOptional()
  @IsBoolean()
  signRejection?: boolean;
}

/**
 * Conditional Approval DTO
 */
export class ConditionalApproveDto {
  @IsString()
  @MinLength(1)
  conditions!: string;

  @IsOptional()
  @IsString()
  approvalComments?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredChanges?: string[];

  @IsOptional()
  @IsBoolean()
  requiresResubmittal?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  markupIds?: string[];

  @IsOptional()
  @IsBoolean()
  signApproval?: boolean;
}

/**
 * Delegate Approval DTO
 */
export class DelegateApprovalDto {
  @IsUUID()
  delegatedTo!: string;

  @IsOptional()
  @IsString()
  delegationReason?: string;

  @IsOptional()
  @IsBoolean()
  sendNotification?: boolean;
}

/**
 * Extend Deadline DTO
 */
export class ExtendDeadlineDto {
  @IsDateString()
  newDueDate!: string;

  @IsString()
  @MinLength(1)
  reason!: string;
}

/**
 * Document Approval Response DTO
 */
export class DocumentApprovalResponseDto {
  id!: string;
  approvalChainId!: string;
  documentId!: string;
  documentVersionId!: string | null;
  documentName!: string;
  documentNumber!: string | null;
  documentType!: string | null;
  versionNumber!: string | null;
  status!: ApprovalStatus;
  approverId!: string | null;
  approverName!: string | null;
  approverEmail!: string | null;
  approvalComments!: string | null;
  conditions!: string | null;
  rejectionReason!: string | null;
  requiredChanges!: string[] | null;
  requestedAt!: Date | null;
  approvedAt!: Date | null;
  rejectedAt!: Date | null;
  dueDate!: Date | null;
  expiresAt!: Date | null;
  isOverdue!: boolean;
  isExpired!: boolean;
  requiresSignature!: boolean;
  isSigned!: boolean;
  stampedDocumentId!: string | null;
  isDelegated!: boolean;
  submittedBy!: string;
  submittedByName!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

/**
 * Approval Chain Response DTO
 */
export class ApprovalChainResponseDto {
  id!: string;
  name!: string;
  description!: string | null;
  projectId!: string;
  entityType!: string;
  entityId!: string;
  entityTitle!: string | null;
  approvalSteps!: any[];
  totalSteps!: number;
  requiredSteps!: number;
  currentStepNumber!: number;
  status!: string;
  completedSteps!: number;
  approvedSteps!: number;
  rejectedSteps!: number;
  isFullyApproved!: boolean;
  hasRejections!: boolean;
  startedAt!: Date | null;
  dueDate!: Date | null;
  completedAt!: Date | null;
  estimatedDurationDays!: number | null;
  actualDurationDays!: number | null;
  isOverdue!: boolean;
  isEscalated!: boolean;
  escalatedAt!: Date | null;
  progress!: number;
  createdBy!: string;
  createdByName!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

/**
 * Approval Action Response DTO
 */
export class ApprovalActionResponseDto {
  id!: string;
  documentApprovalId!: string;
  approvalChainId!: string;
  stepNumber!: number | null;
  actionType!: ApprovalActionType;
  description!: string;
  comments!: string | null;
  actorId!: string | null;
  actorName!: string | null;
  actorEmail!: string | null;
  actorRole!: string | null;
  isSystemAction!: boolean;
  changeData: any;
  includesSignature!: boolean;
  createdAt!: Date;
}

// ==================== Query DTOs ====================

/**
 * List Submittals Query DTO
 */
export class ListSubmittalsDto {
  @IsOptional()
  @IsEnum(SubmittalStatus)
  status?: SubmittalStatus;

  @IsOptional()
  @IsEnum(SubmittalType)
  submittalType?: SubmittalType;

  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @IsOptional()
  @IsUUID()
  submittedBy?: string;

  @IsOptional()
  @IsBoolean()
  isOverdue?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * List Templates Query DTO
 */
export class ListTemplatesDto {
  @IsOptional()
  @IsEnum(TemplateCategory)
  category?: TemplateCategory;

  @IsOptional()
  @IsEnum(TemplateScope)
  scope?: TemplateScope;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}

/**
 * List Approvals Query DTO
 */
export class ListApprovalsDto {
  @IsOptional()
  @IsEnum(ApprovalStatus)
  status?: ApprovalStatus;

  @IsOptional()
  @IsUUID()
  approverId?: string;

  @IsOptional()
  @IsBoolean()
  isOverdue?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresAction?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}
