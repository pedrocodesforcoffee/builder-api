import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SafetyIncident } from './safety-incident.entity';
import { User } from '../../users/entities/user.entity';
import { InvestigationStatus } from '../enums/safety.enum';

/**
 * Incident Investigation Entity
 * Tracks the investigation process for safety incidents
 */
@Entity('incident_investigations')
@Index(['incidentId'], { unique: true })
@Index(['status'])
@Index(['investigatorId'])
export class IncidentInvestigation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  incidentId: string;

  @OneToOne(() => SafetyIncident, (incident) => incident.investigation)
  @JoinColumn({ name: 'incidentId' })
  incident: SafetyIncident;

  @Column({
    type: 'enum',
    enum: InvestigationStatus,
    default: InvestigationStatus.NOT_STARTED,
  })
  status: InvestigationStatus;

  @Column({ type: 'date', nullable: true })
  investigationStartDate: Date | null;

  @Column({ type: 'date', nullable: true })
  investigationCompletedDate: Date | null;

  @Column({ type: 'uuid', nullable: true })
  investigatorId: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'investigatorId' })
  investigator: User | null;

  @Column({ type: 'jsonb', nullable: true })
  investigationTeam: Array<{
    userId: string;
    name: string;
    role: string;
  }> | null;

  @Column({ type: 'text', nullable: true })
  factsSummary: string | null;

  @Column({ type: 'text', nullable: true })
  sequenceOfEvents: string | null;

  @Column({ type: 'jsonb', nullable: true })
  witnessStatements: Array<{
    witnessId: string;
    witnessName: string;
    statement: string;
    timestamp: string;
  }> | null;

  @Column({ type: 'text', nullable: true })
  rootCauseAnalysis: string | null;

  @Column({ type: 'jsonb', nullable: true })
  contributingFactors: Array<{
    category: string;
    description: string;
  }> | null;

  @Column({ type: 'text', nullable: true })
  immediateCorrectiveActions: string | null;

  @Column({ type: 'jsonb', nullable: true })
  longTermCorrectiveActions: Array<{
    id: string;
    description: string;
    assignedToId: string | null;
    assignedToName: string | null;
    dueDate: string | null;
    status: string;
    completedDate: string | null;
  }> | null;

  @Column({ type: 'jsonb', nullable: true })
  recommendations: string[] | null;

  @Column({ type: 'text', nullable: true })
  preventionStrategy: string | null;

  @Column({ type: 'jsonb', nullable: true })
  photos: Array<{
    id: string;
    url: string;
    caption: string | null;
    timestamp: string;
  }> | null;

  @Column({ type: 'jsonb', nullable: true })
  diagrams: Array<{
    id: string;
    url: string;
    caption: string | null;
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
  findingsSummary: string | null;

  @Column({ type: 'text', nullable: true })
  conclusionRecommendations: string | null;

  @Column({ type: 'boolean', default: false })
  trainingRequired: boolean;

  @Column({ type: 'text', nullable: true })
  trainingDescription: string | null;

  @Column({ type: 'boolean', default: false })
  policyChangeRequired: boolean;

  @Column({ type: 'text', nullable: true })
  policyChangeDescription: string | null;

  @Column({ type: 'uuid', nullable: true })
  reviewedById: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reviewedById' })
  reviewedBy: User | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  reviewerComments: string | null;

  @Column({ type: 'uuid', nullable: true })
  approvedById: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'approvedById' })
  approvedBy: User | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  approvedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @Column({ type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  // Helper methods
  canComplete(): boolean {
    return this.status === InvestigationStatus.IN_PROGRESS;
  }

  canReview(): boolean {
    return this.status === InvestigationStatus.PENDING_REVIEW;
  }

  canClose(): boolean {
    return this.status === InvestigationStatus.COMPLETED;
  }
}
