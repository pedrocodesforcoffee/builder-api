import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { DrawingSetType } from '../enums';

/**
 * Drawing Set Entity
 *
 * Groups related drawings together for organization and distribution.
 * Examples: "Bid Set", "Construction Documents", "As-Builts".
 *
 * Features:
 * - Groups drawings by phase/purpose
 * - Tracks issue dates and purpose
 * - Marks current/active set
 * - Denormalized drawing count for performance
 * - Soft delete with recovery
 *
 * @entity drawing_sets
 */
@Entity('drawing_sets')
@Index('IDX_drawing_sets_project', ['projectId'])
@Index('IDX_drawing_sets_project_current', ['projectId', 'isCurrent'])
@Index('IDX_drawing_sets_project_type', ['projectId', 'setType'])
@Index('IDX_drawing_sets_project_issue_date', ['projectId', 'issueDate'])
@Index('IDX_drawing_sets_project_name', ['projectId', 'name'])
export class DrawingSet {
  /**
   * Unique identifier for the drawing set (UUID v4)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ==================== PROJECT ASSOCIATION ====================

  /**
   * Parent project ID
   */
  @Column('uuid')
  projectId!: string;

  /**
   * Parent project relation
   */
  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project!: Project;

  // ==================== SET IDENTITY ====================

  /**
   * Drawing set name
   */
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  /**
   * Drawing set description
   */
  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /**
   * Type/purpose of drawing set
   */
  @Column({
    type: 'enum',
    enum: DrawingSetType,
    default: DrawingSetType.OTHER,
  })
  setType!: DrawingSetType;

  // ==================== SET METADATA ====================

  /**
   * Date this set was issued/published
   */
  @Column({ type: 'date', nullable: true })
  issueDate!: Date | null;

  /**
   * What this set was issued for
   * e.g., "Bid", "Construction", "Permit Review"
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  issuedFor!: string | null;

  /**
   * Whether this is the current/active set
   * Typically only one set per project should be current
   */
  @Column({ default: false })
  isCurrent!: boolean;

  /**
   * Denormalized count of drawings in this set
   * Updated when drawings are added/removed
   */
  @Column({ type: 'int', default: 0 })
  drawingCount!: number;

  /**
   * Status of the drawing set
   */
  @Column({
    type: 'varchar',
    length: 50,
    default: 'draft',
  })
  status!: 'draft' | 'issued' | 'superseded' | 'archived';

  /**
   * Revision label/marker for this set
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  revisionLabel!: string | null;

  /**
   * ID of the drawing set that supersedes this one
   */
  @Column({ type: 'uuid', nullable: true })
  supersededById!: string | null;

  /**
   * Drawing set that supersedes this one
   */
  @ManyToOne(() => DrawingSet, { nullable: true })
  @JoinColumn({ name: 'supersededById' })
  supersededBy!: DrawingSet | null;

  /**
   * Custom metadata for project-specific fields
   */
  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  // ==================== RELATIONSHIPS ====================

  /**
   * Drawings in this set
   * Circular dependency resolved by string reference
   */
  @OneToMany('Drawing', 'drawingSet')
  drawings!: any[]; // Drawing[]

  // ==================== AUDIT FIELDS ====================

  /**
   * User who created the drawing set
   */
  @Column('uuid')
  createdById!: string;

  /**
   * Created by user relation
   */
  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  /**
   * When drawing set was created
   */
  @CreateDateColumn()
  createdAt!: Date;

  /**
   * When drawing set was last updated
   */
  @UpdateDateColumn()
  updatedAt!: Date;

  /**
   * Soft delete timestamp
   */
  @DeleteDateColumn()
  deletedAt!: Date | null;
}
