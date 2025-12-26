import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Document } from './document.entity';
import { Project } from '../../projects/entities/project.entity';
import { SpecificationDivision } from '../enums';

/**
 * Specification Entity
 *
 * Specialized entity for construction specifications organized by CSI MasterFormat.
 * Extends base Document entity with specification-specific fields.
 *
 * Features:
 * - CSI MasterFormat 2018 organization (Divisions 00-49)
 * - Section-level granularity
 * - Part/hierarchy tracking
 * - Version/revision management
 * - Addenda tracking
 * - Related items (submittals, drawings, RFIs)
 * - Product/manufacturer references
 *
 * @entity specifications
 */
@Entity('specifications')
@Index('IDX_specifications_project', ['projectId'])
@Index('IDX_specifications_project_division', ['projectId', 'division'])
@Index('IDX_specifications_project_section', ['projectId', 'sectionNumber'], {
  unique: true,
})
@Index('IDX_specifications_document', ['documentId'], { unique: true })
@Index('IDX_specifications_division_section', ['division', 'sectionNumber'])
@Index('IDX_specifications_published_date', ['publishedDate'])
export class Specification {
  /**
   * Unique identifier for the specification (UUID v4)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ==================== DOCUMENT LINK ====================

  /**
   * Link to base document entity
   */
  @Column('uuid')
  documentId!: string;

  /**
   * One-to-one relationship with document
   */
  @OneToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'documentId' })
  document!: Document;

  // ==================== PROJECT ASSOCIATION ====================

  /**
   * Parent project ID (denormalized for efficient queries)
   */
  @Column('uuid')
  projectId!: string;

  /**
   * Parent project relation
   */
  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project!: Project;

  // ==================== MASTERFORMAT CLASSIFICATION ====================

  /**
   * CSI MasterFormat division number
   */
  @Column({
    type: 'enum',
    enum: SpecificationDivision,
  })
  division!: SpecificationDivision;

  /**
   * Section number (e.g., "03 30 00", "09 91 23")
   * Format: {Division} {Level2} {Level3}
   */
  @Column({ type: 'varchar', length: 20 })
  sectionNumber!: string;

  /**
   * Section title (e.g., "Cast-in-Place Concrete")
   */
  @Column({ type: 'varchar', length: 255 })
  sectionTitle!: string;

  // ==================== HIERARCHY ====================

  /**
   * Part title within specification
   * (e.g., "Part 1 - General", "Part 2 - Products", "Part 3 - Execution")
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  partTitle!: string | null;

  /**
   * Part number (1, 2, 3)
   */
  @Column({ type: 'int', nullable: true })
  partNumber!: number | null;

  // ==================== VERSION/REVISION ====================

  /**
   * Revision marker
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  revision!: string | null;

  /**
   * Date specification was published
   */
  @Column({ type: 'date', nullable: true })
  publishedDate!: Date | null;

  /**
   * Date specification becomes effective
   */
  @Column({ type: 'date', nullable: true })
  effectiveDate!: Date | null;

  // ==================== CONTENT ====================

  /**
   * Number of pages in specification
   */
  @Column({ type: 'int', nullable: true })
  pageCount!: number | null;

  /**
   * Brief scope description
   */
  @Column({ type: 'text', nullable: true })
  scope!: string | null;

  // ==================== ADDENDA TRACKING ====================

  /**
   * Addenda that modify this specification
   * Array of addenda objects with number, date, description
   */
  @Column({ type: 'jsonb', default: [] })
  addenda!: Array<{
    number: string;
    date: string;
    description: string;
    documentId?: string;
  }>;

  // ==================== RELATED ITEMS ====================

  /**
   * Related submittals referenced in this specification
   */
  @Column({ type: 'jsonb', default: [] })
  relatedSubmittals!: Array<{
    submittalId?: string;
    submittalNumber: string;
    description: string;
  }>;

  /**
   * Related drawings referenced in this specification
   */
  @Column({ type: 'jsonb', default: [] })
  relatedDrawings!: Array<{
    drawingId?: string;
    drawingNumber: string;
    description: string;
  }>;

  /**
   * Related RFIs that reference this specification
   */
  @Column({ type: 'jsonb', default: [] })
  relatedRfis!: Array<{
    rfiId?: string;
    rfiNumber: string;
    description: string;
  }>;

  // ==================== PRODUCTS/MANUFACTURERS ====================

  /**
   * Products and manufacturers referenced in specification
   * For tracking approved products and substitutions
   */
  @Column({ type: 'jsonb', default: [] })
  productsReferenced!: Array<{
    manufacturer: string;
    productName: string;
    modelNumber?: string;
    isBaseBid: boolean;
    isSubstitution: boolean;
  }>;

  // ==================== ADDITIONAL METADATA ====================

  /**
   * Tags for categorization/search
   */
  @Column('simple-array', { default: '' })
  tags!: string[];

  /**
   * Custom fields for project-specific data
   */
  @Column({ type: 'jsonb', default: {} })
  customFields!: Record<string, any>;

  // ==================== STATUS ====================

  /**
   * Mark specification as not applicable for this project
   * Allows tracking which sections are included/excluded
   */
  @Column({ default: true })
  isApplicable!: boolean;

  /**
   * Submittal requirements extracted from specification
   * Structured data for tracking required submittals
   */
  @Column({ type: 'jsonb', default: [] })
  submittalRequirements!: Array<{
    type: string; // "Product Data", "Shop Drawings", "Samples"
    description: string;
    timing?: string; // "Prior to procurement", "Before installation"
  }>;

  // ==================== RELATIONS ====================

  /**
   * Products referenced in this specification
   */
  @OneToMany('SpecificationProduct', 'specification')
  products!: any[];

  /**
   * Drawings linked to this specification
   */
  @OneToMany('SpecificationDrawing', 'specification')
  drawingLinks!: any[];

  /**
   * RFIs linked to this specification
   */
  @OneToMany('SpecificationRfi', 'specification')
  rfiLinks!: any[];

  /**
   * Addendum sections affecting this specification
   */
  @OneToMany('AddendumSection', 'specification')
  addendumSections!: any[];

  // ==================== AUDIT FIELDS ====================

  /**
   * When specification record was created
   */
  @CreateDateColumn()
  createdAt!: Date;

  /**
   * When specification record was last updated
   */
  @UpdateDateColumn()
  updatedAt!: Date;
}
