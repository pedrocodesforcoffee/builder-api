import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Project } from '../../projects/entities/project.entity';
import { EmploymentType, OvertimeRule } from '../enums/time-attendance.enum';

/**
 * WorkerProfile Entity
 *
 * Stores employment and payroll information for workers in the time attendance system.
 * Links User accounts to their employment details, hourly rates, and overtime rules.
 */
@Entity('worker_profiles')
@Index(['userId', 'organizationId'])
@Index(['projectId', 'isActive'])
@Index(['employmentType'])
@Index(['trade'])
export class WorkerProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  userId: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid', nullable: true, comment: 'Optional project assignment for project-specific workers' })
  projectId: string | null;

  @Column({ type: 'enum', enum: EmploymentType })
  employmentType: EmploymentType;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: 'Worker trade or skill classification' })
  trade: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: 'Regular hourly pay rate' })
  hourlyRate: number;

  @Column({
    type: 'enum',
    enum: OvertimeRule,
    default: OvertimeRule.STANDARD,
    comment: 'Overtime calculation rule for this worker'
  })
  overtimeRule: OvertimeRule;

  // Union information
  @Column({ type: 'boolean', default: false })
  isUnion: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true, comment: 'Union local chapter number' })
  unionLocalNumber: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: 'Union organization name' })
  unionName: string | null;

  // Certifications and qualifications
  @Column({
    type: 'jsonb',
    default: [],
    comment: 'Array of certification names/IDs'
  })
  certifications: string[];

  // Custom overtime multipliers for CUSTOM rule type
  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Custom overtime configuration: { dailyOTHours: 8, dailyDTHours: 12, weeklyOTHours: 40, otMultiplier: 1.5, dtMultiplier: 2.0 }'
  })
  overtimeConfig: Record<string, any> | null;

  // Employment dates
  @Column({ type: 'date', nullable: true })
  hireDate: Date | null;

  @Column({ type: 'date', nullable: true })
  terminationDate: Date | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // Prevailing wage information (for government/union projects)
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, comment: 'Prevailing wage rate if applicable' })
  prevailingWageRate: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, comment: 'Fringe benefits amount per hour' })
  fringeBenefitsRate: number | null;

  // Audit fields
  @Column({ type: 'uuid', name: 'createdById' })
  createdById: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  // Relations
  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => Project, { nullable: true })
  @JoinColumn({ name: 'projectId' })
  project: Project | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  /**
   * Check if worker is currently employed
   */
  isCurrentlyEmployed(): boolean {
    if (!this.isActive) return false;
    if (this.terminationDate && new Date(this.terminationDate) <= new Date()) {
      return false;
    }
    return true;
  }

  /**
   * Get effective hourly rate (prevailing wage if applicable, otherwise regular rate)
   */
  getEffectiveHourlyRate(): number {
    return this.prevailingWageRate ?? this.hourlyRate;
  }

  /**
   * Get total compensation per hour (rate + fringe benefits)
   */
  getTotalCompensationRate(): number {
    const baseRate = this.getEffectiveHourlyRate();
    const fringeBenefits = this.fringeBenefitsRate ?? 0;
    return baseRate + fringeBenefits;
  }

  /**
   * Check if worker requires certified payroll reporting (prevailing wage projects)
   */
  requiresCertifiedPayroll(): boolean {
    return this.prevailingWageRate !== null;
  }
}
