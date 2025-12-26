import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  RelationId,
} from 'typeorm';
import { DailyReport } from './daily-report.entity';

/**
 * Daily Work Entity
 * Tracks work activities performed on site each day
 */
@Entity('daily_work')
export class DailyWork {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'dailyReportId' })
  dailyReportId: string;

  @ManyToOne(() => DailyReport, (report) => report.workLogs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'dailyReportId' })
  dailyReport: DailyReport;

  @Column({ type: 'varchar', length: 255 })
  location: string;

  @Column({ type: 'varchar', length: 50, name: 'specSection', nullable: true })
  specSection: string | null;

  @Column({ type: 'text' })
  activity: string;

  @Column({ type: 'int', name: 'percentComplete', nullable: true })
  percentComplete: number | null;

  @Column({ type: 'text', nullable: true })
  issues: string | null;

  @Column({ type: 'varchar', length: 100, name: 'tradeName', nullable: true })
  tradeName: string | null;

  @Column({ type: 'varchar', length: 50, name: 'costCode', nullable: true })
  costCode: string | null;

  @Column({ type: 'uuid', array: true, name: 'photoIds', default: [] })
  photoIds: string[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
