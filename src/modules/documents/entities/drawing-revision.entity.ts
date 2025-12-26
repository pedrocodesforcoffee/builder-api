import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Drawing } from './drawing.entity';

/**
 * Drawing Revision Entity
 *
 * Tracks complete revision history for construction drawings with compliance-grade details.
 * Each revision represents a formal change to the drawing that must be tracked for legal
 * and regulatory purposes.
 *
 * Features:
 * - Revision marker/identifier (A, B, C, 1, 2, 3, etc.)
 * - Issue date and description
 * - Cloud/delta location annotations
 * - Links to related RFIs, ASIs, change orders
 * - Distribution tracking (who received it)
 * - Approval workflow
 * - Complete audit trail
 *
 * Construction Industry Context:
 * - Revisions are formal changes issued during construction
 * - Each revision must be tracked for liability and compliance
 * - Clouds/deltas mark changed areas on drawings
 * - Revisions tied to RFIs, ASIs, addenda for traceability
 *
 * Examples:
 * - Rev A: "Corrected beam sizes per structural engineer"
 * - Rev 1: "Added door 105 per RFI-042"
 * - Rev B: "Updated wall type at grid line 3 per ASI-15"
 *
 * @entity drawing_revisions
 */
@Entity('drawing_revisions')
@Index('IDX_revision_drawing', ['drawingId'])
@Index('IDX_revision_drawing_marker', ['drawingId', 'revisionMarker'], {
  unique: true,
})
@Index('IDX_revision_issued', ['issuedDate'])
@Index('IDX_revision_sequence', ['drawingId', 'sequenceNumber'])
export class DrawingRevision {
  /**
   * Unique identifier (UUID v4)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ==================== DRAWING RELATIONSHIP ====================

  /**
   * Parent drawing ID
   */
  @Column('uuid')
  drawingId!: string;

  /**
   * Parent drawing relation
   */
  @ManyToOne(() => Drawing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'drawingId' })
  drawing!: Drawing;

  // ==================== REVISION IDENTITY ====================

  /**
   * Revision marker/identifier
   * Common formats: "A", "B", "C" or "1", "2", "3" or "Rev 1", "Rev 2"
   */
  @Column({ type: 'varchar', length: 20 })
  revisionMarker!: string;

  /**
   * Sequence number for ordering (1, 2, 3, ...)
   * Auto-incremented within the drawing
   */
  @Column({ type: 'int' })
  sequenceNumber!: number;

  /**
   * Date revision was issued/published
   */
  @Column({ type: 'date' })
  issuedDate!: Date;

  /**
   * Description of what changed in this revision
   * E.g., "Corrected beam sizes at column lines A-C", "Added door 105 per RFI-042"
   */
  @Column({ type: 'text' })
  description!: string;

  // ==================== CHANGE TRACKING ====================

  /**
   * Cloud/delta locations on the drawing
   * Array of location descriptions where changes are marked
   * E.g., ["Grid A1-A3", "Detail 2/A-501", "Room 105"]
   */
  @Column({ type: 'jsonb', default: [] })
  cloudLocations!: string[];

  /**
   * Coordinates of revision clouds/deltas for programmatic highlighting
   * Array of bounding boxes or polygon points
   */
  @Column({ type: 'jsonb', nullable: true })
  cloudCoordinates!: Array<{
    type: 'box' | 'polygon';
    points: Array<{ x: number; y: number }>;
    label?: string;
    page?: number;
  }> | null;

  /**
   * Summary of changes for this revision
   * Structured data about what changed
   */
  @Column({ type: 'jsonb', nullable: true })
  changeSummary!: {
    addedElements?: string[];
    removedElements?: string[];
    modifiedElements?: string[];
    affectedRooms?: string[];
    affectedSystems?: string[];
  } | null;

  // ==================== RELATED DOCUMENTS ====================

  /**
   * Related RFI (Request for Information) IDs
   * Links to RFIs that triggered this revision
   */
  @Column('simple-array', { default: '' })
  relatedRFIs!: string[];

  /**
   * Related ASI (Architect's Supplemental Instruction) IDs
   */
  @Column('simple-array', { default: '' })
  relatedASIs!: string[];

  /**
   * Related change order IDs
   */
  @Column('simple-array', { default: '' })
  relatedChangeOrders!: string[];

  /**
   * Related addendum numbers (for bid/permit sets)
   */
  @Column('simple-array', { default: '' })
  relatedAddenda!: string[];

  /**
   * General notes or additional context
   */
  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  // ==================== DISTRIBUTION ====================

  /**
   * Who this revision was issued to
   * Array of recipient objects (contractors, consultants, owners, etc.)
   */
  @Column({ type: 'jsonb', default: [] })
  issuedTo!: Array<{
    recipientId?: string;
    recipientName: string;
    recipientCompany?: string;
    recipientEmail?: string;
    distributionMethod: 'email' | 'transmittal' | 'shared_link' | 'portal';
    distributedAt: string;
    acknowledged?: boolean;
    acknowledgedAt?: string;
  }>;

  /**
   * Transmittal number if distributed via formal transmittal
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  transmittalNumber!: string | null;

  // ==================== APPROVAL/REVIEW ====================

  /**
   * Revision status
   */
  @Column({
    type: 'varchar',
    length: 50,
    default: 'issued',
  })
  status!: 'draft' | 'issued' | 'superseded' | 'void';

  /**
   * User who approved/issued this revision (UUID)
   */
  @Column({ type: 'uuid', nullable: true })
  approvedById!: string | null;

  /**
   * Name of approver
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  approvedByName!: string | null;

  /**
   * When revision was approved
   */
  @Column({ type: 'timestamp', nullable: true })
  approvedAt!: Date | null;

  /**
   * Reviewer comments/notes
   */
  @Column({ type: 'text', nullable: true })
  reviewComments!: string | null;

  // ==================== METADATA ====================

  /**
   * Custom fields for project-specific data
   */
  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  /**
   * Is this a major revision?
   * Major revisions often require re-submission for permits, bids, etc.
   */
  @Column({ type: 'boolean', default: false })
  isMajorRevision!: boolean;

  /**
   * Reason for revision (category)
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  revisionReason!:
    | 'design_change'
    | 'error_correction'
    | 'coordination'
    | 'code_compliance'
    | 'constructability'
    | 'cost_reduction'
    | 'owner_request'
    | 'rfi_response'
    | 'other'
    | null;

  // ==================== AUDIT FIELDS ====================

  /**
   * When revision record was created
   */
  @CreateDateColumn()
  createdAt!: Date;

  /**
   * User who created the revision record (UUID)
   */
  @Column({ type: 'uuid', nullable: true })
  createdById!: string | null;

  /**
   * Name of creator
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  createdByName!: string | null;
}
