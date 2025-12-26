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
import { InspectionResult } from '../enums/daily-report.enum';

/**
 * Daily Inspection Entity
 * Tracks inspections conducted on site each day
 */
@Entity('daily_inspections')
export class DailyInspection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'dailyReportId' })
  dailyReportId: string;

  @ManyToOne(() => DailyReport, (report) => report.inspections, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'dailyReportId' })
  dailyReport: DailyReport;

  @Column({ type: 'varchar', length: 255, name: 'inspectionType' })
  inspectionType: string;

  @Column({ type: 'varchar', length: 255, name: 'inspectorName' })
  inspectorName: string;

  @Column({ type: 'varchar', length: 255, name: 'inspectorCompany', nullable: true })
  inspectorCompany: string | null;

  @Column({ type: 'varchar', length: 255, name: 'inspectionAgency', nullable: true })
  inspectionAgency: string | null;

  @Column({
    type: 'enum',
    enum: InspectionResult,
    nullable: true,
  })
  result: InspectionResult | null;

  @Column({ type: 'varchar', length: 100, name: 'permitNumber', nullable: true })
  permitNumber: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'text', name: 'failedItems', nullable: true })
  failedItems: string | null;

  @Column({ type: 'date', name: 'reinspectionDate', nullable: true })
  reinspectionDate: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
