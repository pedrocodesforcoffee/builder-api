/**
 * Organization AI Budget Entity
 * Organization-level AI budget configuration and tracking
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity('organization_ai_budgets')
@Index(['organizationId'])
export class OrganizationAiBudget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  // Token Budgets
  @Column({ type: 'int', default: 1000000, comment: 'Monthly token limit' })
  monthlyTokenLimit: number;

  @Column({ type: 'int', default: 50000, comment: 'Daily token limit' })
  dailyTokenLimit: number;

  @Column({ type: 'int', default: 0 })
  tokensUsedThisMonth: number;

  @Column({ type: 'int', default: 0 })
  tokensUsedToday: number;

  // Cost Budgets (USD)
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 500, comment: 'Monthly cost limit in USD' })
  monthlyCostLimit: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  costThisMonth: number;

  // Alert Thresholds (percentage)
  @Column({ type: 'int', default: 80, comment: 'Alert when reaching this % of budget' })
  alertThresholdPercent: number;

  @Column({ type: 'int', default: 95, comment: 'Hard stop when reaching this % of budget' })
  hardStopThresholdPercent: number;

  // Feature Toggles
  @Column({ type: 'boolean', default: true })
  documentIntelligenceEnabled: boolean;

  @Column({ type: 'boolean', default: true })
  projectIntelligenceEnabled: boolean;

  @Column({ type: 'boolean', default: true })
  autoActionsEnabled: boolean;

  @Column({ type: 'boolean', default: true })
  analyticsForecastingEnabled: boolean;

  // Cache Settings
  @Column({ type: 'boolean', default: true })
  cachingEnabled: boolean;

  @Column({ type: 'int', default: 30, comment: 'Cache TTL in days' })
  cacheTtlDays: number;

  // Model Preferences
  @Column({ type: 'varchar', length: 50, default: 'gpt-4-turbo-preview' })
  defaultModel: string;

  @Column({ type: 'boolean', default: true, comment: 'Allow switching to cheaper models when budget low' })
  allowModelDowngrade: boolean;

  // Usage Tracking
  @Column({ type: 'int', default: 0 })
  totalOperationsThisMonth: number;

  @Column({ type: 'timestamp', nullable: true })
  lastOperationAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastBudgetResetAt: Date | null;

  // Alerts
  @Column({ type: 'boolean', default: false })
  alertSent: boolean;

  @Column({ type: 'boolean', default: false })
  hardStopActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
