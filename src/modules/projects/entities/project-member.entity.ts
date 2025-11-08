import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { User } from '../../users/entities/user.entity';
import { ProjectRole } from '../../users/enums/project-role.enum';

/**
 * Project Member Entity
 *
 * Represents the many-to-many relationship between users and projects.
 * Each membership has a specific role that determines access within the project.
 *
 * Features:
 * - Composite primary key (user_id + project_id)
 * - Role-based access control at project level
 * - Optional expiration date for temporary access
 * - Tracks who added the member and when
 * - Audit trail with created/updated timestamps
 *
 * @entity project_members
 */
@Entity('project_members')
@Index('IDX_proj_members_user_proj', ['userId', 'projectId'], { unique: true })
@Index('IDX_proj_members_project', ['projectId'])
@Index('IDX_proj_members_user', ['userId'])
@Index('IDX_proj_members_role', ['role'])
@Index('IDX_proj_members_expires_at', ['expiresAt'])
export class ProjectMember {
  /**
   * User ID (composite primary key)
   */
  @PrimaryColumn({ type: 'uuid', name: 'user_id' })
  userId!: string;

  /**
   * Project ID (composite primary key)
   */
  @PrimaryColumn({ type: 'uuid', name: 'project_id' })
  projectId!: string;

  /**
   * Role within the project
   * Determines what actions the user can perform in this project
   */
  @Column({
    type: 'enum',
    enum: ProjectRole,
    nullable: false,
  })
  role!: ProjectRole;

  /**
   * ID of the user who added this member to the project
   * Null for auto-assigned members (e.g., org admins)
   */
  @Column({
    type: 'uuid',
    nullable: true,
    name: 'added_by_user_id',
  })
  addedByUserId?: string;

  /**
   * Optional expiration date for temporary access
   * Useful for contractors or consultants with time-limited engagements
   * Null means no expiration
   */
  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'expires_at',
  })
  expiresAt?: Date;

  /**
   * Timestamp when the membership was created
   */
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  /**
   * Timestamp when the membership was last updated
   */
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;

  /**
   * Relationship to the user
   */
  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  /**
   * Relationship to the project
   */
  @ManyToOne(() => Project, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  /**
   * Relationship to the user who added this member
   */
  @ManyToOne(() => User, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'added_by_user_id' })
  addedBy?: User;

  /**
   * Helper method: Check if membership has expired
   */
  isExpired(): boolean {
    if (!this.expiresAt) {
      return false;
    }
    return this.expiresAt < new Date();
  }

  /**
   * Helper method: Check if member is a project admin
   */
  isProjectAdmin(): boolean {
    return this.role === ProjectRole.PROJECT_ADMIN;
  }

  /**
   * Helper method: Check if member can manage other members
   * Only project admins and project managers can manage members
   */
  canManageMembers(): boolean {
    return (
      this.role === ProjectRole.PROJECT_ADMIN ||
      this.role === ProjectRole.PROJECT_MANAGER
    );
  }

  /**
   * Helper method: Check if member can edit project data
   * Most roles can edit except viewers, inspectors, and owner reps
   */
  canEditData(): boolean {
    const readOnlyRoles = [
      ProjectRole.VIEWER,
      ProjectRole.INSPECTOR,
      ProjectRole.OWNER_REP,
    ];
    return !readOnlyRoles.includes(this.role);
  }

  /**
   * Helper method: Check if member has at least the specified role level
   * Role hierarchy for administrative access:
   * PROJECT_ADMIN > PROJECT_MANAGER > PROJECT_ENGINEER > Others
   */
  hasAdminRoleLevel(minimumRole: ProjectRole): boolean {
    const adminRoleHierarchy: Record<string, number> = {
      [ProjectRole.PROJECT_ADMIN]: 3,
      [ProjectRole.PROJECT_MANAGER]: 2,
      [ProjectRole.PROJECT_ENGINEER]: 1,
    };

    const currentLevel = adminRoleHierarchy[this.role] || 0;
    const minimumLevel = adminRoleHierarchy[minimumRole] || 0;

    return currentLevel >= minimumLevel;
  }
}
