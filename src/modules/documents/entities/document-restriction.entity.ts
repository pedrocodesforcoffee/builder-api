import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('document_restrictions')
@Index(['documentId'], { unique: true })
export class DocumentRestriction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  documentId!: string;

  @Column({ default: false })
  denyDownload!: boolean;

  @Column({ default: false })
  denyPrint!: boolean;

  @Column({ default: false })
  requireWatermark!: boolean;

  @Column({ type: 'simple-array', nullable: true })
  allowedIpRanges!: string[] | null;

  @Column({ default: true })
  inheritFromFolder!: boolean;

  @Column('uuid')
  setById!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
