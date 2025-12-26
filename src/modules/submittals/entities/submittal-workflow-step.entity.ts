import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
  RelationId,
} from 'typeorm';
import { Submittal } from './submittal.entity';
import { SubmittalWorkflowTemplateStep, WorkflowStepType, RoutingType } from './submittal-workflow-template-step.entity';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { ApprovalStamp } from './submittal-response.entity';

export enum WorkflowStepStatus {
  PENDING = 'PENDING',       // Not yet active
  ACTIVE = 'ACTIVE',         // Currently awaiting action
  IN_PROGRESS = 'IN_PROGRESS', // Started but not complete
  COMPLETED = 'COMPLETED',   // Successfully completed
  SKIPPED = 'SKIPPED',       // Skipped (optional step)
  CANCELLED = 'CANCELLED',   // Cancelled due to rejection/void
}

@Entity('submittal_workflow_steps')
@Index(['submittalId', 'stepOrder'])
@Index(['submittalId', 'status'])
@Index(['assignedToId', 'status'])
export class SubmittalWorkflowStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'submittalId' })
  submittalId!: string;

  @ManyToOne(() => Submittal, (submittal) => submittal.workflowSteps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submittalId' })
  submittal: Submittal;

  // Reference to template step (if created from template)
  @ManyToOne(() => SubmittalWorkflowTemplateStep, { nullable: true })
  @JoinColumn({ name: 'templateStepId' })
  templateStep: SubmittalWorkflowTemplateStep;

  @RelationId((step: SubmittalWorkflowStep) => step.templateStep)
  templateStepId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: WorkflowStepType,
  })
  stepType: WorkflowStepType;

  @Column({ type: 'int' })
  stepOrder: number;

  @Column({ type: 'int', nullable: true })
  parallelGroupOrder: number;

  @Column({
    type: 'enum',
    enum: RoutingType,
    default: RoutingType.SERIAL,
  })
  routingType: RoutingType;

  @Column({
    type: 'enum',
    enum: WorkflowStepStatus,
    default: WorkflowStepStatus.PENDING,
  })
  status: WorkflowStepStatus;

  // Assigned reviewer
  @Column({ type: 'uuid', name: 'assignedToId', nullable: true })
  assignedToId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignedToId' })
  assignedTo: User;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'assignedToOrgId' })
  assignedToOrg: Organization;

  @RelationId((step: SubmittalWorkflowStep) => step.assignedToOrg)
  assignedToOrgId: string;

  // Dates
  @Column({ type: 'timestamp with time zone', nullable: true })
  dueDate: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  activatedAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  completedAt: Date;

  // Days tracking
  @Column({ type: 'int', default: 7 })
  allowedDays: number;

  @Column({ type: 'int', nullable: true })
  actualDays: number;

  @Column({ type: 'boolean', default: false })
  isOverdue: boolean;

  // Response from reviewer
  @Column({ type: 'enum', enum: ApprovalStamp, nullable: true })
  stamp: ApprovalStamp;

  @Column({ type: 'text', nullable: true })
  comments: string;

  @Column({ type: 'text', nullable: true })
  conditions: string;

  // Marked-up documents
  @Column({ type: 'uuid', array: true, default: [] })
  markupAttachmentIds: string[];

  // Completed by
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'completedById' })
  completedBy: User;

  @RelationId((step: SubmittalWorkflowStep) => step.completedBy)
  completedById: string;

  // Signature data
  @Column({ type: 'jsonb', nullable: true })
  signatureData: {
    signedAt: Date;
    signatureImage?: string;
    title?: string;
    licenseNumber?: string;
  };

  // Flags
  @Column({ type: 'boolean', default: false })
  isOptional: boolean;

  @Column({ type: 'boolean', default: true })
  canApprove: boolean;

  @Column({ type: 'boolean', default: true })
  canReject: boolean;

  // Revision number this step is for
  @Column({ type: 'int', default: 0 })
  revisionNumber: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
