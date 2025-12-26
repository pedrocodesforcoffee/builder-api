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

@Entity('submittal_lead_times')
@Index(['projectId', 'specSection'])
@Index(['projectId', 'submittalType'])
export class SubmittalLeadTime {
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

  // Can be by spec section or submittal type
  @Column({ type: 'varchar', length: 20, nullable: true })
  specSection: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  submittalType: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  // Standard lead times (in calendar days)
  @Column({ type: 'int' })
  fabricationDays: number;

  @Column({ type: 'int' })
  deliveryDays: number;

  @Column({ type: 'int', default: 14 })
  reviewDays: number;

  // Total lead time = fabrication + delivery + review
  @Column({ type: 'int' })
  totalLeadTimeDays: number;

  // Buffer days for safety
  @Column({ type: 'int', default: 0 })
  bufferDays: number;

  // Vendor/manufacturer if specific
  @Column({ type: 'varchar', length: 255, nullable: true })
  vendor: string;

  // Notes about this lead time
  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
