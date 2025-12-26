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
import { SubmittalWorkflowTemplateStep } from './submittal-workflow-template-step.entity';
import { SubmittalType } from './submittal.entity';

@Entity('submittal_workflow_templates')
@Index(['projectId', 'isActive'])
@Index(['organizationId', 'isDefault'])
export class SubmittalWorkflowTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'projectId', nullable: true })
  projectId: string;

  @ManyToOne(() => Project, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ type: 'uuid', name: 'organizationId' })
  organizationId!: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Which submittal types this template applies to
  @Column({ type: 'enum', enum: SubmittalType, array: true, nullable: true })
  applicableTypes: SubmittalType[];

  // Which spec section patterns this applies to (e.g., "03*", "05*")
  @Column({ type: 'varchar', array: true, default: [] })
  specSectionPatterns: string[];

  // Total expected review days for this workflow
  @Column({ type: 'int', default: 14 })
  totalReviewDays: number;

  // Auto-apply this template to matching submittals
  @Column({ type: 'boolean', default: false })
  autoApply: boolean;

  // Priority for template matching (lower = higher priority)
  @Column({ type: 'int', default: 100 })
  priority: number;

  // Is this the organization's default template?
  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @RelationId((template: SubmittalWorkflowTemplate) => template.createdBy)
  createdById: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @OneToMany(() => SubmittalWorkflowTemplateStep, (step) => step.template)
  steps: SubmittalWorkflowTemplateStep[];
}
