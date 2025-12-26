/**
 * AI Operation Log Entity
 * Tracks all AI operations for cost monitoring and analytics
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { AiModel, AiOperationType } from '../constants/ai-config.constants';

@Entity('ai_operation_logs')
@Index(['projectId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['operationType', 'createdAt'])
export class AiOperationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: AiOperationType,
  })
  operationType: AiOperationType;

  @Column({
    type: 'enum',
    enum: AiModel,
  })
  model: AiModel;

  @Column({ type: 'int' })
  inputTokens: number;

  @Column({ type: 'int' })
  outputTokens: number;

  @Column({ type: 'int' })
  totalTokens: number;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  cost: number;

  @Column({ type: 'int', comment: 'Response time in milliseconds' })
  responseTime: number;

  @Column({ type: 'boolean', default: false })
  cached: boolean;

  @Column({ type: 'boolean', default: true })
  success: boolean;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'jsonb', nullable: true, comment: 'Input parameters (sanitized)' })
  inputSummary: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true, comment: 'Output summary (sanitized)' })
  outputSummary: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;
}
