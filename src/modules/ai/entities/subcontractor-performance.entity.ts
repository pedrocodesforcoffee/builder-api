import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { PerformanceRating } from '../enums/performance-rating.enum';

/**
 * Subcontractor Performance Entity
 * Tracks aggregated performance metrics for subcontractors/vendors
 * Updated when projects are completed or commitments are closed
 */
@Entity('subcontractor_performance')
@Index(['organizationId', 'subcontractorName'])
@Index(['overallRating', 'projectCount'])
export class SubcontractorPerformance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  organizationId: string;

  // Subcontractor Identification
  @Column({ type: 'varchar', length: 255 })
  subcontractorName: string;

  @Column({ type: 'text', array: true, default: '{}' })
  trades: string[]; // e.g., ['HVAC', 'Plumbing', 'Electrical']

  @Column({ type: 'varchar', length: 255, nullable: true })
  contactEmail: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  contactPhone: string;

  // Performance Metrics
  @Column({ type: 'int', default: 0 })
  projectCount: number; // Number of projects worked on

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  totalContractValue: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  averageContractValue: number;

  // Quality Metrics
  @Column({
    type: 'enum',
    enum: PerformanceRating,
    default: PerformanceRating.NOT_RATED,
  })
  overallRating: PerformanceRating;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  qualityScore: number; // 0-100 based on quality issues, rework, etc.

  @Column({ type: 'int', default: 0 })
  qualityIssueCount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  defectRate: number; // Percentage of work requiring correction

  // Schedule Performance
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  onTimeCompletionRate: number; // Percentage of commitments completed on time

  @Column({ type: 'int', nullable: true })
  averageScheduleVarianceDays: number; // Positive = late, Negative = early

  @Column({ type: 'int', default: 0 })
  lateCompletionCount: number;

  // Cost Performance
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  budgetAdherenceRate: number; // Percentage of work within budget

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  averageCostVariancePercent: number; // Positive = over budget

  @Column({ type: 'int', default: 0 })
  changeOrderCount: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  changeOrderValue: number;

  // Safety Metrics
  @Column({ type: 'int', default: 0 })
  safetyIncidentCount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  incidentRate: number; // Incidents per 100,000 hours

  @Column({ type: 'boolean', default: true })
  safetyCompliant: boolean;

  // Communication & Responsiveness
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  responsivenessScore: number; // 0-100 based on RFI/email response times

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  averageRfiResponseHours: number;

  @Column({ type: 'int', default: 0 })
  communicationIssueCount: number;

  // Reliability Metrics
  @Column({ type: 'int', default: 0 })
  contractCompletionCount: number; // Contracts completed (vs. terminated)

  @Column({ type: 'int', default: 0 })
  contractTerminationCount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  reliabilityScore: number; // 0-100

  // Certifications & Insurance
  @Column({ type: 'boolean', default: false })
  insuranceCurrent: boolean;

  @Column({ type: 'boolean', default: false })
  licenseCurrent: boolean;

  @Column({ type: 'text', array: true, default: '{}' })
  certifications: string[];

  // Recommendation Status
  @Column({ type: 'boolean', default: true })
  wouldRecommend: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  recommendationLevel: string; // 'HIGHLY_RECOMMENDED', 'RECOMMENDED', 'ACCEPTABLE', 'NOT_RECOMMENDED'

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Project References
  @Column({ type: 'text', array: true, default: '{}' })
  projectIds: string[]; // Projects this subcontractor worked on

  @Column({ type: 'timestamp', nullable: true })
  lastWorkedDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastEvaluationDate: Date;

  // Metadata
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
