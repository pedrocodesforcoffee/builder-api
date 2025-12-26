import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { WorkerProfile } from '../../time-attendance/entities/worker-profile.entity';
import { IncidentInvestigation } from './incident-investigation.entity';
import {
  IncidentSeverity,
  IncidentType,
  InjuryType,
  BodyPart,
} from '../enums/safety.enum';

/**
 * Safety Incident Entity
 * Tracks workplace incidents, injuries, illnesses, and near-misses (OSHA recordable)
 */
@Entity('safety_incidents')
@Index(['projectId', 'incidentDate'])
@Index(['severity'])
@Index(['incidentType'])
@Index(['reportedById'])
@Index(['isOshaRecordable'])
export class SafetyIncident {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  incidentNumber: string;

  @Column({ type: 'uuid' })
  projectId: string;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({
    type: 'enum',
    enum: IncidentSeverity,
  })
  severity: IncidentSeverity;

  @Column({
    type: 'enum',
    enum: IncidentType,
  })
  incidentType: IncidentType;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'date' })
  incidentDate: Date;

  @Column({ type: 'time' })
  incidentTime: string;

  @Column({ type: 'varchar', length: 500 })
  location: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number | null;

  @Column({ type: 'uuid', nullable: true })
  injuredWorkerId: string | null;

  @ManyToOne(() => WorkerProfile)
  @JoinColumn({ name: 'injuredWorkerId' })
  injuredWorker: WorkerProfile | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  injuredPersonName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  injuredPersonCompany: string | null;

  @Column({
    type: 'enum',
    enum: InjuryType,
    nullable: true,
  })
  injuryType: InjuryType | null;

  @Column({
    type: 'enum',
    enum: BodyPart,
    nullable: true,
  })
  bodyPartAffected: BodyPart | null;

  @Column({ type: 'text', nullable: true })
  injuryDescription: string | null;

  @Column({ type: 'text', nullable: true })
  treatmentProvided: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  medicalFacility: string | null;

  @Column({ type: 'boolean', default: false })
  hospitalTransport: boolean;

  @Column({ type: 'int', default: 0 })
  daysAwayFromWork: number;

  @Column({ type: 'int', default: 0 })
  daysRestrictedWork: number;

  @Column({ type: 'date', nullable: true })
  returnToWorkDate: Date | null;

  @Column({ type: 'boolean', default: false })
  isOshaRecordable: boolean;

  @Column({ type: 'boolean', default: false })
  isOshaReportable: boolean;

  @Column({ type: 'date', nullable: true })
  oshaReportedDate: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  oshaLogNumber: string | null;

  @Column({ type: 'jsonb', nullable: true })
  witnesses: Array<{
    id: string;
    workerId?: string;
    name: string;
    company?: string;
    contactInfo?: string;
    statement?: string;
  }> | null;

  @Column({ type: 'jsonb', nullable: true })
  photos: Array<{
    id: string;
    url: string;
    caption: string | null;
    timestamp: string;
  }> | null;

  @Column({ type: 'jsonb', nullable: true })
  attachments: Array<{
    id: string;
    filename: string;
    url: string;
    size: number;
    mimeType: string;
  }> | null;

  @Column({ type: 'text', nullable: true })
  immediateActions: string | null;

  @Column({ type: 'boolean', default: false })
  workStopped: boolean;

  @Column({ type: 'text', nullable: true })
  equipmentInvolved: string | null;

  @Column({ type: 'text', nullable: true })
  weatherConditions: string | null;

  @Column({ type: 'text', nullable: true })
  additionalNotes: string | null;

  @Column({ type: 'uuid' })
  reportedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reportedById' })
  reportedBy: User;

  @Column({ type: 'timestamp with time zone' })
  reportedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  supervisorNotifiedId: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'supervisorNotifiedId' })
  supervisorNotified: User | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  supervisorNotifiedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @Column({ type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  // Relations
  @OneToOne(() => IncidentInvestigation, (investigation) => investigation.incident, {
    cascade: true,
  })
  investigation: IncidentInvestigation;

  // Helper methods
  requiresInvestigation(): boolean {
    return (
      this.severity === IncidentSeverity.FATALITY ||
      this.severity === IncidentSeverity.CATASTROPHIC ||
      this.severity === IncidentSeverity.SERIOUS ||
      this.isOshaRecordable
    );
  }

  requiresOshaReporting(): boolean {
    return (
      this.severity === IncidentSeverity.FATALITY ||
      this.severity === IncidentSeverity.CATASTROPHIC ||
      (this.hospitalTransport && this.severity === IncidentSeverity.SERIOUS)
    );
  }
}
