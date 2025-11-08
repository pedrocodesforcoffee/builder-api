import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';

/**
 * Project Status Enum
 */
export enum ProjectStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * Project Entity
 *
 * Represents a construction project within an organization.
 * Projects are where the actual construction management work happens.
 *
 * Features:
 * - Unique project code within organization
 * - Status tracking (planning, active, on hold, completed, cancelled)
 * - Date tracking (start, end, actual completion)
 * - JSONB settings for flexible configuration
 * - Belongs to an organization
 * - Has multiple members with different roles
 *
 * @entity projects
 */
@Entity('projects')
@Index('IDX_projects_organization', ['organizationId'])
@Index('IDX_projects_code', ['organizationId', 'code'], { unique: true })
@Index('IDX_projects_status', ['status'])
@Index('IDX_projects_start_date', ['startDate'])
export class Project {
  /**
   * Unique identifier for the project (UUID v4)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Organization ID
   * The organization that owns this project
   */
  @Column({
    type: 'uuid',
    name: 'organization_id',
    nullable: false,
  })
  organizationId!: string;

  /**
   * Project name
   * Display name shown in the UI
   */
  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  name!: string;

  /**
   * Project code
   * Short identifier (e.g., "PROJ-001", "NYC-TOWER-2024")
   * Must be unique within the organization
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  code!: string;

  /**
   * Project description
   * Detailed information about the project
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  /**
   * Project status
   * Tracks the current state of the project
   */
  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.PLANNING,
    nullable: false,
  })
  status!: ProjectStatus;

  /**
   * Project address or location
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  location?: string;

  /**
   * Planned start date
   */
  @Column({
    type: 'date',
    nullable: true,
    name: 'start_date',
  })
  startDate?: Date;

  /**
   * Planned end date
   */
  @Column({
    type: 'date',
    nullable: true,
    name: 'end_date',
  })
  endDate?: Date;

  /**
   * Actual completion date
   * Set when project status changes to COMPLETED
   */
  @Column({
    type: 'date',
    nullable: true,
    name: 'actual_completion_date',
  })
  actualCompletionDate?: Date;

  /**
   * Project settings stored as JSON
   * Flexible storage for project-specific configuration:
   * - Budget information
   * - Custom fields
   * - Integration settings
   * - Feature flags
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    default: {},
  })
  settings?: Record<string, any>;

  /**
   * Timestamp when the project was created
   */
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  /**
   * Timestamp when the project was last updated
   */
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;

  /**
   * Relationship to the parent organization
   */
  @ManyToOne(() => Organization, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  /**
   * Project members
   * Relationship to users assigned to this project
   * Uncomment when ProjectMember entity is created
   */
  // @OneToMany(() => ProjectMember, (member) => member.project, {
  //   cascade: true,
  // })
  // members?: ProjectMember[];

  /**
   * Helper method: Check if project is active
   */
  isActive(): boolean {
    return this.status === ProjectStatus.ACTIVE;
  }

  /**
   * Helper method: Check if project is completed
   */
  isCompleted(): boolean {
    return this.status === ProjectStatus.COMPLETED;
  }

  /**
   * Helper method: Check if project is in planning phase
   */
  isPlanning(): boolean {
    return this.status === ProjectStatus.PLANNING;
  }
}
