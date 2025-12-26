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
import { Submittal } from './submittal.entity';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';

export enum DistributionMethod {
  EMAIL = 'EMAIL',
  IN_APP = 'IN_APP',
  DOWNLOAD_LINK = 'DOWNLOAD_LINK',
  PHYSICAL = 'PHYSICAL',
}

export enum DistributionStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  FAILED = 'FAILED',
}

@Entity('submittal_distributions')
@Index(['submittalId', 'distributedAt'])
@Index(['recipientId', 'status'])
export class SubmittalDistribution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'submittalId' })
  submittalId!: string;

  @ManyToOne(() => Submittal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submittalId' })
  submittal: Submittal;

  // Revision that was distributed
  @Column({ type: 'int' })
  revisionNumber: number;

  // Recipient
  @Column({ type: 'uuid', name: 'recipientId', nullable: true })
  recipientId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'recipientId' })
  recipient: User;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'recipientOrgId' })
  recipientOrg: Organization;

  @RelationId((distribution: SubmittalDistribution) => distribution.recipientOrg)
  recipientOrgId: string;

  // For external recipients
  @Column({ type: 'varchar', length: 255, nullable: true })
  recipientEmail: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  recipientName: string;

  @Column({
    type: 'enum',
    enum: DistributionMethod,
    default: DistributionMethod.EMAIL,
  })
  method: DistributionMethod;

  @Column({
    type: 'enum',
    enum: DistributionStatus,
    default: DistributionStatus.PENDING,
  })
  status: DistributionStatus;

  // What was distributed
  @Column({ type: 'uuid', array: true, default: [] })
  documentIds: string[];

  // Include conditions/notes in distribution?
  @Column({ type: 'boolean', default: true })
  includeConditions: boolean;

  // Include markups?
  @Column({ type: 'boolean', default: true })
  includeMarkups: boolean;

  // Cover note for distribution
  @Column({ type: 'text', nullable: true })
  coverNote: string;

  // Tracking
  @Column({ type: 'timestamp with time zone', nullable: true })
  distributedAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  deliveredAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  acknowledgedAt: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'distributedById' })
  distributedBy: User;

  @RelationId((distribution: SubmittalDistribution) => distribution.distributedBy)
  distributedById: string;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
