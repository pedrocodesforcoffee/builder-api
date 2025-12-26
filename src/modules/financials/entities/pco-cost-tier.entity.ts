import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PotentialChangeOrder } from './potential-change-order.entity';
import { CostCode } from './cost-code.entity';

/**
 * PcoCostTier Entity
 *
 * Represents a cost tier/line item in a Potential Change Order.
 * Multiple tiers can be associated with a single PCO to break down costs.
 *
 * Features:
 * - Cost code mapping for budget integration
 * - Quantity, unit, and unit cost tracking
 * - Ordered display
 *
 * @entity pco_cost_tiers
 */
@Entity('pco_cost_tiers')
@Index('IDX_pco_cost_tier_pco', ['pcoId'])
@Index('IDX_pco_cost_tier_cost_code', ['costCodeId'])
export class PcoCostTier {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'pco_id', nullable: false })
  pcoId!: string;

  // ==================== COST CODE MAPPING ====================

  @Column({ type: 'uuid', name: 'cost_code_id', nullable: true })
  costCodeId?: string;

  @Column({ type: 'text', nullable: false })
  description!: string;

  // ==================== COST BREAKDOWN ====================

  @Column({ type: 'decimal', precision: 15, scale: 4, nullable: true })
  quantity?: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  unit?: string;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'unit_cost',
    nullable: true,
  })
  unitCost?: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'direct_cost',
    nullable: false,
  })
  directCost!: number;

  // ==================== DISPLAY ORDER ====================

  @Column({ type: 'integer', nullable: false, default: 0 })
  order!: number;

  // ==================== TIMESTAMPS ====================

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  // ==================== RELATIONSHIPS ====================

  @ManyToOne(() => PotentialChangeOrder, (pco) => pco.costTiers, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'pco_id' })
  pco!: PotentialChangeOrder;

  @ManyToOne(() => CostCode, { nullable: true })
  @JoinColumn({ name: 'cost_code_id' })
  costCode?: CostCode;
}
