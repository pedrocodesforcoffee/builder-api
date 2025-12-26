import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { CrewTimesheetStatus } from '../enums/time-attendance.enum';

/**
 * CrewTimesheet Entity
 *
 * Allows foremen to enter time for multiple workers at once with default values.
 * Individual TimeEntry records are generated from crew timesheet data.
 * Workers can review and adjust their individual entries before submission.
 */
@Entity('crew_timesheets')
@Index(['projectId', 'timesheetDate'])
@Index(['foremanId', 'status'])
@Index(['status'])
@Index(['timesheetDate'])
export class CrewTimesheet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'projectId' })
  projectId: string;

  @Column({ type: 'uuid', name: 'foremanId' })
  foremanId: string;

  @Column({ type: 'date', name: 'timesheetDate' })
  timesheetDate: Date;

  // Worker IDs for bulk entry
  @Column({
    type: 'jsonb',
    comment: 'Array of worker profile IDs to generate time entries for'
  })
  workerIds: string[];

  // Default time values applied to all workers
  @Column({ type: 'time', nullable: true, comment: 'Default clock-in time (HH:MM:SS)' })
  defaultClockInTime: string | null;

  @Column({ type: 'time', nullable: true, comment: 'Default clock-out time (HH:MM:SS)' })
  defaultClockOutTime: string | null;

  @Column({ type: 'int', default: 0, comment: 'Default paid break minutes' })
  defaultBreakMinutes: number;

  @Column({ type: 'int', default: 30, comment: 'Default unpaid lunch minutes' })
  defaultLunchMinutes: number;

  // Default cost code allocation (optional)
  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Default cost code allocations: [{ costCodeId, percentage }]'
  })
  defaultCostAllocations: Array<{ costCodeId: string; percentage: number }> | null;

  // Status workflow
  @Column({
    type: 'enum',
    enum: CrewTimesheetStatus,
    default: CrewTimesheetStatus.DRAFT,
  })
  status: CrewTimesheetStatus;

  @Column({ type: 'timestamp with time zone', nullable: true })
  submittedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  submittedById: string | null;

  // Approval tracking
  @Column({ type: 'uuid', nullable: true })
  approvedById: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  approvalNotes: string | null;

  @Column({ type: 'uuid', nullable: true })
  rejectedById: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  rejectedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  // Metadata
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of time entries generated from this crew timesheet'
  })
  generatedEntriesCount: number;

  // Audit fields
  @Column({ type: 'uuid', name: 'createdById' })
  createdById: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'foremanId' })
  foreman: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approvedById' })
  approvedBy: User | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'rejectedById' })
  rejectedBy: User | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  /**
   * Check if crew timesheet can be edited
   */
  canEdit(): boolean {
    return (
      this.status === CrewTimesheetStatus.DRAFT ||
      this.status === CrewTimesheetStatus.REJECTED
    );
  }

  /**
   * Check if crew timesheet can be submitted
   */
  canSubmit(): boolean {
    if (!this.canEdit()) return false;
    if (this.workerIds.length === 0) return false;
    if (!this.defaultClockInTime || !this.defaultClockOutTime) return false;
    return true;
  }

  /**
   * Check if crew timesheet can be approved
   */
  canApprove(): boolean {
    return this.status === CrewTimesheetStatus.SUBMITTED;
  }

  /**
   * Check if crew timesheet can be rejected
   */
  canReject(): boolean {
    return this.status === CrewTimesheetStatus.SUBMITTED;
  }

  /**
   * Get number of workers in this crew timesheet
   */
  getWorkerCount(): number {
    return this.workerIds.length;
  }

  /**
   * Calculate expected work hours from default times
   */
  calculateDefaultWorkHours(): number {
    if (!this.defaultClockInTime || !this.defaultClockOutTime) return 0;

    // Parse time strings (HH:MM:SS)
    const [inH, inM] = this.defaultClockInTime.split(':').map(Number);
    const [outH, outM] = this.defaultClockOutTime.split(':').map(Number);

    const inMinutes = inH * 60 + inM;
    const outMinutes = outH * 60 + outM;

    let workMinutes = outMinutes - inMinutes;
    if (workMinutes < 0) workMinutes += 24 * 60; // Handle overnight shifts

    // Subtract unpaid lunch
    workMinutes -= this.defaultLunchMinutes;

    return Math.max(0, workMinutes / 60);
  }

  /**
   * Validate cost allocations sum to 100%
   */
  areCostAllocationsValid(): boolean {
    if (!this.defaultCostAllocations || this.defaultCostAllocations.length === 0) {
      return true; // No allocations is valid (will be assigned to single code later)
    }

    const total = this.defaultCostAllocations.reduce(
      (sum, allocation) => sum + allocation.percentage,
      0
    );

    return Math.abs(total - 100) < 0.01; // Allow small floating point errors
  }
}
