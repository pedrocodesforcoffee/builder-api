import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { FieldNote } from './field-note.entity';
import { User } from '../../users/entities/user.entity';
import { CommentVisibility } from '../enums/field-note.enum';

/**
 * Field Note Comment entity for discussions and threaded conversations
 * Supports parent-child threading, mentions, visibility control, and reactions
 */
@Entity('field_note_comments')
@Index(['fieldNoteId', 'createdAt'])
@Index(['parentCommentId'])
@Index(['createdById'])
export class FieldNoteComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Comment text content
   */
  @Column({ type: 'text' })
  content: string;

  /**
   * Comment visibility level
   */
  @Column({
    type: 'enum',
    enum: CommentVisibility,
    default: CommentVisibility.PUBLIC,
  })
  visibility: CommentVisibility;

  /**
   * Parent comment ID (for threading)
   * Null for top-level comments
   */
  @Column({ type: 'uuid', nullable: true })
  parentCommentId: string | null;

  /**
   * User IDs mentioned in the comment (for notifications)
   */
  @Column({ type: 'uuid', array: true, default: [] })
  mentionedUserIds: string[];

  /**
   * Reactions/votes (likes, helpful, etc.)
   */
  @Column({ type: 'jsonb', nullable: true })
  reactions: {
    likes?: number;
    helpful?: number;
    userReactions?: Array<{
      userId: string;
      type: 'like' | 'helpful';
      createdAt: string;
    }>;
  } | null;

  /**
   * Edited flag
   */
  @Column({ type: 'boolean', default: false })
  isEdited: boolean;

  /**
   * Edited at timestamp
   */
  @Column({ type: 'timestamp with time zone', nullable: true })
  editedAt: Date | null;

  /**
   * Soft delete flag
   */
  @Column({ type: 'boolean', default: false })
  isDeleted: boolean;

  /**
   * Deleted at timestamp
   */
  @Column({ type: 'timestamp with time zone', nullable: true })
  deletedAt: Date | null;

  /**
   * Attachments in the comment (file URLs)
   */
  @Column({ type: 'jsonb', nullable: true })
  attachments: Array<{
    url: string;
    filename: string;
    fileSize?: number;
    mimeType?: string;
  }> | null;

  // Relations

  @Column({ type: 'uuid' })
  fieldNoteId: string;

  @ManyToOne(() => FieldNote, (fieldNote) => fieldNote.comments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'fieldNoteId' })
  fieldNote: FieldNote;

  @ManyToOne(() => FieldNoteComment, (comment) => comment.replies, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parentCommentId' })
  parentComment: FieldNoteComment | null;

  @OneToMany(() => FieldNoteComment, (comment) => comment.parentComment)
  replies: FieldNoteComment[];

  @Column({ type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn({
    name: 'createdAt',
    type: 'timestamp with time zone',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updatedAt',
    type: 'timestamp with time zone',
  })
  updatedAt: Date;

  // Helper methods

  /**
   * Check if comment is a reply (has parent)
   */
  isReply(): boolean {
    return this.parentCommentId !== null;
  }

  /**
   * Check if comment is top-level
   */
  isTopLevel(): boolean {
    return this.parentCommentId === null;
  }

  /**
   * Check if comment can be edited
   */
  canEdit(): boolean {
    return !this.isDeleted;
  }

  /**
   * Check if comment has reactions
   */
  hasReactions(): boolean {
    return (
      this.reactions !== null &&
      ((this.reactions.likes && this.reactions.likes > 0) ||
        (this.reactions.helpful && this.reactions.helpful > 0))
    );
  }

  /**
   * Get total reaction count
   */
  getTotalReactions(): number {
    if (!this.reactions) return 0;
    return (this.reactions.likes || 0) + (this.reactions.helpful || 0);
  }

  /**
   * Check if user has reacted
   */
  hasUserReacted(userId: string): boolean {
    if (!this.reactions?.userReactions) return false;
    return this.reactions.userReactions.some((r) => r.userId === userId);
  }

  /**
   * Add reaction
   */
  addReaction(userId: string, type: 'like' | 'helpful'): void {
    if (!this.reactions) {
      this.reactions = { likes: 0, helpful: 0, userReactions: [] };
    }
    if (!this.reactions.userReactions) {
      this.reactions.userReactions = [];
    }

    // Check if user already reacted with this type
    const existingReaction = this.reactions.userReactions.find(
      (r) => r.userId === userId && r.type === type
    );
    if (existingReaction) return;

    // Add reaction
    this.reactions.userReactions.push({
      userId,
      type,
      createdAt: new Date().toISOString(),
    });

    // Increment count
    if (type === 'like') {
      this.reactions.likes = (this.reactions.likes || 0) + 1;
    } else if (type === 'helpful') {
      this.reactions.helpful = (this.reactions.helpful || 0) + 1;
    }
  }

  /**
   * Remove reaction
   */
  removeReaction(userId: string, type: 'like' | 'helpful'): void {
    if (!this.reactions?.userReactions) return;

    const index = this.reactions.userReactions.findIndex(
      (r) => r.userId === userId && r.type === type
    );
    if (index === -1) return;

    // Remove reaction
    this.reactions.userReactions.splice(index, 1);

    // Decrement count
    if (type === 'like' && this.reactions.likes) {
      this.reactions.likes = Math.max(0, this.reactions.likes - 1);
    } else if (type === 'helpful' && this.reactions.helpful) {
      this.reactions.helpful = Math.max(0, this.reactions.helpful - 1);
    }
  }

  /**
   * Mark as edited
   */
  markAsEdited(): void {
    this.isEdited = true;
    this.editedAt = new Date();
  }

  /**
   * Soft delete
   */
  softDelete(): void {
    this.isDeleted = true;
    this.deletedAt = new Date();
  }
}
