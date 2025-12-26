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
import { SubmittalRevision } from './submittal-revision.entity';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';

export enum ApprovalStamp {
  APPROVED = 'APPROVED',
  APPROVED_AS_NOTED = 'APPROVED_AS_NOTED',
  APPROVED_AS_NOTED_RESUBMIT = 'APPROVED_AS_NOTED_RESUBMIT',
  REVISE_AND_RESUBMIT = 'REVISE_AND_RESUBMIT',
  REJECTED = 'REJECTED',
  FOR_RECORD_ONLY = 'FOR_RECORD_ONLY',
  SEE_COMMENTS = 'SEE_COMMENTS',
}

@Entity('submittal_responses')
// Note: Indexes defined in migration
export class SubmittalResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Submittal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submittalId' })
  submittal: Submittal;

  @RelationId((response: SubmittalResponse) => response.submittal)
  submittalId: string;

  @ManyToOne(() => SubmittalRevision, { nullable: true })
  @JoinColumn({ name: 'revisionId' })
  revision: SubmittalRevision;

  @RelationId((response: SubmittalResponse) => response.revision)
  revisionId: string;

  // Which revision number this response is for
  @Column({ type: 'int' })
  revisionNumber: number;

  // Response/decision
  @Column({
    type: 'enum',
    enum: ApprovalStamp,
  })
  stamp: ApprovalStamp;

  // Resulting status change
  @Column({
    type: 'enum',
    enum: SubmittalStatus,
  })
  resultingStatus: SubmittalStatus;

  // Comments from reviewer
  @Column({ type: 'text', nullable: true })
  comments: string;

  @Column({ type: 'text', nullable: true })
  commentsHtml: string;

  // Conditions (for APPROVED_AS_NOTED)
  @Column({ type: 'text', nullable: true })
  conditions: string;

  // Marked-up documents
  @Column({ type: 'uuid', array: true, default: [] })
  markupAttachmentIds: string[];

  // Reviewer info
  @ManyToOne(() => User)
  @JoinColumn({ name: 'reviewerId' })
  reviewer: User;

  @RelationId((response: SubmittalResponse) => response.reviewer)
  reviewerId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'reviewerOrgId' })
  reviewerOrg: Organization;

  @RelationId((response: SubmittalResponse) => response.reviewerOrg)
  reviewerOrgId: string;

  // Reviewer's title/role for stamp
  @Column({ type: 'varchar', length: 100, nullable: true })
  reviewerTitle: string;

  // Digital signature data
  @Column({ type: 'jsonb', nullable: true })
  signatureData: {
    signedAt: Date;
    signatureImage?: string;
    ipAddress?: string;
    userAgent?: string;
  };

  // Is this the final/official response?
  @Column({ type: 'boolean', default: false })
  isOfficial: boolean;

  // Review duration in days
  @Column({ type: 'int', nullable: true })
  reviewDurationDays: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
