import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { DocumentAction } from '../enums/permission.enums';

@Entity('document_access_logs')
@Index(['documentId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['action', 'createdAt'])
export class DocumentAccessLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  documentId!: string;

  @Column('uuid', { nullable: true })
  versionId!: string | null;

  @Column({
    type: 'enum',
    enum: DocumentAction,
  })
  action!: DocumentAction;

  @Column('uuid', { nullable: true })
  userId!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  externalEmail!: string | null;

  @Column('uuid', { nullable: true })
  shareLinkId!: string | null;

  @Column('uuid', { nullable: true })
  transmittalId!: string | null;

  @Column({ type: 'varchar', length: 45 })
  ipAddress!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  geoLocation!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  details!: {
    watermarkApplied?: boolean;
    downloadFormat?: string;
    success: boolean;
    errorMessage?: string;
    duration?: number;
  } | null;

  @CreateDateColumn()
  @Index()
  createdAt!: Date;
}
