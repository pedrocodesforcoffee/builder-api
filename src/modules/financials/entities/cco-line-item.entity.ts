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
import { CommitmentChangeOrder } from './commitment-change-order.entity';
import { CostCode } from './cost-code.entity';

/**
 * CcoLineItem Entity
 *
 * Represents a line item in a Commitment Change Order.
 * Used to break down CCO costs and map to cost codes.
 *
 * Features:
 * - Cost code mapping for SOV integration
 * - Quantity, unit, unit cost tracking
 * - Ordered display
 *
 * @entity cco_line_items
 */
@Entity('cco_line_items')
@Index('IDX_cco_line_item_cco', ['ccoId'])
@Index('IDX_cco_line_item_cost_code', ['costCodeId'])
export class CcoLineItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'cco_id', nullable: false })
  ccoId!: string;

  // ==================== COST CODE MAPPING ====================

  @Column({ type: 'uuid', name: 'cost_code_id', nullable: true })
  costCodeId?: string;

  @Column({ type: 'text', nullable: false })
  description!: string;

  // ==================== QUANTITY BREAKDOWN ====================

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

  @ManyToOne(() => CommitmentChangeOrder, (cco) => cco.lineItems, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cco_id' })
  cco!: CommitmentChangeOrder;

  @ManyToOne(() => CostCode, { nullable: true })
  @JoinColumn({ name: 'cost_code_id' })
  costCode?: CostCode;
}
