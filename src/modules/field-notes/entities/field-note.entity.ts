import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { FieldNoteAttachment } from './field-note-attachment.entity';
import { FieldNoteLink } from './field-note-link.entity';
import { FieldNoteComment } from './field-note-comment.entity';
import { FieldNoteHistory } from './field-note-history.entity';
import { FieldNoteTemplate } from './field-note-template.entity';
import {
  FieldNoteType,
  FieldNoteVisibility,
  FieldNotePriority,
  FieldNoteStatus,
  WeatherCondition,
} from '../enums/field-note.enum';

/**
 * Field Note entity for capturing real-time site observations
 * Supports rich attachments, GPS tagging, linking to other entities,
 * comments, and offline sync capabilities
 */
@Entity('field_notes')
@Index(['projectId', 'noteDate'])
@Index(['projectId', 'noteType'])
@Index(['projectId', 'status'])
@Index(['projectId', 'visibility'])
@Index(['createdById'])
@Index(['assignedToId'])
@Index(['clientId'], { unique: true, where: '"clientId" IS NOT NULL' })
export class FieldNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Auto-generated note number (e.g., PROJECT-FN-0001)
   */
  @Column({ type: 'varchar', length: 50, unique: true })
  @Index('IDX_field_notes_number')
  number: string;

  /**
   * Type of field note (general, site conditions, weather, etc.)
   */
  @Column({ type: 'enum', enum: FieldNoteType })
  noteType: FieldNoteType;

  /**
   * Title/subject of the field note
   */
  @Column({ type: 'varchar', length: 255 })
  title: string;

  /**
   * Detailed description/content
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Date of the observation/note
   */
  @Column({ type: 'date' })
  noteDate: Date;

  /**
   * Time of the observation (stored separately for flexibility)
   */
  @Column({ type: 'time', nullable: true })
  noteTime: string | null;

  /**
   * Visibility level of the note
   */
  @Column({
    type: 'enum',
    enum: FieldNoteVisibility,
    default: FieldNoteVisibility.TEAM,
  })
  visibility: FieldNoteVisibility;

  /**
   * Priority level (for follow-up items)
   */
  @Column({
    type: 'enum',
    enum: FieldNotePriority,
    default: FieldNotePriority.NORMAL,
  })
  priority: FieldNotePriority;

  /**
   * Status of the field note
   */
  @Column({
    type: 'enum',
    enum: FieldNoteStatus,
    default: FieldNoteStatus.ACTIVE,
  })
  status: FieldNoteStatus;

  /**
   * GPS latitude (decimal degrees, 7 decimal places = ~1cm accuracy)
   */
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number | null;

  /**
   * GPS longitude (decimal degrees, 7 decimal places = ~1cm accuracy)
   */
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number | null;

  /**
   * GPS accuracy in meters
   */
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  gpsAccuracy: number | null;

  /**
   * Location description (e.g., "North wing, 3rd floor")
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  locationDescription: string | null;

  /**
   * Tags for organization and searching
   */
  @Column('simple-array', { default: '' })
  @Index('IDX_field_notes_tags', { synchronize: false }) // GIN index created in migration
  tags: string[];

  /**
   * User IDs mentioned in the note (for notifications)
   */
  @Column({ type: 'uuid', array: true, default: [] })
  mentionedUserIds: string[];

  /**
   * Weather conditions (for weather-related notes)
   */
  @Column({ type: 'jsonb', nullable: true })
  weatherData: {
    condition?: WeatherCondition;
    temperature?: number;
    temperatureUnit?: 'F' | 'C';
    windSpeed?: number;
    windSpeedUnit?: 'mph' | 'kmh';
    precipitation?: number;
    humidity?: number;
    notes?: string;
  } | null;

  /**
   * Template ID if created from template
   */
  @Column({ type: 'uuid', nullable: true })
  templateId: string | null;

  /**
   * Template data if created from template (stores filled-in field values)
   */
  @Column({ type: 'jsonb', nullable: true })
  templateData: Record<string, any> | null;

  /**
   * Follow-up required flag
   */
  @Column({ type: 'boolean', default: false })
  followUpRequired: boolean;

  /**
   * Follow-up due date
   */
  @Column({ type: 'date', nullable: true })
  followUpDueDate: Date | null;

  /**
   * User assigned to follow up
   */
  @Column({ type: 'uuid', nullable: true })
  assignedToId: string | null;

  /**
   * Follow-up completion date
   */
  @Column({ type: 'timestamp with time zone', nullable: true })
  followUpCompletedAt: Date | null;

  /**
   * Follow-up completion notes
   */
  @Column({ type: 'text', nullable: true })
  followUpNotes: string | null;

  /**
   * Offline sync: Client-generated UUID for deduplication
   */
  @Column({ type: 'uuid', nullable: true })
  clientId: string | null;

  /**
   * Offline sync: When the note was synced to server
   */
  @Column({ type: 'timestamp with time zone', nullable: true })
  syncedAt: Date | null;

  /**
   * Offline sync: Last modified timestamp (for conflict resolution)
   */
  @Column({ type: 'timestamp with time zone', nullable: true })
  lastModifiedAt: Date | null;

  /**
   * Offline sync: Conflict data if sync conflict occurred
   */
  @Column({ type: 'jsonb', nullable: true })
  conflictData: {
    serverVersion?: any;
    clientVersion?: any;
    conflictedAt?: string;
    resolvedAt?: string;
    resolvedBy?: string;
  } | null;

  /**
   * Additional metadata (extensible)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  /**
   * Soft delete flag
   */
  @Column({ type: 'boolean', default: false })
  isDeleted: boolean;

  /**
   * Deleted at timestamp
   */
  @Column({ type: 'timestamp with time zone', nullable: true })
  deletedAt: Date | null;

  /**
   * Deleted by user ID
   */
  @Column({ type: 'uuid', nullable: true })
  deletedById: string | null;

  // Relations

  @Column({ type: 'uuid' })
  projectId: string;

  @ManyToOne(() => Project, { nullable: false })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @ManyToOne(() => FieldNoteTemplate, { nullable: true })
  @JoinColumn({ name: 'templateId' })
  template: FieldNoteTemplate | null;

  @Column({ type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignedToId' })
  assignedTo: User | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'deletedById' })
  deletedBy: User | null;

  @OneToMany(() => FieldNoteAttachment, (attachment) => attachment.fieldNote, {
    cascade: true,
  })
  attachments: FieldNoteAttachment[];

  @OneToMany(() => FieldNoteLink, (link) => link.fieldNote, { cascade: true })
  links: FieldNoteLink[];

  @OneToMany(() => FieldNoteComment, (comment) => comment.fieldNote, {
    cascade: true,
  })
  comments: FieldNoteComment[];

  @OneToMany(() => FieldNoteHistory, (history) => history.fieldNote, {
    cascade: true,
  })
  history: FieldNoteHistory[];

  @CreateDateColumn({
    name: 'createdAt',
    type: 'timestamp with time zone',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updatedAt',
    type: 'timestamp with time zone',
  })
  updatedAt: Date;

  // Helper methods

  /**
   * Check if note can be edited
   */
  canEdit(): boolean {
    return !this.isDeleted && this.status !== FieldNoteStatus.ARCHIVED;
  }

  /**
   * Check if note is overdue for follow-up
   */
  isFollowUpOverdue(): boolean {
    if (!this.followUpRequired || !this.followUpDueDate) {
      return false;
    }
    return new Date() > new Date(this.followUpDueDate);
  }

  /**
   * Check if note has GPS coordinates
   */
  hasLocation(): boolean {
    return this.latitude !== null && this.longitude !== null;
  }

  /**
   * Get full location string
   */
  getFullLocation(): string {
    const parts: string[] = [];
    if (this.hasLocation()) {
      parts.push(`${this.latitude}, ${this.longitude}`);
    }
    if (this.locationDescription) {
      parts.push(this.locationDescription);
    }
    return parts.join(' - ') || 'No location';
  }
}
