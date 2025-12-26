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
import { User } from '../../users/entities/user.entity';

/**
 * CcoTmEntry Entity
 *
 * Represents a Time & Materials (T&M) entry for a Commitment Change Order.
 * Used for CCOs that are billed on a T&M basis rather than lump sum.
 *
 * Features:
 * - Daily entry tracking (date, description)
 * - Labor, equipment, and material cost breakdown
 * - Approval workflow for each entry
 *
 * @entity cco_tm_entries
 */
@Entity('cco_tm_entries')
@Index('IDX_cco_tm_entry_cco', ['ccoId'])
@Index('IDX_cco_tm_entry_date', ['date'])
export class CcoTmEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'cco_id', nullable: false })
  ccoId!: string;

  // ==================== ENTRY DETAILS ====================

  @Column({ type: 'date', nullable: false })
  date!: Date;

  @Column({ type: 'text', nullable: false })
  description!: string;

  // ==================== LABOR ====================

  @Column({
    type: 'decimal',
    precision: 8,
    scale: 2,
    name: 'labor_hours',
    nullable: true,
  })
  laborHours?: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'labor_rate',
    nullable: true,
  })
  laborRate?: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'labor_cost',
    nullable: true,
  })
  laborCost?: number;

  // ==================== EQUIPMENT ====================

  @Column({
    type: 'decimal',
    precision: 8,
    scale: 2,
    name: 'equipment_hours',
    nullable: true,
  })
  equipmentHours?: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'equipment_rate',
    nullable: true,
  })
  equipmentRate?: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'equipment_cost',
    nullable: true,
  })
  equipmentCost?: number;

  // ==================== MATERIALS ====================

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'material_cost',
    nullable: true,
  })
  materialCost?: number;

  // ==================== TOTAL ====================

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'total_cost',
    nullable: false,
  })
  totalCost!: number;

  // ==================== APPROVAL ====================

  @Column({ type: 'boolean', nullable: false, default: false })
  approved!: boolean;

  @Column({ type: 'timestamp with time zone', name: 'approved_at', nullable: true })
  approvedAt?: Date;

  @Column({ type: 'uuid', name: 'approved_by_id', nullable: true })
  approvedById?: string;

  // ==================== TIMESTAMPS ====================

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  // ==================== RELATIONSHIPS ====================

  @ManyToOne(() => CommitmentChangeOrder, (cco) => cco.tmEntries, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cco_id' })
  cco!: CommitmentChangeOrder;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy?: User;
}
