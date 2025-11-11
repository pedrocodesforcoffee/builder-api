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
import { Organization } from './organization.entity';
import { User } from '../../users/entities/user.entity';
import { OrganizationRole } from '../../users/enums/organization-role.enum';

/**
 * Organization Member Entity
 *
 * Represents the many-to-many relationship between users and organizations.
 * Each membership has a specific role that determines access within the organization.
 *
 * Features:
 * - Composite primary key (user_id + organization_id)
 * - Role-based access control at organization level
 * - Invitation workflow tracking (invited, accepted, joined)
 * - Tracks who added the member and when
 * - Audit trail with created/updated timestamps
 *
 * @entity organization_members
 */
@Entity('organization_members')
@Index('IDX_org_members_user_org', ['userId', 'organizationId'], { unique: true })
@Index('IDX_org_members_organization', ['organizationId'])
@Index('IDX_org_members_user', ['userId'])
@Index('IDX_org_members_role', ['role'])
@Index('IDX_org_members_invited_at', ['invitedAt'])
@Index('IDX_org_members_joined_at', ['joinedAt'])
export class OrganizationMember {
  /**
   * User ID (composite primary key)
   */
  @PrimaryColumn({ type: 'uuid', name: 'user_id' })
  userId!: string;

  /**
   * Organization ID (composite primary key)
   */
  @PrimaryColumn({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  /**
   * Role within the organization
   * Determines what actions the user can perform in this organization
   */
  @Column({
    type: 'enum',
    enum: OrganizationRole,
    nullable: false,
  })
  role!: OrganizationRole;

  /**
   * ID of the user who added this member to the organization
   * Null for organization owners (self-assigned during org creation)
   */
  @Column({
    type: 'uuid',
    nullable: true,
    name: 'added_by_user_id',
  })
  addedByUserId?: string;

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
   * Timestamp when the user actually joined/activated in the organization
   * May differ from acceptedAt if there's a delay
   */
  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'joined_at',
  })
  joinedAt?: Date;

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
   * Relationship to the organization
   */
  @ManyToOne(() => Organization, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  /**
   * Relationship to the user who added this member
   */
  @ManyToOne(() => User, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'added_by_user_id' })
  addedBy?: User;

  /**
   * Helper method: Check if member is an owner
   */
  isOwner(): boolean {
    return this.role === OrganizationRole.OWNER;
  }

  /**
   * Helper method: Check if member is an admin (owner or org_admin)
   */
  isAdmin(): boolean {
    return (
      this.role === OrganizationRole.OWNER ||
      this.role === OrganizationRole.ORG_ADMIN
    );
  }

  /**
   * Helper method: Check if member can manage other members
   * Only owners and admins can manage members
   */
  canManageMembers(): boolean {
    return this.isAdmin();
  }

  /**
   * Helper method: Check if member has at least the specified role level
   * Role hierarchy: OWNER > ORG_ADMIN > ORG_MEMBER > GUEST
   */
  hasRoleLevel(minimumRole: OrganizationRole): boolean {
    const roleHierarchy: Record<OrganizationRole, number> = {
      [OrganizationRole.OWNER]: 4,
      [OrganizationRole.ORG_ADMIN]: 3,
      [OrganizationRole.ORG_MEMBER]: 2,
      [OrganizationRole.GUEST]: 1,
    };

    return roleHierarchy[this.role] >= roleHierarchy[minimumRole];
  }

  /**
   * Helper method: Check if invitation is pending
   */
  isInvitationPending(): boolean {
    return this.invitedAt !== null && this.invitedAt !== undefined && !this.acceptedAt;
  }

  /**
   * Helper method: Check if member has joined the organization
   */
  hasJoined(): boolean {
    return this.joinedAt !== null && this.joinedAt !== undefined;
  }
}
