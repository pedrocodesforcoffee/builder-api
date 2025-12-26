import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PunchItem } from './punch-item.entity';

/**
 * Photo type for before/after documentation
 */
export enum PhotoType {
  BEFORE = 'BEFORE',
  AFTER = 'AFTER',
  PROGRESS = 'PROGRESS',
  REFERENCE = 'REFERENCE',
}

/**
 * PunchItemPhoto entity - Photo documentation for punch items
 * Supports before/after comparison and progress tracking
 *
 * Photos are stored in S3 with metadata and captions
 */
@Entity('punch_item_photos')
@Index(['punchItemId', 'type'])
@Index(['punchItemId', 'createdAt'])
export class PunchItemPhoto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'punchItemId' })
  punchItemId: string;

  @ManyToOne(() => PunchItem, (punchItem) => punchItem.photos, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'punchItemId' })
  punchItem: PunchItem;

  @Column({
    type: 'enum',
    enum: PhotoType,
    default: PhotoType.BEFORE,
  })
  type: PhotoType;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnailUrl: string;

  @Column({ type: 'varchar', length: 255 })
  fileName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mimeType: string;

  @Column({ type: 'int', nullable: true })
  fileSize: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  caption: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  /**
   * Photo metadata
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    width?: number;
    height?: number;
    orientation?: string;
    location?: {
      latitude?: number;
      longitude?: number;
    };
    device?: string;
    markup?: any; // For photo markup/annotations
  };

  /**
   * S3 storage information
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  s3Bucket: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  s3Key: string;

  /**
   * Audit fields
   */
  @Column({ type: 'uuid', name: 'uploadedById' })
  uploadedById: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: User;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'createdAt' })
  createdAt: Date;
}
