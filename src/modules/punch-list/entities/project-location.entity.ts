import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Tree,
  TreeParent,
  TreeChildren,
  Index,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { PunchItem } from './punch-item.entity';

/**
 * Location type for hierarchical organization
 * Typical hierarchy: Building → Floor → Unit → Room
 */
export enum LocationType {
  BUILDING = 'BUILDING',
  FLOOR = 'FLOOR',
  UNIT = 'UNIT',
  ROOM = 'ROOM',
  AREA = 'AREA',
  ZONE = 'ZONE',
  OTHER = 'OTHER',
}

/**
 * ProjectLocation entity with tree structure for hierarchical locations
 * Supports multi-level organization using TypeORM closure table pattern
 *
 * Example structure:
 * - Building A
 *   - Floor 1
 *     - Unit 101
 *       - Living Room
 *       - Kitchen
 *     - Unit 102
 *   - Floor 2
 */
@Entity('project_locations')
@Tree('closure-table')
@Index(['projectId', 'code'], { unique: true })
@Index(['projectId', 'type'])
export class ProjectLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'projectId' })
  projectId: string;

  @ManyToOne(() => Project, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  code: string;

  @Column({
    type: 'enum',
    enum: LocationType,
    default: LocationType.ROOM,
  })
  type: LocationType;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  /**
   * Tree structure relationships
   * TypeORM manages the closure table automatically
   */
  @TreeParent()
  parent: ProjectLocation;

  @TreeChildren()
  children: ProjectLocation[];

  /**
   * Punch items at this location
   */
  @OneToMany(() => PunchItem, (punchItem) => punchItem.location)
  punchItems: PunchItem[];

  /**
   * Audit fields
   */
  @Column({ type: 'uuid', name: 'createdById', nullable: true })
  createdById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updatedAt' })
  updatedAt: Date;

  /**
   * Computed full path (e.g., "Building A / Floor 1 / Unit 101 / Living Room")
   * Can be populated via query or computed in service layer
   */
  fullPath?: string;

  /**
   * Count of punch items at this location (can be populated by query)
   */
  punchItemCount?: number;
}
