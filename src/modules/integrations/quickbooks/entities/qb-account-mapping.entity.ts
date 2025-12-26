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
import { Organization } from '../../../organizations/entities/organization.entity';
import { CostCode } from '../../../financials/entities/cost-code.entity';

/**
 * QuickBooks Account Mapping Entity
 *
 * Maps platform cost codes to QuickBooks Chart of Accounts.
 * Supports three mapping types:
 * 1. COST_CODE - Direct cost code to account mapping
 * 2. CATEGORY - Category-level mapping (e.g., all "Labor" cost codes → single account)
 * 3. DEFAULT - Fallback mapping when no specific mapping exists
 */
@Entity('qb_account_mappings')
@Index(['organizationId', 'mappingType', 'costCodeId'], { unique: true, where: 'cost_code_id IS NOT NULL' })
@Index(['organizationId', 'mappingType', 'category'], { unique: true, where: 'category IS NOT NULL' })
export class QBAccountMapping {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @Column({ type: 'varchar', length: 50, name: 'mapping_type' })
  mappingType!: 'COST_CODE' | 'CATEGORY' | 'DEFAULT';

  @Column({ type: 'uuid', name: 'cost_code_id', nullable: true })
  costCodeId?: string;

  @ManyToOne(() => CostCode, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cost_code_id' })
  costCode?: CostCode;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category?: string;

  @Column({ type: 'varchar', length: 100, name: 'qb_account_id' })
  qbAccountId!: string;

  @Column({ type: 'varchar', length: 255, name: 'qb_account_name' })
  qbAccountName!: string;

  @Column({ type: 'varchar', length: 100, name: 'qb_account_type' })
  qbAccountType!: string;

  @Column({ type: 'varchar', length: 50, name: 'qb_account_classification', nullable: true })
  qbAccountClassification?: string;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
