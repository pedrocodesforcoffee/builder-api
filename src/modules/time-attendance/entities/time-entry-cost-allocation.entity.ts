import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TimeEntry } from './time-entry.entity';
import { CostCode } from '../../financials/entities/cost-code.entity';

/**
 * TimeEntryCostAllocation Entity
 *
 * Junction entity that allocates a worker's time to specific cost codes.
 * Supports both hour-based and percentage-based allocation.
 * All allocations for a time entry must sum to 100% or total hours.
 */
@Entity('time_entry_cost_allocations')
@Index(['timeEntryId'])
@Index(['costCodeId'])
@Index(['timeEntryId', 'costCodeId'])
export class TimeEntryCostAllocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'timeEntryId' })
  timeEntryId: string;

  @Column({ type: 'uuid', name: 'costCodeId' })
  costCodeId: string;

  // Allocation methods (use one or the other)
  @Column({
    type: 'decimal',
    precision: 6,
    scale: 2,
    nullable: true,
    comment: 'Hours allocated to this cost code'
  })
  hoursAllocated: number | null;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Percentage of total time allocated (0-100)'
  })
  percentageAllocated: number | null;

  // Description of work performed
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => TimeEntry, (entry) => entry.costAllocations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'timeEntryId' })
  timeEntry: TimeEntry;

  @ManyToOne(() => CostCode)
  @JoinColumn({ name: 'costCodeId' })
  costCode: CostCode;

  /**
   * Check if this allocation uses percentage-based calculation
   */
  isPercentageBased(): boolean {
    return this.percentageAllocated !== null;
  }

  /**
   * Check if this allocation uses hour-based calculation
   */
  isHourBased(): boolean {
    return this.hoursAllocated !== null;
  }

  /**
   * Validate that either hours or percentage is set (not both, not neither)
   */
  isValid(): boolean {
    const hasHours = this.hoursAllocated !== null;
    const hasPercentage = this.percentageAllocated !== null;

    // Must have exactly one method set
    if (hasHours === hasPercentage) return false;

    // Validate values are positive
    if (hasHours && this.hoursAllocated! <= 0) return false;
    if (hasPercentage && (this.percentageAllocated! <= 0 || this.percentageAllocated! > 100)) return false;

    return true;
  }

  /**
   * Calculate hours allocated from percentage (requires total hours)
   */
  calculateHoursFromPercentage(totalHours: number): number {
    if (!this.isPercentageBased()) return 0;
    return (this.percentageAllocated! / 100) * totalHours;
  }

  /**
   * Calculate percentage from hours (requires total hours)
   */
  calculatePercentageFromHours(totalHours: number): number {
    if (!this.isHourBased() || totalHours === 0) return 0;
    return (this.hoursAllocated! / totalHours) * 100;
  }

  /**
   * Get effective hours allocated (either directly or calculated from percentage)
   */
  getEffectiveHours(totalHours: number): number {
    if (this.isHourBased()) {
      return this.hoursAllocated!;
    }
    return this.calculateHoursFromPercentage(totalHours);
  }

  /**
   * Get effective percentage (either directly or calculated from hours)
   */
  getEffectivePercentage(totalHours: number): number {
    if (this.isPercentageBased()) {
      return this.percentageAllocated!;
    }
    return this.calculatePercentageFromHours(totalHours);
  }
}
