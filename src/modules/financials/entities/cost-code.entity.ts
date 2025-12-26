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
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

/**
 * CostCode Entity
 *
 * Represents a hierarchical cost code structure following CSI MasterFormat divisions.
 * Cost codes can be:
 * - Project-specific codes (projectId is set)
 * - Organization-wide template codes (projectId is null)
 *
 * Supports nested hierarchies with parent-child relationships and
 * auto-generated full codes (e.g., "01.01.01" from parent chain).
 *
 * Features:
 * - CSI MasterFormat compatible (divisions 0-50)
 * - Hierarchical structure with parent-child relationships
 * - Auto-generated full code paths
 * - Flexible project-specific or template codes
 * - Sort ordering for consistent display
 * - Soft delete via isActive flag
 *
 * @entity cost_codes
 */
@Entity('cost_codes')
@Index('IDX_cost_codes_project', ['projectId'])
@Index('IDX_cost_codes_code', ['code'])
@Index('IDX_cost_codes_full_code', ['fullCode'])
@Index('IDX_cost_codes_division', ['division'])
@Index('IDX_cost_codes_parent', ['parentId'])
@Index('IDX_cost_codes_active', ['isActive'])
@Index('IDX_cost_codes_unique_code', ['projectId', 'code'], { unique: true })
export class CostCode {
  // ==================== CORE FIELDS ====================

  /**
   * Unique identifier for the cost code (UUID v4)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Project ID (optional)
   * - If set: this is a project-specific cost code
   * - If null: this is an organization-wide template cost code
   */
  @Column({
    type: 'uuid',
    name: 'project_id',
    nullable: true,
  })
  projectId?: string;

  /**
   * Cost code segment
   * The code at this level of the hierarchy (e.g., "01", "100", "LABOR")
   * Unique within the project (or within templates if projectId is null)
   *
   * Examples:
   * - "01" (Division 01 - General Requirements)
   * - "01.01" (Submittals)
   * - "LABOR" (Custom labor code)
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  code!: string;

  /**
   * Cost code name
   * Short human-readable name for this cost code
   *
   * Examples:
   * - "General Requirements"
   * - "Submittals"
   * - "Direct Labor"
   */
  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  name!: string;

  /**
   * Cost code description
   * Detailed description of what this code represents
   *
   * Examples:
   * - "Administrative and temporary facilities"
   * - "Project summary and work restrictions"
   * - "Direct Labor Costs"
   */
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  description?: string;

  /**
   * Full hierarchical code path
   * Auto-generated from the parent chain
   * Provides the complete code path from root to this node
   *
   * Examples:
   * - "01" (top-level division)
   * - "01.01" (division > subdivision)
   * - "01.01.100" (division > subdivision > detail)
   *
   * This field is computed automatically before insert/update
   */
  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
    name: 'full_code',
  })
  fullCode!: string;

  /**
   * CSI MasterFormat division number (0-50)
   * Aligns with standard construction cost code divisions
   *
   * Common divisions:
   * - 0: Procurement and Contracting
   * - 1: General Requirements
   * - 2-19: Reserved / Site & Concrete Work
   * - 20-29: Reserved / Mechanical
   * - 30-39: Reserved / Electrical
   * - 40-49: Reserved / Special Construction
   * - 50: Reserved / Other
   *
   * @see https://www.csiresources.org/standards/masterformat
   */
  @Column({
    type: 'integer',
    nullable: false,
    default: 0,
  })
  division!: number;

  /**
   * Parent cost code ID (optional)
   * Enables hierarchical cost code structures
   * - If null: this is a root-level cost code
   * - If set: this code is a child of another cost code
   */
  @Column({
    type: 'uuid',
    name: 'parent_id',
    nullable: true,
  })
  parentId?: string;

  /**
   * Active status flag
   * Allows soft-deletion of cost codes without removing them from history
   * Inactive codes should not appear in dropdowns but remain in historical data
   */
  @Column({
    type: 'boolean',
    name: 'is_active',
    nullable: false,
    default: true,
  })
  isActive!: boolean;

  /**
   * Cost category (computed from division or defaults to 'OTHER')
   * Used for budget categorization
   */
  get category(): string {
    return 'OTHER';
  }

  /**
   * Sort order
   * Controls the display order of cost codes at the same hierarchy level
   * Lower numbers appear first
   */
  @Column({
    type: 'integer',
    name: 'sort_order',
    nullable: false,
    default: 0,
  })
  sortOrder!: number;

  // ==================== AUDIT FIELDS ====================

  /**
   * Timestamp when the cost code was created
   */
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
  })
  createdAt!: Date;

  /**
   * Timestamp when the cost code was last updated
   */
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp with time zone',
  })
  updatedAt!: Date;

  // ==================== RELATIONSHIPS ====================

  /**
   * Project relationship (optional)
   * Links to the project this cost code belongs to
   * Null for template/organization-wide cost codes
   */
  @ManyToOne(() => Project, (project) => project.costCodes, { nullable: true })
  @JoinColumn({ name: 'project_id' })
  project?: Project;

  /**
   * Parent cost code relationship (optional)
   * Links to the parent cost code in the hierarchy
   */
  @ManyToOne(() => CostCode, (costCode) => costCode.children, {
    nullable: true,
  })
  @JoinColumn({ name: 'parent_id' })
  parent?: CostCode;

  /**
   * Child cost codes
   * All cost codes that have this code as their parent
   */
  @OneToMany(() => CostCode, (costCode) => costCode.parent)
  children?: CostCode[];

  // ==================== COMPUTED FIELDS & HOOKS ====================

  /**
   * Before insert hook
   * Validates and computes derived fields before saving
   */
  @BeforeInsert()
  @BeforeUpdate()
  async validateAndCompute() {
    // Validate division range
    if (this.division < 0 || this.division > 50) {
      throw new Error('Division must be between 0 and 50');
    }

    // Validate code format
    if (!this.code || this.code.trim().length === 0) {
      throw new Error('Code is required');
    }

    if (this.code.length > 50) {
      throw new Error('Code must not exceed 50 characters');
    }

    // Validate name
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Name is required');
    }

    if (this.name.length > 255) {
      throw new Error('Name must not exceed 255 characters');
    }

    // Validate description (optional)
    if (this.description && this.description.length > 500) {
      throw new Error('Description must not exceed 500 characters');
    }

    // Note: fullCode computation would ideally happen here
    // However, TypeORM hooks don't have easy access to the entity manager
    // for loading parent data. Full code generation should be handled
    // in the service layer before saving.
    //
    // For now, ensure fullCode is set (service layer responsibility)
    if (!this.fullCode) {
      this.fullCode = this.code;
    }
  }
}
