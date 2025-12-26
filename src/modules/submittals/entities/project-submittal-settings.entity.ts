import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  RelationId,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { SubmittalWorkflowTemplate } from './submittal-workflow-template.entity';

@Entity('project_submittal_settings')
export class ProjectSubmittalSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @RelationId((settings: ProjectSubmittalSettings) => settings.project)
  projectId: string;

  // Numbering
  @Column({ type: 'varchar', length: 20, default: 'SUB' })
  numberPrefix: string;

  @Column({ type: 'int', default: 4 })
  numberPadding: number;

  @Column({ type: 'boolean', default: true })
  includeProjectNumber: boolean;

  // Default workflow template
  @ManyToOne(() => SubmittalWorkflowTemplate, { nullable: true })
  @JoinColumn({ name: 'defaultWorkflowTemplateId' })
  defaultWorkflowTemplate: SubmittalWorkflowTemplate;

  @RelationId((settings: ProjectSubmittalSettings) => settings.defaultWorkflowTemplate)
  defaultWorkflowTemplateId: string;

  // Default review time (days)
  @Column({ type: 'int', default: 14 })
  defaultReviewDays: number;

  // Default lead time warning (days before required on-site)
  @Column({ type: 'int', default: 7 })
  leadTimeWarningDays: number;

  // Auto-distribute on approval
  @Column({ type: 'boolean', default: true })
  autoDistributeOnApproval: boolean;

  // Default distribution list
  @Column({ type: 'uuid', array: true, default: [] })
  defaultDistributionList: string[];

  // Require conditions acknowledgment for APPROVED_AS_NOTED
  @Column({ type: 'boolean', default: true })
  requireConditionsAcknowledgment: boolean;

  // Allow contractor direct submit (vs through GC)
  @Column({ type: 'boolean', default: false })
  allowDirectContractorSubmit: boolean;

  // Default submittal manager
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'defaultSubmittalManagerId' })
  defaultSubmittalManager: User;

  @RelationId((settings: ProjectSubmittalSettings) => settings.defaultSubmittalManager)
  defaultSubmittalManagerId: string;

  // Notification settings
  @Column({ type: 'boolean', default: true })
  notifyOnSubmit: boolean;

  @Column({ type: 'boolean', default: true })
  notifyOnReviewAssigned: boolean;

  @Column({ type: 'boolean', default: true })
  notifyOnApproval: boolean;

  @Column({ type: 'boolean', default: true })
  notifyOnRejection: boolean;

  @Column({ type: 'boolean', default: true })
  sendOverdueReminders: boolean;

  @Column({ type: 'int', default: 3 })
  overdueReminderDays: number;

  @Column({ type: 'boolean', default: true })
  sendLeadTimeWarnings: boolean;

  @Column({ type: 'boolean', default: false })
  sendDailySummary: boolean;

  // Business day settings
  @Column({ type: 'boolean', default: true })
  useBusinessDays: boolean;

  @Column({ type: 'int', array: true, default: [0, 6] })
  nonWorkingDays: number[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
