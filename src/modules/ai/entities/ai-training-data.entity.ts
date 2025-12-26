/**
 * AI Training Data Entity
 * Stores training data for fine-tuning AI models
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { AiOperationType } from '../constants/ai-config.constants';

@Entity('ai_training_data')
@Index(['operationType', 'approved', 'createdAt'])
export class AiTrainingData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: AiOperationType,
  })
  operationType: AiOperationType;

  @Column({ type: 'jsonb', comment: 'Input data for the operation' })
  inputData: Record<string, any>;

  @Column({ type: 'jsonb', comment: 'Expected/actual output' })
  outputData: Record<string, any>;

  @Column({ type: 'text', nullable: true, comment: 'System prompt used' })
  systemPrompt: string | null;

  @Column({ type: 'text', nullable: true, comment: 'User prompt used' })
  userPrompt: string | null;

  @Column({ type: 'text', nullable: true, comment: 'AI response' })
  aiResponse: string | null;

  @Column({ type: 'boolean', default: false, comment: 'Was this manually reviewed and approved?' })
  approved: boolean;

  @Column({ type: 'boolean', default: true, comment: 'Quality check passed' })
  quality: boolean;

  @Column({ type: 'float', nullable: true, comment: 'User feedback score (1-5)' })
  feedbackScore: number | null;

  @Column({ type: 'text', nullable: true })
  feedbackNotes: string | null;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'uuid', nullable: true })
  projectId: string | null;

  @Column({ type: 'uuid', nullable: true })
  organizationId: string | null;

  @Column({ type: 'boolean', default: false, comment: 'Included in fine-tuning dataset' })
  usedForTraining: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
