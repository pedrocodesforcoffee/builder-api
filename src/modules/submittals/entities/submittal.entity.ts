import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
  RelationId,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';
import { SubmittalStatus, SubmittalType, SubmittalPriority } from '../enums/submittal.enums';
import { SubmittalItem } from './submittal-item.entity';
import { SubmittalRevision } from './submittal-revision.entity';
import { SubmittalHistory } from './submittal-history.entity';
import { SubmittalWorkflowStep } from './submittal-workflow-step.entity';

// Re-export enums for backward compatibility
export { SubmittalStatus, SubmittalType, SubmittalPriority };

@Entity('submittals')
@Index(['projectId', 'number'], { unique: true })
@Index(['projectId', 'status'])
@Index(['projectId', 'specSection'])
@Index(['projectId', 'submittalType'])
@Index(['projectId', 'responsibleContractorId'])
@Index(['projectId', 'dueDate'])
export class Submittal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'projectId' })
  projectId!: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ type: 'uuid', name: 'organizationId' })
  organizationId!: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  // Auto-generated: PROJECT-SUB-0001
  @Column({ type: 'varchar', length: 50 })
  number: string;

  // Sequential number within project
  @Column({ type: 'int' })
  sequenceNumber: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // CSI MasterFormat spec section (e.g., "03 30 00")
  @Column({ type: 'varchar', length: 20 })
  specSection: string;

  // Spec section title (e.g., "Cast-in-Place Concrete")
  @Column({ type: 'varchar', length: 255, nullable: true })
  specSectionTitle: string;

  // Paragraph reference within spec section
  @Column({ type: 'varchar', length: 50, nullable: true })
  specParagraph: string;

  @Column({
    type: 'enum',
    enum: SubmittalType,
    default: SubmittalType.PRODUCT_DATA,
  })
  submittalType: SubmittalType;

  @Column({
    type: 'enum',
    enum: SubmittalStatus,
    default: SubmittalStatus.NOT_STARTED,
  })
  status: SubmittalStatus;

  @Column({
    type: 'enum',
    enum: SubmittalPriority,
    default: SubmittalPriority.MEDIUM,
  })
  priority: SubmittalPriority;

  // Current revision number (0, 1, 2, etc.)
  @Column({ type: 'int', default: 0 })
  currentRevision: number;

  // Contractor responsible for submitting
  @Column({ type: 'uuid', name: 'responsibleContractorId' })
  responsibleContractorId!: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'responsibleContractorId' })
  responsibleContractor: Organization;

  // Specific user at contractor who prepares submittal
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'preparedById' })
  preparedBy: User;

  @RelationId((submittal: Submittal) => submittal.preparedBy)
  preparedById: string;

  // GC user who manages this submittal
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'submittalManagerId' })
  submittalManager: User;

  @RelationId((submittal: Submittal) => submittal.submittalManager)
  submittalManagerId: string;

  // Primary approver (typically Architect or Engineer)
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approverId' })
  approver: User;

  @RelationId((submittal: Submittal) => submittal.approver)
  approverId: string;

  // Approving company (A/E firm)
  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'approverOrgId' })
  approverOrg: Organization;

  @RelationId((submittal: Submittal) => submittal.approverOrg)
  approverOrgId: string;

  // Key dates
  @Column({ type: 'timestamp with time zone', nullable: true })
  dueDate: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  requiredOnSiteDate: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  submittedDate: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  receivedDate: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  reviewStartDate: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  approvedDate: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  closedDate: Date;

  // Lead time (days needed after approval before on-site)
  @Column({ type: 'int', nullable: true })
  leadTimeDays: number;

  // Review time SLA (days allowed for review)
  @Column({ type: 'int', default: 14 })
  reviewTimeDays: number;

  // Linked schedule activity (if integrated with schedule)
  @Column({ type: 'varchar', length: 100, nullable: true })
  scheduleActivityId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  scheduleActivityName: string;

  // Location/area in project
  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string;

  // Drawing references
  @Column({ type: 'varchar', array: true, default: [] })
  drawingReferences: string[];

  // Related RFIs
  @Column({ type: 'uuid', array: true, default: [] })
  relatedRfiIds: string[];

  // Distribution list for approved submittals
  @Column({ type: 'uuid', array: true, default: [] })
  distributionList: string[];

  // Cost tracking (if submittal affects cost)
  @Column({ type: 'boolean', default: false })
  hasCostImpact: boolean;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  estimatedCost: number;

  // Final approval stamp/action
  @Column({ type: 'varchar', length: 50, nullable: true })
  approvalStamp: string;

  // Conditions of approval (for APPROVED_AS_NOTED)
  @Column({ type: 'text', nullable: true })
  approvalConditions: string;

  // Rejection reason
  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  // Void reason
  @Column({ type: 'text', nullable: true })
  voidReason: string;

  // Private/internal submittal
  @Column({ type: 'boolean', default: false })
  isPrivate: boolean;

  // Tracking flags
  @Column({ type: 'boolean', default: false })
  isOverdue: boolean;

  @Column({ type: 'int', nullable: true })
  daysOverdue: number;

  @Column({ type: 'int', nullable: true })
  daysInReview: number;

  // Created by (GC user who created the submittal requirement)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @RelationId((submittal: Submittal) => submittal.createdBy)
  createdById: string;

  // Metadata for custom fields
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => SubmittalItem, (item) => item.submittal)
  items: SubmittalItem[];

  @OneToMany(() => SubmittalRevision, (revision) => revision.submittal)
  revisions: SubmittalRevision[];

  @OneToMany(() => SubmittalHistory, (history) => history.submittal)
  history: SubmittalHistory[];

  @OneToMany(() => SubmittalWorkflowStep, (step) => step.submittal)
  workflowSteps: SubmittalWorkflowStep[];
}
