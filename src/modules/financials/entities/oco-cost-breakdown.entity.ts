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
import { OwnerChangeOrder } from './owner-change-order.entity';
import { CostCode } from './cost-code.entity';

/**
 * OcoCostBreakdown Entity
 *
 * Represents a cost breakdown line item in an Owner Change Order.
 * Used to map OCO costs to budget cost codes for budget integration.
 *
 * Features:
 * - Cost code mapping for budget updates
 * - Amount allocation per cost code
 * - Ordered display
 *
 * @entity oco_cost_breakdowns
 */
@Entity('oco_cost_breakdowns')
@Index('IDX_oco_cost_breakdown_oco', ['ocoId'])
@Index('IDX_oco_cost_breakdown_cost_code', ['costCodeId'])
export class OcoCostBreakdown {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'oco_id', nullable: false })
  ocoId!: string;

  // ==================== COST CODE MAPPING ====================

  @Column({ type: 'uuid', name: 'cost_code_id', nullable: true })
  costCodeId?: string;

  @Column({ type: 'text', nullable: false })
  description!: string;

  // ==================== FINANCIAL ====================

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
  })
  amount!: number;

  // ==================== DISPLAY ORDER ====================

  @Column({ type: 'integer', nullable: false, default: 0 })
  order!: number;

  // ==================== TIMESTAMPS ====================

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  // ==================== RELATIONSHIPS ====================

  @ManyToOne(() => OwnerChangeOrder, (oco) => oco.costBreakdowns, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'oco_id' })
  oco!: OwnerChangeOrder;

  @ManyToOne(() => CostCode, { nullable: true })
  @JoinColumn({ name: 'cost_code_id' })
  costCode?: CostCode;
}
