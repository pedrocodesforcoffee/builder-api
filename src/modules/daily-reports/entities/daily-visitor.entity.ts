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
 * Daily Visitor Entity
 * Tracks site visitors each day for safety and security
 */
@Entity('daily_visitors')
export class DailyVisitor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'dailyReportId' })
  dailyReportId: string;

  @ManyToOne(() => DailyReport, (report) => report.visitors, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'dailyReportId' })
  dailyReport: DailyReport;

  @Column({ type: 'varchar', length: 255, name: 'visitorName' })
  visitorName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  company: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  purpose: string | null;

  @Column({ type: 'time', name: 'timeIn', nullable: true })
  timeIn: string | null;

  @Column({ type: 'time', name: 'timeOut', nullable: true })
  timeOut: string | null;

  @Column({ type: 'boolean', name: 'safetyOrientation', default: false })
  safetyOrientation: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
