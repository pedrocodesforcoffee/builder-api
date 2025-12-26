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
 * - Optional scope limitations for granular access control
 * - Optional expiration date for temporary access
 * - Invitation workflow tracking (invited, accepted, joined)
 * - Activity tracking (last access timestamp)
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
@Index('IDX_proj_members_invited_at', ['invitedAt'])
@Index('IDX_proj_members_joined_at', ['joinedAt'])
@Index('IDX_proj_members_last_accessed', ['lastAccessedAt'])
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
   * Reason for expiration (e.g., "90-day inspection contract")
   */
  @Column({
    type: 'text',
    nullable: true,
    name: 'expiration_reason',
  })
  expirationReason?: string;

  /**
   * Timestamp when 7-day expiration warning was sent
   */
  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'expiration_warning_notified_at',
  })
  expirationWarningNotifiedAt?: Date;

  /**
   * Timestamp when 1-day expiration warning was sent
   */
  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'expiration_final_notified_at',
  })
  expirationFinalNotifiedAt?: Date;

  /**
   * Timestamp when expiration notification was sent
   */
  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'expired_notified_at',
  })
  expiredNotifiedAt?: Date;

  /**
   * Whether user has requested renewal
   */
  @Column({
    type: 'boolean',
    default: false,
    name: 'renewal_requested',
  })
  renewalRequested!: boolean;

  /**
   * Timestamp when renewal was requested
   */
  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'renewal_requested_at',
  })
  renewalRequestedAt?: Date;

  /**
   * User ID who requested renewal
   */
  @Column({
    type: 'uuid',
    nullable: true,
    name: 'renewal_requested_by',
  })
  renewalRequestedBy?: string;

  /**
   * Reason for renewal request
   */
  @Column({
    type: 'text',
    nullable: true,
    name: 'renewal_reason',
  })
  renewalReason?: string;

  /**
   * User ID who processed (approved/denied) renewal
   */
  @Column({
    type: 'uuid',
    nullable: true,
    name: 'renewal_processed_by',
  })
  renewalProcessedBy?: string;

  /**
   * Timestamp when renewal was processed
   */
  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'renewal_processed_at',
  })
  renewalProcessedAt?: Date;

  /**
   * Status of renewal request
   */
  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    name: 'renewal_status',
  })
  renewalStatus?: 'pending' | 'approved' | 'denied';

  /**
   * Scope limitations for this member's access
   * Used to restrict access to specific areas, trades, or resources
   *
   * Examples:
   * - Array format: ['electrical', 'plumbing']
   * - Object format: { trades: ['electrical'], floors: ['1', '2'] }
   *
   * Null means no scope limitations (full project access)
   */
  @Column({
    type: 'jsonb',
    nullable: true,
  })
  scope?: string[] | Record<string, string[]>;

  /**
   * Timestamp when the invitation was sent
   * Null for direct assignments (no invitation workflow)
   */
  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'invited_at',
  })
  invitedAt?: Date;

  /**
   * Timestamp when the user accepted the invitation
   * Null if invitation not yet accepted or no invitation sent
   */
  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'accepted_at',
  })
  acceptedAt?: Date;

  /**
   * Timestamp when the user actually joined/activated in the project
   * May differ from acceptedAt if there's a delay
   */
  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'joined_at',
  })
  joinedAt?: Date;

  /**
   * Timestamp of last project access by this member
   * Useful for tracking active vs inactive members
   */
  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'last_accessed_at',
  })
  lastAccessedAt?: Date;

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

  /**
   * Helper method: Check if member has scope limitations
   */
  hasScopeLimitations(): boolean {
    return this.scope !== null && this.scope !== undefined;
  }

  /**
   * Helper method: Check if member has access to a specific scope item
   * @param scopeKey - The scope category (e.g., 'trades', 'floors', 'areas')
   * @param scopeValue - The specific value to check (e.g., 'electrical', '1', 'north-wing')
   * @returns true if member has access, false if restricted
   */
  hasAccessToScope(scopeKey?: string, scopeValue?: string): boolean {
    // No scope limitations means full access
    if (!this.hasScopeLimitations()) {
      return true;
    }

    // Array format: simple list of allowed items
    if (Array.isArray(this.scope)) {
      // If no specific value provided, just check if scope exists
      if (!scopeValue) {
        return this.scope.length > 0;
      }
      return this.scope.includes(scopeValue);
    }

    // Object format: categorized scope limitations
    if (typeof this.scope === 'object' && this.scope !== null) {
      // If no key provided, just check if any scope exists
      if (!scopeKey) {
        return Object.keys(this.scope).length > 0;
      }

      const categoryValues = this.scope[scopeKey];
      if (!categoryValues || !Array.isArray(categoryValues)) {
        return false;
      }

      // If no specific value provided, check if category exists
      if (!scopeValue) {
        return categoryValues.length > 0;
      }

      return categoryValues.includes(scopeValue);
    }

    // Unknown format, deny access
    return false;
  }

  /**
   * Helper method: Check if invitation is pending
   */
  isInvitationPending(): boolean {
    return this.invitedAt !== null && this.invitedAt !== undefined && !this.acceptedAt;
  }

  /**
   * Helper method: Check if member has joined the project
   */
  hasJoined(): boolean {
    return this.joinedAt !== null && this.joinedAt !== undefined;
  }

  /**
   * Helper method: Get days since last access
   */
  getDaysSinceLastAccess(): number | null {
    if (!this.lastAccessedAt) {
      return null;
    }
    const now = new Date();
    const diffMs = now.getTime() - this.lastAccessedAt.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }
}
