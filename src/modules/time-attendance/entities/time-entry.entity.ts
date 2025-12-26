import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { WorkerProfile } from './worker-profile.entity';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { TimeEntryStatus } from '../enums/time-attendance.enum';
import { ClockEvent } from './clock-event.entity';
import { TimeEntryCostAllocation } from './time-entry-cost-allocation.entity';

/**
 * TimeEntry Entity
 *
 * Core entity for daily time tracking records. Stores clock in/out times,
 * calculated hours (regular, OT, DT), approval workflow, and payroll lock status.
 * One entry per worker per project per day.
 */
@Entity('time_entries')
@Index(['workerId', 'projectId', 'entryDate'], { unique: true })
@Index(['projectId', 'entryDate'])
@Index(['workerId', 'status'])
@Index(['status'])
@Index(['isLocked'])
@Index(['entryDate'])
export class TimeEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'workerId' })
  workerId: string;

  @Column({ type: 'uuid', name: 'projectId' })
  projectId: string;

  @Column({ type: 'date', name: 'entryDate' })
  entryDate: Date;

  // Clock times
  @Column({ type: 'timestamp with time zone', nullable: true })
  clockInTime: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  clockOutTime: Date | null;

  // Calculated hours (updated by service after clock events)
  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0, comment: 'Total hours worked including breaks' })
  totalHoursWorked: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0, comment: 'Regular hours (straight time)' })
  regularHours: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0, comment: 'Overtime hours (1.5x)' })
  overtimeHours: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0, comment: 'Double-time hours (2.0x)' })
  doubleTimeHours: number;

  // Break tracking
  @Column({ type: 'int', default: 0, comment: 'Paid break minutes' })
  breakMinutes: number;

  @Column({ type: 'int', default: 0, comment: 'Unpaid lunch minutes' })
  lunchMinutes: number;

  // Status workflow
  @Column({
    type: 'enum',
    enum: TimeEntryStatus,
    default: TimeEntryStatus.DRAFT,
  })
  status: TimeEntryStatus;

  // Submission tracking
  @Column({ type: 'timestamp with time zone', nullable: true })
  submittedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  submittedById: string | null;

  // Approval tracking
  @Column({ type: 'uuid', nullable: true })
  approvedById: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  rejectedById: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  rejectedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  // Notes
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // Payroll lock mechanism
  @Column({ type: 'boolean', default: false, comment: 'Locked after payroll export - prevents edits' })
  isLocked: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lockedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  lockedById: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true, comment: 'When this entry was exported to payroll' })
  payrollExportedAt: Date | null;

  // Crew timesheet reference (if created from crew entry)
  @Column({ type: 'uuid', nullable: true, comment: 'Reference to crew timesheet if created in bulk' })
  crewTimesheetId: string | null;

  // Audit fields
  @Column({ type: 'uuid', name: 'createdById' })
  createdById: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => WorkerProfile)
  @JoinColumn({ name: 'workerId' })
  worker: WorkerProfile;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @OneToMany(() => ClockEvent, (event) => event.timeEntry, { cascade: true })
  clockEvents: ClockEvent[];

  @OneToMany(() => TimeEntryCostAllocation, (allocation) => allocation.timeEntry, { cascade: true })
  costAllocations: TimeEntryCostAllocation[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approvedById' })
  approvedBy: User | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'rejectedById' })
  rejectedBy: User | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'lockedById' })
  lockedBy: User | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  /**
   * Check if entry can be edited
   */
  canEdit(): boolean {
    if (this.isLocked) return false;
    if (this.status === TimeEntryStatus.LOCKED) return false;
    if (this.payrollExportedAt) return false;
    return true;
  }

  /**
   * Check if entry can be submitted for approval
   */
  canSubmit(): boolean {
    if (!this.canEdit()) return false;
    if (this.status !== TimeEntryStatus.DRAFT) return false;
    if (!this.clockInTime || !this.clockOutTime) return false;
    if (this.totalHoursWorked <= 0) return false;
    return true;
  }

  /**
   * Check if entry can be approved
   */
  canApprove(): boolean {
    return this.status === TimeEntryStatus.SUBMITTED;
  }

  /**
   * Check if entry can be rejected
   */
  canReject(): boolean {
    return this.status === TimeEntryStatus.SUBMITTED;
  }

  /**
   * Check if entry can be locked for payroll
   */
  canLock(): boolean {
    return this.status === TimeEntryStatus.APPROVED && !this.isLocked;
  }

  /**
   * Get work duration in hours (for display purposes)
   */
  getWorkDuration(): number {
    if (!this.clockInTime || !this.clockOutTime) return 0;
    const durationMs = new Date(this.clockOutTime).getTime() - new Date(this.clockInTime).getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    return Math.round(durationHours * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get net worked hours (excluding unpaid lunch)
   */
  getNetWorkedHours(): number {
    const grossHours = this.getWorkDuration();
    const lunchHours = this.lunchMinutes / 60;
    return Math.max(0, grossHours - lunchHours);
  }
}
