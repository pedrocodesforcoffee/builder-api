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
import { RecommendationType } from '../enums/recommendation-type.enum';
import { RecommendationStatus } from '../enums/recommendation-status.enum';
import { RecommendationPriority } from '../enums/recommendation-priority.enum';

/**
 * Recommendation Entity
 * Stores AI-generated recommendations for projects
 * Supports contextual, proactive, and smart default recommendations
 */
@Entity('recommendations')
@Index(['projectId', 'status', 'priority'])
@Index(['organizationId', 'type', 'status'])
@Index(['createdAt'])
export class Recommendation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ type: 'uuid' })
  @Index()
  organizationId: string;

  // Recommendation Type & Status
  @Column({
    type: 'enum',
    enum: RecommendationType,
  })
  type: RecommendationType;

  @Column({
    type: 'enum',
    enum: RecommendationStatus,
    default: RecommendationStatus.PENDING,
  })
  status: RecommendationStatus;

  @Column({
    type: 'enum',
    enum: RecommendationPriority,
    default: RecommendationPriority.MEDIUM,
  })
  priority: RecommendationPriority;

  // Recommendation Content
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  reasoning: string; // Why this recommendation was generated

  @Column({ type: 'text', nullable: true })
  actionSuggestion: string; // Specific action to take

  // Supporting Data
  @Column({ type: 'jsonb', nullable: true })
  recommendationData: Record<string, any>; // Type-specific data (e.g., similar project IDs, cost code suggestions)

  @Column({ type: 'text', array: true, default: '{}' })
  supportingProjects: string[]; // Project IDs that support this recommendation

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  confidenceScore: number; // 0.00 - 1.00

  // Context
  @Column({ type: 'varchar', length: 100, nullable: true })
  contextType: string; // e.g., 'RFI_CREATION', 'COST_ENTRY', 'PROJECT_DASHBOARD'

  @Column({ type: 'uuid', nullable: true })
  contextEntityId: string; // ID of the entity being viewed (e.g., RFI ID, Cost Entry ID)

  @Column({ type: 'varchar', length: 100, nullable: true })
  contextEntityType: string; // e.g., 'RFI', 'COST_ENTRY', 'DOCUMENT'

  // User Interaction
  @Column({ type: 'uuid', nullable: true })
  presentedToUserId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'presentedToUserId' })
  presentedToUser: User;

  @Column({ type: 'timestamp', nullable: true })
  presentedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  actionTakenByUserId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'actionTakenByUserId' })
  actionTakenByUser: User;

  @Column({ type: 'timestamp', nullable: true })
  actionTakenAt: Date;

  @Column({ type: 'text', nullable: true })
  userFeedback: string; // User's comment on the recommendation

  @Column({ type: 'int', nullable: true })
  userRating: number; // 1-5 stars

  // Lifecycle
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date; // Recommendations expire after 30 days or when context changes

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // Metadata
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
