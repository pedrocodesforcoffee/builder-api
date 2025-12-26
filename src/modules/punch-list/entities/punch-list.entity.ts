import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { PunchItem } from './punch-item.entity';
import { PunchListType } from '../enums/punch-list.enum';

/**
 * PunchList entity - Container for grouping punch items
 * Represents a collection of punch items for a specific purpose/phase
 *
 * Examples:
 * - Pre-Final Punch List (before substantial completion)
 * - Final Punch List (before final payment)
 * - Warranty Punch List (defects during warranty period)
 * - Phase 1 Completion Punch List
 */
@Entity('punch_lists')
@Index(['projectId', 'type'])
@Index(['projectId', 'createdAt'])
export class PunchList {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'projectId' })
  projectId: string;

  @ManyToOne(() => Project, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: PunchListType,
    default: PunchListType.CUSTOM,
  })
  type: PunchListType;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date', name: 'targetDate', nullable: true })
  targetDate: Date;

  @Column({ type: 'date', name: 'completedDate', nullable: true })
  completedDate: Date;

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isLocked: boolean;

  /**
   * Statistics (can be computed or cached)
   */
  @Column({ type: 'int', default: 0 })
  totalItems: number;

  @Column({ type: 'int', default: 0 })
  openItems: number;

  @Column({ type: 'int', default: 0 })
  inProgressItems: number;

  @Column({ type: 'int', default: 0 })
  completedItems: number;

  /**
   * Punch items in this list
   */
  @OneToMany(() => PunchItem, (punchItem) => punchItem.punchList, {
    cascade: true,
  })
  punchItems: PunchItem[];

  /**
   * Audit fields
   */
  @Column({ type: 'uuid', name: 'createdById' })
  createdById: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ type: 'uuid', name: 'updatedById', nullable: true })
  updatedById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updatedById' })
  updatedBy: User;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updatedAt' })
  updatedAt: Date;

  /**
   * Computed completion percentage
   */
  get completionPercentage(): number {
    if (this.totalItems === 0) return 0;
    return Math.round((this.completedItems / this.totalItems) * 100);
  }
}
