import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
  RelationId,
} from 'typeorm';
import { SubmittalStatus } from '../enums/submittal.enums';
import { Submittal } from './submittal.entity';
import { User } from '../../users/entities/user.entity';

export enum SubmittalItemType {
  DOCUMENT = 'DOCUMENT',
  DRAWING = 'DRAWING',
  SAMPLE = 'SAMPLE',
  CATALOG_CUT = 'CATALOG_CUT',
  CALCULATION = 'CALCULATION',
  CERTIFICATE = 'CERTIFICATE',
  WARRANTY = 'WARRANTY',
  TEST_REPORT = 'TEST_REPORT',
  PHOTO = 'PHOTO',
  OTHER = 'OTHER',
}

@Entity('submittal_items')
// Note: Indexes defined in migration
export class SubmittalItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Submittal, (submittal) => submittal.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submittalId' })
  submittal: Submittal;

  @RelationId((item: SubmittalItem) => item.submittal)
  submittalId: string;

  // Item number within submittal (1, 2, 3...)
  @Column({ type: 'int' })
  itemNumber: number;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({
    type: 'enum',
    enum: SubmittalItemType,
    default: SubmittalItemType.DOCUMENT,
  })
  itemType: SubmittalItemType;

  // Item-level status (can differ from submittal status)
  @Column({
    type: 'enum',
    enum: SubmittalStatus,
    enumName: 'submittal_status',
    default: 'NOT_STARTED',
  })
  status: SubmittalStatus;

  // Manufacturer/vendor info
  @Column({ type: 'varchar', length: 255, nullable: true })
  manufacturer: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  modelNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  productName: string;

  // Quantity (if applicable)
  @Column({ type: 'int', nullable: true })
  quantity: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  unitOfMeasure: string;

  // Document attachments (IDs from document management)
  @Column({ type: 'uuid', array: true, default: [] })
  attachmentIds: string[];

  // Specific page/sheet references within attachments
  @Column({ type: 'varchar', length: 100, nullable: true })
  pageReferences: string;

  // Item-level approval
  @Column({ type: 'varchar', length: 50, nullable: true })
  approvalStamp: string;

  @Column({ type: 'text', nullable: true })
  approvalNotes: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approvedById' })
  approvedBy: User;

  @RelationId((item: SubmittalItem) => item.approvedBy)
  approvedById: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  approvedAt: Date;

  // Revision this item belongs to
  @Column({ type: 'int', default: 0 })
  revisionNumber: number;

  // Substitution tracking
  @Column({ type: 'boolean', default: false })
  isSubstitution: boolean;

  @Column({ type: 'text', nullable: true })
  substitutionJustification: string;

  // Sort order
  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
