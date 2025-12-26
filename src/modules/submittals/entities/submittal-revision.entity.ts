import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Index,
  RelationId,
} from 'typeorm';
import { Submittal, SubmittalStatus } from './submittal.entity';
import { User } from '../../users/entities/user.entity';

@Entity('submittal_revisions')
@Index(['submittalId', 'revisionNumber'], { unique: true })
export class SubmittalRevision {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'submittalId' })
  submittalId!: string;

  @ManyToOne(() => Submittal, (submittal) => submittal.revisions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submittalId' })
  submittal: Submittal;

  // Revision number (0, 1, 2, etc.)
  @Column({ type: 'int' })
  revisionNumber: number;

  // Display string (Rev 0, Rev A, etc.)
  @Column({ type: 'varchar', length: 20 })
  revisionLabel: string;

  // Status at time of this revision
  @Column({
    type: 'enum',
    enum: SubmittalStatus,
  })
  status: SubmittalStatus;

  // Why this revision was created
  @Column({ type: 'text', nullable: true })
  revisionReason: string;

  // Changes made in this revision
  @Column({ type: 'text', nullable: true })
  changeDescription: string;

  // Snapshot of items at this revision
  @Column({ type: 'jsonb', nullable: true })
  itemsSnapshot: Array<{
    itemNumber: number;
    description: string;
    manufacturer?: string;
    modelNumber?: string;
    attachmentIds: string[];
  }>;

  // All document attachments for this revision
  @Column({ type: 'uuid', array: true, default: [] })
  attachmentIds: string[];

  // Response from reviewer (if any at this revision)
  @Column({ type: 'text', nullable: true })
  reviewerResponse: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  reviewerStamp: string;

  // Dates
  @Column({ type: 'timestamp with time zone' })
  submittedDate: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  reviewedDate: Date;

  // Who submitted this revision
  @ManyToOne(() => User)
  @JoinColumn({ name: 'submittedById' })
  submittedBy: User;

  @RelationId((revision: SubmittalRevision) => revision.submittedBy)
  submittedById: string;

  // Who reviewed this revision
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewedById' })
  reviewedBy: User;

  @RelationId((revision: SubmittalRevision) => revision.reviewedBy)
  reviewedById: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
