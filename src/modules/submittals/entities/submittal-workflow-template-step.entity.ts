import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  RelationId,
} from 'typeorm';
import { SubmittalWorkflowTemplate } from './submittal-workflow-template.entity';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';

export enum WorkflowStepType {
  REVIEW = 'REVIEW',           // Standard review step
  APPROVAL = 'APPROVAL',       // Approval required
  ACKNOWLEDGMENT = 'ACKNOWLEDGMENT', // Just needs acknowledgment
  DISTRIBUTION = 'DISTRIBUTION', // Auto-distribute step
  NOTIFICATION = 'NOTIFICATION', // Notify only, no action required
}

export enum ReviewerType {
  USER = 'USER',
  ROLE = 'ROLE',
  COMPANY = 'COMPANY',
  DISCIPLINE = 'DISCIPLINE',
}

export enum RoutingType {
  SERIAL = 'SERIAL',     // One after another
  PARALLEL = 'PARALLEL', // All at once
}

@Entity('submittal_workflow_template_steps')
@Index(['templateId', 'stepOrder'])
export class SubmittalWorkflowTemplateStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'templateId' })
  templateId!: string;

  @ManyToOne(() => SubmittalWorkflowTemplate, (template) => template.steps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'templateId' })
  template: SubmittalWorkflowTemplate;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: WorkflowStepType,
    default: WorkflowStepType.REVIEW,
  })
  stepType: WorkflowStepType;

  // Order in the workflow (1, 2, 3...)
  @Column({ type: 'int' })
  stepOrder: number;

  // For parallel groups, steps with same groupOrder execute together
  @Column({ type: 'int', nullable: true })
  parallelGroupOrder: number;

  @Column({
    type: 'enum',
    enum: RoutingType,
    default: RoutingType.SERIAL,
  })
  routingType: RoutingType;

  // Who reviews at this step
  @Column({
    type: 'enum',
    enum: ReviewerType,
  })
  reviewerType: ReviewerType;

  // Specific user (if reviewerType = USER)
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewerUserId' })
  reviewerUser: User;

  @RelationId((step: SubmittalWorkflowTemplateStep) => step.reviewerUser)
  reviewerUserId: string;

  // Role name (if reviewerType = ROLE)
  @Column({ type: 'varchar', length: 50, nullable: true })
  reviewerRole: string;

  // Company (if reviewerType = COMPANY)
  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'reviewerCompanyId' })
  reviewerCompany: Organization;

  @RelationId((step: SubmittalWorkflowTemplateStep) => step.reviewerCompany)
  reviewerCompanyId: string;

  // Discipline (if reviewerType = DISCIPLINE)
  @Column({ type: 'varchar', length: 50, nullable: true })
  reviewerDiscipline: string;

  // Days allowed for this step
  @Column({ type: 'int', default: 7 })
  allowedDays: number;

  // Can this step be skipped?
  @Column({ type: 'boolean', default: false })
  isOptional: boolean;

  // Require all parallel reviewers or just one?
  @Column({ type: 'boolean', default: true })
  requireAllParallel: boolean;

  // Can stamp/approve at this step?
  @Column({ type: 'boolean', default: true })
  canApprove: boolean;

  // Can reject at this step?
  @Column({ type: 'boolean', default: true })
  canReject: boolean;

  // Auto-advance when complete?
  @Column({ type: 'boolean', default: true })
  autoAdvance: boolean;

  // Notify these users when step becomes active
  @Column({ type: 'uuid', array: true, default: [] })
  notifyOnActive: string[];

  // Notify these users when step completes
  @Column({ type: 'uuid', array: true, default: [] })
  notifyOnComplete: string[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
