import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
  DeleteDateColumn,
  RelationId,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import {
  DailyReportStatus,
  WeatherCondition,
  WorkImpact,
} from '../enums/daily-report.enum';
import { DailyManpower } from './daily-manpower.entity';
import { DailyEquipment } from './daily-equipment.entity';
import { DailyWork } from './daily-work.entity';
import { DailyMaterial } from './daily-material.entity';
import { DailyInspection } from './daily-inspection.entity';
import { DailyIncident } from './daily-incident.entity';
import { DailyVisitor } from './daily-visitor.entity';
import { DailyDelay } from './daily-delay.entity';

/**
 * Daily Report Entity
 * Main entity for construction daily reports
 * Captures comprehensive daily site information including weather, manpower, equipment,
 * work performed, materials, inspections, incidents, visitors, and delays
 */
@Entity('daily_reports')
@Index(['projectId', 'reportDate'], { unique: true, where: '"deletedAt" IS NULL' })
@Index(['projectId', 'status'])
@Index(['projectId', 'reportDate'])
@Index(['status'])
@Index(['createdById'])
export class DailyReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Project Relationship
  @Column({ type: 'uuid', name: 'projectId' })
  projectId: string;

  @ManyToOne(() => Project, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  // Report Date (unique per project)
  @Column({ type: 'date', name: 'reportDate' })
  reportDate: Date;

  // Status
  @Column({
    type: 'enum',
    enum: DailyReportStatus,
    default: DailyReportStatus.DRAFT,
  })
  status: DailyReportStatus;

  // ========================================
  // Weather Information
  // ========================================
  @Column({
    type: 'enum',
    enum: WeatherCondition,
    name: 'weatherConditionAm',
    nullable: true,
  })
  weatherConditionAm: WeatherCondition | null;

  @Column({
    type: 'enum',
    enum: WeatherCondition,
    name: 'weatherConditionPm',
    nullable: true,
  })
  weatherConditionPm: WeatherCondition | null;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'temperatureHigh',
    nullable: true,
  })
  temperatureHigh: number | null;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'temperatureLow',
    nullable: true,
  })
  temperatureLow: number | null;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'precipitationInches',
    nullable: true,
  })
  precipitationInches: number | null;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'windSpeedMph',
    nullable: true,
  })
  windSpeedMph: number | null;

  @Column({ type: 'int', nullable: true })
  humidity: number | null;

  @Column({
    type: 'enum',
    enum: WorkImpact,
    name: 'weatherImpact',
    default: WorkImpact.NONE,
  })
  weatherImpact: WorkImpact;

  @Column({ type: 'text', name: 'weatherNotes', nullable: true })
  weatherNotes: string | null;

  @Column({ type: 'varchar', name: 'weatherApiSource', nullable: true })
  weatherApiSource: string | null;

  // ========================================
  // Work Summary
  // ========================================
  @Column({ type: 'text', name: 'workSummary', nullable: true })
  workSummary: string | null;

  @Column({ type: 'text', name: 'generalNotes', nullable: true })
  generalNotes: string | null;

  @Column({ type: 'text', name: 'tomorrowPlan', nullable: true })
  tomorrowPlan: string | null;

  // ========================================
  // Totals (calculated/cached)
  // ========================================
  @Column({ type: 'int', name: 'totalWorkers', default: 0 })
  totalWorkers: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'totalManHours',
    default: 0,
  })
  totalManHours: number;

  // ========================================
  // Signature
  // ========================================
  @Column({ type: 'text', name: 'signatureData', nullable: true })
  signatureData: string | null;

  @Column({
    type: 'timestamp with time zone',
    name: 'signedAt',
    nullable: true,
  })
  signedAt: Date | null;

  @Column({ type: 'varchar', name: 'signedIp', nullable: true })
  signedIp: string | null;

  // ========================================
  // Submission Tracking
  // ========================================
  @Column({
    type: 'timestamp with time zone',
    name: 'submittedAt',
    nullable: true,
  })
  submittedAt: Date | null;

  @Column({
    type: 'timestamp with time zone',
    name: 'approvedAt',
    nullable: true,
  })
  approvedAt: Date | null;

  @Column({ type: 'uuid', name: 'approvedById', nullable: true })
  approvedById: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approvedById' })
  approvedBy: User | null;

  @Column({ type: 'text', name: 'rejectionReason', nullable: true })
  rejectionReason: string | null;

  // ========================================
  // Audit Fields
  // ========================================
  @Column({ type: 'uuid', name: 'createdById' })
  createdById: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ type: 'uuid', name: 'updatedById', nullable: true })
  updatedById: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updatedById' })
  updatedBy: User | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone' })
  deletedAt: Date | null;

  // ========================================
  // Relationships to Child Entities
  // ========================================
  @OneToMany(() => DailyManpower, (manpower) => manpower.dailyReport, {
    cascade: true,
  })
  manpower: DailyManpower[];

  @OneToMany(() => DailyEquipment, (equipment) => equipment.dailyReport, {
    cascade: true,
  })
  equipment: DailyEquipment[];

  @OneToMany(() => DailyWork, (work) => work.dailyReport, { cascade: true })
  workLogs: DailyWork[];

  @OneToMany(() => DailyMaterial, (material) => material.dailyReport, {
    cascade: true,
  })
  materials: DailyMaterial[];

  @OneToMany(() => DailyInspection, (inspection) => inspection.dailyReport, {
    cascade: true,
  })
  inspections: DailyInspection[];

  @OneToMany(() => DailyIncident, (incident) => incident.dailyReport, {
    cascade: true,
  })
  incidents: DailyIncident[];

  @OneToMany(() => DailyVisitor, (visitor) => visitor.dailyReport, {
    cascade: true,
  })
  visitors: DailyVisitor[];

  @OneToMany(() => DailyDelay, (delay) => delay.dailyReport, { cascade: true })
  delays: DailyDelay[];
}
