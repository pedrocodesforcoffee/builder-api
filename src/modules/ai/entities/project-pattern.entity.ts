import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { PatternType } from '../enums/pattern-type.enum';

/**
 * Project Pattern Entity
 * Stores calculated patterns and trends across an organization's projects
 * Updated weekly by cron job that analyzes historical project data
 */
@Entity('project_patterns')
@Index(['organizationId', 'patternType', 'isActive'])
@Index(['calculatedAt'])
export class ProjectPattern {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  organizationId: string;

  // Pattern Type & Scope
  @Column({
    type: 'enum',
    enum: PatternType,
  })
  patternType: PatternType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  patternSubtype: string; // e.g., 'STRUCTURAL_COST_VARIANCE', 'WINTER_SCHEDULE_VARIANCE'

  @Column({ type: 'varchar', length: 255 })
  patternName: string; // e.g., "Structural costs consistently 10% over budget"

  @Column({ type: 'text' })
  patternDescription: string;

  // Statistical Data
  @Column({ type: 'int' })
  sampleSize: number; // Number of projects analyzed

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  averageValue: number; // Average of the measured metric

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  medianValue: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  standardDeviation: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  percentile25: number; // 25th percentile

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  percentile75: number; // 75th percentile

  @Column({ type: 'decimal', precision: 3, scale: 2 })
  confidenceScore: number; // 0.00 - 1.00 based on sample size and consistency

  // Trend Analysis
  @Column({ type: 'varchar', length: 50, nullable: true })
  trendDirection: string; // 'INCREASING', 'DECREASING', 'STABLE'

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  trendSlopePercent: number; // Rate of change over time

  // Conditions & Filters
  @Column({ type: 'jsonb', nullable: true })
  conditionsApplied: Record<string, any>; // Filters applied (e.g., {"projectType": "Commercial", "buildingType": "Office"})

  @Column({ type: 'text', array: true, default: '{}' })
  applicableProjectTypes: string[]; // Project types this pattern applies to

  @Column({ type: 'text', array: true, default: '{}' })
  applicableBuildingTypes: string[]; // Building types this pattern applies to

  // Impact Assessment
  @Column({ type: 'varchar', length: 50, nullable: true })
  impactSeverity: string; // 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  averageCostImpact: number; // Average cost impact when pattern occurs

  @Column({ type: 'int', nullable: true })
  averageScheduleImpact: number; // Average days impact

  // Recommendations
  @Column({ type: 'text', nullable: true })
  recommendedMitigation: string; // How to mitigate this pattern

  @Column({ type: 'jsonb', nullable: true })
  relatedLessonsLearned: string[]; // IDs of relevant lessons learned

  // Supporting Data
  @Column({ type: 'text', array: true, default: '{}' })
  supportingProjects: string[]; // Project IDs that demonstrate this pattern

  @Column({ type: 'jsonb', nullable: true })
  detailedAnalysis: Record<string, any>; // Additional statistical data, charts, etc.

  // Calculation Metadata
  @Column({ type: 'timestamp' })
  calculatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  validUntil: Date; // Pattern expires and needs recalculation

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
