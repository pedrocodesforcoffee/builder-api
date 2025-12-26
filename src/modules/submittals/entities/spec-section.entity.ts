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
import { Project } from '../../projects/entities/project.entity';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity('spec_sections')
@Index(['projectId', 'sectionNumber'], { unique: true })
@Index(['projectId', 'division'])
export class SpecSection {
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

  // Division number (01-49)
  @Column({ type: 'varchar', length: 2 })
  division: string;

  // Full section number (e.g., "03 30 00")
  @Column({ type: 'varchar', length: 20 })
  sectionNumber: string;

  // Section title
  @Column({ type: 'varchar', length: 255 })
  title: string;

  // Full description
  @Column({ type: 'text', nullable: true })
  description: string;

  // Responsible contractor for this section
  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'responsibleContractorId' })
  responsibleContractor: Organization;

  @RelationId((section: SpecSection) => section.responsibleContractor)
  responsibleContractorId: string;

  // Default approver for submittals in this section
  @Column({ type: 'uuid', nullable: true })
  defaultApproverId: string;

  // Number of submittals expected
  @Column({ type: 'int', default: 0 })
  expectedSubmittalCount: number;

  // Tracking
  @Column({ type: 'int', default: 0 })
  submittedCount: number;

  @Column({ type: 'int', default: 0 })
  approvedCount: number;

  // Is this section active/in use?
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // Sort order within division
  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
