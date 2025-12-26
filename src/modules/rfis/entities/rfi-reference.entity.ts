import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { Rfi } from './rfi.entity';
import { User } from '../../users/entities/user.entity';

export enum RfiReferenceType {
  DRAWING = 'DRAWING',
  SPECIFICATION = 'SPECIFICATION',
  SUBMITTAL = 'SUBMITTAL',
  RFI = 'RFI',
  CHANGE_ORDER = 'CHANGE_ORDER',
  DOCUMENT = 'DOCUMENT',
  PHOTO = 'PHOTO',
  MARKUP = 'MARKUP',
}

@Entity('rfi_references')
@Index(['rfiId', 'referenceType'])
@Index(['referenceId', 'referenceType'])
export class RfiReference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  rfiId: string;

  @ManyToOne(() => Rfi, (rfi) => rfi.references, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rfiId' })
  rfi: Rfi;

  @Column({
    type: 'enum',
    enum: RfiReferenceType,
  })
  referenceType: RfiReferenceType;

  // ID of the referenced entity
  @Column({ type: 'uuid' })
  referenceId: string;

  // Human-readable reference (e.g., "A-101", "Spec 03 30 00")
  @Column({ type: 'varchar', length: 100 })
  referenceNumber: string;

  // Description or title of referenced item
  @Column({ type: 'varchar', length: 255, nullable: true })
  referenceTitle: string;

  // Specific location within the reference (page, detail, callout)
  @Column({ type: 'varchar', length: 100, nullable: true })
  referenceLocation: string;

  // Callout/markup data for drawing references
  @Column({ type: 'jsonb', nullable: true })
  calloutData: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    shape?: 'rectangle' | 'circle' | 'arrow' | 'cloud';
    color?: string;
    note?: string;
  };

  // Notes about this reference
  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
