import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { FieldNote } from './field-note.entity';
import { User } from '../../users/entities/user.entity';
import { FieldNoteHistoryAction } from '../enums/field-note.enum';

/**
 * Field Note History entity for comprehensive audit trail
 * Tracks all changes made to field notes including before/after snapshots
 */
@Entity('field_note_history')
@Index(['fieldNoteId', 'createdAt'])
@Index(['action'])
@Index(['performedById'])
export class FieldNoteHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Action type that was performed
   */
  @Column({ type: 'enum', enum: FieldNoteHistoryAction })
  action: FieldNoteHistoryAction;

  /**
   * Human-readable description of the change
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Field name that was changed (for UPDATE actions)
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  fieldName: string | null;

  /**
   * Previous value (before change)
   */
  @Column({ type: 'jsonb', nullable: true })
  oldValue: any | null;

  /**
   * New value (after change)
   */
  @Column({ type: 'jsonb', nullable: true })
  newValue: any | null;

  /**
   * Complete snapshot of field note state before change
   * (useful for major changes like status transitions)
   */
  @Column({ type: 'jsonb', nullable: true })
  snapshot: any | null;

  /**
   * Additional metadata about the change
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    // IP address
    ipAddress?: string;

    // User agent
    userAgent?: string;

    // Device info
    deviceInfo?: {
      platform?: string;
      browser?: string;
      version?: string;
    };

    // Location info (if available)
    location?: {
      latitude?: number;
      longitude?: number;
      accuracy?: number;
    };

    // Related entity info (for link/attachment actions)
    relatedEntityId?: string;
    relatedEntityType?: string;

    // Assignment info
    previousAssignee?: string;
    newAssignee?: string;

    // Additional context
    [key: string]: any;
  } | null;

  /**
   * Change reason or notes (optional, user-provided)
   */
  @Column({ type: 'text', nullable: true })
  reason: string | null;

  // Relations

  @Column({ type: 'uuid' })
  fieldNoteId: string;

  @ManyToOne(() => FieldNote, (fieldNote) => fieldNote.history, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'fieldNoteId' })
  fieldNote: FieldNote;

  @Column({ type: 'uuid' })
  performedById: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'performedById' })
  performedBy: User;

  @CreateDateColumn({
    name: 'createdAt',
    type: 'timestamp with time zone',
  })
  createdAt: Date;

  // Helper methods

  /**
   * Check if action is a creation
   */
  isCreation(): boolean {
    return this.action === FieldNoteHistoryAction.CREATED;
  }

  /**
   * Check if action is an update
   */
  isUpdate(): boolean {
    return this.action === FieldNoteHistoryAction.UPDATED;
  }

  /**
   * Check if action is a status change
   */
  isStatusChange(): boolean {
    return this.action === FieldNoteHistoryAction.STATUS_CHANGED;
  }

  /**
   * Check if action is an assignment
   */
  isAssignment(): boolean {
    return (
      this.action === FieldNoteHistoryAction.ASSIGNED ||
      this.action === FieldNoteHistoryAction.UNASSIGNED
    );
  }

  /**
   * Check if action involves attachments
   */
  isAttachmentAction(): boolean {
    return (
      this.action === FieldNoteHistoryAction.ATTACHMENT_ADDED ||
      this.action === FieldNoteHistoryAction.ATTACHMENT_REMOVED
    );
  }

  /**
   * Check if action involves links
   */
  isLinkAction(): boolean {
    return (
      this.action === FieldNoteHistoryAction.LINK_ADDED ||
      this.action === FieldNoteHistoryAction.LINK_REMOVED
    );
  }

  /**
   * Check if action involves comments
   */
  isCommentAction(): boolean {
    return (
      this.action === FieldNoteHistoryAction.COMMENT_ADDED ||
      this.action === FieldNoteHistoryAction.COMMENT_REMOVED
    );
  }

  /**
   * Get formatted description with user name
   */
  getFormattedDescription(userName: string): string {
    if (this.description) {
      return this.description;
    }

    // Generate description based on action
    switch (this.action) {
      case FieldNoteHistoryAction.CREATED:
        return `${userName} created this field note`;
      case FieldNoteHistoryAction.UPDATED:
        if (this.fieldName) {
          return `${userName} updated ${this.fieldName}`;
        }
        return `${userName} updated this field note`;
      case FieldNoteHistoryAction.STATUS_CHANGED:
        return `${userName} changed status from ${this.oldValue} to ${this.newValue}`;
      case FieldNoteHistoryAction.VISIBILITY_CHANGED:
        return `${userName} changed visibility from ${this.oldValue} to ${this.newValue}`;
      case FieldNoteHistoryAction.ATTACHMENT_ADDED:
        return `${userName} added an attachment`;
      case FieldNoteHistoryAction.ATTACHMENT_REMOVED:
        return `${userName} removed an attachment`;
      case FieldNoteHistoryAction.LINK_ADDED:
        return `${userName} added a link`;
      case FieldNoteHistoryAction.LINK_REMOVED:
        return `${userName} removed a link`;
      case FieldNoteHistoryAction.COMMENT_ADDED:
        return `${userName} added a comment`;
      case FieldNoteHistoryAction.COMMENT_REMOVED:
        return `${userName} removed a comment`;
      case FieldNoteHistoryAction.ASSIGNED:
        return `${userName} assigned this note`;
      case FieldNoteHistoryAction.UNASSIGNED:
        return `${userName} unassigned this note`;
      case FieldNoteHistoryAction.FOLLOW_UP_COMPLETED:
        return `${userName} completed the follow-up`;
      case FieldNoteHistoryAction.ARCHIVED:
        return `${userName} archived this note`;
      case FieldNoteHistoryAction.RESTORED:
        return `${userName} restored this note`;
      default:
        return `${userName} performed an action`;
    }
  }
}
