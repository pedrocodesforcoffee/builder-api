import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { FieldNote } from './field-note.entity';
import { User } from '../../users/entities/user.entity';
import { LinkedEntityType } from '../enums/field-note.enum';

/**
 * Field Note Link entity for connecting notes to other entities
 * Supports linking to RFIs, submittals, daily reports, punch items, etc.
 */
@Entity('field_note_links')
@Index(['fieldNoteId'])
@Index(['linkedEntityType', 'linkedEntityId'])
@Index(['fieldNoteId', 'linkedEntityType'])
export class FieldNoteLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Type of the linked entity
   */
  @Column({ type: 'enum', enum: LinkedEntityType })
  linkedEntityType: LinkedEntityType;

  /**
   * ID of the linked entity
   */
  @Column({ type: 'uuid' })
  linkedEntityId: string;

  /**
   * Optional display name/title of the linked entity
   * (cached for quick display, not source of truth)
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  linkedEntityTitle: string | null;

  /**
   * Optional link description/note about the relationship
   */
  @Column({ type: 'text', nullable: true })
  linkDescription: string | null;

  /**
   * Link metadata (flexible storage for entity-specific data)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    // For RFI links
    rfiNumber?: string;
    rfiStatus?: string;

    // For Submittal links
    submittalNumber?: string;
    submittalStatus?: string;

    // For Daily Report links
    reportDate?: string;

    // For Punch Item links
    punchNumber?: string;
    punchStatus?: string;

    // For Safety links
    observationNumber?: string;
    incidentNumber?: string;
    severity?: string;

    // For Change Order links
    coNumber?: string;
    coStatus?: string;
    coAmount?: number;

    // For Document links
    documentType?: string;
    documentName?: string;

    // For Cost Code links
    costCode?: string;
    costCodeName?: string;

    // For Schedule Task links
    taskName?: string;
    taskStatus?: string;
    dueDate?: string;

    // Additional metadata
    [key: string]: any;
  } | null;

  // Relations

  @Column({ type: 'uuid' })
  fieldNoteId: string;

  @ManyToOne(() => FieldNote, (fieldNote) => fieldNote.links, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'fieldNoteId' })
  fieldNote: FieldNote;

  @Column({ type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn({
    name: 'createdAt',
    type: 'timestamp with time zone',
  })
  createdAt: Date;

  // Helper methods

  /**
   * Get display text for the link
   */
  getDisplayText(): string {
    if (this.linkedEntityTitle) {
      return `${this.linkedEntityType}: ${this.linkedEntityTitle}`;
    }
    return `${this.linkedEntityType}: ${this.linkedEntityId}`;
  }

  /**
   * Check if link is to RFI
   */
  isRFI(): boolean {
    return this.linkedEntityType === LinkedEntityType.RFI;
  }

  /**
   * Check if link is to submittal
   */
  isSubmittal(): boolean {
    return this.linkedEntityType === LinkedEntityType.SUBMITTAL;
  }

  /**
   * Check if link is to daily report
   */
  isDailyReport(): boolean {
    return this.linkedEntityType === LinkedEntityType.DAILY_REPORT;
  }

  /**
   * Check if link is to punch item
   */
  isPunchItem(): boolean {
    return this.linkedEntityType === LinkedEntityType.PUNCH_ITEM;
  }

  /**
   * Check if link is to safety observation
   */
  isSafetyObservation(): boolean {
    return this.linkedEntityType === LinkedEntityType.SAFETY_OBSERVATION;
  }

  /**
   * Check if link is to safety incident
   */
  isSafetyIncident(): boolean {
    return this.linkedEntityType === LinkedEntityType.SAFETY_INCIDENT;
  }
}
