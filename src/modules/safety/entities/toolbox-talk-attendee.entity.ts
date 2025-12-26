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
import { ToolboxTalk } from './toolbox-talk.entity';
import { User } from '../../users/entities/user.entity';
import { WorkerProfile } from '../../time-attendance/entities/worker-profile.entity';
import { AttendanceStatus } from '../enums/safety.enum';

/**
 * Toolbox Talk Attendee Entity
 * Tracks attendance and acknowledgment for each worker
 */
@Entity('toolbox_talk_attendees')
@Index(['toolboxTalkId', 'workerId'], { unique: true })
@Index(['workerId'])
@Index(['status'])
export class ToolboxTalkAttendee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  toolboxTalkId: string;

  @ManyToOne(() => ToolboxTalk, (talk) => talk.attendees)
  @JoinColumn({ name: 'toolboxTalkId' })
  toolboxTalk: ToolboxTalk;

  @Column({ type: 'uuid' })
  workerId: string;

  @ManyToOne(() => WorkerProfile)
  @JoinColumn({ name: 'workerId' })
  worker: WorkerProfile;

  @Column({
    type: 'enum',
    enum: AttendanceStatus,
    default: AttendanceStatus.PRESENT,
  })
  status: AttendanceStatus;

  @Column({ type: 'timestamp with time zone', nullable: true })
  checkInTime: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'text', nullable: true })
  workerComments: string | null;

  @Column({ type: 'text', nullable: true })
  questionsAsked: string | null;

  @Column({ type: 'boolean', default: false })
  acknowledged: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  acknowledgedAt: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  signatureUrl: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  ipAddress: string | null;

  @Column({ type: 'jsonb', nullable: true })
  deviceInfo: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  createdById: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User | null;
}
