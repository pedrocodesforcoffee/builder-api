import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SafetyObservation } from './safety-observation.entity';
import { User } from '../../users/entities/user.entity';
import { ActionStatus } from '../enums/safety.enum';

/**
 * Safety Observation Action Entity
 * Tracks corrective actions for safety observations
 */
@Entity('safety_observation_actions')
@Index(['observationId'])
@Index(['status'])
@Index(['assignedToId'])
@Index(['dueDate'])
export class SafetyObservationAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  observationId: string;

  @ManyToOne(() => SafetyObservation, (observation) => observation.actions)
  @JoinColumn({ name: 'observationId' })
  observation: SafetyObservation;

  @Column({ type: 'varchar', length: 500 })
  description: string;

  @Column({
    type: 'enum',
    enum: ActionStatus,
    default: ActionStatus.PENDING,
  })
  status: ActionStatus;

  @Column({ type: 'int', default: 1 })
  priority: number;

  @Column({ type: 'uuid', nullable: true })
  assignedToId: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assignedToId' })
  assignedTo: User | null;

  @Column({ type: 'date', nullable: true })
  dueDate: Date | null;

  @Column({ type: 'date', nullable: true })
  completedDate: Date | null;

  @Column({ type: 'text', nullable: true })
  completionNotes: string | null;

  @Column({ type: 'jsonb', nullable: true })
  photos: Array<{
    id: string;
    url: string;
    caption: string | null;
    timestamp: string;
  }> | null;

  @Column({ type: 'uuid', nullable: true })
  completedById: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'completedById' })
  completedBy: User | null;

  @Column({ type: 'uuid', nullable: true })
  verifiedById: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'verifiedById' })
  verifiedBy: User | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  verifiedAt: Date | null;

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
    return this.status === ActionStatus.PENDING || this.status === ActionStatus.IN_PROGRESS;
  }

  canVerify(): boolean {
    return this.status === ActionStatus.COMPLETED;
  }

  isOverdue(): boolean {
    if (!this.dueDate || this.status === ActionStatus.COMPLETED || this.status === ActionStatus.VERIFIED) {
      return false;
    }
    return new Date() > new Date(this.dueDate);
  }
}
