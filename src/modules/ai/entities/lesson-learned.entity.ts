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
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { LessonLearnedCategory } from '../enums/lesson-learned-category.enum';

/**
 * Lesson Learned Entity
 * Captures lessons learned from completed projects
 * Used to provide contextual recommendations in similar situations
 */
@Entity('lessons_learned')
@Index(['organizationId', 'category', 'isApproved'])
@Index(['projectId'])
export class LessonLearned {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  organizationId: string;

  @Column({ type: 'uuid', nullable: true })
  projectId: string;

  @ManyToOne(() => Project, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  // Categorization
  @Column({
    type: 'enum',
    enum: LessonLearnedCategory,
  })
  category: LessonLearnedCategory;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[]; // e.g., ['concrete', 'foundation', 'winter-construction']

  // Content (Structured Format)
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  situation: string; // What was the situation/problem?

  @Column({ type: 'text' })
  action: string; // What action was taken?

  @Column({ type: 'text' })
  outcome: string; // What was the result?

  @Column({ type: 'text' })
  lesson: string; // What was learned?

  @Column({ type: 'text', nullable: true })
  recommendedAction: string; // What should be done in similar situations?

  // Impact Metrics
  @Column({ type: 'varchar', length: 50, nullable: true })
  impactType: string; // e.g., 'COST_SAVINGS', 'TIME_SAVINGS', 'QUALITY_IMPROVEMENT'

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  costImpact: number; // Positive = savings, Negative = cost

  @Column({ type: 'int', nullable: true })
  scheduleImpact: number; // Days saved (positive) or lost (negative)

  // Embedding for Similarity Matching
  @Column({ type: 'jsonb', nullable: true })
  embedding: number[]; // 1536-dimensional vector

  @Column({ type: 'timestamp', nullable: true })
  embeddingGeneratedAt: Date;

  // Usage Tracking
  @Column({ type: 'int', default: 0 })
  timesReferenced: number; // How many times this lesson has been shown

  @Column({ type: 'int', default: 0 })
  timesApplied: number; // How many times users acted on this lesson

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  effectivenessScore: number; // 0.00 - 1.00 based on user feedback

  // Source
  @Column({ type: 'boolean', default: false })
  aiGenerated: boolean; // True if extracted by AI, false if manually created

  @Column({ type: 'uuid', nullable: true })
  createdByUserId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdByUserId' })
  createdByUser: User;

  @Column({ type: 'uuid', nullable: true })
  approvedByUserId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approvedByUserId' })
  approvedByUser: User;

  @Column({ type: 'boolean', default: false })
  @Index()
  isApproved: boolean; // Only show approved lessons

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  // Visibility
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isPublic: boolean; // Share across organization vs. project-specific

  // Metadata
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
