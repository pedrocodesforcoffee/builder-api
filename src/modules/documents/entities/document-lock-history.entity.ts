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

/**
 * Lock Action Enum
 *
 * Tracks what happened to a document lock
 */
export enum LockAction {
  CHECKOUT = 'checkout',
  CHECKIN = 'checkin',
  FORCE_UNLOCK = 'force_unlock',
  EXPIRED = 'expired',
}

/**
 * Document Lock History Entity
 *
 * AUDIT TRAIL: Tracks all lock operations on documents
 *
 * Critical for:
 * - Understanding who had control of documents when
 * - Investigating concurrent edit conflicts
 * - Compliance and accountability
 * - Security incident investigation
 */
@Entity('document_lock_history')
@Index(['documentId', 'actionAt'])
@Index(['userId', 'actionAt'])
@Index(['action', 'actionAt'])
export class DocumentLockHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  @Index()
  documentId!: string;

  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'documentId' })
  document!: Document;

  @Column({
    type: 'enum',
    enum: LockAction,
  })
  action!: LockAction;

  @Column('uuid')
  @Index()
  userId!: string;

  @Column({ type: 'varchar', length: 255 })
  userName!: string;

  @CreateDateColumn()
  @Index()
  actionAt!: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent!: string | null;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({ type: 'uuid', nullable: true })
  relatedVersionId!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: {
    lockDuration?: number; // milliseconds
    forceUnlockedBy?: string;
    forceUnlockReason?: string;
    expirationTime?: string;
    checkoutComment?: string;
    checkinComment?: string;
    [key: string]: any;
  } | null;
}
