/**
 * AI Cache Entity
 * Caches AI responses to reduce costs and improve performance
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

@Entity('ai_cache')
@Index(['cacheKey'], { unique: true })
@Index(['operationType', 'createdAt'])
@Index(['expiresAt'])
export class AiCache {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64, unique: true, comment: 'SHA-256 hash of request' })
  cacheKey: string;

  @Column({
    type: 'enum',
    enum: AiOperationType,
  })
  operationType: AiOperationType;

  @Column({ type: 'jsonb', comment: 'Cached AI response' })
  response: any;

  @Column({ type: 'int', default: 0 })
  hitCount: number;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
