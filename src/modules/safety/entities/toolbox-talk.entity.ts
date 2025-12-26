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
import { SafetyTopic } from './safety-topic.entity';
import { ToolboxTalkAttendee } from './toolbox-talk-attendee.entity';
import { ToolboxTalkStatus } from '../enums/safety.enum';

/**
 * Toolbox Talk Entity
 * Represents a scheduled or completed toolbox talk session
 */
@Entity('toolbox_talks')
@Index(['projectId', 'scheduledDate'])
@Index(['status'])
@Index(['conductedById'])
export class ToolboxTalk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  projectId: string;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ type: 'uuid', nullable: true })
  safetyTopicId: string | null;

  @ManyToOne(() => SafetyTopic)
  @JoinColumn({ name: 'safetyTopicId' })
  safetyTopic: SafetyTopic | null;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'date' })
  scheduledDate: Date;

  @Column({ type: 'time', nullable: true })
  scheduledTime: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  actualStartTime: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  actualEndTime: Date | null;

  @Column({ type: 'int', nullable: true })
  durationMinutes: number | null;

  @Column({
    type: 'enum',
    enum: ToolboxTalkStatus,
    default: ToolboxTalkStatus.SCHEDULED,
  })
  status: ToolboxTalkStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  location: string | null;

  @Column({ type: 'text', nullable: true })
  topicsDiscussed: string | null;

  @Column({ type: 'jsonb', nullable: true })
  keyPoints: string[] | null;

  @Column({ type: 'text', nullable: true })
  questionsAsked: string | null;

  @Column({ type: 'text', nullable: true })
  concernsRaised: string | null;

  @Column({ type: 'text', nullable: true })
  actionItems: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'jsonb', nullable: true })
  attachments: Array<{
    id: string;
    filename: string;
    url: string;
    size: number;
    mimeType: string;
  }> | null;

  @Column({ type: 'jsonb', nullable: true })
  photos: Array<{
    id: string;
    url: string;
    caption: string | null;
  }> | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  signatureUrl: string | null;

  @Column({ type: 'int', default: 0 })
  attendeeCount: number;

  @Column({ type: 'int', default: 0 })
  presentCount: number;

  @Column({ type: 'int', default: 0 })
  absentCount: number;

  @Column({ type: 'uuid', nullable: true })
  conductedById: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'conductedById' })
  conductedBy: User | null;

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
  @OneToMany(() => ToolboxTalkAttendee, (attendee) => attendee.toolboxTalk, {
    cascade: true,
  })
  attendees: ToolboxTalkAttendee[];

  // Helper methods
  canEdit(): boolean {
    return this.status === ToolboxTalkStatus.SCHEDULED || this.status === ToolboxTalkStatus.IN_PROGRESS;
  }

  canComplete(): boolean {
    return this.status === ToolboxTalkStatus.IN_PROGRESS;
  }

  canCancel(): boolean {
    return this.status === ToolboxTalkStatus.SCHEDULED;
  }
}
