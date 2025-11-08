import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { SystemRole } from '../enums/system-role.enum';

/**
 * User entity representing authenticated users in the system.
 *
 * Security Notes:
 * - The password field is EXCLUDED from serialization by default
 * - Passwords should NEVER be logged or exposed in API responses
 * - Email addresses are automatically converted to lowercase for consistency
 *
 * @entity users
 */
@Entity('users')
@Index('IDX_users_email', ['email']) // Index for login query performance
export class User {
  /**
   * Unique identifier for the user (UUID v4)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * User's email address (unique, case-insensitive)
   * Automatically converted to lowercase before save
   */
  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
    nullable: false,
    transformer: {
      to: (value: string) => value?.toLowerCase(),
      from: (value: string) => value,
    },
  })
  @Index('IDX_users_email_unique', { unique: true })
  email!: string;

  /**
   * User's phone number (optional, supports international format)
   */
  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    name: 'phone_number',
  })
  phoneNumber?: string;

  /**
   * Hashed password (SECURITY: Never expose this field)
   * - Excluded from class-transformer serialization
   * - Should only contain hashed values, never plain text
   * - Not selected by default in queries
   */
  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
    select: false, // Exclude from default SELECT queries
  })
  @Exclude() // Exclude from class-transformer serialization
  password!: string;

  /**
   * User's first name
   */
  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
    name: 'first_name',
    transformer: {
      to: (value: string) => value?.trim(),
      from: (value: string) => value,
    },
  })
  firstName!: string;

  /**
   * User's last name
   */
  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
    name: 'last_name',
    transformer: {
      to: (value: string) => value?.trim(),
      from: (value: string) => value,
    },
  })
  lastName!: string;

  /**
   * System-wide role for the user
   * Determines platform-level permissions (separate from org/project roles)
   * Default: SystemRole.USER
   */
  @Column({
    type: 'enum',
    enum: SystemRole,
    default: SystemRole.USER,
    nullable: false,
    name: 'system_role',
  })
  @Index('IDX_users_system_role')
  systemRole!: SystemRole;

  /**
   * Whether the user account is active
   * Inactive users cannot log in
   */
  @Column({
    type: 'boolean',
    default: true,
    nullable: false,
    name: 'is_active',
  })
  @Index('IDX_users_is_active')
  isActive!: boolean;

  /**
   * Whether the user's email has been verified
   * Used for email verification flows
   */
  @Column({
    type: 'boolean',
    default: false,
    nullable: false,
    name: 'email_verified',
  })
  emailVerified!: boolean;

  /**
   * Timestamp of the user's last successful login
   * Useful for security auditing and inactive user cleanup
   */
  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'last_login_at',
  })
  lastLoginAt?: Date;

  /**
   * Organization memberships
   * Users can belong to multiple organizations with different roles
   * Uncomment when OrganizationMember entity is created
   */
  // @OneToMany(() => OrganizationMember, (membership) => membership.user)
  // organizationMemberships?: OrganizationMember[];

  /**
   * Project memberships
   * Users can be assigned to multiple projects with different roles
   * Uncomment when ProjectMember entity is created
   */
  // @OneToMany(() => ProjectMember, (membership) => membership.user)
  // projectMemberships?: ProjectMember[];

  /**
   * Timestamp when the user was created
   */
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  /**
   * Timestamp when the user was last updated
   */
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;

  /**
   * Lifecycle hook: Convert email to lowercase before insert
   */
  @BeforeInsert()
  normalizeEmailBeforeInsert(): void {
    if (this.email) {
      this.email = this.email.toLowerCase().trim();
    }
    if (this.firstName) {
      this.firstName = this.firstName.trim();
    }
    if (this.lastName) {
      this.lastName = this.lastName.trim();
    }
  }

  /**
   * Lifecycle hook: Convert email to lowercase before update
   */
  @BeforeUpdate()
  normalizeEmailBeforeUpdate(): void {
    if (this.email) {
      this.email = this.email.toLowerCase().trim();
    }
    if (this.firstName) {
      this.firstName = this.firstName.trim();
    }
    if (this.lastName) {
      this.lastName = this.lastName.trim();
    }
  }

  /**
   * Get the user's full name
   */
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  /**
   * Check if the user is a system administrator
   * System admins have platform-wide access to all organizations and projects
   */
  isSystemAdmin(): boolean {
    return this.systemRole === SystemRole.SYSTEM_ADMIN;
  }

  /**
   * Override toJSON to ensure password is never serialized
   * This provides an additional safety layer beyond @Exclude decorator
   */
  toJSON(): Partial<User> {
    const { password, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }
}
