import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';
import { TemplateCategory } from '../enums/template-category.enum';
import { ProjectType } from '../enums/project-type.enum';
import { DeliveryMethod } from '../enums/delivery-method.enum';

/**
 * Phase Definition Interface
 * Defines a project phase in the template
 */
export interface PhaseDefinition {
  name: string;
  description?: string;
  durationDays: number;
  order: number;
  milestones?: MilestoneDefinition[];
}

/**
 * Milestone Definition Interface
 * Defines a milestone within a phase
 */
export interface MilestoneDefinition {
  name: string;
  description?: string;
  offsetDays: number;
}

/**
 * Folder Definition Interface
 * Defines a folder in the document structure
 */
export interface FolderDefinition {
  name: string;
  description?: string;
  children?: FolderDefinition[];
}

/**
 * Custom Field Schema Interface
 * Defines schema for custom fields
 */
export interface CustomFieldSchema {
  [fieldName: string]: {
    type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean';
    label: string;
    required?: boolean;
    options?: string[];
    min?: number;
    max?: number;
    default?: any;
  };
}

/**
 * ProjectTemplate Entity
 *
 * Represents a reusable project template that can be applied when creating new projects.
 * Templates capture project configuration including settings, phases, document structure,
 * and custom fields. Supports both system-provided standard templates and organization-specific
 * custom templates.
 *
 * Features:
 * - System and custom templates
 * - Phase and milestone definitions
 * - Folder structure templates
 * - Custom field schemas
 * - Default project settings
 * - Usage tracking
 * - Full audit trail
 *
 * @entity project_templates
 */
@Entity('project_templates')
@Index('IDX_project_templates_organization', ['organizationId'])
@Index('IDX_project_templates_category', ['category'])
@Index('IDX_project_templates_is_system', ['isSystem'])
@Index('IDX_project_templates_usage_count', ['usageCount'])
export class ProjectTemplate {
  // ==================== CORE FIELDS ====================

  /**
   * Unique identifier for the template (UUID v4)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Template name
   * Must be unique within organization (or globally for system templates)
   */
  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  name!: string;

  /**
   * Template description
   * Detailed information about what this template is for
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  /**
   * Organization ID
   * Null for system templates, set for custom organization templates
   */
  @Column({
    type: 'uuid',
    name: 'organization_id',
    nullable: true,
  })
  organizationId?: string;

  /**
   * Is System Template
   * True for built-in templates, false for custom templates
   */
  @Column({
    type: 'boolean',
    name: 'is_system',
    default: false,
    nullable: false,
  })
  isSystem!: boolean;

  /**
   * Is Public
   * Whether template is visible to all users in organization
   */
  @Column({
    type: 'boolean',
    name: 'is_public',
    default: true,
    nullable: false,
  })
  isPublic!: boolean;

  /**
   * Template Category
   * Primary categorization of the template
   */
  @Column({
    type: 'enum',
    enum: TemplateCategory,
    nullable: false,
  })
  category!: TemplateCategory;

  // ==================== TEMPLATE CONFIGURATION ====================

  /**
   * Project Type
   * Default project type for projects created from this template
   */
  @Column({
    type: 'enum',
    enum: ProjectType,
    name: 'project_type',
    nullable: true,
  })
  projectType?: ProjectType;

  /**
   * Delivery Method
   * Default delivery method for projects
   */
  @Column({
    type: 'enum',
    enum: DeliveryMethod,
    name: 'delivery_method',
    nullable: true,
  })
  deliveryMethod?: DeliveryMethod;

  /**
   * Default Contract Type
   * E.g., "Lump Sum", "Cost Plus", "GMP"
   */
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'default_contract_type',
  })
  defaultContractType?: string;

  /**
   * Default Timezone
   * E.g., "America/New_York", "America/Los_Angeles"
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    default: 'America/New_York',
    name: 'default_timezone',
  })
  defaultTimezone?: string;

  /**
   * Default Working Days
   * Array of day numbers (0=Sunday, 1=Monday, ..., 6=Saturday)
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    default: [1, 2, 3, 4, 5],
    name: 'default_working_days',
  })
  defaultWorkingDays?: number[];

  /**
   * Default Holidays
   * Array of holiday dates (YYYY-MM-DD format)
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    default: [],
    name: 'default_holidays',
  })
  defaultHolidays?: string[];

  // ==================== TEMPLATE CONTENT ====================

  /**
   * Phases
   * Array of phase definitions with durations and milestones
   */
  @Column({
    type: 'jsonb',
    nullable: false,
  })
  phases!: PhaseDefinition[];

  /**
   * Folder Structure
   * JSON tree of folder definitions for document organization
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    name: 'folder_structure',
  })
  folderStructure?: FolderDefinition[];

  /**
   * Custom Fields Schema
   * JSON schema defining custom field structure for projects
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    name: 'custom_fields_schema',
  })
  customFieldsSchema?: CustomFieldSchema;

  /**
   * Default Tags
   * Array of tags to apply to projects created from this template
   */
  @Column({
    type: 'simple-array',
    nullable: true,
    name: 'default_tags',
  })
  defaultTags?: string[];

  /**
   * Settings
   * Additional template-specific configuration
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    default: {},
  })
  settings?: Record<string, any>;

  // ==================== USAGE TRACKING ====================

  /**
   * Usage Count
   * Number of times this template has been used to create projects
   */
  @Column({
    type: 'integer',
    default: 0,
    nullable: false,
    name: 'usage_count',
  })
  usageCount!: number;

  /**
   * Last Used At
   * Timestamp of most recent template usage
   */
  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'last_used_at',
  })
  lastUsedAt?: Date;

  // ==================== AUDIT FIELDS ====================

  /**
   * Timestamp when the template was created
   */
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  /**
   * Timestamp when the template was last updated
   */
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;

  /**
   * User ID who created the template
   */
  @Column({
    type: 'uuid',
    nullable: true,
    name: 'created_by',
  })
  createdBy?: string;

  /**
   * User ID who last updated the template
   */
  @Column({
    type: 'uuid',
    nullable: true,
    name: 'updated_by',
  })
  updatedBy?: string;

  // ==================== RELATIONSHIPS ====================

  /**
   * Relationship to the parent organization (null for system templates)
   */
  @ManyToOne(() => Organization, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization?: Organization;

  /**
   * User who created the template
   */
  @ManyToOne(() => User, {
    nullable: true,
  })
  @JoinColumn({ name: 'created_by' })
  creator?: User;

  /**
   * User who last updated the template
   */
  @ManyToOne(() => User, {
    nullable: true,
  })
  @JoinColumn({ name: 'updated_by' })
  updater?: User;

  // ==================== HELPER METHODS ====================

  /**
   * Get total duration of all phases in days
   */
  getTotalDuration(): number {
    if (!this.phases || this.phases.length === 0) {
      return 0;
    }
    return this.phases.reduce((sum, phase) => sum + phase.durationDays, 0);
  }

  /**
   * Get total number of milestones across all phases
   */
  getMilestoneCount(): number {
    if (!this.phases || this.phases.length === 0) {
      return 0;
    }
    return this.phases.reduce((sum, phase) => {
      return sum + (phase.milestones?.length || 0);
    }, 0);
  }

  /**
   * Check if template is editable (not a system template)
   */
  isEditable(): boolean {
    return !this.isSystem;
  }

  /**
   * Get folder count (recursive)
   */
  getFolderCount(): number {
    if (!this.folderStructure || this.folderStructure.length === 0) {
      return 0;
    }

    const countFolders = (folders: FolderDefinition[]): number => {
      return folders.reduce((sum, folder) => {
        return sum + 1 + (folder.children ? countFolders(folder.children) : 0);
      }, 0);
    };

    return countFolders(this.folderStructure);
  }
}
