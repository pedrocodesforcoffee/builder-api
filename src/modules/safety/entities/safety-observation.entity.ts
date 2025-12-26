import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { SafetyObservationAction } from './safety-observation-action.entity';
import {
  ObservationSeverity,
  ObservationStatus,
  SafetyTopicCategory,
} from '../enums/safety.enum';

/**
 * Safety Observation Entity
 * Tracks safety observations, hazards, and near-misses identified on site
 */
@Entity('safety_observations')
@Index(['projectId', 'observationDate'])
@Index(['severity'])
@Index(['status'])
@Index(['observedById'])
export class SafetyObservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  projectId: string;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: ObservationSeverity,
  })
  severity: ObservationSeverity;

  @Column({
    type: 'enum',
    enum: SafetyTopicCategory,
    nullable: true,
  })
  category: SafetyTopicCategory | null;

  @Column({
    type: 'enum',
    enum: ObservationStatus,
    default: ObservationStatus.OPEN,
  })
  status: ObservationStatus;

  @Column({ type: 'date' })
  observationDate: Date;

  @Column({ type: 'time', nullable: true })
  observationTime: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  location: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number | null;

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
  immediateActionTaken: string | null;

  @Column({ type: 'boolean', default: false })
  workStopped: boolean;

  @Column({ type: 'boolean', default: false })
  requiresFollowUp: boolean;

  @Column({ type: 'date', nullable: true })
  targetResolutionDate: Date | null;

  @Column({ type: 'date', nullable: true })
  actualResolutionDate: Date | null;

  @Column({ type: 'text', nullable: true })
  rootCause: string | null;

  @Column({ type: 'text', nullable: true })
  resolutionNotes: string | null;

  @Column({ type: 'uuid' })
  observedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'observedById' })
  observedBy: User;

  @Column({ type: 'uuid', nullable: true })
  assignedToId: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assignedToId' })
  assignedTo: User | null;

  @Column({ type: 'uuid', nullable: true })
  verifiedById: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'verifiedById' })
  verifiedBy: User | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  verifiedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  closedById: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'closedById' })
  closedBy: User | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  closedAt: Date | null;

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
  @OneToMany(() => SafetyObservationAction, (action) => action.observation, {
    cascade: true,
  })
  actions: SafetyObservationAction[];

  // Helper methods
  canEdit(): boolean {
    return this.status !== ObservationStatus.CLOSED && this.status !== ObservationStatus.CANCELLED;
  }

  canResolve(): boolean {
    return this.status === ObservationStatus.IN_PROGRESS;
  }

  canVerify(): boolean {
    return this.status === ObservationStatus.RESOLVED;
  }

  canClose(): boolean {
    return this.status === ObservationStatus.VERIFIED;
  }

  isOverdue(): boolean {
    if (!this.targetResolutionDate || this.status === ObservationStatus.CLOSED) {
      return false;
    }
    return new Date() > new Date(this.targetResolutionDate);
  }
}
