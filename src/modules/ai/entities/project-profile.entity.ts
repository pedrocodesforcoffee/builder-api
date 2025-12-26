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

/**
 * Project Profile Entity
 * Stores aggregated project metadata for similarity matching and pattern analysis
 * One profile per project, created when project is initiated
 */
@Entity('project_profiles')
@Index(['organizationId', 'isComplete'])
@Index(['projectType', 'buildingType'])
export class ProjectProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ type: 'uuid' })
  @Index()
  organizationId: string;

  // Project Metadata
  @Column({ type: 'varchar', length: 100 })
  projectType: string; // e.g., 'Commercial', 'Residential', 'Industrial'

  @Column({ type: 'varchar', length: 100, nullable: true })
  buildingType: string; // e.g., 'Office', 'Warehouse', 'Multi-Family'

  @Column({ type: 'varchar', length: 100, nullable: true })
  deliveryMethod: string; // e.g., 'Design-Bid-Build', 'Design-Build', 'CM at Risk'

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  contractValue: number;

  @Column({ type: 'int', nullable: true })
  squareFootage: number;

  @Column({ type: 'int', nullable: true })
  durationDays: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string; // City or region

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  longitude: number;

  // Project Scope
  @Column({ type: 'text', array: true, default: '{}' })
  scopeElements: string[]; // e.g., ['Foundation', 'Structural Steel', 'MEP']

  @Column({ type: 'text', array: true, default: '{}' })
  specialtyTrades: string[]; // e.g., ['HVAC', 'Plumbing', 'Electrical']

  // Completion Data (populated when project closes)
  @Column({ type: 'boolean', default: false })
  @Index()
  isComplete: boolean;

  @Column({ type: 'timestamp', nullable: true })
  completionDate: Date;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  finalCost: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  costVariancePercent: number; // Positive = over budget, Negative = under budget

  @Column({ type: 'int', nullable: true })
  scheduleVarianceDays: number; // Positive = late, Negative = early

  @Column({ type: 'int', nullable: true })
  rfiCount: number;

  @Column({ type: 'int', nullable: true })
  changeOrderCount: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  changeOrderValue: number;

  @Column({ type: 'int', nullable: true })
  safetyIncidentCount: number;

  @Column({ type: 'int', nullable: true })
  qualityIssueCount: number;

  // Embedding for Similarity Matching
  @Column({ type: 'jsonb', nullable: true })
  embedding: number[]; // 1536-dimensional vector from OpenAI text-embedding-3-small

  @Column({ type: 'timestamp', nullable: true })
  embeddingGeneratedAt: Date;

  // Performance Metrics
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  clientSatisfactionScore: number; // 0-100

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  profitMarginPercent: number;

  // Metadata
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // Additional custom fields
}
