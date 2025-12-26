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
import { DelayType, WorkImpact } from '../enums/daily-report.enum';

/**
 * Daily Delay Entity
 * Tracks delays and their impacts on site each day
 */
@Entity('daily_delays')
export class DailyDelay {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'dailyReportId' })
  dailyReportId: string;

  @ManyToOne(() => DailyReport, (report) => report.delays, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'dailyReportId' })
  dailyReport: DailyReport;

  @Column({
    type: 'enum',
    enum: DelayType,
  })
  type: DelayType;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 6, scale: 2, name: 'hoursLost' })
  hoursLost: number;

  @Column({
    type: 'enum',
    enum: WorkImpact,
  })
  impact: WorkImpact;

  @Column({
    type: 'varchar',
    array: true,
    name: 'affectedTrades',
    default: [],
  })
  affectedTrades: string[];

  @Column({ type: 'varchar', length: 255, name: 'responsibleParty', nullable: true })
  responsibleParty: string | null;

  @Column({ type: 'boolean', name: 'potentialClaim', default: false })
  potentialClaim: boolean;

  @Column({ type: 'text', nullable: true })
  mitigation: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
