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
import { PunchList } from './punch-list.entity';
import { ProjectLocation } from './project-location.entity';
import { PunchItemPhoto } from './punch-item-photo.entity';
import { PunchItemHistory } from './punch-item-history.entity';
import {
  PunchItemStatus,
  PunchItemPriority,
  PunchItemCategory,
  BallInCourt,
} from '../enums/punch-list.enum';

/**
 * PunchItem entity - Individual punch list item with workflow
 * Tracks defects, incomplete work, or quality issues through resolution
 *
 * Workflow: OPEN -> IN_PROGRESS -> READY_FOR_REVIEW -> APPROVED/REJECTED/DISPUTED/DEFERRED -> CLOSED
 * Ball-in-Court: Tracks who needs to act (Subcontractor, GC, Owner, Architect)
 */
@Entity('punch_items')
@Index(['punchListId', 'status'])
@Index(['projectId', 'status'])
@Index(['locationId'])
@Index(['assignedToId'])
@Index(['ballInCourt', 'status'])
@Index(['priority', 'status'])
@Index(['dueDate'])
export class PunchItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'punchListId' })
  punchListId: string;

  @ManyToOne(() => PunchList, (punchList) => punchList.punchItems, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'punchListId' })
  punchList: PunchList;

  @Column({ type: 'uuid', name: 'projectId' })
  projectId: string;

  @ManyToOne(() => Project, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ type: 'uuid', name: 'locationId', nullable: true })
  locationId: string;

  @ManyToOne(() => ProjectLocation, (location) => location.punchItems, {
    nullable: true,
  })
  @JoinColumn({ name: 'locationId' })
  location: ProjectLocation;

  @Column({ type: 'int', generated: 'increment' })
  itemNumber: number;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: PunchItemStatus,
    default: PunchItemStatus.OPEN,
  })
  status: PunchItemStatus;

  @Column({
    type: 'enum',
    enum: PunchItemPriority,
    default: PunchItemPriority.MEDIUM,
  })
  priority: PunchItemPriority;

  @Column({
    type: 'enum',
    enum: PunchItemCategory,
    default: PunchItemCategory.OTHER,
  })
  category: PunchItemCategory;

  @Column({
    type: 'enum',
    enum: BallInCourt,
    default: BallInCourt.SUBCONTRACTOR,
  })
  ballInCourt: BallInCourt;

  @Column({ type: 'varchar', length: 255, nullable: true })
  trade: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  responsibleCompany: string;

  @Column({ type: 'uuid', name: 'assignedToId', nullable: true })
  assignedToId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignedToId' })
  assignedTo: User;

  @Column({ type: 'varchar', length: 100, nullable: true })
  costCode: string;

  @Column({ type: 'date', name: 'dueDate', nullable: true })
  dueDate: Date;

  @Column({ type: 'date', name: 'completedDate', nullable: true })
  completedDate: Date;

  @Column({ type: 'text', nullable: true })
  resolutionNotes: string;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  estimatedCost: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  actualCost: number;

  @Column({ type: 'int', nullable: true })
  estimatedHours: number;

  @Column({ type: 'int', nullable: true })
  actualHours: number;

  /**
   * Photos for this punch item
   */
  @OneToMany(() => PunchItemPhoto, (photo) => photo.punchItem, {
    cascade: true,
  })
  photos: PunchItemPhoto[];

  /**
   * History/audit trail for this punch item
   */
  @OneToMany(() => PunchItemHistory, (history) => history.punchItem, {
    cascade: true,
  })
  history: PunchItemHistory[];

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
   * Computed fields
   */
  get isOverdue(): boolean {
    if (!this.dueDate || this.status === PunchItemStatus.CLOSED) {
      return false;
    }
    return new Date(this.dueDate) < new Date();
  }

  get daysOpen(): number {
    const start = this.createdAt;
    const end = this.completedDate || new Date();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
