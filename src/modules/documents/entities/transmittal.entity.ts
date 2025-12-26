import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TransmittalStatus, RecipientStatus } from '../enums/permission.enums';

@Entity('transmittals')
@Index(['projectId'])
@Index(['transmittalNumber'])
export class Transmittal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  projectId!: string;

  @Column({ type: 'varchar', length: 20 })
  transmittalNumber!: string;

  @Column({ type: 'varchar', length: 255 })
  subject!: string;

  @Column({ type: 'text', nullable: true })
  message!: string | null;

  @Column({
    type: 'enum',
    enum: TransmittalStatus,
    default: TransmittalStatus.DRAFT,
  })
  status!: TransmittalStatus;

  @Column({ default: false })
  responseRequired!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  responseDueDate!: Date | null;

  @Column({ default: false })
  watermarkDownloads!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt!: Date | null;

  @Column({ default: true })
  includeCoverSheet!: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  coverSheetTemplate!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  coverSheetS3Key!: string | null;

  @OneToMany(() => TransmittalDocument, td => td.transmittal)
  documents!: TransmittalDocument[];

  @OneToMany(() => TransmittalRecipient, tr => tr.transmittal)
  recipients!: TransmittalRecipient[];

  @Column('uuid')
  sentById!: string;

  @Column({ type: 'timestamp', nullable: true })
  sentAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

@Entity('transmittal_documents')
@Index(['transmittalId'])
export class TransmittalDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  transmittalId!: string;

  @ManyToOne(() => Transmittal, t => t.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transmittalId' })
  transmittal!: Transmittal;

  @Column('uuid')
  documentId!: string;

  @Column('uuid')
  versionId!: string;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;
}

@Entity('transmittal_recipients')
@Index(['transmittalId'])
export class TransmittalRecipient {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  transmittalId!: string;

  @ManyToOne(() => Transmittal, t => t.recipients, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transmittalId' })
  transmittal!: Transmittal;

  @Column('uuid', { nullable: true })
  userId!: string | null;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  company!: string | null;

  @Column({
    type: 'enum',
    enum: RecipientStatus,
    default: RecipientStatus.PENDING,
  })
  status!: RecipientStatus;

  @Column('uuid', { nullable: true })
  shareLinkId!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  viewedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  downloadedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  acknowledgedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  acknowledgmentComments!: string | null;

  @Column({ type: 'text', nullable: true })
  acknowledgmentSignature!: string | null;

  @Column({ type: 'text', nullable: true })
  errorMessage!: string | null;
}