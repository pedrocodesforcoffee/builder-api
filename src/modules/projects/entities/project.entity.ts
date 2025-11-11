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
import { User } from '../../users/entities/user.entity';
import { ProjectType } from '../enums/project-type.enum';
import { DeliveryMethod } from '../enums/delivery-method.enum';
import { ProjectStatus } from '../enums/project-status.enum';
import { ProjectMember } from './project-member.entity';

/**
 * Project Entity
 *
 * Represents a comprehensive construction project within an organization.
 * Enhanced to support ProCore-style project management with detailed
 * construction-specific fields, financial tracking, location data, and
 * flexible metadata.
 *
 * Features:
 * - Unique project number within organization
 * - Comprehensive location tracking (address + coordinates)
 * - Construction-specific fields (type, delivery method, square footage)
 * - Financial tracking (original/current contract, percent complete)
 * - Schedule management (multiple date milestones)
 * - Project settings (timezone, working days, holidays)
 * - Flexible custom fields and tags
 * - Full audit trail (created/updated by/at)
 *
 * @entity projects
 */
@Entity('projects')
@Index('IDX_projects_organization', ['organizationId'])
@Index('IDX_projects_number', ['organizationId', 'number'], { unique: true })
@Index('IDX_projects_status', ['status'])
@Index('IDX_projects_type', ['type'])
@Index('IDX_projects_start_date', ['startDate'])
@Index('IDX_projects_location', ['latitude', 'longitude'])
export class Project {
  // ==================== CORE FIELDS ====================

  /**
   * Unique identifier for the project (UUID v4)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Project number
   * Unique identifier within the organization (e.g., "2024-001", "NYC-TOWER-2024")
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  number!: string;

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
   * Organization ID
   * The organization that owns this project
   */
  @Column({
    type: 'uuid',
    name: 'organization_id',
    nullable: false,
  })
  organizationId!: string;

  // ==================== LOCATION DETAILS ====================

  /**
   * Street address
   */
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  address?: string;

  /**
   * City
   */
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  city?: string;

  /**
   * State/Province
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  state?: string;

  /**
   * ZIP/Postal code
   */
  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  zip?: string;

  /**
   * Country
   */
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    default: 'USA',
  })
  country?: string;

  /**
   * Latitude for geolocation
   * Range: -90 to 90
   */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  latitude?: number;

  /**
   * Longitude for geolocation
   * Range: -180 to 180
   */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  longitude?: number;

  // ==================== CONSTRUCTION-SPECIFIC FIELDS ====================

  /**
   * Project type
   * Categorizes the construction project
   */
  @Column({
    type: 'enum',
    enum: ProjectType,
    nullable: false,
  })
  type!: ProjectType;

  /**
   * Delivery method
   * How the project is being procured and delivered
   */
  @Column({
    type: 'enum',
    enum: DeliveryMethod,
    nullable: true,
    name: 'delivery_method',
  })
  deliveryMethod?: DeliveryMethod;

  /**
   * Contract type
   * E.g., "Lump Sum", "Cost Plus", "GMP" (Guaranteed Maximum Price)
   */
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'contract_type',
  })
  contractType?: string;

  /**
   * Square footage
   * Total building area in square feet
   */
  @Column({
    type: 'integer',
    nullable: true,
    name: 'square_footage',
  })
  squareFootage?: number;

  // ==================== SCHEDULE MANAGEMENT ====================

  /**
   * Project start date
   */
  @Column({
    type: 'date',
    nullable: true,
    name: 'start_date',
  })
  startDate?: Date;

  /**
   * Project end date (planned)
   */
  @Column({
    type: 'date',
    nullable: true,
    name: 'end_date',
  })
  endDate?: Date;

  /**
   * Substantial completion date
   * When work is sufficiently complete for intended use
   */
  @Column({
    type: 'date',
    nullable: true,
    name: 'substantial_completion',
  })
  substantialCompletion?: Date;

  /**
   * Final completion date
   * When all punchlist items and closeout are complete
   */
  @Column({
    type: 'date',
    nullable: true,
    name: 'final_completion',
  })
  finalCompletion?: Date;

  // ==================== FINANCIAL TRACKING ====================

  /**
   * Original contract amount
   * Initial contract value before any change orders
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
    name: 'original_contract',
  })
  originalContract?: number;

  /**
   * Current contract amount
   * Contract value including approved change orders
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
    name: 'current_contract',
  })
  currentContract?: number;

  /**
   * Percent complete
   * Overall project completion percentage (0-100)
   */
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    default: 0,
    name: 'percent_complete',
  })
  percentComplete?: number;

  // ==================== PROJECT SETTINGS ====================

  /**
   * Project timezone
   * E.g., "America/New_York", "America/Los_Angeles"
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    default: 'America/New_York',
  })
  timezone?: string;

  /**
   * Working days
   * Array of day numbers (0=Sunday, 1=Monday, etc.)
   * E.g., [1,2,3,4,5] for Monday-Friday
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    default: [1, 2, 3, 4, 5],
    name: 'working_days',
  })
  workingDays?: number[];

  /**
   * Holidays
   * Array of holiday dates (YYYY-MM-DD format)
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    default: [],
  })
  holidays?: string[];

  // ==================== METADATA & FLEXIBILITY ====================

  /**
   * Custom fields
   * Extensible JSON storage for project-specific data
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    default: {},
    name: 'custom_fields',
  })
  customFields?: Record<string, any>;

  /**
   * Tags
   * Array of tag strings for categorization/filtering
   */
  @Column({
    type: 'simple-array',
    nullable: true,
  })
  tags?: string[];

  /**
   * Project status
   * Tracks the current lifecycle stage
   */
  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.BIDDING,
    nullable: false,
  })
  status!: ProjectStatus;

  /**
   * Project description
   * Detailed information about the project
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  // ==================== AUDIT FIELDS ====================

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
   * User ID who created the project
   */
  @Column({
    type: 'uuid',
    nullable: true,
    name: 'created_by',
  })
  createdBy?: string;

  /**
   * User ID who last updated the project
   */
  @Column({
    type: 'uuid',
    nullable: true,
    name: 'updated_by',
  })
  updatedBy?: string;

  // ==================== RELATIONSHIPS ====================

  /**
   * Relationship to the parent organization
   */
  @ManyToOne(() => Organization, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  /**
   * User who created the project
   */
  @ManyToOne(() => User, {
    nullable: true,
  })
  @JoinColumn({ name: 'created_by' })
  creator?: User;

  /**
   * User who last updated the project
   */
  @ManyToOne(() => User, {
    nullable: true,
  })
  @JoinColumn({ name: 'updated_by' })
  updater?: User;

  /**
   * Project members
   * Relationship to users assigned to this project
   */
  @OneToMany(() => ProjectMember, (member) => member.project, {
    cascade: true,
  })
  members?: ProjectMember[];

  // ==================== CALCULATED PROPERTIES / METHODS ====================

  /**
   * Calculate days remaining until end date
   * Returns null if no end date is set
   */
  daysRemaining(): number | null {
    if (!this.endDate) {
      return null;
    }

    const today = new Date();
    const end = new Date(this.endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  /**
   * Check if project is in an active status
   * Active means between PRECONSTRUCTION and CLOSEOUT (inclusive)
   */
  isActive(): boolean {
    const activeStatuses = [
      ProjectStatus.PRECONSTRUCTION,
      ProjectStatus.CONSTRUCTION,
      ProjectStatus.CLOSEOUT,
    ];
    return activeStatuses.includes(this.status);
  }

  /**
   * Calculate budget variance
   * Returns the difference between current and original contract
   * Positive = over budget, Negative = under budget
   */
  budgetVariance(): number | null {
    if (
      this.originalContract === null ||
      this.originalContract === undefined ||
      this.currentContract === null ||
      this.currentContract === undefined
    ) {
      return null;
    }

    return Number(this.currentContract) - Number(this.originalContract);
  }

  /**
   * Calculate total project duration in days
   * Returns null if start or end date is not set
   */
  durationDays(): number | null {
    if (!this.startDate || !this.endDate) {
      return null;
    }

    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  /**
   * Check if project is completed
   */
  isCompleted(): boolean {
    return this.status === ProjectStatus.COMPLETE;
  }

  /**
   * Check if project is in bidding phase
   */
  isBidding(): boolean {
    return this.status === ProjectStatus.BIDDING;
  }

  /**
   * Get full address as string
   */
  getFullAddress(): string {
    const parts = [this.address, this.city, this.state, this.zip, this.country].filter(Boolean);
    return parts.join(', ');
  }
}
