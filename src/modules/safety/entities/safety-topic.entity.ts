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
import { User } from '../../users/entities/user.entity';
import { SafetyTopicCategory } from '../enums/safety.enum';

/**
 * Safety Topic Entity
 * Library of safety topics that can be used for toolbox talks and training
 */
@Entity('safety_topics')
@Index(['category'])
@Index(['isActive'])
export class SafetyTopic {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({
    type: 'enum',
    enum: SafetyTopicCategory,
  })
  category: SafetyTopicCategory;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  content: string | null;

  @Column({ type: 'text', nullable: true })
  talkingPoints: string | null;

  @Column({ type: 'jsonb', nullable: true })
  oshaReferences: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  attachments: Array<{
    id: string;
    filename: string;
    url: string;
    size: number;
    mimeType: string;
  }> | null;

  @Column({ type: 'int', default: 15 })
  estimatedDurationMinutes: number;

  @Column({ type: 'jsonb', nullable: true })
  keyPoints: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  discussionQuestions: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  relatedTopics: string[] | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  requiresSignature: boolean;

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  // Relations
  @Column({ type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ type: 'uuid', nullable: true })
  updatedById: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'updatedById' })
  updatedBy: User;
}
