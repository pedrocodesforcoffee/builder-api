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
import {
  IncidentType,
  IncidentSeverity,
} from '../enums/daily-report.enum';

/**
 * Daily Incident Entity
 * Tracks safety and security incidents on site each day
 */
@Entity('daily_incidents')
export class DailyIncident {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'dailyReportId' })
  dailyReportId: string;

  @ManyToOne(() => DailyReport, (report) => report.incidents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'dailyReportId' })
  dailyReport: DailyReport;

  @Column({
    type: 'enum',
    enum: IncidentType,
  })
  type: IncidentType;

  @Column({
    type: 'enum',
    enum: IncidentSeverity,
  })
  severity: IncidentSeverity;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'time', name: 'incidentTime', nullable: true })
  incidentTime: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string | null;

  @Column({ type: 'varchar', length: 255, name: 'injuredParty', nullable: true })
  injuredParty: string | null;

  @Column({ type: 'text', name: 'injuryDescription', nullable: true })
  injuryDescription: string | null;

  @Column({ type: 'text', name: 'medicalTreatment', nullable: true })
  medicalTreatment: string | null;

  @Column({ type: 'boolean', name: 'oshaRecordable', default: false })
  oshaRecordable: boolean;

  @Column({ type: 'boolean', name: 'lostTime', default: false })
  lostTime: boolean;

  @Column({ type: 'text', nullable: true })
  witnesses: string | null;

  @Column({ type: 'text', name: 'immediateAction', nullable: true })
  immediateAction: string | null;

  @Column({ type: 'varchar', length: 255, name: 'reportedTo', nullable: true })
  reportedTo: string | null;

  @Column({ type: 'uuid', array: true, name: 'photoIds', default: [] })
  photoIds: string[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
