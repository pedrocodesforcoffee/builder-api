import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { Document } from './document.entity';

/**
 * User Favorite Entity
 *
 * Tracks user's favorite/starred documents for quick access.
 *
 * Features:
 * - Unique constraint per user-document pair
 * - Optional tags/notes for organization
 * - Timestamp for recency sorting
 *
 * Used for:
 * - Quick access sidebar
 * - "My Favorites" page
 * - Personalized recommendations
 */
@Entity('user_favorites')
@Unique(['userId', 'documentId'])
@Index(['userId', 'createdAt'])
export class UserFavorite {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  @Index()
  userId!: string;

  @Column('uuid')
  @Index()
  documentId!: string;

  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'documentId' })
  document!: Document;

  // Optional user notes
  @Column('text', { nullable: true })
  notes!: string | null;

  // Optional tags for organization
  @Column('simple-array', { nullable: true })
  tags!: string[] | null;

  @CreateDateColumn()
  createdAt!: Date;

  @Column('timestamp', { nullable: true })
  lastAccessedAt!: Date | null;
}
