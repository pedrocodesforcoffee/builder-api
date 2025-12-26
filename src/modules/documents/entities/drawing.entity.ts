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
import { DrawingSet } from './drawing-set.entity';
import { DrawingDiscipline, DrawingType } from '../enums';

/**
 * Drawing Entity
 *
 * Specialized entity for construction drawings with industry-standard metadata.
 * Extends base Document entity with drawing-specific fields.
 *
 * Features:
 * - Industry-standard sheet numbering (A-101, S-201.1)
 * - Discipline and type classification
 * - Sheet size and ordering information
 * - Comprehensive revision tracking with history
 * - Location references (grid, area, zone)
 * - Cross-references to other drawings
 * - Custom fields for flexibility
 *
 * @entity drawings
 */
@Entity('drawings')
@Index('IDX_drawings_set', ['drawingSetId'])
@Index('IDX_drawings_set_discipline', ['drawingSetId', 'discipline'])
@Index('IDX_drawings_set_number', ['drawingSetId', 'number'], {
  unique: true,
  where: '"drawingSetId" IS NOT NULL',
})
@Index('IDX_drawings_document', ['documentId'], { unique: true })
@Index('IDX_drawings_discipline', ['discipline'])
@Index('IDX_drawings_number', ['number'])
export class Drawing {
  /**
   * Unique identifier for the drawing (UUID v4)
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

  // ==================== DRAWING SET ASSOCIATION ====================

  /**
   * Parent drawing set ID (optional)
   */
  @Column('uuid', { nullable: true })
  drawingSetId!: string | null;

  /**
   * Parent drawing set relation
   */
  @ManyToOne(() => DrawingSet, (set) => set.drawings, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'drawingSetId' })
  drawingSet!: DrawingSet | null;

  // ==================== REVISIONS ====================

  /**
   * Complete revision history for this drawing
   * OneToMany relationship to DrawingRevision
   */
  @OneToMany('DrawingRevision', 'drawing')
  revisions!: any[];

  // ==================== CROSS-REFERENCES ====================

  /**
   * References this drawing makes to other drawings
   * OneToMany relationship to DrawingCrossReference (as source)
   */
  @OneToMany('DrawingCrossReference', 'sourceDrawing')
  outgoingReferences!: any[];

  /**
   * References from other drawings pointing to this drawing
   * OneToMany relationship to DrawingCrossReference (as target)
   */
  @OneToMany('DrawingCrossReference', 'targetDrawing')
  incomingReferences!: any[];

  // ==================== DRAWING IDENTITY ====================

  /**
   * Sheet number (e.g., "A-101", "S-201.1", "M-401")
   * Industry-standard format: {Discipline}-{Number}[.{Sub}]
   */
  @Column({ type: 'varchar', length: 50 })
  number!: string;

  /**
   * Drawing title (e.g., "First Floor Plan", "Building Section A-A")
   */
  @Column({ type: 'varchar', length: 255 })
  title!: string;

  /**
   * Drawing discipline/trade
   */
  @Column({
    type: 'enum',
    enum: DrawingDiscipline,
    default: DrawingDiscipline.OTHER,
  })
  discipline!: DrawingDiscipline;

  /**
   * Drawing type/category
   */
  @Column({
    type: 'enum',
    enum: DrawingType,
    default: DrawingType.OTHER,
  })
  drawingType!: DrawingType;

  // ==================== SHEET INFORMATION ====================

  /**
   * Sheet size (e.g., "ARCH D", "24x36", "A1")
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  sheetSize!: string | null;

  /**
   * Page/sheet number for ordering in set
   */
  @Column({ type: 'int', nullable: true })
  pageNumber!: number | null;

  // ==================== REVISION TRACKING ====================

  /**
   * Current revision marker (e.g., "A", "1", "Rev 2")
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  currentRevision!: string | null;

  /**
   * Date of current revision
   */
  @Column({ type: 'date', nullable: true })
  revisionDate!: Date | null;

  /**
   * Complete revision history
   * Array of revision objects with date, description, and cloud locations
   */
  @Column({ type: 'jsonb', default: [] })
  revisionHistory!: Array<{
    revision: string;
    date: string;
    description: string;
    cloudLocations?: string[];
  }>;

  // ==================== LOCATION REFERENCE ====================

  /**
   * Grid reference on site plan (e.g., "A1-B3")
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  gridReference!: string | null;

  /**
   * Building area/wing (e.g., "Wing A", "Level 2")
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  area!: string | null;

  /**
   * Zone reference
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  zone!: string | null;

  // ==================== CROSS-REFERENCES ====================

  /**
   * Drawings this drawing references
   * Array of reference objects with drawing number and type
   */
  @Column({ type: 'jsonb', default: [] })
  referencedDrawings!: Array<{
    drawingId?: string;
    drawingNumber: string;
    referenceType: string; // 'detail', 'section', 'elevation', 'plan'
    callout?: string;
  }>;

  /**
   * Drawings that reference this drawing
   * Maintained for quick reverse lookup
   */
  @Column({ type: 'jsonb', default: [] })
  referencedBy!: Array<{
    drawingId?: string;
    drawingNumber: string;
    referenceType: string;
    callout?: string;
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

  // ==================== AUDIT FIELDS ====================

  /**
   * When drawing record was created
   */
  @CreateDateColumn()
  createdAt!: Date;

  /**
   * When drawing record was last updated
   */
  @UpdateDateColumn()
  updatedAt!: Date;
}
