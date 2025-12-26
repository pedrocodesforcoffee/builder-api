import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';

/**
 * Organization Entity
 *
 * Represents a company or organization using the platform.
 * Organizations are multi-tenant containers that can have multiple projects.
 *
 * Features:
 * - Unique slug for URL-friendly identification
 * - JSONB settings for flexible configuration
 * - Active/inactive status for soft deactivation
 * - Relationships to members and projects
 *
 * @entity organizations
 */
@Entity('organizations')
@Index('IDX_organizations_slug', ['slug'], { unique: true })
@Index('IDX_organizations_is_active', ['isActive'])
export class Organization {
  /**
   * Unique identifier for the organization (UUID v4)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Organization name
   * Display name shown in the UI
   */
  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  name!: string;

  /**
   * URL-friendly slug for the organization
   * Used in URLs: /orgs/{slug}/projects
   * Must be unique across all organizations
   */
  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
    nullable: false,
  })
  slug!: string;

  /**
   * Organization type (e.g., "General Contractor", "Subcontractor", "Owner")
   */
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  type?: string;

  /**
   * Organization primary email address
   */
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  email?: string;

  /**
   * Organization phone number
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  phone?: string;

  /**
   * Organization physical address
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  address?: string;

  /**
   * Organization website URL
   */
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  website?: string;

  /**
   * Tax ID or EIN (Employer Identification Number)
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    name: 'tax_id',
  })
  taxId?: string;

  /**
   * Whether the organization is active
   * Inactive organizations cannot be accessed by non-admins
   */
  @Column({
    type: 'boolean',
    default: true,
    nullable: false,
    name: 'is_active',
  })
  isActive!: boolean;

  /**
   * Organization settings stored as JSON
   * Flexible storage for org-specific configuration:
   * - Branding (logo, colors)
   * - Features (enabled modules)
   * - Preferences (timezone, date format)
   * - Billing information
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    default: {},
  })
  settings?: Record<string, any>;

  /**
   * Organization members
   * Relationship to users who belong to this organization
   * Uncomment when OrganizationMember entity is created
   */
  // @OneToMany(() => OrganizationMember, (member) => member.organization, {
  //   cascade: true,
  // })
  // members?: OrganizationMember[];

  /**
   * Projects belonging to this organization
   * Uncomment when Project entity is created
   */
  // @OneToMany(() => Project, (project) => project.organization, {
  //   cascade: true,
  // })
  // projects?: Project[];

  /**
   * Timestamp when the organization was created
   */
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  /**
   * Timestamp when the organization was last updated
   */
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;
}
