import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Submittal } from './submittal.entity';

/**
 * Comment Type Enum
 *
 * Classification of comment purpose
 */
export enum CommentType {
  GENERAL = 'general', // General comment
  QUESTION = 'question', // Question requiring response
  ISSUE = 'issue', // Issue identified
  CLARIFICATION = 'clarification', // Request for clarification
  APPROVAL_NOTE = 'approval_note', // Note from approver
  REJECTION_REASON = 'rejection_reason', // Reason for rejection
  SYSTEM = 'system', // System-generated comment
}

/**
 * Comment Visibility Enum
 *
 * Who can see the comment
 */
export enum CommentVisibility {
  PUBLIC = 'public', // All parties can see
  INTERNAL = 'internal', // Only reviewer's organization
  PRIVATE = 'private', // Only comment author
}

/**
 * SubmittalComment Entity
 *
 * Comments and discussions on submittals.
 * Supports threaded conversations and attachments.
 *
 * Features:
 * - Threaded replies
 * - Multiple comment types
 * - Visibility control
 * - Document attachments
 * - Markup references
 * - Mention notifications
 */
@Entity('submittal_comments')
@Index(['submittalId', 'createdAt'])
@Index(['submittalId', 'parentCommentId'])
@Index(['authorId'])
@Index(['reviewerId'])
export class SubmittalComment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ==================== Relationships ====================

  @Column('uuid')
  @Index()
  submittalId!: string;

  @ManyToOne(() => Submittal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submittalId' })
  submittal!: Submittal;

  @Column('uuid', { nullable: true })
  @Index()
  reviewerId!: string | null; // SubmittalReviewer ID if from reviewer

  @Column('uuid', { nullable: true })
  @Index()
  parentCommentId!: string | null; // For threaded replies

  // ==================== Author Info ====================

  @Column('uuid')
  @Index()
  authorId!: string;

  @Column('varchar', { length: 100 })
  authorName!: string;

  @Column('varchar', { length: 200 })
  authorEmail!: string;

  @Column('varchar', { length: 100, nullable: true })
  authorCompany!: string | null;

  @Column('varchar', { length: 50, nullable: true })
  authorRole!: string | null; // ProjectRole

  // ==================== Comment Content ====================

  @Column({ type: 'varchar', length: 50, default: CommentType.GENERAL })
  commentType!: CommentType;

  @Column('text')
  content!: string;

  @Column({ type: 'varchar', length: 50, default: CommentVisibility.PUBLIC })
  visibility!: CommentVisibility;

  @Column('boolean', { default: false })
  isSystemGenerated!: boolean;

  // ==================== Document References ====================

  @Column('uuid', { nullable: true })
  documentId!: string | null; // Specific document being commented on

  @Column('varchar', { length: 200, nullable: true })
  documentName!: string | null;

  @Column('int', { nullable: true })
  pageNumber!: number | null; // Specific page in document

  @Column('jsonb', { nullable: true })
  coordinates!: {
    x: number;
    y: number;
    width?: number;
    height?: number;
    page?: number;
  } | null; // Coordinates for pinned comments on document

  // ==================== Attachments ====================

  @Column('simple-array', { nullable: true })
  attachmentIds!: string[] | null; // Document IDs of attachments

  @Column('simple-array', { nullable: true })
  markupIds!: string[] | null; // Markup document IDs

  // ==================== Mentions & Notifications ====================

  @Column('simple-array', { nullable: true })
  mentionedUserIds!: string[] | null; // @mentioned users

  @Column('boolean', { default: false })
  requiresResponse!: boolean; // If response is needed

  @Column('timestamp', { nullable: true })
  responseDueDate!: Date | null;

  @Column('boolean', { default: false })
  isResolved!: boolean; // For questions/issues

  @Column('timestamp', { nullable: true })
  resolvedAt!: Date | null;

  @Column('uuid', { nullable: true })
  resolvedBy!: string | null;

  @Column('text', { nullable: true })
  resolutionNote!: string | null;

  // ==================== Threading ====================

  @Column('int', { default: 0 })
  replyCount!: number; // Number of replies

  @Column('boolean', { default: false })
  isEdited!: boolean;

  @Column('timestamp', { nullable: true })
  editedAt!: Date | null;

  @Column('text', { nullable: true })
  editHistory!: string | null; // JSON array of edits

  // ==================== Reactions & Voting ====================

  @Column('jsonb', { nullable: true })
  reactions!: {
    [emoji: string]: string[]; // { "👍": ["userId1", "userId2"] }
  } | null;

  @Column('int', { default: 0 })
  upvotes!: number;

  @Column('int', { default: 0 })
  downvotes!: number;

  // ==================== Timestamps ====================

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column('timestamp', { nullable: true })
  deletedAt!: Date | null; // Soft delete

  @Column('uuid', { nullable: true })
  deletedBy!: string | null;

  // ==================== Additional Metadata ====================

  @Column('jsonb', { nullable: true })
  metadata!: {
    notificationsSent?: string[]; // User IDs notified
    readBy?: Array<{
      userId: string;
      readAt: Date;
    }>;
    highlightColor?: string; // For visual emphasis
    priority?: 'low' | 'medium' | 'high' | 'critical';
    tags?: string[];
    [key: string]: any;
  } | null;

  // ==================== Methods ====================

  /**
   * Check if comment is a reply
   */
  isReply(): boolean {
    return this.parentCommentId !== null;
  }

  /**
   * Check if comment is deleted
   */
  isDeleted(): boolean {
    return this.deletedAt !== null;
  }

  /**
   * Check if comment can be edited by user
   */
  canEdit(userId: string): boolean {
    if (this.isDeleted()) return false;
    if (this.authorId !== userId) return false;

    // Can't edit system comments
    if (this.isSystemGenerated) return false;

    // Can edit within 24 hours
    const hoursSinceCreated =
      (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceCreated < 24;
  }

  /**
   * Check if comment needs response
   */
  needsResponse(): boolean {
    return (
      this.requiresResponse && !this.isResolved && this.deletedAt === null
    );
  }

  /**
   * Check if comment is overdue for response
   */
  isOverdue(): boolean {
    if (!this.responseDueDate) return false;
    if (this.isResolved) return false;
    return new Date() > this.responseDueDate;
  }

  /**
   * Get total reaction count
   */
  getTotalReactions(): number {
    if (!this.reactions) return 0;
    return Object.values(this.reactions).reduce(
      (sum, users) => sum + users.length,
      0,
    );
  }
}
