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
 * Daily Manpower Entity
 * Tracks workforce on site each day by trade and company
 */
@Entity('daily_manpower')
export class DailyManpower {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'dailyReportId' })
  dailyReportId: string;

  @ManyToOne(() => DailyReport, (report) => report.manpower, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'dailyReportId' })
  dailyReport: DailyReport;

  @Column({ type: 'varchar', length: 100, name: 'tradeName' })
  tradeName: string;

  @Column({ type: 'varchar', length: 255, name: 'companyName' })
  companyName: string;

  @Column({ type: 'uuid', name: 'subcontractorId', nullable: true })
  subcontractorId: string | null;

  @Column({ type: 'int' })
  headcount: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, name: 'hoursWorked' })
  hoursWorked: number;

  @Column({
    type: 'decimal',
    precision: 6,
    scale: 2,
    name: 'overtimeHours',
    default: 0,
  })
  overtimeHours: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', length: 50, name: 'costCode', nullable: true })
  costCode: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
