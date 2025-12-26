import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ShareLinkStatus } from '../enums/permission.enums';

@Entity('share_links')
@Index(['shortCode'], { unique: true })
@Index(['documentId'])
@Index(['status'])
export class ShareLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  documentId!: string;

  @Column({ type: 'varchar', length: 32 })
  shortCode!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordHash!: string | null;

  @Column({ default: false })
  requireEmail!: boolean;

  @Column({ type: 'simple-array', nullable: true })
  allowedEmails!: string[] | null;

  @Column({ type: 'int', nullable: true })
  maxDownloads!: number | null;

  @Column({ type: 'int', default: 0 })
  downloadCount!: number;

  @Column({ type: 'simple-array', nullable: true })
  allowedIpRanges!: string[] | null;

  @Column({ default: true })
  allowDownload!: boolean;

  @Column({ default: false })
  allowPrint!: boolean;

  @Column({ default: true })
  watermarkEnabled!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  watermarkSettings!: {
    text?: string;
    includeRecipientEmail?: boolean;
    includeAccessDate?: boolean;
    position?: string;
    opacity?: number;
  } | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  recipientName!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  recipientCompany!: string | null;

  @Column({ type: 'text', nullable: true })
  purpose!: string | null;

  @Column({ default: false })
  notifyOnAccess!: boolean;

  @Column({
    type: 'enum',
    enum: ShareLinkStatus,
    default: ShareLinkStatus.ACTIVE,
  })
  status!: ShareLinkStatus;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @Column({ type: 'int', default: 0 })
  accessCount!: number;

  @Column({ type: 'timestamp', nullable: true })
  lastAccessedAt!: Date | null;

  @Column('uuid')
  createdById!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt!: Date | null;

  @Column('uuid', { nullable: true })
  revokedById!: string | null;
}
