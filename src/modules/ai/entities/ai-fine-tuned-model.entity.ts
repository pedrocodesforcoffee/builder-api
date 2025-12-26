/**
 * AI Fine-Tuned Model Entity
 * Tracks fine-tuned AI models
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { AiOperationType } from '../constants/ai-config.constants';

@Entity('ai_fine_tuned_models')
@Index(['operationType', 'status'])
export class AiFineTunedModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, comment: 'OpenAI fine-tuning job ID' })
  openaiJobId: string;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: 'OpenAI model ID when complete' })
  openaiModelId: string | null;

  @Column({
    type: 'enum',
    enum: AiOperationType,
  })
  operationType: AiOperationType;

  @Column({ type: 'varchar', length: 100 })
  baseModel: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'pending',
    comment: 'Status: pending, running, succeeded, failed, cancelled',
  })
  status: string;

  @Column({ type: 'int', comment: 'Number of training examples' })
  trainingExamples: number;

  @Column({ type: 'int', nullable: true })
  validationExamples: number | null;

  @Column({ type: 'int', nullable: true, comment: 'Training epochs' })
  epochs: number | null;

  @Column({ type: 'float', nullable: true })
  learningRate: number | null;

  @Column({ type: 'jsonb', nullable: true, comment: 'Training metrics' })
  trainingMetrics: Record<string, any> | null;

  @Column({ type: 'float', nullable: true, comment: 'Final loss value' })
  finalLoss: number | null;

  @Column({ type: 'float', nullable: true, comment: 'Validation accuracy' })
  validationAccuracy: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, comment: 'Total training cost in USD' })
  trainingCost: number | null;

  @Column({ type: 'timestamp', nullable: true })
  trainingStartedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  trainingCompletedAt: Date | null;

  @Column({ type: 'boolean', default: false, comment: 'Is this model deployed for production use?' })
  deployed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deployedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
