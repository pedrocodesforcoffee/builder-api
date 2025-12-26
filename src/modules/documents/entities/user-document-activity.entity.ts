import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Document } from './document.entity';
import { DocumentVersion } from './document-version.entity';

/**
 * Activity types for document interactions
 */
export enum DocumentActivityType {
  VIEW = 'view',
  DOWNLOAD = 'download',
  SEARCH_CLICK = 'search_click',
  SHARE = 'share',
  COMMENT = 'comment',
}

/**
 * User Document Activity Entity
 *
 * Tracks all user interactions with documents for:
 * - Recent documents list
 * - Search result click-through tracking
 * - Usage analytics
 * - Activity feeds
 *
 * Indexed for fast retrieval of user's recent activities
 */
@Entity('user_document_activities')
@Index(['userId', 'activityType', 'activityDate'])
@Index(['documentId', 'activityDate'])
@Index(['userId', 'activityDate'])
export class UserDocumentActivity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column('uuid')
  @Index()
  documentId!: string;

  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'documentId' })
  document!: Document;

  @Column('uuid', { nullable: true })
  versionId!: string | null;

  @ManyToOne(() => DocumentVersion, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'versionId' })
  version!: DocumentVersion | null;

  @Column({
    type: 'varchar',
    length: 50,
  })
  activityType!: DocumentActivityType;

  @Column('timestamp')
  @Index()
  activityDate!: Date;

  // Search context (if activity came from search)
  @Column('text', { nullable: true })
  searchQuery!: string | null;

  @Column('int', { nullable: true })
  searchResultPosition!: number | null; // Position in search results (for CTR analysis)

  // Additional context
  @Column('varchar', { length: 255, nullable: true })
  ipAddress!: string | null;

  @Column('text', { nullable: true })
  userAgent!: string | null;

  @Column('int', { nullable: true, default: 1 })
  durationSeconds!: number | null; // How long document was viewed (if applicable)

  @CreateDateColumn()
  createdAt!: Date;
}
