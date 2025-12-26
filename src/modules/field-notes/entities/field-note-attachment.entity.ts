import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { FieldNote } from './field-note.entity';
import { User } from '../../users/entities/user.entity';
import { AttachmentType } from '../enums/field-note.enum';

/**
 * Field Note Attachment entity for photos, videos, audio, documents
 * Supports S3 storage, thumbnails, GPS tagging, and photo markup/annotations
 */
@Entity('field_note_attachments')
@Index(['fieldNoteId', 'displayOrder'])
@Index(['attachmentType'])
export class FieldNoteAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Type of attachment
   */
  @Column({ type: 'enum', enum: AttachmentType })
  attachmentType: AttachmentType;

  /**
   * Original filename
   */
  @Column({ type: 'varchar', length: 500 })
  filename: string;

  /**
   * File URL (full URL to access the file)
   */
  @Column({ type: 'varchar', length: 1000 })
  url: string;

  /**
   * Thumbnail URL (for images/videos)
   */
  @Column({ type: 'varchar', length: 1000, nullable: true })
  thumbnailUrl: string | null;

  /**
   * File size in bytes
   */
  @Column({ type: 'bigint', nullable: true })
  fileSize: number | null;

  /**
   * MIME type
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  mimeType: string | null;

  /**
   * S3 bucket name
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  s3Bucket: string | null;

  /**
   * S3 object key
   */
  @Column({ type: 'varchar', length: 1000, nullable: true })
  s3Key: string | null;

  /**
   * Caption/description
   */
  @Column({ type: 'text', nullable: true })
  caption: string | null;

  /**
   * Display order (for sorting)
   */
  @Column({ type: 'integer', default: 0 })
  displayOrder: number;

  /**
   * GPS latitude where photo/attachment was captured
   */
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number | null;

  /**
   * GPS longitude where photo/attachment was captured
   */
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number | null;

  /**
   * GPS accuracy in meters
   */
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  gpsAccuracy: number | null;

  /**
   * Timestamp when the photo/attachment was taken
   */
  @Column({ type: 'timestamp with time zone', nullable: true })
  capturedAt: Date | null;

  /**
   * Device information (camera model, phone, etc.)
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  deviceInfo: string | null;

  /**
   * Metadata including dimensions, markup annotations, EXIF data
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    // Image/Video dimensions
    width?: number;
    height?: number;
    duration?: number; // For video/audio in seconds

    // EXIF data
    exif?: {
      make?: string;
      model?: string;
      software?: string;
      dateTime?: string;
      orientation?: number;
      flash?: boolean;
      focalLength?: number;
      exposureTime?: string;
      iso?: number;
    };

    // Photo markup/annotations (arrows, text, highlights, measurements)
    markup?: {
      annotations?: Array<{
        type: 'arrow' | 'text' | 'rectangle' | 'circle' | 'line' | 'freehand' | 'measurement';
        id: string;
        color?: string;
        thickness?: number;
        points?: Array<{ x: number; y: number }>; // Coordinates
        text?: string; // For text annotations
        fontSize?: number;
        measurement?: {
          value: number;
          unit: string;
          startPoint: { x: number; y: number };
          endPoint: { x: number; y: number };
        };
      }>;
    };

    // Voice-to-text transcription (for audio notes)
    transcription?: {
      text: string;
      confidence?: number;
      language?: string;
      transcribedAt?: string;
    };

    // Additional metadata
    [key: string]: any;
  } | null;

  /**
   * Whether this attachment is a cover/featured image
   */
  @Column({ type: 'boolean', default: false })
  isCover: boolean;

  // Relations

  @Column({ type: 'uuid' })
  fieldNoteId: string;

  @ManyToOne(() => FieldNote, (fieldNote) => fieldNote.attachments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'fieldNoteId' })
  fieldNote: FieldNote;

  @Column({ type: 'uuid' })
  uploadedById: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: User;

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
   * Check if attachment is an image
   */
  isImage(): boolean {
    return this.attachmentType === AttachmentType.PHOTO;
  }

  /**
   * Check if attachment is a video
   */
  isVideo(): boolean {
    return this.attachmentType === AttachmentType.VIDEO;
  }

  /**
   * Check if attachment is audio
   */
  isAudio(): boolean {
    return this.attachmentType === AttachmentType.AUDIO;
  }

  /**
   * Check if attachment has GPS coordinates
   */
  hasLocation(): boolean {
    return this.latitude !== null && this.longitude !== null;
  }

  /**
   * Check if attachment has markup annotations
   */
  hasMarkup(): boolean {
    return (
      this.metadata?.markup?.annotations &&
      this.metadata.markup.annotations.length > 0
    );
  }

  /**
   * Get file size in human-readable format
   */
  getFileSizeFormatted(): string {
    if (!this.fileSize) return 'Unknown';

    const units = ['B', 'KB', 'MB', 'GB'];
    let size = this.fileSize;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}
