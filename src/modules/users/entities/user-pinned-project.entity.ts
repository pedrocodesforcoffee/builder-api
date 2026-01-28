import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Project } from '../../projects/entities/project.entity';

/**
 * UserPinnedProject entity
 *
 * Tracks which projects a user has pinned to their dashboard.
 * Users can pin up to 10 projects for quick access.
 *
 * @entity user_pinned_projects
 */
@Entity('user_pinned_projects')
@Unique(['userId', 'projectId'])
@Index(['userId'])
@Index(['projectId'])
export class UserPinnedProject {
  /**
   * Unique identifier for the pinned project record (UUID v4)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * User ID who pinned the project
   */
  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  /**
   * User who pinned the project
   */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  /**
   * Project ID that was pinned
   */
  @Column({ type: 'uuid', name: 'project_id' })
  projectId!: string;

  /**
   * Project that was pinned
   */
  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  /**
   * Timestamp when the project was pinned
   */
  @CreateDateColumn({
    name: 'pinned_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  pinnedAt!: Date;

  /**
   * Position/order of the pinned project (for custom ordering)
   * Lower numbers appear first
   */
  @Column({ type: 'int', nullable: true })
  position?: number;
}
